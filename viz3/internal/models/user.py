from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, String
from sqlalchemy.orm import relationship
from vis3.internal.common.db import Base


class User(Base):
    __tablename__ = "user"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    username = Column(String(50), unique=True, index=True)
    hashed_password = Column(String(255))
    created_at = Column(
        DateTime(timezone=True), default=datetime.now, comment="Time a user was created"
    )
    updated_at = Column(
        DateTime(timezone=True), default=datetime.now, comment="Last time a user was updated"
    )

    # relation
    keychains = relationship("KeyChain", back_populates="user")
    buckets = relationship("Bucket", back_populates="user")