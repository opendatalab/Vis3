from typing import Any, Generic, List, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class ListResponse(BaseModel, Generic[T]):
    data: List[T]
    total: int


class ItemResponse(BaseModel, Generic[T]):
    data: T


class OkResponse(BaseModel):
    ok: bool = True
    message: str = "OK"
    data: Any = {}
