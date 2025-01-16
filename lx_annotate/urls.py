from django.urls import path
from .views import ProcessFileView
from rest_framework.authtoken.views import obtain_auth_token
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('process-file/', ProcessFileView.as_view(), name='process_file'),
    path('api/token/', obtain_auth_token, name='api_token_auth'),
    path('validation/', Validate.as_view(), name='validation'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)