import time
import uuid
from contextvars import ContextVar

from loguru import logger
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

request_id_ctx: ContextVar[str] = ContextVar("request_id", default="")


def get_request_id() -> str:
    """获取当前请求的 request_id"""
    return request_id_ctx.get()


class TracingMiddleWare(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("X-Request-Id") or f"req_{uuid.uuid4().hex[:12]}"
        token = request_id_ctx.set(request_id)
        request.state.request_id = request_id

        start = time.perf_counter()
        method = request.method
        path = request.url.path

        try:
            with logger.contextualize(request_id=request_id):
                logger.debug(f"[{request_id}] {method} {path} start")
                response = await call_next(request)
                duration_ms = (time.perf_counter() - start) * 1000
                response.headers["X-Request-Id"] = request_id
                logger.debug(
                    f"[{request_id}] {method} {path} -> {response.status_code} ({duration_ms:.1f} ms)"
                )
                return response
        finally:
            request_id_ctx.reset(token)

