from django.urls import include, path

from lx_annotate.views.hub_export import (
    hub_export_mark,
    hub_export_overview,
    hub_export_unmark,
)
from lx_annotate.views.quarantine import quarantine_overview


urlpatterns = [
    path("hub-export/overview/", hub_export_overview, name="hub-export-overview"),
    path("hub-export/mark/", hub_export_mark, name="hub-export-mark"),
    path("hub-export/unmark/", hub_export_unmark, name="hub-export-unmark"),
    path(
        "runtime/quarantine/",
        quarantine_overview,
        name="runtime-quarantine-overview",
    ),
    path("", include(("endoreg_db.urls", "endoreg_db"), namespace="api")),
]
