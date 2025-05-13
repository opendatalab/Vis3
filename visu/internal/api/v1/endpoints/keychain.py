from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from visu.internal.api.dependencies.auth import get_auth_user_or_error
from visu.internal.api.v1.schema.request.keychain import (
    KeychainCreateBody,
    KeychainUpdateBody,
)
from visu.internal.api.v1.schema.response.keychain import KeyChainResponse
from visu.internal.common.db import get_db
from visu.internal.config import settings
from visu.internal.crud.keychain import keychain_crud
from visu.internal.models.user import User

router = APIRouter(prefix="/keychains", tags=["S3钥匙串"])


@router.get("/", response_model=List[KeyChainResponse])
async def get_keychains(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_auth_user_or_error),
) -> List[KeyChainResponse]:
    """
    获取当前用户的所有钥匙串
    """
    # 如果未启用鉴权，获取所有钥匙串
    if not settings.ENABLE_AUTH:
        result = await keychain_crud.get_multi(db, skip=skip, limit=limit)
        return result
    
    # 否则只获取当前用户的钥匙串
    keychains = await keychain_crud.get_multi_by_user(
        db, user_id=current_user.id, skip=skip, limit=limit
    )
    return keychains


@router.post("/", response_model=KeyChainResponse, status_code=status.HTTP_201_CREATED)
async def create_keychain(
    keychain_in: KeychainCreateBody,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_auth_user_or_error),
) -> KeyChainResponse:
    """
    创建新的钥匙串
    """
    # 如果未启用鉴权，创建没有用户关联的钥匙串
    if not settings.ENABLE_AUTH:
        db_obj = await keychain_crud.create(db, obj_in=keychain_in)
        return db_obj
    
    # 否则创建与用户关联的钥匙串
    keychain = await keychain_crud.create_with_user(
        db, obj_in=keychain_in, user_id=current_user.id
    )
    return keychain


@router.get("/{keychain_id}", response_model=KeyChainResponse)
async def get_keychain(
    keychain_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_auth_user_or_error),
) -> KeyChainResponse:
    """
    获取指定的钥匙串
    """
    keychain = await keychain_crud.get(db, id=keychain_id)
    if not keychain:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="钥匙串不存在",
        )
    
    # 如果启用了鉴权，检查权限
    if settings.ENABLE_AUTH and keychain.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无权访问此钥匙串",
        )
    
    return keychain


@router.put("/{keychain_id}", response_model=KeyChainResponse)
async def update_keychain(
    keychain_id: int,
    keychain_in: KeychainUpdateBody,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_auth_user_or_error),
) -> KeyChainResponse:
    """
    更新钥匙串
    """
    keychain = await keychain_crud.get(db, id=keychain_id)
    if not keychain:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="钥匙串不存在",
        )
    
    # 如果启用了鉴权，检查权限
    if settings.ENABLE_AUTH and keychain.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无权更新此钥匙串",
        )
    
    keychain = await keychain_crud.update(db, id=keychain_id, obj_in=keychain_in)
    return keychain


@router.delete("/{keychain_id}", response_model=KeyChainResponse)
async def delete_keychain(
    keychain_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_auth_user_or_error),
) -> KeyChainResponse:
    """
    删除钥匙串（软删除）
    """
    keychain = await keychain_crud.get(db, id=keychain_id)
    if not keychain:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="钥匙串不存在",
        )
    
    # 如果启用了鉴权，检查权限
    if settings.ENABLE_AUTH and keychain.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无权删除此钥匙串",
        )
    
    keychain = await keychain_crud.delete(db, id=keychain_id)
    return keychain 