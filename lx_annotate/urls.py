from django.urls import path, include, re_path
from django.views.generic import TemplateView 
from rest_framework.authtoken.views import obtain_auth_token
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path
from lx_annotate.views import ProxyView

urlpatterns = [
    # API endpoints for authentication etc.
    path('api/token/', obtain_auth_token, name='api_token_auth'),
    # Your main application (this will render base.html where the Vue app lives)
    path('', TemplateView.as_view(template_name='base.html'), name='app'),
    path('admin/', admin.site.urls),
    # Proxy all other requests to the backend API
    # TODO: Switch out for NGINX reverse proxy in production
    path('api/', ProxyView.as_view()),
    re_path(r'^(?!api/|admin/).*$', TemplateView.as_view(template_name='base.html'), name='vue_spa'),
]  + static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
