from __future__ import annotations

import json
import os
from collections.abc import Mapping
from pathlib import Path
from typing import Literal

from django.core.management.base import CommandError

OperationalStatus = Literal["ok", "skipped", "failed"]


def required_path(options: Mapping[str, object], name: str) -> Path:
    """Return one argparse-normalized path or fail at the command boundary."""

    value = options.get(name)
    if not isinstance(value, Path):
        raise CommandError(f"--{name.replace('_', '-')} must be a path")
    return value.expanduser().resolve()


def optional_path(options: Mapping[str, object], name: str) -> Path | None:
    """Return an optional argparse-normalized path."""

    value = options.get(name)
    if value is None:
        return None
    if not isinstance(value, Path):
        raise CommandError(f"--{name.replace('_', '-')} must be a path")
    return value.expanduser().resolve()


def path_list(options: Mapping[str, object], name: str) -> list[Path]:
    """Return paths produced by an argparse ``append`` action."""

    value = options.get(name)
    if not isinstance(value, list) or not all(isinstance(item, Path) for item in value):
        raise CommandError(f"--{name.replace('_', '-')} must contain only paths")
    return [item.expanduser().resolve() for item in value]


def boolean_option(options: Mapping[str, object], name: str) -> bool:
    """Return one argparse-normalized boolean without truthiness coercion."""

    value = options.get(name)
    if not isinstance(value, bool):
        raise CommandError(f"--{name.replace('_', '-')} must be a boolean")
    return value


def environment_boolean(name: str) -> bool:
    """Read an optional true/false environment flag and reject invalid values."""

    value = os.environ.get(name)
    if value is None or value == "":
        return False
    normalized = value.strip().lower()
    if normalized == "true":
        return True
    if normalized == "false":
        return False
    raise CommandError(f"{name} must be 'true' or 'false'")


def configured_path(value: object, source: str) -> Path | None:
    """Normalize a path supplied by an environment variable or Django setting."""

    if value is None or value == "":
        return None
    if not isinstance(value, (str, Path)):
        raise CommandError(f"{source} must contain a filesystem path")
    return Path(value).expanduser().resolve()


def render_operational_event(
    event: str,
    *,
    status: OperationalStatus,
    **fields: object,
) -> str:
    """Serialize one stable, machine-readable operational event."""

    payload: dict[str, object] = {"event": event, "status": status}
    payload.update(fields)
    return json.dumps(payload, sort_keys=True)
