from __future__ import annotations

from django.core.management.base import BaseCommand, CommandError, CommandParser

from lx_annotate.monitoring.service import build_monitoring_snapshot


class Command(BaseCommand):
    help = "Read-only runtime monitoring (exit 0 healthy, 1 warning, 2 error)."
    requires_system_checks = []  # type: ignore[assignment]

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument("--format", choices=["json", "text"], default="json")

    def handle(self, *args: object, **options: object) -> None:
        del args
        snapshot = build_monitoring_snapshot()
        if options["format"] == "json":
            self.stdout.write(snapshot.model_dump_json())
        else:
            self.stdout.write(
                f"{snapshot.status.upper()} version={snapshot.version or 'unknown'} observed_at={snapshot.observed_at.isoformat()}"
            )
            for check in snapshot.checks:
                self.stdout.write(
                    f"{check.status.upper()} {check.key}: {check.summary}"
                )
        if snapshot.status != "ok":
            raise CommandError(
                "Runtime monitoring reported an unhealthy state.",
                returncode=2 if snapshot.status == "error" else 1,
            )
