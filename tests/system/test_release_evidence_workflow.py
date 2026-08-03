from __future__ import annotations

from pathlib import Path

import yaml


REPO_ROOT = Path(__file__).resolve().parents[2]
WORKFLOW_PATH = REPO_ROOT / ".github" / "workflows" / "wheel-testpypi.yml"
CI_WORKFLOW_PATH = REPO_ROOT / ".github" / "workflows" / "ci-cd.yml"


def _workflow_text() -> str:
    return WORKFLOW_PATH.read_text(encoding="utf-8")


def test_wheel_workflow_records_and_revalidates_release_evidence() -> None:
    workflow = _workflow_text()
    parsed = yaml.safe_load(workflow)

    assert isinstance(parsed, dict)
    assert "Record immutable release evidence" in workflow
    assert '"commit_sha": os.environ["RELEASE_COMMIT_SHA"]' in workflow
    assert '"release_assessor": os.environ["RELEASE_ACTOR"]' in workflow
    assert '"endoreg-db": version("endoreg-db")' in workflow
    assert '"lx-dtypes": version("lx-dtypes")' in workflow
    assert "hashlib.sha256(artifact.read_bytes()).hexdigest()" in workflow
    assert workflow.count("wheel SHA-256 mismatch:") == 2
    assert workflow.count('installed_versions != evidence["package_versions"]') == 2


def test_release_metadata_is_not_uploaded_to_package_indexes() -> None:
    workflow = _workflow_text()

    cleanup = "rm -f dist/PACKAGE_VERSION.txt dist/RELEASE_EVIDENCE.json"
    assert workflow.count(cleanup) == 2
    assert workflow.count("name: python-package-distributions") >= 3


def test_clean_checkout_installs_dependencies_before_generated_staticfiles() -> None:
    release_workflow = _workflow_text()
    ci_workflow = CI_WORKFLOW_PATH.read_text(encoding="utf-8")

    assert "uv sync --frozen --extra dev --no-install-project" in release_workflow
    assert "uv sync --frozen --extra dev\n" not in release_workflow
    assert ci_workflow.count("uv sync --frozen --extra dev --no-install-project") == 2
