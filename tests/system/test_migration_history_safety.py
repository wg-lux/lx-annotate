from __future__ import annotations

import pytest
from django.core.management import get_commands

from lx_annotate import migration_history_safety as safety
from lx_annotate.settings import settings_base


class _MigrationResource:
    def __init__(self, filename: str, contents: bytes) -> None:
        self.name = filename
        self._contents = contents

    def read_bytes(self) -> bytes:
        return self._contents


class _MigrationModuleResource:
    def __init__(self, entries: list[_MigrationResource]) -> None:
        self._entries = entries

    def iterdir(self) -> list[_MigrationResource]:
        return self._entries


def test_manifest_hash_ignores_formatting_but_detects_semantic_changes(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    module_resource = _MigrationModuleResource(
        [
            _MigrationResource(
                "0001_initial.py",
                b"from example import first\nfrom example import second\nvalue = {'key': 1}\n",
            ),
        ],
    )
    monkeypatch.setattr(safety.resources, "files", lambda _module: module_resource)
    original = safety.load_migration_manifest("example.migrations")

    module_resource._entries[0] = _MigrationResource(
        "0001_initial.py",
        b'# formatting-only change\nfrom example import second, first\nvalue={"key":1}\n',
    )
    reformatted = safety.load_migration_manifest("example.migrations")
    module_resource._entries[0] = _MigrationResource(
        "0001_initial.py",
        b'from example import first, second\nvalue={"key":2}\n',
    )
    changed = safety.load_migration_manifest("example.migrations")

    assert reformatted == original
    assert changed.names == original.names
    assert changed.sha256 != original.sha256


def test_reviewed_contracts_match_pinned_canonical_packages() -> None:
    manifests = safety.verify_canonical_contract_manifests()

    assert set(manifests) == {contract.app_label for contract in safety.CONTRACTS}
    for contract in safety.CONTRACTS:
        assert contract.canonical_leaf in manifests[contract.app_label].names


def test_retired_dependency_migration_graph_is_not_shipped() -> None:
    package_root = safety.resources.files("lx_annotate")

    assert not package_root.joinpath("migration_overrides").is_dir()
    assert not hasattr(settings_base, "MIGRATION_MODULES")
    assert "converge_migration_history" not in get_commands()
