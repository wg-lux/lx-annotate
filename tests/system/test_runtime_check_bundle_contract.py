from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

import pytest

from scripts.evaluate_runtime_check_bundle import (
    SchemaContract,
    _isolated_runtime_root,
    find_contract_gaps,
)


def test_bundle_runtime_cleanup_and_environment_restore_after_failure():
    previous_root = os.environ["LX_RUNTIME_ROOT"]
    with pytest.raises(RuntimeError, match="schema probe failed"):
        with _isolated_runtime_root():
            isolated_root = Path(os.environ["LX_RUNTIME_ROOT"])
            assert isolated_root.is_dir()
            assert isolated_root.stat().st_mode & 0o777 == 0o700
            raise RuntimeError("schema probe failed")
    assert not isolated_root.exists()
    assert os.environ["LX_RUNTIME_ROOT"] == previous_root


def test_bundle_contract_reports_each_missing_schema_requirement():
    required = SchemaContract(
        tables=frozenset({"complete_table", "missing_table"}),
        columns={"complete_table": frozenset({"id", "missing_column"})},
        constraints={"complete_table": frozenset({"missing_constraint"})},
    )
    provided = SchemaContract(
        tables=frozenset({"complete_table"}),
        columns={"complete_table": frozenset({"id"})},
        constraints={"complete_table": frozenset()},
    )

    assert find_contract_gaps(required=required, provided=provided) == [
        "missing table: missing_table",
        "missing column: complete_table.missing_column",
        "missing constraint: complete_table.missing_constraint",
    ]


def test_bundle_contract_does_not_repeat_missing_tables():
    required = SchemaContract(
        tables=frozenset({"missing_table"}),
        columns={"missing_table": frozenset({"missing_column"})},
        constraints={"missing_table": frozenset({"missing_constraint"})},
    )
    provided = SchemaContract(
        tables=frozenset(),
        columns={},
        constraints={},
    )

    assert find_contract_gaps(required=required, provided=provided) == [
        "missing table: missing_table"
    ]


def test_bundle_contract_accepts_all_required_schema_objects():
    contract = SchemaContract(
        tables=frozenset({"complete_table"}),
        columns={"complete_table": frozenset({"id"})},
        constraints={"complete_table": frozenset({"complete_constraint"})},
    )

    assert find_contract_gaps(required=contract, provided=contract) == []
