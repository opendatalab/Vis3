from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from vis3.internal.api.dependencies.auth import (
    get_auth_user_or_error,
)
from vis3.internal.api.v1.schema.request.keychain import (
    KeychainCreateBody,
    KeychainUpdateBody,
)
from vis3.internal.api.v1.schema.response import ListResponse
from vis3.internal.api.v1.schema.response.keychain import KeyChainResponse
from vis3.internal.common.db import get_db
from vis3.internal.common.exceptions import AppEx, ErrorCode
from vis3.internal.crud.keychain import keychain_crud
from vis3.internal.models.keychain import KeyChain
from vis3.internal.models.user import User

router = APIRouter(tags=["S3钥匙串"])

def make_keychain_response(keychain: KeyChain) -> KeyChainResponse:
    return KeyChainResponse(
        id=keychain.id,
        name=keychain.name,
        access_key_id=keychain.access_key_id,
        secret_key_id=keychain.secret_key_id,
        created_at=keychain.created_at,
        created_by=keychain.user.username if keychain.user else None,
        updated_at=keychain.updated_at,
    )


@router.get("/keychain", response_model=ListResponse[KeyChainResponse])
async def get_keychains(
    page_no: int = 1,
    page_size: int = 100,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_auth_user_or_error),
) -> ListResponse[KeyChainResponse]:
    """
    获取当前用户的所有钥匙串
    """
    # 否则只获取当前用户的钥匙串
    keychains, total = await keychain_crud.get_multi_by_user(
        db, user_id=current_user.id, skip=(page_no - 1) * page_size, limit=page_size
    ) if current_user else await keychain_crud.get_multi(db, skip=(page_no - 1) * page_size, limit=page_size)
    return ListResponse(
        data=[
            make_keychain_response(keychain)
            for keychain in keychains
        ],
        total=total,
    )


@router.get("/keychain/all", response_model=ListResponse[KeyChainResponse])
async def get_all_keychains(
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_auth_user_or_error),
) -> ListResponse[KeyChainResponse]:
    """
    获取当前用户的所有钥匙串
    """
    # 获取当前用户的钥匙串
    keychains, total = await keychain_crud.get_all_by_user(
        db, user_id=current_user.id
    ) if current_user else await keychain_crud.get_all(db)
    return ListResponse(
        data=[
            make_keychain_response(keychain)
            for keychain in keychains
        ],
        total=total,
    )


@router.post("/keychain", response_model=KeyChainResponse, status_code=status.HTTP_201_CREATED)
async def create_keychain(
    keychain_in: KeychainCreateBody,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_auth_user_or_error),
) -> KeyChainResponse:
    """
    创建新的钥匙串
    """
    # 创建与用户关联的钥匙串
    keychain = await keychain_crud.create_with_user(
        db, obj_in=keychain_in, user_id=current_user.id
    ) if current_user else await keychain_crud.create(db, obj_in=keychain_in)
    return make_keychain_response(keychain)


@router.get("/keychain/{keychain_id}", response_model=KeyChainResponse)
async def get_keychain(
    keychain_id: int,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_auth_user_or_error),
) -> KeyChainResponse:
    """
    获取指定的钥匙串
    """
    keychain = await keychain_crud.get(db, id=keychain_id)
    if not keychain:
        raise AppEx(
            code=ErrorCode.KEYCHAIN_20001_KEYCHAIN_NOT_FOUND,
            status_code=status.HTTP_404_NOT_FOUND,
        )
    
    if current_user and keychain.created_by != current_user.id:
        raise AppEx(
            code=ErrorCode.KEYCHAIN_20003_KEYCHAIN_NOT_OWNER,
            status_code=status.HTTP_403_FORBIDDEN,
        )

    return KeyChainResponse(
        id=keychain.id,
        name=keychain.name,
        access_key_id=keychain.access_key_id,
        secret_key_id=keychain.secret_key_id,
        created_at=keychain.created_at,
        created_by=keychain.user.username if keychain.user else None,
        updated_at=keychain.updated_at,
    )


@router.patch("/keychain/{keychain_id}", response_model=KeyChainResponse)
async def update_keychain(
    keychain_id: int,
    keychain_in: KeychainUpdateBody,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_auth_user_or_error),
) -> KeyChainResponse:
    """
    更新钥匙串
    """
    keychain = await keychain_crud.get(db, id=keychain_id)
    if not keychain:
        raise AppEx(
            code=ErrorCode.KEYCHAIN_20001_KEYCHAIN_NOT_FOUND,
            status_code=status.HTTP_404_NOT_FOUND,
        )
    
    # 如果启用了鉴权，检查权限
    if current_user and keychain.created_by != current_user.id:
        raise AppEx(
            code=ErrorCode.KEYCHAIN_20005_KEYCHAIN_NOT_OWNER,
            status_code=status.HTTP_403_FORBIDDEN,
        )
    
    keychain = await keychain_crud.update(db=db, id=keychain_id, obj_in=keychain_in)
    return make_keychain_response(keychain)


@router.delete("/keychain/{keychain_id}", response_model=KeyChainResponse)
async def delete_keychain(
    keychain_id: int,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_auth_user_or_error),
) -> KeyChainResponse:
    """
    删除钥匙串（软删除）
    """
    keychain = await keychain_crud.get(db=db, id=keychain_id)
    if not keychain:
        raise AppEx(
            code=ErrorCode.KEYCHAIN_20001_KEYCHAIN_NOT_FOUND,
            status_code=status.HTTP_404_NOT_FOUND,
        )
    
    # 如果启用了鉴权，检查权限
    if current_user and keychain.created_by != current_user.id:
        raise AppEx(
            code=ErrorCode.KEYCHAIN_20004_KEYCHAIN_NOT_OWNER,
            status_code=status.HTTP_403_FORBIDDEN,
        )
    
    keychain = await keychain_crud.delete(db=db, id=keychain_id)
    return make_keychain_response(keychain)