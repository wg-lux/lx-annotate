from __future__ import annotations

import json
from argparse import ArgumentParser, BooleanOptionalAction

from django.core.management.base import BaseCommand, CommandError

from lx_annotate.hub.hub_export_audit import emit_hub_export_audit_event
from lx_annotate.hub.hub_export_health import build_hub_export_health_summary


class Command(BaseCommand):
    help = (
        "Emit a secret-free outbound hub transfer health snapshot and fail when "
        "terminal attention is required."
    )

    def add_arguments(self, parser: ArgumentParser) -> None:
        parser.add_argument(
            "--fail-on-attention",
            action=BooleanOptionalAction,
            default=True,
            help="Exit non-zero when terminal or unclassified failures exist.",
        )

    def handle(self, *args: object, **options: object) -> None:
        summary = build_hub_export_health_summary()
        payload = summary.model_dump(mode="json")
        emit_hub_export_audit_event("hub_export.health_snapshot", **payload)
        self.stdout.write(json.dumps(payload, sort_keys=True, separators=(",", ":")))
        if bool(options.get("fail_on_attention")) and summary.critical_count:
            raise CommandError(
                "Hub export attention required: "
                f"critical_count={summary.critical_count}."
            )
