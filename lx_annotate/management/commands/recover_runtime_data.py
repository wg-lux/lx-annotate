from __future__ import annotations

import os
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError, CommandParser

from lx_annotate.operational_support import (
    boolean_option,
    configured_path,
    environment_boolean,
    optional_path,
    path_list,
    required_path,
)
from lx_annotate.services.runtime_recovery import RuntimeRecoveryService


class Command(BaseCommand):
    help = "Idempotently recover legacy data into the configured runtime root."

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument(
            "--target",
            type=Path,
            default=None,
            metavar="PATH",
            help=(
                "Encrypted runtime data root. Overrides LX_ANNOTATE_ENCRYPTED_DATA_DIR."
            ),
        )
        parser.add_argument(
            "--state-file",
            type=Path,
            required=True,
            metavar="PATH",
            help="Persistent recovery state file; its parent directory is created.",
        )
        parser.add_argument(
            "--source",
            type=Path,
            action="append",
            default=[],
            metavar="PATH",
            help="Legacy data root to inspect; may be specified more than once.",
        )
        parser.add_argument(
            "--force",
            action="store_true",
            help="Run data recovery even when the completion marker is current.",
        )
        repair_mode = parser.add_mutually_exclusive_group()
        repair_mode.add_argument(
            "--force-repair",
            action="store_true",
            help="Repair managed payloads even when the repair marker is current.",
        )
        repair_mode.add_argument(
            "--skip-repair",
            action="store_true",
            help="Skip the managed-payload repair phase.",
        )

    def handle(self, *args: object, **options: object) -> None:
        _ = args
        target = optional_path(options, "target") or configured_path(
            os.environ.get("LX_ANNOTATE_ENCRYPTED_DATA_DIR"),
            "LX_ANNOTATE_ENCRYPTED_DATA_DIR",
        )
        if target is None:
            raise CommandError("--target or LX_ANNOTATE_ENCRYPTED_DATA_DIR is required")

        skip_repair = boolean_option(options, "skip_repair")
        RuntimeRecoveryService(self.stdout.write).run(
            target=target,
            state_file=required_path(options, "state_file"),
            sources=path_list(options, "source"),
            force=boolean_option(options, "force")
            or environment_boolean("LX_ANNOTATE_FORCE_DATA_RECOVERY"),
            force_repair=not skip_repair
            and (
                boolean_option(options, "force_repair")
                or environment_boolean("LX_ANNOTATE_FORCE_MANAGED_PAYLOAD_REPAIR")
            ),
            skip_repair=skip_repair,
        )
