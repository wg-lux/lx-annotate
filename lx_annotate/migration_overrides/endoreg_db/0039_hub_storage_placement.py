from __future__ import annotations

from importlib import import_module

_Upstream = import_module("endoreg_db.migrations.0060_hub_storage_placement").Migration


class Migration(_Upstream):
    dependencies = [
        (app, "0038_videohlsartifact_encoding_profile_name_and_more")
        if app == "endoreg_db"
        else (app, name)
        for app, name in _Upstream.dependencies
    ]
