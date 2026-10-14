"""Real PostgreSQL upgrade/rollback with job identities and permissions."""

from __future__ import annotations

from importlib import import_module
from uuid import uuid4

import pytest
from django.db import connection
from django.db.migrations.executor import MigrationExecutor


@pytest.mark.django_db(transaction=True)
@pytest.mark.parametrize("existing_content_type", [False, True])
def test_move_preserves_rows_permissions_constraints_and_rollback(
    existing_content_type,
):
    before = [
        ("auth", "0012_alter_user_first_name_max_length"),
        ("contenttypes", "0002_remove_content_type_name"),
        ("admin", "0003_logentry_add_action_flag_choices"),
        ("lx_annotate", "0015_move_studycohort_to_endoreg"),
        ("endoreg_db", "0097_application_persistence"),
    ]
    after = [
        ("admin", "0003_logentry_add_action_flag_choices"),
        ("lx_annotate", "0016_application_persistence"),
        ("endoreg_db", "0097_application_persistence"),
    ]
    executor = MigrationExecutor(connection)
    executor.migrate(before)
    try:
        old_apps = executor.loader.project_state(before).apps
        User = old_apps.get_model("auth", "User")
        user = User.objects.create(username="persistence-migration-owner")
        group = old_apps.get_model("auth", "Group").objects.create(
            name="migration-operators"
        )
        center = old_apps.get_model("endoreg_db", "Center").objects.create(
            name="Migration center"
        )
        dataset = old_apps.get_model("endoreg_db", "AIDataSet").objects.create(
            name="Migration video dataset"
        )
        video = old_apps.get_model("endoreg_db", "VideoFile").objects.create(
            center_id=center.pk,
            joined_dataset_id=dataset.pk,
            raw_video_hash="migration-video",
        )
        node = old_apps.get_model("endoreg_db", "NetworkNode").objects.create(
            node_key="migration-hub",
            display_name="Migration hub",
            role="central_hub",
            base_url="https://hub.example.test",
            shared_secret_hash="isolated-test-secret-hash",
        )
        payloads = {
            "AIDatasetSplitPlan": {
                "id": 7001,
                "created_by_id": user.pk,
                "snapshot": {"historical": "preserve verbatim"},
            },
            "OutboundHubTransferJob": {
                "video_file_id": video.pk,
                "resource_kind": "video",
                "target_node_id": node.pk,
                "transfer_key": "migration-transfer",
                "marked_by_id": user.pk,
                "local_status": "awaiting_media",
            },
            "StorageArtifactPublication": {
                "video_file_id": video.pk,
                "resource_kind": "video",
                "processed_file_name": "processed.mp4",
                "processed_sha256": "b" * 64,
                "source_center_key": "migration-center",
                "status": "blocked",
                "attempt_count": 3,
            },
            "StorageNodeActionReceipt": {
                "actor_id": user.pk,
                "idempotency_key": "migration-drain",
                "node_key": node.node_key,
                "action": "drain",
                "reason": "Migration test",
                "correlation_id": "migration-correlation",
                "expected_is_draining": False,
                "resulting_is_draining": True,
            },
            "StorageOperatorDispatchReceipt": {
                "operator_receipt_id": uuid4(),
                "action": "pause",
                "control_version": 9,
                "attempt_count": 2,
            },
            "VideoTranscodeJob": {
                "actor_id": user.pk,
                "video_id": video.pk,
                "idempotency_key": uuid4(),
                "option": "replace_processed",
                "source_name": "processed.mp4",
                "source_sha256": "c" * 64,
                "status": "running",
                "claim_token": uuid4(),
            },
        }
        names = import_module(
            "lx_annotate.migrations.0016_application_persistence"
        ).MODEL_NAMES
        originals = {}
        for name in names:
            model = old_apps.get_model("lx_annotate", name)
            record = model.objects.create(**payloads[name])
            originals[name] = model.objects.values().get(pk=record.pk)
        ContentType = old_apps.get_model("contenttypes", "ContentType")
        Permission = old_apps.get_model("auth", "Permission")
        old_ct, _ = ContentType.objects.get_or_create(
            app_label="lx_annotate", model="aidatasetsplitplan"
        )
        old_perm, _ = Permission.objects.get_or_create(
            content_type=old_ct,
            codename="view_aidatasetsplitplan",
            defaults={"name": "View split"},
        )
        user.user_permissions.add(old_perm)
        group.permissions.add(old_perm)
        cohort_ct, _ = ContentType.objects.get_or_create(
            app_label="lx_annotate", model="studycohort"
        )
        cohort_perm, _ = Permission.objects.get_or_create(
            content_type=cohort_ct,
            codename="view_studycohort",
            defaults={"name": "View cohort"},
        )
        group.permissions.add(cohort_perm)
        if existing_content_type:
            new_ct, _ = ContentType.objects.get_or_create(
                app_label="endoreg_db", model="aidatasetsplitplan"
            )
            new_perm, _ = Permission.objects.get_or_create(
                content_type=new_ct,
                codename=old_perm.codename,
                defaults={"name": "View split"},
            )
            user.user_permissions.add(new_perm)
            group.permissions.add(new_perm)
        else:
            ContentType.objects.filter(
                app_label="endoreg_db", model="aidatasetsplitplan"
            ).delete()
        LogEntry = old_apps.get_model("admin", "LogEntry")
        log = LogEntry.objects.create(
            user_id=user.pk,
            content_type_id=old_ct.pk,
            object_id="7001",
            object_repr="Partition",
            action_flag=1,
        )
        # The final destination is occupied: no earlier model may be copied.
        conflict = old_apps.get_model("endoreg_db", "VideoTranscodeJob").objects.create(
            **{**payloads["VideoTranscodeJob"], "idempotency_key": uuid4()}
        )
        with pytest.raises(ValueError, match="not empty"):
            MigrationExecutor(connection).migrate(after)
        assert not old_apps.get_model(
            "endoreg_db", "AIDatasetSplitPlan"
        ).objects.exists()
        assert (
            old_apps.get_model("lx_annotate", "VideoTranscodeJob").objects.count() == 1
        )
        conflict.delete()
        executor = MigrationExecutor(connection)
        executor.migrate(after)
        moved = executor.loader.project_state(after).apps
        for name in names:
            assert (
                moved.get_model("endoreg_db", name)
                .objects.values()
                .get(pk=originals[name]["id"])
                == originals[name]
            )
            assert (
                f"lx_annotate_{name.lower()}"
                not in connection.introspection.table_names()
            )
        moved_user = moved.get_model("auth", "User").objects.get(pk=user.pk)
        assert (
            moved_user.user_permissions.filter(codename=old_perm.codename).count() == 1
        )
        assert (
            moved.get_model("auth", "Group")
            .objects.get(pk=group.pk)
            .permissions.filter(
                content_type__app_label="endoreg_db", codename="view_studycohort"
            )
            .exists()
        )
        assert moved_user.user_permissions.filter(
            content_type__app_label="endoreg_db", codename=old_perm.codename
        ).exists()
        assert (
            moved.get_model("auth", "Group")
            .objects.get(pk=group.pk)
            .permissions.filter(
                content_type__app_label="endoreg_db", codename=old_perm.codename
            )
            .exists()
        )
        assert (
            moved.get_model("admin", "LogEntry")
            .objects.get(pk=log.pk)
            .content_type.app_label
            == "endoreg_db"
        )
        new_plan = moved.get_model("endoreg_db", "AIDatasetSplitPlan").objects.create(
            created_by_id=user.pk, snapshot={"historical": "next"}
        )
        assert new_plan.pk > 7001
        executor = MigrationExecutor(connection)
        executor.migrate(before)
        restored = executor.loader.project_state(before).apps
        assert (
            restored.get_model("auth", "Group")
            .objects.get(pk=group.pk)
            .permissions.filter(
                content_type__app_label="endoreg_db", codename="view_studycohort"
            )
            .exists()
        )
        for name in names:
            assert (
                restored.get_model("lx_annotate", name)
                .objects.values()
                .get(pk=originals[name]["id"])
                == originals[name]
            )
        assert (
            restored.get_model("auth", "User")
            .objects.get(pk=user.pk)
            .user_permissions.filter(
                content_type__app_label="lx_annotate", codename=old_perm.codename
            )
            .exists()
        )
    finally:
        MigrationExecutor(connection).migrate(after)
