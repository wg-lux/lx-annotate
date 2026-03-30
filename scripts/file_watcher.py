#!/usr/bin/env python3

from __future__ import annotations

from contextlib import contextmanager

import lx_annotate.file_watcher as _impl
from lx_annotate.file_watcher import *  # noqa: F401,F403
from lx_annotate.file_watcher import run_file_watcher

# Re-export the localizer explicitly so tests can monkeypatch the compatibility
# module and have managed_media_temp_path honor that override.
ensure_local_file = _impl.ensure_local_file


@contextmanager
def managed_media_temp_path(field_file, *, suffix=None):
    with ensure_local_file(field_file, suffix=suffix) as local_path:
        yield local_path


def main() -> None:
    run_file_watcher()


if __name__ == "__main__":
    main()
