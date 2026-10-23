from __future__ import annotations

import os
from collections.abc import Mapping
from typing import cast

from celery import Celery
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured

os.environ.setdefault(
    "DJANGO_SETTINGS_MODULE",
    "lx_annotate.settings.settings_prod",
)

# Project policy: the current longest late-ack task has a 24-hour hard limit.
_MIN_VISIBILITY_TIMEOUT = 25 * 60 * 60
_MISSING = object()


def _visibility_timeout() -> int:
    """Validate the typed Django setting; environment parsing belongs in settings."""
    configured: object = getattr(
        settings, "CELERY_VISIBILITY_TIMEOUT", _MIN_VISIBILITY_TIMEOUT
    )
    if not isinstance(configured, int) or isinstance(configured, bool):
        raise ImproperlyConfigured(
            "CELERY_VISIBILITY_TIMEOUT must be an integer number of seconds."
        )
    if configured < _MIN_VISIBILITY_TIMEOUT:
        raise ImproperlyConfigured(
            "CELERY_VISIBILITY_TIMEOUT must be at least 90000 seconds."
        )
    return configured


def _visibility_transport_options(
    setting_name: str, visibility_timeout: int
) -> dict[str, object]:
    """Default an absent mapping; reject explicitly incomplete or conflicting ones."""
    configured: object = getattr(settings, setting_name, _MISSING)
    if configured is _MISSING:
        return {"visibility_timeout": visibility_timeout}
    if not isinstance(configured, Mapping):
        raise ImproperlyConfigured(f"{setting_name} must be a mapping.")

    options: dict[str, object] = {}
    for key, value in cast(Mapping[object, object], configured).items():
        if not isinstance(key, str):
            raise ImproperlyConfigured(
                f"{setting_name} must be a mapping with string keys."
            )
        options[key] = value

    configured_timeout = options.get("visibility_timeout")
    if (
        not isinstance(configured_timeout, int)
        or isinstance(configured_timeout, bool)
        or configured_timeout != visibility_timeout
    ):
        raise ImproperlyConfigured(
            f"{setting_name} visibility_timeout must equal CELERY_VISIBILITY_TIMEOUT "
            "and be an integer number of seconds."
        )
    return options


app = Celery("lx_annotate")
app.config_from_object("django.conf:settings", namespace="CELERY", force=True)

# Validate eagerly, including entry points using settings.configure().
visibility_timeout = _visibility_timeout()
broker_transport_options = _visibility_transport_options(
    "CELERY_BROKER_TRANSPORT_OPTIONS", visibility_timeout
)
result_backend_transport_options = _visibility_transport_options(
    "CELERY_RESULT_BACKEND_TRANSPORT_OPTIONS", visibility_timeout
)

# Namespaced keys take precedence over the original Django settings and keep
# the validated mapping copies effective on the application.
app.conf.update(
    CELERY_VISIBILITY_TIMEOUT=visibility_timeout,
    CELERY_BROKER_TRANSPORT_OPTIONS=broker_transport_options,
    CELERY_RESULT_BACKEND_TRANSPORT_OPTIONS=result_backend_transport_options,
)
app.autodiscover_tasks()
