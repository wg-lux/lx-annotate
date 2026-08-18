# LX-Annotate KB mismatch patch

## Target

This patch is based on:

```text
wg-lux/lx-annotate
24242d4deec2e39e9a47e87c9a9f625053d0fd8d
```

It addresses the inconsistent reporting UI where the active installed
`lx-dtypes` bundle can resolve a report template, while the global reporting
shell clears its own template list because the selected `PatientExamination`
is pinned to a different knowledge-base identity.

## Behavior after applying

- The active bundle's versioned reporting-context endpoint is queried even when
  the persisted patient-examination binding differs.
- Published templates from the installed bundle become visible in the global
  template selector.
- The persisted binding remains authoritative.
- Finding-catalog loading, draft verification, report generation, export, and
  finalization remain blocked until the patient examination is deliberately
  rebound or its originally bound bundle is activated.
- Only a typed knowledge-base mismatch triggers this discovery path. Ordinary
  endpoint failures and stale route contexts keep their previous behavior.

The patch does **not** silently reinterpret existing clinical data.

## Apply

From the `lx-annotate` repository:

```bash
git status --short
git rev-parse HEAD
git apply --check /path/to/0001-fix-reporting-template-discovery-on-kb-mismatch.patch
git apply /path/to/0001-fix-reporting-template-discovery-on-kb-mismatch.patch
```

The patch is anchored to the commit above. When `main` has moved, first inspect:

```bash
git diff 24242d4deec2e39e9a47e87c9a9f625053d0fd8d..HEAD --   frontend/src/views/reporting/ReportingShell.vue   frontend/src/views/reporting/reportingKnowledgeBaseContext.ts   frontend/src/views/reporting/__tests__/ReportingShell.mediaPreload.test.ts
```

## Validate

```bash
cd frontend
npm ci

npm run type-check
npm run type-check:component-tests
npm run test:unit -- --run   src/views/reporting/__tests__/ReportingShell.mediaPreload.test.ts

npx eslint   src/views/reporting/ReportingShell.vue   src/views/reporting/reportingKnowledgeBaseContext.ts   src/views/reporting/__tests__/ReportingShell.mediaPreload.test.ts   --max-warnings 0
```

## Rebind the empty legacy examination

The included `migrate_empty_patient_examination_kb.py` is a guarded one-time
recovery utility. It validates the exact installed target KB, locks the row,
checks the expected source identity, and refuses migration when structured
reporting state exists.

For the displayed development examination:

```bash
LX_PE_ID=169 LX_EXPECTED_KB=report_template_examples@0.1.1 LX_TARGET_KB=mst_3_0@3.0.0 lx-annotate-manage shell < /path/to/migrate_empty_patient_examination_kb.py
```

Do not run that command when examination `169` contains findings, indications,
reports, a report draft, or a dtypes record. The script checks those conditions
again inside the transaction and has no force mode.
