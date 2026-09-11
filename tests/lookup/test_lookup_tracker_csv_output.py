from __future__ import annotations

import csv
import json
from contextlib import contextmanager
from types import SimpleNamespace

import pytest
from django.conf import settings
from django.http import HttpResponse
from lx_dtypes.django.api.lookup_tracker import register_runtime_lookup_tracker

import lx_annotate.middleware.lookup_tracker as lookup_tracker_module
from lx_annotate.middleware.lookup_tracker import (
    KnowledgeBaseLookupTrackerLoggingMiddleware,
    append_summary_to_study_csv,
)


@pytest.fixture(autouse=True)
def use_default_lookup_tracker_directory(monkeypatch):
    monkeypatch.setattr(settings, "KNOWLEDGE_BASE_LOOKUP_TRACKER_DIR", None)


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


def test_lookup_tracker_csv_uses_configured_directory(tmp_path, monkeypatch):
    configured_dir = tmp_path / "isolated-lookup-tracker"
    monkeypatch.setattr(
        settings,
        "KNOWLEDGE_BASE_LOOKUP_TRACKER_DIR",
        configured_dir,
    )

    append_summary_to_study_csv(
        {"total_lookup_count": 1},
        SimpleNamespace(path="/test", method="GET"),
        module_name="demo_module",
    )

    assert (configured_dir / "knowledge_base_lookup_tracker.csv").exists()
    assert (configured_dir / ".knowledge_base_lookup_tracker.csv.lock").exists()


def test_lookup_tracker_csv_uses_typed_directory_wrapper(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "BASE_DIR", tmp_path)
    ensured_paths = []
    real_ensure_directory = lookup_tracker_module.ensure_directory

    def record_ensure_directory(path):
        ensured_paths.append(path)
        return real_ensure_directory(path)

    monkeypatch.setattr(
        lookup_tracker_module,
        "ensure_directory",
        record_ensure_directory,
    )

    append_summary_to_study_csv(
        {"total_lookup_count": 1},
        SimpleNamespace(path="/test", method="GET"),
        module_name="demo_module",
    )

    assert ensured_paths == [tmp_path / "study_data"]


def test_lookup_tracker_csv_uses_atomic_write_wrapper(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "BASE_DIR", tmp_path)
    written_paths = []
    real_atomic_write_file = lookup_tracker_module.atomic_write_file

    def record_atomic_write_file(**kwargs):
        written_paths.append(kwargs["destination"])
        return real_atomic_write_file(**kwargs)

    monkeypatch.setattr(
        lookup_tracker_module,
        "atomic_write_file",
        record_atomic_write_file,
    )

    append_summary_to_study_csv(
        {"total_lookup_count": 1},
        SimpleNamespace(path="/test", method="GET"),
        module_name="demo_module",
    )

    assert written_paths == [
        tmp_path / "study_data" / "knowledge_base_lookup_tracker.csv"
    ]


def test_lookup_tracker_csv_uses_advisory_lock(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "BASE_DIR", tmp_path)
    locked_paths = []
    real_advisory_file_lock = lookup_tracker_module.advisory_file_lock

    @contextmanager
    def record_advisory_file_lock(**kwargs):
        locked_paths.append(kwargs["lock_path"])
        with real_advisory_file_lock(**kwargs):
            yield

    monkeypatch.setattr(
        lookup_tracker_module,
        "advisory_file_lock",
        record_advisory_file_lock,
    )

    append_summary_to_study_csv(
        {"total_lookup_count": 1},
        SimpleNamespace(path="/test", method="GET"),
        module_name="demo_module",
    )

    assert locked_paths == [
        tmp_path / "study_data" / ".knowledge_base_lookup_tracker.csv.lock"
    ]


def test_lookup_tracker_csv_appends_one_header_and_multiple_rows(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "BASE_DIR", tmp_path)
    request = SimpleNamespace(path="/test", method="GET")

    append_summary_to_study_csv(
        {"total_lookup_count": 1},
        request,
        module_name="first_module",
    )
    append_summary_to_study_csv(
        {"total_lookup_count": 2},
        request,
        module_name="second_module",
    )

    csv_path = tmp_path / "study_data" / "knowledge_base_lookup_tracker.csv"
    with csv_path.open("r", encoding="utf-8", newline="") as csv_file:
        rows = list(csv.DictReader(csv_file))

    assert [row["module"] for row in rows] == ["first_module", "second_module"]
    assert [row["total_lookup_count"] for row in rows] == ["1", "2"]


def test_lookup_tracker_csv_fails_when_directory_creation_fails(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "BASE_DIR", tmp_path)

    def fail_ensure_directory(path):
        raise PermissionError(f"cannot create {path}")

    monkeypatch.setattr(
        lookup_tracker_module,
        "ensure_directory",
        fail_ensure_directory,
    )

    with pytest.raises(PermissionError, match="cannot create"):
        append_summary_to_study_csv(
            {"total_lookup_count": 1},
            SimpleNamespace(path="/test", method="GET"),
            module_name="demo_module",
        )

    assert not (tmp_path / "study_data").exists()


def test_lookup_tracker_csv_preserves_existing_file_when_atomic_write_fails(
    tmp_path, monkeypatch
):
    monkeypatch.setattr(settings, "BASE_DIR", tmp_path)
    request = SimpleNamespace(path="/test", method="GET")
    append_summary_to_study_csv(
        {"total_lookup_count": 1},
        request,
        module_name="existing_module",
    )
    csv_path = tmp_path / "study_data" / "knowledge_base_lookup_tracker.csv"
    original_content = csv_path.read_bytes()

    def fail_atomic_write_file(**kwargs):
        raise OSError(f"cannot replace {kwargs['destination']}")

    monkeypatch.setattr(
        lookup_tracker_module,
        "atomic_write_file",
        fail_atomic_write_file,
    )

    with pytest.raises(OSError, match="cannot replace"):
        append_summary_to_study_csv(
            {"total_lookup_count": 2},
            request,
            module_name="new_module",
        )

    assert csv_path.read_bytes() == original_content


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


# pyright: reportArgumentType=false
