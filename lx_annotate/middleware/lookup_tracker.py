"""Middleware that drains KnowledgeBase lookup trackers after each request."""

from __future__ import annotations

import csv
import io
import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from django.conf import settings
from django.http import HttpRequest, HttpResponse
from django.utils.deprecation import MiddlewareMixin
from endoreg_db.utils.file_operations import (
    advisory_file_lock,
    atomic_write_file,
    ensure_directory,
)
from lx_dtypes.django.api.lookup_tracker import consume_runtime_lookup_trackers
from lx_dtypes.models.interface.KnowledgeBase import KnowledgeBase

logger = logging.getLogger(__name__)

_STUDY_DATA_DIR = Path("study_data")
_CSV_FILE_NAME = "knowledge_base_lookup_tracker.csv"
_CSV_HEADERS = [
    "timestamp",
    "module",
    "method",
    "path",
    "total_lookup_count",
    "edge_count",
    "key_count",
    "summary_json",
]


class KnowledgeBaseLookupTrackerLoggingMiddleware(MiddlewareMixin):
    """
    Log a short summary of all KnowledgeBase lookups and reset the trackers.

    This middleware is intentionally idempotent: it clears the tracker state every
    time a request finishes or raises so the next request starts with a clean slate.
    """

    def process_response(
        self, request: HttpRequest, response: HttpResponse
    ) -> HttpResponse:
        self._flush_summary(request)
        return response

    def process_exception(self, request: HttpRequest, exception: BaseException) -> None:
        self._flush_summary(request)
        return None

    def _flush_summary(self, request: HttpRequest) -> None:
        trackers = consume_runtime_lookup_trackers()
        if not trackers:
            return
        for kb in trackers:
            self._log_tracker(request, kb)
            self._reset_tracker(kb)

    def _log_tracker(self, request: HttpRequest, kb: KnowledgeBase) -> None:
        summary = kb.get_lookup_tracker_summary()
        total = summary.get("total_lookup_count", 0)
        if total == 0:
            return
        edges = len(summary.get("edge_counts", []))
        keys = len(summary.get("key_counts", []))
        logger.info(
            "KnowledgeBase lookup summary path=%s module=%s total=%d edges=%d keys=%d",
            request.path,
            getattr(kb.config, "name", "<unknown>"),
            total,
            edges,
            keys,
        )
        logger.debug("KnowledgeBase lookup detail for %s: %s", request.path, summary)

        try:
            append_summary_to_study_csv(
                summary,
                request,
                module_name=getattr(kb.config, "name", "<unknown>"),
            )
        except Exception:
            logger.exception(
                "Failed to write KnowledgeBase lookup summary to study CSV."
            )

    @staticmethod
    def _reset_tracker(kb: KnowledgeBase) -> None:
        try:
            kb.reset_lookup_tracker()
        except Exception:  # pragma: no cover - guard against user-defined KB overrides
            logger.exception("Failed to reset KnowledgeBase lookup tracker.")


def append_summary_to_study_csv(
    summary: dict[str, Any],
    request: HttpRequest,
    module_name: str,
) -> None:
    configured_study_dir = getattr(settings, "KNOWLEDGE_BASE_LOOKUP_TRACKER_DIR", None)
    study_dir = (
        Path(configured_study_dir)
        if configured_study_dir
        else Path(settings.BASE_DIR) / _STUDY_DATA_DIR
    )
    ensure_directory(study_dir)
    csv_path = study_dir / _CSV_FILE_NAME
    lock_path = study_dir / f".{_CSV_FILE_NAME}.lock"
    edge_list = summary.get("edge_counts")
    key_list = summary.get("key_counts")
    row = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "module": module_name or "<unknown>",
        "method": request.method,
        "path": request.path,
        "total_lookup_count": summary.get("total_lookup_count", 0),
        "edge_count": len(edge_list) if isinstance(edge_list, list) else 0,
        "key_count": len(key_list) if isinstance(key_list, list) else 0,
        "summary_json": json.dumps(summary, ensure_ascii=False),
    }

    with advisory_file_lock(lock_path=lock_path):
        existing_content = csv_path.read_bytes() if csv_path.exists() else b""
        csv_buffer = io.StringIO(newline="")
        writer = csv.DictWriter(csv_buffer, fieldnames=_CSV_HEADERS)
        if not existing_content:
            writer.writeheader()
        writer.writerow(row)
        appended_content = csv_buffer.getvalue().encode("utf-8")
        atomic_write_file(
            destination=csv_path,
            content=(existing_content, appended_content),
            required_bytes=len(existing_content) + len(appended_content),
        )
