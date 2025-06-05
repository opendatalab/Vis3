from fastapi import APIRouter
from vis3.internal.config import settings

from .endpoints.auth import router as auth_router
from .endpoints.bucket import router as bucket_router
from .endpoints.keychain import router as keychain_router

v1_router = APIRouter(prefix="/v1")

# 根据配置决定是否加载认证路由
if settings.ENABLE_AUTH:
    v1_router.include_router(auth_router)
    
v1_router.include_router(bucket_router)
v1_router.include_router(keychain_router)