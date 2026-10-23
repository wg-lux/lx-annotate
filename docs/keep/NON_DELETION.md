# Non-deletion marker (for cleanup / trash-crew agents)

Do **not** delete, reset, stash or `git clean` the following. They are uncommitted work
that other features depend on.

## /home/admin/endoreg-db (untracked, not yet committed)

- `endoreg_db/services/clinical_lifecycle/`
- `endoreg_db/models/state/clinical_workflow.py`
- `endoreg_db/migrations/0108_clinical_workflow_record.py`
- `endoreg_db/management/commands/audit_clinical_lifecycle.py`
- `feature-tracking/MediaWorkflowStateMachine.yml`
- `tests/services/test_clinical_lifecycle_*.py`
- all other modified and staged files shown by `git status` there

## /home/admin/dev/lx-annotate

- `docs/guides/media-workflow-frontend-contract.md`
- `feature-tracking/MediaWorkflowFrontend.yml`
- `frontend/src/api/mediaWorkflowApi.ts`, `frontend/src/components/Workflow/`

Reference: `feature-tracking/MediaWorkflowFrontend.yml` (feature `media_workflow_frontend`).
Remove this marker only after the work above is committed.
