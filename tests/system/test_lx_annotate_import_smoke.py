from __future__ import annotations

import importlib

import pytest


LX_ANNOTATE_IMPORT_SMOKE_MODULES = (
    "lx_annotate",
    "lx_annotate.api_urls",
    "lx_annotate.apps",
    "lx_annotate.checks",
    "lx_annotate.cli",
    "lx_annotate.models",
    "lx_annotate.serializers",
    "lx_annotate.signals",
    "lx_annotate.tasks",
    "lx_annotate.urls",
    "lx_annotate.hub.hub_export_audit",
    "lx_annotate.hub.hub_export_cleanup",
    "lx_annotate.hub.hub_export_jobs",
    "lx_annotate.hub.hub_export_payloads",
    "lx_annotate.hub.hub_export_reconciliation",
    "lx_annotate.hub.hub_export_state",
    "lx_annotate.hub.hub_export_worker",
    "lx_annotate.views.ai_dataset_settings",
    "lx_annotate.views.hub_export",
    "lx_annotate.views.quarantine",
)


@pytest.mark.parametrize("module_name", LX_ANNOTATE_IMPORT_SMOKE_MODULES)
def test_lx_annotate_runtime_module_imports(module_name: str) -> None:
    module = importlib.import_module(module_name)

    assert module.__name__ == module_name
