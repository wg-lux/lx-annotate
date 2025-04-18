from django.urls import path, include, re_path
from django.views.generic import TemplateView
from rest_framework.authtoken.views import obtain_auth_token
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from lx_annotate.views import ProxyView
from .views import keycloak_login, keycloak_callback, VideoView

urlpatterns = [
    # API endpoints for authentication etc.
    path('login/', keycloak_login, name='keycloak_login'),
    path('login/callback/', keycloak_callback, name='keycloak_callback'),
    path('admin/', admin.site.urls),
    path('api/<path:endpoint>', ProxyView.as_view()),  # Proxy API requests
    path('api/videos/', VideoView.as_view(), name='video_list'),
    # Catch-all for Vue.js SPA (only for non-API and non-admin routes)
    re_path(r'^(?!api/|admin/).*$', TemplateView.as_view(template_name='base.html'), name='vue_spa'),
] + static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
