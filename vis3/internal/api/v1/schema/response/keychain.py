from datetime import datetime

from vis3.internal.schema.keychain import KeyChainBase


class KeyChainResponse(KeyChainBase):
    id: int
    created_at: datetime
    updated_at: datetime
    created_by: str | None

    class Config:
        from_attributes = True 