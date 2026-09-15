from __future__ import annotations

from pathlib import Path

from django.core.management.base import BaseCommand, CommandError, CommandParser
from pydantic import TypeAdapter

from lx_annotate.hub.node_provisioning import HubNodeSpec, provision_hub_nodes
from lx_annotate.operational_support import (
    render_operational_event,
    required_path,
)


class Command(BaseCommand):
    help = "Idempotently provision LX-Annotate NetworkNode records from JSON."

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument(
            "--config",
            required=True,
            type=Path,
            metavar="PATH",
            help="JSON file containing the complete validated hub-node specification.",
        )

    def handle(self, *args: object, **options: object) -> None:
        _ = args
        try:
            config_path = required_path(options, "config")
            specs = TypeAdapter(list[HubNodeSpec]).validate_json(
                config_path.read_text(encoding="utf-8")
            )
            for event in provision_hub_nodes(specs):
                self.stdout.write(
                    render_operational_event(
                        event["event"],
                        status=event["status"],
                        node_key=event["node_key"],
                        role=event["role"],
                        created=event["created"],
                        secret_changed=event["secret_changed"],
                    )
                )
        except (OSError, ValueError) as exc:
            raise CommandError(str(exc)) from exc
