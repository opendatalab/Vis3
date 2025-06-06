from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
import os
import pkg_resources
from fastapi.responses import FileResponse

class ContentTypeMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        # set content-type for javascript files
        if request.url.path.endswith(".js"):
            response.headers["content-type"] = "application/javascript"
            
        return response