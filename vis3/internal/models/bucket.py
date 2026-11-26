from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from vis3.internal.common.db import Base
from vis3.internal.schema.state import State


class Bucket(Base):
    __tablename__ = "bucket"
    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    path = Column(String(255))
    endpoint = Column(String(255))
    addressing_style = Column(String(32), default="auto", server_default="auto", nullable=False)
    region = Column(String(64), default="us-east-1", server_default="us-east-1", nullable=True)
    signature_version = Column(String(32), default="s3v4", server_default="s3v4", nullable=False)
    verify_ssl = Column(Boolean, default=True, server_default="1", nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.now, comment="Time a user was created")
    updated_at = Column(DateTime(timezone=True), default=datetime.now, comment="Last time a user was updated")
    created_by = Column(Integer, ForeignKey(column="user.id"), index=True, nullable=True)
    state = Column(String(255), default=State.ENABLED)
    keychain_id = Column(Integer, ForeignKey(column="keychain.id"), index=True)

    # relation
    keychain = relationship("KeyChain", foreign_keys=[keychain_id])
    user = relationship("User", foreign_keys=[created_by])