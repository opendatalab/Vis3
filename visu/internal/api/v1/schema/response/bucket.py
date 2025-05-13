from datetime import datetime
from enum import StrEnum
from typing import Optional

from pydantic import BaseModel


class PathType(StrEnum):
    Bucket = "bucket"
    Directory = "directory"
    File = "file"


class BucketResponse(BaseModel):
    endpoint: str | None = None
    path: str
    content: Optional[str] = None
    size: Optional[int] = None
    owner: Optional[str] = None
    last_modified: Optional[datetime] = None
