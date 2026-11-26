import asyncio
import io
from unittest.mock import MagicMock, patch

import httpx
import pytest
from botocore.exceptions import (
    ClientError,
    ConnectTimeoutError,
    EndpointConnectionError,
    ParamValidationError,
    SSLError,
)
from botocore.parsers import ResponseParserError

from vis3.internal.client.s3_reader import S3Reader
from vis3.internal.common.exceptions import AppEx, ErrorCode
from vis3.internal.models.bucket import Bucket
from vis3.internal.utils import ping_host, validate_path_accessibility
from vis3.internal.utils.path import normalize_endpoint


def _make_client_error(code: str, message: str = "err", http_status: int = 400, headers: dict | None = None, region: str | None = None):
    err = {"Code": code, "Message": message}
    if region:
        err["Region"] = region
    return ClientError(
        {
            "Error": err,
            "ResponseMetadata": {
                "HTTPStatusCode": http_status,
                "HTTPHeaders": headers or {},
            },
        },
        "ListObjects",
    )


class TestNormalizeEndpoint:
    def test_valid_endpoints(self):
        assert normalize_endpoint("https://oss.inspur.com/") == "https://oss.inspur.com"
        assert normalize_endpoint("10.0.0.1:9000") == "http://10.0.0.1:9000"
        assert normalize_endpoint("http%3A%2F%2Fs3.inspur.local%3A8080%2F") == "http://s3.inspur.local:8080"
        assert normalize_endpoint("  https://s3.example.com/custom/  ") == "https://s3.example.com/custom"

    def test_invalid_endpoints_raise_appex_400(self):
        for bad in ("", "   ", "ftp://example.com", "http://", "http://host:99999"):
            with pytest.raises(AppEx) as exc_info:
                normalize_endpoint(bad)
            assert exc_info.value.code == ErrorCode.BUCKET_30009_INVALID_ENDPOINT.err_code
            assert exc_info.value.status_code == 400


class TestPingHost:
    def test_ping_reachable_including_403_and_501(self):
        async def _run():
            for code in (200, 403, 501):
                mock_resp = MagicMock(status_code=code)
                mock_client = MagicMock()
                mock_client.__aenter__.return_value = mock_client
                mock_client.__aexit__.return_value = None

                async def _get(*args, **kwargs):
                    return mock_resp

                mock_client.get = _get
                with patch("vis3.internal.utils.httpx.AsyncClient", return_value=mock_client):
                    res = await ping_host("https://s3.inspur.local:8080")
                    assert res["reachable"] is True
                    assert res["status_code"] == code

        asyncio.run(_run())

    def test_ping_failures_return_structured_diagnostic(self):
        async def _run():
            # Invalid endpoint
            res_invalid = await ping_host("ftp://bad-host")
            assert res_invalid["reachable"] is False
            assert res_invalid["err_code"] == ErrorCode.BUCKET_30009_INVALID_ENDPOINT.err_code

            # Timeout
            mock_client = MagicMock()
            mock_client.__aenter__.return_value = mock_client
            mock_client.__aexit__.return_value = None

            async def _timeout(*args, **kwargs):
                raise httpx.ConnectTimeout("timed out")

            mock_client.get = _timeout
            with patch("vis3.internal.utils.httpx.AsyncClient", return_value=mock_client):
                res_timeout = await ping_host("https://s3.inspur.local:8080")
                assert res_timeout["reachable"] is False
                assert res_timeout["err_code"] == ErrorCode.S3_CLIENT_40007_TIMEOUT.err_code

            # SSL error
            async def _ssl(*args, **kwargs):
                raise httpx.ConnectError("[SSL: CERTIFICATE_VERIFY_FAILED] certificate verify failed")

            mock_client.get = _ssl
            with patch("vis3.internal.utils.httpx.AsyncClient", return_value=mock_client):
                res_ssl = await ping_host("https://s3.inspur.local:8080")
                assert res_ssl["reachable"] is False
                assert res_ssl["err_code"] == ErrorCode.S3_CLIENT_40006_SSL_ERROR.err_code

            # 502 from upstream
            mock_502 = MagicMock(status_code=502)

            async def _bad_gw(*args, **kwargs):
                return mock_502

            mock_client.get = _bad_gw
            with patch("vis3.internal.utils.httpx.AsyncClient", return_value=mock_client):
                res_502 = await ping_host("https://s3.inspur.local:8080")
                assert res_502["reachable"] is False
                assert res_502["err_code"] == ErrorCode.S3_CLIENT_40005_ENDPOINT_UNREACHABLE.err_code

        asyncio.run(_run())


class TestValidatePathAccessibility:
    def test_auto_fallback_virtual_to_path_for_inspur_domain(self):
        attempts = []

        def fake_get_client(ak, sk, endpoint, region_name="us-east-1", addressing_style="auto", signature_version="s3v4", **kwargs):
            client = MagicMock()

            def _list_objects(**op_kwargs):
                attempts.append((addressing_style, region_name, signature_version))
                if addressing_style == "virtual":
                    raise EndpointConnectionError(endpoint_url="https://mybucket.s3.inspur.local")
                return {"Contents": [{"Key": "demo.json"}]}

            client.list_objects = _list_objects
            return client

        async def _run():
            with patch.object(S3Reader, "get_client", side_effect=fake_get_client):
                res = await validate_path_accessibility(
                    path="s3://mybucket/",
                    endpoint="https://s3.inspur.local",
                    ak="ak",
                    sk="sk",
                )
            assert res["accessible"] is True
            assert res["detected_config"]["addressing_style"] == "path"
            assert attempts[0][0] == "virtual"
            assert attempts[1][0] == "path"

        asyncio.run(_run())

    def test_auto_fallback_on_ssl_error_to_path(self):
        def fake_get_client(ak, sk, endpoint, region_name="us-east-1", addressing_style="auto", signature_version="s3v4", **kwargs):
            client = MagicMock()

            def _list_objects(**op_kwargs):
                if addressing_style == "virtual":
                    raise SSLError(endpoint_url="https://mybucket.oss.inspur.com", error="hostname mismatch")
                return {"Contents": []}

            client.list_objects = _list_objects
            return client

        async def _run():
            with patch.object(S3Reader, "get_client", side_effect=fake_get_client):
                res = await validate_path_accessibility(
                    path="s3://mybucket/",
                    endpoint="https://oss.inspur.com",
                    ak="ak",
                    sk="sk",
                )
            assert res["accessible"] is True
            assert res["detected_config"]["addressing_style"] == "path"

        asyncio.run(_run())

    def test_auto_detect_region_and_signature_v2_fallback(self):
        def fake_get_client(ak, sk, endpoint, region_name="us-east-1", addressing_style="auto", signature_version="s3v4", **kwargs):
            client = MagicMock()

            def _list_objects(**op_kwargs):
                if region_name != "cn-north-3":
                    raise _make_client_error(
                        "AuthorizationHeaderMalformed",
                        "wrong region",
                        http_status=400,
                        headers={"x-amz-bucket-region": "cn-north-3"},
                    )
                if signature_version == "s3v4":
                    raise _make_client_error("SignatureDoesNotMatch", "use v2", http_status=403)
                return {"Contents": []}

            client.list_objects = _list_objects
            return client

        async def _run():
            with patch.object(S3Reader, "get_client", side_effect=fake_get_client):
                res = await validate_path_accessibility(
                    path="s3://mybucket/",
                    endpoint="http://10.0.0.1:9000",
                    ak="ak",
                    sk="sk",
                    signature_version="auto",
                )
            assert res["accessible"] is True
            assert res["detected_config"]["addressing_style"] == "path"
            assert res["detected_config"]["region"] == "cn-north-3"
            assert res["detected_config"]["signature_version"] == "s3"

        asyncio.run(_run())

    def test_all_failure_modes_return_diagnostics(self):
        scenarios = [
            (_make_client_error("InvalidAccessKeyId", "bad ak", 403), ErrorCode.S3_CLIENT_40008_INVALID_CREDENTIALS.err_code),
            (_make_client_error("AccessDenied", "denied", 403), ErrorCode.S3_CLIENT_40001_ACCESS_DENIED.err_code),
            (_make_client_error("NoSuchBucket", "missing", 404), ErrorCode.S3_CLIENT_40002_NO_SUCH_BUCKET.err_code),
            (SSLError(endpoint_url="https://x", error="cert"), ErrorCode.S3_CLIENT_40006_SSL_ERROR.err_code),
            (ConnectTimeoutError(endpoint_url="https://x"), ErrorCode.S3_CLIENT_40007_TIMEOUT.err_code),
            (ResponseParserError("Unable to parse response"), ErrorCode.S3_CLIENT_40010_INVALID_RESPONSE.err_code),
            (EndpointConnectionError(endpoint_url="https://x"), ErrorCode.S3_CLIENT_40005_ENDPOINT_UNREACHABLE.err_code),
        ]

        async def _run():
            for exc, expected_code in scenarios:
                mock_client = MagicMock()
                mock_client.list_objects.side_effect = exc
                with patch.object(S3Reader, "get_client", return_value=mock_client):
                    res = await validate_path_accessibility(
                        path="s3://mybucket/",
                        endpoint="https://s3.inspur.local",
                        ak="ak",
                        sk="sk",
                        addressing_style="path",
                    )
                assert res["accessible"] is False
                assert res["err_code"] == expected_code
                assert res["suggestion"]

        asyncio.run(_run())


class TestS3ReaderCompatibility:
    def test_get_client_uses_path_for_ip_and_respects_verify_ssl(self):
        client = S3Reader.get_client(
            ak="ak",
            sk="sk",
            endpoint="https://10.10.1.2:9000",
            region_name="cn-east-1",
            addressing_style="auto",
            signature_version="s3v4",
            verify_ssl=False,
        )
        assert client._client_config.s3["addressing_style"] == "path"
        assert client.meta.region_name == "cn-east-1"

    def test_list_objects_translates_errors_and_omits_none_delimiter(self):
        bucket = Bucket(id=1, path="s3://b/", endpoint="http://10.0.0.1:9000")
        reader = S3Reader(
            key="",
            bucket=bucket,
            bucket_name="b",
            access_key_id="ak",
            secret_access_key="sk",
            endpoint_url="http://10.0.0.1:9000",
        )
        captured_kwargs = {}

        def _fake_list(**kwargs):
            captured_kwargs.update(kwargs)
            return {"Contents": [{"Key": "a.txt"}], "IsTruncated": False}

        reader.client = MagicMock()
        reader.client.list_objects = _fake_list

        async def _run_ok():
            items = [item async for item in reader.list_objects(recursive=True)]
            assert len(items) == 1
            assert "Delimiter" not in captured_kwargs

        asyncio.run(_run_ok())

        reader.client.list_objects = MagicMock(
            side_effect=_make_client_error("NoSuchBucket", "missing", 404)
        )

        async def _run_err():
            with pytest.raises(AppEx) as exc_info:
                async for _ in reader.list_objects():
                    pass
            assert exc_info.value.code == ErrorCode.S3_CLIENT_40002_NO_SUCH_BUCKET.err_code
            assert exc_info.value.status_code == 404

        asyncio.run(_run_err())

    def test_read_gz_row_raises_appex_instead_of_swallowing_error(self):
        bucket = Bucket(id=1, path="s3://b/", endpoint="http://10.0.0.1:9000")
        reader = S3Reader(
            key="data.jsonl.gz",
            bucket=bucket,
            bucket_name="b",
            access_key_id="ak",
            secret_access_key="sk",
            endpoint_url="http://10.0.0.1:9000",
        )
        reader.client = MagicMock()
        reader.client.get_object.side_effect = _make_client_error("AccessDenied", "denied", 403)

        async def _run():
            with pytest.raises(AppEx) as exc_info:
                await reader.read_gz_row(start=0)
            assert exc_info.value.code == ErrorCode.S3_CLIENT_40001_ACCESS_DENIED.err_code
            assert exc_info.value.status_code == 403

        asyncio.run(_run())

    def test_read_by_range_does_not_force_request_payer(self):
        bucket = Bucket(id=1, path="s3://b/", endpoint="http://10.0.0.1:9000")
        reader = S3Reader(
            key="hello.txt",
            bucket=bucket,
            bucket_name="b",
            access_key_id="ak",
            secret_access_key="sk",
            endpoint_url="http://10.0.0.1:9000",
        )
        captured_kwargs = {}

        def _fake_get_object(**kwargs):
            captured_kwargs.update(kwargs)
            return {"Body": io.BytesIO(b"hello world")}

        reader.client = MagicMock()
        reader.client.get_object = _fake_get_object

        async def _run():
            chunks = [c async for c, _ in reader.read_by_range(0, 10)]
            assert b"".join(chunks) == b"hello world"
            assert "RequestPayer" not in captured_kwargs

        asyncio.run(_run())
