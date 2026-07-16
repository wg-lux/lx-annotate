#!/usr/bin/env python3

from __future__ import annotations

from contextlib import contextmanager

import lx_annotate.file_watcher as fw
from lx_annotate.file_watcher import *  # type: ignore[assignment] # noqa: F401,F403
from lx_annotate.file_watcher import run_file_watcher

# Re-export the localizer explicitly so tests can monkeypatch the compatibility
# module and have managed_media_temp_path honor that override.
ensure_local_file = fw.ensure_local_file
_resolve_center_by_key = fw._resolve_center_by_key
process_watcher_file = fw.process_watcher_file
process_preanonymized_watcher_file = fw.process_preanonymized_watcher_file
unload_ollama_model = fw.unload_ollama_model
_has_prediction_segments = fw._has_prediction_segments
_prediction_sequences_have_ranges = fw._prediction_sequences_have_ranges
_prediction_pipeline_complete = fw._prediction_pipeline_complete


@contextmanager
def managed_media_temp_path(field_file, *, suffix=None):
    with ensure_local_file(field_file, suffix=suffix) as local_path:
        yield local_path


class AutoProcessingHandler(fw.AutoProcessingHandler):
    """
    Compatibility shim that keeps monkeypatches on `scripts.file_watcher`
    visible to the implementation-backed handler methods.
    """

    @staticmethod
    def _syncfw_bindings() -> None:
        fw.ensure_local_file = ensure_local_file
        fw.managed_media_temp_path = managed_media_temp_path
        fw._resolve_center_by_key = _resolve_center_by_key
        fw.process_watcher_file = process_watcher_file
        fw.process_preanonymized_watcher_file = process_preanonymized_watcher_file
        fw.unload_ollama_model = unload_ollama_model
        fw._has_prediction_segments = _has_prediction_segments
        fw._prediction_sequences_have_ranges = _prediction_sequences_have_ranges
        fw._prediction_pipeline_complete = _prediction_pipeline_complete

    def _process_video(self, video_path):
        self._syncfw_bindings()
        return super()._process_video(video_path)

    def _process_report(self, report_path):
        self._syncfw_bindings()
        return super()._process_report(report_path)

    def _process_pseudonymized(self, file_path):
        self._syncfw_bindings()
        return super()._process_pseudonymized(file_path)


def main() -> None:
    run_file_watcher()


if __name__ == "__main__":
    main()
