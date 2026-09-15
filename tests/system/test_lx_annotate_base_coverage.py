# pyright: reportArgumentType=false, reportGeneralTypeIssues=false, reportAttributeAccessIssue=false
from __future__ import annotations

import io
import json
import sys
import types
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock

import pytest
from django.conf import settings
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.test import Client
from django.urls import Resolver404, resolve
from endoreg_db.utils.file_operations import atomic_write_file
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.test import APIRequestFactory, force_authenticate

from lx_annotate.apps import LxAnnotateConfig
from lx_annotate.management.commands import export_route_manifest as route_cmd
from lx_annotate.serializers import FileUploadSerializer, VideoSerializer


class _DummyUser:
    def __init__(self, authenticated: bool, **kwargs):
        self.is_authenticated = authenticated
        for k, v in kwargs.items():
            setattr(self, k, v)


class _DummyGroups:
    def __init__(self, names):
        self._names = list(names)

    def values_list(self, field_name, flat=False):
        assert field_name == "name"
        assert flat is True
        return list(self._names)


@pytest.fixture
def api_rf():
    return APIRequestFactory()


def test_auth_bootstrap_requires_authentication(api_rf):
    import endoreg_db.authz.views_auth as auth_views_mod

    req = api_rf.get("/auth/bootstrap/")
    res = auth_views_mod.auth_bootstrap(req)
    assert res.status_code in {401, 403}


def test_auth_bootstrap_returns_roles_and_capabilities(api_rf, monkeypatch):
    import endoreg_db.authz.views_auth as auth_views_mod

    req = api_rf.get("/auth/bootstrap/")
    force_authenticate(
        req,
        user=_DummyUser(
            True,
            username="alice",
            groups=_DummyGroups(["clinician"]),
        ),
    )
    monkeypatch.setattr(auth_views_mod, "get_needed_role", lambda *_args: "clinician")
    monkeypatch.setattr(
        auth_views_mod, "satisfies", lambda roles, needed: needed in roles
    )

    res = auth_views_mod.auth_bootstrap(req)
    assert res.status_code == 200
    assert res.data["user"]["username"] == "alice"
    assert res.data["roles"] == ["clinician"]
    assert res.data["capabilities"]["page.patients.view"]["read"] is True
    assert res.data["capabilities"]["page.patients.view"]["write"] is False


def test_keycloak_extract_roles_ignores_untrusted_resource_clients():
    import endoreg_db.authz.auth as keycloak_auth_mod

    roles = keycloak_auth_mod.KeycloakJWTAuthentication.extract_roles(
        {
            "sub": "test-user-id",
            "roles": ["reader"],
            "realm_access": {"roles": ["annotator"]},
            "resource_access": {
                "account": {"roles": ["manage-account"]},
                "frontend": {"roles": ["writer"]},
            },
        }
    )
    assert roles == {"reader", "annotator"}


def test_keycloak_authenticate_returns_none_without_bearer():
    import endoreg_db.authz.auth as keycloak_auth_mod

    auth = keycloak_auth_mod.KeycloakJWTAuthentication()
    req = SimpleNamespace(META={})
    assert auth.authenticate(req) is None
    req = SimpleNamespace(META={"HTTP_AUTHORIZATION": "Basic abc"})
    assert auth.authenticate(req) is None


@pytest.mark.django_db
def test_keycloak_authenticate_returns_user_tuple(monkeypatch):
    import endoreg_db.authz.auth as keycloak_auth_mod

    auth = keycloak_auth_mod.KeycloakJWTAuthentication()

    class FakeJwksClient:
        def get_signing_key_from_jwt(self, token):
            assert token == "tok123"
            return SimpleNamespace(key="pem")

    class FakeUser:
        def __init__(self, username):
            self.username = username
            self.groups = Mock()

        def save(self):
            return None

    fake_user = FakeUser("tester")
    fake_user_model = SimpleNamespace(
        objects=SimpleNamespace(
            get_or_create=lambda username, defaults: (fake_user, True)
        )
    )

    class FakeGroupManager:
        def get_or_create(self, name):
            return (SimpleNamespace(name=name), True)

    monkeypatch.setattr(auth, "_init", lambda: None)
    monkeypatch.setattr(auth, "_jwks_client", FakeJwksClient())
    monkeypatch.setattr(auth, "_aud", "client-id")
    monkeypatch.setattr(auth, "_iss", "https://issuer.example/realm")
    monkeypatch.setattr(
        keycloak_auth_mod,
        "jwt",
        SimpleNamespace(
            decode=lambda *_args, **_kwargs: {
                "preferred_username": "tester",
                "groups": [],
                "realm_access": {"roles": ["clinician"]},
            }
        ),
    )
    monkeypatch.setattr(keycloak_auth_mod, "User", fake_user_model)
    monkeypatch.setattr(
        keycloak_auth_mod, "Group", SimpleNamespace(objects=FakeGroupManager())
    )
    synchronize_centers = Mock(return_value=frozenset())
    monkeypatch.setattr(
        keycloak_auth_mod,
        "synchronize_user_center_groups",
        synchronize_centers,
    )

    req = SimpleNamespace(META={"HTTP_AUTHORIZATION": "Bearer tok123"})
    user, token = auth.authenticate(req)
    assert token is None
    assert user.username == "tester"
    fake_user.groups.set.assert_called_once()
    synchronize_centers.assert_called_once_with(user=fake_user, group_paths=())


def test_keycloak_authenticate_rejects_missing_groups_before_identity_sync(monkeypatch):
    import endoreg_db.authz.auth as keycloak_auth_mod

    auth = keycloak_auth_mod.KeycloakJWTAuthentication()
    monkeypatch.setattr(auth, "_init", lambda: None)
    monkeypatch.setattr(
        auth,
        "_jwks_client",
        SimpleNamespace(
            get_signing_key_from_jwt=Mock(return_value=SimpleNamespace(key="pem"))
        ),
    )
    monkeypatch.setattr(auth, "_aud", "client-id")
    monkeypatch.setattr(auth, "_iss", "https://issuer.example/realm")
    monkeypatch.setattr(
        keycloak_auth_mod.jwt,
        "decode",
        Mock(
            return_value={
                "preferred_username": "tester",
                "realm_access": {"roles": ["clinician"]},
            }
        ),
    )
    get_or_create_user = Mock()
    monkeypatch.setattr(
        keycloak_auth_mod,
        "User",
        SimpleNamespace(objects=SimpleNamespace(get_or_create=get_or_create_user)),
    )
    synchronize_centers = Mock()
    monkeypatch.setattr(
        keycloak_auth_mod, "synchronize_user_center_groups", synchronize_centers
    )

    req = SimpleNamespace(META={"HTTP_AUTHORIZATION": "Bearer tok123"})
    with pytest.raises(AuthenticationFailed, match="Keycloak groups claim is missing"):
        auth.authenticate(req)

    get_or_create_user.assert_not_called()
    synchronize_centers.assert_not_called()


def test_keycloak_authenticate_raises_on_validation_error(monkeypatch):
    import endoreg_db.authz.auth as keycloak_auth_mod

    auth = keycloak_auth_mod.KeycloakJWTAuthentication()
    monkeypatch.setattr(auth, "_init", lambda: None)
    monkeypatch.setattr(
        auth,
        "_jwks_client",
        SimpleNamespace(
            get_signing_key_from_jwt=Mock(side_effect=RuntimeError("nope"))
        ),
    )
    req = SimpleNamespace(META={"HTTP_AUTHORIZATION": "Bearer tok123"})
    with pytest.raises(AuthenticationFailed):
        auth.authenticate(req)


def test_keycloak_jwks_url_uses_explicit_setting(settings):
    import endoreg_db.authz.auth as keycloak_auth_mod

    settings.OIDC_OP_JWKS_ENDPOINT = "https://issuer.example/jwks"
    assert (
        keycloak_auth_mod.KeycloakJWTAuthentication._jwks_url()
        == "https://issuer.example/jwks"
    )


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


def test_runtime_checks_skip_django_management_entrypoints(monkeypatch, tmp_path):
    config = LxAnnotateConfig("lx_annotate", __import__("lx_annotate"))

    manage_py = tmp_path / "manage.py"
    manage_py.write_text("", encoding="utf-8")
    monkeypatch.setattr(sys, "argv", [str(manage_py), "custom_deploy"])
    assert config._should_skip_runtime_checks("custom_deploy") is True

    django_main = tmp_path / "django" / "__main__.py"
    django_main.parent.mkdir()
    django_main.write_text("", encoding="utf-8")
    monkeypatch.setattr(sys, "argv", [str(django_main), "custom_deploy"])
    assert config._should_skip_runtime_checks("custom_deploy") is True


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
    assert calls == [("run_filewatcher", {"log_level": "INFO"})]


def test_serializers_accept_uploaded_files():
    f1 = SimpleUploadedFile("a.txt", b"abc")
    f2 = SimpleUploadedFile("v.mp4", b"xyz")
    ser1 = FileUploadSerializer(data={"file": f1})
    ser2 = VideoSerializer(data={"video": f2})
    assert ser1.is_valid(), ser1.errors
    assert ser2.is_valid(), ser2.errors


def test_run_gunicorn_main_builds_argv_and_calls_run(monkeypatch):
    mod = pytest.importorskip("lx_annotate.run_gunicorn")

    fake_run = Mock()
    monkeypatch.setattr(mod, "run", fake_run)
    monkeypatch.setattr(sys, "argv", ["run_gunicorn.py", "--timeout", "30"])
    mod.main()
    assert sys.argv[:2] == ["gunicorn", "lx-annotate.wsgi:application"]
    assert "--timeout" in sys.argv
    fake_run.assert_called_once_with()


def test_vue_spa_fallback_route_resolves():
    match = resolve("/reporting/some/deep/link")
    assert match.url_name == "vue_spa"


@pytest.mark.parametrize(
    "path",
    [
        "/endoreg-api/this-route-should-not-hit-vue-spa/",
        "/api/this-route-should-not-hit-vue-spa/",
        "/dtypes-api/this-route-should-not-hit-vue-spa/",
        "/base_api/this-route-should-not-hit-vue-spa/",
    ],
)
def test_api_paths_are_not_caught_by_vue_spa_fallback(path):
    with pytest.raises(Resolver404):
        resolve(path)


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


def test_export_route_manifest_preserves_existing_file_when_atomic_write_fails(
    tmp_path, monkeypatch
):
    monkeypatch.setattr(route_cmd, "_walk", lambda *_args, **_kwargs: [])
    monkeypatch.setattr(
        route_cmd, "get_resolver", lambda: SimpleNamespace(url_patterns=[])
    )
    out = tmp_path / "routes.json"
    original = b'{"previous": true}\n'
    out.write_bytes(original)

    def fail_after_partial_write(**kwargs):
        def failing_content():
            yield b'{"partial":'
            raise OSError("simulated manifest write failure")

        return atomic_write_file(
            destination=kwargs["destination"],
            content=failing_content(),
        )

    monkeypatch.setattr(route_cmd, "atomic_write_file", fail_after_partial_write)

    with pytest.raises(OSError, match="simulated manifest write failure"):
        call_command("export_route_manifest", "--output", str(out))

    assert out.read_bytes() == original
    assert list(tmp_path.glob("routes.json.tmp.*")) == []


def test_management_commands_have_no_raw_filesystem_mutations():
    commands_dir = Path(__file__).parents[2] / "lx_annotate" / "management" / "commands"
    watcher_source = (commands_dir / "run_filewatcher.py").read_text(encoding="utf-8")
    manifest_source = (commands_dir / "export_route_manifest.py").read_text(
        encoding="utf-8"
    )

    assert ".unlink(" not in watcher_source
    assert "with open(" not in manifest_source


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
