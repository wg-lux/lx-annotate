from __future__ import annotations

import os
from pathlib import Path

from django.conf import settings
from django.core.management import call_command
from django.core.management.base import BaseCommand, CommandError, CommandParser

from lx_annotate.operational_support import (
    boolean_option,
    configured_path,
    optional_path,
    render_operational_event,
)
from lx_annotate_assets import check_root


def validate_static_assets(static_root: Path) -> None:
    try:
        check_root(static_root)
    except (OSError, ValueError) as exc:
        raise CommandError("Vite static asset validation failed") from exc


class Command(BaseCommand):
    help = "Run packaged LX-Annotate runtime acceptance checks."

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument(
            "--skip-storage",
            action="store_true",
            help="Skip encrypted-storage verification.",
        )
        parser.add_argument(
            "--skip-hls",
            action="store_true",
            help="Skip production HLS readiness checks.",
        )
        parser.add_argument(
            "--skip-static",
            action="store_true",
            help="Skip Vite static-asset manifest validation.",
        )
        parser.add_argument(
            "--static-root",
            type=Path,
            default=None,
            metavar="PATH",
            help=(
                "Collected static root. Overrides DJANGO_STATIC_ROOT and "
                "Django STATIC_ROOT."
            ),
        )

    def handle(self, *args: object, **options: object) -> None:
        _ = args
        call_command("check", fail_level="CRITICAL")
        if not boolean_option(options, "skip_storage"):
            call_command("verify_encrypted_storage")
        if not boolean_option(options, "skip_hls"):
            call_command("check_production_hls_readiness")
        if not boolean_option(options, "skip_static"):
            configured_root = optional_path(options, "static_root")
            if configured_root is None:
                configured_root = configured_path(
                    os.environ.get("DJANGO_STATIC_ROOT"),
                    "DJANGO_STATIC_ROOT",
                )
            if configured_root is None:
                configured_root = configured_path(
                    getattr(settings, "STATIC_ROOT", ""),
                    "Django STATIC_ROOT",
                )
            if configured_root is None:
                raise CommandError("DJANGO_STATIC_ROOT is not configured")
            validate_static_assets(configured_root)
        self.stdout.write(
            render_operational_event(
                "lx_annotate.runtime_acceptance",
                status="ok",
            )
        )
