from __future__ import annotations

import os
from pathlib import Path

from django.conf import settings
from django.core.checks import Critical, Warning, register

from endoreg_db.services.environment_readiness import check_environment_readiness


@register()
def lx_annotate_environment_checks(app_configs, **kwargs):  # type: ignore[unused-argument]
    messages = []

    for issue in check_environment_readiness():
        check_cls = Critical if issue.severity == "critical" else Warning
        messages.append(
            check_cls(
                issue.message,
                id=f"lx_annotate.{issue.code}",
                obj=issue.path,
            )
        )

    protected_url = str(os.environ.get("NGINX_PROTECTED_MEDIA_URL", "") or "").strip()
    if not protected_url:
        messages.append(
            Critical(
                "NGINX_PROTECTED_MEDIA_URL must be set for protected media handoff.",
                id="lx_annotate.nginx_protected_media_url_missing",
            )
        )
    elif not protected_url.startswith("/"):
        messages.append(
            Critical(
                "NGINX_PROTECTED_MEDIA_URL must start with '/'.",
                id="lx_annotate.nginx_protected_media_url_invalid",
                obj=protected_url,
            )
        )

    protected_root = str(os.environ.get("PROTECTED_MEDIA_ROOT", "") or "").strip()
    if not protected_root:
        messages.append(
            Critical(
                "PROTECTED_MEDIA_ROOT must be set for Nginx protected media routing.",
                id="lx_annotate.protected_media_root_missing",
            )
        )
    else:
        protected_root_path = Path(protected_root).expanduser().resolve()
        expected_media_root = Path(settings.MEDIA_ROOT).expanduser().resolve()
        if not protected_root_path.exists():
            messages.append(
                Critical(
                    f"PROTECTED_MEDIA_ROOT does not exist: {protected_root_path}",
                    id="lx_annotate.protected_media_root_not_found",
                    obj=str(protected_root_path),
                )
            )
        elif protected_root_path != expected_media_root:
            messages.append(
                Warning(
                    "PROTECTED_MEDIA_ROOT does not match Django MEDIA_ROOT. "
                    "Verify Nginx alias and X-Accel-Redirect expectations.",
                    id="lx_annotate.protected_media_root_mismatch",
                    obj=f"{protected_root_path} != {expected_media_root}",
                )
            )

    return messages
