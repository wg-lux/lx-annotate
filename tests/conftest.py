from __future__ import annotations

import base64
import os

import pytest


@pytest.fixture(scope="session")
def django_db_modify_db_settings(
    postgresql_proc,
    django_db_modify_db_settings_parallel_suffix,
) -> None:
    """Connect Django to pytest-postgresql's temporary server.

    pytest-postgresql owns the server process.
    pytest-django still owns database creation, migrations, and teardown.
    """
    from django.conf import settings
    from django.db import connections

    database = settings.DATABASES["default"]

    if database["ENGINE"] != "django.db.backends.postgresql":
        raise RuntimeError(
            "The temporary PostgreSQL fixture requires PostgreSQL test settings."
        )

    # Avoid keeping a connection opened with earlier configuration.
    connections.close_all()

    # Update the existing dictionary in place. Do not replace TEST["NAME"]:
    # pytest-django's parallel-suffix fixture may already have adjusted it.
    database.update(
        {
            "NAME": "lx_test",
            "USER": postgresql_proc.user,
            "PASSWORD": postgresql_proc.password or "",
            "HOST": postgresql_proc.host,
            "PORT": str(postgresql_proc.port),
        }
    )


@pytest.fixture(scope="session")
def packaged_registry():
    """Hydrate the test root configured before Django imports any API routes."""
    from lx_dtypes.terminology.terminology_loader import hydrate_shipped_terminology

    return hydrate_shipped_terminology()


def pytest_configure(config):
    #
    os.environ["DJANGO_SETTINGS_MODULE"] = "lx_annotate.settings.settings_test"


@pytest.fixture
def master_key(monkeypatch) -> bytes:
    key = b"0" * 32
    encoded = base64.urlsafe_b64encode(key).decode("ascii")
    monkeypatch.setenv("LX_ANNOTATE_MASTER_KEY", encoded)
    monkeypatch.delenv("LX_ANNOTATE_MASTER_KEY_FILE", raising=False)
    return key
