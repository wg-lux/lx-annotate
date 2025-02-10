from django.urls import path, include
from django.views.generic import TemplateView 
from rest_framework.authtoken.views import obtain_auth_token
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path
from .views import ProxyView

urlpatterns = [
    # API endpoints for authentication etc.
    path('api/token/', obtain_auth_token, name='api_token_auth'),
    # Your main application (this will render base.html where your Vue app lives)
    path('', TemplateView.as_view(template_name='base.html'), name='app'),
    path('admin/', admin.site.urls),
    path('api/<str:endpoint>/', ProxyView.as_view(), name='proxy_view'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
