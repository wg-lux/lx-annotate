from __future__ import annotations

from importlib import import_module

_Upstream = import_module(
    "lx_dtypes.django.migrations.0003_findingdjango_caused_by_interventions",
).Migration


class Migration(_Upstream):
    pass
