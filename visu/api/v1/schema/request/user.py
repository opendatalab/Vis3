
from pydantic import Field

from visu.schema.user import UserBase


class UserCreate(UserBase):
    password: str = Field(..., min_length=6)


class UserLogin(UserBase):
    password: str