import asyncio
import codecs
import io
import json
import zlib
from typing import AsyncIterator, Optional, Tuple, Union

import boto3
from botocore.client import Config
from botocore.exceptions import ClientError, NoCredentialsError
from fastapi import HTTPException, status
from fastapi.responses import StreamingResponse
from loguru import logger

from vis3.internal.common.exceptions import AppEx, ErrorCode
from vis3.internal.models.bucket import Bucket
from vis3.internal.schema import JsonRow
from vis3.internal.utils import json_dumps, timer
from vis3.internal.utils.path import extract_bytes_range


class FakeRedis:
    async def get(self, key: str) -> str:
        return ""

    async def set(self, key: str, value: str):
        pass


redis_client = FakeRedis()

MAX_END = 1 * 1024 * 1024

def _is_valid_charset(charset: str):
    try:
        codecs.lookup(charset)
        return True
    except LookupError:
        return False


def _try_decode(body_bytes: bytes, http_charset: Union[str, None]):
    import cchardet

    tried_charsets = set()
    # 1. try decode with `http_charset`.
    if http_charset and _is_valid_charset(http_charset):
        try:
            http_charset = http_charset.lower()
            tried_charsets.add(http_charset)
            return body_bytes.decode(http_charset), http_charset
        except:
            pass
    # 2. try decode with utf-8.
    try:
        tried_charsets.add("utf-8")
        return body_bytes.decode("utf-8"), "utf-8"
    except:
        pass
    # 3. try detect charset and decode.
    charset = cchardet.detect(body_bytes).get("encoding")
    if charset:
        charset = charset.lower()
        if charset in ["gbk", "gb2312"]:
            charset = "gb18030"
        if charset not in tried_charsets:
            try:
                return body_bytes.decode(charset), charset
            except:
                pass
    # 4. gave up.
    return "", ""



class S3Reader:
    # 添加文件签名映射
    FILE_SIGNATURES = {
        # ZIP 文件
        b'PK\x03\x04': 'application/zip',
        # PDF 文件
        b'%PDF': 'application/pdf',
        # GIF 文件
        b'GIF87a': 'image/gif',
        b'GIF89a': 'image/gif',
        # JPEG 文件
        b'\xFF\xD8\xFF': 'image/jpeg',
        # PNG 文件
        b'\x89PNG\r\n\x1a\n': 'image/png',
        # GZIP 文件
        b'\x1F\x8B\x08': 'application/gzip',
        # XML 文件 (UTF-8)
        b'<?xml': 'application/xml',
        # UTF-8 文本文件的 BOM
        b'\xEF\xBB\xBF': 'text/plain',
        # UTF-16 LE 文本文件的 BOM
        b'\xFF\xFE': 'text/plain',
        # UTF-16 BE 文本文件的 BOM
        b'\xFE\xFF': 'text/plain',
    }

    # 保持现有的 MIME_TYPES 映射
    MIME_TYPES = {
        '.txt': 'text/plain',
        '.html': 'text/html',
        '.htm': 'text/html',
        '.json': 'application/json',
        '.jsonl': 'application/json',
        '.csv': 'text/csv',
        '.xml': 'application/xml',
        '.pdf': 'application/pdf',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.svg': 'image/svg+xml',
        '.webp': 'image/webp',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.zip': 'application/zip',
        '.gz': 'application/gzip',
        '.warc': 'application/warc',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.xls': 'application/vnd.ms-excel',
        '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        '.js': 'application/javascript',
        '.css': 'text/css',
        '.epub': 'application/epub+zip',
        '.mobi': 'application/x-mobipocket-ebook',
    }

    def __init__(
        self,
        key: str,
        bucket: Bucket,
        access_key_id: str,
        secret_access_key: str,
        region_name: str = "us-east-1",
        bucket_name: str | None = None,
        endpoint_url: str | None = None,
    ):
        self.bucket_name = bucket_name
        self.key = key
        self.bucket = bucket
        self.path = f"s3://{bucket_name}/{key}"
        self.key_without_query = key.split("?")[0]
        self.access_key_id = access_key_id
        self.secret_access_key = secret_access_key
        self.region_name = region_name
        self.endpoint_url = endpoint_url
        self.is_compressed = self.key_without_query.endswith(".gz")
        self._header_info = None

        if self.access_key_id and self.secret_access_key:
            self.client = S3Reader.get_client(self.access_key_id, self.secret_access_key, self.endpoint_url, self.region_name)

    @staticmethod
    async def _run_in_executor(func, *args, **kwargs):
        loop = asyncio.get_event_loop()

        # 创建一个包装函数来处理关键字参数
        def wrapper():
            return func(*args, **kwargs)

        return await loop.run_in_executor(None, wrapper)

    def _get_range_header(self, start: int, length: int | None = None):
        """
        生成 S3 Range header
        
        Args:
            start: 起始字节位置
            length: 读取长度，如果为 None 则读取从 start 开始的 1MB 数据
            
        Returns:
            str: Range header 字符串
        """
        if length is None or length == 0:
            # 如果 length 为空，读取从 start 开始的 1MB 数据
            end = start + MAX_END - 1  # Range header 的 end 是包含的
            range_header = f"bytes={start}-{end}"
        else:
            # 如果指定了 length，读取指定长度的数据
            end = start + length - 1  # Range header 的 end 是包含的
            range_header = f"bytes={start}-{end}"

        return range_header
    
    @staticmethod
    def get_client(ak: str, sk: str, endpoint: str, region_name: str):
        try:
            return boto3.client(
                "s3",
                aws_access_key_id=ak,
                aws_secret_access_key=sk,
                region_name=region_name,
                endpoint_url=endpoint,
                config=Config(s3={"addressing_style": "virtual"})
            )
        except Exception:
            # TODO: 错误类型
            return boto3.client(
                "s3",
                aws_access_key_id=ak,
                aws_secret_access_key=sk,
                endpoint_url=endpoint,
                config=Config(s3={"addressing_style": "path"}, retries={"max_attempts": 8}),
            )

    async def head_object(self):
        """
        获取 S3 对象的头部信息。

        Args:
            key: S3 对象的键

        Returns:
            dict: 对象的头部信息

        Raises:
            ValueError: 当 bucket 不存在时
            PermissionError: 当没有访问权限时
            ClientError: 其他 S3 客户端错误
        """
        try:
            with timer("head_object"):
                if self._header_info:
                    return self._header_info

                header_info = await S3Reader._run_in_executor(
                    self.client.head_object,
                    Bucket=self.bucket_name,
                    Key=self.key_without_query,
                )

                self._header_info = header_info

                return header_info
        except ClientError as e:
            error_code = e.response["Error"]["Code"]
            if error_code == "NoSuchBucket":
                raise AppEx(
                    code=ErrorCode.S3_CLIENT_40002_NO_SUCH_BUCKET,
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Bucket {self.bucket_name} does not exist",
                )
            elif error_code == "AccessDenied":
                raise AppEx(
                    code=ErrorCode.S3_CLIENT_40001_ACCESS_DENIED,
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Access denied to bucket {self.bucket_name}",
                )
            elif error_code == "404":
                raise AppEx(
                    code=ErrorCode.S3_CLIENT_40003_NOT_FOUND,
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Object {self.key_without_query} does not exist in bucket {self.bucket_name}",
                )
            else:
                raise
        except Exception as e:
            if isinstance(e, NoCredentialsError):
                raise AppEx(
                    code=ErrorCode.S3_CLIENT_40001_ACCESS_DENIED,
                    status_code=status.HTTP_403_FORBIDDEN,
                )
            raise

    async def _detect_mime_by_content(self) -> str:
        """
        通过文件内容的签名来检测 MIME 类型
        """
        try:
            # 获取文件的前32个字节用于类型检测
            response = await S3Reader._run_in_executor(
                self.client.get_object,
                Bucket=self.bucket_name,
                Key=self.key_without_query,
                Range="bytes=0-31",
            )
            content = await S3Reader._run_in_executor(response["Body"].read)

            # 检查文件签名
            for signature, mime_type in self.FILE_SIGNATURES.items():
                if content.startswith(signature):
                    return mime_type

            # 检查是否是文本文件
            # 检查前32个字节是否都是可打印字符或常见控制字符
            is_text = all(byte in b' \t\n\r' or 32 <= byte <= 126 for byte in content)
            if is_text:
                # 如果内容以 { [ " 开头，可能是 JSON
                if content.lstrip().startswith(b'{') or content.lstrip().startswith(b'['):
                    return 'application/json'
                return 'text/plain'

            return 'application/octet-stream'

        except Exception as e:
            logger.error(f"Error detecting MIME type from content: {e}")
            return 'application/octet-stream'

    async def mime_type(self) -> str:
        """
        获取文件的 MIME 类型。优先使用文件扩展名，如果没有扩展名则通过内容检测。

        Returns:
            str: 文件的 MIME 类型
        """
        try:
            # 处理特殊情况：.warc.gz
            if self.key_without_query.endswith('.warc.gz'):
                return 'application/warc+gzip'

            # 尝试从文件扩展名获取 MIME 类型
            if '.' in self.key_without_query:
                file_ext = '.' + self.key_without_query.split('.')[-1].lower()
                mime_type = self.MIME_TYPES.get(file_ext)
                if mime_type:
                    return mime_type

            # 如果没有扩展名或扩展名未知，通过内容检测
            return await self._detect_mime_by_content()

        except Exception as e:
            logger.error(f"Error determining MIME type: {e}")
            return 'application/octet-stream'

    async def list_objects(
        self,
        recursive=False,
        limit=0,
        page_size=100,
        page_no=1,
    ):
        """
        分页获取 S3 对象列表

        Args:
            recursive: 是否递归获取子目录
            limit: 最大返回数量，0 表示不限制
            page_size: 每页大小
            page_no: 当前页码，从 1 开始

        Yields:
            Tuple[str, dict, str]: (s3_url, 对象详情, 类型)
        """
        marker = None
        item_yielded = 0
        current_page = 1

        while True:
            operation_parameters = {
                "Bucket": self.bucket_name,
                "Prefix": self.key_without_query,
                "MaxKeys": page_size,
                "Delimiter": "/" if not recursive else None,
            }
            if marker:
                operation_parameters["Marker"] = marker

            try:
                result = await S3Reader._run_in_executor(
                    self.client.list_objects, **operation_parameters
                )
            except ClientError as e:
                error_code = e.response["Error"]["Code"]
                if error_code == "NoSuchBucket":
                    raise ValueError(f"Bucket {self.bucket_name} does not exist")
                elif error_code == "AccessDenied":
                    raise PermissionError(f"Access denied to bucket {self.bucket_name}")
                else:
                    raise

            contents = result.get("Contents", [])
            common_prefixes = result.get("CommonPrefixes", [])
            next_marker = result.get("NextMarker")

            if current_page == page_no:
                for content in contents:
                    if not content["Key"].endswith("/"):
                        yield (
                            f"s3://{self.bucket_name}/{content['Key']}",
                            content,
                            "file",
                        )
                        item_yielded += 1
                        if limit > 0 and item_yielded >= limit:
                            return
                        if item_yielded == page_size:
                            return

                for _prefix in common_prefixes:
                    yield (
                        f"s3://{self.bucket_name}/{_prefix['Prefix']}",
                        _prefix,
                        "directory",
                    )
                    item_yielded += 1
                    if limit > 0 and item_yielded >= limit:
                        return
                    if item_yielded == page_size:
                        return

            if not next_marker or item_yielded == page_size:
                break

            marker = next_marker
            current_page += 1

    async def read_warc_gz(
        self,
        start: int | None = None,
        length: int | None = None,
    ) -> JsonRow:
        """
        读取 WARC.GZ 文件记录，并以指定JSON格式返回。

        Args:
            start: 起始字节位置
            offset: 结束字节位置

        Returns:
            JsonRow: 包含 WARC 记录内容的 JsonRow 对象，使用以下格式:
            {
                "record_id": "track_id",
                "url": "记录的URL",
                "status": "响应状态码",
                "response_header": "响应头部信息",
                "date": "记录日期",
                "content_length": "记录大小",
                "html": "实际内容",
                "remark": "原始头部信息"
            }
        """

        try:
            from fastwarc.warc import ArchiveIterator, WarcRecordType

            response = await S3Reader._run_in_executor(
                self.client.get_object,
                Bucket=self.bucket_name,
                Key=self.key_without_query,
                Range=self._get_range_header(start=start, length=length),
                RequestPayer="requester",
            )
            stream = response["Body"]
            # 读取 StreamingBody 的内容
            content = await stream.read()
            file_obj = io.BytesIO(content)

            def process_warc():
                result = None
                record_length = 0
                next_start = start

                try:
                    # 使用 fastwarc 库解析 WARC 文件
                    archive_iterator = ArchiveIterator(file_obj)
                    record_found = False

                    for record in archive_iterator:
                        if result:
                            pre_stream_pos = result.get("remark", {}).get(
                                "stream_pos", 0
                            )
                            next_start = pre_stream_pos + next_start
                            record_length = record.stream_pos - pre_stream_pos
                            break

                        if record.record_type == WarcRecordType.response:
                            # 获取 HTTP 响应内容
                            http_headers = {}
                            warc_headers = {}

                            # 处理 WARC 头部
                            for name, value in record.headers.items():
                                if name.startswith("WARC-"):
                                    warc_headers[name] = value

                            # 获取 HTTP 头部和内容
                            http_status = None

                            if record.http_headers:
                                http_status = record.http_headers.status_code
                                for name, value in record.http_headers.items():
                                    http_headers[name] = value

                            if http_status is None or http_status >= 400:
                                continue

                            # 获取内容
                            try:
                                content_bytes = record.reader.read()
                            except:
                                result["content_length"] = -1
                                content_bytes = None

                            # 尝试解码内容
                            html_content = ""
                            charset = None
                            content_charset = ""
                            content_length = len(content_bytes) if content_bytes else -1

                            # 从 Content-Type 头部提取字符集
                            content_type = http_headers.get("Content-Type", "")
                            if "charset=" in content_type:
                                charset = (
                                    content_type.split("charset=")[1]
                                    .split(";")[0]
                                    .strip()
                                )

                            # 尝试解码内容
                            if content_bytes:
                                html_content, content_charset = _try_decode(
                                    content_bytes, charset
                                )

                            # 构建结果
                            result = {
                                "track_id": str(record.record_id).split(":")[-1][:36],
                                "url": record.headers.get("WARC-Target-URI", ""),
                                "status": http_status,
                                "response_header": http_headers,
                                "date": record.record_date.timestamp(),
                                "content_length": content_length,
                                "html": html_content,
                                "content_charset": content_charset,
                                "remark": {
                                    "warc_headers": warc_headers,
                                    "stream_pos": record.stream_pos,
                                },
                            }

                            record_found = True

                    if not record_found:
                        result = {"error": "No WARC response record found"}
                except Exception as e:
                    result = {"error": f"Error reading record: {str(e)}"}

                return result, next_start, record_length

            # 在事件循环中执行处理（因为处理可能是CPU密集型的）
            loop = asyncio.get_event_loop()
            result, start, length = await loop.run_in_executor(None, process_warc)

            return JsonRow(
                value=json_dumps(result),
                loc=self._make_location(start, length),
                metadata={"content_length": result.get("content_length", 0)},
            )
        except Exception as e:
            raise AppEx(
                code=ErrorCode.S3_CLIENT_40004_UNKNOWN_ERROR,
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error reading record: {str(e)}",
            )

    async def read_by_range(
        self, start_byte: int, end_byte: int | None = None
    ) -> AsyncIterator[Tuple[Union[str, bytes, dict], int]]:
        """
        按字节范围读取文件内容，支持文本和压缩文件。

        Args:
            start_byte: 起始字节位置
            end_byte: 结束字节位置，如果为 None 则读取到文件末尾

        Yields:
            Tuple[Union[str, bytes, dict], int]: (内容块, 偏移量)
            - 对于文本文件：返回 (文本内容, 偏移量)
            - 对于压缩文件：返回 (解压后的内容, 偏移量)
            - 对于 JSONL 文件：返回 (解析后的 JSON 对象, 偏移量)
        """

        # 创建包装函数正确处理get_object
        def get_object():
            return self.client.get_object(
                Bucket=self.bucket_name,
                Key=self.key_without_query,
                Range=f"bytes={start_byte}-{end_byte}"
                if end_byte
                else f"bytes={start_byte}-",
                RequestPayer="requester",
            )

        response = await S3Reader._run_in_executor(get_object)
        stream = response["Body"]
        current_byte = start_byte

        if not self.is_compressed:
            # 对于非压缩文件，直接获取内容并分块返回
            def read_chunks():
                return stream.read()

            content = await S3Reader._run_in_executor(read_chunks)

            # 按块返回内容
            chunk_size = 8192  # 8KB 块大小
            for i in range(0, len(content), chunk_size):
                chunk = content[i : i + chunk_size]
                yield chunk, current_byte
                current_byte += len(chunk)
        else:
            # 对于压缩文件，先读取全部内容再解压处理
            def read_and_decompress():
                data = stream.read()
                decompressor = zlib.decompressobj(32 + zlib.MAX_WBITS)
                decompressed_data = decompressor.decompress(data)
                decompressed_data += decompressor.flush()
                return decompressed_data

            decompressed_content = await S3Reader._run_in_executor(read_and_decompress)

            if self.key_without_query.endswith(".jsonl.gz"):
                # 对于 JSONL 文件，解析每一行
                lines = decompressed_content.splitlines()
                for line in lines:
                    if line:
                        try:
                            yield json.loads(line.decode("utf-8")), current_byte
                        except json.JSONDecodeError:
                            yield line, current_byte
                        current_byte += len(line) + 1  # +1 for newline
            else:
                # 按块返回解压后的内容
                chunk_size = 8192
                for i in range(0, len(decompressed_content), chunk_size):
                    chunk = decompressed_content[i : i + chunk_size]
                    yield chunk, current_byte
                    current_byte += len(chunk)

    async def get_object_owner(self):
        try:
            async for _, details, _ in self.list_objects(limit=1):
                owner = details.get("Owner")

            return f"{owner.get('DisplayName')}/{owner.get('ID')}" if owner else None

        except Exception as e:
            print(e)
            return None

    def _make_location(self, start: int, offset: Optional[int] = None):
        return f"s3://{self.bucket_name}/{self.key_without_query}?bytes={start},{offset}"

    async def read_s3_row_with_cache(self, start: int, length: int | None = None):
        """
        读取S3行，并缓存结果，Need redis support
        """
        row = None
        cache_key = f"s3_svc:s3://{self.bucket_name}/{self.key}"
        cached_result = redis_client.get(cache_key)

        if cached_result:
            cached_row = json.loads(cached_result)
            row = JsonRow(value=cached_row.get("row"), loc=cached_row.get("path"))
        else:
            row = await self.read_row(start=start, length=length)
            redis_client.set(
                cache_key, json.dumps({"row": row.value, "path": row.loc}), ex=120
            )

        # cache next row
        asyncio.create_task(self.cache_s3_next_row(path=row.loc))

        return row

    async def cache_s3_next_row(self, path: str):
        path, offset, length = extract_bytes_range(path)
        next_offset = offset + length

        next_row_cache_key = f"s3_svc:{path}?bytes={next_offset},0"

        cached_result = redis_client.get(next_row_cache_key)

        if cached_result:
            return

        # 如果是jsonl，最大获取2mb
        length = 2 << 20 if self.key_without_query.endswith(".jsonl") else None

        next_row = await self.read_row(start=next_offset, length=length)
        redis_client.set(
            next_row_cache_key,
            json.dumps({"row": next_row.value, "path": next_row.loc}),
            ex=120,
        )

    async def read_row(
        self,
        start: int,
        length: int | None = None,
    ) -> JsonRow:
        """
        根据字节范围读取一行内容。

        Args:
            start: 起始字节位置
            length: 读取长度，如果为 None 则读取从 start 开始的完整一行

        Returns:
            JsonRow: (行内容, 偏移量, 行号)
        """
        if self.is_compressed:
            return await self.read_gz_row(start=start, length=length)

        try:
            # 获取文件头部信息
            file_header_info = await self.head_object()
            content_length = file_header_info.get("ContentLength", 0)
            
            # 设置读取限制
            _MAX_TOTAL_SIZE = 10 << 20  # 10MB
            MAX_TOTAL_SIZE = min(content_length, _MAX_TOTAL_SIZE)
            NEXT_READ_SIZE = 1 << 20  # 1MB

            current_start = start
            total_size = 0
            buffer = bytearray()

            while total_size < MAX_TOTAL_SIZE:
                # 计算本次读取的大小，确保不超过文件末尾
                remaining_size = content_length - current_start
                if remaining_size <= 0:
                    break
                    
                read_size = min(NEXT_READ_SIZE, remaining_size)

                try:
                    range_header = f"bytes={current_start}-{current_start + read_size - 1}"
                    
                    def get_object_sync():
                        return self.client.get_object(
                            Bucket=self.bucket_name,
                            Key=self.key_without_query,
                            Range=range_header,
                            RequestPayer="requester",
                        )

                    response = await self._run_in_executor(get_object_sync)
                    stream = response["Body"]

                    # 读取数据
                    chunk = await self._run_in_executor(stream.read)
                    if not chunk:
                        break

                    buffer.extend(chunk)
                    total_size += len(chunk)

                    # 查找换行符
                    newline_pos = buffer.find(b"\n")
                    if newline_pos != -1:
                        # 找到换行符，提取内容
                        line = buffer[:newline_pos]
                        new_start = start
                        new_len = len(line) + 1

                        # 处理行内容
                        try:
                            decoded_line = line.decode("utf-8")
                        except UnicodeDecodeError:
                            try:
                                decoded_line = line.decode("latin1")
                            except UnicodeDecodeError:
                                decoded_line = str(line)

                        return JsonRow(
                            value=decoded_line,
                            loc=self._make_location(new_start, new_len),
                            offset=new_len,
                            size=len(line),
                        )

                    # 更新下一次读取的起始位置
                    current_start += len(chunk)
                    
                except ClientError as e:
                    error_code = e.response["Error"]["Code"]
                    if error_code == "NoSuchKey":
                        raise AppEx(
                            code=ErrorCode.S3_CLIENT_40003_NOT_FOUND,
                            status_code=status.HTTP_404_NOT_FOUND,
                            detail=f"Object {self.key_without_query} not found",
                        )
                    elif error_code == "AccessDenied":
                        raise AppEx(
                            code=ErrorCode.S3_CLIENT_40001_ACCESS_DENIED,
                            status_code=status.HTTP_403_FORBIDDEN,
                            detail=f"Access denied to object {self.key_without_query}",
                        )
                    else:
                        raise AppEx(
                            code=ErrorCode.S3_CLIENT_40004_UNKNOWN_ERROR,
                            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail=f"S3 client error: {str(e)}",
                        )
                except Exception as e:
                    logger.error(f"Error reading S3 object: {e}")
                    raise AppEx(
                        code=ErrorCode.S3_CLIENT_40004_UNKNOWN_ERROR,
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail=f"Failed to read object: {str(e)}",
                    )

            # 如果达到最大限制还没找到换行符，返回所有内容
            try:
                decoded_line = buffer.decode("utf-8")
            except UnicodeDecodeError:
                try:
                    decoded_line = buffer.decode("latin1")
                except UnicodeDecodeError:
                    decoded_line = str(buffer)

            return JsonRow(
                value=decoded_line,
                loc=self._make_location(start, len(buffer)),
                offset=len(buffer),
                size=len(buffer),
            )
            
        except Exception as e:
            if isinstance(e, AppEx):
                raise
            logger.error(f"Unexpected error in read_row: {e}")
            raise AppEx(
                code=ErrorCode.S3_CLIENT_40004_UNKNOWN_ERROR,
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Unexpected error: {str(e)}",
            )

    async def read_gz_row(self, start: int, length: int | None = None) -> JsonRow:
        """
        根据字节范围读取压缩文件中的一行内容。

        Args:
            start: 起始字节位置
            length: 结束字节位置，如果为 None 则读取从 start 开始的完整一行

        Returns:
            JsonRow: (行内容, 偏移量, 行号)
        """
        if self.key_without_query.endswith(".warc.gz"):
            return await self.read_warc_gz(start=start, length=length)

        try:
            # 从文件开头读取数据
            response = await S3Reader._run_in_executor(
                self.client.get_object,
                Bucket=self.bucket_name,
                Key=self.key_without_query,
                Range=self._get_range_header(start, length),
            )
            stream = response["Body"]

            # 使用warcio的BufferedReader来处理gz文件
            from warcio.bufferedreaders import BufferedReader

            # 创建一个字节流对象
            buff_reader = BufferedReader(stream, decomp_type="gzip")

            # 读取解压后的内容
            line = None
            original_length = 0

            while True:
                line = buff_reader.readline()

                if line:
                    original_length = stream.tell() - buff_reader.rem_length()
                    break
                elif buff_reader.read_next_member():
                    continue
                else:
                    break

            try:
                # 尝试解析为JSON
                decoded_line = line.decode("utf-8").rstrip("\r\n")
                # 验证是否为有效的JSON
                json.loads(decoded_line)
            except (UnicodeDecodeError, json.JSONDecodeError):
                try:
                    decoded_line = line.decode("latin1")
                except Exception:
                    decoded_line = str(line)

            return JsonRow(
                value=decoded_line,
                loc=self._make_location(start, original_length),
                offset=original_length,
            )

        except Exception as e:
            logger.error(f"Error reading gz file: {e}")
            return JsonRow(value="", loc=self._make_location(start, 0), offset=0)

    async def get_s3_presigned_url(self, as_attachment=True) -> str:
        params = {"Bucket": self.bucket_name, "Key": self.key_without_query}
        if as_attachment:
            filename = self.key_without_query.split("/")[-1]
            params["ResponseContentDisposition"] = f'attachment; filename="{filename}"'

        # 创建包装函数正确处理所有参数
        def generate_url():
            return self.client.generate_presigned_url("get_object", Params=params)

        return await S3Reader._run_in_executor(generate_url)

    async def download(self, as_attachment=True) -> StreamingResponse:
        try:
            return await self.get_s3_presigned_url(as_attachment=as_attachment) 
        except Exception as e:
            if isinstance(e, HTTPException):
                raise
            raise AppEx(
                code=ErrorCode.S3_CLIENT_40004_UNKNOWN_ERROR,
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to prepare download: {str(e)}",
            )
