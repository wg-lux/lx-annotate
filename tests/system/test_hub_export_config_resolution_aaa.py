from __future__ import annotations

from pathlib import Path

import pytest
from django.test import override_settings
from endoreg_db.utils.file_operations import atomic_create_file

from lx_annotate.hub.hub_export_worker import resolve_hub_transport_config


@override_settings(
    LX_ANNOTATE_HUB_EXPORT_REQUIRE_MTLS=True,
    LX_ANNOTATE_HUB_EXPORT_CLIENT_CERT_FILE="",
    LX_ANNOTATE_HUB_EXPORT_CLIENT_KEY_FILE="",
    LX_ANNOTATE_HUB_EXPORT_CA_FILE="",
)
def test_transport_resolution_fails_closed_without_required_mtls_identity() -> None:
    # Arrange
    expected = "requires mTLS client certificate and key files"

    # Act
    with pytest.raises(ValueError) as exc_info:
        resolve_hub_transport_config()

    # Assert
    assert expected in str(exc_info.value)


def test_transport_resolution_uses_readable_identity_files(tmp_path: Path) -> None:
    # Arrange
    cert = tmp_path / "client.crt"
    key = tmp_path / "client.key"
    ca = tmp_path / "ca.crt"
    for path in (cert, key, ca):
        atomic_create_file(
            destination=path,
            content=[b"test-only"],
            required_bytes=9,
            file_mode=0o600,
            dir_mode=0o700,
        )

    # Act
    with override_settings(
        LX_ANNOTATE_HUB_EXPORT_REQUIRE_MTLS=True,
        LX_ANNOTATE_HUB_EXPORT_CLIENT_CERT_FILE=str(cert),
        LX_ANNOTATE_HUB_EXPORT_CLIENT_KEY_FILE=str(key),
        LX_ANNOTATE_HUB_EXPORT_CA_FILE=str(ca),
    ):
        config = resolve_hub_transport_config()

    # Assert
    assert config.cert == (str(cert), str(key))
    assert config.verify == str(ca)
    assert config.request_kwargs()["allow_redirects"] is False


@override_settings(
    LX_ANNOTATE_HUB_EXPORT_REQUIRE_MTLS=False,
    LX_ANNOTATE_HUB_EXPORT_CLIENT_CERT_FILE="configured-without-key",
    LX_ANNOTATE_HUB_EXPORT_CLIENT_KEY_FILE="",
    LX_ANNOTATE_HUB_EXPORT_CA_FILE="",
)
def test_transport_resolution_rejects_partial_optional_identity() -> None:
    # Arrange
    expected = "must not be partially configured"

    # Act
    with pytest.raises(ValueError) as exc_info:
        resolve_hub_transport_config()

    # Assert
    assert expected in str(exc_info.value)
