from __future__ import annotations

import os

from celery import Celery

os.environ.setdefault(
    "DJANGO_SETTINGS_MODULE",
    os.environ.get("DJANGO_SETTINGS_MODULE", "lx_annotate.settings.settings_prod"),
)

app = Celery("lx_annotate")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()
