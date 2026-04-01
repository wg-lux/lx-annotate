import logging
import os
import tomllib
from importlib import import_module, metadata
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


def _read_installed_distribution_version(distribution_name: str) -> str | None:
    try:
        return metadata.version(distribution_name)
    except metadata.PackageNotFoundError:
        return None
    except Exception:
        logger.exception("Failed reading installed version for %s", distribution_name)
        return None


def _has_required_base_api_contracts() -> bool:
    try:
        contracts_module = import_module("lx_dtypes.models.contracts")
    except Exception:
        logger.warning(
            "Skipping lx_dtypes base_api mount: contracts module is not importable",
        )
        return False

    missing_exports = [
        export
        for export in REQUIRED_BASE_API_CONTRACT_EXPORTS
        if not hasattr(contracts_module, export)
    ]
    if missing_exports:
        logger.warning(
            "Skipping lx_dtypes base_api mount: installed contracts are missing required exports: %s",
            ", ".join(missing_exports),
        )
        return False
    return True


def _resolve_lx_data_models_root() -> Path:
    configured_root = os.getenv("LX_DATA_MODELS_ROOT", "").strip()
    if configured_root:
        return Path(configured_root).expanduser().resolve()
    return Path(settings.BASE_DIR) / "lx-data-models"


lx_dtypes_api_urls = None
expected_base_api_version = os.getenv(
    "LX_BASE_API_EXPECTED_VERSION", DEFAULT_BASE_API_EXPECTED_VERSION
)
installed_lx_dtypes_version = _read_installed_distribution_version("lx-dtypes")

if installed_lx_dtypes_version is None:
    logger.warning(
        "Skipping lx_dtypes base_api mount: installed lx-dtypes distribution is unavailable"
    )
elif installed_lx_dtypes_version != expected_base_api_version:
    logger.warning(
        "Skipping lx_dtypes base_api mount: expected lx-dtypes version %s, found %s",
        expected_base_api_version,
        installed_lx_dtypes_version,
    )
elif not _has_required_base_api_contracts():
    pass
else:
    try:
        from lx_dtypes.django.api.main import api as _lx_dtypes_api

        # Cache the resolved URL tuple once; NinjaAPI.urls is not idempotent.
        lx_dtypes_api_urls = _lx_dtypes_api.urls
    except Exception as exc:  # pragma: no cover - optional integration
        logger.warning("lx_dtypes base_api is not available: %s", exc)

urlpatterns = [
    path("admin/", admin.site.urls),
    # Mount lx_dtypes Ninja API when the installed package contract matches.
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
