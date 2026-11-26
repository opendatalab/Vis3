from unittest.mock import patch

from botocore.exceptions import (
    ClientError,
    EndpointConnectionError,
    SSLError,
)
from botocore.parsers import ResponseParserError
from fastapi import HTTPException
from sqlalchemy.exc import OperationalError
from starlette.exceptions import HTTPException as StarletteHTTPException

from vis3.internal.common.exceptions import AppEx, ErrorCode
from vis3.main import app


def _ensure_test_routes():
    paths = {r.path for r in app.routes}
    if "/api/v1/_test/starlette-403" in paths:
        return

    @app.get("/api/v1/_test/starlette-403")
    async def _starlette_403():
        raise StarletteHTTPException(status_code=403, detail="Forbidden")

    @app.get("/api/v1/_test/http-400")
    async def _http_400():
        raise HTTPException(status_code=400, detail="Bad param")

    @app.get("/api/v1/_test/unhandled")
    async def _unhandled():
        raise RuntimeError("sensitive internal trace secret")

    @app.get("/api/v1/_test/sql-error")
    async def _sql_error():
        raise OperationalError("SELECT * FROM secret", {}, Exception("db broken"))

    @app.get("/api/v1/_test/s3-ssl")
    async def _s3_ssl():
        raise SSLError(endpoint_url="https://s3.inspur.local", error="bad cert")

    @app.get("/api/v1/_test/s3-endpoint")
    async def _s3_endpoint():
        raise EndpointConnectionError(endpoint_url="https://bad.inspur.local")

    @app.get("/api/v1/_test/s3-parser")
    async def _s3_parser():
        raise ResponseParserError("Unable to parse response")

    @app.get("/api/v1/_test/s3-auth")
    async def _s3_auth():
        raise ClientError(
            {
                "Error": {"Code": "InvalidAccessKeyId", "Message": "Bad AK"},
                "ResponseMetadata": {"HTTPStatusCode": 403},
            },
            "ListObjects",
        )

    # Move test routes before the catch-all StaticFiles mount at ""
    test_routes = [r for r in app.router.routes if getattr(r, "path", "").startswith("/api/v1/_test/")]
    other_routes = [r for r in app.router.routes if not getattr(r, "path", "").startswith("/api/v1/_test/")]
    app.router.routes[:] = test_routes + other_routes


def test_error_code_uniqueness_and_auth_10004():
    codes = [e.err_code for e in ErrorCode]
    assert len(codes) == len(set(codes)), "Duplicate numeric ErrorCode detected"
    assert hasattr(ErrorCode, "AUTH_10004_USERNAME_ALREADY_EXISTS")
    assert ErrorCode.CODE_00001_NO_PERMISSION.err_code == 1


def test_unified_error_responses_and_request_id(client):
    _ensure_test_routes()

    # 403 StarletteHTTPException previously crashed with AttributeError on CODE_10001
    r403 = client.get("/api/v1/_test/starlette-403")
    assert r403.status_code == 403
    body403 = r403.json()
    assert body403["err_code"] == ErrorCode.AUTH_10001_NOT_AUTHENTICATED.err_code
    assert body403["request_id"].startswith("req_")
    assert r403.headers.get("X-Request-Id") == body403["request_id"]

    # Custom X-Request-Id passthrough
    r400 = client.get("/api/v1/_test/http-400", headers={"X-Request-Id": "req_custom_123"})
    assert r400.status_code == 400
    assert r400.json()["request_id"] == "req_custom_123"
    assert r400.headers.get("X-Request-Id") == "req_custom_123"

    # Unhandled RuntimeError -> sanitized 500 via handle_server_error
    r500 = client.get("/api/v1/_test/unhandled")
    assert r500.status_code == 500
    body500 = r500.json()
    assert body500["err_code"] == ErrorCode.SERVER_60000_ERROR.err_code
    assert "sensitive internal trace secret" not in body500["detail"]
    assert body500["request_id"]

    # SQLAlchemyError -> sanitized 500 via sql_exception_handler
    rsql = client.get("/api/v1/_test/sql-error")
    assert rsql.status_code == 500
    bodysql = rsql.json()
    assert bodysql["err_code"] == ErrorCode.CODE_00000_SQL_ERROR.err_code
    assert "SELECT" not in bodysql["detail"]

    # Boto errors -> proper 502 / 401 instead of 500
    r_ssl = client.get("/api/v1/_test/s3-ssl")
    assert r_ssl.status_code == 502
    assert r_ssl.json()["err_code"] == ErrorCode.S3_CLIENT_40006_SSL_ERROR.err_code
    assert r_ssl.json()["suggestion"]

    r_ep = client.get("/api/v1/_test/s3-endpoint")
    assert r_ep.status_code == 502
    assert r_ep.json()["err_code"] == ErrorCode.S3_CLIENT_40005_ENDPOINT_UNREACHABLE.err_code

    r_parser = client.get("/api/v1/_test/s3-parser")
    assert r_parser.status_code == 502
    assert r_parser.json()["err_code"] == ErrorCode.S3_CLIENT_40010_INVALID_RESPONSE.err_code

    r_auth = client.get("/api/v1/_test/s3-auth")
    assert r_auth.status_code == 401
    assert r_auth.json()["err_code"] == ErrorCode.S3_CLIENT_40008_INVALID_CREDENTIALS.err_code


def test_validation_error_format(client):
    resp = client.post("/api/v1/bucket", json={"path": "s3://b/"})
    assert resp.status_code == 422
    data = resp.json()
    assert data["err_code"] == ErrorCode.CODE_00002_VALIDATION_ERROR.err_code
    assert "endpoint" in data["detail"]
    assert data["request_id"]
