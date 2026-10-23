from __future__ import annotations

from endoreg_db.utils.paths import get_runtime_paths


def assert_dirs():
    get_runtime_paths().ensure_directories()


if __name__ == "__main__":
    assert_dirs()
