from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel


class PathType(StrEnum):
    Bucket = "bucket"
    Directory = "directory"
    File = "file"


class BucketResponse(BaseModel):
    id: int | None = None
    name: str
    endpoint: str | None = None
    path: str
    content: str | None = None
    size: int | None = None
    mimetype: str | None = None
    owner: str | None = None
    last_modified: datetime | None = None
