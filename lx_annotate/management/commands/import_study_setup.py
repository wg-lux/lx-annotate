"""Validate, plan or import a study setup as an explicit authorized actor."""

from __future__ import annotations

from pathlib import Path

from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError, CommandParser
from lx_dtypes.terminology.terminology_service import TerminologyError
from lx_dtypes.utils.study_setup_yaml import MAX_SETUP_BYTES
from rest_framework.exceptions import PermissionDenied

from lx_annotate.services.study_setup_import import import_study_setup


class Command(BaseCommand):
    help = "Validate, dry-run or import patient-free study YAML with an explicit actor."

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument("mode", choices=["validate", "dry-run", "import"])
        parser.add_argument("source", type=Path)
        parser.add_argument("--actor-id", type=int, required=True)

    def handle(self, *args: object, **options: object) -> None:
        try:
            actor_id, source_path = options["actor_id"], options["source"]
            if not isinstance(actor_id, int) or not isinstance(source_path, Path):
                raise ValueError("Supply an actor ID and a source path")
            actor = User.objects.get(pk=actor_id)
            with source_path.open("rb") as source:
                raw = source.read(MAX_SETUP_BYTES + 1)
            if len(raw) > MAX_SETUP_BYTES:
                raise ValueError("Study YAML exceeds the input limit")
            result = import_study_setup(
                raw.decode("utf-8"), actor=actor, dry_run=options["mode"] != "import"
            )
        except (
            User.DoesNotExist,
            OSError,
            ValueError,
            ValidationError,
            PermissionDenied,
            TerminologyError,
        ) as error:
            raise CommandError(
                "Study setup rejected; verify actor, input, references and version"
            ) from error
        self.stdout.write(result.model_dump_json())
