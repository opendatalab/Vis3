from typing import List, Union

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session

from visu.internal.api.dependencies.auth import get_auth_user_or_error
from visu.internal.api.v1.schema.request.bucket import (
    BucketCreateBody,
    BucketUpdateBody,
)
from visu.internal.api.v1.schema.response import ItemResponse, ListResponse, OkResponse
from visu.internal.api.v1.schema.response.bucket import BucketResponse, PathType
from visu.internal.common.db import get_db
from visu.internal.common.exceptions import AppEx, ErrorCode
from visu.internal.config import settings
from visu.internal.crud.bucket import bucket_crud
from visu.internal.crud.keychain import keychain_crud
from visu.internal.models.user import User
from visu.internal.service.bucket import (
    get_bucket,
    get_buckets_or_objects,
    preview_file,
)
from visu.internal.utils import ping_host, validate_path_accessibility
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
        user_id=current_user.id if current_user else None,
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
        created_by=current_user.username if current_user else None,
        type=PathType.Bucket,
    )

@router.post("/bucket/batch", summary="批量创建bucket")
async def create_batch_bucket_request(
    bucket_in: List[BucketCreateBody],
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_auth_user_or_error),
):
    """
    批量创建bucket
    """
    result = await bucket_crud.create_batch(db, obj_in=bucket_in, created_by=current_user.id if current_user else None)
    return [BucketResponse(
        id=bucket.id,
        name=bucket.name,
        path=bucket.path,
        endpoint=bucket.endpoint,
        created_by=current_user.username if current_user else None,
        type=PathType.Bucket,
    ) for bucket in result]

@router.patch("/bucket/{id}", summary="更新bucket")
async def update_bucket_request(
    id: int,
    bucket_in: BucketUpdateBody,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_auth_user_or_error),
):
    """
    更新bucket
    """
    result = await bucket_crud.update(db, id=id, obj_in=bucket_in, updated_by=current_user.id if current_user else None)
    return BucketResponse(
        id=result.id,
        name=result.name,
        path=result.path,
        endpoint=result.endpoint,
        created_by=current_user.username if current_user else None,
        type=PathType.Bucket,
    )


@router.get("/bucket/preview", summary="预览文件")
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
    db: Session = Depends(get_db),
):
    """
    验证路径是否可访问
    """
    keychain = await keychain_crud.get(db, id=keychain_id)
    result = await validate_path_accessibility(path, endpoint, keychain.access_key_id, keychain.decrypted_secret_key_id)

    return OkResponse(data=result)


@router.get("/bucket/ping", summary="验证endpoint是否可用")
async def make_ping_request(url: str):
    """
    验证endpoint是否可用
    """

    result = ping_host(url)

    return OkResponse(data=result)


@router.get("/bucket/{id}", summary="获取bucket详情")
async def get_bucket_request(
    id: int,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_auth_user_or_error),
):
    """
    获取bucket详情
    """
    result = None

    if not settings.ENABLE_AUTH:
        result = await bucket_crud.get(db, id=id)
    else:
        result = await bucket_crud.get_by_user_id(db, user_id=current_user.id)

    return BucketResponse(
        id=result.id,
        name=result.name,
        path=result.path,
        endpoint=result.endpoint,
        created_by=current_user.username if current_user else None,
        type=PathType.Bucket,
    )

@router.delete("/bucket/{id}", summary="删除bucket")
async def delete_bucket_request(
    id: int,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_auth_user_or_error),
):
    """
    删除bucket
    """
    await bucket_crud.delete(db, id=id)
    return OkResponse()



# TODO: 删除此接口
@router.get("/bucket/size", summary="获取路径的大小")
async def get_path_size_request():
    pass
