from __future__ import annotations

import json
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


def validate_static_assets(static_root: Path) -> None:
    manifest_path = static_root / ".vite" / "manifest.json"
    if not manifest_path.is_file():
        raise CommandError(f"Vite manifest is missing: {manifest_path}")
    try:
        payload = json.loads(manifest_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise CommandError(f"Vite manifest is invalid: {manifest_path}: {exc}") from exc
    entry = payload.get("src/main.ts") if isinstance(payload, dict) else None
    entry_file = entry.get("file") if isinstance(entry, dict) else None
    if not isinstance(entry_file, str) or not entry_file:
        raise CommandError("Vite manifest has no src/main.ts file mapping")
    asset_path = static_root / entry_file
    if not asset_path.is_file():
        raise CommandError(f"Vite manifest references a missing asset: {asset_path}")


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
