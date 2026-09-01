from __future__ import annotations

import os
import subprocess
import sys
import textwrap
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]


def _production_settings_environment(tmp_path: Path) -> dict[str, str]:
    data_root = tmp_path / "runtime-data"
    storage_root = data_root / "storage"
    static_root = tmp_path / "staticfiles"

    storage_root.mkdir(parents=True)
    static_root.mkdir(parents=True)
    # Prevent a developer-local repository .env.systemd from affecting the
    # isolated production-settings probe.
    (data_root / ".env.systemd").write_text("", encoding="utf-8")

    env = os.environ.copy()
    env.update(
        {
            "CELERY_BROKER_URL": "redis://localhost:6379/1",
            "CELERY_DEFAULT_QUEUE": "default",
            "CELERY_HUB_TRANSFER_QUEUE": "hub_transfer",
            "DATA_DIR": str(data_root),
            "DJANGO_ALLOWED_HOSTS": "localhost,127.0.0.1",
            "DJANGO_CORS_ALLOWED_ORIGINS": "http://127.0.0.1",
            "DJANGO_CSRF_TRUSTED_ORIGINS": "http://127.0.0.1",
            "DJANGO_DB_HOST": "localhost",
            "DJANGO_DB_NAME": "lx_annotate",
            "DJANGO_DB_PASSWORD": "production-routing-test-password",
            "DJANGO_DB_PORT": "5432",
            "DJANGO_DB_USER": "lx_annotate",
            "DJANGO_DEBUG": "False",
            "DJANGO_KEYCLOAK_CLIENT_SECRET": (
                "production-routing-test-keycloak-secret"
            ),
            "DJANGO_SECRET_KEY": (
                "production-routing-test-secret-key-00000000000000000000"
            ),
            "DJANGO_SETTINGS_MODULE": "lx_annotate.settings.settings_prod",
            "DJANGO_STATIC_ROOT": str(static_root),
            "ENDOREG_DEPLOYMENT_ROLE": "site_node",
            "ENDOREG_ENABLE_INCOMING_HUB_TRANSFERS": "false",
            "ENDOREG_HUB_MODE": "false",
            "ENFORCE_AUTH": "0",
            "LX_ANNOTATE_DATA_DIR": str(data_root),
            "LX_ANNOTATE_ENCRYPTED_DATA_DIR": str(data_root),
            "LX_ANNOTATE_HUB_EXPORT_AUTO_QUEUE": "false",
            "OIDC_RP_CLIENT_SECRET": ("production-routing-test-keycloak-secret"),
            "PROTECTED_MEDIA_ROOT": str(storage_root),
            "STORAGE_DIR": str(storage_root),
        },
    )
    return env


def test_production_settings_export_hub_transfer_routes(tmp_path: Path) -> None:
    probe = textwrap.dedent(
        """
        from celery import Celery
        from lx_annotate.settings import settings_prod

        app = Celery("production-routing-test")
        app.config_from_object(settings_prod, namespace="CELERY")

        assert app.conf.broker_url == "redis://localhost:6379/1"
        assert app.conf.task_default_queue == "default"
        assert app.conf.task_create_missing_queues is False
        assert "hub_transfer" in {
            queue.name for queue in app.conf.task_queues
        }

        for task_name in (
            "lx_annotate.run_outbound_hub_transfer_job",
            "lx_annotate.reconcile_outbound_hub_transfer_job",
            "lx_annotate.recover_stale_outbound_hub_transfer_jobs",
        ):
            route = app.amqp.router.route(
                {},
                task_name,
                args=(),
                kwargs={},
            )
            queue = route.get("queue")
            queue_name = getattr(queue, "name", queue)
            assert queue_name == "hub_transfer", (task_name, route)
            assert route.get("routing_key") == "hub_transfer", (
                task_name,
                route,
            )
        """,
    )

    completed = subprocess.run(
        [sys.executable, "-c", probe],
        cwd=REPO_ROOT,
        env=_production_settings_environment(tmp_path),
        text=True,
        capture_output=True,
        timeout=30,
        check=False,
    )

    assert completed.returncode == 0, (
        "Production Celery routing probe failed.\n\n"
        f"stdout:\n{completed.stdout}\n\n"
        f"stderr:\n{completed.stderr}"
    )
