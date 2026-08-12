from __future__ import annotations

from django.conf import settings


def test_which_settings_are_used():
    # Replace 'settings_test' with a unique value only found in your test settings
    # e.g., if you set DEBUG=False in tests but True in dev:
    print(f"DEBUG is: {settings.DEBUG}")
    print(f"Database is: {settings.DATABASES['default']['ENGINE']}")
    assert "settings_test" in settings.SETTINGS_MODULE


def test_hub_transfer_tasks_use_their_own_queue() -> None:
    queue_name = settings.CELERY_HUB_TRANSFER_QUEUE
    assert queue_name == "hub_transfer"
    for task_name in (
        "lx_annotate.run_outbound_hub_transfer_job",
        "lx_annotate.reconcile_outbound_hub_transfer_job",
        "lx_annotate.recover_stale_outbound_hub_transfer_jobs",
        "lx_annotate.execute_storage_balance_work_item",
        "lx_annotate.reconcile_storage_balancing",
        "lx_annotate.recover_storage_balance_work_items",
        "lx_annotate.ingest_processed_storage_artifact",
        "lx_annotate.publish_storage_artifact",
        "lx_annotate.dispatch_pending_storage_publications",
        "lx_annotate.execute_storage_rotation_cleanup",
        "lx_annotate.reconcile_storage_rotation_cleanup",
        "lx_annotate.sync_storage_node_telemetry",
        "lx_annotate.reconcile_storage_inventories",
        "lx_annotate.expire_storage_reservations",
        "lx_annotate.cleanup_retired_storage_envelope",
        "lx_annotate.reconcile_retired_storage_envelopes",
    ):
        assert settings.CELERY_TASK_ROUTES[task_name] == {
            "queue": queue_name,
            "routing_key": queue_name,
        }
