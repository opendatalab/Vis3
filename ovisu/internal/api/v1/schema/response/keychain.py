from datetime import datetime

from ovisu.internal.schema.keychain import KeyChainBase


class KeyChainResponse(KeyChainBase):
    id: int
    created_at: datetime
    updated_at: datetime
    created_by: str

    class Config:
        from_attributes = True 