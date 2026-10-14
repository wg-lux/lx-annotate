from __future__ import annotations

from pathlib import Path

import pytest

from lx_annotate.settings import config


@pytest.mark.parametrize("retiring", [True, False])
def test_signing_manifest_overlap_and_retirement(tmp_path, monkeypatch, retiring):
    import yaml
    from django.core.signing import BadSignature, Signer

    for variable in (
        "DJANGO_SECRET_KEY",
        "DJANGO_SECRET_KEY_FILE",
        "DJANGO_SIGNING_KEYRING_FILE",
    ):
        monkeypatch.delenv(variable, raising=False)
    active = tmp_path / "active"
    previous = tmp_path / "previous"
    active.write_text("new-signing-generation-" * 3)
    previous.write_text("previous-signing-generation-" * 3)
    manifest = tmp_path / "ring.yml"
    manifest.write_text(
        yaml.safe_dump(
            {
                "schema_version": 1,
                "active": str(active),
                "retiring": [str(previous)] if retiring else [],
            }
        )
    )
    for path in (active, previous, manifest):
        path.chmod(0o600)
    monkeypatch.setenv("DJANGO_SIGNING_KEYRING_FILE", str(manifest))
    # A configured ring takes precedence even over a missing single-key file.
    monkeypatch.setenv("DJANGO_SECRET_KEY_FILE", str(tmp_path / "missing"))
    resolved = config.load_config()
    signer = Signer(
        key=resolved.secret_key, fallback_keys=resolved.secret_key_fallbacks
    )
    old_signature = Signer(key=previous.read_text(), fallback_keys=[]).sign("payload")
    assert signer.unsign(signer.sign("payload")) == "payload"
    if retiring:
        assert signer.unsign(old_signature) == "payload"
    else:
        with pytest.raises(BadSignature):
            signer.unsign(old_signature)


@pytest.mark.parametrize(
    "failure", ["missing", "public", "malformed", "duplicate", "unsafe_key"]
)
def test_signing_manifest_fails_closed(tmp_path, monkeypatch, failure):
    import yaml

    key = tmp_path / "active"
    key.write_text(
        "short" if failure == "unsafe_key" else "new-signing-generation-" * 3
    )
    key.chmod(0o600)
    manifest = tmp_path / "ring.yml"
    if failure != "missing":
        manifest.write_text(
            "["
            if failure == "malformed"
            else yaml.safe_dump(
                {
                    "schema_version": 1,
                    "active": str(key),
                    "retiring": [],
                }
            )
            + ("schema_version: 1\n" if failure == "duplicate" else "")
        )
        manifest.chmod(0o644 if failure == "public" else 0o600)
    monkeypatch.setenv("DJANGO_SIGNING_KEYRING_FILE", str(manifest))
    monkeypatch.setenv("DJANGO_SECRET_KEY", "otherwise-valid-single-key-" * 3)
    with pytest.raises(ValueError):
        config.load_config()


def test_no_signing_manifest_disables_implicit_fallbacks(monkeypatch):
    monkeypatch.delenv("DJANGO_SIGNING_KEYRING_FILE", raising=False)
    monkeypatch.delenv("DJANGO_SECRET_KEY_FILE", raising=False)
    resolved = config.AppConfig(
        secret_key="existing-inline-signing-key-" * 3,
        secret_key_fallbacks=["unrequested-retiring-key-" * 3],
    )
    assert resolved.secret_key_fallbacks == []


def test_runtime_root_loaded_before_endoreg_path_resolution(tmp_path, monkeypatch):
    from endoreg_db.utils.paths import clear_runtime_paths_cache, get_runtime_paths

    monkeypatch.setenv("DJANGO_SETTINGS_MODULE", "lx_annotate.settings.settings_prod")
    monkeypatch.delenv("LX_RUNTIME_ROOT", raising=False)
    root = tmp_path / "runtime"
    env_file = tmp_path / ".env.systemd"
    env_file.write_text(f'LX_RUNTIME_ROOT="{root}"\n', encoding="utf-8")
    clear_runtime_paths_cache()
    try:
        assert config.load_runtime_environment(tmp_path) == env_file
        assert get_runtime_paths().runtime_root == root
        assert get_runtime_paths().storage == root / "storage"
    finally:
        clear_runtime_paths_cache()


@pytest.mark.parametrize("value", ["relative/data", ""])
def test_runtime_root_rejects_invalid_production_configuration(
    tmp_path, monkeypatch, value
):
    from endoreg_db.config.env import EnvironmentValueError, get_runtime_root

    monkeypatch.setenv("DJANGO_SETTINGS_MODULE", "lx_annotate.settings.settings_prod")
    monkeypatch.setenv("LX_RUNTIME_ROOT", value)
    config.load_runtime_environment(tmp_path)
    with pytest.raises(EnvironmentValueError, match="LX_RUNTIME_ROOT"):
        get_runtime_root()


def test_runtime_root_environment_wins_over_file_and_legacy_aliases(
    tmp_path, monkeypatch
):
    from endoreg_db.config.env import get_runtime_root

    root = tmp_path / "selected"
    monkeypatch.setenv("DJANGO_SETTINGS_MODULE", "lx_annotate.settings.settings_dev")
    monkeypatch.setenv("LX_RUNTIME_ROOT", str(root))
    monkeypatch.setenv("DATA_DIR", str(tmp_path / "legacy"))
    monkeypatch.setenv("LX_ANNOTATE_ENCRYPTED_DATA_DIR", str(tmp_path / "legacy"))
    (tmp_path / ".env").write_text(f"LX_RUNTIME_ROOT={tmp_path / 'other'}\n")
    config.load_runtime_environment(tmp_path)
    assert get_runtime_root() == root


def test_legacy_root_does_not_supply_missing_production_root(tmp_path, monkeypatch):
    from endoreg_db.config.env import EnvironmentValueError, get_runtime_root

    monkeypatch.setenv("DJANGO_SETTINGS_MODULE", "lx_annotate.settings.settings_prod")
    monkeypatch.delenv("LX_RUNTIME_ROOT", raising=False)
    monkeypatch.setenv("LX_ANNOTATE_ENCRYPTED_DATA_DIR", str(tmp_path))
    config.load_runtime_environment(tmp_path)
    with pytest.raises(EnvironmentValueError, match="LX_RUNTIME_ROOT"):
        get_runtime_root()


def test_django_runtime_paths_use_endoreg_topology() -> None:
    from django.conf import settings
    from endoreg_db.utils.paths import get_runtime_paths

    paths = get_runtime_paths()
    assert settings.CONFIG_ROOT == paths.runtime_root / "config"
    assert not settings.CONFIG_ROOT.is_relative_to(paths.terminology)
    for setting, expected in {
        "PROTECTED_MEDIA_ROOT": paths.storage,
        "MEDIA_ROOT": paths.storage,
        "TERMINOLOGY_ROOT": paths.terminology,
        "STREAMABLE_VIDEO_ROOT": paths.streamable_videos_root,
        "STREAMABLE_RAW_VIDEO_ROOT": paths.streamable_videos_raw_media,
        "STREAMABLE_PROCESSED_VIDEO_ROOT": paths.streamable_videos_processed_media,
    }.items():
        assert getattr(settings, setting) == expected


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("", []),
        ('["api.example", "localhost"]', ["api.example", "localhost"]),
        ('"api.example"', ["api.example"]),
        ("('api.example', 'localhost')", ["api.example", "localhost"]),
        ("'single'", ["single"]),
        ("['unterminated'", ["['unterminated'"]),
        ("api.example, localhost,", ["api.example", "localhost"]),
    ],
)
def test_config_list_coercion_accepts_supported_runtime_formats(
    raw: str, expected: list[str]
) -> None:
    assert config._coerce_list(raw) == expected


def test_config_sources_preserve_priority_and_coerce_typed_fields() -> None:
    kwargs = config._config_kwargs_from_sources(
        [
            {
                "DJANGO_DEBUG": "yes",
                "DJANGO_ALLOWED_HOSTS": "api.example,localhost",
                "DJANGO_STATIC_ROOT": "/srv/static",
                "DJANGO_SECRET_KEY_FILE": "  ",
            },
            {
                "DJANGO_DEBUG": "false",
                "DJANGO_ALLOWED_HOSTS": "ignored.example",
            },
        ]
    )

    assert kwargs == {
        "secret_key_file": None,
        "debug": True,
        "allowed_hosts": ["api.example", "localhost"],
        "static_root": Path("/srv/static"),
    }


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ('export OIDC_RP_CLIENT_SECRET="oidc-secret"', "oidc-secret"),
        ("KEYCLOAK_CLIENT_SECRET='keycloak-secret'", "keycloak-secret"),
        ("unstructured-secret", "unstructured-secret"),
    ],
)
def test_keycloak_secret_file_accepts_supported_formats(
    monkeypatch, raw: str, expected: str
) -> None:
    monkeypatch.setattr(config, "_read_secret_file", lambda *_args: raw)

    assert config._read_keycloak_secret_file(Path("unused")) == expected


def test_keycloak_secret_file_rejects_empty_named_value(monkeypatch) -> None:
    monkeypatch.setattr(
        config,
        "_read_secret_file",
        lambda *_args: "OIDC_RP_CLIENT_SECRET=  ",
    )

    with pytest.raises(ValueError, match="contains an empty value"):
        config._read_keycloak_secret_file(Path("unused"))


def test_keycloak_secret_file_skips_comments_and_unrelated_keys(monkeypatch) -> None:
    monkeypatch.setattr(
        config,
        "_read_secret_file",
        lambda *_args: "# generated\nUNRELATED=value\nOIDC_RP_CLIENT_SECRET=selected",
    )

    assert config._read_keycloak_secret_file(Path("unused")) == "selected"


def test_env_file_parser_ignores_noise_and_handles_shell_values(monkeypatch) -> None:
    monkeypatch.setattr(
        Path,
        "read_text",
        lambda *_args, **_kwargs: (
            "# comment\n"
            "export FIRST='quoted value'\n"
            "no-assignment\n"
            " =ignored\n"
            "EMPTY=\n"
            "BROKEN='unterminated\n"
        ),
    )

    assert config._parse_env_file(Path("unused")) == {
        "FIRST": "quoted value",
        "EMPTY": "",
        "BROKEN": "'unterminated",
    }


def test_app_config_rejects_short_inline_secret() -> None:
    with pytest.raises(ValueError, match="at least 32 characters"):
        config.AppConfig(secret_key="too-short")


@pytest.mark.parametrize(
    ("value", "expected"),
    [
        (None, None),
        (("a", "b"), ["a", "b"]),
        (7, 7),
        ("  ", []),
        ('"json-string"', ["json-string"]),
        ("['a', 'b']", ["a", "b"]),
        ("'single'", ["single"]),
        ("{malformed", ["{malformed"]),
    ],
)
def test_app_config_list_validator_handles_boundary_inputs(
    value: object, expected: object
) -> None:
    assert config.AppConfig.parse_list_settings(value) == expected


def test_default_allowed_hosts_honors_legacy_environment(monkeypatch) -> None:
    monkeypatch.setenv("ALLOWED_HOSTS", "api.example, localhost, ")
    assert config._default_allowed_hosts() == ["api.example", "localhost"]

    monkeypatch.delenv("ALLOWED_HOSTS")
    assert config._default_allowed_hosts() == [
        "lx-annotate.local",
        "localhost",
        "127.0.0.1",
        "[::1]",
    ]


@pytest.mark.parametrize(
    ("environment", "expected"),
    [
        ({"DJANGO_STATIC_ROOT": "/srv/explicit"}, Path("/srv/explicit")),
        (
            {"LX_RUNTIME_ROOT": "/srv/runtime/data"},
            Path("/srv/runtime/data/staticfiles"),
        ),
        ({"LX_RUNTIME_ROOT": "/srv/runtime"}, Path("/srv/runtime/staticfiles")),
    ],
)
def test_default_static_root_follows_runtime_path_precedence(
    monkeypatch, environment: dict[str, str], expected: Path
) -> None:
    from endoreg_db.utils.paths import clear_runtime_paths_cache

    for name in (
        "DJANGO_STATIC_ROOT",
        "LX_RUNTIME_ROOT",
        "LX_ANNOTATE_DATA_DIR",
        "LX_ANNOTATE_ENCRYPTED_DATA_DIR",
        "DATA_DIR",
    ):
        monkeypatch.delenv(name, raising=False)
    for name, value in environment.items():
        monkeypatch.setenv(name, value)

    clear_runtime_paths_cache()
    try:
        assert config._default_static_root() == expected
    finally:
        clear_runtime_paths_cache()
