# General Documentation Guide

This page is the central orientation for `lx-annotate` documentation.

## Who This Is For

- Medical staff documenting examinations and findings
- Clinical trainers onboarding new users
- Operations and support staff maintaining day-to-day workflows
- Developers maintaining APIs and UI modules

## Documentation Structure

- `assisted-reporting-report`: Practical reporting workflow with step-by-step guidance
- `guides/asset-deployment`: Frontend build/manifest/runtime deployment contract
- `guides/hub-export-workflow`: Secure outbound transfer and export workflow
- `guides/ai-training-data-export`: Frame, annotation, AI dataset, and GastroNet-style training exports
- `guides/segment-annotation-workflow`: Practical video segment review and validation workflow
- `guides/anonymization-validation-correction-workflow`: Validation/approval and correction flow before reporting
- `guides/reporting-template-requirements-page`: Detailed template and requirement-set workflow
- `guides/dtypes-findings-migration`: Incremental findings migration plan
- `guides/core-concept-contract`: Core concept contract and API surface
- `guides/core-concept-readiness-verdict`: Readiness assessment for structured evaluation
- `guides/core-concept-type-matrix`: Generated type matrix for core concepts
- `guides/dates-and-times`: Date/time conventions
- `guides/pydantic-cheatsheet`: Data-modeling and validation patterns
- `api/index`: API reference entry point

To add documentation to the frontend run these commands:

```bash
uv run --extra docs make -C docs html
mkdir -p static/docs
rsync -a --delete docs/_build/html/ static/docs/
mkdir -p staticfiles/docs
rsync -a --delete docs/_build/html/ staticfiles/docs/
```

## Recommended Reading Paths

### Clinical Documentation Path

1. `assisted-reporting-report`
2. `guides/anonymization-validation-correction-workflow`
3. `guides/segment-annotation-workflow`
4. `guides/ai-training-data-export`
5. `guides/reporting-template-requirements-page`

### Technical Maintenance Path

1. `guides/dates-and-times`
2. `guides/pydantic-cheatsheet`
3. `guides/core-concept-contract`
4. `guides/dtypes-findings-migration`
5. `api/index`

## Quick Start

1. Open the reporting workflow from `/reporting`.
2. Create or open a case.
3. Select template and requirement sets.
4. Capture findings and classifications.
5. Complete report editor and finalize artifacts.

## Support Notes

- If templates are missing, verify selected module and examination type.
- If requirement sets are empty, ensure a valid `patient_examination_id` and active lookup token exist.
- If a step is unclear for training, start with `assisted-reporting-report` and follow the section order.
