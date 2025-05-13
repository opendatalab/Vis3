from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession

from visu.common.db import get_db
from visu.config import settings
from visu.crud.user import user_crud
from visu.models.user import User
from visu.schema.user import TokenPayload

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/v1/auth/login")


async def get_current_user(
    db: AsyncSession = Depends(get_db), token: str = Depends(oauth2_scheme)
) -> User:
    """
    获取当前用户
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="无法验证凭据",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            token, settings.PASSWORD_SECRET_KEY, algorithms=[settings.TOKEN_GENERATE_ALGORITHM]
        )
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        token_data = TokenPayload(sub=user_id)
    except JWTError:
        raise credentials_exception
    
    user = await user_crud.get(db, id=int(token_data.sub))
    if user is None:
        raise credentials_exception
    return user


def get_current_user_when_available(
    db: AsyncSession = Depends(get_db), token: str = Depends(oauth2_scheme)
) -> Optional[User]:
    """
    尝试获取当前用户，但不强制要求
    """
    try:
        return get_current_user(db, token)
    except HTTPException:
        return None 