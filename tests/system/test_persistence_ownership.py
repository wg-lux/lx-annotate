"""The host imports persistence; it does not register a second implementation."""

from __future__ import annotations

import pytest
from django.apps import apps
from endoreg_db.schemas.ai_dataset_splits import SplitSnapshot

import lx_annotate.models as compatibility
from lx_annotate.schemas.ai_dataset_splits import SplitSnapshot as LegacySplitSnapshot


@pytest.mark.parametrize("name", compatibility.__all__)
def test_old_import_is_the_canonical_registered_model(name):
    model = getattr(compatibility, name)
    assert model is apps.get_model("endoreg_db", name)
    assert model._meta.app_label == "endoreg_db"


def test_application_registers_no_persistence_models():
    assert list(apps.get_app_config("lx_annotate").get_models()) == []
    assert LegacySplitSnapshot is SplitSnapshot


@pytest.mark.parametrize("kind", ["video", "report"])
def test_retry_rejects_absent_media_relations(kind):
    from endoreg_db.models.hub.network_node import NetworkNode

    from lx_annotate.hub.hub_export_jobs import _validate_failed_job_for_operator_retry

    job = compatibility.OutboundHubTransferJob(
        resource_kind=kind,
        local_status="failed",
        target_node=NetworkNode(role="central_hub"),
    )
    with pytest.raises(ValueError, match="no longer"):
        _validate_failed_job_for_operator_retry(
            job, source_node=NetworkNode(role="site_node")
        )
