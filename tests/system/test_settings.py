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
    ):
        assert settings.CELERY_TASK_ROUTES[task_name] == {
            "queue": queue_name,
            "routing_key": queue_name,
        }
