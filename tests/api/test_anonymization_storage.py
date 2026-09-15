from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from lx_annotate.views.anonymization_storage import AnonymizationStorageSnapshot

pytestmark = pytest.mark.django_db
URL = "/api/anonymization/storage/"
MODULE = "lx_annotate.views.anonymization_storage"


def authenticated_client(principal="superuser"):
    client = APIClient()
    if principal != "anonymous":
        user = get_user_model().objects.create_user(
            username="storage-capacity-test",
            is_staff=principal == "staff",
            is_superuser=principal == "superuser",
        )
        if ":" in principal:
            user.groups.add(Group.objects.create(name=principal))
        client.force_authenticate(user=user)
    return client


@pytest.mark.parametrize("debug", [False, True])
@pytest.mark.parametrize("url", [URL, "/endoreg-api/anonymization/storage/"])
@pytest.mark.parametrize(
    "principal,allowed",
    [
        ("anonymous", False),
        ("user", False),
        ("staff", False),
        ("center_scope:admin", False),
        ("data:write", False),
        ("storage:monitor:extra", False),
        ("storage:monitor", True),
        ("center_scope:global_admin", True),
        ("superuser", True),
    ],
)
def test_mounted_authorization(principal, allowed, url, debug):
    client = authenticated_client(principal)
    snapshot = AnonymizationStorageSnapshot(
        total_bytes=100,
        used_bytes=65,
        available_bytes=30,
        reserved_bytes=5,
        observed_at=timezone.now(),
    )
    with (
        override_settings(DEBUG=debug),
        patch(f"{MODULE}.observe_storage_capacity", return_value=snapshot) as observe,
    ):
        response = client.get(url)
    assert response.status_code == (200 if allowed else 403)
    assert observe.call_count == int(allowed)
    if allowed:
        assert response.json() == snapshot.model_dump(mode="json")
        assert response["Cache-Control"] == "private, no-store"


@pytest.mark.parametrize("free,available", [(35, 30), (0, 0), (100, 100)])
def test_capacity_accounting_without_inventory(free, available):
    client = authenticated_client()
    usage = SimpleNamespace(
        f_blocks=100, f_bfree=free, f_bavail=available, f_frsize=4096
    )
    with (
        override_settings(PROTECTED_MEDIA_ROOT="/private/protected/media"),
        patch(f"{MODULE}.Path.is_dir", return_value=True),
        patch(f"{MODULE}.os.access", return_value=True),
        patch(f"{MODULE}.os.statvfs", return_value=usage) as statvfs,
        patch(f"{MODULE}.Path.iterdir") as scan,
    ):
        response = client.get(URL)
    assert response.status_code == 200
    payload = response.json()
    assert payload["scope"] == "protected_media_filesystem"
    assert payload["total_bytes"] == 100 * 4096
    assert payload["used_bytes"] == (100 - free) * 4096
    assert payload["available_bytes"] == available * 4096
    assert payload["reserved_bytes"] == (free - available) * 4096
    assert (
        sum(payload[key] for key in ("used_bytes", "available_bytes", "reserved_bytes"))
        == payload["total_bytes"]
    )
    assert "observed_at" in payload
    assert "/private" not in response.content.decode()
    statvfs.assert_called_once()
    scan.assert_not_called()


@pytest.mark.parametrize(
    "usage",
    [
        SimpleNamespace(f_blocks=0, f_bfree=0, f_bavail=0, f_frsize=4096),
        SimpleNamespace(f_blocks=100, f_bfree=30, f_bavail=31, f_frsize=4096),
        SimpleNamespace(f_blocks=100, f_bfree=101, f_bavail=30, f_frsize=4096),
        SimpleNamespace(f_blocks=100, f_bfree=30, f_bavail=-1, f_frsize=4096),
        SimpleNamespace(f_blocks=100, f_bfree=30, f_bavail=30, f_frsize=0),
    ],
)
def test_invalid_accounting_is_unavailable(usage):
    client = authenticated_client()
    with (
        override_settings(PROTECTED_MEDIA_ROOT="/private/protected/media"),
        patch(f"{MODULE}.Path.is_dir", return_value=True),
        patch(f"{MODULE}.os.access", return_value=True),
        patch(f"{MODULE}.os.statvfs", return_value=usage),
    ):
        response = client.get(URL)
    assert response.status_code == 503
    assert response.json()["code"] == "storage_unavailable"
    assert "total_bytes" not in response.json()


@pytest.mark.parametrize(
    "root,directory,accessible",
    [
        ("", True, True),
        ("relative", True, True),
        ("/private/root", False, True),
        ("/private/root", True, False),
    ],
)
def test_unavailable_root_does_not_observe_another_filesystem(
    root, directory, accessible
):
    client = authenticated_client()
    with (
        override_settings(PROTECTED_MEDIA_ROOT=root),
        patch(f"{MODULE}.Path.is_dir", return_value=directory),
        patch(f"{MODULE}.os.access", return_value=accessible),
        patch(f"{MODULE}.os.statvfs") as statvfs,
    ):
        response = client.get(URL)
    assert response.status_code == 503
    assert response.json()["code"] == "storage_unavailable"
    statvfs.assert_not_called()


def test_observation_failure_is_sanitized(caplog):
    client = authenticated_client()
    with (
        override_settings(PROTECTED_MEDIA_ROOT="/private/protected/media"),
        patch(f"{MODULE}.Path.is_dir", return_value=True),
        patch(f"{MODULE}.os.access", return_value=True),
        patch(
            f"{MODULE}.os.statvfs",
            side_effect=OSError("/private/protected/media secret"),
        ),
    ):
        response = client.get(URL)
    assert response.status_code == 503
    assert response.json()["code"] == "storage_unavailable"
    assert "secret" not in response.content.decode() + caplog.text
    assert "/private" not in response.content.decode() + caplog.text
    assert response["Cache-Control"] == "private, no-store"


def test_browser_cannot_select_paths_or_mutate_storage():
    client = authenticated_client()
    with patch(f"{MODULE}.observe_storage_capacity") as observe:
        assert client.get(URL, {"path": "/"}).status_code == 400
        assert client.post(URL, {}).status_code == 405
        observe.assert_not_called()
