from __future__ import annotations

import base64
import os

import pytest


def pytest_configure(config):
    # This forces the environment variable to the test settings before
    # pytest-django starts looking for it.
    os.environ["DJANGO_SETTINGS_MODULE"] = "lx_annotate.settings.settings_test"


@pytest.fixture
def master_key(monkeypatch) -> bytes:
    key = b"0" * 32
    encoded = base64.urlsafe_b64encode(key).decode("ascii")
    monkeypatch.setenv("LX_ANNOTATE_MASTER_KEY", encoded)
    monkeypatch.delenv("LX_ANNOTATE_MASTER_KEY_FILE", raising=False)
    return key
