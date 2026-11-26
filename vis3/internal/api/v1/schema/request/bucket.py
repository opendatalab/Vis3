from typing import Literal

from pydantic import BaseModel

from vis3.internal.schema.state import State


class BucketCreateBody(BaseModel):
    name: str | None = None
    path: str
    endpoint: str
    keychain_id: int
    addressing_style: Literal["auto", "virtual", "path"] | None = "auto"
    region: str | None = None
    signature_version: Literal["auto", "s3v4", "s3"] | None = "s3v4"
    verify_ssl: bool | None = True


class BucketCreatePayload(BucketCreateBody):
    created_by: int
    state: State = State.ENABLED


class BucketUpdateBody(BaseModel):
    name: str | None = None
    path: str | None = None
    endpoint: str | None = None
    keychain_id: int | None = None
    state: State | None = None
    addressing_style: Literal["auto", "virtual", "path"] | None = None
    region: str | None = None
    signature_version: Literal["auto", "s3v4", "s3"] | None = None
    verify_ssl: bool | None = None


class BucketUpdatePayload(BucketUpdateBody):
    updated_by: int | None = None
