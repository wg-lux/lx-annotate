# OpenAPI type generation

LX-Annotate exposes two independently owned Django Ninja APIs:

- `/endoreg-api/` contains persistence-backed report routes from `endoreg_db`.
- `/dtypes-api/` contains terminology, knowledge-base, and report-template routes from `lx_dtypes`.

Run `npm --prefix frontend run typegen` from the repository root to export both
OpenAPI documents offline and regenerate their TypeScript modules. Run
`npm --prefix frontend run typegen:check` in CI to fail when committed schemas or
generated types are stale.

The generated files under `frontend/openapi/` and
`frontend/src/types/generated/` are derived artifacts. Do not edit them by hand.
Frontend code may import `paths`, `operations`, and `components` from the API it
actually calls, keeping terminology contracts separate from persistence
contracts. `frontend/src/types/api/openapi.ts` applies the same recursive
snake-case to camel-case transformation that `axiosInstance.ts` performs at
runtime and exposes application-facing aliases for generated schemas.

The exporter rewrites `openapi-typescript`'s indexed self-reference for the
backend's recursive `JsonValue` schema into an equivalent top-level recursive
alias. This preserves the JSON value contract while avoiding TypeScript error
TS2502 in generated declarations.

The exporter uses Django's test settings for schema introspection only. It does
not start a server, connect to production, or embed deployment secrets. OpenAPI
files are persisted through the project's atomic filesystem wrapper.

This workflow covers Django Ninja operations. Most media, anonymization, and
administration routes are Django REST Framework routes; they remain covered by
the resolver and API contract tests and must not be assumed to exist in these
Ninja-generated modules.

Only parameters and request schemas declared in Django Ninja endpoint
signatures appear in OpenAPI. The current persistence-backed report mutation
handlers parse their request bodies manually, so their generated operations have
no `requestBody` type. Keep their existing validated request contracts and
cross-boundary tests until those handlers are migrated to declared Ninja input
schemas; do not infer request safety from the response-only generated types.
