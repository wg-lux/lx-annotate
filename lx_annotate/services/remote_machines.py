"""Typed registry of LuxNix machines a browser may switch to in remote mode.

The registry is host-owned configuration rendered by LuxNix into
``LX_ANNOTATE_REMOTE_MACHINES``. Remote mode only navigates the browser to the
selected machine's own HTTPS origin; that machine serves its own SPA and runs
its own Keycloak login. No API request is proxied or sent cross-origin.
"""

from __future__ import annotations

import json
import re
from typing import Literal
from urllib.parse import urlsplit

from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator

RemoteMachineRole = Literal[
    "standalone",
    "site_node",
    "local_study_server",
    "central_hub",
]

MACHINE_KEY = re.compile(r"^[a-z0-9][a-z0-9-]{0,31}$")


class RemoteMachine(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True, frozen=True)

    key: str
    display_name: str = Field(min_length=1, max_length=60)
    base_url: str = Field(min_length=1)
    deployment_role: RemoteMachineRole

    @field_validator("key")
    @classmethod
    def _validate_key(cls, value: str) -> str:
        if not MACHINE_KEY.fullmatch(value):
            raise ValueError("key must match ^[a-z0-9][a-z0-9-]{0,31}$")
        return value

    @field_validator("base_url")
    @classmethod
    def _validate_base_url(cls, value: str) -> str:
        url = urlsplit(value)
        if (
            url.scheme != "https"
            or not url.hostname
            or url.username
            or url.password
            or url.path not in {"", "/"}
            or url.query
            or url.fragment
        ):
            raise ValueError("base_url must be a bare https:// origin")
        return f"https://{url.netloc}"


def parse_remote_machines(raw: str) -> tuple[RemoteMachine, ...]:
    """Parse the JSON list rendered by LuxNix; an empty value means no machines.

    Raises ``ValueError`` on malformed JSON, invalid entries, or duplicate keys
    or origins so a misconfigured host fails at startup instead of offering a
    partial or ambiguous machine list.
    """
    text = raw.strip()
    if not text:
        return ()
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError as error:
        raise ValueError("LX_ANNOTATE_REMOTE_MACHINES must be a JSON list") from error
    if not isinstance(parsed, list):
        raise ValueError("LX_ANNOTATE_REMOTE_MACHINES must be a JSON list")
    try:
        machines = tuple(RemoteMachine.model_validate(entry) for entry in parsed)
    except ValidationError as error:
        raise ValueError(
            f"LX_ANNOTATE_REMOTE_MACHINES contains an invalid entry: {error}"
        ) from error
    keys = [machine.key for machine in machines]
    origins = [machine.base_url for machine in machines]
    if len(set(keys)) != len(keys) or len(set(origins)) != len(origins):
        raise ValueError(
            "LX_ANNOTATE_REMOTE_MACHINES must not repeat a key or base_url"
        )
    return machines


__all__ = ["RemoteMachine", "RemoteMachineRole", "parse_remote_machines"]
