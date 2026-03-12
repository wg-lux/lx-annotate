import logging
import os
import sys
import tomllib
from pathlib import Path

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path, re_path
from django.views.generic import RedirectView, TemplateView

logger = logging.getLogger(__name__)

DEFAULT_BASE_API_EXPECTED_VERSION = "0.1.1"
REQUIRED_BASE_API_CONTRACT_EXPORTS = (
    "PdfRedactionRequest",
    "PdfRedactionResponse",
    "CaseResolutionRequest",
    "CaseResolutionResponse",
    "RequirementEvaluationRequest",
    "RequirementEvaluationResponse",
    "DocumentType",
    "ReportContext",
)


def _read_project_version(pyproject_path: Path) -> str | None:
    if not pyproject_path.exists():
        return None
    try:
        with pyproject_path.open("rb") as pyproject_file:
            project = tomllib.load(pyproject_file).get("project", {})
    except Exception:
        logger.exception("Failed reading version from %s", pyproject_path)
        return None
    version = project.get("version")
    return str(version) if version else None


def _has_required_base_api_contracts(submodule_root: Path) -> bool:
    contracts_init = (
        submodule_root / "lx_dtypes" / "models" / "contracts" / "__init__.py"
    )
    if not contracts_init.exists():
        logger.warning(
            "Skipping lx_dtypes base_api mount: contracts file missing at %s",
            contracts_init,
        )
        return False
    try:
        exports_text = contracts_init.read_text(encoding="utf-8")
    except Exception:
        logger.exception("Failed reading contracts exports from %s", contracts_init)
        return False

    missing_exports = [
        export
        for export in REQUIRED_BASE_API_CONTRACT_EXPORTS
        if export not in exports_text
    ]
    if missing_exports:
        logger.warning(
            "Skipping lx_dtypes base_api mount: submodule contracts are missing required exports: %s",
            ", ".join(missing_exports),
        )
        return False
    return True


lx_dtypes_api_urls = None
enable_base_api = os.getenv("LX_ENABLE_BASE_API", "0") == "1"
if enable_base_api:
    # Only override import resolution when the optional base API was explicitly enabled.
    submodule_root = Path(settings.BASE_DIR) / "lx-data-models"
    expected_base_api_version = os.getenv(
        "LX_BASE_API_EXPECTED_VERSION", DEFAULT_BASE_API_EXPECTED_VERSION
    )
    submodule_version = _read_project_version(submodule_root / "pyproject.toml")

    if not submodule_root.exists():
        logger.warning(
            "LX_ENABLE_BASE_API=1 but lx-data-models checkout is missing at %s",
            submodule_root,
        )
    elif submodule_version != expected_base_api_version:
        logger.warning(
            "Skipping lx_dtypes base_api mount: expected lx-data-models version %s, found %s",
            expected_base_api_version,
            submodule_version or "<unknown>",
        )
    elif not _has_required_base_api_contracts(submodule_root):
        pass
    else:
        submodule_path = str(submodule_root)
        if submodule_path not in sys.path:
            sys.path.insert(0, submodule_path)

        try:
            from lx_dtypes.django.api.main import api as _lx_dtypes_api

            # Cache the resolved URL tuple once; NinjaAPI.urls is not idempotent.
            lx_dtypes_api_urls = _lx_dtypes_api.urls
        except Exception as exc:  # pragma: no cover - optional integration
            logger.warning("lx_dtypes base_api is not available: %s", exc)

urlpatterns = [
    path("admin/", admin.site.urls),
    # Mount lx-data-models Ninja API when lx-data-models submodule is available.
    *(
        [path("base_api/", lx_dtypes_api_urls)]
        if lx_dtypes_api_urls is not None
        else []
    ),
    # Include endoreg_db URLs WITH 'api/' prefix
    # This prevents endoreg_db routes from overriding the Vue SPA fallback
    path("api/", include(("endoreg_db.urls", "endoreg_db"), namespace="endoreg_db")),
    # ✅ ADD THIS: OIDC endpoints provided by mozilla-django-oidc
    path("oidc/", include("mozilla_django_oidc.urls")),
    path(
        "favicon.ico",
        RedirectView.as_view(
            url=f"{settings.STATIC_URL}img/favicon.png",
            permanent=False,
        ),
        name="favicon",
    ),
    # Vue SPA fallback – MUST be LAST to catch all non-API routes
    re_path(
        r"^(?!api/|base_api/|admin/|media/|oidc/).*$",
        TemplateView.as_view(template_name="base.html"),
        name="vue_spa",
    ),
] + static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
