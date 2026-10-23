"""Opt-in installed-wheel one-shot acceptance against disposable PostgreSQL."""

from __future__ import annotations

import json
import os
import subprocess
from pathlib import Path

import pytest
from django.conf import settings
from endoreg_db.utils.file_operations import atomic_write_file, ensure_directory


@pytest.mark.skipif(
    not os.environ.get("WATCHER_ACCEPTANCE_PYTHON"),
    reason="Candidate wheel interpreter required",
)
@pytest.mark.django_db(transaction=True)
def test_packaged_one_shot_readiness_and_retry(tmp_path):
    configured = os.environ.get("WATCHER_ACCEPTANCE_PYTHON")
    if not configured:
        pytest.skip("Set WATCHER_ACCEPTANCE_PYTHON to the candidate wheel interpreter")
    python = Path(configured).absolute()
    command = Path(configured).parent / "lx-annotate-watch"
    assert command.is_file()
    runtime = tmp_path / "runtime"
    secret_dir = ensure_directory(tmp_path / "test-secrets")
    env = {
        key: os.environ[key]
        for key in ("PATH", "LD_LIBRARY_PATH", "SSL_CERT_FILE")
        if key in os.environ
    }
    env.update(
        {
            "HOME": str(tmp_path),
            "DJANGO_SETTINGS_MODULE": "lx_annotate.settings.settings_prod",
            "LX_RUNTIME_ROOT": str(runtime),
            "LX_ANNOTATE_ENCRYPTED_DATA_DIR": str(runtime),
            "DJANGO_ALLOWED_HOSTS": "localhost",
            "DJANGO_CSRF_TRUSTED_ORIGINS": "https://localhost",
            "DJANGO_CORS_ALLOWED_ORIGINS": "https://localhost",
            "DJANGO_STATIC_ROOT": str(tmp_path / "static"),
            "DJANGO_DB_HOST": str(settings.DATABASES["default"]["HOST"]),
            "DJANGO_DB_PORT": str(settings.DATABASES["default"]["PORT"]),
            "DJANGO_DB_NAME": str(settings.DATABASES["default"]["NAME"]),
            "DJANGO_DB_USER": str(settings.DATABASES["default"]["USER"]),
            "DJANGO_DB_SSLMODE": "disable",  # disposable local pytest-postgresql only
            "ENDOREG_DEPLOYMENT_ROLE": "standalone",
            "ENFORCE_AUTH": "1",
            "NGINX_PROTECTED_MEDIA_URL": "/protected_media/",
            "LX_ANNOTATE_DEFAULT_CENTER": "packaged-watcher-test",
        }
    )
    for variable in (
        "DJANGO_SECRET_KEY",
        "DJANGO_DB_PASSWORD",
        "DJANGO_KEYCLOAK_CLIENT_SECRET",
        "DJANGO_SALT",
    ):
        path = secret_dir / variable.lower()
        value = "isolated-watcher-acceptance-test-only-00000000000000"
        if variable == "DJANGO_DB_PASSWORD":
            # pytest-postgresql normally uses local trust; preserve a configured
            # fixture password if authentication was explicitly requested.
            value = settings.DATABASES["default"]["PASSWORD"] or value
        atomic_write_file(
            destination=path,
            content=(value.encode(),),
            file_mode=0o600,
        )
        env[variable + "_FILE"] = str(path)
    ensure_directory(runtime)
    atomic_write_file(
        destination=runtime / ".env.systemd", content=(b"",), file_mode=0o600
    )

    def run(arguments, *, timeout=90):
        result = subprocess.run(
            arguments,
            cwd=tmp_path,
            env=env,
            text=True,
            capture_output=True,
            timeout=timeout,
        )
        assert result.returncode == 0, result.stdout + result.stderr
        return result.stdout + result.stderr

    # Bootstrap canonical directories; attest actual loaded wheel files before
    # invoking the console script with unchanged readiness and Django checks.
    run(
        [
            str(python),
            "-c",
            """
import base64, hashlib, importlib, importlib.metadata, sys
from pathlib import Path
import django
django.setup()
from endoreg_db.utils.paths import get_runtime_paths
get_runtime_paths().ensure_directories()
for package, name in (("lx-annotate", "lx_annotate.file_watcher"),
                      ("endoreg-db", "endoreg_db.services.hub.ingest"),
                      ("endoreg-db", "endoreg_db.endoreg_rust_backend"),
                      ("lx-dtypes", "lx_dtypes.models.contracts.report_anonymization"),
                      ("lx-anonymizer", "lx_anonymizer.report_reader")):
    module = importlib.import_module(name)
    path = Path(module.__file__).resolve()
    assert path.is_relative_to(Path(sys.prefix)), (name, path)
    dist = importlib.metadata.distribution(package)
    assert Path(dist.locate_file("")).resolve().is_relative_to(Path(sys.prefix))
    records = [p for p in dist.files or () if Path(dist.locate_file(p)).resolve() == path]
    assert len(records) == 1 and records[0].hash
    digest = base64.urlsafe_b64encode(hashlib.sha256(path.read_bytes()).digest()).rstrip(b"=").decode()
    assert records[0].hash.value == digest, name
""",
        ]
    )
    observer = ensure_directory(tmp_path / "observer")
    atomic_write_file(
        destination=observer / "sitecustomize.py",
        content=(
            b"""
import atexit, json, os, resource, sys, time
start = time.perf_counter()
def observe():
    with open(os.environ["WATCHER_METRICS"], "w") as output:
        json.dump(dict(wall=time.perf_counter()-start, cpu=time.process_time(),
                       rss_kib=resource.getrusage(resource.RUSAGE_SELF).ru_maxrss,
                       ocr="tesserocr" in sys.modules), output)
atexit.register(observe)
""",
        ),
    )
    env["PYTHONPATH"] = str(observer)
    metrics = tmp_path / "metrics.json"
    env["WATCHER_METRICS"] = str(metrics)
    results, baseline_results = [], []
    baseline = os.environ.get("WATCHER_ACCEPTANCE_BASELINE_PYTHON")
    for _ in range(3):
        output = run([str(command), "--once"])
        assert "submitted=0" in output
        measurement = json.loads(metrics.read_text())
        assert measurement["ocr"] is False
        results.append(measurement)
        if baseline:
            baseline_command = Path(baseline).parent / "lx-annotate-watch"
            output = run([str(baseline_command), "--once"])
            assert "submitted=0" in output
            measurement = json.loads(metrics.read_text())
            assert measurement["ocr"] is True
            baseline_results.append(measurement)

    atomic_write_file(
        destination=tmp_path / "unprovisioned", content=(b"not a directory",)
    )
    invalid_env = {
        **env,
        "LX_RUNTIME_ROOT": str(tmp_path / "unprovisioned"),
        "LX_ANNOTATE_ENCRYPTED_DATA_DIR": str(tmp_path / "unprovisioned"),
    }
    failed = subprocess.run(
        [str(command), "--once"],
        cwd=tmp_path,
        env=invalid_env,
        capture_output=True,
        text=True,
        timeout=90,
    )
    assert failed.returncode != 0
    assert (
        "FileExistsError" in failed.stdout + failed.stderr
        or "NotADirectoryError" in failed.stdout + failed.stderr
    )
    assert json.loads(metrics.read_text())["ocr"] is False

    # A file arriving after an empty invocation remains discoverable by the next
    # timer/path invocation. Zero bytes exercise real backend settle deferral,
    # without importing a document or requiring an application encryption key.
    from endoreg_db.utils.paths import EndoregPathsModel

    report_dir = EndoregPathsModel.from_root(runtime).watcher_report_drop
    nested = ensure_directory(report_dir / "nested")
    source = nested / "unfinished.txt"
    atomic_write_file(destination=source, content=(b"",))
    for _ in range(2):
        output = run([str(command), "--once"])
        assert "submitted=1" in output
        assert "not ready yet, deferring" in output
        assert source.exists() and source.stat().st_size == 0
        assert json.loads(metrics.read_text())["ocr"] is True
    from endoreg_db.models import UploadJob

    assert not UploadJob.objects.filter(source_system="watcher").exists()
    print(
        "PACKAGED_WATCHER_METRICS="
        + json.dumps({"candidate": results, "baseline": baseline_results})
    )
