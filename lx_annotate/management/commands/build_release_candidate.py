"""Prepare an encrypted video candidate from a saved patient split."""

from __future__ import annotations

import json
from pathlib import Path

import yaml
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandParser
from endoreg_db.utils.encryption.encrypted import EncryptedStorage
from endoreg_db.utils.paths import get_runtime_paths
from pydantic import TypeAdapter

from lx_annotate.models import AIDatasetSplitPlan
from lx_annotate.schemas.publication import Age, Code
from lx_annotate.services.publication import build_release_candidate


class Command(BaseCommand):
    help = "Build a protected processed-video release candidate; does not publish it."

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument("--plan-id", type=int, required=True)
        parser.add_argument("--user-id", type=int, required=True)
        parser.add_argument(
            "--label-codes",
            type=Path,
            required=True,
            help="YAML mapping of internal label IDs to curator-selected public codes.",
        )
        parser.add_argument("--transformation-version", required=True)
        parser.add_argument(
            "--ages-at-examination",
            type=Path,
            required=True,
            help="Protected YAML mapping of video IDs to curator-verified ages at examination.",
        )

    def handle(self, *args: object, **options: object) -> None:
        path = options["label_codes"]
        if not isinstance(path, Path):
            raise TypeError("label-codes must be a path")
        labels = TypeAdapter(dict[int, Code]).validate_python(
            yaml.safe_load(path.read_text()), strict=True
        )
        ages_path = options["ages_at_examination"]
        if not isinstance(ages_path, Path):
            raise TypeError("ages-at-examination must be a path")
        ages = TypeAdapter(dict[int, Age]).validate_python(
            yaml.safe_load(ages_path.read_text()), strict=True
        )
        manifest = build_release_candidate(
            plan=AIDatasetSplitPlan.objects.get(pk=options["plan_id"]),
            user=get_user_model().objects.get(pk=options["user_id"]),
            label_codes=labels,
            ages_at_examination=ages,
            transformation_version=TypeAdapter(Code).validate_python(
                options["transformation_version"], strict=True
            ),
            storage=EncryptedStorage(location=get_runtime_paths().storage),
        )
        self.stdout.write(
            json.dumps(
                {
                    "release_id": str(manifest.release_id),
                    "manifest_sha256": manifest.sha256(),
                    "published": False,
                }
            )
        )
