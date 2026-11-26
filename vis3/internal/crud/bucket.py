from typing import List, Tuple

from fastapi import status
from sqlalchemy import func
from sqlalchemy.future import select
from sqlalchemy.orm import Session

from vis3.internal.api.v1.schema.request.bucket import (
    BucketCreateBody,
    BucketCreatePayload,
    BucketUpdateBody,
    BucketUpdatePayload,
)
from vis3.internal.common.exceptions import AppEx, ErrorCode
from vis3.internal.crud.base import BaseCrud
from vis3.internal.crud.keychain import keychain_crud
from vis3.internal.models.bucket import Bucket
from vis3.internal.schema.state import State
from vis3.internal.utils.path import accurate_s3_path, normalize_endpoint


def _clean_s3_config(obj_in: BucketCreateBody) -> dict:
    style = (obj_in.addressing_style or "auto").lower()
    if style not in ("auto", "virtual", "path"):
        style = "auto"
    sig = (obj_in.signature_version or "s3v4").lower()
    if sig not in ("auto", "s3v4", "s3"):
        sig = "s3v4"
    if sig == "auto":
        sig = "s3v4"
    region = (obj_in.region or "").strip() or "us-east-1"
    verify_ssl = True if obj_in.verify_ssl is None else bool(obj_in.verify_ssl)
    return {
        "addressing_style": style,
        "region": region,
        "signature_version": sig,
        "verify_ssl": verify_ssl,
    }


class BucketCRUD(BaseCrud[Bucket, BucketCreatePayload, BucketUpdatePayload]):
    async def get_by_path(self, db: Session, *, path: str, keychain_id: int | None = None) -> Bucket:
        if keychain_id:
            return db.query(self.model).filter(self.model.path.like(f"{path}%"), self.model.keychain_id == keychain_id, self.model.state == State.ENABLED).first()
        else:
            return db.query(self.model).filter(self.model.path.like(f"{path}%"), self.model.state == State.ENABLED).first()
    
    async def get_by_user_id(self, db: Session, *, user_id: int) -> Tuple[List[Bucket], int]:
        query = select(self.model).filter(self.model.created_by == user_id, self.model.state == State.ENABLED)
        count_query = select(func.count()).select_from(self.model).filter(self.model.created_by == user_id, self.model.state == State.ENABLED)
        result = db.execute(query).scalars().all()
        total = db.scalar(count_query)
        return result, total
    
    async def list_by_path(self, db: Session, *, path: str) -> List[Bucket]:
        return db.query(self.model).filter(self.model.path.like(f"{path}%"), self.model.state == State.ENABLED).all()
    
    async def create(self, db: Session, *, obj_in: BucketCreateBody, created_by: int | None = None) -> Bucket:
        path = accurate_s3_path(obj_in.path)
        endpoint = normalize_endpoint(obj_in.endpoint)
        keychain = await keychain_crud.get(db, id=obj_in.keychain_id)
        if not keychain:
            raise AppEx(
                code=ErrorCode.KEYCHAIN_20001_KEYCHAIN_NOT_FOUND,
                status_code=status.HTTP_404_NOT_FOUND,
            )
        
        # path + keychain_id 唯一
        if await self.get_by_path(db, path=path, keychain_id=obj_in.keychain_id):
            raise AppEx(
                code=ErrorCode.BUCKET_30008_ALREADY_EXISTS,
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Path {path} already exists for keychain {obj_in.keychain_id}",
            )

        s3_cfg = _clean_s3_config(obj_in)
        db_obj = Bucket(
            path=path,
            endpoint=endpoint,
            created_by=created_by,
            keychain_id=obj_in.keychain_id,
            **s3_cfg,
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)

        return db_obj
    
    async def create_batch(self, db: Session, *, obj_in: List[BucketCreateBody], created_by: int | None = None) -> List[Bucket]:
        db_objs = []
        seen_pairs: set[tuple[str, int]] = set()
        keychain_cache: dict[int, bool] = {}

        for bucket in obj_in:
            path = accurate_s3_path(bucket.path)
            endpoint = normalize_endpoint(bucket.endpoint)

            if bucket.keychain_id not in keychain_cache:
                keychain_cache[bucket.keychain_id] = bool(
                    await keychain_crud.get(db, id=bucket.keychain_id)
                )
            if not keychain_cache[bucket.keychain_id]:
                raise AppEx(
                    code=ErrorCode.KEYCHAIN_20001_KEYCHAIN_NOT_FOUND,
                    status_code=status.HTTP_404_NOT_FOUND,
                )

            pair = (path, bucket.keychain_id)
            if pair in seen_pairs or await self.get_by_path(
                db, path=path, keychain_id=bucket.keychain_id
            ):
                raise AppEx(
                    code=ErrorCode.BUCKET_30008_ALREADY_EXISTS,
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Path {path} already exists for keychain {bucket.keychain_id}",
                )
            seen_pairs.add(pair)

            s3_cfg = _clean_s3_config(bucket)
            db_obj = Bucket(
                path=path,
                endpoint=endpoint,
                created_by=created_by,
                keychain_id=bucket.keychain_id,
                **s3_cfg,
            )
            db.add(db_obj)
            db_objs.append(db_obj)

        db.commit()
        for db_obj in db_objs:
            db.refresh(db_obj)

        return db_objs

    async def update(
        self,
        db: Session,
        *,
        id: int,
        obj_in: BucketUpdateBody | BucketUpdatePayload | dict,
        auto_commit: bool | None = True,
    ) -> Bucket | None:
        update_data = (
            dict(obj_in)
            if isinstance(obj_in, dict)
            else obj_in.model_dump(exclude_unset=True)
        )
        if update_data.get("endpoint") is not None:
            update_data["endpoint"] = normalize_endpoint(update_data["endpoint"])
        if update_data.get("path") is not None:
            update_data["path"] = accurate_s3_path(update_data["path"])
        if update_data.get("signature_version") == "auto":
            update_data["signature_version"] = "s3v4"
        if "region" in update_data and update_data["region"] is not None:
            update_data["region"] = update_data["region"].strip() or "us-east-1"
        return await super().update(db=db, id=id, obj_in=update_data, auto_commit=auto_commit)


bucket_crud = BucketCRUD(Bucket)