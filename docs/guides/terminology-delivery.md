# Governed terminology delivery

Terminology shown by the reporting frontend is a deployed, versioned artifact.
It is not loaded from a developer checkout. The only runtime selection source
is the JSON file named by `LX_DTYPES_KB_REGISTRY`.

## Delivery path

1. Authors change YAML in `lx-data-models` or an approved terminology editor.
2. The complete knowledge-base graph is schema- and semantically validated.
3. The approved export receives an immutable module name and version.
4. An authorized terminology administrator selects one or more editor ZIPs, a
   package directory, or a directory containing complete package directories
   in *Settings -> Terminology*. ZIPs may come from local
   storage or a cloud location exposed by the operating system's file picker.
5. Folder selections are split at their top-level `config.yaml` files and
   packaged in the browser. Every resulting ZIP is sent sequentially through
   `POST /dtypes-api/terminology/bundles/import`; sequential processing prevents
   concurrent registry updates from overwriting one another.
6. The server validates each extracted artifact before atomically registering
   and activating its exact identity. A failed package is reported by name and
   does not stop the remaining packages. The last successful package is active.
7. Startup checks report missing or invalid terminology as an operational
   warning. Annotation remains available while terminology-dependent reporting
   shows its setup or error state.
8. The frontend reads the active identity, templates, and findings through
   `/dtypes-api/`. It never receives server filesystem paths.

The registry must contain the active identity and its versioned data root:

```json
{
  "active": {
    "module_name": "gastroenterology_reporting",
    "version": "2026.07.31"
  },
  "modules": {
    "gastroenterology_reporting": {
      "2026.07.31": {
        "input_dirs": ["/var/lib/lx-annotate/data/terminology/packages/gastroenterology_reporting/2026.07.31"]
      }
    }
  }
}
```

`input_dirs` and the registry path are server-private deployment data. Public
bundle responses expose identities and metadata only.

## Prohibited runtime overlays

Do not use a checkout path, current working directory,
`LOOKUP_DTYPES_DATA_ROOT`, `LX_DATA_MODELS_ROOT`, a Nix source-tree input, a
browser default, or process-local active state as a clinical runtime source.
There is no public `/base_api/` compatibility mount. The canonical mount is
`/dtypes-api/`.

## Verification and release evidence

Verification is staged. Passing source tests does not prove a packaged
deployment:

1. Run the declared feature verifier exactly as recorded in
   `endoreg-db/feature-tracking/AssistedReportingApiIntegration.yml`.
2. Build the `lx-dtypes` wheel, install it into a clean environment, register
   its packaged data root, and load the intended module/version.
3. Build the matching frontend and Python deployment artifacts.
4. Start the production settings/service profile with the provisioned registry
   and host adapter.
5. Smoke-test `/dtypes-api/terminology/bundles`, the examination finding route,
   and patient-finding reads through the deployed ingress.
6. Record the exact `lx-annotate`, `endoreg_db`, and `lx-dtypes` artifact
   versions and the exact commands and results.

A feature criterion may be marked `verified` only after every acceptance
bullet has evidence. Its assessment note must describe a completed state; any
required work still described as outstanding means the status remains
`in_progress` or `blocked`.

## Failure behavior

Missing or malformed registries, unregistered active identities, and unloadable
bundles do not block application or annotation startup. Operations that require
terminology still fail explicitly; the frontend does not guess a module or
retry against a legacy route. Missing host adapters remain startup failures.
Import and activation require the configured terminology write role and use
atomic registry replacement.

Direct server-side imports from arbitrary cloud URLs are intentionally not
supported. Such an endpoint would require a defined provider, machine identity,
host allowlist, download limits, and audit policy. Until that contract exists,
cloud packages must be selected through the browser/operating-system file
picker so lx-annotate never receives cloud credentials or fetches untrusted
URLs.
