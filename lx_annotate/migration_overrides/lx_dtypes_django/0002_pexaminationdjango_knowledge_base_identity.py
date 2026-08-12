from __future__ import annotations

from importlib import import_module

_Upstream = import_module(
    "lx_dtypes.django.migrations.0002_pexaminationdjango_knowledge_base_identity",
).Migration


class Migration(_Upstream):
    pass
