from __future__ import annotations

import importlib
import os
import sys
from pathlib import Path
from types import SimpleNamespace

import pytest
from django.urls import include, path

from lx_annotate.management.commands.export_route_manifest import (
    _callback_methods,
    _callback_source,
    _join_route,
    _walk,
)
from lx_annotate.settings import config as config_mod
from lx_annotate.settings import secret_key as secret_key_mod
from lx_annotate.settings.config import AppConfig, _read_secret_file, load_config


def _fresh_import(module_name: str):
    sys.modules.pop(module_name, None)
    return importlib.import_module(module_name)


def test_read_secret_file_missing_raises_value_error(tmp_path):
    missing = tmp_path / "missing.secret"
    with pytest.raises(ValueError, match="Unable to read db_password"):
        _read_secret_file(missing, "db_password")


def test_read_secret_file_empty_raises_value_error(tmp_path):
    secret = tmp_path / "empty.secret"
    secret.write_text(" \n", encoding="utf-8")
    with pytest.raises(ValueError, match="is empty"):
        _read_secret_file(secret, "secret_key")


def test_app_config_parses_and_normalizes_host_and_origin_lists():
    cfg = AppConfig(
        secret_key="x" * 40,
        allowed_hosts="https://api.example.com,localhost:8000/",
        csrf_trusted_origins="api.example.com,127.0.0.1:5173",
        cors_allowed_origins='["frontend.example.com"]',
    )

    assert cfg.allowed_hosts == ["api.example.com", "localhost:8000"]
    assert cfg.csrf_trusted_origins == [
        "https://api.example.com",
        "http://127.0.0.1:5173",
    ]
    assert cfg.cors_allowed_origins == ["https://frontend.example.com"]


def test_app_config_applies_secret_files_when_field_not_explicitly_set(
    tmp_path, monkeypatch
):
    monkeypatch.delenv("DJANGO_SECRET_KEY", raising=False)
    monkeypatch.delenv("DJANGO_DB_PASSWORD", raising=False)
    monkeypatch.delenv("DJANGO_KEYCLOAK_CLIENT_SECRET", raising=False)
    secret_key_file = tmp_path / "secret.key"
    db_pwd_file = tmp_path / "db.pwd"
    keycloak_secret_file = tmp_path / "keycloak.env"
    secret_key_file.write_text("s" * 64, encoding="utf-8")
    db_pwd_file.write_text("db-pass", encoding="utf-8")
    keycloak_secret_file.write_text(
        'OIDC_RP_CLIENT_SECRET="kc-secret"\n', encoding="utf-8"
    )

    cfg = AppConfig(
        secret_key_file=secret_key_file,
        db_password_file=db_pwd_file,
        keycloak_client_secret_file=keycloak_secret_file,
    )

    assert cfg.secret_key == "s" * 64
    assert cfg.db_password == "db-pass"
    assert cfg.keycloak_client_secret == "kc-secret"


def test_app_config_does_not_override_explicit_values_with_secret_files(tmp_path):
    secret_key_file = tmp_path / "secret.key"
    db_pwd_file = tmp_path / "db.pwd"
    secret_key_file.write_text("from-file-secret", encoding="utf-8")
    db_pwd_file.write_text("from-file-db", encoding="utf-8")

    cfg = AppConfig(
        secret_key="y" * 40,
        db_password="explicit-db-password",
        secret_key_file=secret_key_file,
        db_password_file=db_pwd_file,
    )

    assert cfg.secret_key == "y" * 40
    assert cfg.db_password == "explicit-db-password"


def test_app_config_treats_blank_secret_file_path_as_none():
    cfg = AppConfig(secret_key="z" * 40, secret_key_file="  ")
    assert cfg.secret_key_file is None


def test_load_config_reads_values_from_explicit_env_file(tmp_path, monkeypatch):
    for key in (
        "DJANGO_SECRET_KEY",
        "DJANGO_ALLOWED_HOSTS",
        "DJANGO_CSRF_TRUSTED_ORIGINS",
        "DJANGO_CORS_ALLOWED_ORIGINS",
    ):
        monkeypatch.delenv(key, raising=False)

    env_file = tmp_path / "settings.env"
    env_file.write_text(
        "\n".join(
            [
                "DJANGO_SECRET_KEY=" + ("k" * 64),
                "DJANGO_ALLOWED_HOSTS=api.example.com",
                "DJANGO_CSRF_TRUSTED_ORIGINS=https://api.example.com",
                "DJANGO_CORS_ALLOWED_ORIGINS=https://frontend.example.com",
            ]
        )
        + "\n",
        encoding="utf-8",
    )

    cfg = load_config(env_file=env_file)

    assert cfg.secret_key == "k" * 64
    assert cfg.allowed_hosts == ["api.example.com"]
    assert cfg.csrf_trusted_origins == ["https://api.example.com"]
    assert cfg.cors_allowed_origins == ["https://frontend.example.com"]


def test_settings_base_enables_encrypted_storage_backend(monkeypatch):
    monkeypatch.delenv("LX_ANNOTATE_ENCRYPTED_DATA_DIR", raising=False)
    monkeypatch.setenv("LX_ANNOTATE_USE_ENCRYPTED_STORAGE", "1")
    monkeypatch.setenv("DJANGO_SETTINGS_MODULE", "lx_annotate.settings.settings_prod")
    sys.modules.pop("lx_annotate.settings.settings_base", None)

    settings_base = importlib.import_module("lx_annotate.settings.settings_base")

    assert settings_base.STORAGES["default"]["BACKEND"] == (
        "lx_annotate.storage.encrypted.EncryptedStorage"
    )


def test_get_or_create_secret_key_returns_empty_when_secret_file_env_is_set(
    monkeypatch,
):
    monkeypatch.setenv("DJANGO_SECRET_KEY_FILE", "/tmp/django.key")
    assert secret_key_mod.get_or_create_secret_key() == ""


def test_get_or_create_secret_key_reads_existing_key(monkeypatch, tmp_path):
    monkeypatch.delenv("DJANGO_SECRET_KEY_FILE", raising=False)
    monkeypatch.setattr(secret_key_mod, "HOME_DIR", tmp_path)
    existing = tmp_path / "secret.key"
    existing.write_text("m" * 64, encoding="utf-8")

    assert secret_key_mod.get_or_create_secret_key() == "m" * 64


def test_get_or_create_secret_key_generates_and_persists_key(monkeypatch, tmp_path):
    monkeypatch.delenv("DJANGO_SECRET_KEY_FILE", raising=False)
    monkeypatch.setattr(secret_key_mod, "HOME_DIR", tmp_path)
    monkeypatch.setattr(
        secret_key_mod, "get_random_secret_key", lambda: "new-secret-key"
    )

    key = secret_key_mod.get_or_create_secret_key()

    assert key == "new-secret-key"
    assert (tmp_path / "secret.key").read_text(encoding="utf-8") == "new-secret-key"


def test_get_or_create_secret_key_falls_back_when_write_fails(
    monkeypatch, tmp_path, capsys
):
    monkeypatch.delenv("DJANGO_SECRET_KEY_FILE", raising=False)
    monkeypatch.setattr(secret_key_mod, "HOME_DIR", tmp_path)

    values = iter(["generated-key", "fallback-key"])
    monkeypatch.setattr(secret_key_mod, "get_random_secret_key", lambda: next(values))

    def _raise_oserror(self, mode=0o666, exist_ok=True):  # noqa: ARG001
        raise OSError("read-only fs")

    monkeypatch.setattr(Path, "touch", _raise_oserror)

    assert secret_key_mod.get_or_create_secret_key() == "fallback-key"
    assert "WARNING: Could not save secret key" in capsys.readouterr().out


def test_route_manifest_helper_functions_cover_key_paths():
    assert _join_route("api/", "status/") == "api/status/"

    def function_callback():
        return None

    class ViewSet:
        http_method_names = ["get", "post", "options", "head", "trace"]

    class_callback = SimpleNamespace(
        cls=ViewSet,
        __qualname__="ViewSetHandler",
        __name__="handler",
        __module__="demo.module",
    )
    source, cb_name = _callback_source(class_callback)
    assert source == f"{ViewSet.__module__}.ViewSet"
    assert cb_name == "ViewSetHandler"
    assert _callback_methods(class_callback) == ["GET", "POST"]

    action_callback = SimpleNamespace(actions={"get": "list", "post": "create"})
    assert _callback_methods(action_callback) == ["GET", "POST"]
    assert _callback_methods(function_callback) == ["ANY"]


def test_walk_handles_nested_resolvers():
    def ping_view(request):  # noqa: ARG001
        return None

    urlpatterns = [
        path("api/", include(([path("ping/", ping_view, name="ping")], "api")))
    ]

    rows = _walk(urlpatterns)
    assert any(row.path == "api/ping/" and row.name == "ping" for row in rows)


def test_settings_dev_import_uses_static_vite_manifest_and_allow_any(monkeypatch):
    monkeypatch.setenv("ENFORCE_AUTH", "0")
    module = _fresh_import("lx_annotate.settings.settings_dev")

    manifest_path = Path(module.DJANGO_VITE["default"]["manifest_path"])
    assert manifest_path == Path(module.STATIC_ROOT) / ".vite" / "manifest.json"
    assert module.REST_FRAMEWORK["DEFAULT_PERMISSION_CLASSES"] == [
        "rest_framework.permissions.AllowAny"
    ]


def test_settings_prod_import_uses_static_vite_manifest(monkeypatch, tmp_path):
    import lx_annotate.settings.settings_base as base

    dummy_config = SimpleNamespace(
        static_root=str(tmp_path / "static-root"),
        allowed_hosts=["api.example.com"],
        csrf_trusted_origins=["https://api.example.com"],
        cors_allowed_origins=["https://frontend.example.com"],
        keycloak_client_secret="kc-secret",
        db_engine="django.db.backends.postgresql",
        db_name="lx",
        db_user="lx",
        db_password="db-pass",
        db_host="localhost",
        db_port="5432",
        db_sslmode="prefer",
    )
    monkeypatch.setattr(config_mod, "load_config", lambda env_file=None: dummy_config)
    base.REST_FRAMEWORK["DEFAULT_PERMISSION_CLASSES"] = [
        "rest_framework.permissions.IsAuthenticated"
    ]
    monkeypatch.setenv("ENFORCE_AUTH", "0")

    module = _fresh_import("lx_annotate.settings.settings_prod")

    assert module.STATIC_ROOT == str(tmp_path / "static-root")
    assert module.DJANGO_VITE["default"]["manifest_path"] == os.path.join(
        str(tmp_path / "static-root"), ".vite", "manifest.json"
    )
    assert module.CORS_ALLOWED_ORIGINS == ["https://frontend.example.com"]


def test_settings_prod_import_reads_luxnix_style_service_environment(
    monkeypatch, tmp_path
):
    app_data_dir = tmp_path / "lx-annotate-data"
    app_data_dir.mkdir(parents=True, exist_ok=True)
    static_root = tmp_path / "static-root"
    monkeypatch.setenv("LX_ANNOTATE_DATA_DIR", str(app_data_dir))
    monkeypatch.setenv("DJANGO_SETTINGS_MODULE", "lx_annotate.settings.settings_prod")
    monkeypatch.setenv("ENFORCE_AUTH", "0")
    monkeypatch.setenv("DJANGO_SECRET_KEY", "p" * 64)
    monkeypatch.setenv("DJANGO_ALLOWED_HOSTS", "annotate.example.test,localhost")
    monkeypatch.setenv("DJANGO_CSRF_TRUSTED_ORIGINS", "https://annotate.example.test")
    monkeypatch.setenv("DJANGO_CORS_ALLOWED_ORIGINS", "https://frontend.example.test")
    monkeypatch.setenv("DJANGO_STATIC_ROOT", str(static_root))
    monkeypatch.setenv("DJANGO_DB_NAME", "lxAnnotateLocal")
    monkeypatch.setenv("DJANGO_DB_USER", "lxAnnotateLocal")
    monkeypatch.setenv("DJANGO_DB_PASSWORD", "super-secret-db-password")
    monkeypatch.setenv("DJANGO_DB_HOST", "postgres.internal")
    monkeypatch.setenv("DJANGO_DB_PORT", "5434")
    monkeypatch.setenv("DJANGO_DB_SSLMODE", "require")
    monkeypatch.setenv("OIDC_RP_CLIENT_SECRET", "oidc-secret-from-service")
    monkeypatch.setenv("DJANGO_DEBUG", "False")

    sys.modules.pop("endoreg_db.config.settings.keycloak", None)
    sys.modules.pop("lx_annotate.settings.settings_prod", None)
    sys.modules.pop("lx_annotate.settings.settings_base", None)
    module = importlib.import_module("lx_annotate.settings.settings_prod")

    assert Path(module.STATIC_ROOT) == static_root
    assert module.ALLOWED_HOSTS == ["annotate.example.test", "localhost"]
    assert module.CSRF_TRUSTED_ORIGINS == ["https://annotate.example.test"]
    assert module.CORS_ALLOWED_ORIGINS == ["https://frontend.example.test"]
    assert module.DATABASES["default"] == {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": "lxAnnotateLocal",
        "USER": "lxAnnotateLocal",
        "PASSWORD": "super-secret-db-password",
        "HOST": "postgres.internal",
        "PORT": "5434",
        "CONN_MAX_AGE": 60,
        "OPTIONS": {
            "sslmode": "require",
        },
    }
    assert module.config.keycloak_client_secret == "oidc-secret-from-service"
    assert bool(module.OIDC_RP_CLIENT_SECRET)
    assert module.DEBUG is False


def test_wsgi_module_import_sets_default_settings_module(monkeypatch):
    import django.core.wsgi as django_wsgi

    monkeypatch.delenv("DJANGO_SETTINGS_MODULE", raising=False)
    monkeypatch.setattr(django_wsgi, "get_wsgi_application", lambda: "wsgi-app")

    module = _fresh_import("lx_annotate.wsgi")

    assert module.application == "wsgi-app"
    assert os.environ["DJANGO_SETTINGS_MODULE"] == "lx_annotate.settings.settings_dev"


def test_asgi_module_import_initializes_wrapped_apps(monkeypatch, tmp_path):
    import asgiref.wsgi as asgiref_wsgi
    import django.core.asgi as django_asgi
    import django.core.wsgi as django_wsgi
    import whitenoise

    class FakeWhiteNoise:
        def __init__(self, app, root):
            self.app = app
            self.root = root

    monkeypatch.setenv("DJANGO_STATIC_ROOT", str(tmp_path / "static-root"))
    monkeypatch.setattr(django_asgi, "get_asgi_application", lambda: "asgi-app")
    monkeypatch.setattr(django_wsgi, "get_wsgi_application", lambda: "wsgi-app")
    monkeypatch.setattr(whitenoise, "WhiteNoise", FakeWhiteNoise)
    monkeypatch.setattr(asgiref_wsgi, "WsgiToAsgi", lambda app: ("wrapped", app))

    module = _fresh_import("lx_annotate.asgi")

    assert module.application == "asgi-app"
    assert module.wsgi_application == "wsgi-app"
    assert module.whitenoise_application.root == str(tmp_path / "static-root")
    assert module.wsgi_asgi_application == ("wrapped", "wsgi-app")
