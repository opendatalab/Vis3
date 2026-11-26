from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel


class PathType(StrEnum):
    Bucket = "bucket"
    Directory = "directory"
    File = "file"


class BucketResponse(BaseModel):
    # common
    id: int
    path: str
    type: PathType
    # bucket only
    endpoint: str | None = None
    created_by: str | None = None
    addressing_style: str | None = None
    region: str | None = None
    signature_version: str | None = None
    verify_ssl: bool | None = None
    # file only
    mimetype: str | None = None
    size: int | None = None
    next: str | None = None
    content: str | None = None
    last_modified: datetime | None = None
    keychain_id: int | None = None
    keychain_name: str | None = None