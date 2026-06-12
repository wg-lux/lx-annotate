from __future__ import annotations

import json
import os
import subprocess
import sys
import textwrap
from pathlib import Path

import pytest

pytestmark = pytest.mark.slow


REPO_ROOT = Path(__file__).resolve().parents[2]
RESULT_PREFIX = "LX_ANNOTATE_WORKER_IMPORT_SWEEP="

LUXNIX_WORKER_BASED_CELERY_PROFILES = (
    {
        "unit": "lx-annotate-celery-worker",
        "queues": ("maintenance", "default"),
    },
    {
        "unit": "lx-annotate-celery-pipeline-worker",
        "queues": ("pipeline",),
    },
    {
        "unit": "lx-annotate-celery-frame-extraction-worker",
        "queues": ("frame_extraction",),
    },
    {
        "unit": "lx-annotate-celery-ffmpeg-worker",
        "queues": ("ffmpeg_media",),
    },
    {
        "unit": "lx-annotate-celery-inference-worker",
        "queues": ("inference",),
    },
    {
        "unit": "lx-annotate-celery-training-worker",
        "queues": ("model_training",),
    },
    {
        "unit": "lx-annotate-celery-llm-inference-worker",
        "queues": ("llm_inference",),
    },
)


WORKER_IMPORT_SWEEP_SCRIPT = r"""
from __future__ import annotations

import importlib
import json
import os
import sys
import threading
import traceback
from pathlib import Path


PACKAGE_NAME = "lx_annotate"
RESULT_PREFIX = os.environ["LX_ANNOTATE_IMPORT_SWEEP_RESULT_PREFIX"]
WORKER_PROFILES = json.loads(os.environ["LX_ANNOTATE_IMPORT_SWEEP_WORKERS"])


def discover_package_modules() -> list[str]:
    package_root = Path.cwd() / PACKAGE_NAME
    module_names: set[str] = set()
    for path in package_root.rglob("*.py"):
        if "__pycache__" in path.parts:
            continue
        relative = path.relative_to(Path.cwd()).with_suffix("")
        parts = relative.parts
        if parts[-1] == "__init__":
            parts = parts[:-1]
        module_names.add(".".join(parts))

    # Production settings assert security invariants at import time. Import them
    # before settings_dev, which intentionally relaxes the shared base settings.
    import_priority = {
        "lx_annotate.settings.settings_prod": -100,
        "lx_annotate.settings.settings_dev": 100,
    }
    return sorted(module_names, key=lambda name: (import_priority.get(name, 0), name))


def ensure_django_ready() -> None:
    import django
    from django.apps import apps

    if not apps.ready:
        django.setup()


def import_modules_for_worker(
    profile: dict[str, object],
    module_names: list[str],
    import_lock: threading.Lock,
    result_lock: threading.Lock,
    results: list[dict[str, object]],
) -> None:
    failures: list[dict[str, str]] = []

    # os.environ is process-global. Serialize each worker-like import sweep so
    # the thread name and queue metadata remain coherent while imports run.
    with import_lock:
        os.environ["LX_ANNOTATE_CELERY_WORKER_UNIT"] = str(profile["unit"])
        os.environ["LX_ANNOTATE_CELERY_WORKER_QUEUES"] = ",".join(
            str(queue) for queue in profile["queues"]
        )

        try:
            ensure_django_ready()
        except BaseException as exc:  # noqa: BLE001
            failures.append(
                {
                    "module": "django.setup",
                    "error": f"{type(exc).__name__}: {exc}",
                    "traceback": traceback.format_exc(),
                }
            )

        for module_name in module_names:
            try:
                importlib.import_module(module_name)
            except BaseException as exc:  # noqa: BLE001
                failures.append(
                    {
                        "module": module_name,
                        "error": f"{type(exc).__name__}: {exc}",
                        "traceback": traceback.format_exc(),
                    }
                )

    with result_lock:
        results.append(
            {
                "unit": profile["unit"],
                "queues": profile["queues"],
                "thread_name": threading.current_thread().name,
                "imported_count": len(module_names),
                "failures": failures,
            }
        )


def main() -> int:
    module_names = discover_package_modules()
    import_lock = threading.Lock()
    result_lock = threading.Lock()
    results: list[dict[str, object]] = []
    threads = [
        threading.Thread(
            target=import_modules_for_worker,
            name=str(profile["unit"]),
            args=(profile, module_names, import_lock, result_lock, results),
        )
        for profile in WORKER_PROFILES
    ]

    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join(timeout=120)

    stuck_threads = [thread.name for thread in threads if thread.is_alive()]
    payload = {
        "module_count": len(module_names),
        "modules": module_names,
        "worker_count": len(WORKER_PROFILES),
        "results": sorted(results, key=lambda result: str(result["unit"])),
        "stuck_threads": stuck_threads,
    }
    print(f"{RESULT_PREFIX}{json.dumps(payload, sort_keys=True)}")
    return 1 if stuck_threads else 0


if __name__ == "__main__":
    sys.exit(main())
"""


def _build_worker_import_env(tmp_path: Path) -> dict[str, str]:
    runtime_root = tmp_path / "runtime"
    data_root = runtime_root / "data"
    storage_root = data_root / "storage"

    env = os.environ.copy()
    env.update(
        {
            "DATA_DIR": str(data_root),
            "CELERY_LLM_INFERENCE_QUEUE": "llm_inference",
            "DJANGO_CORS_ALLOWED_ORIGINS": "https://lx-annotate.local",
            "DJANGO_CSRF_TRUSTED_ORIGINS": "https://lx-annotate.local",
            "DJANGO_DB_PASSWORD": "worker-import-test-db-password",
            "DJANGO_KEYCLOAK_CLIENT_SECRET": "worker-import-test-keycloak-secret",
            "DJANGO_SECRET_KEY": "worker-import-test-secret-key-000000000000",
            "DJANGO_SETTINGS_MODULE": "lx_annotate.settings.settings_test",
            "DJANGO_STATIC_ROOT": str(runtime_root / "staticfiles"),
            "HF_HUB_OFFLINE": "1",
            "HOME_DIR": str(runtime_root / "home"),
            "LLM_BASE_URL": "http://127.0.0.1:11434",
            "LLM_ENABLED": "true",
            "LLM_MODEL": "lx-gemma4-e2b-json",
            "LLM_PROVIDER": "ollama",
            "LX_ANNOTATE_DATA_DIR": str(data_root),
            "LX_ANNOTATE_ENCRYPTED_DATA_DIR": str(data_root),
            "LX_ANNOTATE_IMPORT_SWEEP_RESULT_PREFIX": RESULT_PREFIX,
            "LX_ANNOTATE_IMPORT_SWEEP_WORKERS": json.dumps(
                LUXNIX_WORKER_BASED_CELERY_PROFILES
            ),
            "OIDC_RP_CLIENT_SECRET": "worker-import-test-keycloak-secret",
            "PROTECTED_MEDIA_ROOT": str(storage_root),
            "RUN_AI_TESTS": "0",
            "RUN_VIDEO_TESTS": "0",
            "STORAGE_DIR": str(storage_root),
            "TRANSFORMERS_OFFLINE": "1",
        }
    )
    return env


def _format_import_failures(payload: dict[str, object]) -> str:
    lines: list[str] = []
    for result in payload["results"]:
        for failure in result["failures"]:
            lines.append(
                f"{result['unit']} failed importing {failure['module']}: "
                f"{failure['error']}"
            )
            traceback_lines = str(failure["traceback"]).strip().splitlines()
            lines.extend(f"    {line}" for line in traceback_lines[-8:])
    return "\n".join(lines)


def test_lx_annotate_modules_import_inside_luxnix_worker_threads(
    tmp_path: Path,
) -> None:
    completed = subprocess.run(
        [sys.executable, "-c", textwrap.dedent(WORKER_IMPORT_SWEEP_SCRIPT)],
        cwd=REPO_ROOT,
        env=_build_worker_import_env(tmp_path),
        text=True,
        capture_output=True,
        timeout=180,
        check=False,
    )

    output = f"{completed.stdout}\n{completed.stderr}"
    result_lines = [
        line for line in completed.stdout.splitlines() if line.startswith(RESULT_PREFIX)
    ]
    if completed.returncode != 0 and not result_lines:
        pytest.fail(
            "Worker-thread import sweep exited before reporting results.\n\n"
            f"stdout/stderr:\n{output}"
        )

    assert result_lines, (
        f"Missing import sweep result marker.\n\nstdout/stderr:\n{output}"
    )
    payload = json.loads(result_lines[-1][len(RESULT_PREFIX) :])

    assert payload["stuck_threads"] == []
    assert payload["module_count"] > 0
    assert payload["worker_count"] == len(LUXNIX_WORKER_BASED_CELERY_PROFILES)
    assert {result["unit"] for result in payload["results"]} == {
        worker["unit"] for worker in LUXNIX_WORKER_BASED_CELERY_PROFILES
    }

    failure_report = _format_import_failures(payload)
    assert not failure_report, failure_report


# pyright: reportGeneralTypeIssues=false
