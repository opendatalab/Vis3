from fastapi import FastAPI

from .v1 import v1_router


def initial_routers(app: FastAPI):
    app.include_router(v1_router, prefix="/api")
