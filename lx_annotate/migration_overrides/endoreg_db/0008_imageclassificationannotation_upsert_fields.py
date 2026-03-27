"""Override upstream migration atomicity for PostgreSQL compatibility."""

from importlib import import_module
from typing import Any, cast

# Upstream 0008 runs a data delete and then an ALTER TABLE in one transaction.
# PostgreSQL can fail with "pending trigger events"; run this migration
# non-atomically to commit trigger work before adding the constraint.
Migration = cast(
    Any,
    import_module(
        "endoreg_db.migrations.0008_imageclassificationannotation_upsert_fields"
    ).Migration,
)
Migration.atomic = False
