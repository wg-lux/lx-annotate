"""Regression for the request-cleanup deadlock observed on gc-10.

Run the real ASGI handler in a child: an event-loop deadlock defeats asyncio
timeouts, so the parent must enforce a wall-clock deadline and kill the child.
The child uses only test routes and no database, credentials, or media.
"""

from __future__ import annotations

import asyncio
import faulthandler
import subprocess
import sys
import threading
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import pytest


@pytest.mark.parametrize("concurrent_disconnects", [1, 4])
@pytest.mark.parametrize("saturate_default_executor", [False, True])
def test_cancelled_sync_requests_do_not_freeze_asgi(
    concurrent_disconnects: int,
    saturate_default_executor: bool,
) -> None:
    try:
        result = subprocess.run(
            [
                sys.executable,
                str(Path(__file__).resolve()),
                str(concurrent_disconnects),
                str(int(saturate_default_executor)),
            ],
            capture_output=True,
            text=True,
            timeout=15,
            check=False,
        )
    except subprocess.TimeoutExpired:
        pytest.fail(
            "ASGI cancellation blocked the event loop or executor cleanup; "
            "check that the runtime uses asgiref >=3.12.1."
        )
    assert result.returncode == 0, result.stdout + result.stderr
    assert "unrelated_request_completed_before_release" in result.stdout
    assert "cancelled_requests_drained" in result.stdout
    assert "subsequent_request_completed" in result.stdout


async def _run_cancellation_probe(count: int, saturate_executor: bool) -> None:
    from asgiref.sync import async_to_sync
    from django.conf import settings
    from django.http import HttpRequest, HttpResponse
    from django.urls import path

    # Deliberately minimal settings: exercise the application's actual ASGI
    # entrypoint without importing clinical models or opening a database.
    settings.configure(
        ROOT_URLCONF=__name__,
        ALLOWED_HOSTS=["localhost"],
        INSTALLED_APPS=[],
        MIDDLEWARE=[],
    )
    entered = [threading.Event() for _ in range(count)]
    release = threading.Event()
    completed = [threading.Event() for _ in range(count)]

    async def complete_on_loop() -> None:
        await asyncio.sleep(0)

    def slow_view(request: HttpRequest, index: int) -> HttpResponse:
        entered[index].set()
        # This wait represents sync I/O that keeps running after cancellation.
        # The parent process timeout bounds the deliberately blocked thread.
        release.wait()
        async_to_sync(complete_on_loop)()
        completed[index].set()
        return HttpResponse("completed")

    async def fast_view(request: HttpRequest) -> HttpResponse:
        return HttpResponse("responsive")

    global urlpatterns
    urlpatterns = [path("slow/<int:index>/", slow_view), path("fast/", fast_view)]

    from lx_annotate.asgi import application

    def request_task(route: str):
        incoming: asyncio.Queue[dict[str, object]] = asyncio.Queue()
        incoming.put_nowait({"type": "http.request", "body": b""})
        outgoing: list[dict[str, object]] = []

        async def send(message: dict[str, object]) -> None:
            outgoing.append(message)

        scope = {
            "type": "http",
            "http_version": "1.1",
            "method": "GET",
            "scheme": "http",
            "path": route,
            "raw_path": route.encode(),
            "query_string": b"",
            "headers": [(b"host", b"localhost")],
        }
        return (
            asyncio.create_task(application(scope, incoming.get, send)),
            incoming,
            outgoing,
        )

    async def wait_for_threads(events: list[threading.Event]) -> None:
        async with asyncio.timeout(3):
            while not all(event.is_set() for event in events):
                await asyncio.sleep(0.001)

    async def fast_request() -> None:
        task, _, outgoing = request_task("/fast/")
        await asyncio.wait_for(task, timeout=3)
        assert any(message.get("status") == 200 for message in outgoing)
        assert any(message.get("body") == b"responsive" for message in outgoing)

    loop = asyncio.get_running_loop()
    loop.set_default_executor(ThreadPoolExecutor(max_workers=1))
    slow_requests = [request_task(f"/slow/{index}/") for index in range(count)]
    await wait_for_threads(entered)
    print("slow_requests_started", flush=True)

    blocker = None
    if saturate_executor:
        blocker_entered = threading.Event()

        def occupy_default_executor() -> None:
            blocker_entered.set()
            release.wait()

        blocker = loop.run_in_executor(None, occupy_default_executor)
        await wait_for_threads([blocker_entered])

    try:
        for _, incoming, _ in slow_requests:
            incoming.put_nowait({"type": "http.disconnect"})
        # Give Django time to process the disconnect, then emulate Daphne's
        # application-close timeout cancelling the outstanding ASGI instance.
        await asyncio.sleep(0.05)
        for task, _, _ in slow_requests:
            task.cancel()
        print("server_cancellation_requested", flush=True)
        await asyncio.sleep(0.05)
        await fast_request()
        assert not release.is_set()
        print("unrelated_request_completed_before_release", flush=True)
    finally:
        release.set()

    for task, _, _ in slow_requests:
        try:
            await asyncio.wait_for(task, timeout=3)
        except asyncio.CancelledError:
            pass
    if blocker is not None:
        await blocker
    assert all(event.is_set() for event in completed)
    print("cancelled_requests_drained", flush=True)
    await fast_request()
    print("subsequent_request_completed", flush=True)


if __name__ == "__main__":
    faulthandler.dump_traceback_later(10)
    asyncio.run(_run_cancellation_probe(int(sys.argv[1]), bool(int(sys.argv[2]))))
    faulthandler.cancel_dump_traceback_later()
