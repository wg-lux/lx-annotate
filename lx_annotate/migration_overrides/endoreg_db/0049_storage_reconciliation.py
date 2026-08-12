from __future__ import annotations

from importlib import import_module

_Upstream = import_module("endoreg_db.migrations.0070_storage_reconciliation").Migration


class Migration(_Upstream):
    dependencies = [
        (app, "0048_storage_balance_cancellation_receipt")
        if app == "endoreg_db"
        else (app, name)
        for app, name in _Upstream.dependencies
    ]
