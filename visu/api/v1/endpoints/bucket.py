from typing import Union

from fastapi import APIRouter, Depends, Request, status

from visu.api.dependencies.s3 import get_s3_reader
from visu.api.v1.schema.response import ItemResponse, ListResponse, OkResponse
from visu.api.v1.schema.response.bucket import BucketResponse
from visu.client.s3_reader import S3Reader
from visu.common.exceptions import AppEx, ErrorCode
from visu.service.bucket import (
    clear_cache,
    get_buckets_or_objects,
    get_file_mimetype,
    preview_file,
)
from visu.utils import ping_host
from visu.utils.path import is_s3_path

router = APIRouter(tags=["buckets"])


@router.get(
    "/bucket",
    summary="获取所有 bucket 列表",
    response_model=Union[ListResponse[BucketResponse], ItemResponse[BucketResponse]],
)
async def read_bucket_request(
    request: Request,
    path: str = None,
    page_no: int = 1,
    page_size: int = 10,
    s3_reader: S3Reader = Depends(get_s3_reader),
):
    """
    获取指定 bucket 下的所有对象
    """
    result = await get_buckets_or_objects(
        path=path,
        page_no=page_no,
        page_size=page_size,
        s3_reader=s3_reader,
    )

    return result


@router.get("/bucket/file_preview", summary="预览文件")
async def file_preview_request(
    path: str,
    mimetype: str = None,
    s3_reader: S3Reader = Depends(get_s3_reader),
):
    """预览s3文件"""
    if not is_s3_path(path):
        raise AppEx(
            code=ErrorCode.BUCKET_30003_INVALID_PATH,
            status_code=status.HTTP_400_BAD_REQUEST,
        )
    result = await preview_file(
        mimetype=mimetype,
        s3_reader=s3_reader,
    )

    return result


@router.get("/bucket/download", summary="下载文件")
async def download_file_request(
    path: str,
    as_attachment: bool = True,
    s3_reader: S3Reader = Depends(get_s3_reader),
):
    """
    下载指定的文件。
    """
    if not path.startswith("s3://"):
        raise AppEx(
            code=ErrorCode.BUCKET_30003_INVALID_PATH,
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    return await s3_reader.download(as_attachment=as_attachment)


@router.get("/bucket/refresh_config", summary="清除缓存")
async def clear_cache_request():
    """
    清除缓存
    """

    await clear_cache()

    return OkResponse()


@router.get("/bucket/accessible", summary="验证路径是否可访问")
async def validate_path_accessibility_request(
    path: str,
    endpoint: str,
    ak_sk: str,
    s3_reader: S3Reader = Depends(get_s3_reader),
):
    """
    验证路径是否可访问
    """
    result = await s3_reader.validate_path_accessibility(path, endpoint, ak_sk)

    return OkResponse(data=result)


@router.get("/bucket/ping", summary="验证endpoint是否可用")
async def make_pint_request(url: str):
    """
    验证endpoint是否可用
    """

    result = ping_host(url)

    return OkResponse(data=result)


@router.get("/bucket/mimetype", summary="获取文件mimetype")
async def get_file_mimetype_request(
    s3_reader: S3Reader = Depends(get_s3_reader),
):
    """
    获取文件mimetype
    """
    result = await get_file_mimetype(s3_reader=s3_reader)

    return OkResponse(data=result)


@router.get("/bucket/size", summary="获取路径的大小")
async def get_path_size_request(
    s3_reader: S3Reader = Depends(get_s3_reader),
):
    result = await s3_reader.get_path_size()

    return OkResponse(data=result)
