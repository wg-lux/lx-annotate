from __future__ import annotations

from pathlib import Path
from types import SimpleNamespace

import pytest
from django.test import override_settings

from lx_annotate.views.quarantine import (
    QuarantineDirectory,
    _limit_from_request,
    _media_type_for_name,
    _read_quarantine_file,
    _visible_in_center_scope,
)


class _Entry:
    name = "payload.bin"

    def __init__(
        self,
        *,
        symlink: bool = False,
        regular_file: bool = True,
        stat_error: OSError | None = None,
    ) -> None:
        self.symlink = symlink
        self.regular_file = regular_file
        self.stat_error = stat_error

    def is_symlink(self) -> bool:
        return self.symlink

    def stat(self, *, follow_symlinks: bool):
        assert follow_symlinks is False
        if self.stat_error is not None:
            raise self.stat_error
        return SimpleNamespace(st_ctime=1.0, st_mtime=2.0, st_size=12)

    def is_file(self) -> bool:
        return self.regular_file


_DIRECTORY = QuarantineDirectory("quarantine", "Quarantine", Path("/unused"))


class _ConfiguredPath:
    def __init__(self, *, directory: bool, entries=None, error: OSError | None = None):
        self.directory = directory
        self.entries = list(entries or [])
        self.error = error

    def exists(self) -> bool:
        return True

    def is_dir(self) -> bool:
        return self.directory

    def iterdir(self):
        if self.error is not None:
            raise self.error
        return iter(self.entries)


@pytest.mark.parametrize(
    ("filename", "expected"),
    [
        ("recording.MP4", "video"),
        ("report.PDF", "pdf"),
        ("metadata.json", "unknown"),
    ],
)
def test_media_type_is_derived_from_known_extensions(
    filename: str, expected: str
) -> None:
    assert _media_type_for_name(filename) == expected


@pytest.mark.parametrize(
    ("raw_limit", "expected"),
    [(None, 200), ("invalid", 200), ("0", 1), ("25", 25), ("999", 500)],
)
def test_quarantine_limit_is_safe_and_bounded(raw_limit: str | None, expected: int):
    query_params = {} if raw_limit is None else {"limit": raw_limit}
    request = SimpleNamespace(query_params=query_params)

    assert _limit_from_request(request) == expected


@pytest.mark.parametrize(
    ("quarantine_item", "allowed_center_id", "expected"),
    [
        (None, None, True),
        (None, -1, False),
        (None, 7, False),
        (SimpleNamespace(source_upload_job=None), 7, False),
        (
            SimpleNamespace(
                source_upload_job=SimpleNamespace(source_center_id=7),
            ),
            7,
            True,
        ),
        (
            SimpleNamespace(
                source_upload_job=SimpleNamespace(source_center_id=8),
            ),
            7,
            False,
        ),
    ],
)
def test_quarantine_visibility_fails_closed_outside_center_scope(
    quarantine_item: SimpleNamespace | None,
    allowed_center_id: int | None,
    expected: bool,
) -> None:
    assert (
        _visible_in_center_scope(
            quarantine_item,
            allowed_center_id=allowed_center_id,
        )
        is expected
    )


@pytest.mark.parametrize(
    "entry",
    [
        _Entry(symlink=True),
        _Entry(stat_error=OSError("unreadable")),
        _Entry(regular_file=False),
    ],
)
def test_quarantine_reader_rejects_unsafe_or_non_file_entries(entry: _Entry) -> None:
    assert (
        _read_quarantine_file(_DIRECTORY, entry, quarantine_item=None)  # type: ignore[arg-type]
        is None
    )


def test_unknown_quarantine_status_requires_operator_intervention() -> None:
    item = SimpleNamespace(
        status="unexpected-status",
        source_upload_job=SimpleNamespace(pk=7),
    )

    payload = _read_quarantine_file(
        _DIRECTORY,
        _Entry(),  # type: ignore[arg-type]
        quarantine_item=item,  # type: ignore[arg-type]
    )

    assert payload is not None
    assert payload["media_type"] == "unknown"
    assert payload["next_action"] == "operator_intervention"
    assert payload["source_upload_job_id"] == "7"
    assert payload["orphaned"] is False


@pytest.mark.parametrize(
    ("path", "expected_error"),
    [
        (
            _ConfiguredPath(directory=False),
            "Configured quarantine path is not a directory.",
        ),
        (
            _ConfiguredPath(directory=True, error=OSError("unavailable")),
            "Quarantine inventory is temporarily unavailable.",
        ),
    ],
)
@override_settings(
    ROOT_URLCONF="lx_annotate.urls",
    DEBUG=True,
    ALLOWED_HOSTS=["testserver"],
)
def test_quarantine_inventory_reports_configured_path_errors(
    client, monkeypatch, path: _ConfiguredPath, expected_error: str
) -> None:
    directory = QuarantineDirectory("quarantine", "Quarantine", path)  # type: ignore[arg-type]
    monkeypatch.setattr(
        "lx_annotate.views.quarantine._quarantine_directories",
        lambda: [directory],
    )
    monkeypatch.setattr(
        "lx_annotate.views.quarantine.resolve_allowed_center_id",
        lambda _user: None,
    )

    response = client.get("/api/runtime/quarantine/", secure=True)

    assert response.status_code == 200
    assert response.json()["directories"][0]["error"] == expected_error


@override_settings(
    ROOT_URLCONF="lx_annotate.urls",
    DEBUG=True,
    ALLOWED_HOSTS=["testserver"],
)
def test_quarantine_inventory_skips_rejected_entries(client, monkeypatch) -> None:
    entry = _Entry(symlink=True)
    path = _ConfiguredPath(directory=True, entries=[entry])
    directory = QuarantineDirectory("quarantine", "Quarantine", path)  # type: ignore[arg-type]
    monkeypatch.setattr(
        "lx_annotate.views.quarantine._quarantine_directories",
        lambda: [directory],
    )
    monkeypatch.setattr(
        "lx_annotate.views.quarantine._quarantine_item_for_entry",
        lambda _entry: None,
    )
    monkeypatch.setattr(
        "lx_annotate.views.quarantine.resolve_allowed_center_id",
        lambda _user: None,
    )

    response = client.get("/api/runtime/quarantine/", secure=True)

    assert response.status_code == 200
    assert response.json()["count"] == 0
