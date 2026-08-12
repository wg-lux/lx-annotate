"""LX implementation of endoreg's remote processed-video provider boundary."""

from __future__ import annotations

from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path
from tempfile import TemporaryDirectory

from .storage_resolver import (
    fetch_committed_storage_artifact,
    resolve_current_processed_video_artifact,
)
from .storage_transfer_client import StorageTransferClient


@contextmanager
def materialize_current_processed_video(*, video_id: int) -> Iterator[Path]:
    resolution = resolve_current_processed_video_artifact(video_id=video_id)
    with TemporaryDirectory(prefix="lx-storage-video-") as directory:
        destination = Path(directory) / "processed.mp4"
        fetched = fetch_committed_storage_artifact(
            resolution=resolution,
            destination=destination,
            client_factory=StorageTransferClient.from_environment,
        )
        yield fetched


__all__ = ["materialize_current_processed_video"]
