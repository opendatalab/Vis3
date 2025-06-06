from typing import Any, Dict, Generic, List, Optional, Tuple, Type, TypeVar, Union

from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from vis3.internal.schema.state import State

T = TypeVar("T", bound=BaseModel)
CreateSchemaType = TypeVar("CreateSchemaType", bound=BaseModel)
UpdateSchemaType = TypeVar("UpdateSchemaType", bound=BaseModel)


class BaseCrud(Generic[T, CreateSchemaType, UpdateSchemaType]):
    def __init__(self, model: Type[T]):
        self.model = model

    async def get(self, db: AsyncSession, id: int) -> T | None:
        """
        获取单个对象
        """
        result = db.execute(select(self.model).filter(self.model.id == id))
        return result.scalars().first()
    
    async def get_by_user(self, db: AsyncSession, id: int, user_id: int) -> T | None:
        """
        获取单个对象
        """
        result = db.execute(select(self.model).filter(self.model.id == id, self.model.created_by == user_id))
        return result.scalars().first()
    
    async def get_all(self, db: AsyncSession) -> Tuple[List[T], int]:
        """
        获取所有对象
        """
        query = select(self.model).filter(self.model.state == State.ENABLED)
        count_query = select(func.count()).select_from(self.model).filter(self.model.state == State.ENABLED)
        if hasattr(self.model, "created_at"):
            query = query.order_by(self.model.created_at.desc())
        result = db.execute(query).scalars().all()
        total = db.scalar(count_query)
        return result, total
    
    async def get_all_by_user(self, db: AsyncSession, user_id: int) -> Tuple[List[T], int]:
        """
        获取所有对象
        """
        query = select(self.model).filter(self.model.created_by == user_id, self.model.state == State.ENABLED)
        count_query = select(func.count()).select_from(self.model).filter(self.model.created_by == user_id, self.model.state == State.ENABLED)
        if hasattr(self.model, "created_at"):
            query = query.order_by(self.model.created_at.desc())
        result = db.execute(query).scalars().all()
        total = db.scalar(count_query)
        return result, total

    async def get_multi(
        self, db: AsyncSession, *, skip: int = 0, limit: int = 100
    ) -> Tuple[List[T], int]:
        """
        获取多个对象
        """
        query = select(self.model).filter(self.model.state == State.ENABLED).offset(skip).limit(limit)
        count_query = select(func.count()).select_from(self.model).filter(self.model.state == State.ENABLED)
        if hasattr(self.model, "created_at"):
            query = query.order_by(self.model.created_at.desc())
        result = db.execute(query).scalars().all()
        total = db.scalar(count_query)
        return result, total
    

    async def get_multi_by_user(
        self, db: AsyncSession, *, user_id: int, skip: int = 0, limit: int = 100
    ) -> Tuple[List[T], int]:
        """
        获取多个对象
        """
        query = select(self.model).filter(self.model.created_by == user_id, self.model.state == State.ENABLED).offset(skip).limit(limit)
        count_query = select(func.count()).select_from(self.model).filter(self.model.created_by == user_id, self.model.state == State.ENABLED)
        if hasattr(self.model, "created_at"):
            query = query.order_by(self.model.created_at.desc())
        result = db.execute(query).scalars().all()
        total = db.scalar(count_query)
        return result, total

    async def create(self, db: AsyncSession, *, obj_in: CreateSchemaType, auto_commit: bool = True) -> T:
        """
        创建对象
        
        参数:
            db: 数据库会话
            obj_in: 创建对象的输入模型
            auto_commit: 是否自动提交事务，默认为True。设置为False时可以在外部管理事务。
        """
        obj_dict = obj_in.model_dump()
        db_obj = self.model(**obj_dict)
        
        db.add(db_obj)
        if auto_commit:
            db.commit()
            db.refresh(db_obj)
        
        return db_obj

    async def update(
        self, db: AsyncSession, *, id: int, obj_in: Union[UpdateSchemaType, Dict[str, Any]],
        auto_commit: bool | None = True
    ) -> T | None:
        """
        更新对象
        
        参数:
            db: 数据库会话
            id: 对象ID
            obj_in: 更新对象的输入模型或字典
            auto_commit: 是否自动提交事务，默认为True。设置为False时可以在外部管理事务。
        """
        db_obj = await self.get(db=db, id=id)
        if db_obj is None:
            return None

        update_data = (
            obj_in if isinstance(obj_in, dict) else obj_in.model_dump(exclude_unset=True)
        )

        for field in update_data:
            if hasattr(db_obj, field) and update_data[field] is not None:
                setattr(db_obj, field, update_data[field])

        db.add(db_obj)
        if auto_commit:
            db.commit()
            db.refresh(db_obj)
        
        return db_obj

    async def delete(self, db: AsyncSession, *, id: Any, auto_commit: bool = True) -> Optional[T]:
        """
        删除对象（软删除）
        
        将对象的state更新为disabled，而不是硬删除
        
        参数:
            db: 数据库会话
            id: 对象ID
            auto_commit: 是否自动提交事务，默认为True。设置为False时可以在外部管理事务。
        """
        db_obj = await self.get(db=db, id=id)
        if db_obj is None:
            return None

        # 软删除：将state设置为disabled
        if hasattr(db_obj, "state"):
            setattr(db_obj, "state", State.DISABLED)
            db.add(db_obj)
            if auto_commit:
                db.commit()
                db.refresh(db_obj)
        
        return db_obj
