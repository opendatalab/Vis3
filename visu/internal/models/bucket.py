from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from visu.internal.common.db import Base
from visu.internal.schema.state import State


class Bucket(Base):
    __tablename__ = "bucket"
    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    name = Column(String(255), unique=True)
    path = Column(String(255))
    endpoint = Column(String(255))
    created_at = Column(DateTime(timezone=True), default=datetime.now, comment="Time a user was created")
    updated_at = Column(DateTime(timezone=True), default=datetime.now, comment="Last time a user was updated")
    created_by = Column(Integer, ForeignKey(column="user.id"), index=True, nullable=True)
    state = Column(String(255), default=State.ENABLED)

    # relation
    key_chain = relationship("KeyChain", back_populates="buckets")