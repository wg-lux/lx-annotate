from __future__ import annotations

import ast
from pathlib import Path


UPSTREAM_MIGRATION_COMMAND = Path(
    "/home/admin/dev/lx-annotate/.devenv/state/venv/lib/python3.12/site-packages/"
    "endoreg_db/management/commands/migrate_data_dir.py"
)


def test_upstream_migration_command_covers_required_import_paths():
    source = UPSTREAM_MIGRATION_COMMAND.read_text(encoding="utf-8")

    required_paths = (
        'Path("import/anonymized_report_import")',
        'Path("import/anonymized_video_import")',
        'Path("import/frames")',
        'Path("import/model_weights")',
    )

    for required_path in required_paths:
        assert required_path in source


def test_upstream_migration_command_uses_rule_specific_extension_filters():
    source = UPSTREAM_MIGRATION_COMMAND.read_text(encoding="utf-8")
    tree = ast.parse(source)
    allowed_extensions_fields = [
        node
        for node in ast.walk(tree)
        if isinstance(node, ast.AnnAssign)
        and isinstance(node.target, ast.Name)
        and node.target.id == "allowed_extensions"
    ]

    assert allowed_extensions_fields
    assert "allowed_extensions = rule.allowed_extensions" in source
    assert "and source_path.suffix.lower() not in allowed_extensions" in source
