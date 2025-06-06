from fastapi import FastAPI
from vis3.internal.middleware.content_type import ContentTypeMiddleware
from vis3.internal.middleware.tracing import TracingMiddleWare


def add_middleware(app: FastAPI):
    app.add_middleware(TracingMiddleWare)
    app.add_middleware(ContentTypeMiddleware)
