import os
from enum import Enum
from typing import Any

import pkg_resources
from botocore.exceptions import (
    BotoCoreError,
    ClientError,
    ConnectTimeoutError,
    EndpointConnectionError,
    InvalidRegionError,
    NoCredentialsError,
    ParamValidationError,
    PartialCredentialsError,
    ReadTimeoutError,
    SSLError,
)
from botocore.parsers import ResponseParserError
from cryptography.fernet import InvalidToken
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import FileResponse, JSONResponse
from loguru import logger
from sqlalchemy.exc import SQLAlchemyError
from starlette.exceptions import HTTPException as StarletteHTTPException

from vis3.internal.middleware.tracing import get_request_id

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
    CODE_00000_SQL_ERROR = (COMMON, "Database Error", "SQL_ERROR")
    CODE_00001_NO_PERMISSION = (COMMON + 1, "Permission Denied", "NO_PERMISSION")
    CODE_00002_VALIDATION_ERROR = (
        COMMON + 2,
        "Request Validation Error",
        "VALIDATION_ERROR",
    )
    CODE_00003_CLIENT_ERROR = (COMMON + 3, "Invalid Request", "CLIENT_ERROR")

    # auth
    AUTH_10001_NOT_AUTHENTICATED = (
        AUTH + 1,
        "Not Authenticated",
        "AUTH_NOT_AUTHENTICATED",
    )
    AUTH_10002_INVALID_USERNAME = (
        AUTH + 2,
        "Invalid Username",
        "AUTH_INVALID_USERNAME",
    )
    AUTH_10003_INVALID_PASSWORD = (
        AUTH + 3,
        "Invalid Password",
        "AUTH_INVALID_PASSWORD",
    )
    AUTH_10004_USERNAME_ALREADY_EXISTS = (
        AUTH + 4,
        "Username Already Exists",
        "AUTH_USERNAME_EXISTS",
    )

    # keychain
    KEYCHAIN_20001_KEYCHAIN_NOT_FOUND = (
        KEYCHAIN + 1,
        "Keychain Not Found",
        "KEYCHAIN_NOT_FOUND",
    )
    KEYCHAIN_20002_KEYCHAIN_ALREADY_EXISTS = (
        KEYCHAIN + 2,
        "Keychain Already Exists",
        "KEYCHAIN_ALREADY_EXISTS",
    )
    KEYCHAIN_20003_KEYCHAIN_NOT_OWNER = (
        KEYCHAIN + 3,
        "No Permission to Access This Keychain",
        "KEYCHAIN_NOT_OWNER",
    )
    KEYCHAIN_20004_KEYCHAIN_DELETE_DENIED = (
        KEYCHAIN + 4,
        "No Permission to Delete This Keychain",
        "KEYCHAIN_DELETE_DENIED",
    )
    KEYCHAIN_20005_KEYCHAIN_UPDATE_DENIED = (
        KEYCHAIN + 5,
        "No Permission to Update This Keychain",
        "KEYCHAIN_UPDATE_DENIED",
    )
    KEYCHAIN_20008_DECRYPT_FAILED = (
        KEYCHAIN + 8,
        "Failed to Decrypt Secret Key",
        "KEYCHAIN_DECRYPT_FAILED",
    )

    # bucket
    BUCKET_30001_OBJECT_NOT_FOUND = (
        BUCKET + 1,
        "Object Not Found, Please Check the Path",
        "BUCKET_OBJECT_NOT_FOUND",
    )
    BUCKET_30002_OUT_OF_RANGE = (
        BUCKET + 2,
        "Request Size Out of Range, Maximum Size is 40 Mb",
        "BUCKET_OUT_OF_RANGE",
    )
    BUCKET_30003_INVALID_PATH = (
        BUCKET + 3,
        "Invalid S3 Path, Must Start with s3://",
        "BUCKET_INVALID_PATH",
    )
    BUCKET_30004_PATH_IS_EMPTY = (
        BUCKET + 4,
        "S3 Path Cannot Be Empty",
        "BUCKET_PATH_EMPTY",
    )
    BUCKET_30005_DATA_IS_EMPTY = (
        BUCKET + 5,
        "Data is Empty",
        "BUCKET_DATA_EMPTY",
    )
    BUCKET_30006_CONFIG_FILE_NOT_FOUND = (
        BUCKET + 6,
        "Bucket Configuration Not Found",
        "BUCKET_CONFIG_NOT_FOUND",
    )
    BUCKET_30007_DUPLICATED_BUCKETS = (
        BUCKET + 7,
        "Duplicate Bucket Names Found",
        "BUCKET_DUPLICATED",
    )
    BUCKET_30008_ALREADY_EXISTS = (
        BUCKET + 8,
        "Bucket Path Already Exists for This Keychain",
        "BUCKET_ALREADY_EXISTS",
    )
    BUCKET_30009_INVALID_ENDPOINT = (
        BUCKET + 9,
        "Invalid Endpoint URL",
        "BUCKET_INVALID_ENDPOINT",
    )

    # s3 client
    S3_CLIENT_40000_ERROR = (S3_CLIENT, "S3 Client Error", "S3_ERROR")
    S3_CLIENT_40001_ACCESS_DENIED = (
        S3_CLIENT + 1,
        "Access Denied",
        "S3_ACCESS_DENIED",
    )
    S3_CLIENT_40002_NO_SUCH_BUCKET = (
        S3_CLIENT + 2,
        "Bucket Does Not Exist",
        "S3_NO_SUCH_BUCKET",
    )
    S3_CLIENT_40003_NOT_FOUND = (
        S3_CLIENT + 3,
        "Object Not Found",
        "S3_OBJECT_NOT_FOUND",
    )
    S3_CLIENT_40004_UNKNOWN_ERROR = (
        S3_CLIENT + 4,
        "S3 Unknown Error",
        "S3_UNKNOWN_ERROR",
    )
    S3_CLIENT_40005_ENDPOINT_UNREACHABLE = (
        S3_CLIENT + 5,
        "Cannot Connect to S3 Endpoint",
        "S3_ENDPOINT_UNREACHABLE",
    )
    S3_CLIENT_40006_SSL_ERROR = (
        S3_CLIENT + 6,
        "SSL Certificate Verification Failed",
        "S3_SSL_ERROR",
    )
    S3_CLIENT_40007_TIMEOUT = (
        S3_CLIENT + 7,
        "S3 Connection Timeout",
        "S3_TIMEOUT",
    )
    S3_CLIENT_40008_INVALID_CREDENTIALS = (
        S3_CLIENT + 8,
        "Invalid Access Key or Secret Key",
        "S3_INVALID_CREDENTIALS",
    )
    S3_CLIENT_40009_SIGNATURE_OR_REGION_ERROR = (
        S3_CLIENT + 9,
        "S3 Signature or Region Mismatch",
        "S3_SIGNATURE_OR_REGION_ERROR",
    )
    S3_CLIENT_40010_INVALID_RESPONSE = (
        S3_CLIENT + 10,
        "Invalid S3 Service Response",
        "S3_INVALID_RESPONSE",
    )
    S3_CLIENT_40011_CLOCK_SKEW = (
        S3_CLIENT + 11,
        "Request Time Too Skewed",
        "S3_CLOCK_SKEW",
    )
    S3_CLIENT_40012_THROTTLED = (
        S3_CLIENT + 12,
        "S3 Service Busy or Throttled",
        "S3_THROTTLED",
    )
    S3_CLIENT_40013_INVALID_PARAM = (
        S3_CLIENT + 13,
        "Invalid S3 Request Parameter",
        "S3_INVALID_PARAM",
    )

    # ping & server
    PING_50000_ERROR = (
        PING,
        "Endpoint Verification Failed",
        "PING_ERROR",
    )
    SERVER_60000_ERROR = (
        SERVER,
        "Internal Server Error",
        "SERVER_ERROR",
    )
    SERVER_60001_READ_ERROR = (
        SERVER + 1,
        "Failed to Read File",
        "SERVER_READ_ERROR",
    )

    @property
    def err_code(self) -> int:
        return self.value[0]

    @property
    def default_msg(self) -> str:
        return self.value[1]

    @property
    def error_key(self) -> str:
        return self.value[2]


class AppEx(HTTPException):
    def __init__(
        self,
        code: ErrorCode,
        status_code: int = status.HTTP_400_BAD_REQUEST,
        detail: str = "",
        suggestion: str = "",
    ) -> None:
        self.error_enum = code
        self.msg = code.default_msg
        self.code = code.err_code
        self.error_key = code.error_key
        self.detail = detail
        self.suggestion = suggestion
        self.status_code = status_code
        super().__init__(status_code=status_code, detail=detail or self.msg)


def _resolve_request_id(request: Request | None) -> str:
    if request is not None:
        state_id = getattr(request.state, "request_id", None)
        if state_id:
            return str(state_id)
    return get_request_id()


def build_error_response(
    request: Request | None,
    status_code: int,
    code: ErrorCode,
    detail: Any = "",
    suggestion: str = "",
    msg: str | None = None,
) -> JSONResponse:
    """构造统一的错误响应 JSONResponse"""
    request_id = _resolve_request_id(request)
    headers = {"X-Request-Id": request_id} if request_id else None
    content = {
        "err_code": code.err_code,
        "error_key": code.error_key,
        "msg": msg or code.default_msg,
        "detail": detail if detail is not None else "",
        "suggestion": suggestion or "",
        "request_id": request_id,
    }
    return JSONResponse(status_code=status_code, content=content, headers=headers)


def translate_s3_exception(
    exc: Exception,
    *,
    bucket: str = "",
    key: str = "",
    endpoint: str = "",
) -> AppEx:
    """将 botocore / S3 各类异常集中翻译为语义明确的 AppEx"""
    if isinstance(exc, AppEx):
        return exc

    if isinstance(exc, ClientError):
        response = exc.response or {}
        err_info = response.get("Error", {}) or {}
        meta = response.get("ResponseMetadata", {}) or {}
        error_code = str(err_info.get("Code", "") or "")
        error_msg = str(err_info.get("Message", "") or str(exc))
        http_status = int(meta.get("HTTPStatusCode") or 0)
        headers = meta.get("HTTPHeaders", {}) or {}
        detected_region = err_info.get("Region") or headers.get("x-amz-bucket-region") or ""

        if error_code in {
            "InvalidAccessKeyId",
            "InvalidClientTokenId",
            "InvalidToken",
            "ExpiredToken",
            "InvalidSecurity",
            "AuthFailure",
        }:
            return AppEx(
                code=ErrorCode.S3_CLIENT_40008_INVALID_CREDENTIALS,
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"{error_code}: {error_msg}",
                suggestion="Please verify the Access Key ID and Secret Access Key.",
            )

        if error_code in {
            "SignatureDoesNotMatch",
            "AuthorizationHeaderMalformed",
            "AuthorizationQueryParametersError",
            "IllegalLocationConstraintException",
            "PermanentRedirect",
            "301",
        }:
            region_hint = f" (expected region: {detected_region})" if detected_region else ""
            return AppEx(
                code=ErrorCode.S3_CLIENT_40009_SIGNATURE_OR_REGION_ERROR,
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"{error_code}{region_hint}: {error_msg}",
                suggestion=(
                    "Check Secret Key, Region, Signature Version (try S3v2/s3 for legacy gateways), "
                    "or Addressing Style (try Path-Style)."
                ),
            )

        if error_code in {"AccessDenied", "403", "AccountProblem", "AllAccessDisabled"} or http_status == 403:
            target = f"bucket '{bucket}'" if bucket else "target S3 path"
            return AppEx(
                code=ErrorCode.S3_CLIENT_40001_ACCESS_DENIED,
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied to {target}: {error_msg}",
                suggestion="Check whether the selected AK/SK has list/read permissions for this bucket and prefix.",
            )

        if error_code == "NoSuchBucket":
            return AppEx(
                code=ErrorCode.S3_CLIENT_40002_NO_SUCH_BUCKET,
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Bucket '{bucket}' does not exist or is not reachable under current addressing style",
                suggestion="Verify the bucket name and try switching Addressing Style between Path-Style and Virtual-Host.",
            )

        if error_code in {"NoSuchKey", "404", "NotFound"} or http_status == 404:
            target = f"{bucket}/{key}" if key else (bucket or "requested resource")
            return AppEx(
                code=ErrorCode.S3_CLIENT_40003_NOT_FOUND,
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Object '{target}' does not exist",
                suggestion="Check that the S3 path and object key are spelled correctly.",
            )

        if error_code == "RequestTimeTooSkewed":
            return AppEx(
                code=ErrorCode.S3_CLIENT_40011_CLOCK_SKEW,
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"{error_code}: {error_msg}",
                suggestion="Synchronize the system clock (NTP) between this server and the S3 storage cluster.",
            )

        if error_code in {"SlowDown", "ServiceUnavailable", "Throttling", "ThrottlingException", "503"} or http_status == 503:
            return AppEx(
                code=ErrorCode.S3_CLIENT_40012_THROTTLED,
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"{error_code}: {error_msg}",
                suggestion="The S3 service is temporarily busy or rate-limiting requests. Retry later.",
            )

        if error_code in {
            "InvalidBucketName",
            "InvalidArgument",
            "InvalidRange",
            "InvalidRequest",
            "MethodNotAllowed",
            "NotImplemented",
        }:
            return AppEx(
                code=ErrorCode.S3_CLIENT_40013_INVALID_PARAM,
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"{error_code}: {error_msg}",
                suggestion="Verify the bucket name, endpoint, and request parameters.",
            )

        mapped_status = (
            http_status
            if 400 <= http_status < 500
            else status.HTTP_502_BAD_GATEWAY
        )
        return AppEx(
            code=ErrorCode.S3_CLIENT_40000_ERROR,
            status_code=mapped_status,
            detail=f"{error_code or 'ClientError'}: {error_msg}",
            suggestion="Check S3 gateway logs and configuration (Addressing Style, Region, Signature Version).",
        )

    if isinstance(exc, SSLError):
        return AppEx(
            code=ErrorCode.S3_CLIENT_40006_SSL_ERROR,
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
            suggestion=(
                "SSL/TLS verification failed. For private or self-signed endpoints, disable 'Verify SSL' "
                "or switch Addressing Style to Path-Style."
            ),
        )

    if isinstance(exc, (ConnectTimeoutError, ReadTimeoutError)):
        return AppEx(
            code=ErrorCode.S3_CLIENT_40007_TIMEOUT,
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail=str(exc),
            suggestion="Check network reachability, firewall rules, and whether the endpoint port is open.",
        )

    if isinstance(exc, EndpointConnectionError):
        ep_hint = f" ({endpoint})" if endpoint else ""
        return AppEx(
            code=ErrorCode.S3_CLIENT_40005_ENDPOINT_UNREACHABLE,
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
            suggestion=(
                f"Cannot reach S3 endpoint{ep_hint}. If virtual-host DNS (<bucket>.endpoint) is not configured, "
                "switch Addressing Style to Path-Style."
            ),
        )

    if isinstance(exc, ResponseParserError):
        return AppEx(
            code=ErrorCode.S3_CLIENT_40010_INVALID_RESPONSE,
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
            suggestion="The endpoint returned a non-S3 response (e.g. HTML page). Confirm you are using the S3 API port, not the console URL.",
        )

    if isinstance(exc, (NoCredentialsError, PartialCredentialsError)):
        return AppEx(
            code=ErrorCode.S3_CLIENT_40008_INVALID_CREDENTIALS,
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc) or "Missing or incomplete S3 credentials",
            suggestion="Ensure a valid AK/SK keychain is selected.",
        )

    if isinstance(exc, (ParamValidationError, InvalidRegionError, ValueError)):
        return AppEx(
            code=ErrorCode.S3_CLIENT_40013_INVALID_PARAM,
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
            suggestion="Check endpoint URL format, bucket name, and region value.",
        )

    if isinstance(exc, BotoCoreError):
        return AppEx(
            code=ErrorCode.S3_CLIENT_40000_ERROR,
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
            suggestion="S3 client communication failed. Check endpoint and advanced S3 options.",
        )

    return AppEx(
        code=ErrorCode.S3_CLIENT_40004_UNKNOWN_ERROR,
        status_code=status.HTTP_502_BAD_GATEWAY,
        detail=str(exc),
    )


async def app_exception_handler(request: Request, exp: AppEx):
    if exp.status_code >= 500:
        logger.error(f"AppEx [{exp.code}] {exp.msg}: {exp.detail}")
    else:
        logger.warning(f"AppEx [{exp.code}] {exp.msg}: {exp.detail}")

    return build_error_response(
        request=request,
        status_code=exp.status_code,
        code=exp.error_enum,
        detail=exp.detail,
        suggestion=exp.suggestion,
        msg=exp.msg,
    )


async def http_exception_handler(request: Request, exp: StarletteHTTPException):
    if (
        isinstance(exp, StarletteHTTPException)
        and exp.status_code == status.HTTP_404_NOT_FOUND
        and not request.url.path.startswith("/api")
    ):
        return FileResponse(
            os.path.join(
                pkg_resources.resource_filename("vis3.internal", "statics"),
                "index.html",
            ),
            status_code=200,
            headers={
                "Content-Type": "text/html",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            },
        )

    status_code = getattr(exp, "status_code", None) or status.HTTP_500_INTERNAL_SERVER_ERROR
    detail = getattr(exp, "detail", None) or str(exp)

    if status_code >= 500:
        logger.opt(exception=exp).error(f"HTTPException {status_code}: {detail}")
    else:
        logger.warning(f"HTTPException {status_code}: {detail}")

    if status_code == status.HTTP_403_FORBIDDEN:
        return build_error_response(
            request=request,
            status_code=status_code,
            code=ErrorCode.AUTH_10001_NOT_AUTHENTICATED,
            detail=str(detail) if detail else "",
        )

    code = (
        ErrorCode.SERVER_60000_ERROR
        if status_code >= 500
        else ErrorCode.CODE_00003_CLIENT_ERROR
    )
    return build_error_response(
        request=request,
        status_code=status_code,
        code=code,
        detail=detail if status_code < 500 else "Internal server error",
    )


async def validation_exception_handler(request: Request, exp: RequestValidationError):
    errors = exp.errors() if hasattr(exp, "errors") else []
    formatted = "; ".join(
        f"{'.'.join(str(loc) for loc in err.get('loc', []))}: {err.get('msg', '')}"
        for err in errors
    ) or str(exp)
    logger.warning(f"Validation error on {request.url.path}: {formatted}")

    return build_error_response(
        request=request,
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        code=ErrorCode.CODE_00002_VALIDATION_ERROR,
        detail=formatted,
    )


async def sql_exception_handler(request: Request, exp: SQLAlchemyError):
    logger.opt(exception=exp).error(f"Database error on {request.url.path}")
    return build_error_response(
        request=request,
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        code=ErrorCode.CODE_00000_SQL_ERROR,
        detail="Database operation failed",
    )


async def boto_exception_handler(request: Request, exp: Exception):
    translated = translate_s3_exception(exp)
    if translated.status_code >= 500:
        logger.opt(exception=exp).error(
            f"S3 error [{translated.code}] on {request.url.path}: {translated.detail}"
        )
    else:
        logger.warning(
            f"S3 error [{translated.code}] on {request.url.path}: {translated.detail}"
        )

    return build_error_response(
        request=request,
        status_code=translated.status_code,
        code=translated.error_enum,
        detail=translated.detail,
        suggestion=translated.suggestion,
    )


async def handle_unicode_decode_error(request: Request, exp: UnicodeDecodeError):
    logger.warning(f"UnicodeDecodeError on {request.url.path}: {exp}")
    return build_error_response(
        request=request,
        status_code=status.HTTP_400_BAD_REQUEST,
        code=ErrorCode.SERVER_60001_READ_ERROR,
        detail=str(exp),
    )


async def handle_server_error(request: Request, exp: Exception):
    if isinstance(exp, AppEx):
        return await app_exception_handler(request, exp)
    if isinstance(exp, (StarletteHTTPException, HTTPException)):
        return await http_exception_handler(request, exp)
    if isinstance(exp, (ClientError, BotoCoreError, ResponseParserError)):
        return await boto_exception_handler(request, exp)
    if isinstance(exp, InvalidToken):
        logger.error(f"Fernet decrypt failure on {request.url.path}")
        return build_error_response(
            request=request,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            code=ErrorCode.KEYCHAIN_20008_DECRYPT_FAILED,
            detail="Failed to decrypt stored credential",
            suggestion="Check ENCRYPT_KEY configuration or re-create the AK/SK keychain",
        )

    logger.opt(exception=exp).error(f"Unhandled exception on {request.url.path}")
    return build_error_response(
        request=request,
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        code=ErrorCode.SERVER_60000_ERROR,
        detail="Unexpected internal error. Check server logs with request_id.",
    )


def add_exception_handler(app: FastAPI):
    app.add_exception_handler(AppEx, app_exception_handler)
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(HTTPException, http_exception_handler)
    app.add_exception_handler(ClientError, boto_exception_handler)
    app.add_exception_handler(BotoCoreError, boto_exception_handler)
    app.add_exception_handler(ResponseParserError, boto_exception_handler)
    app.add_exception_handler(ParamValidationError, boto_exception_handler)
    app.add_exception_handler(EndpointConnectionError, boto_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(SQLAlchemyError, sql_exception_handler)
    app.add_exception_handler(UnicodeDecodeError, handle_unicode_decode_error)
    app.add_exception_handler(Exception, handle_server_error)
