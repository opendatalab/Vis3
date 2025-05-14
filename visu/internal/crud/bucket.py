from fastapi import HTTPException
from sqlalchemy.orm import Session

from visu.internal.api.v1.schema.request.bucket import (
    BucketCreateBody,
    BucketCreatePayload,
    BucketUpdatePayload,
)
from visu.internal.crud.base import BaseCrud
from visu.internal.crud.keychain import keychain_crud
from visu.internal.models.bucket import Bucket


class BucketCRUD(BaseCrud[Bucket, BucketCreatePayload, BucketUpdatePayload]):
    async def get_by_name(self, db: Session, *, name: str) -> Bucket:
        return db.query(self.model).filter(self.model.name == name).first()
    
    async def create(self, db: Session, *, obj_in: BucketCreateBody, created_by: int | None = None) -> Bucket:
        keychain = await keychain_crud.get(db, id=obj_in.keychain_id)
        if not keychain:
            raise HTTPException(status_code=404, detail="Keychain not found")
        
        # name 唯一
        if await self.get_by_name(db, name=obj_in.name):
            raise HTTPException(status_code=400, detail="Bucket name already exists")

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


bucket_crud = BucketCRUD(Bucket)