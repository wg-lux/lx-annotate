"""
ASGI config for lx-annotate project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/4.2/howto/deployment/asgi/
"""

import os

from django.contrib import staticfiles
from django.core.asgi import get_asgi_application
from django.core.wsgi import get_wsgi_application

from asgiref.wsgi import WsgiToAsgi
from whitenoise import WhiteNoise

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'lx_annotate.settings_prod')

staticfiles_dir = os.path.join(os.path.dirname(__file__), 'staticfiles')
wsgi_application = get_wsgi_application()
application = get_asgi_application()
whitenoise_application = WhiteNoise(wsgi_application, root=staticfiles_dir)
wsgi_asgi_application = WsgiToAsgi(wsgi_application)