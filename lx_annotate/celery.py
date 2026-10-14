from __future__ import annotations

import os
from typing import cast

from celery import Celery
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured

os.environ.setdefault(
    "DJANGO_SETTINGS_MODULE",
    os.environ.get("DJANGO_SETTINGS_MODULE", "lx_annotate.settings.settings_prod"),
)

app = Celery("lx_annotate")
app.config_from_object("django.conf:settings", namespace="CELERY")
# Celery does not register visibility_timeout as a namespaced Django setting,
# so preserve the documented top-level value explicitly on the real app.
visibility_timeout = int(getattr(settings, "CELERY_VISIBILITY_TIMEOUT", 60 * 60 * 25))
if visibility_timeout < 60 * 60 * 25:
    raise ImproperlyConfigured(
        "CELERY_VISIBILITY_TIMEOUT must be at least 90000 seconds.",
    )
missing_transport_options = object()


def _visibility_transport_options(setting_name: str) -> dict[str, object]:
    configured: object = getattr(settings, setting_name, missing_transport_options)
    if configured is missing_transport_options:
        options: dict[str, object] = {}
    elif isinstance(configured, dict):
        options = cast(dict[str, object], configured.copy())
    else:
        raise ImproperlyConfigured(f"{setting_name} must be a mapping.")

    if (
        configured is not missing_transport_options
        and options.get("visibility_timeout") != visibility_timeout
    ):
        raise ImproperlyConfigured(
            f"{setting_name} visibility_timeout must equal CELERY_VISIBILITY_TIMEOUT.",
        )
    options["visibility_timeout"] = visibility_timeout
    return options


broker_transport_options = _visibility_transport_options(
    "CELERY_BROKER_TRANSPORT_OPTIONS",
)
result_backend_transport_options = _visibility_transport_options(
    "CELERY_RESULT_BACKEND_TRANSPORT_OPTIONS",
)
app.conf.update(
    visibility_timeout=visibility_timeout,
    broker_transport_options=broker_transport_options,
    result_backend_transport_options=result_backend_transport_options,
)
app.autodiscover_tasks()
