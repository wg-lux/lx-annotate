from __future__ import annotations

import json
from argparse import ArgumentParser
from collections.abc import Iterable
from dataclasses import asdict, dataclass
from typing import Any

from django.core.management.base import BaseCommand
from django.urls import URLPattern, URLResolver, get_resolver


@dataclass
class RouteRow:
    path: str
    name: str | None
    methods: list[str]
    source: str
    callback: str


def _join_route(prefix: str, part: str) -> str:
    return f"{prefix}{part}"


def _callback_source(callback: Any) -> tuple[str, str]:
    cls = getattr(callback, "cls", None)
    if cls is not None:
        src = f"{cls.__module__}.{cls.__name__}"
    else:
        src = f"{getattr(callback, '__module__', 'unknown')}.{getattr(callback, '__name__', callback.__class__.__name__)}"

    cb_name = getattr(
        callback,
        "__qualname__",
        getattr(callback, "__name__", callback.__class__.__name__),
    )
    return src, cb_name


def _callback_methods(callback: Any) -> list[str]:
    actions = getattr(callback, "actions", None)
    if isinstance(actions, dict) and actions:
        return sorted({str(m).upper() for m in actions.keys()})

    cls = getattr(callback, "cls", None)
    names = getattr(cls, "http_method_names", None)
    if isinstance(names, Iterable):
        methods = []
        for n in names:
            n_str = str(n).lower()
            if n_str in {"options", "head", "trace"}:
                continue
            methods.append(n_str.upper())
        return sorted(set(methods)) or ["ANY"]

    return ["ANY"]


def _walk(patterns: list[Any], prefix: str = "") -> list[RouteRow]:
    rows: list[RouteRow] = []
    for pattern in patterns:
        part = str(pattern.pattern)
        full = _join_route(prefix, part)
        if isinstance(pattern, URLResolver):
            rows.extend(_walk(pattern.url_patterns, full))
            continue
        if not isinstance(pattern, URLPattern):
            continue
        source, cb_name = _callback_source(pattern.callback)
        rows.append(
            RouteRow(
                path=full,
                name=pattern.name,
                methods=_callback_methods(pattern.callback),
                source=source,
                callback=cb_name,
            )
        )
    return rows


class Command(BaseCommand):
    help = "Export Django URL route manifest as JSON for CI route matrix checks."

    def add_arguments(self, parser: ArgumentParser) -> None:
        parser.add_argument(
            "--output", type=str, default="-", help="Output file path or '-' for stdout"
        )
        parser.add_argument(
            "--include-non-api", action="store_true", help="Include non /api routes"
        )
        parser.add_argument(
            "--include-admin", action="store_true", help="Include /admin routes"
        )
        parser.add_argument(
            "--include-format-suffix",
            action="store_true",
            help="Include DRF format-suffix duplicate routes",
        )

    def handle(self, *args: Any, **options: Any) -> None:
        include_non_api = bool(options["include_non_api"])
        include_admin = bool(options["include_admin"])
        include_format_suffix = bool(options["include_format_suffix"])

        rows = _walk(get_resolver().url_patterns)

        filtered: list[RouteRow] = []
        for row in rows:
            path = row.path
            if not include_non_api and not path.startswith("api/"):
                continue
            if not include_admin and path.startswith("admin/"):
                continue
            if not include_format_suffix and (
                "<drf_format_suffix:format>" in path
                or "<format>" in path
                or "\\.<format>" in path
            ):
                continue
            filtered.append(row)

        payload = {
            "kind": "backend_route_manifest",
            "count": len(filtered),
            "routes": [asdict(r) for r in filtered],
        }

        output = options["output"]
        text = json.dumps(payload, indent=2, sort_keys=True)
        if output == "-":
            self.stdout.write(text)
            return
        with open(output, "w", encoding="utf-8") as fh:
            fh.write(text)
            fh.write("\n")
        self.stdout.write(f"Wrote {len(filtered)} routes to {output}")
