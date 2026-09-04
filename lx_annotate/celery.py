from __future__ import annotations

import os

from celery import Celery
from django.conf import settings

os.environ.setdefault(
    "DJANGO_SETTINGS_MODULE",
    os.environ.get("DJANGO_SETTINGS_MODULE", "lx_annotate.settings.settings_prod"),
)

app = Celery("lx_annotate")
app.config_from_object("django.conf:settings", namespace="CELERY")
# Celery does not register visibility_timeout as a namespaced Django setting,
# so preserve the documented top-level value explicitly on the real app.
visibility_timeout = getattr(
    settings,
    "CELERY_VISIBILITY_TIMEOUT",
    getattr(settings, "CELERY_BROKER_TRANSPORT_OPTIONS", {}).get(
        "visibility_timeout",
        60 * 60 * 25,
    ),
)
app.conf.update(visibility_timeout=visibility_timeout)
app.autodiscover_tasks()
