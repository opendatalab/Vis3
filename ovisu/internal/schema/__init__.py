from typing import Any, Dict, Optional

from pydantic import BaseModel


class JsonRow(BaseModel):
    value: str
    loc: str
    metadata: Optional[Dict[str, Any]] = None
