from __future__ import annotations

import ast
import re
import tomllib
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]

REQUIRED_HOST_ENVIRONMENT_KEYS = frozenset(
    {
        "ASSET_DIR",
        "BASE_URL",
        "DJANGO_ALLOWED_HOSTS",
        "DJANGO_CORS_ALLOWED_ORIGINS",
        "DJANGO_CSRF_TRUSTED_ORIGINS",
        "DJANGO_DB_HOST",
        "DJANGO_DB_NAME",
        "DJANGO_DB_PASSWORD_FILE",
        "DJANGO_DB_PORT",
        "DJANGO_DB_USER",
        "DJANGO_HOST",
        "DJANGO_KEYCLOAK_CLIENT_SECRET_FILE",
        "DJANGO_PORT",
        "DJANGO_SECRET_KEY_FILE",
        "DJANGO_STATIC_ROOT",
        "ENFORCE_AUTH",
        "EXEMPT_URLS",
        "FFMPEG_TRANSCODE_TIMEOUT_SECONDS",
        "HOME_DIR",
        "HTTP_PROTOCOL",
        "LOGIN_URL",
        "ENDOREG_DEPLOYMENT_ROLE",
        "LX_ANNOTATE_ENCRYPTED_DATA_DIR",
        "LX_ANNOTATE_HUB_EXPORT_AUTO_QUEUE",
        "LX_ANNOTATE_HUB_EXPORT_CA_FILE",
        "LX_ANNOTATE_HUB_EXPORT_CLIENT_CERT_FILE",
        "LX_ANNOTATE_HUB_EXPORT_CLIENT_KEY_FILE",
        "LX_ANNOTATE_HUB_EXPORT_ENVELOPE_STAGING_DIR",
        "LX_ANNOTATE_HUB_EXPORT_LOCAL_CLEANUP_POLICY",
        "LX_ANNOTATE_HUB_EXPORT_MAX_RETRIES",
        "LX_ANNOTATE_HUB_EXPORT_RECIPIENT_PUBLIC_KEY_FILE",
        "LX_ANNOTATE_HUB_EXPORT_REQUIRE_MTLS",
        "LX_ANNOTATE_HUB_EXPORT_REQUEST_TIMEOUT_SECONDS",
        "LX_ANNOTATE_HUB_EXPORT_STALE_AFTER_SECONDS",
        "LX_ANNOTATE_HUB_SOURCE_NODE_SECRET_FILE",
        "LX_ANNOTATE_MASTER_KEY_FILE",
        "OIDC_RP_CLIENT_ID",
        "TIME_ZONE",
        "WORKING_DIR",
    },
)

RESTORED_CONSUMED_ENVIRONMENT_KEYS = frozenset(
    {
        "ALLOWED_HOSTS",
        "CENTER_NAME",
        "DATA_DIR",
        "DEV_DB_ENGINE",
        "DEV_DB_NAME",
        "DJANGO_DB_ENGINE",
        "DJANGO_DEBUG",
        "DJANGO_ENV",
        "DJANGO_FFMPEG_EXTRACT_FRAME_BATCHSIZE",
        "DJANGO_SETTINGS_MODULE",
        "DJANGO_SETTINGS_MODULE_DEVELOPMENT",
        "DJANGO_SETTINGS_MODULE_PRODUCTION",
        "DRF_THROTTLE_ANON",
        "DRF_THROTTLE_USER",
        "ENDOREG_DISABLE_RECONCILIATION",
        "ENDOREG_REPORT_PDF_RENDERER_BIN",
        "ENDOREG_STORAGE_PROFILE",
        "FFMPEG_BINARY",
        "FFMPEG_EXECUTABLE",
        "FFMPEG_PATH",
        "FFMPEG_TRANSCODE_QUALITY_MODE",
        "LABEL_VIDEO_SEGMENT_MIN_DURATION_S_FOR_ANNOTATION",
        "LOG_LEVEL",
        "LX_ANNOTATE_STREAMABLE_VIDEO_PROCESSED_ROOT",
        "LX_ANNOTATE_STREAMABLE_VIDEO_RAW_ROOT",
        "LX_ANNOTATE_STREAMABLE_VIDEO_ROOT",
        "LX_ANONYMIZER_PATH",
        "LX_DTYPES_KB_REGISTRY",
        "LX_DTYPES_TERMINOLOGY_IMPORT_ROOT",
        "MEDIA_URL",
        "NGINX_PROTECTED_MEDIA_URL",
        "OLLAMA_BIN",
        "PROTECTED_MEDIA_ROOT",
        "RUN_VIDEO_TESTS",
        "RUST_BACKTRACE",
        "SERVE_WITH_NGINX",
        "SKIP_EXPENSIVE_TESTS",
        "STATIC_URL",
        "STORAGE_DIR",
        "TEST_DB_ENGINE",
        "TEST_DB_NAME",
        "TEST_DISABLE_MIGRATIONS",
        "TEST_RUN",
        "TEST_RUN_FRAME_NUMBER",
        "VIDEO_ALLOW_FPS_FALLBACK",
        "VIDEO_DEFAULT_FPS",
        "VIDEO_POST_VALIDATION_JOB_MAX_WORKERS",
        "VIDEO_POST_VALIDATION_JOB_MODE",
        "VITE_ENABLE_DEBUG",
        "WATCHER_POLL_INTERVAL_SECONDS",
        "WATCHER_STABLE_AFTER_SECONDS",
    },
)

REMOVED_UNUSED_ENVIRONMENT_KEYS = frozenset(
    {
        "DJANGO_CORS_ALLOWED_HOSTS",
        "ENABLE_FILE_WATCHER",
        "ENDOSCOPY_PROCESSOR_NAME",
        "EXPORT_OUTPUT_DIR",
        "HF_HOME",
        "HF_HUB_CACHE",
        "HF_HUB_ENABLE_HF_TRANSFER",
        "OLLAMA_KEEP_ALIVE",
        "OLLAMA_MODELS",
        "SECRETSPEC_PROFILE",
        "TRANSFORMERS_CACHE",
    },
)

FORBIDDEN_INLINE_SECRET_KEYS = frozenset(
    {
        "DJANGO_DB_PASSWORD",
        "DJANGO_SECRET_KEY",
        "DJANGO_SALT",
        "LX_ANNOTATE_MASTER_KEY",
        "OIDC_RP_CLIENT_SECRET",
        "SECRET_KEY",
    },
)

PROCESS_INTERNAL_ENVIRONMENT_KEYS = frozenset(
    {
        "CELERY_LOG_LEVEL",
        "LX_ANNOTATE_EXPORT_FRAMES_OUTPUT_DIR",
        "LX_ANNOTATE_FILEWATCHER_ARGS",
        "LX_ANNOTATE_MASTER_KEY",
        "PATH",
        "PYTEST_CURRENT_TEST",
        "RUN_AI_TESTS",
        "RUN_INTEGRATION_TESTS",
        "RUN_MAIN",
        "WATCHER_LOG_LEVEL",
    },
)


def _profiles() -> dict[str, dict[str, object]]:
    with (REPO_ROOT / "secretspec.toml").open("rb") as secretspec_file:
        return tomllib.load(secretspec_file)["profiles"]


def _nix_environment_keys(binding: str) -> frozenset[str]:
    source = (REPO_ROOT / "nix" / "runtime-environment.nix").read_text(encoding="utf-8")
    match = re.search(rf"\b{binding}\s*=\s*\[(?P<body>.*?)\];", source, re.DOTALL)
    assert match is not None, f"Unable to locate {binding} in runtime-environment.nix"
    return frozenset(re.findall(r'"([A-Z][A-Z0-9_]*)"', match.group("body")))


def _literal_environment_key(node: ast.AST) -> str | None:
    if isinstance(node, ast.Constant) and isinstance(node.value, str):
        return node.value
    return None


def _python_environment_keys() -> frozenset[str]:
    keys: set[str] = set()
    for python_path in (REPO_ROOT / "lx_annotate").rglob("*.py"):
        tree = ast.parse(python_path.read_text(encoding="utf-8"), filename=python_path)
        for node in ast.walk(tree):
            if isinstance(node, ast.Call) and node.args:
                if (
                    isinstance(node.func, ast.Attribute)
                    and isinstance(node.func.value, ast.Name)
                    and node.func.value.id == "os"
                    and node.func.attr == "getenv"
                ):
                    key = _literal_environment_key(node.args[0])
                    if key:
                        keys.add(key)
                    continue
                if (
                    isinstance(node.func, ast.Attribute)
                    and isinstance(node.func.value, ast.Attribute)
                    and isinstance(node.func.value.value, ast.Name)
                    and node.func.value.value.id == "os"
                    and node.func.value.attr == "environ"
                    and node.func.attr in {"get", "pop", "setdefault"}
                ):
                    key = _literal_environment_key(node.args[0])
                    if key:
                        keys.add(key)
                    continue
            if (
                isinstance(node, ast.Subscript)
                and isinstance(node.value, ast.Attribute)
                and isinstance(node.value.value, ast.Name)
                and node.value.value.id == "os"
                and node.value.attr == "environ"
            ):
                key = _literal_environment_key(node.slice)
                if key:
                    keys.add(key)
    return frozenset(keys)


def test_secretspec_restores_consumed_environment_keys() -> None:
    profiles = _profiles()
    default_profile = profiles["default"]
    configured_keys = {key for profile in profiles.values() for key in profile}

    assert REQUIRED_HOST_ENVIRONMENT_KEYS <= default_profile.keys()
    assert RESTORED_CONSUMED_ENVIRONMENT_KEYS <= configured_keys
    assert REMOVED_UNUSED_ENVIRONMENT_KEYS.isdisjoint(configured_keys)


def test_secretspec_does_not_define_inline_secret_values() -> None:
    configured_keys = {key for profile in _profiles().values() for key in profile}

    assert FORBIDDEN_INLINE_SECRET_KEYS.isdisjoint(configured_keys)


def test_secretspec_host_keys_are_classified_by_runtime_contract() -> None:
    host_owned_keys = _nix_environment_keys("hostOwnedEnvironmentVariables")

    assert REQUIRED_HOST_ENVIRONMENT_KEYS <= host_owned_keys


def test_python_environment_accesses_are_classified() -> None:
    declared_keys = (
        _nix_environment_keys("appOwnedEnvironmentVariables")
        | _nix_environment_keys("hostOwnedEnvironmentVariables")
        | PROCESS_INTERNAL_ENVIRONMENT_KEYS
        | FORBIDDEN_INLINE_SECRET_KEYS
    )
    python_environment_keys = _python_environment_keys()

    assert python_environment_keys
    assert python_environment_keys <= declared_keys, sorted(
        python_environment_keys - declared_keys,
    )
