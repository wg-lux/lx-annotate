from __future__ import annotations

import tomllib
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]


def test_python_wheel_exposes_runtime_console_scripts():
    pyproject = tomllib.loads((REPO_ROOT / "pyproject.toml").read_text())

    expected_scripts = {
        "lx-annotate-web": "lx_annotate.cli:web",
        "lx-annotate-server": "lx_annotate.cli:web",
        "lx-annotate-manage": "lx_annotate.cli:manage",
        "lx-annotate-migrate": "lx_annotate.cli:migrate",
        "lx-annotate-load-base-data": "lx_annotate.cli:load_base_data",
        "lx-annotate-worker": "lx_annotate.cli:worker",
        "lx-annotate-celery": "lx_annotate.cli:celery",
        "lx-annotate-watch": "lx_annotate.cli:watch",
        "lx-annotate-export-frames": "lx_annotate.cli:export_frames",
        "lx-annotate-import-sap": "lx_annotate.cli:import_sap",
    }
    assert pyproject["project"]["scripts"].items() >= expected_scripts.items()


def test_cli_entrypoints_keep_luxnix_compatibility_aliases():
    from lx_annotate import cli

    assert cli._normalise_worker_args(["--queue=inference"]) == ["--queues=inference"]
    assert cli._normalise_worker_args(["--queue", "maintenance,default"]) == [
        "--queues",
        "maintenance,default",
    ]
    assert cli._normalise_watch_args(["--once", "--log-level", "INFO"]) == [
        "--process-existing-once",
        "--log-level",
        "INFO",
    ]
