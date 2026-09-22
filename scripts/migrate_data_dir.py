#!/usr/bin/env python3
"""Compatibility entrypoint for the canonical video and PDF reconciliation command."""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path


def main(argv: list[str] | None = None) -> int:
    command = [
        sys.executable,
        str(Path(__file__).resolve().parents[1] / "manage.py"),
        "migrate_media_storage",
        *(sys.argv[1:] if argv is None else argv),
    ]
    return subprocess.run(command, check=False).returncode


if __name__ == "__main__":
    raise SystemExit(main())
