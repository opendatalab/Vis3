from pydantic import BaseModel, Field


class KeyChainBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    access_key_id: str
    secret_key_id: str
