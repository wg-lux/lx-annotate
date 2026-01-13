from __future__ import annotations

from pathlib import Path
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

from .secret_key import get_or_create_secret_key


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
    debug: bool = False

    # Security: Hosts, CORS, CSRF
    allowed_hosts: list[str] = Field(
        default_factory=lambda: ["localhost", "127.0.0.1", "[::1]"]
    )
    csrf_trusted_origins: list[str] = Field(default_factory=list)
    cors_allowed_origins: list[str] = Field(default_factory=list)

    # DB (Granular settings required by production.py)
    # Defaults set to standard Postgres values, but can be overridden
    db_engine: str = "django.db.backends.postgresql"
    db_name: str = "endoreg_db"
    db_user: str = "postgres"
    db_password: str = ""
    db_host: str = "localhost"
    db_port: str = "5432"
    db_sslmode: str = "prefer"

    # Keycloak
    keycloak_server_url: str = "https://keycloak-endoreg.net"
    keycloak_client_id: str = "lx-frontend"
    keycloak_client_secret: str = ""

    # I18N
    time_zone: str = "UTC"
    language_code: str = "en-us"


def load_config(env_file: Path | None = None) -> AppConfig:
    # If explicit file provided, we use it by creating a temporary class
    if env_file and env_file.exists():
        return AppConfig(_env_file=env_file)  # type: ignore[call-arg]

    # Otherwise Pydantic automatically reads os.environ
    return AppConfig()  # type: ignore[call-arg]
