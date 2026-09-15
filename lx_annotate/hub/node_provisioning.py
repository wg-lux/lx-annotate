from __future__ import annotations

from pathlib import Path
from typing import Literal, TypedDict

from django.db import transaction
from pydantic import AliasChoices, BaseModel, ConfigDict, Field


class HubNodeProvisionEvent(TypedDict):
    """Machine-readable result for one provisioned node."""

    event: Literal["hub.node_provisioned"]
    status: Literal["ok"]
    node_key: str
    role: str
    created: bool
    secret_changed: bool


class HubNodeSpec(BaseModel):
    """Validated application-level input for one managed hub node."""

    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    node_key: str = Field(
        min_length=1, validation_alias=AliasChoices("node_key", "nodeKey")
    )
    display_name: str = Field(
        min_length=1,
        validation_alias=AliasChoices("display_name", "displayName"),
    )
    role: str = Field(min_length=1)
    base_url: str = Field(
        default="", validation_alias=AliasChoices("base_url", "baseUrl")
    )
    center_key: str | None = Field(
        default=None, validation_alias=AliasChoices("center_key", "centerKey")
    )
    shared_secret_file: Path | None = Field(
        default=None,
        validation_alias=AliasChoices("shared_secret_file", "sharedSecretFile"),
    )


def provision_hub_nodes(specs: list[HubNodeSpec]) -> list[HubNodeProvisionEvent]:
    """Apply validated node specifications through the domain model API."""

    from endoreg_db.models import Center, NetworkNode

    events: list[HubNodeProvisionEvent] = []
    allowed_roles = set(NetworkNode.Role.values)
    with transaction.atomic():
        for spec in specs:
            if spec.role not in allowed_roles:
                raise ValueError(
                    f"Unsupported NetworkNode role for {spec.node_key}: {spec.role}"
                )

            center = None
            if spec.center_key:
                center = Center.objects.filter(center_key=spec.center_key).first()
                if center is None:
                    raise ValueError(
                        f"Required Center.center_key is missing: {spec.center_key}"
                    )

            node, created = NetworkNode.objects.update_or_create(
                node_key=spec.node_key,
                defaults={
                    "display_name": spec.display_name,
                    "role": spec.role,
                    "base_url": spec.base_url,
                    "is_active": True,
                    "owning_center": center,
                },
            )

            secret_changed = False
            if spec.shared_secret_file is not None:
                secret_path = spec.shared_secret_file.expanduser().resolve()
                if not secret_path.is_file():
                    raise ValueError(
                        f"Required NetworkNode secret file is missing: {secret_path}"
                    )
                secret = secret_path.read_text(encoding="utf-8").strip()
                if not secret:
                    raise ValueError(
                        f"Required NetworkNode secret file is empty: {secret_path}"
                    )
                if not node.check_shared_secret(secret):
                    node.set_shared_secret(secret)
                    node.save(update_fields=["shared_secret_hash", "updated_at"])
                    secret_changed = True

            events.append(
                {
                    "event": "hub.node_provisioned",
                    "status": "ok",
                    "node_key": node.node_key,
                    "role": node.role,
                    "created": created,
                    "secret_changed": secret_changed,
                }
            )

    return events
