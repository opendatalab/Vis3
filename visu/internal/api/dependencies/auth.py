from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from loguru import logger
from sqlalchemy.orm import Session

from visu.internal.common.db import get_db
from visu.internal.config import settings
from visu.internal.crud.user import user_crud
from visu.internal.models.user import User
from visu.internal.schema.user import TokenPayload

# 设置token_url，但不自动抛出错误
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login", auto_error=False)


async def get_token_from_request(request: Request, token: str | None = Depends(oauth2_scheme)) -> str | None:
    """
    从请求中获取token，优先从Authorization头中获取，其次从cookie中获取
    """
    if token:
        return token
    
    # 如果Authorization头中没有token，尝试从cookie中获取
    return request.cookies.get("access_token")


async def get_current_user(
    request: Request,
    db: Session = Depends(get_db), 
    token: str | None = Depends(get_token_from_request)
) -> User:
    """
    获取当前用户
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="无法验证凭据",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    if not token:
        logger.warning("未提供认证令牌")
        raise credentials_exception
        
    try:
        payload = jwt.decode(
            token, settings.PASSWORD_SECRET_KEY, algorithms=[settings.TOKEN_GENERATE_ALGORITHM]
        )
        user_id: str = payload.get("sub")
        if user_id is None:
            logger.warning("Token中未包含用户ID")
            raise credentials_exception
        token_data = TokenPayload(sub=user_id)
    except JWTError as e:
        logger.error(f"JWT解码错误: {str(e)}")
        raise credentials_exception
    
    user = await user_crud.get(db, id=int(token_data.sub))
    if user is None:
        logger.warning(f"找不到ID为 {token_data.sub} 的用户")
        raise credentials_exception
    return user


async def get_current_user_when_available(
    request: Request,
    db: Session = Depends(get_db), 
    token: str | None = Depends(get_token_from_request)
) -> User | None:
    """
    尝试获取当前用户，但不强制要求
    """
    try:
        return await get_current_user(request, db, token)
    except HTTPException:
        return None


async def get_optional_current_user(
    request: Request,
    db: Session = Depends(get_db), 
    token: str | None = Depends(get_token_from_request)
) -> User | None:
    """
    根据配置决定是否需要验证用户
    
    当ENABLE_AUTH为False时，不进行鉴权，返回None
    当ENABLE_AUTH为True时，执行正常的鉴权流程
    """
    if not settings.ENABLE_AUTH:
        return None
    
    if not token:
        return None
        
    try:
        return await get_current_user(request, db, token)
    except HTTPException:
        return None


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
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="需要身份验证",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return await get_current_user(request, db, token) 