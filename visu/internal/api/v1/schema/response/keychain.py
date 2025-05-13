from datetime import datetime

from visu.internal.schema.keychain import KeyChainBase
from visu.internal.schema.state import State


class KeyChainResponse(KeyChainBase):
    id: int
    created_at: datetime
    updated_at: datetime
    created_by: int
    state: State

    class Config:
        from_attributes = True 