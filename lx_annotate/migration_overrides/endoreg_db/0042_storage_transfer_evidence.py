from __future__ import annotations

from importlib import import_module

_Upstream = import_module(
    "endoreg_db.migrations.0063_storage_transfer_evidence",
).Migration


class Migration(_Upstream):
    dependencies = [
        (app, "0041_storage_balance_work_item") if app == "endoreg_db" else (app, name)
        for app, name in _Upstream.dependencies
    ]
