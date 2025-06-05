from pydantic import BaseModel

from vis3.internal.schema.state import State


class BucketCreateBody(BaseModel):
    name: str | None = None
    path: str
    endpoint: str
    keychain_id: int


class BucketCreatePayload(BucketCreateBody):
    created_by: int
    state: State = State.ENABLED


class BucketUpdateBody(BaseModel):
    name: str | None = None
    path: str | None = None
    endpoint: str | None = None
    keychain_id: int | None = None
    state: State | None = None

class BucketUpdatePayload(BucketUpdateBody):
    updated_by: int | None = None
