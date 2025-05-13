from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from visu.common.db import Base
from visu.schema.state import State


class KeyChain(Base):
    __tablename__ = "key_chain"
    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    name = Column(String(255))
    access_key_id = Column(String(255))
    secret_key_id = Column(String(255))
    created_at = Column(DateTime(timezone=True), default=datetime.now, comment="Time a user was created")
    updated_at = Column(DateTime(timezone=True), default=datetime.now, comment="Last time a user was updated")
    created_by = Column(Integer, ForeignKey(column="user.id"), index=True)
    state = Column(String(255), default=State.ENABLED)

    # relation
    buckets = relationship("Bucket", back_populates="key_chain")