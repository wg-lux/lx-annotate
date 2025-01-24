from django.urls import path
from django.views.generic import TemplateView 
#from .views import ProcessFileView
from rest_framework.authtoken.views import obtain_auth_token
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin

urlpatterns = [
    #path('process-file/', ProcessFileView.as_view(), name='process_file'),
    path('api/token/', obtain_auth_token, name='api_token_auth'),
    path('', TemplateView.as_view(template_name='base.html'), name='app'),
    path('admin/', admin.site.urls),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)