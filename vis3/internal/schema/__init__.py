from typing import Any, Dict, Optional

from pydantic import BaseModel


class JsonRow(BaseModel):
    value: str
    loc: str
    next: str | None
    metadata: Optional[Dict[str, Any]] = None
