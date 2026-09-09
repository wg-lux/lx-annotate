"""Real broker/worker recovery; media/DB convergence is a separate acceptance gate.

Run with the installed release dependencies and redis-server on PATH. CI
provisions and checks that executable before invoking this integration lane.
No broker,
database, media, or credentials from a deployed host are used. The production
visibility window stays intact; only an isolated Redis reservation is aged.
"""

from __future__ import annotations

import os
import shutil
import signal
import subprocess
import sys
import textwrap
import time
from pathlib import Path

import pytest
import redis

from tests.system.test_production_celery_routing import (
    REPO_ROOT,
    _production_settings_environment,
)


@pytest.mark.integration
def test_production_hls_real_redis_worker_loss_and_visibility(tmp_path: Path) -> None:
    executable = shutil.which("redis-server")
    if executable is None:
        message = "This integration lane requires redis-server on PATH"
        pytest.skip(message)
    socket = tmp_path / "redis.sock"
    broker = f"redis+socket://{socket}?virtual_host=0"
    client = redis.Redis(unix_socket_path=str(socket))
    if not isinstance(executable, str):
        raise TypeError()
    server = subprocess.Popen(
        [
            executable,
            "--port",
            "0",
            "--unixsocket",
            str(socket),
            "--unixsocketperm",
            "700",
            "--save",
            "",
            "--appendonly",
            "no",
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.PIPE,
        text=True,
    )
    try:
        deadline = time.monotonic() + 10
        while True:
            try:
                if client.ping():
                    break
            except redis.ConnectionError:
                pass
            if server.poll() is not None or time.monotonic() >= deadline:
                pytest.fail("Disposable Redis did not become ready")
            time.sleep(0.05)

        env = _production_settings_environment(tmp_path)
        env["CELERY_BROKER_URL"] = broker
        env["RECOVERY_TEST_REDIS_SOCKET"] = str(socket)
        probe = textwrap.dedent(
            r"""
            import base64
            import hashlib
            import importlib
            import importlib.metadata
            import json
            import os
            from pathlib import Path
            import signal
            import time

            import django
            import redis
            django.setup()
            from celery.contrib.testing.worker import start_worker
            from celery.signals import task_failure, task_prerun
            from lx_annotate.celery import app

            app.loader.import_default_modules()
            name = "endoreg_db.tasks.video_hls_materialization"
            task = app.tasks[name]
            assert task.acks_late and task.reject_on_worker_lost
            assert task.time_limit < app.conf.visibility_timeout
            assert app.conf.visibility_timeout == 93600
            assert app.conf.broker_transport_options["visibility_timeout"] == 93600

            # Verify the actual imported module against installed wheel RECORD,
            # so an unrecorded site-packages hotfix cannot pass as a release.
            for package, modules in (
                ("endoreg-db", (
                    "endoreg_db.tasks", "endoreg_db.services.hls_media",
                    "endoreg_db.import_files.file_storage.state_management",
                    "endoreg_db.services.hub.ingest")),
                ("lx-dtypes", ("lx_dtypes.models.contracts.video_segments",)),
            ):
                distribution = importlib.metadata.distribution(package)
                for module_name in modules:
                    module = importlib.import_module(module_name)
                    relative_path = module_name.replace(".", "/") + ".py"
                    record = next(p for p in distribution.files if str(p) == relative_path)
                    module_path = Path(module.__file__).resolve()
                    assert Path(distribution.locate_file(record)).resolve() == module_path
                    digest = hashlib.sha256(module_path.read_bytes()).digest()
                    assert record.hash and record.hash.mode == "sha256"
                    assert base64.urlsafe_b64encode(digest).rstrip(b"=").decode() == record.hash.value, module_name
                    print(json.dumps({"event": "installed_module_attestation",
                        "package": package, "version": distribution.version, "module": str(module_path),
                        "module_sha256": digest.hex(),
                        "record_sha256": hashlib.sha256(distribution.read_text("RECORD").encode()).hexdigest(),
                        "celery": importlib.metadata.version("celery"),
                        "kombu": importlib.metadata.version("kombu")}), flush=True)

            client = redis.Redis(unix_socket_path=os.environ["RECOVERY_TEST_REDIS_SOCKET"])
            # Observe genuine Celery failure signals in Redis; production has
            # no result backend, and this test preserves that configuration.
            queue = "ffmpeg_media"
            routed = app.amqp.router.route({}, name, args=(1,), kwargs={})
            assert routed["queue"].name == queue

            # Publish the real task implicitly and reserve through real Kombu.
            # No worker runs yet, so this cannot touch application data.
            task.apply_async(args=(1,))
            with app.connection_for_read() as connection:
                channel = connection.channel()
                message = channel.basic_get(queue)
                assert message is not None
                tag = message.delivery_tag
                qos = channel.qos
                assert client.zscore(qos.unacked_index_key, tag) is not None
                qos.restore_visible(interval=1)
                assert channel.basic_get(queue) is None, "Unexpired work was redelivered"
                client.zadd(qos.unacked_index_key, {tag: time.time() - 93601})
                qos.restore_visible(interval=1)
                restored = channel.basic_get(queue)
                assert restored is not None
                assert restored.headers["redelivered"] is True
                restored.ack()
                assert client.zcard(qos.unacked_index_key) == 0

            # Kill the real prefork child at task entry once. The replacement
            # executes the unchanged HLS task, which rejects missing reservation
            # identity before accessing media or the database.
            def inject_loss(sender=None, task_id=None, **kwargs):
                if sender.name != name:
                    return
                observer = redis.Redis(unix_socket_path=os.environ["RECOVERY_TEST_REDIS_SOCKET"])
                observer.rpush("attempts:" + task_id,
                    json.dumps(sender.request.delivery_info))
                if observer.set("injected-loss", task_id, nx=True):
                    os.kill(os.getpid(), signal.SIGKILL)

            def record_failure(sender=None, task_id=None, exception=None, **kwargs):
                if sender.name == name:
                    observer = redis.Redis(unix_socket_path=os.environ["RECOVERY_TEST_REDIS_SOCKET"])
                    observer.set("failure:" + task_id, json.dumps({
                        "type": type(exception).__name__, "message": str(exception)}))

            task_prerun.connect(inject_loss, weak=False)
            task_failure.connect(record_failure, weak=False)
            try:
                with start_worker(app, pool="prefork", concurrency=1,
                                  queues=[queue], perform_ping_check=False,
                                  shutdown_timeout=20, loglevel="ERROR"):
                    implicit = task.apply_async(args=(1,))
                    explicit = task.apply_async(args=(1,), queue=queue, routing_key=queue)
                    for result in (implicit, explicit):
                        deadline = time.monotonic() + 60
                        while not client.exists("failure:" + result.id):
                            assert time.monotonic() < deadline, "No terminal HLS failure reported"
                            time.sleep(0.1)
                        failure = json.loads(client.get("failure:" + result.id))
                        assert failure["type"] == "ValueError", failure
                        assert "durable reservation identity" in failure["message"]
                    attempts = [json.loads(value) for value in client.lrange("attempts:" + implicit.id, 0, -1)]
                    assert len(attempts) == 2, attempts
                    assert attempts[0]["routing_key"] == queue
                    assert attempts[1]["redelivered"] is True
                    assert client.llen("attempts:" + explicit.id) == 1
                # A fresh worker must not repeat terminally failed/ACKed work.
                with start_worker(app, pool="prefork", concurrency=1,
                                  queues=[queue], perform_ping_check=False,
                                  shutdown_timeout=20, loglevel="ERROR"):
                    time.sleep(2)
                assert client.llen("attempts:" + implicit.id) == 2
                assert client.llen("attempts:" + explicit.id) == 1
                assert client.zcard("unacked_index") == 0
                assert client.llen(queue) == 0
            finally:
                task_prerun.disconnect(inject_loss)
                task_failure.disconnect(record_failure)
            print("Real Redis visibility, worker-loss redelivery, terminal failure and restart checks passed", flush=True)
            """,
        )
        process = subprocess.Popen(
            [sys.executable, "-c", probe],
            cwd=REPO_ROOT,
            env=env,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            start_new_session=True,
        )
        try:
            stdout, stderr = process.communicate(timeout=150)
        finally:
            # Bound the entire worker process group even when the probe hangs
            # or fails inside startup; do not leave disposable workers behind.
            try:
                os.killpg(process.pid, signal.SIGKILL)
            except ProcessLookupError:
                pass
            process.communicate(timeout=10)
        assert process.returncode == 0, (
            f"Redis recovery probe failed.\n{stdout}\n{stderr}"
        )
        print(stdout)
    finally:
        client.close()
        server.terminate()
        try:
            server.communicate(timeout=10)
        except subprocess.TimeoutExpired:
            server.kill()
            server.communicate(timeout=10)
