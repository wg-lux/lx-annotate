from __future__ import annotations

import json

from django.core.management.base import BaseCommand, CommandError, CommandParser
from django.db import DEFAULT_DB_ALIAS, connections
from django.utils.connection import ConnectionDoesNotExist

from lx_annotate.migration_history_safety import (
    MigrationHistorySafetyError,
    check_migration_compatibility,
)


class Command(BaseCommand):
    help = (
        "Read-only guard against recorded dependency migrations newer than or "
        "unknown to the installed packages. Run before migrations and startup."
    )
    # Django accepts an empty tag list; django-stubs currently narrows this to str.
    requires_system_checks: list[str] = []  # type: ignore[assignment]

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument("--database", default=DEFAULT_DB_ALIAS)

    def handle(self, *args: object, **options: object) -> None:
        using = str(options["database"])
        try:
            plans = check_migration_compatibility(connections[using])
        except (MigrationHistorySafetyError, ConnectionDoesNotExist) as exc:
            raise CommandError(str(exc)) from exc
        self.stdout.write(
            json.dumps(
                {
                    "event": "lx_annotate.migration_compatibility",
                    "status": "compatible",
                    "database": using,
                    "apps": [
                        {"app_label": plan.app_label, "status": plan.status}
                        for plan in plans
                    ],
                },
                sort_keys=True,
            ),
        )
