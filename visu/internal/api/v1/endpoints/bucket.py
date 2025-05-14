from typing import Union

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session

from visu.internal.api.dependencies.auth import get_auth_user_or_error
from visu.internal.api.v1.schema.request.bucket import BucketCreateBody
from visu.internal.api.v1.schema.response import ItemResponse, ListResponse, OkResponse
from visu.internal.api.v1.schema.response.bucket import BucketResponse
from visu.internal.common.db import get_db
from visu.internal.common.exceptions import AppEx, ErrorCode
from visu.internal.crud.bucket import bucket_crud
from visu.internal.crud.keychain import keychain_crud
from visu.internal.models.user import User
from visu.internal.service.bucket import (
    get_bucket,
    get_buckets_or_objects,
    preview_file,
)
from visu.internal.utils import ping_host
from visu.internal.utils.path import is_s3_path

router = APIRouter(tags=["buckets"])


@router.get(
    "/bucket",
    summary="获取所有 bucket 列表",
    response_model=Union[ListResponse[BucketResponse], ItemResponse[BucketResponse]],
)
async def read_bucket_request(
    request: Request,
    id: int | None = None,
    path: str = None,
    page_no: int = 1,
    page_size: int = 10,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_auth_user_or_error),
):
    """
    获取指定 bucket 下的所有对象
    """
    result = await get_buckets_or_objects(
        path=path,
        id=id,
        page_no=page_no,
        page_size=page_size,
        db=db,
    )

    return result

@router.post("/bucket", summary="创建bucket")
async def create_bucket_request(
    bucket_in: BucketCreateBody,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_auth_user_or_error),
):
    """
    创建bucket
    """
    result = await bucket_crud.create(db, obj_in=bucket_in, created_by=current_user.id if current_user else None)
    return BucketResponse(
        id=result.id,
        name=result.name,
        path=result.path,
        endpoint=result.endpoint,
        owner=result.user.username,
    )

@router.get("/bucket/file_preview", summary="预览文件")
async def file_preview_request(
    path: str,
    mimetype: str = None,
    id: int | None = None,
    db: Session = Depends(get_db),
):
    """预览s3文件"""
    if not is_s3_path(path):
        raise AppEx(
            code=ErrorCode.BUCKET_30003_INVALID_PATH,
            status_code=status.HTTP_400_BAD_REQUEST,
        )
    result = await preview_file(
        mimetype=mimetype,
        path=path,
        id=id,
        db=db,
    )

    return result


@router.get("/bucket/download", summary="下载文件")
async def download_file_request(
    path: str,
    as_attachment: bool = True,
    id: int | None = None,
    db: Session = Depends(get_db),
):
    """
    下载指定的文件。
    """
    if not path.startswith("s3://"):
        raise AppEx(
            code=ErrorCode.BUCKET_30003_INVALID_PATH,
            status_code=status.HTTP_400_BAD_REQUEST,
        )
    
    _, s3_reader = await get_bucket(path, db, id)

    return await s3_reader.download(as_attachment=as_attachment)



@router.get("/bucket/accessible", summary="验证路径是否可访问")
async def validate_path_accessibility_request(
    path: str,
    endpoint: str,
    keychain_id: int,
    id: int | None = None,
    db: Session = Depends(get_db),
):
    """
    验证路径是否可访问
    """
    _, s3_reader = await get_bucket(path, db, id)
    keychain = await keychain_crud.get(db, id=keychain_id)
    result = await s3_reader.validate_path_accessibility(path, endpoint, keychain.access_key_id, keychain.decrypted_secret_key_id)

    return OkResponse(data=result)


@router.get("/bucket/ping", summary="验证endpoint是否可用")
async def make_pint_request(url: str):
    """
    验证endpoint是否可用
    """

    result = ping_host(url)

    return OkResponse(data=result)


# TODO: 删除此接口
@router.get("/bucket/size", summary="获取路径的大小")
async def get_path_size_request():
    pass
