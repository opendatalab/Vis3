import asyncio
import codecs
import io
import json
import urllib.parse
import zlib
from typing import AsyncIterator, Optional, Tuple, Union

import boto3
import httpx
import magic
from botocore.client import Config
from botocore.exceptions import ClientError, NoCredentialsError
from fastapi import HTTPException, UploadFile, status
from fastapi.responses import StreamingResponse
from loguru import logger

from visu.internal.common.exceptions import AppEx, ErrorCode
from visu.internal.schema import JsonRow
from visu.internal.utils import decrypt_secret_key, json_dumps, ping_host, timer
from visu.internal.utils.path import extract_bytes_range, split_s3_path


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
    def __init__(
        self,
        key: str,
        buckets_dict: dict,
        aws_access_key_id: str,
        aws_secret_access_key: str,
        region_name: str = "us-east-1",
        bucket: str | None = None,
        endpoint_url: str | None = None,
    ):
        self.bucket = bucket
        self.key = key
        self.key_without_query = key.split("?")[0]
        self.aws_access_key_id = aws_access_key_id
        self.aws_secret_access_key = aws_secret_access_key
        self.region_name = region_name
        self.buckets_dict = buckets_dict
        self.endpoint_url = endpoint_url
        self.is_compressed = self.key_without_query.endswith(".gz")

        if self.aws_access_key_id and self.aws_secret_access_key:
            self.client = self.get_client(self.aws_access_key_id, self.aws_secret_access_key, self.endpoint_url, self.region_name)

    async def _run_in_executor(self, func, *args, **kwargs):
        loop = asyncio.get_event_loop()

        # 创建一个包装函数来处理关键字参数
        def wrapper():
            return func(*args, **kwargs)

        return await loop.run_in_executor(None, wrapper)

    def _get_range_header(self, start: int, length: int | None = None):
        max_end = start + MAX_END
        if length is None or length == 0:
            # 如果 offset 为空，读取从 start 开始的 1MB 数据
            # 这个大小足够读取一行，同时避免读取过多数据
            range_header = f"bytes={start}-{max_end}"
        else:
            range_header = f"bytes={start}-{start + length}"

        return range_header
    
    async def get_client(self, ak: str, sk: str, endpoint: str, region_name: str):
        try:
            return boto3.client(
                "s3",
                aws_access_key_id=ak,
                aws_secret_access_key=sk,
                region_name=region_name,
                endpoint_url=endpoint,
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
                return await self._run_in_executor(
                    self.client.head_object,
                    Bucket=self.bucket,
                    Key=self.key_without_query,
                )
        except ClientError as e:
            error_code = e.response["Error"]["Code"]
            if error_code == "NoSuchBucket":
                raise ValueError(f"Bucket {self.bucket} does not exist")
            elif error_code == "AccessDenied":
                raise PermissionError(f"Access denied to bucket {self.bucket}")
            elif error_code == "404":
                raise ValueError(
                    f"Object {self.key_without_query} does not exist in bucket {self.bucket}"
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

    async def mime_type(self) -> str:
        """
        通过 magic 获取 S3 对象的 MIME 类型。

        Returns:
            str: 文件的 MIME 类型

        Raises:
            ValueError: 当 bucket 不存在时
            PermissionError: 当没有访问权限时
            ClientError: 其他 S3 客户端错误
        """
        try:
            # 获取文件的前 2048 字节用于 MIME 类型检测
            response = await self._run_in_executor(
                self.client.get_object,
                Bucket=self.bucket,
                Key=self.key_without_query,
                Range="bytes=0-2047",
            )
            stream = response["Body"]

            # 读取文件内容
            content = bytearray()
            for chunk in stream:
                content.extend(chunk)
                if len(content) >= 2048:
                    break

            # 使用 python-magic 检测 MIME 类型
            mime = magic.Magic(mime=True)
            return mime.from_buffer(bytes(content))

        except ClientError as e:
            error_code = e.response["Error"]["Code"]
            if error_code == "NoSuchBucket":
                raise ValueError(f"Bucket {self.bucket} does not exist")
            elif error_code == "AccessDenied":
                raise PermissionError(f"Access denied to bucket {self.bucket}")
            elif error_code == "404":
                raise ValueError(
                    f"Object {self.key_without_query} does not exist in bucket {self.bucket}"
                )
            else:
                raise

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
                "Bucket": self.bucket,
                "Prefix": self.key_without_query,
                "MaxKeys": page_size,
                "Delimiter": "/" if not recursive else None,
            }
            if marker:
                operation_parameters["Marker"] = marker

            try:
                result = await self._run_in_executor(
                    self.client.list_objects, **operation_parameters
                )
            except ClientError as e:
                error_code = e.response["Error"]["Code"]
                if error_code == "NoSuchBucket":
                    raise ValueError(f"Bucket {self.bucket} does not exist")
                elif error_code == "AccessDenied":
                    raise PermissionError(f"Access denied to bucket {self.bucket}")
                else:
                    raise

            contents = result.get("Contents", [])
            common_prefixes = result.get("CommonPrefixes", [])
            next_marker = result.get("NextMarker")

            if current_page == page_no:
                for content in contents:
                    if not content["Key"].endswith("/"):
                        yield (
                            f"s3://{self.bucket}/{content['Key']}",
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
                        f"s3://{self.bucket}/{_prefix['Prefix']}",
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

            response = await self._run_in_executor(
                self.client.get_object,
                Bucket=self.bucket,
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
            raise HTTPException(
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
                Bucket=self.bucket,
                Key=self.key_without_query,
                Range=f"bytes={start_byte}-{end_byte}"
                if end_byte
                else f"bytes={start_byte}-",
                RequestPayer="requester",
            )

        response = await self._run_in_executor(get_object)
        stream = response["Body"]
        current_byte = start_byte

        if not self.is_compressed:
            # 对于非压缩文件，直接获取内容并分块返回
            def read_chunks():
                return stream.read()

            content = await self._run_in_executor(read_chunks)

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

            decompressed_content = await self._run_in_executor(read_and_decompress)

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
        return f"s3://{self.bucket}/{self.key_without_query}?bytes={start},{offset}"

    async def read_s3_row_with_cache(self, start: int, length: int | None = None):
        row = None
        cache_key = f"s3_svc:s3://{self.bucket}/{self.key}"
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
        length: Optional[int] = None,
    ) -> JsonRow:
        """
        根据字节范围读取一行内容。

        Args:
            start: 起始字节位置
            offset: 结束字节位置，如果为 None 则读取从 start 开始的完整一行

        Returns:
            JsonRow: (行内容, 偏移量, 行号)
        """
        if self.is_compressed:
            return await self.read_gz_row(start=start, length=length)

        # 变成异步
        def get_object_sync():
            return self.client.get_object(
                Bucket=self.bucket,
                Key=self.key_without_query,
                Range=self._get_range_header(start=start, length=length),
                RequestPayer="requester",  # 添加请求者付费支持
            )

        response = await asyncio.get_event_loop().run_in_executor(
            None,
            get_object_sync,
        )
        stream = response["Body"]
        # 读取数据
        buffer = bytearray()
        for chunk in stream:
            buffer.extend(chunk)

        start_pos = 0
        # 查找第一个换行符，如果 pos 为 0，则找第二个换行符
        newline_pos = buffer.find(b"\n")

        if newline_pos == 0:
            newline_pos = buffer.find(b"\n", newline_pos + 1)
            start_pos = 1

        if newline_pos == -1:
            # 如果没有找到换行符，返回整个缓冲区内容
            line = buffer
        else:
            # 提取到换行符为止的内容
            line = buffer[start_pos:newline_pos]

        new_start = start + start_pos
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
            response = await self._run_in_executor(
                self.client.get_object,
                Bucket=self.bucket,
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
        params = {"Bucket": self.bucket, "Key": self.key_without_query}
        if as_attachment:
            filename = self.key_without_query.split("/")[-1]
            params["ResponseContentDisposition"] = f'attachment; filename="{filename}"'

        # 创建包装函数正确处理所有参数
        def generate_url():
            return self.client.generate_presigned_url("get_object", Params=params)

        return await self._run_in_executor(generate_url)

    async def upload(
        self,
        file: UploadFile,
        metadata: dict = None,
        content_type: str = None,
        callback=None,
    ):
        """
        上传文件到S3存储桶。

        Args:
            file: 要上传的文件对象
            metadata: 文件元数据字典（可选）
            content_type: 文件内容类型（可选，如不提供将自动检测）
            callback: 进度回调函数（可选）

        Raises:
            HTTPException: 上传过程中发生错误
        """
        try:
            # 检测内容类型（如果未提供）
            if not content_type:
                # 读取文件前几个字节用于内容类型检测
                file_head = await file.read(2048)
                mime = magic.Magic(mime=True)
                content_type = mime.from_buffer(file_head)
                # 重置文件指针
                await file.seek(0)

            # 准备上传参数
            extra_args = {"ContentType": content_type}

            # 添加自定义元数据（如果提供）
            if metadata:
                for key, value in metadata.items():
                    if isinstance(value, str):
                        extra_args[f"Metadata-{key}"] = value

            # 使用进度回调（如果提供）
            if callback:

                def _progress_callback(bytes_transferred):
                    # 避免阻塞上传过程
                    asyncio.create_task(callback(bytes_transferred))

                extra_args["Callback"] = _progress_callback

            await self._run_in_executor(
                self.client.upload_fileobj,
                Fileobj=file.file,
                Bucket=self.bucket,
                Key=self.key_without_query,
                ExtraArgs=extra_args,
            )

            return f"s3://{self.bucket}/{self.key_without_query}"

        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code", "UnknownError")
            error_message = e.response.get("Error", {}).get("Message", str(e))

            if error_code == "NoSuchBucket":
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"目标存储桶 {self.bucket} 不存在",
                )
            elif error_code == "AccessDenied":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"无访问权限上传到存储桶 {self.bucket}",
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"上传文件时发生错误: {error_message} (错误代码: {error_code})",
                )
        except NoCredentialsError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="S3认证失败，请检查访问凭证",
            )
        except Exception as e:
            logger.error(f"上传文件到S3时发生未预期错误: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"上传文件失败: {str(e)}",
            )

    async def download(self, as_attachment=True) -> StreamingResponse:
        try:
            presigned_url = await self.get_s3_presigned_url(as_attachment=as_attachment)
            file_header_info = await self.head_object()
            chunk_size = 1024 * 1024

            async def stream_file():
                async with httpx.AsyncClient() as http_client:
                    try:
                        async with http_client.stream("GET", presigned_url) as response:
                            if response.status_code != 200:
                                raise HTTPException(
                                    status_code=response.status_code,
                                    detail=f"Failed to download file: {response.text}",
                                )

                            async for chunk in response.aiter_bytes(
                                chunk_size=chunk_size
                            ):
                                yield chunk
                    except httpx.RequestError as e:
                        raise HTTPException(
                            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail=f"Failed to stream file: {str(e)}",
                        )
                    except Exception as e:
                        raise HTTPException(
                            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail=f"Unexpected error while streaming file: {str(e)}",
                        )

            headers = {
                "Content-Disposition": f'attachment; filename="{urllib.parse.quote(self.key_without_query)}"',
                "Content-Type": file_header_info.get(
                    "ContentType", "application/octet-stream"
                ),
            }

            return StreamingResponse(
                stream_file(),
                headers=headers,
                media_type=file_header_info.get(
                    "ContentType", "application/octet-stream"
                ),
            )
        except Exception as e:
            if isinstance(e, HTTPException):
                raise
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to prepare download: {str(e)}",
            )

    async def get_path_size(self):
        try:
            if not self.key_without_query.endswith("/"):
                file_header_info = await self.head_object()

                return (
                    file_header_info.get("ContentLength", 0) if file_header_info else 0
                )

            total_size = 0

            paginator = await self._run_in_executor(
                self.client.get_paginator, "list_objects_v2"
            )

            # 创建包装函数处理分页器的同步调用
            def process_pages():
                nonlocal total_size
                pages = paginator.paginate(
                    Bucket=self.bucket, Prefix=self.key_without_query
                )

                for page in pages:
                    contents = page.get("Contents")
                    if contents is None:
                        continue
                    for obj in contents:
                        total_size += obj["Size"]

            await self._run_in_executor(process_pages)
            return total_size

        except Exception as e:
            print(e)
            # 表示获取s3目录大小异常
            return -1