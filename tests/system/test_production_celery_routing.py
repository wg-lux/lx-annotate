from __future__ import annotations

import hashlib
import os
import secrets
import subprocess
import sys
import textwrap
from pathlib import Path

import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.x25519 import X25519PrivateKey
from endoreg_db.utils.file_operations import atomic_write_file

REPO_ROOT = Path(__file__).resolve().parents[2]


def _isolated_probe_environment() -> dict[str, str]:
    """Keep host tooling while removing inherited settings and secret selectors."""
    env = os.environ.copy()
    for name in (
        "DJANGO_SETTINGS_MODULE",
        "DJANGO_SALT",
        "DJANGO_SALT_FILE",
        "DJANGO_IDENTITY_SALT_KEYRING_FILE",
        "DJANGO_IDENTITY_CENTER_ID",
        "DJANGO_IDENTITY_SALT_GENERATION",
        "DJANGO_SECRET_KEY",
        "DJANGO_SECRET_KEY_FILE",
        "DJANGO_SIGNING_KEYRING_FILE",
    ):
        env.pop(name, None)
    # Celery can read process-level overrides even with settings.configure().
    for name in tuple(env):
        if name.startswith("CELERY_"):
            env.pop(name)
    return env


def _production_settings_environment(tmp_path: Path) -> dict[str, str]:
    data_root = tmp_path / "runtime-data"
    storage_root = data_root / "storage"
    static_root = tmp_path / "staticfiles"

    storage_root.mkdir(parents=True)
    static_root.mkdir(parents=True)
    secret_root = tmp_path / "hub-secrets"
    secret_root.mkdir(parents=True)
    production_routing_test_identity_salt = secrets.token_hex(32).encode("ascii")

    salt_file = secret_root / "identity-salt"

    atomic_write_file(
        destination=salt_file,
        content=(production_routing_test_identity_salt + b"\n",),
        file_mode=0o600,
    )
    client_cert_file = secret_root / "hub-client-cert.pem"
    client_key_file = secret_root / "hub-client-key.pem"
    ca_file = secret_root / "hub-ca.pem"
    recipient_public_key_file = secret_root / "hub-recipient-public.pem"
    source_node_secret_file = secret_root / "hub-source-node-secret"
    client_cert_file.write_text("test-client-certificate", encoding="utf-8")
    client_key_file.write_text("test-client-private-key", encoding="utf-8")
    ca_file.write_text("test-ca-certificate", encoding="utf-8")
    recipient_key = X25519PrivateKey.generate()
    recipient_public_key_file.write_bytes(
        recipient_key.public_key().public_bytes(
            serialization.Encoding.PEM,
            serialization.PublicFormat.SubjectPublicKeyInfo,
        ),
    )
    source_node_secret_file.write_text("test-node-secret", encoding="utf-8")
    # Prevent a developer-local repository .env.systemd from affecting the
    # isolated production-settings probe.
    (data_root / ".env.systemd").write_text("", encoding="utf-8")

    env = _isolated_probe_environment()
    env.update(
        {
            "CELERY_BROKER_URL": "redis://localhost:6379/1",
            "CELERY_DEFAULT_QUEUE": "default",
            "CELERY_HUB_TRANSFER_QUEUE": "hub_transfer",
            "CELERY_VISIBILITY_TIMEOUT_SECONDS": "93600",
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
            "DJANGO_SALT_FILE": str(salt_file),
            "DJANGO_STATIC_ROOT": str(static_root),
            "ENDOREG_DEPLOYMENT_ROLE": "site_node",
            "ENDOREG_HUB_MODE": "false",
            "ENFORCE_AUTH": "0",
            "FFMPEG_TRANSCODE_TIMEOUT_SECONDS": "86400",
            "LX_RUNTIME_ROOT": str(data_root),
            "LX_ANNOTATE_HUB_EXPORT_AUTO_QUEUE": "false",
            "LX_ANNOTATE_HUB_EXPORT_CA_FILE": str(ca_file),
            "LX_ANNOTATE_HUB_EXPORT_CLIENT_CERT_FILE": str(client_cert_file),
            "LX_ANNOTATE_HUB_EXPORT_CLIENT_KEY_FILE": str(client_key_file),
            "LX_ANNOTATE_HUB_EXPORT_ENVELOPE_STAGING_DIR": (
                str(data_root / "hub-export-staging")
            ),
            "LX_ANNOTATE_HUB_EXPORT_LOCAL_CLEANUP_POLICY": ("retain_processed_media"),
            "LX_ANNOTATE_HUB_EXPORT_MAX_RETRIES": "7",
            "LX_ANNOTATE_HUB_EXPORT_RECIPIENT_PUBLIC_KEY_FILE": str(
                recipient_public_key_file,
            ),
            "LX_ANNOTATE_HUB_EXPORT_REQUIRE_MTLS": "true",
            "LX_ANNOTATE_HUB_EXPORT_REQUEST_TIMEOUT_SECONDS": "21600",
            "LX_ANNOTATE_HUB_EXPORT_STALE_AFTER_SECONDS": "25200",
            "LX_ANNOTATE_HUB_SOURCE_NODE_SECRET_FILE": str(source_node_secret_file),
            "OIDC_RP_CLIENT_SECRET": ("production-routing-test-keycloak-secret"),
        },
    )
    return env


@pytest.mark.parametrize("salt_mode", ["missing", "public", "blank"])
def test_production_settings_reject_unusable_identity_salt(
    tmp_path: Path,
    salt_mode: str,
) -> None:
    env = _production_settings_environment(tmp_path)
    salt_file = Path(env["DJANGO_SALT_FILE"])
    active_salt = salt_file.read_bytes().removesuffix(b"\n").decode("ascii")
    sensitive_values = [active_salt]
    if salt_mode == "missing":
        env.pop("DJANGO_SALT_FILE")
        # A valid inline key must not bypass production's file/keyring requirement.
        env["DJANGO_SALT"] = secrets.token_hex(32)
        sensitive_values.append(env["DJANGO_SALT"])
    elif salt_mode == "public":
        # Keep the valid contents so rejection specifically exercises permissions.
        salt_file.chmod(0o644)
    else:
        atomic_write_file(
            destination=salt_file,
            content=(b"",),
            file_mode=0o600,
        )
    result = subprocess.run(
        [sys.executable, "-c", "import lx_annotate.settings.settings_prod"],
        cwd=REPO_ROOT,
        env=env,
        text=True,
        capture_output=True,
        timeout=60,
    )
    diagnostics = result.stdout + result.stderr
    assert not any(value in diagnostics for value in sensitive_values), (
        "Identity key material appeared in subprocess output"
    )
    assert result.returncode != 0, "Production settings accepted an unusable salt"
    assert "ImproperlyConfigured" in result.stderr, result.stderr
    assert "salt" in result.stderr.lower(), result.stderr


def test_production_settings_revoke_retired_signing_generations(tmp_path: Path) -> None:
    import yaml

    env = _production_settings_environment(tmp_path)
    active = tmp_path / "active-signing"
    retiring = tmp_path / "retiring-signing"
    manifest = tmp_path / "signing.yml"
    active.write_text("active-production-signing-test-" * 3)
    retiring.write_text("retiring-production-signing-test-" * 3)
    manifest.write_text(
        yaml.safe_dump(
            {
                "schema_version": 1,
                "active": str(active),
                "retiring": [str(retiring)],
            }
        )
    )
    for path in (active, retiring, manifest):
        path.chmod(0o600)
    env["DJANGO_SIGNING_KEYRING_FILE"] = str(manifest)
    env.pop("DJANGO_SECRET_KEY", None)
    env.pop("DJANGO_SECRET_KEY_FILE", None)
    result = subprocess.run(
        [
            sys.executable,
            "-c",
            textwrap.dedent("""
            from django.conf import settings
            from django.core.signing import BadSignature, Signer
            assert settings.SECRET_KEY == "active-production-signing-test-" * 3
            assert settings.SECRET_KEY_FALLBACKS == []
            old = Signer(key="retiring-production-signing-test-" * 3, fallback_keys=[]).sign("probe")
            try:
                Signer().unsign(old)
            except BadSignature:
                pass
            else:
                raise AssertionError("Retired signing generation remained trusted")
        """),
        ],
        cwd=REPO_ROOT,
        env=env,
        text=True,
        capture_output=True,
        timeout=60,
    )
    assert result.returncode == 0, result.stderr


def test_production_settings_export_hub_transfer_routes(tmp_path: Path) -> None:
    probe = textwrap.dedent(
        """
        from celery import Celery
        from lx_annotate.celery import app as production_app
        from lx_annotate.settings import settings_prod

        app = Celery("production-routing-test")
        app.config_from_object(settings_prod, namespace="CELERY")

        cleanup = app.conf.beat_schedule["cleanup-media-sources"]
        assert cleanup["task"] == "endoreg_db.cleanup_media_sources"
        assert cleanup["schedule"] == 900
        assert cleanup["options"]["expires"] < cleanup["schedule"]
        assert cleanup["options"]["queue"] == settings_prod.CELERY_MAINTENANCE_QUEUE
        cleanup_route = app.amqp.router.route({}, cleanup["task"], args=(), kwargs={})
        assert cleanup_route["queue"].name == settings_prod.CELERY_MAINTENANCE_QUEUE

        assert app.conf.broker_url == "redis://localhost:6379/1"
        assert app.conf.task_default_queue == "default"
        assert app.conf.task_create_missing_queues is False
        assert settings_prod.CELERY_VISIBILITY_TIMEOUT == 93600
        assert settings_prod.CELERY_BROKER_TRANSPORT_OPTIONS == {
            "visibility_timeout": 93600,
        }
        assert settings_prod.CELERY_RESULT_BACKEND_TRANSPORT_OPTIONS == {
            "visibility_timeout": 93600,
        }
        assert app.conf.broker_transport_options == {"visibility_timeout": 93600}
        assert app.conf.result_backend_transport_options == {
            "visibility_timeout": 93600,
        }
        assert production_app.conf.visibility_timeout == 93600
        assert production_app.conf.broker_transport_options == {
            "visibility_timeout": 93600,
        }
        assert production_app.conf.result_backend_transport_options == {
            "visibility_timeout": 93600,
        }
        assert "hub_transfer" in {
            queue.name for queue in app.conf.task_queues
        }

        for task_name in (
            "endoreg_db.tasks.video_hls_materialization",
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
            expected_queue = (
                "ffmpeg_media"
                if task_name == "endoreg_db.tasks.video_hls_materialization"
                else "hub_transfer"
            )
            assert queue_name == expected_queue, (task_name, route)
            assert route.get("routing_key") == expected_queue, (
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


def test_production_settings_export_hub_transfer_configuration(
    tmp_path: Path,
) -> None:
    probe = textwrap.dedent(
        """
        import django

        django.setup()

        from lx_annotate.settings import settings_base
        from lx_annotate.settings import settings_prod
        from lx_annotate.hub.hub_export_envelope import (
            resolve_hub_export_envelope_config,
        )
        from lx_annotate.hub.hub_export_worker import (
            resolve_hub_transport_config,
            resolve_outbound_node_secret,
        )

        missing_settings = {
            name
            for name in dir(settings_base)
            if name.isupper() and not hasattr(settings_prod, name)
        }
        assert missing_settings == set()

        assert str(settings_prod.get_runtime_paths().runtime_root).endswith(
            "/runtime-data"
        )
        assert settings_prod.PROTECTED_MEDIA_ROOT.as_posix().endswith(
            "/runtime-data/storage"
        )
        assert settings_prod.ENDOREG_DEPLOYMENT_ROLE == "site_node"
        assert settings_prod.LX_ANNOTATE_HUB_EXPORT_AUTO_QUEUE is False
        assert settings_prod.LX_ANNOTATE_HUB_EXPORT_REQUIRE_MTLS is True
        assert settings_prod.LX_ANNOTATE_HUB_EXPORT_CLIENT_CERT_FILE.endswith(
            "/hub-secrets/hub-client-cert.pem"
        )
        assert settings_prod.LX_ANNOTATE_HUB_EXPORT_CLIENT_KEY_FILE.endswith(
            "/hub-secrets/hub-client-key.pem"
        )
        assert settings_prod.LX_ANNOTATE_HUB_EXPORT_CA_FILE.endswith(
            "/hub-secrets/hub-ca.pem"
        )
        assert settings_prod.LX_ANNOTATE_HUB_EXPORT_RECIPIENT_PUBLIC_KEY_FILE.endswith(
            "/hub-secrets/hub-recipient-public.pem"
        )
        assert settings_prod.LX_ANNOTATE_HUB_EXPORT_ENVELOPE_STAGING_DIR.endswith(
            "/hub-export-staging"
        )
        assert settings_prod.LX_ANNOTATE_HUB_EXPORT_REQUEST_TIMEOUT_SECONDS == 21600
        assert settings_prod.LX_ANNOTATE_HUB_EXPORT_STALE_AFTER_SECONDS == 25200
        assert settings_prod.LX_ANNOTATE_HUB_EXPORT_MAX_RETRIES == 7
        assert settings_prod.LX_ANNOTATE_HUB_EXPORT_LOCAL_CLEANUP_POLICY == (
            "retain_processed_media"
        )

        # These are the same resolvers called by run_outbound_transfer_job for
        # both videos and reports. Assert the effective requests/envelope
        # configuration, not merely the values exported by settings_prod.
        transport = resolve_hub_transport_config()
        assert transport.request_kwargs() == {
            "allow_redirects": False,
            "cert": (
                settings_prod.LX_ANNOTATE_HUB_EXPORT_CLIENT_CERT_FILE,
                settings_prod.LX_ANNOTATE_HUB_EXPORT_CLIENT_KEY_FILE,
            ),
            "verify": settings_prod.LX_ANNOTATE_HUB_EXPORT_CA_FILE,
        }
        envelope = resolve_hub_export_envelope_config()
        assert str(envelope.recipient_public_key_file) == (
            settings_prod.LX_ANNOTATE_HUB_EXPORT_RECIPIENT_PUBLIC_KEY_FILE
        )
        assert str(envelope.staging_directory) == (
            settings_prod.LX_ANNOTATE_HUB_EXPORT_ENVELOPE_STAGING_DIR
        )
        assert resolve_outbound_node_secret(source_node_key="site-node") == (
            "test-node-secret"
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
        "Production Hub export settings probe failed.\n\n"
        f"stdout:\n{completed.stdout}\n\n"
        f"stderr:\n{completed.stderr}"
    )


def test_production_settings_reject_stale_window_that_can_race_request(
    tmp_path: Path,
) -> None:
    env = _production_settings_environment(tmp_path)
    env["LX_ANNOTATE_HUB_EXPORT_STALE_AFTER_SECONDS"] = env[
        "LX_ANNOTATE_HUB_EXPORT_REQUEST_TIMEOUT_SECONDS"
    ]

    completed = subprocess.run(
        [sys.executable, "-c", "import lx_annotate.settings.settings_base"],
        cwd=REPO_ROOT,
        env=env,
        text=True,
        capture_output=True,
        timeout=30,
        check=False,
    )

    assert completed.returncode != 0
    assert (
        "LX_ANNOTATE_HUB_EXPORT_STALE_AFTER_SECONDS must exceed "
        "LX_ANNOTATE_HUB_EXPORT_REQUEST_TIMEOUT_SECONDS"
    ) in completed.stderr


def test_celery_reduced_settings_keep_complete_visibility_contract() -> None:
    probe = textwrap.dedent(
        """
        from django.conf import settings

        settings.configure(CELERY_BROKER_URL="redis://localhost:6379/1")

        from lx_annotate.celery import app

        expected = 90000
        assert app.conf.visibility_timeout == expected
        assert app.conf.broker_transport_options == {
            "visibility_timeout": expected,
        }
        assert app.conf.result_backend_transport_options == {
            "visibility_timeout": expected,
        }
        assert app.connection_for_read().transport_options == {
            "visibility_timeout": expected,
        }
        """,
    )
    env = _isolated_probe_environment()

    completed = subprocess.run(
        [sys.executable, "-c", probe],
        cwd=REPO_ROOT,
        env=env,
        text=True,
        capture_output=True,
        timeout=30,
        check=False,
    )

    assert completed.returncode == 0, (
        "Reduced-settings Celery visibility probe failed.\n\n"
        f"stdout:\n{completed.stdout}\n\n"
        f"stderr:\n{completed.stderr}"
    )


@pytest.mark.parametrize(
    ("broker_options", "result_options"),
    [
        ({"visibility_timeout": 3600}, {"visibility_timeout": 90000}),
        ({}, {"visibility_timeout": 90000}),
        (None, {"visibility_timeout": 90000}),
        ({"visibility_timeout": 90000}, {"visibility_timeout": 7200}),
        ({"visibility_timeout": 90000}, {}),
        ({"visibility_timeout": 90000}, None),
    ],
)
def test_celery_rejects_incomplete_or_conflicting_transport_visibility(
    broker_options: dict[str, object] | None,
    result_options: dict[str, object] | None,
) -> None:
    probe = textwrap.dedent(
        f"""
        from django.conf import settings

        settings.configure(
            CELERY_BROKER_URL="redis://localhost:6379/1",
            CELERY_VISIBILITY_TIMEOUT=90000,
            CELERY_BROKER_TRANSPORT_OPTIONS={broker_options!r},
            CELERY_RESULT_BACKEND_TRANSPORT_OPTIONS={result_options!r},
        )

        import lx_annotate.celery
        """,
    )
    env = _isolated_probe_environment()

    completed = subprocess.run(
        [sys.executable, "-c", probe],
        cwd=REPO_ROOT,
        env=env,
        text=True,
        capture_output=True,
        timeout=30,
        check=False,
    )

    assert completed.returncode != 0, (
        "Celery accepted incomplete or conflicting transport visibility.\n\n"
        f"broker_options={broker_options!r}\n"
        f"result_options={result_options!r}\n\n"
        f"stdout:\n{completed.stdout}\n\n"
        f"stderr:\n{completed.stderr}"
    )
    assert any(
        message in completed.stderr
        for message in (
            "visibility_timeout must equal CELERY_VISIBILITY_TIMEOUT",
            "must be a mapping",
        )
    ), completed.stderr


@pytest.mark.parametrize("value", ["not-an-integer", "0", "-1", "86400"])
def test_production_settings_reject_unsafe_visibility_timeout(
    tmp_path: Path,
    value: str,
) -> None:
    env = _production_settings_environment(tmp_path)
    env["CELERY_VISIBILITY_TIMEOUT_SECONDS"] = value

    completed = subprocess.run(
        [sys.executable, "-c", "import lx_annotate.settings.settings_base"],
        cwd=REPO_ROOT,
        env=env,
        text=True,
        capture_output=True,
        timeout=30,
        check=False,
    )

    assert completed.returncode != 0
    assert "CELERY_VISIBILITY_TIMEOUT_SECONDS" in completed.stderr


def test_production_visibility_exceeds_registered_late_ack_tasks(
    tmp_path: Path,
) -> None:
    probe = textwrap.dedent(
        """
        import django

        django.setup()

        from lx_annotate.celery import app

        app.loader.import_default_modules()
        late_ack_limits = {
            name: int(task.time_limit or app.conf.task_time_limit)
            for name, task in app.tasks.items()
            if name.startswith(("endoreg_db.", "lx_annotate."))
            and task.acks_late
            and (task.time_limit or app.conf.task_time_limit) is not None
        }
        assert "endoreg_db.model_training" in late_ack_limits
        assert late_ack_limits
        assert max(late_ack_limits.values()) == 86400
        assert max(late_ack_limits.values()) < app.conf.visibility_timeout
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
        "Production Celery late-ack timeout probe failed.\n\n"
        f"stdout:\n{completed.stdout}\n\n"
        f"stderr:\n{completed.stderr}"
    )


@pytest.mark.parametrize(
    "failure", [None, "wrong_center", "stale_generation", "missing_manifest"]
)
def test_production_identity_delivery_binding(
    tmp_path: Path, failure: str | None
) -> None:
    import yaml

    env = _production_settings_environment(tmp_path)
    active = Path(env["DJANGO_SALT_FILE"])
    active_salt = active.read_bytes().removesuffix(b"\n")
    historical_salt = secrets.token_hex(32).encode("ascii")
    historical = tmp_path / "identity-retiring"

    atomic_write_file(
        destination=historical,
        content=(historical_salt + b"\n",),
        file_mode=0o600,
    )
    manifest = tmp_path / "identity.yml"
    if failure != "missing_manifest":
        manifest_bytes = yaml.safe_dump(
            {
                "schema_version": 1,
                "active": str(active),
                "retiring": [str(historical)],
                "center_id": (
                    "other-center" if failure == "wrong_center" else "test-center"
                ),
                "generation": 1 if failure == "stale_generation" else 2,
            }
        ).encode("utf-8")
        atomic_write_file(
            destination=manifest,
            content=(manifest_bytes,),
            file_mode=0o600,
        )
    stale_inline_must_never_win = secrets.token_hex(32)
    env.update(
        {
            "DJANGO_IDENTITY_SALT_KEYRING_FILE": str(manifest),
            "DJANGO_IDENTITY_CENTER_ID": "test-center",
            "DJANGO_IDENTITY_SALT_GENERATION": "2",
            "DJANGO_SALT": stale_inline_must_never_win,
            # Only expectations derived from disposable test keys go to the probe.
            "TEST_EXPECTED_ACTIVE_SHA256": hashlib.sha256(active_salt).hexdigest(),
            "TEST_EXPECTED_RETIRING_SHA256": hashlib.sha256(
                historical_salt
            ).hexdigest(),
        }
    )
    probe = textwrap.dedent(
        """
        import hashlib
        import os

        from django.conf import settings
        from endoreg_db.config.secret_keyring import configured_identity_keyring

        # Load production settings before checking the successful binding.
        active_setting = settings.DJANGO_SALT
        ring = configured_identity_keyring()
        assert ring is not None
        assert active_setting == ring.active.decode("utf-8")
        assert ring.center_id == "test-center"
        assert ring.generation == 2
        assert hashlib.sha256(ring.active).hexdigest() == (
            os.environ["TEST_EXPECTED_ACTIVE_SHA256"]
        )
        assert len(ring.retiring) == 1
        assert hashlib.sha256(ring.retiring[0]).hexdigest() == (
            os.environ["TEST_EXPECTED_RETIRING_SHA256"]
        )
        """
    )
    result = subprocess.run(
        [sys.executable, "-c", probe],
        cwd=REPO_ROOT,
        env=env,
        text=True,
        capture_output=True,
        timeout=60,
    )
    diagnostics = result.stdout + result.stderr
    assert not any(
        value in diagnostics
        for value in (
            active_salt.decode("ascii"),
            historical_salt.decode("ascii"),
            stale_inline_must_never_win,
        )
    ), "Identity key material appeared in subprocess output"
    if failure is None:
        assert result.returncode == 0, result.stderr
    else:
        assert result.returncode != 0, "Production settings accepted invalid binding"
        # A failed assertion in the success probe must not count as rejection.
        assert "ImproperlyConfigured" in result.stderr, result.stderr
