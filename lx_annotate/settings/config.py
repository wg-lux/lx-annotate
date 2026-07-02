from __future__ import annotations

from pathlib import Path
from typing import Annotated
import ast
import json
import os
import shlex
from pydantic import AliasChoices, Field, field_validator, model_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

from .secret_key import get_or_create_secret_key


def _read_secret_file(path: Path, label: str) -> str:
    try:
        value = path.read_text().strip()
    except OSError as exc:
        raise ValueError(f"Unable to read {label} from {path}: {exc}") from exc
    if not value:
        raise ValueError(f"Secret file {path} for {label} is empty")
    return value


def _read_keycloak_secret_file(path: Path) -> str:
    raw = _read_secret_file(path, "keycloak_client_secret")

    for line in raw.splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        if stripped.startswith("export "):
            stripped = stripped[len("export ") :].strip()
        if "=" not in stripped:
            continue
        key, value = stripped.split("=", 1)
        if key.strip() not in {
            "DJANGO_KEYCLOAK_CLIENT_SECRET",
            "KEYCLOAK_CLIENT_SECRET",
            "OIDC_RP_CLIENT_SECRET",
        }:
            continue
        secret = value.strip().strip("\"'")
        if not secret:
            raise ValueError(
                f"Secret file {path} for keycloak_client_secret contains an empty value"
            )
        return secret

    return raw


def _parse_env_file(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line[len("export ") :].strip()
        if "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        if not key:
            continue
        try:
            parsed = shlex.split(value, comments=False, posix=True)
        except ValueError:
            parsed = [value.strip()]
        values[key] = parsed[0] if parsed else ""
    return values


def _first_config_value(
    sources: list[dict[str, str]],
    *keys: str,
) -> str | None:
    for source in sources:
        for key in keys:
            value = source.get(key)
            if value is not None:
                return value
    return None


def _coerce_debug(value: str) -> bool:
    normalized = value.strip().lower()
    return normalized in {"1", "true", "yes", "on", "y", "t"}


def _coerce_list(value: str) -> list[str]:
    raw = value.strip()
    if not raw:
        return []
    if raw.startswith(("[", "{", "(", '"', "'")):
        try:
            decoded = json.loads(raw)
        except json.JSONDecodeError:
            decoded = None
        if isinstance(decoded, list):
            return [str(item).strip() for item in decoded if str(item).strip()]
        if isinstance(decoded, str):
            return [decoded.strip()] if decoded.strip() else []
        try:
            decoded = ast.literal_eval(raw)
        except (SyntaxError, ValueError):
            decoded = None
        if isinstance(decoded, (list, tuple, set)):
            return [str(item).strip() for item in decoded if str(item).strip()]
        if isinstance(decoded, str):
            return [decoded.strip()] if decoded.strip() else []
    return [item.strip() for item in raw.split(",") if item.strip()]


def _coerce_optional_path(value: str) -> Path | None:
    value = value.strip()
    if not value:
        return None
    return Path(value)


def _coerce_path(value: str) -> Path:
    return Path(value)


_ConfigKwargValue = str | bool | list[str] | Path | None


def _config_kwargs_from_sources(
    sources: list[dict[str, str]],
) -> dict[str, _ConfigKwargValue]:
    alias_map: dict[str, tuple[str, ...]] = {
        "secret_key": ("DJANGO_SECRET_KEY",),
        "secret_key_file": ("DJANGO_SECRET_KEY_FILE",),
        "debug": ("DJANGO_DEBUG",),
        "allowed_hosts": ("DJANGO_ALLOWED_HOSTS", "ALLOWED_HOSTS"),
        "csrf_trusted_origins": ("DJANGO_CSRF_TRUSTED_ORIGINS",),
        "cors_allowed_origins": ("DJANGO_CORS_ALLOWED_ORIGINS",),
        "db_engine": ("DJANGO_DB_ENGINE",),
        "db_name": ("DJANGO_DB_NAME",),
        "db_user": ("DJANGO_DB_USER",),
        "db_password": ("DJANGO_DB_PASSWORD",),
        "db_password_file": ("DJANGO_DB_PASSWORD_FILE",),
        "db_host": ("DJANGO_DB_HOST",),
        "db_port": ("DJANGO_DB_PORT",),
        "db_sslmode": ("DJANGO_DB_SSLMODE",),
        "static_root": ("DJANGO_STATIC_ROOT",),
        "keycloak_server_url": ("DJANGO_KEYCLOAK_SERVER_URL",),
        "keycloak_client_id": ("DJANGO_KEYCLOAK_CLIENT_ID", "OIDC_RP_CLIENT_ID"),
        "keycloak_client_secret": (
            "DJANGO_KEYCLOAK_CLIENT_SECRET",
            "OIDC_RP_CLIENT_SECRET",
        ),
        "keycloak_client_secret_file": ("DJANGO_KEYCLOAK_CLIENT_SECRET_FILE",),
        "time_zone": ("DJANGO_TIME_ZONE", "TIME_ZONE"),
        "language_code": ("DJANGO_LANGUAGE_CODE",),
    }
    kwargs: dict[str, _ConfigKwargValue] = {}
    for field_name, keys in alias_map.items():
        value = _first_config_value(sources, *keys)
        if value is not None:
            if field_name in {
                "allowed_hosts",
                "csrf_trusted_origins",
                "cors_allowed_origins",
            }:
                kwargs[field_name] = _coerce_list(value)
                continue
            if field_name in {"debug"}:
                kwargs[field_name] = _coerce_debug(value)
                continue
            if field_name == "static_root":
                kwargs[field_name] = _coerce_path(value)
                continue
            if field_name in {
                "secret_key_file",
                "db_password_file",
                "keycloak_client_secret_file",
            }:
                kwargs[field_name] = _coerce_optional_path(value)
                continue
            kwargs[field_name] = value
    return kwargs


def _default_static_root() -> Path:
    configured = os.getenv("DJANGO_STATIC_ROOT", "").strip()
    if configured:
        return Path(configured)

    runtime_data_dir = (
        os.getenv("LX_ANNOTATE_DATA_DIR", "").strip()
        or os.getenv("LX_ANNOTATE_ENCRYPTED_DATA_DIR", "").strip()
        or os.getenv("DATA_DIR", "").strip()
    )
    if runtime_data_dir:
        data_path = Path(runtime_data_dir).expanduser()
        runtime_root = data_path.parent if data_path.name == "data" else data_path
        return runtime_root / "staticfiles"

    return Path("./staticfiles")


def _default_allowed_hosts() -> list[str]:
    legacy_value = os.getenv("ALLOWED_HOSTS", "").strip()
    if legacy_value:
        return [item.strip() for item in legacy_value.split(",") if item.strip()]
    return ["lx-annotate.local", "localhost", "127.0.0.1", "[::1]"]


class AppConfig(BaseSettings):
    """
    Typed, validated configuration input for django settings.
    """

    model_config = SettingsConfigDict(
        env_prefix="DJANGO_",
        case_sensitive=False,
        extra="ignore",
        populate_by_name=True,
    )

    # Core
    secret_key: str = Field(min_length=32, default_factory=get_or_create_secret_key)
    secret_key_file: Path | None = None
    debug: bool = False

    # Security: Hosts, CORS, CSRF
    allowed_hosts: Annotated[list[str], NoDecode] = Field(
        default_factory=_default_allowed_hosts,
        validation_alias=AliasChoices(
            "allowed_hosts", "DJANGO_ALLOWED_HOSTS", "ALLOWED_HOSTS"
        ),
    )
    csrf_trusted_origins: Annotated[list[str], NoDecode] = Field(default_factory=list)
    cors_allowed_origins: Annotated[list[str], NoDecode] = Field(default_factory=list)

    # DB (Granular settings required by production.py)
    # Defaults set to standard Postgres values, but can be overridden
    db_engine: str = "django.db.backends.postgresql"
    db_name: str = os.getenv("DJANGO_DB_NAME", "lx_annotate")
    db_user: str = os.getenv("DJANGO_DB_USER", "lx_annotate")
    db_password: str = ""
    db_password_file: Path | None = None
    db_host: str = os.getenv("DJANGO_DB_HOST", "localhost")
    db_port: str = os.getenv("DJANGO_DB_PORT", "5432")
    db_sslmode: str = "require"
    static_root: Path = Field(default_factory=_default_static_root)

    keycloak_server_url: str = "https://keycloak-endoreg.net"
    keycloak_client_id: str = Field(
        default="lx-frontend",
        validation_alias=AliasChoices(
            "keycloak_client_id", "DJANGO_KEYCLOAK_CLIENT_ID", "OIDC_RP_CLIENT_ID"
        ),
    )
    keycloak_client_secret: str = Field(
        default_factory=lambda: os.getenv("OIDC_RP_CLIENT_SECRET", ""),
        validation_alias=AliasChoices(
            "keycloak_client_secret",
            "DJANGO_KEYCLOAK_CLIENT_SECRET",
            "OIDC_RP_CLIENT_SECRET",
        ),
    )
    keycloak_client_secret_file: Path | None = None

    # I18N
    time_zone: str = Field(
        default="UTC",
        validation_alias=AliasChoices("time_zone", "DJANGO_TIME_ZONE", "TIME_ZONE"),
    )
    language_code: str = "en-us"

    @field_validator(
        "secret_key_file",
        "db_password_file",
        "keycloak_client_secret_file",
        mode="before",
    )
    @classmethod
    def normalize_secret_file(cls, value: str | Path | None) -> str | Path | None:
        if value is None:
            return None
        if isinstance(value, str) and not value.strip():
            return None
        return value

    @field_validator(
        "allowed_hosts",
        "csrf_trusted_origins",
        "cors_allowed_origins",
        mode="before",
    )
    @classmethod
    def parse_list_settings(cls, value: object) -> object:
        if value is None:
            return value
        if isinstance(value, (list, tuple)):
            return list(value)
        if not isinstance(value, str):
            return value
        raw = value.strip()
        if not raw:
            return []
        if raw.startswith(("[", "{", "(", '"', "'")):
            try:
                decoded = json.loads(raw)
            except json.JSONDecodeError:
                decoded = None
            if isinstance(decoded, list):
                return decoded
            if isinstance(decoded, str):
                return [decoded]
            try:
                decoded = ast.literal_eval(raw)
            except (SyntaxError, ValueError):
                decoded = None
            if isinstance(decoded, (list, tuple, set)):
                return list(decoded)
            if isinstance(decoded, str):
                return [decoded]
        return [item.strip() for item in raw.split(",") if item.strip()]

    @field_validator("allowed_hosts", mode="after")
    @classmethod
    def clean_allowed_hosts(cls, v: list[str]) -> list[str]:
        """Strip http:// and https:// from ALLOWED_HOSTS."""
        cleaned = []
        for host in v:
            # Remove scheme if present
            if "://" in host:
                host = host.split("://")[-1]
            # Remove trailing slashes
            host = host.rstrip("/")
            cleaned.append(str(host))
        return cleaned

    @field_validator("csrf_trusted_origins", "cors_allowed_origins", mode="after")
    @classmethod
    def ensure_schemes(cls, v: list[str]) -> list[str]:
        """Ensure origins start with http:// or https://."""
        cleaned = []
        for origin in v:
            origin = origin.rstrip("/")
            if "://" not in origin:
                # Default to https if missing, unless it looks like localhost
                scheme = (
                    "http"
                    if "localhost" in origin or "127.0.0.1" in origin
                    else "https"
                )
                cleaned.append(f"{scheme}://{origin}")
            else:
                cleaned.append(origin)
        return cleaned

    @model_validator(mode="after")
    def apply_secret_files(self) -> "AppConfig":
        self._apply_secret_file("secret_key", self.secret_key_file)
        self._apply_secret_file("db_password", self.db_password_file)
        self._apply_secret_file(
            "keycloak_client_secret", self.keycloak_client_secret_file
        )
        return self

    def _apply_secret_file(self, field_name: str, file_path: Path | None) -> None:
        if not file_path:
            return
        current_value = getattr(self, field_name)
        value_set = field_name in self.__pydantic_fields_set__
        generated_placeholder = field_name == "keycloak_client_secret" and str(
            current_value
        ).startswith("changeme_")
        if value_set and current_value and not generated_placeholder:
            return
        if field_name == "keycloak_client_secret":
            secret_value = _read_keycloak_secret_file(file_path)
        else:
            secret_value = _read_secret_file(file_path, field_name)
        setattr(self, field_name, secret_value)


def load_config(env_file: Path | None = None) -> AppConfig:
    sources: list[dict[str, str]] = []
    if env_file and env_file.exists():
        sources.append(_parse_env_file(env_file))
    sources.append(dict(os.environ))
    return AppConfig.model_validate(_config_kwargs_from_sources(sources))
