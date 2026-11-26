import base64
from datetime import datetime, timedelta
from typing import Any, Optional, Union

from cryptography.fernet import Fernet, InvalidToken
from fastapi import status
from jose import jwt
from vis3.internal.common.exceptions import AppEx, ErrorCode
from vis3.internal.config import settings

_pwd_context = None


def _get_pwd_context():
    global _pwd_context
    if _pwd_context is None:
        from passlib.context import CryptContext

        _pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    return _pwd_context


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
    return _get_pwd_context().verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """
    获取密码哈希
    """
    return _get_pwd_context().hash(password)


fernet = Fernet(settings.ENCRYPT_KEY)


def encrypt_secret_key(secret_key: str) -> str:
    encrypted_bytes = fernet.encrypt(secret_key.encode())
    return base64.urlsafe_b64encode(encrypted_bytes).decode()


def decrypt_secret_key(encrypted_secret_key: str) -> str:
    try:
        encrypted_bytes = base64.urlsafe_b64decode(encrypted_secret_key.encode())
        return fernet.decrypt(encrypted_bytes).decode()
    except (InvalidToken, ValueError, TypeError) as exc:
        raise AppEx(
            code=ErrorCode.KEYCHAIN_20008_DECRYPT_FAILED,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to decrypt keychain secret key",
            suggestion="Check ENCRYPT_KEY configuration or re-create the AK/SK keychain",
        ) from exc
