import base64
from datetime import datetime, timedelta
from typing import Any, Optional, Union

from cryptography.fernet import Fernet
from jose import jwt
from passlib.context import CryptContext
from vis3.internal.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def create_access_token(
    subject: Union[str, Any], expires_delta: Optional[timedelta] = None
) -> str:
    """
    创建JWT访问令牌
    """
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(
            minutes=settings.TOKEN_ACCESS_EXPIRE_MINUTES
        )
    to_encode = {"exp": expire, "sub": str(subject)}
    encoded_jwt = jwt.encode(
        to_encode, settings.PASSWORD_SECRET_KEY, algorithm=settings.TOKEN_GENERATE_ALGORITHM
    )
    return encoded_jwt


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    验证密码
    """
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """
    获取密码哈希
    """
    return pwd_context.hash(password) 

fernet = Fernet(settings.ENCRYPT_KEY)

def encrypt_secret_key(secret_key: str) -> str:
    encrypted_bytes = fernet.encrypt(secret_key.encode())
    return base64.urlsafe_b64encode(encrypted_bytes).decode()

def decrypt_secret_key(encrypted_secret_key: str) -> str:
    encrypted_bytes = base64.urlsafe_b64decode(encrypted_secret_key.encode())
    return fernet.decrypt(encrypted_bytes).decode()
