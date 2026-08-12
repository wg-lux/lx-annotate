from __future__ import annotations

from importlib import import_module

_Upstream = import_module(
    "endoreg_db.migrations.0066_storage_placement_media_lease_subject",
).Migration


class Migration(_Upstream):
    dependencies = [
        (app, "0044_storage_transfer_commit_and_rekey")
        if app == "endoreg_db"
        else (app, name)
        for app, name in _Upstream.dependencies
    ]
