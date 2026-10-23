from __future__ import annotations

from unittest.mock import patch

import pytest
from django.core.management import call_command
from django.core.management.base import CommandError
from endoreg_db.management.commands.materialize_video_hls import (
    Command as MaterializeHlsCommand,
)


def test_dispatch_uses_one_backend_pass_with_safe_defaults() -> None:
    with patch.object(MaterializeHlsCommand, "handle", autospec=True) as dispatch:
        call_command("dispatch_hls_materialization")

    dispatch.assert_called_once()
    options = dispatch.call_args.kwargs
    assert options["artifact_kind"] == "both"
    assert options["apply"] is True
    assert options["json_output"] is True
    assert options["force"] is False
    assert options["inline"] is False
    # The actual dependency, not a copied ordering implementation, owns this.
    run = MaterializeHlsCommand()._run_options(options)
    assert run.artifact_kinds == ("processed", "raw")


@pytest.mark.parametrize("kind", ["raw", "processed", "both"])
@pytest.mark.parametrize("equals", [False, True])
def test_dispatch_preserves_explicit_selection(kind: str, equals: bool) -> None:
    selection = [f"--artifact-kind={kind}"] if equals else ["--artifact-kind", kind]
    with patch.object(MaterializeHlsCommand, "handle", autospec=True) as dispatch:
        call_command(
            "dispatch_hls_materialization",
            *selection,
            "--video-id",
            "12",
            "--video-id",
            "34",
            "--limit",
            "5",
            "--apply",
            "--json",
            "--fail-fast",
        )

    dispatch.assert_called_once()
    options = dispatch.call_args.kwargs
    assert options["artifact_kind"] == kind
    assert options["video_ids"] == [12, 34]
    assert options["limit"] == 5
    assert options["fail_fast"] is True


@pytest.mark.parametrize("flag", ["--force", "--inline", "--for", "--inl"])
def test_dispatch_rejects_unsafe_options_before_backend_execution(flag: str) -> None:
    with patch.object(MaterializeHlsCommand, "handle") as dispatch:
        with pytest.raises(CommandError, match="refuses|ambiguous option"):
            call_command("dispatch_hls_materialization", flag)
    dispatch.assert_not_called()


@pytest.mark.parametrize("kind", ["unknown", "RAW", " processed ", ""])
def test_dispatch_rejects_invalid_artifact_kinds(kind: str) -> None:
    with patch.object(MaterializeHlsCommand, "handle") as dispatch:
        with pytest.raises(CommandError, match="must be raw, processed, or both"):
            call_command("dispatch_hls_materialization", f"--artifact-kind={kind}")
    dispatch.assert_not_called()


def test_dispatch_rejects_missing_artifact_value() -> None:
    with patch.object(MaterializeHlsCommand, "handle") as dispatch:
        with pytest.raises(CommandError, match="expected one argument"):
            call_command("dispatch_hls_materialization", "--artifact-kind")
    dispatch.assert_not_called()


def test_programmatic_dispatch_cannot_disable_apply_or_json() -> None:
    with patch.object(MaterializeHlsCommand, "handle", autospec=True) as dispatch:
        call_command("dispatch_hls_materialization", apply=False, json_output=False)
    assert dispatch.call_args.kwargs["apply"] is True
    assert dispatch.call_args.kwargs["json_output"] is True


def test_dispatch_preserves_backend_failure() -> None:
    with patch.object(
        MaterializeHlsCommand, "handle", side_effect=CommandError("transport rejected")
    ):
        with pytest.raises(CommandError, match="transport rejected"):
            call_command("dispatch_hls_materialization")
