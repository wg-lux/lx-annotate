from __future__ import annotations

import sys
from types import ModuleType, SimpleNamespace
from unittest.mock import MagicMock

import pytest

from lx_annotate import file_watcher


def test_ffmpeg_setup_adds_discovered_binary_directory(monkeypatch) -> None:
    monkeypatch.setattr(file_watcher.shutil, "which", lambda _binary: None)
    monkeypatch.setattr(
        file_watcher.glob,
        "glob",
        lambda pattern: (
            ["/nix/store/ffmpeg/bin/ffmpeg"] if pattern.endswith("/ffmpeg") else []
        ),
    )
    monkeypatch.setenv("PATH", "/existing/bin")

    file_watcher._setup_ffmpeg()

    assert file_watcher.os.environ["PATH"] == ("/nix/store/ffmpeg/bin:/existing/bin")


def test_processing_stack_preload_returns_when_already_complete(monkeypatch) -> None:
    monkeypatch.setattr(file_watcher, "processing_stack_preloaded", True)
    current_thread = MagicMock(side_effect=AssertionError("thread lookup not expected"))
    monkeypatch.setattr(file_watcher.threading, "current_thread", current_thread)

    file_watcher._preload_processing_stack()

    current_thread.assert_not_called()


def test_processing_stack_preload_requires_main_thread(monkeypatch) -> None:
    monkeypatch.setattr(file_watcher, "processing_stack_preloaded", False)
    monkeypatch.setattr(file_watcher.threading, "current_thread", lambda: object())
    monkeypatch.setattr(file_watcher.threading, "main_thread", lambda: object())

    with pytest.raises(RuntimeError, match="main thread"):
        file_watcher._preload_processing_stack()


def test_processing_stack_preload_tolerates_missing_optional_dependency(
    monkeypatch,
) -> None:
    monkeypatch.setattr(file_watcher, "processing_stack_preloaded", False)
    monkeypatch.setitem(sys.modules, "lx_anonymizer.frame_cleaner", None)
    warning = MagicMock()
    monkeypatch.setattr(file_watcher.logger, "warning", warning)

    file_watcher._preload_processing_stack()

    assert file_watcher.processing_stack_preloaded is False
    warning.assert_called_once()


def test_processing_stack_preload_marks_success(monkeypatch) -> None:
    frame_cleaner = ModuleType("lx_anonymizer.frame_cleaner")
    setattr(frame_cleaner, "FrameCleaner", object)
    report_reader = ModuleType("lx_anonymizer.report_reader")
    setattr(report_reader, "ReportReader", object)
    monkeypatch.setitem(sys.modules, "lx_anonymizer.frame_cleaner", frame_cleaner)
    monkeypatch.setitem(sys.modules, "lx_anonymizer.report_reader", report_reader)
    monkeypatch.setitem(sys.modules, "tesserocr", ModuleType("tesserocr"))
    monkeypatch.setattr(file_watcher, "processing_stack_preloaded", False)

    file_watcher._preload_processing_stack()

    assert file_watcher.processing_stack_preloaded is True


@pytest.mark.parametrize(
    ("path", "expected"),
    [
        ("video.mp4.part.123", True),
        ("video.lock", True),
        ("intake/_processing/video.mp4", True),
        ("intake/.hidden.mp4", True),
        ("intake/~backup.mp4", True),
        ("intake/video.mp4", False),
    ],
)
def test_internal_watcher_files_are_ignored(path: str, expected: bool) -> None:
    assert file_watcher.should_ignore_file(path) is expected


@pytest.mark.parametrize(
    ("key_match", "expected_calls"),
    [
        (True, [{"center_key": "center-a"}]),
        (
            False,
            [{"center_key": "center-a"}, {"name": "center-a"}],
        ),
    ],
)
def test_center_reference_prefers_key_before_legacy_name(
    monkeypatch,
    key_match: bool,
    expected_calls: list[dict[str, str]],
) -> None:
    center = object()
    calls: list[dict[str, str]] = []

    def filter_centers(**lookup):
        calls.append(lookup)
        match = center if ("center_key" in lookup) is key_match else None
        return SimpleNamespace(first=lambda: match)

    monkeypatch.setattr(file_watcher.Center.objects, "filter", filter_centers)

    assert file_watcher._resolve_center_reference("  center-a  ") is center
    assert calls == expected_calls


@pytest.mark.parametrize(
    "reference",
    ["", "  ", "unknown-center"],
)
def test_unknown_or_blank_center_reference_is_rejected(
    monkeypatch,
    reference: str,
) -> None:
    monkeypatch.setattr(
        file_watcher.Center.objects,
        "filter",
        lambda **_lookup: SimpleNamespace(first=lambda: None),
    )

    with pytest.raises(ValueError):
        file_watcher._resolve_center_reference(reference)
