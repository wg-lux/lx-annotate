from watchdog.events import FileCreatedEvent, FileMovedEvent

import scripts.file_watcher as file_watcher
import tempfile
from pathlib import Path


class RecordingExecutor:
    def __init__(self):
        self.submissions = []

    def submit(self, fn, *args, **kwargs):
        self.submissions.append((fn, args, kwargs))
        return None


def make_handler(monkeypatch):
    handler = file_watcher.AutoProcessingHandler()
    executor = RecordingExecutor()
    monkeypatch.setattr(handler, "executor", executor)
    return handler, executor


def test_duplicate_create_and_move_events_submit_only_once(monkeypatch, tmp_path):
    handler, executor = make_handler(monkeypatch)
    video_path = tmp_path / "video.mp4"

    handler.on_created(FileCreatedEvent(str(video_path)))
    handler.on_moved(FileMovedEvent(str(tmp_path / "incoming.mp4"), str(video_path)))

    assert len(executor.submissions) == 1
    assert handler.in_flight_files == {str(video_path)}


def test_inflight_slot_is_released_after_processing_finishes(monkeypatch, tmp_path):
    handler, executor = make_handler(monkeypatch)
    video_path = tmp_path / "video.mp4"
    video_path.write_bytes(b"test")

    monkeypatch.setattr(handler, "_wait_for_file_stable", lambda path: False)

    handler.on_created(FileCreatedEvent(str(video_path)))
    assert len(executor.submissions) == 1
    assert str(video_path) in handler.in_flight_files

    fn, args, kwargs = executor.submissions.pop()
    fn(*args, **kwargs)

    assert str(video_path) not in handler.in_flight_files

    handler.on_moved(FileMovedEvent(str(tmp_path / "renamed.mp4"), str(video_path)))

    assert len(executor.submissions) == 1
    assert str(video_path) in handler.in_flight_files


def test_processed_file_is_not_submitted_again(monkeypatch, tmp_path):
    handler, executor = make_handler(monkeypatch)
    video_path = tmp_path / "video.mp4"
    handler.processed_files.add(str(video_path))

    handler.on_created(FileCreatedEvent(str(video_path)))

    assert executor.submissions == []
    assert str(video_path) not in handler.in_flight_files


def test_intake_zone_helpers_classify_paths():
    assert file_watcher.is_intake_path(file_watcher.INTAKE_VIDEO_DIR / "clip.mp4")
    assert file_watcher.is_intake_path(file_watcher.INTAKE_REPORT_DIR / "report.pdf")
    assert file_watcher.is_intake_path(
        file_watcher.INTAKE_PREANONYMIZED_DIR / "pseudo.mp4"
    )
    assert not file_watcher.is_intake_path(
        file_watcher.MANAGED_VAULT_ROOT / "videos" / "vault.mp4"
    )


def test_managed_vault_helper_classifies_paths():
    assert file_watcher.is_managed_vault_path(
        file_watcher.MANAGED_VAULT_ROOT / "videos" / "vault.mp4"
    )
    assert not file_watcher.is_managed_vault_path(
        file_watcher.INTAKE_VIDEO_DIR / "clip.mp4"
    )


class StubFieldFile:
    def __init__(self, payload: bytes, suffix: str = ".bin"):
        self.payload = payload
        self.name = f"managed{suffix}"
        self._opened = False

    def open(self, mode="rb"):
        assert mode == "rb"
        self._opened = True
        return self

    def chunks(self, chunk_size=1024 * 1024):
        for idx in range(0, len(self.payload), chunk_size):
            yield self.payload[idx : idx + chunk_size]

    def close(self):
        self._opened = False


def test_iter_storage_chunks_reads_via_fieldfile_api():
    field_file = StubFieldFile(b"abcdef" * 1000)
    chunks = list(file_watcher.iter_storage_chunks(field_file, chunk_size=1024))
    assert b"".join(chunks) == b"abcdef" * 1000


def test_managed_media_temp_path_uses_storage_localizer(monkeypatch, tmp_path):
    managed_path = tmp_path / "managed.mp4"
    managed_path.write_bytes(b"ciphertext-placeholder")
    field_file = StubFieldFile(b"payload", suffix=".mp4")

    class _Localizer:
        def __init__(self, path: Path):
            self.path = path

        def __enter__(self):
            return self.path

        def __exit__(self, exc_type, exc, tb):
            return False

    monkeypatch.setattr(
        file_watcher,
        "ensure_local_file",
        lambda _field_file, suffix=None: _Localizer(managed_path),
    )

    with file_watcher.managed_media_temp_path(field_file, suffix=".mp4") as local_path:
        assert local_path == managed_path


def test_intake_import_services_reject_non_intake_paths(tmp_path):
    outside_path = tmp_path / "outside.mp4"
    with tempfile.TemporaryDirectory() as _:
        try:
            file_watcher.intake_video_import_service.import_from_intake(
                file_path=outside_path,
                center_name="center",
                processor_name="processor",
            )
        except ValueError as exc:
            assert "non-intake video path" in str(exc)
        else:
            raise AssertionError("expected intake video import to reject outside path")

        try:
            file_watcher.intake_report_import_service.import_from_intake(
                file_path=outside_path.with_suffix(".pdf"),
                center_name="center",
            )
        except ValueError as exc:
            assert "non-intake report path" in str(exc)
        else:
            raise AssertionError("expected intake report import to reject outside path")
