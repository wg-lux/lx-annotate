from __future__ import annotations

from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]


def _read(rel_path: str) -> str:
    return (REPO_ROOT / rel_path).read_text(encoding="utf-8")


def test_wheel_runtime_splits_code_and_data_roots():
    deploy_sh = _read("deploy/deploy.sh")
    service_unit = _read("deploy/lx-annotate.service")

    assert 'APP_DIR="${APP_DIR:-/home/lx-annotate/lx-annotate-wheel}"' in deploy_sh
    assert 'DATA_DIR="${DATA_DIR:-/var/lib/lx-annotate/data}"' in deploy_sh
    assert 'STATE_DIR="${STATE_DIR:-/var/lib/lx-annotate}"' in deploy_sh
    assert 'VENV_DIR="${VENV_DIR:-$APP_DIR/.venv}"' in deploy_sh
    assert 'ENV_FILE="${ENV_FILE:-$STATE_DIR/.env.systemd}"' in deploy_sh
    assert 'DJANGO_STATIC_ROOT="${DJANGO_STATIC_ROOT:-$STATIC_ROOT}"' in deploy_sh
    assert (
        'LX_ANNOTATE_ENCRYPTED_DATA_DIR="${LX_ANNOTATE_ENCRYPTED_DATA_DIR:-$DATA_DIR}"'
        in deploy_sh
    )
    assert (
        'LX_ANNOTATE_DATA_DIR="${LX_ANNOTATE_DATA_DIR:-$LX_ANNOTATE_ENCRYPTED_DATA_DIR}"'
        in deploy_sh
    )
    assert "EnvironmentFile=/var/lib/lx-annotate/.env.systemd" in service_unit
    assert "WorkingDirectory=/home/lx-annotate/lx-annotate-wheel" in service_unit
    assert (
        "ExecStart=/home/lx-annotate/lx-annotate-wheel/.venv/bin/daphne" in service_unit
    )


def test_wheel_runtime_documents_encrypted_data_boundary():
    readme = _read("README.md")
    guide = _read("docs/guides/deployment-strategy.md")
    wheel_guide = _read("docs/guides/wheel-deployment.md")

    assert "encrypting the data path" in readme
    assert "`LX_ANNOTATE_ENCRYPTED_DATA_DIR`" in readme
    assert "code and virtualenv under the service user home" in guide
    assert (
        "data, staticfiles, and `.env.systemd` under `/var/lib/lx-annotate`"
        in wheel_guide
    )
    assert "should not generate or manage encryption keys itself" in wheel_guide


def test_deploy_script_disables_pip_cache_growth():
    deploy_sh = _read("deploy/deploy.sh")

    assert "PIP_NO_CACHE_DIR=1" in deploy_sh
    assert "install --no-cache-dir --upgrade pip" in deploy_sh
    assert "install --no-cache-dir --upgrade --force-reinstall" in deploy_sh


def test_wheel_deployment_guide_documents_manual_migration_recovery():
    guide = _read("docs/guides/wheel-deployment.md")

    assert "## Failure Recovery" in guide
    assert "not auto-rolled back" in guide
    assert "Restore the previous database state" in guide
    assert "previous known-good wheel" in guide


def test_keycloak_wheel_boot_behavior_is_documented_and_matches_settings():
    guide = _read("docs/guides/wheel-deployment.md")
    settings_prod = _read("lx_annotate/settings/settings_prod.py")

    assert "with `ENFORCE_AUTH=0`, auth is disabled" in guide
    assert "with `ENFORCE_AUTH=1`, startup fails hard" in guide
    assert "if ENFORCE_AUTH:" in settings_prod
    assert (
        'print("🔓 ENFORCE_AUTH=0 → Keycloak disabled, no authentication")'
        in settings_prod
    )


def test_watcher_runs_as_separate_systemd_unit():
    watcher_unit = _read("deploy/lx-annotate-watcher.service")
    guide = _read("docs/guides/wheel-deployment.md")

    assert "Description=lx-annotate file watcher" in watcher_unit
    assert "WorkingDirectory=/home/lx-annotate/lx-annotate-wheel" in watcher_unit
    assert (
        "ExecStart=/home/lx-annotate/lx-annotate-wheel/.venv/bin/django-admin run_filewatcher"
        in watcher_unit
    )
    assert "PartOf=lx-annotate.service" in watcher_unit
    assert "## Service Isolation" in guide


def test_static_and_media_handoff_is_pinned_to_nginx_contract():
    nginx_conf = _read("deploy/nginx-lx-annotate.conf")
    guide = _read("docs/guides/wheel-deployment.md")

    assert "location /static/" in nginx_conf
    assert "alias /var/lib/lx-annotate/staticfiles/;" in nginx_conf
    assert "location /media/" in nginx_conf
    assert "alias /var/lib/lx-annotate/data/;" in nginx_conf
    assert "location /protected_media/" in nginx_conf
    assert "internal;" in nginx_conf
    assert "Daphne should not serve static bundles directly" in guide


def test_protected_media_nginx_contract_is_explicitly_documented():
    nginx_conf = _read("deploy/nginx-lx-annotate.conf")
    guide = _read("docs/guides/wheel-deployment.md")

    assert "X-Accel-Redirect" in nginx_conf
    assert "still needs to emit the appropriate `X-Accel-Redirect` headers" in guide


def test_secret_hygiene_is_called_out_for_systemd_and_journald():
    deploy_sh = _read("deploy/deploy.sh")
    guide = _read("docs/guides/wheel-deployment.md")

    assert "set -euo pipefail" in deploy_sh
    assert "set -x" not in deploy_sh
    assert "restrict `journalctl` access" in guide
    assert "Do not add shell tracing" in guide


def test_host_binary_drift_policy_is_documented():
    guide = _read("docs/guides/wheel-deployment.md")
    bootstrap = _read("deploy/bootstrap-host.sh")

    assert "minor package drift is now an operational concern" in guide
    assert "pin or hold them if needed" in guide
    assert "ffmpeg" in bootstrap
    assert "tesseract-ocr" in bootstrap


def test_dev_prod_drift_process_is_documented():
    guide = _read("docs/guides/wheel-deployment.md")

    assert (
        "update `deploy/bootstrap-host.sh` whenever runtime dependencies change"
        in guide
    )
    assert "rehearsed outside production" in guide
