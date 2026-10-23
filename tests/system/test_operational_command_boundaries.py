from __future__ import annotations

import json
from io import StringIO
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest
from django.core.management.base import CommandError

from lx_annotate.management.commands.dispatch_hub_export_recovery import (
    Command as RecoveryCommand,
)
from lx_annotate.management.commands.export_route_manifest import (
    Command as RouteManifestCommand,
)
from lx_annotate.management.commands.export_route_manifest import (
    RouteRow,
    _walk,
)
from lx_annotate.management.commands.run_filewatcher import Command as WatcherCommand
from lx_annotate.management.commands.run_filewatcher import (
    extract_frames_with_ffmpeg,
    process_intake_file,
)


def _site_nodes(*, requested_node=None, candidates=()):
    site_nodes = MagicMock()
    site_nodes.filter.return_value.first.return_value = requested_node
    site_nodes.__getitem__.return_value = candidates
    return site_nodes


def test_recovery_command_rejects_unknown_requested_node() -> None:
    site_nodes = _site_nodes()

    with (
        patch(
            "lx_annotate.management.commands.dispatch_hub_export_recovery."
            "NetworkNode.objects.filter"
        ) as filter_nodes,
        pytest.raises(CommandError, match="missing-node"),
    ):
        filter_nodes.return_value.order_by.return_value = site_nodes
        RecoveryCommand().handle(source_node_key=" missing-node ")

    site_nodes.filter.assert_called_once_with(node_key="missing-node")


def test_recovery_command_requires_one_auto_resolved_node() -> None:
    site_nodes = _site_nodes(candidates=[])

    with (
        patch(
            "lx_annotate.management.commands.dispatch_hub_export_recovery."
            "NetworkNode.objects.filter"
        ) as filter_nodes,
        pytest.raises(CommandError, match="Exactly one active site node"),
    ):
        filter_nodes.return_value.order_by.return_value = site_nodes
        RecoveryCommand().handle(source_node_key="")


def test_recovery_command_dispatches_requested_node() -> None:
    node = SimpleNamespace(node_key="site-node")
    site_nodes = _site_nodes(requested_node=node)

    with (
        patch(
            "lx_annotate.management.commands.dispatch_hub_export_recovery."
            "NetworkNode.objects.filter"
        ) as filter_nodes,
        patch(
            "lx_annotate.tasks.recover_stale_outbound_hub_transfer_jobs_task.delay"
        ) as delay,
    ):
        filter_nodes.return_value.order_by.return_value = site_nodes
        RecoveryCommand().handle(source_node_key="site-node")

    delay.assert_called_once_with("site-node")


def test_process_intake_file_rejects_missing_source(tmp_path) -> None:
    with pytest.raises(FileNotFoundError, match="missing.mp4"):
        process_intake_file(tmp_path / "missing.mp4", storage_backend=MagicMock())


def test_extract_frames_passes_optional_ffmpeg_arguments(monkeypatch) -> None:
    monkeypatch.setattr(
        "lx_annotate.management.commands.run_filewatcher.stream_managed_file_chunks",
        lambda *args, **kwargs: (b"video",),
    )

    with patch("lx_annotate.management.commands.run_filewatcher.subprocess.run") as run:
        extract_frames_with_ffmpeg("managed/video.mp4", ffmpeg_args=["frame.jpg"])

    command = run.call_args.args[0]
    assert command[:2] == ["ffmpeg", "-i"]
    assert command[-1] == "frame.jpg"
    run.assert_called_once_with(command, check=True)


def test_watcher_command_sets_log_level_and_starts_service(monkeypatch) -> None:
    run_watcher = MagicMock()
    monkeypatch.setattr("lx_annotate.file_watcher.run_file_watcher", run_watcher)
    monkeypatch.delenv("WATCHER_LOG_LEVEL", raising=False)
    stdout = StringIO()

    WatcherCommand(stdout=stdout).handle(log_level="DEBUG")

    assert __import__("os").environ["WATCHER_LOG_LEVEL"] == "DEBUG"
    run_watcher.assert_called_once_with(process_existing_once=False)
    assert "Starting file watcher service" in stdout.getvalue()


def test_watcher_command_reports_keyboard_interrupt(monkeypatch) -> None:
    monkeypatch.setattr(
        "lx_annotate.file_watcher.run_file_watcher",
        MagicMock(side_effect=KeyboardInterrupt),
    )
    stdout = StringIO()

    WatcherCommand(stdout=stdout).handle()

    assert "File watcher interrupted" in stdout.getvalue()


def test_watcher_command_wraps_runtime_failure(monkeypatch) -> None:
    monkeypatch.setattr(
        "lx_annotate.file_watcher.run_file_watcher",
        MagicMock(side_effect=RuntimeError("watcher failed")),
    )

    with pytest.raises(CommandError, match="watcher failed") as raised:
        WatcherCommand().handle()

    assert isinstance(raised.value.__cause__, RuntimeError)


def test_route_manifest_excludes_admin_when_non_api_routes_are_included() -> None:
    rows = [
        RouteRow("admin/", "admin", ["GET"], "test", "admin"),
        RouteRow("health/", "health", ["GET"], "test", "health"),
    ]
    stdout = StringIO()

    with patch(
        "lx_annotate.management.commands.export_route_manifest._walk",
        return_value=rows,
    ):
        RouteManifestCommand(stdout=stdout).handle(
            include_non_api=True,
            include_admin=False,
            include_format_suffix=False,
            output="-",
        )

    payload = json.loads(stdout.getvalue())
    assert [route["path"] for route in payload["routes"]] == ["health/"]


def test_route_manifest_ignores_unknown_pattern_types() -> None:
    assert _walk([SimpleNamespace(pattern="ignored/")]) == []
