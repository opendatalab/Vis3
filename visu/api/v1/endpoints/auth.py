from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from visu.api.v1.schema.request.user import UserCreate
from visu.api.v1.schema.response.user import UserResponse
from visu.common.db import get_db
from visu.config import settings
from visu.crud.user import user_crud
from visu.schema.user import Token
from visu.utils.security import create_access_token

router = APIRouter(prefix="/auth", tags=["认证"])


@router.post("/register", response_model=UserResponse)
async def register(
    user_in: UserCreate, db: AsyncSession = Depends(get_db)
) -> UserResponse:
    """
    用户注册
    """
    user = await user_crud.get_by_username(db, username=user_in.username)
    if user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="用户名已经被注册",
        )
    user = await user_crud.create(db, obj_in=user_in)
    return user


@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
) -> Token:
    """
    用户登录，获取访问令牌
    """
    user = await user_crud.authenticate(
        db, username=form_data.username, password=form_data.password
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码不正确",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(subject=user.id)

    # 设置cookie
    response = Token(access_token=access_token, token_type=settings.TOKEN_TYPE)
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=True, samesite="strict")
    return response
