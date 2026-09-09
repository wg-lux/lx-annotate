from __future__ import annotations

from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.utils import timezone
from rest_framework.test import APIClient

from lx_annotate.monitoring.contracts import MonitoringCheck, MonitoringSnapshot

pytestmark = pytest.mark.django_db
URL = "/api/administration/monitoring/"


@pytest.mark.parametrize(
    "principal,allowed",
    [
        ("anonymous", False),
        ("user", False),
        ("staff", False),
        ("center_scope:admin", False),
        ("data:write", False),
        ("center_scope:global_admin", True),
        ("superuser", True),
    ],
)
@pytest.mark.parametrize("url", [URL, "/endoreg-api/administration/monitoring/"])
def test_exact_admin_authorization(principal, allowed, url):
    client = APIClient()
    if principal != "anonymous":
        user = get_user_model().objects.create_user(
            username="monitoring-test",
            is_staff=principal == "staff",
            is_superuser=principal == "superuser",
        )
        if ":" in principal:
            user.groups.add(Group.objects.create(name=principal))
        client.force_authenticate(user=user)
    check = MonitoringCheck(
        key="database.connectivity",
        status="ok",
        summary="Database query succeeded.",
        observed_at=timezone.now(),
    )
    snapshot = MonitoringSnapshot(
        status="ok", version="1.2.3", observed_at=timezone.now(), checks=[check]
    )
    with patch(
        "lx_annotate.views.monitoring.build_monitoring_snapshot", return_value=snapshot
    ) as build:
        response = client.get(url)
    assert response.status_code == (200 if allowed else 403)
    assert build.call_count == int(allowed)
    if allowed:
        assert response.json() == snapshot.model_dump(mode="json")
        assert response["Cache-Control"] == "private, no-store"
        assert "observed_at" in response.json()
    else:
        assert "checks" not in response.json()


def test_browser_cannot_select_services_or_run_commands():
    user = get_user_model().objects.create_user(
        username="monitoring-admin", is_superuser=True
    )
    client = APIClient()
    client.force_authenticate(user=user)
    with patch("lx_annotate.views.monitoring.build_monitoring_snapshot") as build:
        assert client.get(URL, {"unit": "ssh.service"}).status_code == 400
        assert client.post(URL, {"command": "reboot"}).status_code == 405
        build.assert_not_called()
