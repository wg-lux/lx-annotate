# File Watcher Service Documentation

This document covers the automatic media ingestion watcher used by LX-Annotate.

## Overview

Primary service:

- `python manage.py run_filewatcher`
- Watches incoming files and triggers processing via Django services

Supported monitored inputs (via project data paths):

- Videos
- PDF reports

In most local setups these map to:

- `data/import/video_import/`
- `data/import/report_import/`

## Quick Start

Prerequisites:

```bash
uv sync
export DJANGO_SETTINGS_MODULE=lx_annotate.settings.settings_dev
```

Start in development mode:

```bash
./scripts/start_filewatcher.sh dev
```

Run watcher directly:

```bash
python manage.py run_filewatcher
```

## `start_filewatcher.sh` Commands

```bash
./scripts/start_filewatcher.sh setup
./scripts/start_filewatcher.sh dev
./scripts/start_filewatcher.sh status
./scripts/start_filewatcher.sh logs
```

System-level control (requires root):

```bash
sudo ./scripts/start_filewatcher.sh install-service
sudo ./scripts/start_filewatcher.sh start
sudo ./scripts/start_filewatcher.sh stop
sudo ./scripts/start_filewatcher.sh restart
```

## Environment Variables

- `DJANGO_SETTINGS_MODULE` (default for dev workflows: `lx_annotate.settings.settings_dev`)
- `WATCHER_LOG_LEVEL` (for example `DEBUG`, `INFO`, `WARNING`, `ERROR`)

## Logs

- File log: `logs/file_watcher.log`
- Systemd journal: `journalctl -u lx-filewatcher -f`

## Troubleshooting

Check service wiring:

```bash
./scripts/start_filewatcher.sh test
python scripts/diagnose_watcher.py
```

Common checks:

- Verify Django settings are set correctly.
- Verify monitored input directories exist and are writable.
- Verify required Python dependencies are installed.

## Notes

Older project docs may reference `scripts/core/*`. Those paths are not part of the current repository layout.
