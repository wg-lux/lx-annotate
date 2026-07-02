# Test Layout

Backend tests are grouped by the application surface they exercise:

- `api/`: Django and base API route behavior.
- `contracts/`: Cross-package contracts that lx-annotate relies on.
- `hub/`: Hub export, transfer, reconciliation, and security behavior.
- `ingestion/`: File watcher and ingest path behavior.
- `integration/`: Broader persistence and model integration coverage.
- `lookup/`: Runtime lookup tracking and CSV output.
- `media/`: Media-specific workflows, split by media type.
- `privacy/`: Encryption and pseudonymization behavior.
- `reporting/`: Report template and reporting API behavior.
- `services/`: Backend service-level behavior.
- `storage/`: Managed data directory and encrypted payload maintenance.
- `system/`: Deployment, settings, migration override, and runtime contracts.
- `views/`: View-level tests that stay close to their URL surface.

Shared pytest setup stays at the root of this directory.
