from __future__ import annotations

import logging
import threading
from dataclasses import dataclass

from django.conf import settings
from endoreg_db.utils.structured_logging import emit_structured_event
from endoreg_db.views.media.frame_media import DecodedFrameStreamView
from rest_framework import status
from rest_framework.request import Request
from rest_framework.response import Response

logger = logging.getLogger("lx_annotate.frame_annotation")


@dataclass(frozen=True)
class _DecodeAdmission:
    accepted: bool
    reason: str | None
    active: int


class _DecodeAdmissionController:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._active = 0
        self._in_flight: set[tuple[int, int, str]] = set()

    def acquire(self, key: tuple[int, int, str], *, limit: int) -> _DecodeAdmission:
        with self._lock:
            if key in self._in_flight:
                return _DecodeAdmission(False, "duplicate_in_flight", self._active)
            if self._active >= limit:
                return _DecodeAdmission(False, "capacity", self._active)
            self._active += 1
            self._in_flight.add(key)
            return _DecodeAdmission(True, None, self._active)

    def release(self, key: tuple[int, int, str]) -> int:
        with self._lock:
            if key in self._in_flight:
                self._in_flight.remove(key)
                self._active = max(0, self._active - 1)
            return self._active


_decode_admission = _DecodeAdmissionController()


def _positive_setting(name: str, default: int) -> int:
    value = int(getattr(settings, name, default))
    return max(1, value)


def _emit_decode_event(
    event: str,
    *,
    video_id: int,
    frame_number: int,
    artifact_kind: str,
    active_decodes: int,
    concurrency_limit: int,
    reason: str | None = None,
    retry_after_seconds: int | None = None,
) -> None:
    try:
        emit_structured_event(
            logger,
            event,
            video_id=video_id,
            frame_number=frame_number,
            artifact_kind=artifact_kind,
            active_decodes=active_decodes,
            concurrency_limit=concurrency_limit,
            reason=reason,
            retry_after_seconds=retry_after_seconds,
        )
    except Exception:
        logger.exception("Failed to emit frame decode event %s", event)


class BoundedDecodedFrameStreamView(DecodedFrameStreamView):
    """Bound concurrent, non-persistent frame decoding on each application node."""

    def get(
        self,
        request: Request,
        video_id: int | str | None = None,
        frame_number: int | str | None = None,
    ):
        if video_id is None or frame_number is None:
            return super().get(request, video_id=video_id, frame_number=frame_number)

        file_type = (
            str(
                request.query_params.get(
                    "file_type",
                    request.query_params.get("type", "raw"),
                ),
            )
            .strip()
            .lower()
        )
        key = (int(video_id), int(frame_number), file_type)
        limit = _positive_setting("LX_ANNOTATE_FRAME_DECODE_MAX_CONCURRENCY", 2)
        retry_after = _positive_setting(
            "LX_ANNOTATE_FRAME_DECODE_RETRY_AFTER_SECONDS",
            1,
        )
        admission = _decode_admission.acquire(key, limit=limit)
        if not admission.accepted:
            _emit_decode_event(
                "frame_decode_throttled",
                video_id=key[0],
                frame_number=key[1],
                artifact_kind=key[2],
                reason=admission.reason,
                active_decodes=admission.active,
                concurrency_limit=limit,
                retry_after_seconds=retry_after,
            )
            response = Response(
                {
                    "status": "frame_decode_throttled",
                    "video_id": key[0],
                    "frame_number": key[1],
                    "file_type": key[2],
                    "reason": admission.reason,
                    "retry_after_seconds": retry_after,
                },
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )
            response["Retry-After"] = str(retry_after)
            return response

        _emit_decode_event(
            "frame_decode_started",
            video_id=key[0],
            frame_number=key[1],
            artifact_kind=key[2],
            active_decodes=admission.active,
            concurrency_limit=limit,
        )
        try:
            return super().get(request, video_id=video_id, frame_number=frame_number)
        finally:
            active = _decode_admission.release(key)
            _emit_decode_event(
                "frame_decode_finished",
                video_id=key[0],
                frame_number=key[1],
                artifact_kind=key[2],
                active_decodes=active,
                concurrency_limit=limit,
            )
