from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from vis3.internal.api.dependencies.auth import get_auth_user_or_error
from vis3.internal.api.v1.schema.request.user import UserCreate, UserLogin
from vis3.internal.api.v1.schema.response.user import UserResponse
from vis3.internal.common.db import get_db
from vis3.internal.common.exceptions import AppEx, ErrorCode
from vis3.internal.config import settings
from vis3.internal.crud.user import user_crud
from vis3.internal.models.user import User
from vis3.internal.schema.state import AuthState
from vis3.internal.schema.user import Token
from vis3.internal.utils.security import create_access_token

router = APIRouter(prefix="/auth", tags=["认证"])


@router.post("/register", response_model=UserResponse)
async def register(
    user_in: UserCreate, db: Session = Depends(get_db)
) -> UserResponse:
    """
    用户注册
    """
    user = await user_crud.get_by_username(db, username=user_in.username)
    if user:
        raise AppEx(
            code=ErrorCode.AUTH_10004_USERNAME_ALREADY_EXISTS,
            status_code=status.HTTP_400_BAD_REQUEST,
        )
    user = await user_crud.create(db, obj_in=user_in)
    return user


@router.post("/login", response_model=Token)
async def login(
    response: Response,
    user_in: UserLogin,
    db: Session = Depends(get_db),
):
    """
    用户登录，获取访问令牌
    """
    result = await user_crud.authenticate(
        db, username=user_in.username, password=user_in.password
    )
    if result == AuthState.USERNAME_ERROR:
        raise AppEx(
            code=ErrorCode.AUTH_10002_INVALID_USERNAME,
            status_code=status.HTTP_400_BAD_REQUEST,
        )
    elif result == AuthState.PASSWORD_ERROR:
        raise AppEx(
            code=ErrorCode.AUTH_10003_INVALID_PASSWORD,
            status_code=status.HTTP_400_BAD_REQUEST,
        )
    else:
        user = result
    
    access_token = create_access_token(subject=user.id)

    # 设置cookie
    response.set_cookie(
        key="access_token", 
        value=access_token, 
        httponly=True, 
        secure=settings.SCHEME == "https", 
        samesite="lax",
        expires=datetime.now(timezone.utc) + timedelta(minutes=settings.TOKEN_ACCESS_EXPIRE_MINUTES),
    )
    
    return {"access_token": access_token, "token_type": settings.TOKEN_TYPE}

@router.get("/me", response_model=UserResponse)
async def get_current_user(
    current_user: User = Depends(get_auth_user_or_error),
    db: Session = Depends(get_db),
):
    """
    获取当前用户
    """
    return UserResponse(
        id=current_user.id,
        username=current_user.username,
    )

@router.get("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(response: Response):
    """
    用户登出，删除cookie
    """
    response.delete_cookie(key="access_token")

    return {"message": "登出成功"}