from __future__ import annotations

from argparse import ArgumentParser
from pathlib import Path
from uuid import uuid4

from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.core.management.base import BaseCommand, CommandError

from lx_annotate.storage.encrypted import EncryptedStorage
from lx_annotate.storage.encryption import MAGIC


class Command(BaseCommand):
    help = (
        "Verify that managed media is encrypted on disk while remaining readable "
        "through Django storage."
    )

    def add_arguments(self, parser: ArgumentParser) -> None:
        parser.add_argument(
            "--path-prefix",
            default="_health/encryption",
            help="Managed storage directory used for the probe file.",
        )
        parser.add_argument(
            "--keep",
            action="store_true",
            help="Keep the probe file instead of deleting it after verification.",
        )

    def handle(self, *args, **options) -> None:
        storage = default_storage
        if not isinstance(storage, EncryptedStorage):
            raise CommandError(
                "Encrypted storage is not active. Current default storage is "
                f"{storage.__class__.__module__}.{storage.__class__.__name__}."
            )

        probe_id = uuid4().hex
        plaintext = f"lx-annotate-encryption-probe:{probe_id}".encode("utf-8")
        path_prefix = str(options["path_prefix"]).strip("/").strip()
        if path_prefix:
            probe_name = f"{path_prefix}/probe-{probe_id}.txt"
        else:
            probe_name = f"probe-{probe_id}.txt"

        saved_name = storage.save(probe_name, ContentFile(plaintext))
        cleanup = not bool(options["keep"])

        try:
            with storage.open(saved_name, "rb") as handle:
                decrypted = handle.read()
            if decrypted != plaintext:
                raise CommandError(
                    "Storage round-trip failed: decrypted content did not match "
                    "the original probe payload."
                )

            raw_path = Path(storage.path(saved_name))
            raw_bytes = raw_path.read_bytes()
            if plaintext in raw_bytes:
                raise CommandError(
                    "Encryption verification failed: plaintext probe payload was "
                    "found directly on disk."
                )
            if not raw_bytes.startswith(MAGIC):
                raise CommandError(
                    "Encryption verification failed: on-disk file did not start "
                    "with the expected encrypted-file header."
                )

            self.stdout.write(
                self.style.SUCCESS(
                    f"Encrypted storage verified for {saved_name} at {raw_path}"
                )
            )
        finally:
            if cleanup:
                storage.delete(saved_name)
