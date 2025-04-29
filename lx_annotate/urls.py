from django.urls import path, include, re_path
from django.views.generic import TemplateView
from rest_framework.authtoken.views import obtain_auth_token
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from lx_annotate.views import ProxyView

urlpatterns = [
    # API endpoints for authentication etc.
    path('admin/', admin.site.urls),
    #path('api/<path:endpoint>', ProxyView.as_view()),  # Proxy API requests
    # Catch-all for Vue.js SPA (only for non-API and non-admin routes)

    # Mount all endoreg-db endpoints under "/endo-reg/"
    path('/', include('endoreg_db.urls')),
    re_path(r'^(?!api/|admin/).*$', TemplateView.as_view(template_name='base.html'), name='vue_spa'),
] + static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
