from __future__ import annotations

from typing import Protocol, cast

import pytest
from django.test import override_settings
from django.urls import resolve


class _ClassBasedViewCallback(Protocol):
    view_class: type[object]


HUB_TRANSFER_ROUTES = (
    ("media/hub/transfers/", "hub-transfer-create"),
    (
        "media/hub/transfers/transfer-1/status/",
        "hub-transfer-status",
    ),
    (
        "media/hub/transfers/transfer-1/media/",
        "hub-transfer-media-upload",
    ),
)


@pytest.mark.parametrize(("suffix", "url_name"), HUB_TRANSFER_ROUTES)
@override_settings(ROOT_URLCONF="lx_annotate.urls")
def test_hub_transfer_routes_are_identical_under_both_api_prefixes(
    suffix: str,
    url_name: str,
) -> None:
    canonical_match = resolve(f"/endoreg-api/{suffix}")
    legacy_match = resolve(f"/api/{suffix}")

    assert canonical_match.url_name == url_name
    assert legacy_match.url_name == url_name
    canonical_callback = cast(_ClassBasedViewCallback, canonical_match.func)
    legacy_callback = cast(_ClassBasedViewCallback, legacy_match.func)
    assert canonical_callback.view_class is legacy_callback.view_class
