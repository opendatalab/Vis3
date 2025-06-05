from fastapi import Depends, Request, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from loguru import logger
from sqlalchemy.orm import Session

from vis3.internal.common.db import get_db
from vis3.internal.common.exceptions import AppEx, ErrorCode
from vis3.internal.config import settings
from vis3.internal.crud.user import user_crud
from vis3.internal.models.user import User
from vis3.internal.schema.user import TokenPayload

# 设置token_url，但不自动抛出错误
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login", auto_error=False)


async def get_token_from_request(request: Request, token: str | None = Depends(oauth2_scheme)) -> str | None:
    """
    从请求中获取token，优先从Authorization头中获取，其次从cookie中获取
    """
    if token:
        return token
    
    # 如果Authorization头中没有token，尝试从cookie中获取
    access_token = request.cookies.get("access_token")
    if access_token:
        return access_token
    
    if settings.ENABLE_AUTH:
        raise AppEx(
            code=ErrorCode.AUTH_10001_NOT_AUTHENTICATED,
            status_code=status.HTTP_401_UNAUTHORIZED,
        )
    
    return None


async def get_current_user(
    request: Request,
    db: Session = Depends(get_db), 
    token: str | None = Depends(get_token_from_request)
) -> User:
    """
    获取当前用户
    """
    logger.info(f"\(^o^)/~ get_current_user: {token}")
    
    try:
        payload = jwt.decode(
            token, settings.PASSWORD_SECRET_KEY, algorithms=[settings.TOKEN_GENERATE_ALGORITHM]
        )
        user_id: str = payload.get("sub")
        token_data = TokenPayload(sub=user_id)
    except JWTError as e:
        logger.error(f"JWT解码错误: {str(e)}")
        raise AppEx(
            code=ErrorCode.AUTH_10001_NOT_AUTHENTICATED,
            status_code=status.HTTP_401_UNAUTHORIZED,
        )
    
    user = await user_crud.get(db, id=int(token_data.sub))
    if user is None:
        logger.warning(f"找不到ID为 {token_data.sub} 的用户")
        raise AppEx(
            code=ErrorCode.AUTH_10001_NOT_AUTHENTICATED,
            status_code=status.HTTP_401_UNAUTHORIZED,
        )
    return user


async def get_auth_user_or_error(
    request: Request,
    db: Session = Depends(get_db), 
    token: str | None = Depends(get_token_from_request)
) -> User | None:
    """
    根据配置决定是否需要验证用户
    
    当ENABLE_AUTH为False时，返回None（不进行鉴权）
    当ENABLE_AUTH为True时，验证失败则抛出异常
    """
    if not settings.ENABLE_AUTH:
        return None
    
    # 当启用鉴权但未提供token时抛出异常
    if not token and settings.ENABLE_AUTH:
        raise AppEx(
            code=ErrorCode.AUTH_10001_NOT_AUTHENTICATED,
            status_code=status.HTTP_401_UNAUTHORIZED,
        )
    
    return await get_current_user(request, db, token) 