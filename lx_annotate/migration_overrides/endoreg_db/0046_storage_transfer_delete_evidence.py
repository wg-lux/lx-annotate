from __future__ import annotations

from importlib import import_module

_Upstream = import_module(
    "endoreg_db.migrations.0067_storage_transfer_delete_evidence",
).Migration


class Migration(_Upstream):
    dependencies = [
        (app, "0045_storage_placement_media_lease_subject")
        if app == "endoreg_db"
        else (app, name)
        for app, name in _Upstream.dependencies
    ]
