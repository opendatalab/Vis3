from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware


class ContentTypeMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        # set content-type for javascript files
        if request.url.path.endswith(".js"):
            response.headers["content-type"] = "application/javascript"

        if request.url.path.endswith("sys-config.js"):
            # 禁用缓存
            response.headers["Cache-Control"] = "no-cache"
            response.headers["Pragma"] = "no-cache"
            response.headers["Expires"] = "0"
            
        return response