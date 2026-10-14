"""API admission, response lifetime and host-local protocol regression tests."""

from __future__ import annotations

import asyncio
import fcntl
import socket
from collections.abc import AsyncIterator, Iterator
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import pytest
from django.http import HttpResponse, StreamingHttpResponse
from django.test import RequestFactory, override_settings

from lx_annotate.middleware.request_throttle import (
    FrontendRequestThrottleMiddleware,
    RequestActivity,
    ThrottleUnavailable,
    parse_request_throttle_directory,
)

# Response.close() sends request_finished, including Django's database cleanup.
pytestmark = pytest.mark.django_db


def active(directory: Path) -> bool:
    with (directory / "activity.lock").open("rb") as probe:
        try:
            fcntl.flock(probe, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            return True
        return False


@pytest.fixture
def admission(tmp_path):
    (tmp_path / "activity.lock").touch()
    with socket.socket(socket.AF_UNIX) as listener:
        listener.bind(str(tmp_path / "control.sock"))
        listener.listen()
        listener.settimeout(3)
        with ThreadPoolExecutor(max_workers=1) as executor:

            def acknowledge(count=1, reply=b"+"):
                def serve():
                    for _ in range(count):
                        with listener.accept()[0] as connection:
                            assert active(tmp_path)
                            assert connection.recv(2) == b"+"
                            connection.sendall(reply)

                return executor.submit(serve)

            with override_settings(LX_ANNOTATE_REQUEST_THROTTLE_DIRECTORY=tmp_path):
                yield tmp_path, acknowledge


@pytest.mark.parametrize(
    "value", ["relative", "/tmp/../other", "/tmp/\x00bad", "/" + "x" * 108]
)
def test_invalid_directory(value):
    with pytest.raises(ValueError):
        parse_request_throttle_directory(value)


def test_directory_parsing():
    assert parse_request_throttle_directory(" ") is None
    assert parse_request_throttle_directory(" /run/throttle ") == Path("/run/throttle")


@pytest.mark.parametrize(
    "path", ["/api/example/", "/endoreg-api/example/", "/dtypes-api/example/"]
)
def test_lock_covers_view_and_response_delivery(admission, path):
    directory, acknowledge = admission
    server = acknowledge()

    def view(request):
        assert active(directory)
        return HttpResponse("done")

    response = FrontendRequestThrottleMiddleware(view)(RequestFactory().get(path))
    server.result(timeout=3)
    assert response.status_code == 200 and active(directory)
    response.close()
    response.close()
    assert not active(directory)


@pytest.mark.parametrize(
    "directory,path", [(None, "/api/example/"), (Path("/missing"), "/static/file.css")]
)
def test_disabled_and_non_api_requests_bypass(directory, path):
    with override_settings(LX_ANNOTATE_REQUEST_THROTTLE_DIRECTORY=directory):
        response = FrontendRequestThrottleMiddleware(
            lambda request: HttpResponse("ok")
        )(RequestFactory().get(path))
    assert response.status_code == 200
    response.close()


def test_failed_controller_returns_retryable_response(tmp_path):
    (tmp_path / "activity.lock").touch()

    def view(request):
        pytest.fail("Request entered view without a throttle acknowledgement")

    with override_settings(LX_ANNOTATE_REQUEST_THROTTLE_DIRECTORY=tmp_path):
        response = FrontendRequestThrottleMiddleware(view)(
            RequestFactory().get("/api/example/")
        )
    assert response.status_code == 503 and response["Retry-After"] == "1"
    assert not active(tmp_path)


def test_missing_acknowledgement_releases_lock(admission):
    directory, acknowledge = admission
    server = acknowledge(reply=b"")
    with pytest.raises(ThrottleUnavailable):
        RequestActivity(directory).acquire()
    server.result(timeout=3)
    assert not active(directory)


def test_exception_releases_lock(admission):
    directory, acknowledge = admission
    server = acknowledge()

    def view(request):
        assert active(directory)
        raise RuntimeError("view failed")

    with pytest.raises(RuntimeError, match="view failed"):
        FrontendRequestThrottleMiddleware(view)(RequestFactory().get("/api/example/"))
    server.result(timeout=3)
    assert not active(directory)


@pytest.mark.parametrize("consume", [True, False])
def test_stream_completion_or_disconnect(admission, consume):
    directory, acknowledge = admission
    server = acknowledge()

    def chunks():
        assert active(directory)
        yield b"first"
        assert active(directory)
        yield b"second"

    response = FrontendRequestThrottleMiddleware(
        lambda request: StreamingHttpResponse(chunks())
    )(RequestFactory().get("/api/example/"))
    assert isinstance(response, StreamingHttpResponse)
    server.result(timeout=3)
    assert active(directory)
    if consume:
        content = response.streaming_content
        assert isinstance(content, Iterator)
        assert list(content) == [b"first", b"second"]
    response.close()
    assert not active(directory)


def test_async_stream_lifetime(admission):
    directory, acknowledge = admission
    server = acknowledge()

    async def chunks():
        assert active(directory)
        yield b"first"
        await asyncio.sleep(0)
        assert active(directory)
        yield b"second"

    response = FrontendRequestThrottleMiddleware(
        lambda request: StreamingHttpResponse(chunks())
    )(RequestFactory().get("/api/example/"))
    assert isinstance(response, StreamingHttpResponse)
    server.result(timeout=3)

    async def consume():
        content = response.streaming_content
        assert isinstance(content, AsyncIterator)
        return [chunk async for chunk in content]

    assert asyncio.run(consume()) == [b"first", b"second"]
    assert not active(directory)
    response.close()


def test_last_concurrent_response_releases_activity(admission):
    directory, acknowledge = admission
    server = acknowledge(count=2)
    middleware = FrontendRequestThrottleMiddleware(lambda request: HttpResponse("ok"))
    responses = [middleware(RequestFactory().get("/api/example/")) for _ in range(2)]
    server.result(timeout=3)
    responses[0].close()
    assert active(directory)
    responses[1].close()
    assert not active(directory)


@pytest.mark.parametrize("sync_view", [True, False])
def test_asgi_disconnect_releases_reservation(admission, sync_view):
    """Exercise Django's actual adapters, including cancellation of a sync view."""
    import threading

    from django.core.handlers.asgi import ASGIHandler
    from django.urls import path

    directory, acknowledge = admission
    server = acknowledge()
    entered = threading.Event()
    release = threading.Event()

    def synchronous_view(request):
        entered.set()
        assert release.wait(3)
        return HttpResponse("done")

    async def asynchronous_view(request):
        entered.set()
        await asyncio.sleep(3)
        return HttpResponse("done")

    routes = (path("api/probe/", synchronous_view if sync_view else asynchronous_view),)

    async def exercise():
        incoming = asyncio.Queue()
        await incoming.put({"type": "http.request", "body": b""})

        async def send(message):
            pass

        handler = ASGIHandler()
        task = asyncio.create_task(
            handler(
                {
                    "type": "http",
                    "http_version": "1.1",
                    "method": "GET",
                    "path": "/api/probe/",
                    "headers": [],
                    "query_string": b"",
                    "server": ("testserver", 80),
                    "client": ("127.0.0.1", 12345),
                },
                incoming.get,
                send,
            )
        )
        try:
            assert await asyncio.to_thread(entered.wait, 2)
            assert active(directory)
            await incoming.put({"type": "http.disconnect"})
            await asyncio.sleep(0.05)
            if sync_view:
                assert active(directory), (
                    "Running synchronous work lost its reservation"
                )
            release.set()
            await asyncio.wait_for(task, timeout=4)
            assert not active(directory)
        finally:
            release.set()
            if not task.done():
                task.cancel()
                await asyncio.gather(task, return_exceptions=True)

    with override_settings(
        ROOT_URLCONF=routes,
        MIDDLEWARE=[
            "lx_annotate.middleware.request_throttle.FrontendRequestThrottleMiddleware"
        ],
    ):
        asyncio.run(exercise())
    server.result(timeout=3)
