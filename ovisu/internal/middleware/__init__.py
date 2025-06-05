from fastapi import FastAPI

from ovisu.internal.middleware.content_type import ContentTypeMiddleware
from ovisu.internal.middleware.tracing import TracingMiddleWare


def add_middleware(app: FastAPI):
    app.add_middleware(TracingMiddleWare)
    app.add_middleware(ContentTypeMiddleware)
