from __future__ import annotations

from argparse import ArgumentParser
from pathlib import Path

from django.core.files.storage import default_storage
from django.core.management.base import BaseCommand, CommandError

from lx_annotate.storage.encrypted import EncryptedStorage


class Command(BaseCommand):
    help = (
        "Repair plaintext files that were copied directly into managed storage "
        "by re-encrypting them in place."
    )

    def add_arguments(self, parser: ArgumentParser) -> None:
        parser.add_argument(
            "--path-prefix",
            default="",
            help="Optional managed-storage subtree to scan.",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Report plaintext files that would be repaired without rewriting them.",
        )

    def handle(self, *args, **options) -> None:
        storage = default_storage
        if not isinstance(storage, EncryptedStorage):
            raise CommandError(
                "Encrypted storage is not active. Current default storage is "
                f"{storage.__class__.__module__}.{storage.__class__.__name__}."
            )

        root = Path(storage.location).resolve()
        path_prefix = str(options["path_prefix"]).strip().strip("/")
        scan_root = (root / path_prefix).resolve() if path_prefix else root

        if root != scan_root and root not in scan_root.parents:
            raise CommandError(
                f"path-prefix '{path_prefix}' escapes the managed storage root {root}"
            )

        if not scan_root.exists():
            raise CommandError(f"Managed storage path does not exist: {scan_root}")

        dry_run = bool(options["dry_run"])
        repaired = 0
        already_encrypted = 0
        skipped = 0

        for path in sorted(scan_root.rglob("*")):
            if path.is_symlink():
                skipped += 1
                self.stdout.write(f"Skipping symlink: {path}")
                continue
            if not path.is_file():
                continue

            relative_name = path.relative_to(root).as_posix()
            if storage.is_encrypted(relative_name):
                try:
                    storage.get_plaintext_size(relative_name)
                except Exception as exc:
                    raise CommandError(
                        "Encrypted managed payload is corrupt and was not repaired: "
                        f"{relative_name}: {exc}"
                    ) from exc
                already_encrypted += 1
                continue

            if dry_run:
                repaired += 1
                self.stdout.write(f"Would repair plaintext payload: {relative_name}")
                continue

            storage.repair_plaintext_file(relative_name)
            repaired += 1
            self.stdout.write(f"Repaired plaintext payload: {relative_name}")

        summary = (
            f"Managed payload repair complete. repaired={repaired} "
            f"already_encrypted={already_encrypted} skipped={skipped} "
            f"root={scan_root}"
        )
        self.stdout.write(self.style.SUCCESS(summary))
