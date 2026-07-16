"""ASGI config for lx-annotate."""

import os

from django.core.asgi import get_asgi_application


os.environ.setdefault("DJANGO_SETTINGS_MODULE", "lx_annotate.settings.settings_prod")

application = get_asgi_application()
