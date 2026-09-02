from __future__ import annotations

from typing import Any, cast
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.exceptions import FieldDoesNotExist
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from endoreg_db.models import Center, Examiner, NetworkNode, PortalUserInfo
from endoreg_db.models.state.audit_ledger import AuditLedger

User = cast(Any, get_user_model())


@override_settings(
    LX_ANNOTATE_HUB_EXPORT_REQUIRE_MTLS=True,
    LX_ANNOTATE_HUB_EXPORT_CLIENT_CERT_FILE="",
    LX_ANNOTATE_HUB_EXPORT_CLIENT_KEY_FILE="",
)
class AdministrationApiTests(TestCase):
    def setUp(self) -> None:
        self.client = cast(Any, APIClient())
        self.center = Center.objects.create(name="Center A", center_key="center-a")
        self.other_center = Center.objects.create(
            name="Center B", center_key="center-b"
        )
        self.actor = User.objects.create_user(username="scope-admin")
        self.actor.is_superuser = True
        self.actor.save(update_fields=["is_superuser"])
        self.actor_examiner = Examiner.objects.create(
            first_name="Scope",
            last_name="Admin",
            center=self.center,
            hash="scope-admin-hash",
        )
        PortalUserInfo.objects.create(user=self.actor, examiner=self.actor_examiner)
        self.admin_group = Group.objects.create(name="center_scope:admin")
        self.actor.groups.add(self.admin_group)

        self.target = User.objects.create_user(username="target-user")
        self.target_examiner = Examiner.objects.create(
            first_name="Target",
            last_name="User",
            center=None,
            hash="target-user-hash",
        )
        PortalUserInfo.objects.create(user=self.target, examiner=self.target_examiner)

        NetworkNode.objects.create(
            display_name="Site",
            node_key="site-node",
            role=NetworkNode.Role.SITE_NODE,
            owning_center=self.center,
        )
        self.hub = NetworkNode.objects.create(
            display_name="Hub",
            node_key="hub-node",
            role=NetworkNode.Role.CENTRAL_HUB,
            owning_center=self.center,
            base_url="https://hub.example/",
        )

    def test_overview_is_authenticated_and_sanitizes_hub_configuration(self):
        anonymous = self.client.get("/api/administration/overview/")
        self.assertEqual(anonymous.status_code, 403)

        cast(Any, self.client).force_authenticate(user=self.actor)
        response = self.client.get("/api/administration/overview/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertFalse(payload["hub_health"]["ready"])
        self.assertTrue(payload["hub_health"]["transport"]["require_mtls"])
        self.assertTrue(payload["effective_permissions"]["center_scope_admin"])
        self.assertEqual(payload["host_status"]["total"], 2)
        self.assertEqual(payload["host_status"]["active"], 2)
        self.assertEqual(
            {host["node_key"] for host in payload["host_status"]["hosts"]},
            {"site-node", "hub-node"},
        )
        serialized = response.content.decode("utf-8")
        self.assertNotIn("CLIENT_KEY_FILE", serialized)
        self.assertNotIn("shared_secret", serialized)

    def test_overview_includes_inactive_hosts_without_exposing_connection_details(self):
        inactive = NetworkNode.objects.create(
            display_name="Retired storage host",
            node_key="storage-retired",
            role=NetworkNode.Role.STORAGE_NODE,
            owning_center=self.other_center,
            base_url="http://storage.internal/",
            is_active=False,
        )
        cast(Any, self.client).force_authenticate(user=self.actor)

        response = self.client.get("/api/administration/overview/")

        self.assertEqual(response.status_code, 200)
        host = next(
            item
            for item in response.json()["host_status"]["hosts"]
            if item["node_key"] == inactive.node_key
        )
        self.assertEqual(host["role"], NetworkNode.Role.STORAGE_NODE)
        self.assertEqual(host["owning_center_key"], "center-b")
        self.assertFalse(host["active"])
        self.assertTrue(host["base_url_configured"])
        self.assertFalse(host["https_configured"])
        self.assertNotIn("base_url", host)
        self.assertNotIn("shared_secret", response.content.decode("utf-8"))

    def test_broad_roles_do_not_authorize_center_scope_administration(self):
        broad_user = User.objects.create_user(username="broad-user")
        broad_user.is_staff = True
        broad_user.save(update_fields=["is_staff"])
        broad_user.groups.add(Group.objects.create(name="data:write"))
        cast(Any, self.client).force_authenticate(user=broad_user)

        response = self.client.get("/api/administration/center-scopes/")

        self.assertEqual(response.status_code, 403)

        overview = self.client.get("/api/administration/overview/")
        self.assertEqual(overview.status_code, 200)
        self.assertEqual(overview.json()["host_status"]["hosts"], [])
        self.assertEqual(overview.json()["host_status"]["total"], 0)

    def test_superuser_does_not_require_a_redundant_center_scope_group(self):
        superuser = User.objects.create_user(username="plain-superuser")
        superuser.is_superuser = True
        superuser.save(update_fields=["is_superuser"])
        cast(Any, self.client).force_authenticate(user=superuser)

        response = self.client.get("/api/administration/center-scopes/")

        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.json()["total"], User.objects.count())
        self.assertEqual(
            {center["center_key"] for center in response.json()["centers"]},
            {"center-a", "center-b"},
        )

    def test_exact_keycloak_global_role_can_manage_all_centers(self):
        keycloak_admin = User.objects.create_user(username="keycloak-center-admin")
        keycloak_admin.groups.add(
            Group.objects.create(name="center_scope:global_admin")
        )
        cast(Any, self.client).force_authenticate(user=keycloak_admin)

        response = self.client.post(
            f"/api/administration/center-scopes/{self.target.pk}/",
            data={
                "operation": "assign",
                "center_key": "center-b",
                "expected_center_keys": [],
                "reason": "Approved by global identity administrator",
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(
            {center["center_key"] for center in response.json()["user"]["centers"]},
            {"center-b"},
        )

        overview = self.client.get("/api/administration/overview/")
        self.assertEqual(overview.status_code, 200)
        self.assertEqual(overview.json()["host_status"]["total"], 2)
        self.assertEqual(
            {host["node_key"] for host in overview.json()["host_status"]["hosts"]},
            {"site-node", "hub-node"},
        )

    def test_global_admin_can_add_and_revoke_one_plural_center_membership(self):
        try:
            PortalUserInfo._meta.get_field("centers")
        except FieldDoesNotExist:
            self.skipTest("Installed endoreg-db predates plural center memberships")

        portal_info = PortalUserInfo.objects.get(user=self.target)
        cast(Any, portal_info).centers.add(self.center)
        cast(Any, self.client).force_authenticate(user=self.actor)

        assign = self.client.post(
            f"/api/administration/center-scopes/{self.target.pk}/",
            data={
                "operation": "assign",
                "center_key": "center-b",
                "expected_center_keys": ["center-a"],
                "reason": "Approved secondary center membership",
            },
            content_type="application/json",
        )

        self.assertEqual(assign.status_code, 200, assign.content)
        self.assertEqual(
            {center["center_key"] for center in assign.json()["user"]["centers"]},
            {"center-a", "center-b"},
        )

        revoke = self.client.post(
            f"/api/administration/center-scopes/{self.target.pk}/",
            data={
                "operation": "revoke",
                "center_key": "center-a",
                "expected_center_keys": ["center-a", "center-b"],
                "reason": "Primary center membership ended",
            },
            content_type="application/json",
        )

        self.assertEqual(revoke.status_code, 200, revoke.content)
        self.assertEqual(
            {center["center_key"] for center in revoke.json()["user"]["centers"]},
            {"center-b"},
        )

    def test_assign_and_revoke_are_conflict_safe_and_durably_audited(self):
        cast(Any, self.client).force_authenticate(user=self.actor)
        assign = self.client.post(
            f"/api/administration/center-scopes/{self.target.pk}/",
            data={
                "operation": "assign",
                "center_key": "center-a",
                "expected_center_key": None,
                "reason": "Clinical user joined Center A",
            },
            content_type="application/json",
            HTTP_X_REQUEST_ID="request-123",
        )

        self.assertEqual(assign.status_code, 200)
        self.target_examiner.refresh_from_db()
        self.assertEqual(cast(Any, self.target_examiner).center_id, self.center.pk)
        self.assertEqual(
            {center["center_key"] for center in assign.json()["user"]["centers"]},
            {"center-a"},
        )
        audit = AuditLedger.objects.get(
            object_type="PortalUserInfo", action="center_scope_changed"
        )
        self.assertEqual(audit.data["previous_center_key"], None)
        self.assertEqual(audit.data["new_center_key"], "center-a")
        self.assertFalse(audit.data["portal_user_info_created"])
        self.assertFalse(audit.data["examiner_created"])
        self.assertEqual(audit.data["correlation_id"], "request-123")

        stale = self.client.post(
            f"/api/administration/center-scopes/{self.target.pk}/",
            data={
                "operation": "revoke",
                "expected_center_key": None,
                "reason": "Stale operation",
            },
            content_type="application/json",
        )
        self.assertEqual(stale.status_code, 409)

        revoke = self.client.post(
            f"/api/administration/center-scopes/{self.target.pk}/",
            data={
                "operation": "revoke",
                "expected_center_key": "center-a",
                "reason": "Access no longer required",
            },
            content_type="application/json",
        )
        self.assertEqual(revoke.status_code, 200)
        self.target_examiner.refresh_from_db()
        self.assertIsNone(cast(Any, self.target_examiner).center_id)
        self.assertEqual(revoke.json()["user"]["centers"], [])
        self.assertEqual(
            AuditLedger.objects.filter(action="center_scope_changed").count(), 2
        )

    def test_self_escalation_and_cross_center_assignment_are_rejected(self):
        delegated_actor = User.objects.create_user(username="delegated-admin")
        delegated_examiner = Examiner.objects.create(
            first_name="Delegated",
            last_name="Admin",
            center=self.center,
            hash="delegated-admin-hash",
        )
        PortalUserInfo.objects.create(
            user=delegated_actor,
            examiner=delegated_examiner,
        )
        delegated_actor.groups.add(self.admin_group)
        cast(Any, self.client).force_authenticate(user=delegated_actor)
        self_change = self.client.post(
            f"/api/administration/center-scopes/{delegated_actor.pk}/",
            data={
                "operation": "revoke",
                "expected_center_key": "center-a",
                "reason": "self change",
            },
            content_type="application/json",
        )
        self.assertEqual(self_change.status_code, 403)

        own_center_target = User.objects.create_user(username="own-center-target")
        own_center_examiner = Examiner.objects.create(
            first_name="Own",
            last_name="Target",
            center=self.center,
            hash="own-center-target-hash",
        )
        PortalUserInfo.objects.create(
            user=own_center_target,
            examiner=own_center_examiner,
        )
        cross_center = self.client.post(
            f"/api/administration/center-scopes/{own_center_target.pk}/",
            data={
                "operation": "assign",
                "center_key": "center-b",
                "expected_center_key": "center-a",
                "reason": "out of delegated scope",
            },
            content_type="application/json",
        )
        self.assertEqual(cross_center.status_code, 403)

        unassigned = self.client.post(
            f"/api/administration/center-scopes/{self.target.pk}/",
            data={
                "operation": "assign",
                "center_key": "center-a",
                "expected_center_key": None,
                "reason": "ambiguous unassigned user",
            },
            content_type="application/json",
        )
        self.assertEqual(unassigned.status_code, 403)

    def test_global_admin_can_provision_incomplete_keycloak_user(self):
        incomplete_user = User.objects.create_user(username="new-clinician")
        cast(Any, self.client).force_authenticate(user=self.actor)

        response = self.client.post(
            f"/api/administration/center-scopes/{incomplete_user.pk}/",
            data={
                "operation": "assign",
                "center_key": "center-a",
                "expected_center_key": None,
                "reason": "Approved clinical onboarding",
            },
            content_type="application/json",
            HTTP_X_REQUEST_ID="provision-request-123",
        )

        self.assertEqual(response.status_code, 200, response.content)
        portal_info = PortalUserInfo.objects.select_related("examiner__center").get(
            user=incomplete_user
        )
        self.assertIsNotNone(portal_info.examiner)
        self.assertEqual(portal_info.examiner.center_id, self.center.pk)
        self.assertEqual(
            {center["center_key"] for center in response.json()["user"]["centers"]},
            {"center-a"},
        )
        self.assertFalse(portal_info.examiner.is_real_person)
        self.assertEqual(portal_info.examiner.first_name, "Portal")
        audit = AuditLedger.objects.get(
            object_type="PortalUserInfo",
            object_pk=str(portal_info.pk),
            action="center_scope_changed",
        )
        self.assertTrue(audit.data["portal_user_info_created"])
        self.assertTrue(audit.data["examiner_created"])
        self.assertEqual(audit.data["correlation_id"], "provision-request-123")

    def test_incomplete_provisioning_rolls_back_when_audit_write_fails(self):
        incomplete_user = User.objects.create_user(username="audit-failure-user")
        cast(Any, self.client).force_authenticate(user=self.actor)

        with (
            patch.object(
                AuditLedger.objects,
                "create",
                side_effect=RuntimeError("audit unavailable"),
            ),
            self.assertRaisesRegex(RuntimeError, "audit unavailable"),
        ):
            self.client.post(
                f"/api/administration/center-scopes/{incomplete_user.pk}/",
                data={
                    "operation": "assign",
                    "center_key": "center-a",
                    "expected_center_key": None,
                    "reason": "Must fail closed",
                },
                content_type="application/json",
            )

        self.assertFalse(PortalUserInfo.objects.filter(user=incomplete_user).exists())
        self.assertFalse(
            Examiner.objects.filter(last_name=f"User-{incomplete_user.pk}").exists()
        )
