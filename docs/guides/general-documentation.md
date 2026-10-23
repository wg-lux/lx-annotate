# Explore LX-Annotate

LX-Annotate supports clinical media review, annotation, and reporting.
You can help by explaining a workflow, improving a guide, reproducing a bug,
adding a test, or changing code. Choose a path that fits your interests.

## Choose a Reading Path

### Clinical Workflows

1. [Review anonymization and request corrections](anonymization-validation-correction-workflow.md).
2. [Review and validate video segments](segment-annotation-workflow.md).
3. [Document findings and create reports](reporting-template-requirements-page.md).
4. [Export annotations for AI training](ai-training-data-export.md).

Anonymization approval and segment validation are separate steps.
The workflow guides explain when each step is complete.

### Development

1. Follow the [local setup](https://github.com/wg-lux/lx-annotate/blob/main/README.md#quick-start-development).
2. Read the [architecture and API contract](core-concept-contract.md).
3. Use [structure.yml](../../structure.yml) to find the module you want to change.
4. Check the [API reference](../api/index.md) and the module's tests.

`lx-annotate` connects the Django application and Vue interface.
`endoreg_db` owns shared clinical models, ingestion, and encrypted storage.
`lx_dtypes` owns knowledge-base and lookup schemas. Shared guidance covers
[dates and times](https://github.com/wg-lux/lx-data-models/blob/main/docs/guides/dates-and-times.md)
and [Pydantic models](https://github.com/wg-lux/lx-data-models/blob/main/docs/guides/pydantic-cheatsheet.md).
For more detail, see the [findings migration plan](dtypes-findings-migration.md),
[readiness review](core-concept-readiness-verdict.md), and
[type matrix](core-concept-type-matrix.md).

### Operations

Start with the [deployment strategy](deployment-strategy.md).
Then follow the [wheel deployment guide](wheel-deployment.md) and
[frontend asset guide](asset-deployment.md).
For transfers, see [hub export](hub-export-workflow.md) and
[hub storage management](hub-storage-load-balancing.md).

## Roadmap

The feature YAML files hold requirements, assessments, and verification evidence.
Use them to choose work and check what remains open. The sequence below is a
contribution guide; release dates depend on verification and maintainer review.

| Focus | Next work | Requirements and evidence |
| --- | --- | --- |
| Reliable clinical workflows | Verify draft recovery and template identity. Review video workflow states and annotation gates. | [Reporting](../../feature-tracking/ReportingClinicalReadiness.yml), [video lifecycle](../../feature-tracking/VideoLifecycleFrontendReadiness.yml) |
| Consistent API contracts | Check request paths, payloads, and response handling across the UI and backend. Add regressions for mismatches. | [API contracts](../../feature-tracking/FrontendBackendApiContracts.yml) |
| Application acceptance | Complete accessibility reviews, performance budgets, privacy-safe monitoring, and operator walkthroughs. | [Application readiness](../../feature-tracking/ProfessionalApplicationReadiness.yml) |

### Make a First Contribution

1. Choose a workflow or an open criterion in the linked YAML files.
2. Describe the problem and expected result in an issue or pull request.
   For bugs, include reproduction steps using synthetic data.
3. Read the relevant code, contracts, and tests. Keep the change focused.
4. Run the relevant checks and `python scripts/lint_structure.py`.
   Report results and remaining gaps.

For documentation changes, use English, short sentences, and descriptive links.
Explain the next action. Keep security and clinical requirements precise.
Keep patient data and secrets out of issues, examples, and test evidence.

See the [tracking guide](https://github.com/wg-lux/lx-annotate/blob/main/feature-tracking/README.md) for assessment commands
and the [agent context guide](../agent_context.md) for manifest maintenance.
Release approval requires verified evidence for every required criterion.

## Try the Reporting Workflow

1. Open `/reporting` in your local instance.
2. Create or open a case.
3. Select a template and requirement sets.
4. Record findings and classifications.
5. Review the report and finalize its artifacts.

If templates are missing, check the selected module and examination type.
If requirement sets are empty, check the `patient_examination_id` and active
lookup token. The [reporting guide](reporting-template-requirements-page.md)
explains each step.

## Build the Documentation

From the repository root, run:

```bash
uv run --extra docs make -C docs html
```

Open `docs/_build/html/index.html` to review the generated pages.
To include them in the frontend, copy the build output:

```bash
mkdir -p static/docs
rsync -a --delete docs/_build/html/ static/docs/
mkdir -p staticfiles/docs
rsync -a --delete docs/_build/html/ staticfiles/docs/
```
