import os
import sys
import tempfile
from pathlib import Path

ROOT_DIR = str(Path(__file__).resolve().parent.parent)
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

# Isolate SQLite database and generated sys-config before importing vis3
_TEST_TMP_DIR = tempfile.mkdtemp(prefix="vis3_test_")
os.environ["BASE_DATA_DIR"] = _TEST_TMP_DIR
os.environ["ENABLE_AUTH"] = "0"

import pytest
from fastapi.testclient import TestClient

from vis3.internal.common.db import SessionLocal
from vis3.internal.models.bucket import Bucket
from vis3.internal.models.keychain import KeyChain
from vis3.main import app


@pytest.fixture()
def client():
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c


@pytest.fixture()
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(autouse=True)
def clean_tables():
    db = SessionLocal()
    try:
        db.query(Bucket).delete()
        db.query(KeyChain).delete()
        db.commit()
    finally:
        db.close()
