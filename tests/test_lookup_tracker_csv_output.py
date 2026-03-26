from __future__ import annotations

import csv
import json
from types import SimpleNamespace

from django.conf import settings
from django.http import HttpResponse

from lx_annotate.middleware.lookup_tracker import (
    KnowledgeBaseLookupTrackerLoggingMiddleware,
    append_summary_to_study_csv,
)
from lx_dtypes.django.api.lookup_tracker import register_runtime_lookup_tracker


def test_lookup_tracker_csv_output(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "BASE_DIR", tmp_path)

    summary = {
        "total_lookup_count": 3,
        "edge_counts": [
            {"source": "kb", "target": "classification", "lookup_count": 2}
        ],
        "key_counts": [
            {
                "source": "kb",
                "target": "classification",
                "key": "example",
                "found": True,
                "lookup_count": 1,
            }
        ],
    }
    request = SimpleNamespace(path="/test", method="GET")

    append_summary_to_study_csv(summary, request, module_name="demo_module")

    csv_path = tmp_path / "study_data" / "knowledge_base_lookup_tracker.csv"
    assert csv_path.exists()

    with csv_path.open("r", encoding="utf-8", newline="") as csv_file:
        reader = csv.DictReader(csv_file)
        rows = list(reader)

    assert len(rows) == 1
    row = rows[0]
    assert row["module"] == "demo_module"
    assert row["path"] == "/test"
    assert row["method"] == "GET"
    assert row["total_lookup_count"] == "3"
    detail = json.loads(row["summary_json"])
    assert detail["edge_counts"][0]["target"] == "classification"


class DummyKnowledgeBase:
    def __init__(self) -> None:
        self.config = SimpleNamespace(name="dummy_module")
        self.reset_called = False

    def get_lookup_tracker_summary(self) -> dict[str, object]:
        return {
            "total_lookup_count": 1,
            "edge_counts": [
                {"source": "kb", "target": "classification", "lookup_count": 1}
            ],
            "key_counts": [],
        }

    def reset_lookup_tracker(self) -> None:
        self.reset_called = True


def test_lookup_tracker_middleware_tracks_request(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "BASE_DIR", tmp_path)

    dummy_kb = DummyKnowledgeBase()
    register_runtime_lookup_tracker(dummy_kb)

    middleware = KnowledgeBaseLookupTrackerLoggingMiddleware(lambda r: HttpResponse())
    request = SimpleNamespace(path="/demo", method="POST")
    middleware.process_response(request, HttpResponse())

    csv_path = tmp_path / "study_data" / "knowledge_base_lookup_tracker.csv"
    assert csv_path.exists()
    assert dummy_kb.reset_called
