from typing import List

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from visu.internal.api.v1.schema.request.keychain import (
    KeychainCreateBody,
    KeychainUpdateBody,
)
from visu.internal.crud.base import BaseCrud
from visu.internal.models.keychain import KeyChain


class KeyChainCRUD(BaseCrud[KeyChain, KeychainCreateBody, KeychainUpdateBody]):
    async def get_multi_by_user(
        self, db: AsyncSession, *, user_id: int, skip: int = 0, limit: int = 100
    ) -> List[KeyChain]:
        """
        获取用户的所有钥匙串
        """
        result = await db.execute(
            select(KeyChain)
            .filter(KeyChain.created_by == user_id)
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()

    async def create_with_user(
        self, db: AsyncSession, *, obj_in: KeychainCreateBody, user_id: int
    ) -> KeyChain:
        """
        创建新钥匙串，关联到用户
        """
        db_obj = KeyChain(
            name=obj_in.name,
            access_key_id=obj_in.access_key_id,
            secret_key_id=obj_in.secret_key_id,
            created_by=user_id,
        )
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj
        
    async def create(self, db: AsyncSession, *, obj_in: KeychainCreateBody) -> KeyChain:
        """
        创建新钥匙串，不关联用户（用于未启用鉴权时）
        """
        db_obj = KeyChain(
            name=obj_in.name,
            access_key_id=obj_in.access_key_id,
            secret_key_id=obj_in.secret_key_id,
        )
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj


keychain_crud = KeyChainCRUD(KeyChain)