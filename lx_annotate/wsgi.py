"""
WSGI config for agl_anonymizer project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/4.2/howto/deployment/wsgi/
"""
print("WSGI config started")
# /home/agl-admin/agl_anonymizer/agl_anonymizer/wsgi.py
import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'agl_anonymizer.settings')

application = get_wsgi_application()
