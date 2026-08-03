from __future__ import annotations

import importlib.resources
import json
from pathlib import Path

from lx_annotate.runtime_commands.terminology_bootstrap import main


def test_bootstrap_registers_installed_lx_dtypes_default_bundle(
    tmp_path: Path,
    capsys,
) -> None:
    registry = tmp_path / "terminology" / "registry.json"

    assert main(["--registry", str(registry)]) == 0

    payload = json.loads(registry.read_text(encoding="utf-8"))
    active = payload["active"]
    input_dirs = payload["modules"][active["module_name"]][active["version"]][
        "input_dirs"
    ]
    packaged_data = Path(str(importlib.resources.files("lx_dtypes") / "data")).resolve()
    assert input_dirs == [str(packaged_data)]
    event = json.loads(capsys.readouterr().out)
    assert event["status"] == "ok"
    assert event["module"] == active["module_name"]
    assert event["version"] == active["version"]


def test_bootstrap_preserves_an_existing_valid_registry(tmp_path: Path) -> None:
    registry = tmp_path / "terminology" / "registry.json"
    assert main(["--registry", str(registry)]) == 0
    original = registry.read_bytes()

    assert main(["--registry", str(registry)]) == 0

    assert registry.read_bytes() == original


def test_missing_packaged_module_is_non_blocking_only_when_requested(
    tmp_path: Path,
    capsys,
) -> None:
    strict_registry = tmp_path / "strict" / "registry.json"
    assert (
        main(
            [
                "--registry",
                str(strict_registry),
                "--module",
                "missing_test_module",
            ]
        )
        == 1
    )
    strict_event = json.loads(capsys.readouterr().err)
    assert strict_event["status"] == "error"
    assert not strict_registry.exists()

    best_effort_registry = tmp_path / "best-effort" / "registry.json"
    assert (
        main(
            [
                "--registry",
                str(best_effort_registry),
                "--module",
                "missing_test_module",
                "--best-effort",
            ]
        )
        == 0
    )
    warning_event = json.loads(capsys.readouterr().err)
    assert warning_event["status"] == "warning"
    assert not best_effort_registry.exists()
