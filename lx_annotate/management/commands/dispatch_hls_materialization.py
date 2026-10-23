"""Application policy for unattended, queued HLS materialization."""

from __future__ import annotations

from django.core.management.base import CommandError, CommandParser
from endoreg_db.management.commands.materialize_video_hls import (
    Command as MaterializeHlsCommand,
)


class Command(MaterializeHlsCommand):
    help = (
        "Dispatch encrypted HLS materialization to the configured media queue. "
        "Applies changes with JSON output; defaults to processed then raw artifacts. "
        "Use materialize_video_hls directly for audited force or inline repairs."
    )

    def add_arguments(self, parser: CommandParser) -> None:
        super().add_arguments(parser)
        parser.set_defaults(artifact_kind="both", apply=True, json_output=True)

    def add_apply_argument(self, parser: CommandParser, *, help_text: str) -> None:
        super().add_apply_argument(
            parser, help_text="Compatibility flag: this command always dispatches work."
        )

    def handle(self, *args: object, **options: object) -> None:
        for flag in ("force", "inline"):
            if options.get(flag):
                raise CommandError(
                    f"dispatch_hls_materialization refuses --{flag}; "
                    "use materialize_video_hls directly for audited repair runs."
                )
        if options.get("artifact_kind") not in ("raw", "processed", "both"):
            raise CommandError("--artifact-kind must be raw, processed, or both.")
        # These are policy invariants, including for programmatic call_command.
        options.update(apply=True, json_output=True)
        # One backend pass preserves its processed-before-raw ordering and cache.
        super().handle(*args, **options)
