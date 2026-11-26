from unittest.mock import AsyncMock, patch

import sqlalchemy as sa
from alembic.command import upgrade
from alembic.config import Config

from vis3.internal.common.exceptions import ErrorCode


def _create_keychain(client, name="inspur-key", ak="AKIA_TEST", sk="SK_TEST"):
    resp = client.post(
        "/api/v1/keychain",
        json={"name": name, "access_key_id": ak, "secret_key_id": sk},
    )
    assert resp.status_code == 201
    return resp.json()["id"]


def test_bucket_crud_and_not_found_no_500(client):
    # Non-existent bucket should return 404, never 500
    r_get = client.get("/api/v1/bucket/99999")
    assert r_get.status_code == 404
    assert r_get.json()["err_code"] == ErrorCode.BUCKET_30006_CONFIG_FILE_NOT_FOUND.err_code

    r_patch = client.patch("/api/v1/bucket/99999", json={"endpoint": "http://10.0.0.1:9000"})
    assert r_patch.status_code == 404
    assert r_patch.json()["err_code"] == ErrorCode.BUCKET_30006_CONFIG_FILE_NOT_FOUND.err_code

    # Missing keychain on /bucket/accessible should return 404, not AttributeError 500
    r_acc_missing_kc = client.get(
        "/api/v1/bucket/accessible",
        params={"path": "s3://test-bucket/", "endpoint": "http://10.0.0.1:9000", "keychain_id": 99999},
    )
    assert r_acc_missing_kc.status_code == 404
    assert r_acc_missing_kc.json()["err_code"] == ErrorCode.KEYCHAIN_20001_KEYCHAIN_NOT_FOUND.err_code

    kc_id = _create_keychain(client)

    # Batch create persists S3 compatibility fields
    r_batch = client.post(
        "/api/v1/bucket/batch",
        json=[
            {
                "path": "s3://inspur-bucket/",
                "endpoint": "https://s3.inspur.local:8443/",
                "keychain_id": kc_id,
                "addressing_style": "path",
                "region": "cn-north-1",
                "signature_version": "s3",
                "verify_ssl": False,
            }
        ],
    )
    assert r_batch.status_code == 200
    created = r_batch.json()[0]
    assert created["endpoint"] == "https://s3.inspur.local:8443"
    assert created["addressing_style"] == "path"
    assert created["region"] == "cn-north-1"
    assert created["signature_version"] == "s3"
    assert created["verify_ssl"] is False

    # Duplicate bucket returns BUCKET_30008_ALREADY_EXISTS (400), not KEYCHAIN_20002
    r_dup = client.post(
        "/api/v1/bucket",
        json={
            "path": "s3://inspur-bucket/",
            "endpoint": "https://s3.inspur.local:8443",
            "keychain_id": kc_id,
        },
    )
    assert r_dup.status_code == 400
    assert r_dup.json()["err_code"] == ErrorCode.BUCKET_30008_ALREADY_EXISTS.err_code


def test_ping_and_accessible_endpoints(client):
    kc_id = _create_keychain(client)

    with patch(
        "vis3.internal.api.v1.endpoints.bucket.ping_host",
        new=AsyncMock(return_value={"reachable": False, "err_code": 40005, "msg": "Cannot Connect to S3 Endpoint"}),
    ):
        r_ping = client.get("/api/v1/bucket/ping", params={"url": "http://s3.inspur.local", "verify_ssl": False})
        assert r_ping.status_code == 200
        assert r_ping.json()["data"]["reachable"] is False
        assert r_ping.json()["data"]["err_code"] == 40005

    with patch(
        "vis3.internal.api.v1.endpoints.bucket.validate_path_accessibility",
        new=AsyncMock(
            return_value={
                "accessible": True,
                "detected_config": {
                    "addressing_style": "path",
                    "region": "cn-east-1",
                    "signature_version": "s3v4",
                    "verify_ssl": True,
                },
            }
        ),
    ):
        r_acc = client.get(
            "/api/v1/bucket/accessible",
            params={
                "path": "s3://inspur-bucket/",
                "endpoint": "https://s3.inspur.local",
                "keychain_id": kc_id,
                "addressing_style": "auto",
            },
        )
        assert r_acc.status_code == 200
        assert r_acc.json()["data"]["accessible"] is True
        assert r_acc.json()["data"]["detected_config"]["addressing_style"] == "path"


def test_alembic_migration_idempotent_on_legacy_sqlite(tmp_path):
    legacy_db = tmp_path / "legacy.sqlite"
    engine = sa.create_engine(f"sqlite:///{legacy_db}")
    with engine.begin() as conn:
        conn.execute(
            sa.text(
                """
                CREATE TABLE bucket (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    path VARCHAR(255),
                    endpoint VARCHAR(255),
                    created_at DATETIME,
                    updated_at DATETIME,
                    created_by INTEGER,
                    state VARCHAR(255),
                    keychain_id INTEGER
                )
                """
            )
        )
        conn.execute(
            sa.text(
                "INSERT INTO bucket (path, endpoint, state, keychain_id) VALUES ('s3://old/', 'http://10.0.0.1:9000', 'enabled', 1)"
            )
        )

    import os
    import vis3.alembic_vis3.run_migrate as rm

    migrations_dir = os.path.dirname(os.path.realpath(rm.__file__))
    cfg = Config(file_=os.path.join(migrations_dir, "alembic.ini"))
    cfg.set_main_option("script_location", migrations_dir)
    cfg.set_main_option("sqlalchemy.url", f"sqlite:///{legacy_db}")
    upgrade(cfg, "7c9e2a4b1d08")
    # Run twice to prove idempotency
    upgrade(cfg, "7c9e2a4b1d08")

    inspector = sa.inspect(engine)
    cols = {c["name"] for c in inspector.get_columns("bucket")}
    assert {"addressing_style", "region", "signature_version", "verify_ssl"}.issubset(cols)
    with engine.connect() as conn:
        row = conn.execute(
            sa.text("SELECT addressing_style, region, signature_version, verify_ssl FROM bucket WHERE path='s3://old/'")
        ).fetchone()
        assert tuple(row) == ("auto", "us-east-1", "s3v4", 1)
