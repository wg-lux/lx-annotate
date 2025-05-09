from django.contrib import admin
from django.urls import path, include, re_path
from django.views.generic import TemplateView
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path("admin/", admin.site.urls),

    path(
        "api/",
        include(("endoreg_db.urls", "endoreg_db"), namespace="endoreg_db"),
    ),
    # Vue SPA fallback – keep AFTER real routes
    re_path(r"^(?!api/|admin/).*$", TemplateView.as_view(template_name="base.html"),
            name="vue_spa"),
] + static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
