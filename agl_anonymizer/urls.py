from django.urls import path
from .views import ProcessFileView
from rest_framework.authtoken.views import obtain_auth_token


urlpatterns = [
    path('process-file/', ProcessFileView.as_view(), name='process_file'),
    path('api/token/', obtain_auth_token, name='api_token_auth'),
]

