#!/usr/bin/env python3

from __future__ import annotations

from contextlib import contextmanager

import lx_annotate.file_watcher as _impl
from lx_annotate.file_watcher import *  # noqa: F401,F403
from lx_annotate.file_watcher import run_file_watcher

# Re-export the localizer explicitly so tests can monkeypatch the compatibility
# module and have managed_media_temp_path honor that override.
ensure_local_file = _impl.ensure_local_file
_resolve_center_by_key = _impl._resolve_center_by_key
process_watcher_file = _impl.process_watcher_file
process_preanonymized_watcher_file = _impl.process_preanonymized_watcher_file
unload_ollama_model = _impl.unload_ollama_model


@contextmanager
def managed_media_temp_path(field_file, *, suffix=None):
    with ensure_local_file(field_file, suffix=suffix) as local_path:
        yield local_path


class AutoProcessingHandler(_impl.AutoProcessingHandler):
    """
    Compatibility shim that keeps monkeypatches on `scripts.file_watcher`
    visible to the implementation-backed handler methods.
    """

    @staticmethod
    def _sync_impl_bindings() -> None:
        _impl.ensure_local_file = ensure_local_file
        _impl.managed_media_temp_path = managed_media_temp_path
        _impl._resolve_center_by_key = _resolve_center_by_key
        _impl.process_watcher_file = process_watcher_file
        _impl.process_preanonymized_watcher_file = process_preanonymized_watcher_file
        _impl.unload_ollama_model = unload_ollama_model

    def _process_video(self, video_path):
        self._sync_impl_bindings()
        return super()._process_video(video_path)

    def _process_report(self, report_path):
        self._sync_impl_bindings()
        return super()._process_report(report_path)

    def _process_pseudonymized(self, file_path):
        self._sync_impl_bindings()
        return super()._process_pseudonymized(file_path)


def main() -> None:
    run_file_watcher()


if __name__ == "__main__":
    main()
