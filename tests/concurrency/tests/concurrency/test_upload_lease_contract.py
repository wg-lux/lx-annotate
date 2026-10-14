"""Real transaction tests for the reviewed UploadJob lease API.

Use settings_concurrency_test and disposable PostgreSQL only. These are focused
ownership tests, not full video-import or media-publication acceptance tests.
"""

from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from datetime import datetime, timedelta
from threading import Barrier

import pytest
from django.db import connection, connections
from django.utils import timezone

from endoreg_db.models.hub.upload_job import UploadJob
from endoreg_db.services.hub import upload_job_import_lease as leases
from endoreg_db.services.hub.upload_job_state_machine import mark_upload_job_completed
from endoreg_db.utils.rust_backend import has_native_capability

pytestmark = [pytest.mark.integration, pytest.mark.django_db(transaction=True)]


@pytest.fixture(autouse=True)
def require_real_contract(settings) -> None:
    assert connection.vendor == "postgresql", "This lane MUST use PostgreSQL"
    assert connection.features.has_select_for_update
    assert settings.MIGRATION_MODULES == {}, "This lane MUST use real migrations"
    assert has_native_capability("lifecycle_state_machine", "lifecycle_state_v3")
    settings.VIDEO_IMPORT_LEASE_SECONDS = 30


@pytest.fixture
def import_job(transactional_db) -> UploadJob:
    # A lease-only row, intentionally without a media source. This is not a
    # valid import request, nor a fixture for testing hash-scope uniqueness.
    return UploadJob.objects.create(
        status=UploadJob.Status.PROCESSING.value,
        file="",
        content_type="video/mp4",
        source_file_persisted=False,
        processing_provenance={},
    )


def _compete_for_claim(
    job_id: str, owner: str, start: Barrier
) -> leases.UploadJobImportLease | None:
    # Django connections are thread-local. Never pass an ORM connection from
    # the main test thread into these workers.
    connections.close_all()
    try:
        with connection.cursor() as cursor:
            cursor.execute("SET lock_timeout = '5s'")
            cursor.execute("SET statement_timeout = '10s'")
        start.wait(timeout=10)
        try:
            return leases.acquire_upload_job_import_lease(
                upload_job_id=job_id, owner=owner
            )
        except leases.UploadJobImportLeaseBusy:
            return None
    finally:
        connections.close_all()


def test_competing_claims_have_one_authorized_winner(import_job) -> None:
    start = Barrier(3)
    job_id = str(import_job.pk)
    with ThreadPoolExecutor(max_workers=2) as pool:
        futures = [
            pool.submit(_compete_for_claim, job_id, owner, start)
            for owner in ("attempt-a", "attempt-b")
        ]
        start.wait(timeout=10)
        results = [future.result(timeout=15) for future in futures]

    winners = [result for result in results if result is not None]
    assert len(winners) == 1
    assert results.count(None) == 1
    # Keep the winning lease through both attempts: early release would permit
    # a second *legitimate* acquisition and invalidate the test's expectation.
    import_job.refresh_from_db()
    assert import_job.processing_lease_owner == winners[0].owner
    assert import_job.processing_fencing_token == winners[0].fencing_epoch
    assert import_job.retry_count == 0


def test_same_owner_redelivery_cannot_reacquire_live_lease(import_job) -> None:
    job_id = str(import_job.pk)
    first = leases.acquire_upload_job_import_lease(
        upload_job_id=job_id, owner="same-delivery-id"
    )
    with pytest.raises(leases.UploadJobImportLeaseBusy):
        leases.acquire_upload_job_import_lease(
            upload_job_id=job_id, owner="same-delivery-id"
        )
    import_job.refresh_from_db()
    assert import_job.processing_fencing_token == first.fencing_epoch
    assert import_job.retry_count == 0


@dataclass
class DatabaseClock:
    now: datetime

    def __call__(self, _job_id: str) -> datetime:
        return self.now


@pytest.mark.parametrize("replacement_owner", ["attempt-b", "attempt-a"])
def test_expiry_fences_old_attempt_even_when_owner_id_is_reused(
    import_job, monkeypatch, replacement_owner: str
) -> None:
    # Replace only the clock boundary, NOT transactions, queries, or fencing.
    clock = DatabaseClock(timezone.now())
    monkeypatch.setattr(leases, "_database_now", clock)
    job_id = str(import_job.pk)
    old = leases.acquire_upload_job_import_lease(
        upload_job_id=job_id, owner="attempt-a"
    )
    clock.now = old.expires_at  # Exact expiry boundary; no sleeping.
    new = leases.acquire_upload_job_import_lease(
        upload_job_id=job_id, owner=replacement_owner
    )
    assert new.fencing_epoch > old.fencing_epoch

    with pytest.raises(leases.UploadJobImportLeaseLost):
        leases.heartbeat_upload_job_import_lease(old)
    with pytest.raises(leases.UploadJobImportLeaseLost):
        leases.release_upload_job_import_lease(old)
    with pytest.raises(leases.UploadJobImportLeaseLost):
        with leases.locked_upload_job_import_lease(old) as owned_job:
            mark_upload_job_completed(owned_job)

    import_job.refresh_from_db()
    assert import_job.status == UploadJob.Status.PROCESSING.value
    assert import_job.processing_lease_owner == new.owner
    assert import_job.processing_fencing_token == new.fencing_epoch
    assert import_job.processing_lease_expires_at == new.expires_at
    assert import_job.retry_count == 0


def test_heartbeat_renews_without_changing_fencing_epoch(
    import_job, monkeypatch
) -> None:
    clock = DatabaseClock(timezone.now())
    monkeypatch.setattr(leases, "_database_now", clock)
    first = leases.acquire_upload_job_import_lease(
        upload_job_id=str(import_job.pk), owner="attempt-a"
    )
    clock.now = first.expires_at - timedelta(microseconds=1)
    renewed = leases.heartbeat_upload_job_import_lease(first)
    assert renewed.owner == first.owner
    assert renewed.fencing_epoch == first.fencing_epoch
    assert renewed.expires_at > first.expires_at


def test_required_constraints_exist_in_migrated_database() -> None:
    with connection.cursor() as cursor:
        constraints = connection.introspection.get_constraints(
            cursor, UploadJob._meta.db_table
        )
    for name in (
        "uniq_uploadjob_content_hash_active",
        "uniq_uploadjob_idempotency_scope_active",
    ):
        assert name in constraints
        assert constraints[name]["unique"]
    for name in (
        "upload_job_lease_state_consistent",
        "upload_job_retry_state_consistent",
    ):
        assert name in constraints
        assert constraints[name]["check"]
    # Presence alone does not verify partial-index predicates or behavior.
    # Add concurrent create/reuse tests with non-null source-center fixtures.
