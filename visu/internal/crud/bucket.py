from typing import List

from fastapi import status
from sqlalchemy.orm import Session

from visu.internal.api.v1.schema.request.bucket import (
    BucketCreateBody,
    BucketCreatePayload,
    BucketUpdatePayload,
)
from visu.internal.common.exceptions import AppEx, ErrorCode
from visu.internal.crud.base import BaseCrud
from visu.internal.crud.keychain import keychain_crud
from visu.internal.models.bucket import Bucket
from visu.internal.schema.state import State


class BucketCRUD(BaseCrud[Bucket, BucketCreatePayload, BucketUpdatePayload]):
    async def get_by_path(self, db: Session, *, path: str, keychain_id: int | None = None) -> Bucket:
        if keychain_id:
            return db.query(self.model).filter(self.model.path.like(f"{path}%"), self.model.keychain_id == keychain_id, self.model.state == State.ENABLED).first()
        else:
            return db.query(self.model).filter(self.model.path.like(f"{path}%"), self.model.state == State.ENABLED).first()
    
    async def get_by_user_id(self, db: Session, *, user_id: int) -> List[Bucket]:
        return db.query(self.model).filter(self.model.created_by == user_id, self.model.state == State.ENABLED).all()
    
    async def list_by_path(self, db: Session, *, path: str) -> List[Bucket]:
        return db.query(self.model).filter(self.model.path.like(f"{path}%"), self.model.state == State.ENABLED).all()
    
    async def create(self, db: Session, *, obj_in: BucketCreateBody, created_by: int | None = None) -> Bucket:
        keychain = await keychain_crud.get(db, id=obj_in.keychain_id)
        if not keychain:
            raise AppEx(
                code=ErrorCode.AUTH_10005_KEYCHAIN_NOT_FOUND,
                status_code=status.HTTP_404_NOT_FOUND,
            )
        
        # path + keychain_id 唯一
        if await self.get_by_path(db, path=obj_in.path, keychain_id=obj_in.keychain_id):
            raise AppEx(
                code=ErrorCode.AUTH_10006_KEYCHAIN_ALREADY_EXISTS,
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        db_obj = Bucket(
            name=obj_in.name,
            path=obj_in.path,
            endpoint=obj_in.endpoint,
            created_by=created_by,
            keychain_id=obj_in.keychain_id,
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)

        return db_obj
    
    async def create_batch(self, db: Session, *, obj_in: List[BucketCreateBody], created_by: int | None = None) -> List[Bucket]:
        db_objs = []
        
        for bucket in obj_in:
            db_obj = Bucket(
                name=bucket.name,
                path=bucket.path,
                endpoint=bucket.endpoint,
                created_by=created_by,
                keychain_id=bucket.keychain_id,
            )
            db.add(db_obj)
            db_objs.append(db_obj)

        db.commit()
        for db_obj in db_objs:
            db.refresh(db_obj)

        return db_objs


bucket_crud = BucketCRUD(Bucket)