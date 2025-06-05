from pydantic import BaseModel
from vis3.internal.schema.state import State


class KeychainCreateBody(BaseModel):
    name: str
    access_key_id: str
    secret_key_id: str


class KeychainCreatePayload(KeychainCreateBody):
    created_by: int
    state: State = State.ENABLED


class KeychainUpdateBody(BaseModel):
    name: str | None = None
    access_key_id: str | None = None
    secret_key_id: str | None = None
    state: State | None = None

class KeychainUpdatePayload(KeychainUpdateBody):
    updated_by: int
