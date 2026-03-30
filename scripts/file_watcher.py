#!/usr/bin/env python3

from lx_annotate.file_watcher import *  # noqa: F401,F403
from lx_annotate.file_watcher import run_file_watcher


def main() -> None:
    run_file_watcher()


if __name__ == "__main__":
    main()
