from __future__ import annotations

from pathlib import Path
import os
from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

from .secret_key import get_or_create_secret_key


def _read_secret_file(path: Path, label: str) -> str:
    try:
        value = path.read_text().strip()
    except OSError as exc:
        raise ValueError(f"Unable to read {label} from {path}: {exc}") from exc
    if not value:
        raise ValueError(f"Secret file {path} for {label} is empty")
    return value


class AppConfig(BaseSettings):
    """
    Typed, validated configuration input for django settings.
    """

    model_config = SettingsConfigDict(
        env_prefix="DJANGO_",
        case_sensitive=False,
        extra="ignore",
    )

    # Core
    secret_key: str = Field(min_length=32, default_factory=get_or_create_secret_key)
    secret_key_file: Path | None = None
    debug: bool = False

    # Security: Hosts, CORS, CSRF
    allowed_hosts: list[str] = Field(
        default_factory=lambda: ["lx-annotate.net", "localhost", "127.0.0.1", "[::1]"]
    )
    csrf_trusted_origins: list[str] = Field(default_factory=list)
    cors_allowed_origins: list[str] = Field(default_factory=list)

    # DB (Granular settings required by production.py)
    # Defaults set to standard Postgres values, but can be overridden
    db_engine: str = "django.db.backends.postgresql"
    db_name: str = "endoreg_db"
    db_user: str = "postgres"
    db_password: str = ""
    db_password_file: Path | None = None
    db_host: str = "localhost"
    db_port: str = "5432"
    db_sslmode: str = "prefer"

    keycloak_server_url: str = "https://keycloak-endoreg.net"
    keycloak_client_id: str = "lx-frontend"
    keycloak_client_secret: str = Field(
        default_factory=lambda: os.getenv("OIDC_RP_CLIENT_SECRET", "")
    )
    keycloak_client_secret_file: Path | None = None

    # I18N
    time_zone: str = "UTC"
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

    @model_validator(mode="after")
    def apply_secret_files(self) -> "AppConfig":
        self._apply_secret_file("secret_key", self.secret_key_file)
        self._apply_secret_file("db_password", self.db_password_file)
        return self

    def _apply_secret_file(self, field_name: str, file_path: Path | None) -> None:
        if not file_path:
            return
        current_value = getattr(self, field_name)
        value_set = field_name in self.__pydantic_fields_set__
        if value_set and current_value:
            return
        secret_value = _read_secret_file(file_path, field_name)
        setattr(self, field_name, secret_value)


def load_config(env_file: Path | None = None) -> AppConfig:
    # If explicit file provided, we use it by creating a temporary class
    if env_file and env_file.exists():
        return AppConfig(_env_file=env_file)  # type: ignore[call-arg]

    # Otherwise Pydantic automatically reads os.environ
    return AppConfig()  # type: ignore[call-arg]
