from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path, re_path
from django.views.generic import RedirectView, TemplateView
from lx_dtypes.django.api.main import api as lx_dtypes_api
from lx_annotate.views.hub_export import (
    hub_export_mark,
    hub_export_overview,
    hub_export_unmark,
)

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/hub-export/overview/", hub_export_overview, name="hub-export-overview"),
    path("api/hub-export/mark/", hub_export_mark, name="hub-export-mark"),
    path("api/hub-export/unmark/", hub_export_unmark, name="hub-export-unmark"),
    path("api/", include(("endoreg_db.urls", "endoreg_db"), namespace="endoreg_db")),
    path("oidc/", include("mozilla_django_oidc.urls")),
    path(
        "favicon.ico",
        RedirectView.as_view(
            url=f"{settings.STATIC_URL}img/favicon.png", permanent=False
        ),
        name="favicon",
    ),
]

urlpatterns.append(path("base_api/", lx_dtypes_api.urls))

# Catch-all Vue SPA
urlpatterns.append(
    re_path(
        r"^(?!api/|base_api/|admin/|media/|oidc/).*$",
        TemplateView.as_view(template_name="base.html"),
        name="vue_spa",
    )
)

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
