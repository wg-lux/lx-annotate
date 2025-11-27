from django.contrib import admin
from django.urls import path, include, re_path
from django.views.generic import TemplateView
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path("admin/", admin.site.urls),

    # Include endoreg_db URLs WITH 'api/' prefix
    # This prevents endoreg_db routes from overriding the Vue SPA fallback
    path("api/", include(("endoreg_db.urls", "endoreg_db"), namespace="endoreg_db")),

    # ✅ ADD THIS: OIDC endpoints provided by mozilla-django-oidc
    path("oidc/", include("mozilla_django_oidc.urls")),
    
    # Vue SPA fallback – MUST be LAST to catch all non-API routes
    re_path(r"^(?!api/|admin/|media/|oidc/).*$", TemplateView.as_view(template_name="base.html"),
            name="vue_spa"),
] + static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)