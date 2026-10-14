from __future__ import annotations

from lx_annotate.settings.oidc import oidc_scopes_with_center_groups


def test_oidc_scopes_request_keycloak_center_groups() -> None:
    assert (
        oidc_scopes_with_center_groups("openid email profile")
        == "openid email profile groups"
    )


def test_oidc_scopes_preserve_custom_scopes_without_duplicates() -> None:
    assert (
        oidc_scopes_with_center_groups("openid groups custom email")
        == "openid groups custom email profile"
    )
