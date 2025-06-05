
from ovisu.internal.schema.user import UserBase


class UserResponse(UserBase):
    id: int

    class Config:
        from_attributes = True
