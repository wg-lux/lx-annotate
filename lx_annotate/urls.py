from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path, re_path
from django.urls.resolvers import RoutePattern, URLResolver
from django.views.generic import RedirectView, TemplateView


def lazy_urlconf(
    route: str,
    urlconf_module: str,
    *,
    app_name: str | None = None,
    namespace: str | None = None,
) -> URLResolver:
    return URLResolver(
        RoutePattern(route, is_endpoint=False),
        urlconf_module,
        app_name=app_name,
        namespace=namespace,
    )


urlpatterns = [
    path("admin/", admin.site.urls),
    lazy_urlconf("api/", "lx_annotate.api_urls"),
    path("oidc/", include("mozilla_django_oidc.urls")),
    path(
        "favicon.ico",
        RedirectView.as_view(
            url=f"{settings.STATIC_URL}img/favicon.png", permanent=False
        ),
        name="favicon",
    ),
]

urlpatterns.append(
    lazy_urlconf(
        "base_api/",
        "lx_annotate.base_api_urls",
        app_name="ninja",
        namespace="lx_dtypes_base_api",
    )
)

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
