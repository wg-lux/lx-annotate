from __future__ import annotations

from pathlib import Path

import pytest
from endoreg_db.models import Center, NetworkNode
from pydantic import ValidationError

from lx_annotate.hub.node_provisioning import HubNodeSpec, provision_hub_nodes

pytestmark = pytest.mark.django_db


@pytest.mark.parametrize("field", ["center_key", "center_name"])
def test_blank_configured_identity_is_rejected(field: str) -> None:
    with pytest.raises(ValidationError):
        HubNodeSpec.model_validate(
            {
                "node_key": "site-a",
                "display_name": "Site A",
                "role": "site_node",
                field: "   ",
            }
        )


def test_operator_config_creates_center_without_studies_and_is_idempotent() -> None:
    spec = HubNodeSpec(
        node_key="site-a",
        display_name="Site A node",
        role="site_node",
        center_key="site-a-center",
        center_name="Research Site A",
    )
    assert provision_hub_nodes([spec])[0]["created"]
    center = Center.objects.get(center_key="site-a-center")
    assert center.name == "Research Site A"
    assert NetworkNode.objects.get(node_key="site-a").owning_center == center
    assert not provision_hub_nodes([spec])[0]["created"]
    assert Center.objects.count() == 1


def test_existing_center_name_and_identity_are_preserved() -> None:
    center = Center.objects.create(center_key="site-a-center", name="Reviewed Name")
    provision_hub_nodes(
        [
            HubNodeSpec(
                node_key="site-a",
                display_name="Site A",
                role="site_node",
                center_key="site-a-center",
                center_name="Different Name",
            )
        ]
    )
    center.refresh_from_db()
    assert center.name == "Reviewed Name"
    assert NetworkNode.objects.get(node_key="site-a").owning_center == center


def test_center_name_without_key_is_not_silently_ignored() -> None:
    with pytest.raises(ValueError, match="requires a stable center_key"):
        provision_hub_nodes(
            [
                HubNodeSpec(
                    node_key="site-a",
                    display_name="Site A",
                    role="site_node",
                    center_name="Research Site A",
                )
            ]
        )
    assert not NetworkNode.objects.exists()


def test_invalid_node_secret_rolls_back_center_provisioning(tmp_path: Path) -> None:
    with pytest.raises(ValueError, match="secret file is missing"):
        provision_hub_nodes(
            [
                HubNodeSpec(
                    node_key="site-a",
                    display_name="Site A",
                    role="site_node",
                    center_key="site-a-center",
                    shared_secret_file=tmp_path / "missing",
                )
            ]
        )
    assert not Center.objects.exists()
    assert not NetworkNode.objects.exists()


def test_strict_provisioning_rolls_back_entire_topology() -> None:
    center = Center.objects.create(center_key="known", name="Known")
    specs = [
        HubNodeSpec(
            node_key=key,
            display_name=key,
            role="site_node",
            center_key=key,
        )
        for key in (center.center_key, "missing")
    ]
    with pytest.raises(
        ValueError, match="Required Center.center_key is missing: missing"
    ):
        provision_hub_nodes(specs, require_existing_centers=True)
    assert not NetworkNode.objects.exists()
    assert list(Center.objects.values_list("center_key", flat=True)) == ["known"]


def test_strict_command_accepts_deployment_aliases_and_rotates_secret(
    tmp_path: Path,
) -> None:
    import json
    from io import StringIO
    from secrets import token_urlsafe

    from django.core.management import call_command
    from django.core.management.base import CommandError

    center = Center.objects.create(center_key="known", name="Known")
    secret_file = tmp_path / "node-secret"
    secret = token_urlsafe(32)
    secret_file.write_text(secret)
    config = tmp_path / "nodes.json"
    config.write_text(
        json.dumps(
            [
                {
                    "nodeKey": "site-a",
                    "displayName": "Site A",
                    "role": "site_node",
                    "baseUrl": "https://site-a.example",
                    "centerKey": center.center_key,
                    "sharedSecretFile": str(secret_file),
                }
            ]
        )
    )

    def invoke() -> dict:
        stdout = StringIO()
        call_command(
            "provision_hub_nodes",
            "--config",
            str(config),
            "--require-existing-centers",
            stdout=stdout,
        )
        return json.loads(stdout.getvalue())

    assert invoke()["secret_changed"] is True
    node = NetworkNode.objects.get(node_key="site-a")
    assert node.owning_center == center
    assert node.check_shared_secret(secret)
    first_hash = node.shared_secret_hash
    assert invoke()["secret_changed"] is False
    node.refresh_from_db()
    assert node.shared_secret_hash == first_hash
    rotated = token_urlsafe(32)
    secret_file.write_text(rotated)
    assert invoke()["secret_changed"] is True
    node.refresh_from_db()
    assert node.check_shared_secret(rotated)
    assert not node.check_shared_secret(secret)

    for content in ("", None):
        if content is None:
            secret_file.unlink()
        else:
            secret_file.write_text(content)
        with pytest.raises(CommandError, match="secret file is (empty|missing)"):
            invoke()
        node.refresh_from_db()
        assert node.check_shared_secret(rotated)
