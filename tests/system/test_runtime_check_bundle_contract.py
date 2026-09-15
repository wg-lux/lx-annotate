from __future__ import annotations

from scripts.evaluate_runtime_check_bundle import SchemaContract, find_contract_gaps


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
