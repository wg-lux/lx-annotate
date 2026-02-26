#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Any


PLACEHOLDER_TOKEN_RE = re.compile(r"__[^_/]+__")
DJANGO_PARAM_RE = re.compile(r"<(?:[^:>]+:)?([^>]+)>")
REGEX_GROUP_RE = re.compile(r"\(\?P<[^>]+>.*?\)")


def run_json(cmd: list[str], cwd: Path) -> dict[str, Any]:
    proc = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True)
    if proc.returncode != 0:
        sys.stderr.write(proc.stderr or proc.stdout)
        raise SystemExit(proc.returncode)
    try:
        return json.loads(proc.stdout)
    except json.JSONDecodeError as exc:
        sys.stderr.write(proc.stdout)
        raise SystemExit(f"Failed to parse JSON from {' '.join(cmd)}: {exc}") from exc


def run_backend_manifest_via_file(cmd: list[str], cwd: Path) -> dict[str, Any]:
    with tempfile.NamedTemporaryFile(prefix="backend-route-manifest-", suffix=".json", delete=False) as tf:
        tmp_path = Path(tf.name)
    try:
        proc = subprocess.run([*cmd, "--output", str(tmp_path)], cwd=cwd, capture_output=True, text=True)
        if proc.returncode != 0:
            sys.stderr.write(proc.stderr or proc.stdout)
            raise SystemExit(proc.returncode)
        return json.loads(tmp_path.read_text(encoding="utf-8"))
    finally:
        try:
            tmp_path.unlink(missing_ok=True)
        except Exception:
            pass


def normalize_path(path: str, *, frontend: bool) -> str:
    p = path.strip()
    p = p.lstrip("/")
    if p.startswith("api/"):
        p = p[4:]
    if frontend:
        p = p.split("?", 1)[0]
    # Strip DRF/regex format suffix hints from backend route strings.
    p = p.replace("\\.<format>", "")
    p = p.replace(".<format>", "")
    p = p.replace("<drf_format_suffix:format>", "")
    # DRF router regex-style patterns often appear as ^foo/(?P<pk>[^/.]+)/$
    if p.startswith("^"):
        p = p[1:]
    if p.endswith("$"):
        p = p[:-1]
    p = REGEX_GROUP_RE.sub("{param}", p)
    p = DJANGO_PARAM_RE.sub("{param}", p)
    if frontend:
        p = PLACEHOLDER_TOKEN_RE.sub("{param}", p)
    return p


def compare(frontend_routes: list[dict[str, Any]], backend_routes: list[dict[str, Any]]) -> dict[str, Any]:
    backend_index: dict[str, list[dict[str, Any]]] = {}
    for row in backend_routes:
        norm = normalize_path(str(row["path"]), frontend=False)
        backend_index.setdefault(norm, []).append(row)

    checked: list[dict[str, Any]] = []
    missing_backend: list[dict[str, Any]] = []

    for row in frontend_routes:
        path = row.get("path")
        if not isinstance(path, str):
            checked.append(
                {
                    "key": row.get("key"),
                    "status": "skipped",
                    "reason": row.get("error") or "non-string endpoint result",
                }
            )
            continue

        norm = normalize_path(path, frontend=True)
        matches = backend_index.get(norm, [])
        item = {
            "key": row.get("key"),
            "frontend_path": path,
            "normalized_path": norm,
            "status": "match" if matches else "missing_backend",
            "backend_matches": [
                {
                    "path": m.get("path"),
                    "name": m.get("name"),
                    "methods": m.get("methods", []),
                    "source": m.get("source"),
                }
                for m in matches[:10]
            ],
        }
        checked.append(item)
        if not matches:
            missing_backend.append(item)

    return {
        "frontend_checked": len(frontend_routes),
        "missing_backend_count": len(missing_backend),
        "missing_backend": missing_backend,
        "results": checked,
    }


def write_markdown(path: Path, summary: dict[str, Any]) -> None:
    missing = summary.get("effective_missing_backend", summary.get("missing_backend", []))
    missing_count = summary.get("effective_missing_backend_count", summary.get("missing_backend_count", 0))
    lines = [
        "# Route Matrix Check",
        "",
        f"- Frontend endpoints checked: `{summary['frontend_checked']}`",
        f"- Missing backend matches: `{missing_count}`",
        "",
    ]
    if missing:
        lines.append("## Missing Backend Routes")
        lines.append("")
        for row in missing:
            lines.append(f"- `{row['key']}` -> `{row['frontend_path']}` (normalized `{row['normalized_path']}`)")
    else:
        lines.append("No missing backend route matches.")
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="Compare frontend endpoint contract against Django routes.")
    parser.add_argument("--project-root", default=".", help="Repo root")
    parser.add_argument("--manage-py", default="manage.py", help="Path to manage.py relative to repo root")
    parser.add_argument(
        "--frontend-exporter",
        default="scripts/route_matrix/export_frontend_endpoints.mjs",
        help="Path to frontend endpoint exporter script relative to repo root",
    )
    parser.add_argument("--node-bin", default="node", help="Node executable")
    parser.add_argument("--python-bin", default=sys.executable, help="Python executable")
    parser.add_argument("--backend-manifest", help="Use existing backend manifest JSON instead of exporting")
    parser.add_argument("--frontend-manifest", help="Use existing frontend manifest JSON instead of exporting")
    parser.add_argument("--json-out", default="", help="Write comparison JSON to this path")
    parser.add_argument("--md-out", default="", help="Write markdown summary to this path")
    parser.add_argument("--allow-missing-prefix", action="append", default=[], help="Frontend key prefix to ignore for missing backend (repeatable)")
    args = parser.parse_args()

    root = Path(args.project_root).resolve()

    node_bin = args.node_bin
    if not args.frontend_manifest and not shutil.which(node_bin):
        if node_bin == "node" and shutil.which("nodejs"):
            node_bin = "nodejs"
        else:
            raise SystemExit(
                f"Node executable '{args.node_bin}' not found. Install Node or pass --node-bin, or provide --frontend-manifest."
            )

    if args.backend_manifest:
        backend_payload = json.loads(Path(args.backend_manifest).read_text(encoding="utf-8"))
    else:
        backend_payload = run_backend_manifest_via_file(
            [args.python_bin, args.manage_py, "export_route_manifest"],
            cwd=root,
        )

    if args.frontend_manifest:
        frontend_payload = json.loads(Path(args.frontend_manifest).read_text(encoding="utf-8"))
    else:
        frontend_payload = run_json([node_bin, args.frontend_exporter], cwd=root)

    summary = compare(frontend_payload.get("routes", []), backend_payload.get("routes", []))

    ignored_prefixes = tuple(args.allow_missing_prefix)
    effective_missing = [
        row for row in summary["missing_backend"] if not str(row.get("key", "")).startswith(ignored_prefixes)
    ]
    summary["effective_missing_backend_count"] = len(effective_missing)
    summary["effective_missing_backend"] = effective_missing

    if args.json_out:
        out = Path(args.json_out)
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps(summary, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    if args.md_out:
        out = Path(args.md_out)
        out.parent.mkdir(parents=True, exist_ok=True)
        write_markdown(out, summary)

    print(
        json.dumps(
            {
                "frontend_checked": summary["frontend_checked"],
                "missing_backend_count": summary["missing_backend_count"],
                "effective_missing_backend_count": summary["effective_missing_backend_count"],
            },
            indent=2,
        )
    )

    return 1 if effective_missing else 0


if __name__ == "__main__":
    raise SystemExit(main())
