from fastapi import status
from sqlalchemy.future import select
from sqlalchemy.orm import Session

from vis3.internal.api.v1.schema.request.keychain import (
    KeychainCreateBody,
    KeychainUpdateBody,
)
from vis3.internal.common.exceptions import AppEx, ErrorCode
from vis3.internal.crud.base import BaseCrud
from vis3.internal.models.keychain import KeyChain
from vis3.internal.schema.state import State
from vis3.internal.utils.security import encrypt_secret_key


class KeyChainCRUD(BaseCrud[KeyChain, KeychainCreateBody, KeychainUpdateBody]):
    async def _get_by_access_key_id(self, db: Session, *, access_key_id: str, user_id: int | None = None) -> KeyChain:
        """
        获取钥匙串
        """
        result = db.execute(select(KeyChain).filter(KeyChain.access_key_id == access_key_id, KeyChain.state == State.ENABLED, KeyChain.created_by == user_id))
        return result.scalars().first()

    async def get(self, db: Session, *, id: int) -> KeyChain:
        """
        获取钥匙串
        """
        result = db.execute(select(KeyChain).filter(KeyChain.id == id, KeyChain.state == State.ENABLED))
        return result.scalars().first()

    async def create_with_user(
        self, db: Session, *, obj_in: KeychainCreateBody, user_id: int
    ) -> KeyChain:
        """
        创建新钥匙串，关联到用户
        """
        if await self._get_by_access_key_id(db, access_key_id=obj_in.access_key_id, user_id=user_id):
            raise AppEx(
                code=ErrorCode.KEYCHAIN_20002_KEYCHAIN_ALREADY_EXISTS,
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        
        db_obj = KeyChain(
            name=obj_in.name,
            access_key_id=obj_in.access_key_id,
            # 加密 sk
            secret_key_id=encrypt_secret_key(obj_in.secret_key_id),
            created_by=user_id,
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj
        
    async def create(self, db: Session, *, obj_in: KeychainCreateBody) -> KeyChain:
        """
        创建新钥匙串，不关联用户（用于未启用鉴权时）
        """
        if await self._get_by_access_key_id(db, access_key_id=obj_in.access_key_id, user_id=None):
            raise AppEx(
                code=ErrorCode.KEYCHAIN_20002_KEYCHAIN_ALREADY_EXISTS,
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        
        db_obj = KeyChain(
            name=obj_in.name,
            access_key_id=obj_in.access_key_id,
            # 加密 sk
            secret_key_id=encrypt_secret_key(obj_in.secret_key_id),
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj


keychain_crud = KeyChainCRUD(KeyChain)