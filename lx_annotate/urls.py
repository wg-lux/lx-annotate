import logging
import sys
from pathlib import Path

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path, re_path
from django.views.generic import RedirectView, TemplateView

logger = logging.getLogger(__name__)

# Make lx-data-models submodule importable when present.
submodule_root = Path(settings.BASE_DIR) / "lx-data-models"
if submodule_root.exists():
    submodule_path = str(submodule_root)
    if submodule_path not in sys.path:
        sys.path.insert(0, submodule_path)

lx_dtypes_api_urls = None
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
