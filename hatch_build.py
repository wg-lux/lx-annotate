"""Reject incomplete release assets before packaging and verify the final wheel."""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path
from typing import Any

from hatchling.builders.hooks.plugin.interface import BuildHookInterface


class StaticAssetsBuildHook(BuildHookInterface):
    def _check(self, *arguments: str) -> None:
        subprocess.run(
            [
                sys.executable,
                str(Path(self.root) / "lx_annotate_assets/__init__.py"),
                *arguments,
            ],
            check=True,
        )

    def initialize(self, version: str, build_data: dict[str, Any]) -> None:
        # Editable development installs precede the frontend build.
        if version != "editable":
            self._check("--root", str(Path(self.root) / "staticfiles"))

    def finalize(
        self, version: str, build_data: dict[str, Any], artifact_path: str
    ) -> None:
        if self.target_name == "wheel" and version != "editable":
            self._check("--wheel", artifact_path)
