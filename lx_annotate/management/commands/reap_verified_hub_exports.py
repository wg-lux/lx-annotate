from __future__ import annotations

import json
from argparse import ArgumentParser

from django.core.management.base import BaseCommand, CommandError

from lx_annotate.hub.hub_export_cleanup import (
    HubExportCleanupBlocked,
    reap_verified_local_processed_videos,
)


class Command(BaseCommand):
    help = (
        "Dry-run or reap bounded local processed-video copies after a verified "
        "Hub apply. Raw media is never removed."
    )

    def add_arguments(self, parser: ArgumentParser) -> None:
        parser.add_argument("--source-node-key", required=True)
        parser.add_argument("--limit", type=int, default=100)
        parser.add_argument(
            "--apply",
            action="store_true",
            help="Delete verified eligible processed-video copies; default is dry-run.",
        )

    def handle(self, *args: object, **options: object) -> None:
        try:
            results = reap_verified_local_processed_videos(
                source_node_key=str(options["source_node_key"]),
                limit=int(str(options["limit"])),
                apply=bool(options["apply"]),
            )
        except (HubExportCleanupBlocked, ValueError) as exc:
            raise CommandError(str(exc)) from exc
        payload = {
            "apply": bool(options["apply"]),
            "candidate_count": len(results),
            "candidate_bytes": sum(result.candidate_bytes for result in results),
            "cleaned_count": sum(
                1 for result in results if result.storage_object_deleted
            ),
            "jobs": [result.outbound_job_id for result in results],
        }
        self.stdout.write(json.dumps(payload, sort_keys=True, separators=(",", ":")))
