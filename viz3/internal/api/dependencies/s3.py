from fastapi import Depends, Request
from jose import JWTError, jwt
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from vis3.internal.client.s3_reader import S3Reader
from vis3.internal.common.db import get_db
from vis3.internal.config import settings
from vis3.internal.crud.user import user_crud
from vis3.internal.utils import decrypt_secret_key, timer
from vis3.internal.utils.path import split_s3_path


class UserCredentials(BaseModel):
    bucket_name: str | None = None
    buckets_dict: dict | None = None
    key: str
    aws_access_key_id: str | None = None
    aws_secret_access_key: str | None = None
    region_name: str | None = None
    endpoint_url: str | None = None


def make_ak_sk(bucket_info: dict) -> tuple[str, str]:
    ak = (
        bucket_info.get("ak")
        if bucket_info.get("ak")
        else bucket_info.get("ak_sk").split("/")[0]
    )
    sk = (
        bucket_info.get("sk")
        if bucket_info.get("sk")
        else bucket_info.get("ak_sk").split("/")[1]
    )
    sk = decrypt_secret_key(sk)

    return ak, sk


async def process_request_user(request: Request, db: AsyncSession):
    """
    处理请求中的用户信息
    
    如果请求已经有用户信息，直接返回；
    否则尝试从cookie中获取令牌并解析用户
    """
    # 如果请求中已经有用户信息，直接返回
    if hasattr(request.state, "user"):
        return
    
    # 如果没有用户信息，尝试从cookie中获取令牌
    access_token = request.cookies.get("access_token")
    if not access_token:
        return
    
    try:
        # 解析令牌
        payload = jwt.decode(
            access_token, 
            settings.PASSWORD_SECRET_KEY, 
            algorithms=[settings.TOKEN_GENERATE_ALGORITHM]
        )
        user_id = payload.get("sub")
        if not user_id:
            return
        
        # 获取用户
        user = await user_crud.get(db, id=int(user_id))
        if user:
            # 将用户信息附加到请求状态
            request.state.user = user
    except JWTError:
        pass


async def get_s3_info(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> UserCredentials:
    path = request.query_params.get("path")
    bucket_name, key = split_s3_path(path)
    
    # 处理请求中的用户信息
    if settings.ENABLE_AUTH:
        await process_request_user(request, db)
        authenticated = hasattr(request.state, "user")
    else:
        # 如果未启用鉴权，视为未认证
        authenticated = False

    with timer("get_s3_info"):
        # 获取bucket信息的辅助函数
        def create_credentials(bucket_info: dict | None) -> UserCredentials:
            return UserCredentials(
                key=key,
                bucket_name=bucket_name,
                aws_access_key_id=bucket_info.get("ak") if bucket_info else None,
                aws_secret_access_key=bucket_info.get("sk") if bucket_info else None,
                region_name=bucket_info.get("region") if bucket_info else None,
                endpoint_url=bucket_info.get("endpoint") if bucket_info else None,
            )

        # 1. 检查自定义bucket
        if authenticated:
            # TODO
            _, buckets_dict = (None, {})
            if bucket_info := buckets_dict.get(bucket_name):
                ak, sk = make_ak_sk(bucket_info)
                bucket_info["ak"] = ak
                bucket_info["sk"] = sk
                return create_credentials(bucket_info)

        return None


async def get_s3_reader(
    request: Request, s3_info: UserCredentials = Depends(get_s3_info)
) -> S3Reader:
    return S3Reader(
        bucket_name=s3_info.bucket_name,
        key=s3_info.key,
        aws_access_key_id=s3_info.aws_access_key_id if s3_info.aws_access_key_id else None,
        aws_secret_access_key=s3_info.aws_secret_access_key if s3_info.aws_secret_access_key else None,
        region_name=s3_info.region_name if s3_info.region_name else None,
        endpoint_url=s3_info.endpoint_url if s3_info.endpoint_url else None,
    )
