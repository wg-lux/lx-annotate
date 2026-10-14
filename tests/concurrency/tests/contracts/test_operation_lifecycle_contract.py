"""Native reducer contract tests; no database, broker, or media processing.

Reviewed API: endoreg-db ff000ca3d4deabf61e8806c5de1ab12b026bf29c.
The table is an explicit test specification, NOT a new production reducer.
Review intended behavior when changing it; do not generate expected results
by calling the production implementation.
"""

from __future__ import annotations

from itertools import product

import pytest

from endoreg_db.services.runtime.lifecycle_state_machine import (
    OperationClaimPath,
    OperationLifecycleEvent as E,
    OperationLifecycleState as S,
    reduce_operation_lifecycle,
    transition_operation_lifecycle,
)
from endoreg_db.utils.rust_backend import has_native_capability

# Deliberately explicit: absence means rejection, not "leave state unchanged".
EXPECTED: dict[S, dict[E, S]] = {
    S.QUEUED: {
        E.CLAIM: S.CLAIMED,
        E.FAIL: S.FAILED,
        E.RETRY_SCHEDULED: S.RETRY_WAIT,
        E.RETRY_READY: S.QUEUED,
        E.CANCEL: S.CANCELLED,
        E.OWNERSHIP_LOST: S.LOST,
        E.INTEGRITY_LOST: S.LOST,
    },
    S.CLAIMED: {
        E.CLAIM: S.CLAIMED,
        E.START: S.RUNNING,
        E.FAIL: S.FAILED,
        E.RETRY_SCHEDULED: S.RETRY_WAIT,
        E.CANCEL: S.CANCELLED,
        E.OWNERSHIP_LOST: S.LOST,
        E.INTEGRITY_LOST: S.LOST,
    },
    S.RUNNING: {
        E.START: S.RUNNING,
        E.SUCCEED: S.SUCCEEDED,
        E.FAIL: S.FAILED,
        E.RETRY_SCHEDULED: S.RETRY_WAIT,
        E.CANCEL: S.CANCELLED,
        E.OWNERSHIP_LOST: S.LOST,
        E.INTEGRITY_LOST: S.LOST,
    },
    S.RETRY_WAIT: {
        E.FAIL: S.FAILED,
        E.RETRY_SCHEDULED: S.RETRY_WAIT,
        E.RETRY_READY: S.QUEUED,
        E.CANCEL: S.CANCELLED,
        E.OWNERSHIP_LOST: S.LOST,
        E.INTEGRITY_LOST: S.LOST,
    },
    S.SUCCEEDED: {
        E.SUCCEED: S.SUCCEEDED,
        E.RETRY_REQUESTED: S.RETRY_WAIT,
        E.INTEGRITY_LOST: S.LOST,
    },
    S.FAILED: {
        E.FAIL: S.FAILED,
        E.RETRY_REQUESTED: S.RETRY_WAIT,
    },
    S.CANCELLED: {E.CANCEL: S.CANCELLED},
    S.LOST: {
        E.OWNERSHIP_LOST: S.LOST,
        E.INTEGRITY_LOST: S.LOST,
        E.RECONCILE_RETRY: S.RETRY_WAIT,
        E.RECONCILE_FAIL: S.FAILED,
    },
}


@pytest.fixture(scope="module", autouse=True)
def require_native_contract() -> None:
    assert has_native_capability("lifecycle_state_machine", "lifecycle_state_v3"), (
        "Release verification requires the real lifecycle_state_v3 extension; "
        "do not skip this test or monkeypatch the native capability."
    )


def test_expected_table_covers_every_declared_state() -> None:
    assert set(EXPECTED) == set(S)


@pytest.mark.parametrize(
    ("state", "event"),
    list(product(S, E)),
    ids=lambda value: value.value,
)
def test_native_transition_contract(state: S, event: E) -> None:
    expected = EXPECTED[state].get(event)
    if expected is None:
        with pytest.raises(ValueError):
            transition_operation_lifecycle(state, event)
    else:
        assert transition_operation_lifecycle(state, event) is expected


@pytest.mark.parametrize(
    ("state", "path"),
    [
        (S.QUEUED, OperationClaimPath.INITIAL),
        (S.RETRY_WAIT, OperationClaimPath.RETRY_READY),
        (S.FAILED, OperationClaimPath.RETRY_REQUESTED),
        (S.SUCCEEDED, OperationClaimPath.RETRY_REQUESTED),
        (S.LOST, OperationClaimPath.RECONCILE),
        (S.RUNNING, OperationClaimPath.INTERRUPTED),
    ],
)
def test_declared_claim_path_ends_running(state: S, path: OperationClaimPath) -> None:
    # This checks reducer semantics, NOT authorization to select this path.
    assert reduce_operation_lifecycle(state, path.events) is S.RUNNING
