from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from visu.api.dependencies.auth import get_current_user
from visu.api.v1.schema.request.keychain import (
    KeychainCreateBody,
    KeychainUpdateBody,
)
from visu.api.v1.schema.response.keychain import KeyChainResponse
from visu.common.db import get_db
from visu.crud.keychain import keychain_crud
from visu.models.user import User

router = APIRouter(prefix="/keychains", tags=["S3钥匙串"])


@router.get("/", response_model=List[KeyChainResponse])
async def get_keychains(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> List[KeyChainResponse]:
    """
    获取当前用户的所有钥匙串
    """
    keychains = await keychain_crud.get_multi_by_user(
        db, user_id=current_user.id, skip=skip, limit=limit
    )
    return keychains


@router.post("/", response_model=KeyChainResponse, status_code=status.HTTP_201_CREATED)
async def create_keychain(
    keychain_in: KeychainCreateBody,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> KeyChainResponse:
    """
    创建新的钥匙串
    """
    keychain = await keychain_crud.create_with_user(
        db, obj_in=keychain_in, user_id=current_user.id
    )
    return keychain


@router.get("/{keychain_id}", response_model=KeyChainResponse)
async def get_keychain(
    keychain_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
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
    if keychain.created_by != current_user.id:
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
    current_user: User = Depends(get_current_user),
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
    if keychain.created_by != current_user.id:
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
    current_user: User = Depends(get_current_user),
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
    if keychain.created_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无权删除此钥匙串",
        )
    
    keychain = await keychain_crud.delete(db, id=keychain_id)
    return keychain 