from __future__ import annotations

import io
import json
import sys
import types
from types import SimpleNamespace
from unittest.mock import Mock

import pytest
from django.conf import settings
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.test import Client
from django.urls import Resolver404, resolve
from rest_framework.test import APIRequestFactory, force_authenticate

from lx_annotate.apps import LxAnnotateConfig
from lx_annotate.auth_views import current_user, user_status
from lx_annotate.keycloak_auth import KeycloakAuthentication, KeycloakUser
from lx_annotate.management.commands import export_route_manifest as route_cmd
from lx_annotate.run_gunicorn import main as run_gunicorn_main
from lx_annotate.serializers import FileUploadSerializer, VideoSerializer


class _DummyUser:
    def __init__(self, authenticated: bool, **kwargs):
        self.is_authenticated = authenticated
        for k, v in kwargs.items():
            setattr(self, k, v)


@pytest.fixture
def api_rf():
    return APIRequestFactory()


def test_user_status_returns_false_for_anonymous(api_rf):
    req = api_rf.get("/auth/user-status/")
    req.user = _DummyUser(False)
    res = user_status(req)
    assert res.status_code == 200
    assert res.data == {"is_authenticated": False}


def test_user_status_returns_roles_for_authenticated_user(api_rf):
    req = api_rf.get("/auth/user-status/")
    force_authenticate(
        req, user=_DummyUser(True, username="alice", roles=["clinician"])
    )
    res = user_status(req)
    assert res.status_code == 200
    assert res.data["is_authenticated"] is True
    assert res.data["username"] == "alice"
    assert res.data["groups"] == ["clinician"]


def test_current_user_requires_authentication(api_rf):
    req = api_rf.get("/auth/current-user/")
    req.user = _DummyUser(False)
    res = current_user(req)
    assert res.status_code == 401
    assert res.data["error"] == "Not authenticated"


def test_current_user_returns_payload(api_rf):
    req = api_rf.get("/auth/current-user/")
    force_authenticate(
        req,
        user=_DummyUser(
            True,
            id=5,
            username="bob",
            email="bob@example.org",
            roles=["reader"],
            is_staff=True,
            is_active=True,
        ),
    )
    res = current_user(req)
    assert res.status_code == 200
    assert res.data["id"] == 5
    assert res.data["username"] == "bob"
    assert res.data["groups"] == ["reader"]
    assert res.data["is_staff"] is True


def test_keycloak_user_maps_roles_and_permissions():
    user = KeycloakUser(
        {
            "preferred_username": "kc-user",
            "email": "u@example.org",
            "realm_access": {"roles": ["admin", "annotator"]},
            "groups": ["/team/a"],
        }
    )
    assert str(user) == "kc-user"
    assert user.is_staff is True
    assert user.is_superuser is True
    assert user.has_perm("anything") is True
    assert user.has_module_perms("app") is True


def test_keycloak_authenticate_returns_none_without_bearer():
    auth = KeycloakAuthentication()
    req = SimpleNamespace(META={})
    assert auth.authenticate(req) is None
    req = SimpleNamespace(META={"HTTP_AUTHORIZATION": "Basic abc"})
    assert auth.authenticate(req) is None


def test_keycloak_authenticate_returns_user_tuple(monkeypatch):
    auth = KeycloakAuthentication()
    monkeypatch.setattr(
        auth, "validate_token", lambda token: {"preferred_username": "tester"}
    )
    req = SimpleNamespace(META={"HTTP_AUTHORIZATION": "Bearer tok123"})
    user, token = auth.authenticate(req)
    assert token == "tok123"
    assert user.username == "tester"


def test_keycloak_authenticate_raises_on_validation_error(monkeypatch):
    from rest_framework.exceptions import AuthenticationFailed

    auth = KeycloakAuthentication()

    def boom(_token):
        raise RuntimeError("nope")

    monkeypatch.setattr(auth, "validate_token", boom)
    req = SimpleNamespace(META={"HTTP_AUTHORIZATION": "Bearer tok123"})
    with pytest.raises(AuthenticationFailed):
        auth.authenticate(req)


def test_keycloak_validate_token_debug_path(monkeypatch, settings):
    auth = KeycloakAuthentication()
    settings.DEBUG = True
    fake_decode = Mock(return_value={"preferred_username": "debug-user"})
    # Patch module-level jwt imported in keycloak_auth.py
    import lx_annotate.keycloak_auth as mod

    monkeypatch.setattr(mod.jwt, "decode", fake_decode)
    data = auth.validate_token("abc")
    assert data["preferred_username"] == "debug-user"
    fake_decode.assert_called_once()
    _args, kwargs = fake_decode.call_args
    assert kwargs["options"] == {"verify_signature": False}


def test_keycloak_validate_token_prod_path(monkeypatch, settings):
    auth = KeycloakAuthentication()
    settings.DEBUG = False
    settings.KEYCLOAK_CLIENT_ID = "client-id"
    settings.KEYCLOAK_SERVER_URL = "https://kc.example"
    settings.KEYCLOAK_REALM = "realm1"

    monkeypatch.setattr(auth, "get_keycloak_public_key", lambda: b"pem")
    fake_decode = Mock(return_value={"sub": "123"})
    import lx_annotate.keycloak_auth as mod

    monkeypatch.setattr(mod.jwt, "decode", fake_decode)
    data = auth.validate_token("token")
    assert data == {"sub": "123"}
    _args, kwargs = fake_decode.call_args
    assert kwargs["algorithms"] == ["RS256"]
    assert kwargs["audience"] == "client-id"
    assert kwargs["issuer"].endswith("/realms/realm1")


def test_keycloak_validate_token_returns_none_on_invalid_token(monkeypatch, settings):
    settings.DEBUG = True
    auth = KeycloakAuthentication()
    import lx_annotate.keycloak_auth as mod

    def raise_invalid(*_args, **_kwargs):
        raise mod.InvalidTokenError("bad token")

    monkeypatch.setattr(mod.jwt, "decode", raise_invalid)
    assert auth.validate_token("bad") is None


def test_keycloak_get_public_key_failure_returns_none(monkeypatch):
    auth = KeycloakAuthentication()
    import lx_annotate.keycloak_auth as mod

    monkeypatch.setattr(mod.requests, "get", Mock(side_effect=RuntimeError("network")))
    assert auth.get_keycloak_public_key() is None


def test_keycloak_authenticate_header():
    auth = KeycloakAuthentication()
    assert auth.authenticate_header(SimpleNamespace()) == 'Bearer realm="api"'


def test_lx_annotate_app_ready_only_runs_watcher_for_runserver_child(monkeypatch):
    config = LxAnnotateConfig("lx_annotate", __import__("lx_annotate"))
    called = {"count": 0}
    monkeypatch.setattr(
        config,
        "start_file_watcher",
        lambda: called.__setitem__("count", called["count"] + 1),
    )

    monkeypatch.setattr(sys, "argv", ["pytest"])
    monkeypatch.setenv("RUN_MAIN", "true")
    config.ready()
    assert called["count"] == 0

    monkeypatch.setattr(sys, "argv", ["manage.py", "runserver"])
    monkeypatch.setenv("RUN_MAIN", "false")
    config.ready()
    assert called["count"] == 0

    monkeypatch.setenv("RUN_MAIN", "true")
    config.ready()
    assert called["count"] == 1


def test_start_file_watcher_starts_daemon_thread_and_calls_command(monkeypatch):
    config = LxAnnotateConfig("lx_annotate", __import__("lx_annotate"))
    calls: list[tuple[str, dict]] = []

    fake_mgmt = types.ModuleType("django.core.management")

    def fake_call_command(name, **kwargs):
        calls.append((name, kwargs))

    fake_mgmt.call_command = fake_call_command
    monkeypatch.setitem(sys.modules, "django.core.management", fake_mgmt)

    class FakeThread:
        def __init__(self, target, daemon):
            self.target = target
            self.daemon = daemon
            self.started = False

        def start(self):
            self.started = True
            self.target()

    monkeypatch.setattr("lx_annotate.apps.threading.Thread", FakeThread)
    assert config.start_file_watcher() is True
    assert calls == [("start_filewatcher", {"log_level": "INFO"})]


def test_serializers_accept_uploaded_files():
    f1 = SimpleUploadedFile("a.txt", b"abc")
    f2 = SimpleUploadedFile("v.mp4", b"xyz")
    ser1 = FileUploadSerializer(data={"file": f1})
    ser2 = VideoSerializer(data={"video": f2})
    assert ser1.is_valid(), ser1.errors
    assert ser2.is_valid(), ser2.errors


def test_run_gunicorn_main_builds_argv_and_calls_run(monkeypatch):
    import lx_annotate.run_gunicorn as mod

    fake_run = Mock()
    monkeypatch.setattr(mod, "run", fake_run)
    monkeypatch.setattr(sys, "argv", ["run_gunicorn.py", "--timeout", "30"])
    run_gunicorn_main()
    assert sys.argv[:2] == ["gunicorn", "lx-annotate.wsgi:application"]
    assert "--timeout" in sys.argv
    fake_run.assert_called_once_with()


def test_vue_spa_fallback_route_resolves():
    match = resolve("/reporting/some/deep/link")
    assert match.url_name == "vue_spa"


def test_api_path_is_not_caught_by_vue_spa_fallback():
    with pytest.raises(Resolver404):
        resolve("/api/this-route-should-not-hit-vue-spa/")


def test_favicon_route_redirects_to_static_asset():
    response = Client().get("/favicon.ico")

    assert response.status_code == 302
    assert response["Location"] == f"{settings.STATIC_URL}img/favicon.png"


def test_export_route_manifest_command_filters_and_writes_file(tmp_path, monkeypatch):
    sample_rows = [
        route_cmd.RouteRow(
            path="api/patients/",
            name="patient-list",
            methods=["GET"],
            source="app.ViewSet",
            callback="view",
        ),
        route_cmd.RouteRow(
            path="api/^patients/(?P<pk>[^/.]+)/$",
            name="patient-detail",
            methods=["GET"],
            source="app.ViewSet",
            callback="view",
        ),
        route_cmd.RouteRow(
            path="api/patients/<pk>\\.<format>/",
            name="patient-detail-format",
            methods=["GET"],
            source="app.ViewSet",
            callback="view",
        ),
        route_cmd.RouteRow(
            path="admin/login/",
            name="admin:login",
            methods=["GET"],
            source="django.contrib.admin",
            callback="view",
        ),
        route_cmd.RouteRow(
            path="oidc/callback/",
            name="oidc_callback",
            methods=["GET"],
            source="oidc",
            callback="view",
        ),
    ]
    monkeypatch.setattr(route_cmd, "_walk", lambda *_args, **_kwargs: sample_rows)
    monkeypatch.setattr(
        route_cmd, "get_resolver", lambda: SimpleNamespace(url_patterns=[])
    )

    out = tmp_path / "routes.json"
    call_command("export_route_manifest", "--output", str(out))
    payload = json.loads(out.read_text())
    assert payload["kind"] == "backend_route_manifest"
    paths = [r["path"] for r in payload["routes"]]
    assert "api/patients/" in paths
    assert "api/^patients/(?P<pk>[^/.]+)/$" in paths
    assert "admin/login/" not in paths
    assert "oidc/callback/" not in paths
    assert all("<format>" not in p for p in paths)


def test_export_route_manifest_command_stdout_with_include_flags(monkeypatch):
    sample_rows = [
        route_cmd.RouteRow("api/patients/<pk>\\.<format>/", "fmt", ["GET"], "s", "c"),
        route_cmd.RouteRow("admin/login/", "admin", ["GET"], "s", "c"),
        route_cmd.RouteRow("oidc/callback/", "oidc", ["GET"], "s", "c"),
    ]
    monkeypatch.setattr(route_cmd, "_walk", lambda *_args, **_kwargs: sample_rows)
    monkeypatch.setattr(
        route_cmd, "get_resolver", lambda: SimpleNamespace(url_patterns=[])
    )
    stdout = io.StringIO()
    call_command(
        "export_route_manifest",
        "--output",
        "-",
        "--include-non-api",
        "--include-admin",
        "--include-format-suffix",
        stdout=stdout,
    )
    payload = json.loads(stdout.getvalue())
    assert payload["count"] == 3
