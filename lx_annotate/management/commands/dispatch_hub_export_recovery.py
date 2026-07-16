from __future__ import annotations

from argparse import ArgumentParser

from django.core.management.base import BaseCommand, CommandError

from endoreg_db.models import NetworkNode


class Command(BaseCommand):
    help = "Dispatch one bounded recovery pass for stale outbound hub transfers."

    def add_arguments(self, parser: ArgumentParser) -> None:
        parser.add_argument(
            "--source-node-key",
            default="",
            help="Active site node key; auto-resolved when exactly one is configured.",
        )

    def handle(self, *args: object, **options: object) -> None:
        requested_key = str(options.get("source_node_key") or "").strip()
        site_nodes = NetworkNode.objects.filter(
            role=NetworkNode.Role.SITE_NODE,
            is_active=True,
        ).order_by("pk")
        if requested_key:
            source_node = site_nodes.filter(node_key=requested_key).first()
            if source_node is None:
                raise CommandError(
                    f"Active site node {requested_key!r} is not configured."
                )
        else:
            candidates = list(site_nodes[:2])
            if len(candidates) != 1:
                raise CommandError(
                    "Exactly one active site node is required when "
                    "--source-node-key is omitted."
                )
            source_node = candidates[0]

        from lx_annotate.tasks import recover_stale_outbound_hub_transfer_jobs_task

        recover_stale_outbound_hub_transfer_jobs_task.delay(source_node.node_key)
        self.stdout.write(
            self.style.SUCCESS(
                "Dispatched stale outbound hub transfer recovery for "
                f"{source_node.node_key}."
            )
        )
