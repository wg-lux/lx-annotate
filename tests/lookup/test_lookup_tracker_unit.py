from __future__ import annotations

from types import SimpleNamespace
from typing import Any, cast
from unittest.mock import patch

from django.test import RequestFactory

from lx_annotate.middleware.lookup_tracker import (
    KnowledgeBaseLookupTrackerLoggingMiddleware,
)


def test_lookup_tracker_logs_csv_write_failure() -> None:
    knowledge_base = SimpleNamespace(
        config=SimpleNamespace(name="clinical-kb"),
        get_lookup_tracker_summary=lambda: {"total_lookup_count": 1},
    )
    middleware = KnowledgeBaseLookupTrackerLoggingMiddleware(
        cast(Any, lambda request: None),
    )

    with (
        patch(
            "lx_annotate.middleware.lookup_tracker.append_summary_to_study_csv",
            side_effect=OSError("storage unavailable"),
        ),
        patch("lx_annotate.middleware.lookup_tracker.logger.exception") as log_error,
    ):
        middleware._log_tracker(
            RequestFactory().get("/lookup/"),
            cast(Any, knowledge_base),
        )

    log_error.assert_called_once_with(
        "Failed to write KnowledgeBase lookup summary to study CSV.",
    )
