"""Reserve host resources for API work without granting Django systemd access."""

from __future__ import annotations

import fcntl
import logging
import socket
import threading
import time
from collections.abc import AsyncIterator, Callable, Iterator
from pathlib import Path
from typing import BinaryIO, cast

from django.conf import settings
from django.http import (
    HttpRequest,
    HttpResponseBase,
    JsonResponse,
    StreamingHttpResponse,
)

logger = logging.getLogger(__name__)
API_PREFIXES = ("/api/", "/endoreg-api/", "/dtypes-api/")
ADMISSION_TIMEOUT_SECONDS = 5.0


def parse_request_throttle_directory(value: str) -> Path | None:
    value = value.strip()
    if not value:
        return None
    path = Path(value)
    if not path.is_absolute() or ".." in path.parts or "\x00" in value:
        raise ValueError(
            "Request throttle directory must be an absolute normalized path"
        )
    if len(bytes(path / "control.sock")) > 107:
        raise ValueError(
            "Request throttle directory exceeds the Unix socket path limit"
        )
    return path


class ThrottleUnavailable(RuntimeError):
    """The configured host controller did not acknowledge foreground priority."""


class RequestActivity:
    def __init__(self, directory: Path) -> None:
        self.directory = directory
        self._file: BinaryIO | None = None
        self._close_lock = threading.Lock()

    def acquire(self) -> None:
        deadline = time.monotonic() + ADMISSION_TIMEOUT_SECONDS
        try:
            self._file = (self.directory / "activity.lock").open("rb")
            while True:
                try:
                    fcntl.flock(self._file.fileno(), fcntl.LOCK_SH | fcntl.LOCK_NB)
                    break
                except BlockingIOError:
                    if time.monotonic() >= deadline:
                        raise TimeoutError("Request activity lock admission timed out")
                    time.sleep(0.005)
            with socket.socket(socket.AF_UNIX, socket.SOCK_STREAM) as connection:
                remaining = deadline - time.monotonic()
                if remaining <= 0:
                    raise TimeoutError("Request throttle admission timed out")
                connection.settimeout(remaining)
                connection.connect(str(self.directory / "control.sock"))
                connection.sendall(b"+")
                if connection.recv(1) != b"+":
                    raise OSError("Request throttle acknowledgement missing")
        except OSError as exc:
            self.close()
            raise ThrottleUnavailable(
                "Request resource controller unavailable"
            ) from exc
        except BaseException:
            self.close()
            raise

    def close(self) -> None:
        with self._close_lock:
            if self._file is not None:
                self._file.close()
                self._file = None


def _stream(content: Iterator[bytes], activity: RequestActivity) -> Iterator[bytes]:
    try:
        yield from content
    finally:
        activity.close()


async def _async_stream(
    content: AsyncIterator[bytes], activity: RequestActivity
) -> AsyncIterator[bytes]:
    try:
        async for chunk in content:
            yield chunk
    finally:
        activity.close()


class FrontendRequestThrottleMiddleware:
    """Synchronous admission also runs in Django's ASGI middleware adapter."""

    def __init__(self, get_response: Callable[[HttpRequest], HttpResponseBase]) -> None:
        self.get_response = get_response
        self.directory = cast(
            Path | None, settings.LX_ANNOTATE_REQUEST_THROTTLE_DIRECTORY
        )

    def __call__(self, request: HttpRequest) -> HttpResponseBase:
        if self.directory is None or not request.path_info.startswith(API_PREFIXES):
            return self.get_response(request)
        activity = RequestActivity(self.directory)
        try:
            activity.acquire()
        except ThrottleUnavailable:
            logger.error("request_throttle.admission_failed")
            response = JsonResponse(
                {"error": "request_resources_unavailable"}, status=503
            )
            response["Retry-After"] = "1"
            return response
        try:
            response = self.get_response(request)
            if isinstance(response, StreamingHttpResponse):
                content = response.streaming_content
                if response.is_async:
                    response.streaming_content = _async_stream(
                        cast(AsyncIterator[bytes], content), activity
                    )
                else:
                    response.streaming_content = _stream(
                        cast(Iterator[bytes], content), activity
                    )
            # Keep the reservation through response delivery and request-finished
            # handlers, including a disconnect before stream consumption.
            original_close = response.close

            def close_response() -> None:
                try:
                    original_close()
                finally:
                    activity.close()

            response.close = close_response
            return response
        except BaseException:
            activity.close()
            raise
