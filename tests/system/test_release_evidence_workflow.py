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
    assert ".venv/bin/python - <<'PY'" in workflow
    assert "hashlib.sha256(artifact.read_bytes()).hexdigest()" in workflow
    assert workflow.count("wheel SHA-256 mismatch:") == 2
    assert workflow.count('installed_versions != evidence["package_versions"]') == 2
    assert workflow.count("known_decord_metadata_error") == 4
    assert workflow.count("pip check failed with unexpected dependency errors") == 2
    assert workflow.count("assert decord.__version__ == '0.6.0'; decord.cpu(0)") == 2
    assert workflow.count("hub_route_smoke = (") == 2
    assert workflow.count("lx-annotate installed Hub route mismatch") == 2
    assert workflow.count("/endoreg-api/") == 2
    assert workflow.count("/api/") == 2
    assert workflow.count("media/hub/transfers/") == 6
    assert workflow.count("hub-transfer-create") == 2
    assert workflow.count("hub-transfer-status") == 2
    assert workflow.count("hub-transfer-media-upload") == 2


def test_release_metadata_is_not_uploaded_to_package_indexes() -> None:
    workflow = yaml.safe_load(_workflow_text())
    for job_name in ("publish-testpypi", "publish-pypi"):
        steps = workflow["jobs"][job_name]["steps"]
        selection = next(
            step
            for step in steps
            if step.get("name") == "Select application distributions for publication"
        )
        assert selection["run"].splitlines() == [
            "mkdir publish-dist",
            "cp dist/lx_annotate-*.whl dist/lx_annotate-*.tar.gz publish-dist/",
        ]
        publish = next(
            step
            for step in steps
            if step.get("uses", "").startswith("pypa/gh-action-pypi-publish@")
        )
        assert publish["with"]["packages-dir"] == "publish-dist/"
        assert steps.index(selection) < steps.index(publish)


def test_release_install_smoke_targets_supported_linux_runtime() -> None:
    workflow = _workflow_text()

    assert workflow.count("- ubuntu-latest") == 2
    assert "- macos-latest" not in workflow
    assert "- windows-latest" not in workflow
    assert '"pip", "install", "--upgrade", "pip"' not in workflow


def test_clean_checkout_installs_dependencies_before_generated_staticfiles() -> None:
    release_workflow = _workflow_text()
    ci_workflow = CI_WORKFLOW_PATH.read_text(encoding="utf-8")

    assert "uv sync --frozen --extra dev --no-install-project" in release_workflow
    assert "uv sync --frozen --extra dev\n" not in release_workflow
    assert ci_workflow.count("uv sync --frozen --extra dev --no-install-project") == 2
    for source in (release_workflow, ci_workflow):
        workflow = yaml.safe_load(source)
        for job in workflow["jobs"].values():
            steps = job.get("steps", [])
            install_index = next(
                (
                    index
                    for index, step in enumerate(steps)
                    if "uv sync --frozen --extra dev --no-install-project"
                    in step.get("run", "")
                ),
                None,
            )
            if install_index is None:
                continue
            for index, step in enumerate(steps):
                if step.get("name") == "Build frontend staticfiles":
                    assert install_index < index
                for command in step.get("run", "").splitlines():
                    if command.strip().startswith("uv run") and any(
                        tool in command for tool in ("pytest", "mypy", "ruff")
                    ):
                        assert install_index < index
                        assert command.strip().startswith("uv run --no-sync ")
