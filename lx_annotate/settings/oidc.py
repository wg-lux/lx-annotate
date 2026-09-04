from __future__ import annotations

REQUIRED_OIDC_SCOPES = ("openid", "email", "profile", "groups")


def oidc_scopes_with_center_groups(configured_scopes: str) -> str:
    """Return configured OIDC scopes plus claims required for center access."""
    scopes = configured_scopes.split()
    for required_scope in REQUIRED_OIDC_SCOPES:
        if required_scope not in scopes:
            scopes.append(required_scope)
    return " ".join(scopes)
