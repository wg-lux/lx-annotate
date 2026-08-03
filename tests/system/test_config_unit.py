from __future__ import annotations

from pathlib import Path

import pytest

from lx_annotate.settings import config


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
            {"LX_ANNOTATE_DATA_DIR": "/srv/runtime/data"},
            Path("/srv/runtime/staticfiles"),
        ),
        ({"DATA_DIR": "/srv/runtime"}, Path("/srv/runtime/staticfiles")),
        ({}, Path("staticfiles")),
    ],
)
def test_default_static_root_follows_runtime_path_precedence(
    monkeypatch, environment: dict[str, str], expected: Path
) -> None:
    for name in (
        "DJANGO_STATIC_ROOT",
        "LX_ANNOTATE_DATA_DIR",
        "LX_ANNOTATE_ENCRYPTED_DATA_DIR",
        "DATA_DIR",
    ):
        monkeypatch.delenv(name, raising=False)
    for name, value in environment.items():
        monkeypatch.setenv(name, value)

    assert config._default_static_root() == expected
