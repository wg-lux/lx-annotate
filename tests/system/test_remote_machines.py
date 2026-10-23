from __future__ import annotations

import json
from types import SimpleNamespace

import pytest
from rest_framework.test import APIRequestFactory, force_authenticate

from lx_annotate.services.remote_machines import parse_remote_machines
from lx_annotate.views.remote_machines import remote_machines


def _entry(**overrides: str) -> dict[str, str]:
    entry = {
        "key": "gs-02",
        "display_name": "gs-02 central hub",
        "base_url": "https://gs-02.intern",
        "deployment_role": "central_hub",
    }
    entry.update(overrides)
    return entry


def test_empty_registry_offers_no_machines() -> None:
    assert parse_remote_machines("") == ()
    assert parse_remote_machines("   ") == ()


def test_registry_normalizes_bare_https_origin() -> None:
    machines = parse_remote_machines(
        json.dumps(
            [
                _entry(base_url="https://gs-02.intern/"),
                _entry(
                    key="gc-02",
                    display_name="gc-02",
                    base_url="https://gc-02.intern:8443",
                    deployment_role="site_node",
                ),
            ]
        )
    )

    assert [machine.base_url for machine in machines] == [
        "https://gs-02.intern",
        "https://gc-02.intern:8443",
    ]


@pytest.mark.parametrize(
    "base_url",
    [
        "http://gs-02.intern",
        "https://gs-02.intern/endoreg-api/",
        "https://user:pw@gs-02.intern",
        "https://gs-02.intern?next=/",
        "https://gs-02.intern#top",
        "javascript:alert(1)",
        "https://",
    ],
)
def test_registry_rejects_non_origin_or_plaintext_urls(base_url: str) -> None:
    with pytest.raises(ValueError, match="invalid entry"):
        parse_remote_machines(json.dumps([_entry(base_url=base_url)]))


@pytest.mark.parametrize(
    "raw",
    [
        "not json",
        json.dumps({"gs-02": _entry()}),
        json.dumps([_entry(key="GS 02")]),
        json.dumps([_entry(deployment_role="laptop")]),
        json.dumps([{**_entry(), "client_secret": "x"}]),
    ],
)
def test_registry_rejects_malformed_configuration(raw: str) -> None:
    with pytest.raises(ValueError):
        parse_remote_machines(raw)


def test_registry_rejects_duplicate_keys_and_origins() -> None:
    with pytest.raises(ValueError, match="must not repeat"):
        parse_remote_machines(
            json.dumps([_entry(), _entry(base_url="https://x.intern")])
        )
    with pytest.raises(ValueError, match="must not repeat"):
        parse_remote_machines(json.dumps([_entry(), _entry(key="gs-02-alias")]))


def test_view_lists_configured_machines_and_local_role(settings) -> None:
    settings.ENDOREG_DEPLOYMENT_ROLE = "central_hub"
    settings.LX_ANNOTATE_REMOTE_MACHINES = parse_remote_machines(json.dumps([_entry()]))
    request = APIRequestFactory().get("/endoreg-api/runtime/remote-machines/")
    force_authenticate(
        request, user=SimpleNamespace(is_authenticated=True, is_active=True)
    )

    response = remote_machines(request)

    assert response.status_code == 200
    assert response["Cache-Control"] == "no-store"
    assert response.data == {
        "deployment_role": "central_hub",
        "machines": [_entry()],
    }


def test_view_requires_authentication(settings) -> None:
    settings.LX_ANNOTATE_REMOTE_MACHINES = ()
    request = APIRequestFactory().get("/endoreg-api/runtime/remote-machines/")

    response = remote_machines(request)

    assert response.status_code in {401, 403}
