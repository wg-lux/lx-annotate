from __future__ import annotations

import subprocess

import pytest

from scripts import migrate_data_dir


@pytest.mark.parametrize(
    "arguments", [[], ["--apply", "--include-reports"], ["--json"]]
)
def test_legacy_entrypoint_delegates_to_canonical_reconciliation(
    monkeypatch, arguments
):
    calls = []

    def run(command, *, check):
        calls.append(command)
        assert check is False
        return subprocess.CompletedProcess(command, 7)

    monkeypatch.setattr(migrate_data_dir.subprocess, "run", run)
    assert migrate_data_dir.main(arguments) == 7
    assert calls[0][2:] == ["migrate_media_storage", *arguments]
