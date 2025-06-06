from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from vis3.internal.api.v1.schema.request.user import UserCreate
from vis3.internal.crud.base import BaseCrud
from vis3.internal.models.user import User
from vis3.internal.schema.state import AuthState
from vis3.internal.utils.security import get_password_hash, verify_password


class UserCRUD(BaseCrud[User, UserCreate, UserCreate]):
    async def get_by_username(self, db: AsyncSession, username: str) -> User | None:
        """
        通过用户名获取用户
        """
        result = db.execute(select(User).filter(User.username == username))
        return result.scalars().first()

    async def create(self, db: AsyncSession, *, obj_in: UserCreate) -> User:
        """
        创建新用户，对密码进行哈希处理
        """
        db_obj = User(
            username=obj_in.username,
            hashed_password=get_password_hash(obj_in.password),
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    async def authenticate(self, db: AsyncSession, *, username: str, password: str) -> User | AuthState:
        """
        验证用户凭据
        """
        user = await self.get_by_username(db, username=username)
        if not user:
            return AuthState.USERNAME_ERROR
        if not verify_password(password, user.hashed_password):
            return AuthState.PASSWORD_ERROR
        return user


user_crud = UserCRUD(User) 