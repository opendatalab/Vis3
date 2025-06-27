from typing import Tuple
from urllib.parse import parse_qsl, quote, urlparse

from fastapi import status
from fastapi.responses import HTMLResponse, StreamingResponse
from loguru import logger
from sqlalchemy.orm import Session

from vis3.internal.api.v1.schema.response import ItemResponse, ListResponse
from vis3.internal.api.v1.schema.response.bucket import BucketResponse, PathType
from vis3.internal.client.s3_reader import S3Reader
from vis3.internal.common.exceptions import AppEx, ErrorCode
from vis3.internal.crud.bucket import bucket_crud
from vis3.internal.models.bucket import Bucket
from vis3.internal.utils import (
    convert_epub_stream_to_html,
    convert_mobi_stream_to_html,
    should_not_read_as_raw,
    timer,
)
from vis3.internal.utils.path import split_s3_path


async def get_bucket(path: str, db: Session, id: int | None = None) -> Tuple[Bucket, S3Reader]:
    bucket_name, key = split_s3_path(path)
    
    if id:
        bucket = await bucket_crud.get(db, id=id)
    else:
        buckets = await bucket_crud.list_by_path(db, path=f"s3://{bucket_name}/")

        if len(buckets) > 0:
            bucket = buckets[0]
        else:
            raise AppEx(
                code=ErrorCode.BUCKET_30001_OBJECT_NOT_FOUND,
                status_code=status.HTTP_404_NOT_FOUND,
            )

    if not bucket:
        raise AppEx(
            code=ErrorCode.BUCKET_30001_OBJECT_NOT_FOUND,
            status_code=status.HTTP_404_NOT_FOUND,
        )
    
    s3_reader = S3Reader(
        bucket=bucket,
        bucket_name=bucket_name,
        key=key,
        endpoint_url=bucket.endpoint,
        access_key_id=bucket.keychain.access_key_id,
        secret_access_key=bucket.keychain.decrypted_secret_key_id,
    )

    return bucket, s3_reader


async def get_s3_directories(
    s3_reader: S3Reader, page_no, page_size
):
    list_of_gn = s3_reader.list_objects(
        recursive=False,
        page_no=page_no,
        page_size=page_size,
    )

    result = []

    async for gn in list_of_gn:
        _path = gn[0] if isinstance(gn, tuple) else gn
        details = gn[1] if isinstance(gn, tuple) else {}

        target_type = PathType.Directory if _path.endswith("/") else PathType.File
        # 基础信息
        owner = details.get("Owner")
        display_name = owner.get("DisplayName") if owner else ""
        owner_id = owner.get("ID") if owner else ""
        last_modified = details.get("LastModified")
        size = details.get("Size") or details.get("ContentLength")

        result.append(
            BucketResponse(
                type=target_type,
                path=_path,
                owner=f"{display_name}/{owner_id}" if owner else None,
                last_modified=last_modified,
                size=size,
                id=s3_reader.bucket.id,
            )
        )

    return result


async def get_file(parsed_path: str, query_dict: dict, s3_reader: S3Reader):
    with timer("get_file"):
        file_header_info = await s3_reader.head_object()
        size = file_header_info.get("ContentLength", 0) if file_header_info else 0

        if size == 0:
            return BucketResponse(
                type=PathType.File,
                id=s3_reader.bucket.id,
                owner=await s3_reader.get_object_owner(),
                size=size,
                path=s3_reader.path,
                last_modified=file_header_info.get("LastModified")
                if file_header_info
                else None,
            )

        mimetype = await s3_reader.mime_type()

        if mimetype and should_not_read_as_raw(mimetype):
            return BucketResponse(
                type=PathType.File,
                id=s3_reader.bucket.id,
                owner=await s3_reader.get_object_owner(),
                size=size,
                mimetype=mimetype,
                path=s3_reader.path,
                last_modified=file_header_info.get("LastModified"),
            )

        if file_header_info is None:
            raise AppEx(
                code=ErrorCode.BUCKET_30001_OBJECT_NOT_FOUND,
                status_code=status.HTTP_404_NOT_FOUND,
            )

        owner = await s3_reader.get_object_owner()
        chunk_size = min(size, 1 << 20)

        if not chunk_size:
            return BucketResponse(
                type=PathType.File,
                id=s3_reader.bucket.id,
                owner=owner,
                size=size,
                mimetype=mimetype,
                content="",
                path=s3_reader.path,
                last_modified=file_header_info.get("LastModified"),
            )

        request_byte_start = query_dict.get("bytes", "").split(",")[0]
        request_byte_start = (
            int(request_byte_start)
            if request_byte_start or request_byte_start != ""
            else 0
        )

        if request_byte_start and request_byte_start >= size:
            raise AppEx(
                code=ErrorCode.BUCKET_30002_OUT_OF_RANGE,
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        # 文件
        if parsed_path.endswith(".jsonl") or parsed_path.endswith(".jsonl.gz") or parsed_path.endswith(".warc.gz"):
            row = await s3_reader.read_row(start=request_byte_start)

            return BucketResponse(
                type=PathType.File,
                id=s3_reader.bucket.id,
                owner=owner,
                size=size,
                mimetype=mimetype,
                last_modified=file_header_info.get("LastModified"),
                content=row.value,
                path=row.loc,
            )

        rest_size = size - request_byte_start

        if rest_size <= 0:
            raise AppEx(
                code=ErrorCode.BUCKET_30002_OUT_OF_RANGE,
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        # 读取文本
        logger.info(f"read s3 object: {s3_reader.key_without_query}, rest size: {rest_size}")
        # 读取非jsonl的文本内容，依次读取1mb的内容
        read_size = min(rest_size, 1 << 20)
        byte_range = f"{request_byte_start},{read_size}"
        content = ""

        async for chunk, _ in s3_reader.read_by_range(
            start_byte=request_byte_start,
            end_byte=request_byte_start + read_size,
        ):
            content += chunk.decode("utf-8", errors="ignore")

        return BucketResponse(
            type=PathType.File,
            id=s3_reader.bucket.id,
            owner=owner,
            size=size,
            mimetype=mimetype,
            last_modified=file_header_info.get("LastModified"),
            content=content,
            path=f"s3://{s3_reader.bucket_name}/{s3_reader.key_without_query}?bytes={byte_range}",
        )


async def get_buckets_or_objects(
    path: str,
    page_no: int,
    page_size: int,
    db: Session,
    id: int | None = None,
    user_id: int | None = None,
):
    """获取bucket或目录或文件
    """
    result = None
    # 获取所有bucket列表
    if path is None or path == "" or path == "/":
        buckets, total = await bucket_crud.get_by_user_id(db, user_id=user_id) if user_id else await bucket_crud.get_multi(db)
        result = [
            BucketResponse(
                id=bucket.id,
                keychain_id=bucket.keychain_id,
                keychain_name=bucket.keychain.name,
                type=PathType.Bucket
                if bucket.path.endswith("/")
                else PathType.File,
                path=bucket.path,
                owner=bucket.user.username if bucket.user else None,
                endpoint=bucket.endpoint,
                last_modified=None,
                size=None,
            )
            for bucket in buckets
        ]

        return ListResponse[BucketResponse](data=result, total=total)
    
    _, s3_reader = await get_bucket(path, db, id)
    path_without_query, _, query = path.partition("?")
    s3_path = quote(path_without_query, safe=":/")
    parsed_url = urlparse(s3_path)
    parsed_path = parsed_url.path
    
    # 目录
    if parsed_path.endswith("/") or s3_reader.key == "":
        with timer("get s3 dirs"):
            result = await get_s3_directories(
                s3_reader=s3_reader,
                page_no=page_no,
                page_size=page_size,
            )
        return ListResponse[BucketResponse](data=result, total=len(result))

    # 文件
    result = await get_file(
        parsed_path=parsed_path,
        query_dict=dict(parse_qsl(query)),
        s3_reader=s3_reader,
    )

    return ItemResponse[BucketResponse](data=result)


async def preview_file(
    path: str,
    db: Session,
    mimetype: str = None,
    id: int | None = None,
):
    """
    预览文件内容，支持多种文件格式。

    Args:
        mimetype: 文件的 MIME 类型
        s3_reader: S3Reader 实例

    Returns:
        StreamingResponse: 文件流响应
        HTMLResponse: 对于特殊格式（如 EPUB、MOBI）的 HTML 响应

    Raises:
        AppEx: 当文件不存在或大小超出限制时
    """
    _, s3_reader = await get_bucket(path, db, id)
    # 获取文件信息
    file_header_info = await s3_reader.head_object()
    if file_header_info is None:
        raise AppEx(
            code=ErrorCode.BUCKET_30001_OBJECT_NOT_FOUND,
            status_code=status.HTTP_404_NOT_FOUND,
        )

    file_size = file_header_info.get("ContentLength")
    max_file_size = 40 << 20  # 40 MB

    if file_size > max_file_size:
        raise AppEx(
            code=ErrorCode.BUCKET_30002_OUT_OF_RANGE,
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    # 获取文件类型
    if not mimetype:
        mimetype = await s3_reader.mime_type()
        if not mimetype:
            raise AppEx(
                code=ErrorCode.BUCKET_30005_DATA_IS_EMPTY,
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    # 处理特殊格式文件
    if mimetype in ("application/x-mobipocket-ebook", "application/epub+zip"):
        # 使用流式读取处理大文件
        chunks = []
        async for chunk, _ in s3_reader.read_by_range(start_byte=0):
            chunks.append(chunk)
            if len(chunks) > max_file_size:  # 限制内存使用
                raise AppEx(
                    code=ErrorCode.BUCKET_30002_OUT_OF_RANGE,
                    status_code=status.HTTP_400_BAD_REQUEST,
                )

        full_content = b"".join(chunks)
        if mimetype == "application/x-mobipocket-ebook":
            html_content = convert_mobi_stream_to_html(full_content)
        else:
            html_content = convert_epub_stream_to_html(full_content)
        return HTMLResponse(content=html_content, media_type="text/html")

    # 对于其他文件类型，使用流式响应
    async def content_generator():
        try:
            async for chunk, _ in s3_reader.read_by_range(
                start_byte=0, end_byte=file_size
            ):
                yield chunk
        except Exception as e:
            logger.error(f"文件流处理错误: {str(e)}")
            raise

    response = StreamingResponse(
        content_generator(),
        media_type=mimetype,
        headers={
            "Accept-Ranges": "bytes",
        },
    )


    return response