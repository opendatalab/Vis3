from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from vis3.internal.common.db import Base
from vis3.internal.schema.state import State
from vis3.internal.utils.security import decrypt_secret_key


class KeyChain(Base):
    __tablename__ = "keychain"
    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    name = Column(String(255))
    access_key_id = Column(String(255))
    secret_key_id = Column(String(255))
    created_at = Column(DateTime(timezone=True), default=datetime.now, comment="Time a user was created")
    updated_at = Column(DateTime(timezone=True), default=datetime.now, comment="Last time a user was updated")
    created_by = Column(Integer, ForeignKey(column="user.id"), index=True)
    state = Column(String(255), default=State.ENABLED)

    # relation
    buckets = relationship("Bucket", back_populates="keychain")
    user = relationship("User", foreign_keys=[created_by])

    # 获取解密后的 secret_key_id
    @property
    def decrypted_secret_key_id(self):
        return decrypt_secret_key(self.secret_key_id)
