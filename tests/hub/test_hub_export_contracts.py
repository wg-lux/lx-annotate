from __future__ import annotations

import pytest
from pydantic import ValidationError

from lx_annotate.hub.hub_export_contracts import (
    HubCenterSyncState,
    HubFileSyncSummary,
)


def test_file_sync_summary_rejects_inconsistent_processed_file_count() -> None:
    center = HubCenterSyncState(
        center_key="center-a",
        display_name="Center A",
        active_node_keys=[],
        processed_files=[],
        candidate_count=0,
        rejection_count=0,
        duplicate_count=0,
    )

    with pytest.raises(ValidationError, match="processed_file_count"):
        HubFileSyncSummary(
            centers=[center],
            rejections=[],
            duplicates=[],
            processed_file_count=1,
            candidate_count=0,
        )


def test_file_sync_summary_rejects_duplicate_center_keys() -> None:
    center_payload = {
        "center_key": "center-a",
        "display_name": "Center A",
        "active_node_keys": [],
        "processed_files": [],
        "candidate_count": 0,
        "rejection_count": 0,
        "duplicate_count": 0,
    }

    with pytest.raises(ValidationError, match="duplicate center_key"):
        HubFileSyncSummary(
            centers=[
                HubCenterSyncState(**center_payload),
                HubCenterSyncState(**center_payload),
            ],
            rejections=[],
            duplicates=[],
            processed_file_count=0,
            candidate_count=0,
        )
