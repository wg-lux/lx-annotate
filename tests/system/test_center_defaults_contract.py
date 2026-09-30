"""Verify the executable settings conversion without importing service startup."""

from __future__ import annotations

import ast
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def test_center_settings_accept_environment_and_ship_local_default(monkeypatch):
    tree = ast.parse((ROOT / "lx_annotate/settings/settings_base.py").read_text())
    assignments = [
        node
        for node in tree.body
        if isinstance(node, ast.Assign)
        and any(
            isinstance(target, ast.Name)
            and target.id in {"LX_ANNOTATE_DEFAULT_CENTER", "CENTER_NAME"}
            for target in node.targets
        )
    ]
    assert len(assignments) == 2
    module = compile(ast.Module(body=assignments, type_ignores=[]), "settings", "exec")
    monkeypatch.delenv("CENTER_NAME", raising=False)
    monkeypatch.delenv("LX_ANNOTATE_DEFAULT_CENTER", raising=False)
    scope = {"os": os}
    exec(module, scope)
    assert scope["CENTER_NAME"] == "Local Center"
    assert scope["LX_ANNOTATE_DEFAULT_CENTER"] == ""
    monkeypatch.setenv("CENTER_NAME", " Site A ")
    monkeypatch.setenv("LX_ANNOTATE_DEFAULT_CENTER", " site-a ")
    exec(module, scope)
    assert scope["CENTER_NAME"] == "Site A"
    assert scope["LX_ANNOTATE_DEFAULT_CENTER"] == "site-a"
