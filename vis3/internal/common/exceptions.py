import os
import traceback
from enum import Enum
from typing import Any

import pkg_resources
from botocore.exceptions import (
    ClientError,
    EndpointConnectionError,
    ParamValidationError,
)
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import FileResponse, JSONResponse
from loguru import logger
from starlette.exceptions import HTTPException as StarletteHTTPException

COMMON = 00000
AUTH = 10000
KEYCHAIN = 20000
BUCKET = 30000
S3_CLIENT = 40000
PING = 50000
SERVER = 60000
TRANSLATE_SERVICE_ERROR = 70000


class ErrorCode(Enum):
    # common
    CODE_00000_SQL_ERROR = (
        COMMON,
        "SQL Error",
    )
    CODE_00001_NO_PERMISSION = (
        COMMON,
        "Permission Denied",
    )
    CODE_00002_VALIDATION_ERROR = (
        COMMON + 2,
        "Request Validation Error",
    )
    CODE_00003_CLIENT_ERROR = (
        COMMON + 3,
        "Invalid Request",
    )
    AUTH_10001_NOT_AUTHENTICATED = (AUTH + 1, "Not Authenticated")
    AUTH_10002_INVALID_USERNAME = (AUTH + 2, "Invalid Username")
    AUTH_10003_INVALID_PASSWORD = (AUTH + 3, "Invalid Password")
    BUCKET_30001_OBJECT_NOT_FOUND = (BUCKET + 1, "Object Not Found, Please Check the Path")
    BUCKET_30002_OUT_OF_RANGE = (BUCKET + 2, "Request Size Out of Range, Maximum Size is 40 Mb")
    BUCKET_30003_INVALID_PATH = (BUCKET + 3, "Invalid S3 Path, Must Start with s3://")
    BUCKET_30004_PATH_IS_EMPTY = (BUCKET + 4, "S3 Path Cannot Be Empty")
    BUCKET_30005_DATA_IS_EMPTY = (BUCKET + 5, "Data is Empty")
    BUCKET_30006_CONFIG_FILE_NOT_FOUND = (BUCKET + 6, "S3 Config File Not Found")
    BUCKET_30007_DUPLICATED_BUCKETS = (BUCKET + 7, "Duplicate Bucket Names Found")
    KEYCHAIN_20001_KEYCHAIN_NOT_FOUND = (KEYCHAIN + 1, "Keychain Not Found")
    KEYCHAIN_20002_KEYCHAIN_ALREADY_EXISTS = (KEYCHAIN + 2, "Keychain Already Exists")
    KEYCHAIN_20003_KEYCHAIN_NOT_OWNER = (KEYCHAIN + 3, "No Permission to Access This Keychain")
    KEYCHAIN_20004_KEYCHAIN_NOT_OWNER = (KEYCHAIN + 4, "No Permission to Delete This Keychain")
    KEYCHAIN_20005_KEYCHAIN_NOT_OWNER = (KEYCHAIN + 5, "No Permission to Update This Keychain")
    KEYCHAIN_20006_KEYCHAIN_NOT_OWNER = (KEYCHAIN + 6, "No Permission to Access This Keychain")
    KEYCHAIN_20007_KEYCHAIN_NOT_OWNER = (KEYCHAIN + 7, "No Permission to Delete This Keychain")
    S3_CLIENT_40000_ERROR = (S3_CLIENT, "S3 Client Error")
    S3_CLIENT_40001_ACCESS_DENIED = (S3_CLIENT + 1, "Access Denied")
    S3_CLIENT_40002_NO_SUCH_BUCKET = (S3_CLIENT + 2, "Requested Path Does Not Exist")
    S3_CLIENT_40003_NOT_FOUND = (S3_CLIENT + 3, "Bucket Configuration Not Found")
    S3_CLIENT_40004_UNKNOWN_ERROR = (S3_CLIENT + 4, "Unknown Error")
    PING_50000_ERROR = (PING, "Verification Failed")
    SERVER_60000_ERROR = (SERVER, "Server Error")
    SERVER_60001_READ_ERROR = (SERVER + 1, "Failed to Read File")


class AppEx(HTTPException):
    def __init__(
        self, code: ErrorCode, status_code=status.HTTP_400_BAD_REQUEST, detail: str = ""
    ) -> None:
        self.msg = code.value[1]
        self.code = code.value[0]
        self.detail = detail
        self.status_code = status_code


async def app_exception_handler(request: Request, exp: AppEx):
    logger.error(exp)
    return JSONResponse(
        status_code=exp.status_code,
        content={
            "msg": exp.msg,
            "err_code": exp.code,
            "detail": exp.detail,
        },
    )


async def http_exception_handler(request: Request, exp: StarletteHTTPException):
    logger.error(exp)

    print(traceback.format_exc())
    logger.error(traceback.format_exc())

    if (
        isinstance(exp, StarletteHTTPException)
        and exp.status_code == status.HTTP_404_NOT_FOUND
        and not request.url.path.startswith("/api")
    ):
        return FileResponse(
            os.path.join(
                pkg_resources.resource_filename('vis3.internal', 'statics'),
                'index.html'
                ),
            status_code=200,
            headers={'Content-Type': 'text/html', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive'}
        )
    elif (
        isinstance(exp, StarletteHTTPException)
        and exp.status_code == status.HTTP_403_FORBIDDEN
    ):
        return JSONResponse(
            status_code=exp.status_code,
            content={
                "err_code": ErrorCode.CODE_10001_NOT_AUTHENTICATED.value[0],
                "msg": exp.detail
                if str(exp.detail)
                else ErrorCode.CODE_10001_NOT_AUTHENTICATED.value[1],
            },
        )

    detail = None

    try:
        detail = exp.detail
    except Exception:
        detail = str(exp)

    return JSONResponse(
        status_code=hasattr(exp, "status_code") and exp.status_code or 500,
        content={
            "err_code": ErrorCode.CODE_00003_CLIENT_ERROR.value[0],
            "detail": detail,
            "msg": ErrorCode.CODE_00003_CLIENT_ERROR.value[1],
        },
    )


async def validation_exception_handler(request: Request, exp: Any):
    logger.error(exp)

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "msg": str(exp),
            "err_code": ErrorCode.CODE_00002_VALIDATION_ERROR.value[0],
        },
    )


async def sql_exception_handler(request: Request, exp: Any):
    logger.error(exp)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "msg": str(exp),
            "err_code": ErrorCode.CODE_00000_SQL_ERROR.value[0],
        },
    )


async def boto_exception_handler(request: Request, exp: ClientError):
    logger.error(exp)
    if isinstance(exp, ClientError):
        if exp.response.get("Error", {}).get("Code") == "AccessDenied":
            return JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={
                    "msg": str(exp),
                    "err_code": ErrorCode.S3_CLIENT_40001_ACCESS_DENIED.value[0],
                },
            )
        elif exp.response.get("Error", {}).get("Code") == "NoSuchBucket":
            return JSONResponse(
                status_code=status.HTTP_404_NOT_FOUND,
                content={
                    "msg": str(exp),
                    "err_code": ErrorCode.S3_CLIENT_40002_NO_SUCH_BUCKET.value[0],
                },
            )

    if isinstance(exp, ParamValidationError):
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "msg": str(exp),
                "err_code": ErrorCode.S3_CLIENT_40000_ERROR.value[0],
            },
        )
    else:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "msg": str(exp),
                "err_code": ErrorCode.S3_CLIENT_40000_ERROR.value[0],
            },
        )


async def handle_unicode_decode_error(request: Request, exp: UnicodeDecodeError):
    logger.error(exp)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "msg": str(exp),
            "err_code": ErrorCode.SERVER_60001_READ_ERROR.value[0],
        },
    )


async def handle_server_error(request: Request, exp: Exception):
    logger.error(exp)
    if isinstance(exp, HTTPException):
        return http_exception_handler(request, exp)

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "msg": str(exp),
            "err_code": ErrorCode.SERVER_60000_ERROR.value[0],
        },
    )


def add_exception_handler(app: FastAPI):
    app.add_exception_handler(AppEx, app_exception_handler)
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(HTTPException, http_exception_handler)
    app.add_exception_handler(ClientError, boto_exception_handler)
    app.add_exception_handler(ParamValidationError, boto_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(UnicodeDecodeError, handle_unicode_decode_error)
    app.add_exception_handler(EndpointConnectionError, boto_exception_handler)
    app.add_exception_handler(Exception, http_exception_handler)
