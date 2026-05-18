import importlib
import sys
from pathlib import Path

import pytest


REPO_ROOT = Path(__file__).resolve().parents[2]
# Optionally read values froma ctual luxnix on luxnix machines
LUXNIX_SERVICE_MODULE = Path(
    "/home/admin/luxnix/modules/nixos/services/lx-annotate-local/default.nix"
)
LUXNIX_SERVICE_MODULE_DIR = LUXNIX_SERVICE_MODULE.parent


def _read(path: str) -> str:
    return (REPO_ROOT / path).read_text(encoding="utf-8")


def _fresh_import(module_name: str):
    sys.modules.pop(module_name, None)
    return importlib.import_module(module_name)


def _read_luxnix_service_tree() -> str:
    return "\n".join(
        path.read_text(encoding="utf-8")
        for path in sorted(LUXNIX_SERVICE_MODULE_DIR.glob("*.nix"))
    )


def test_vite_config_uses_static_root_output_and_base_url():
    vite_cfg = _read("frontend/vite.config.ts")

    assert "base: '/static/'" in vite_cfg
    assert "outDir: resolve(__dirname, '../staticfiles')" in vite_cfg
    assert "emptyOutDir: false" in vite_cfg


def test_nix_module_exposes_role_and_storage_env_contract():
    module_nix = _read("nix/module.nix")

    assert "deploymentRole = lib.mkOption {" in module_nix
    assert '"central_hub"' in module_nix
    assert '"site_node"' in module_nix
    assert '"standalone"' in module_nix
    assert "ENDOREG_DEPLOYMENT_ROLE = cfg.deploymentRole;" in module_nix
    assert "ENDOREG_HUB_MODE" not in module_nix
    assert "STORAGE_DIR = effectiveStorageDir;" in module_nix


def test_systemd_env_example_has_role_and_protected_path_contract():
    env_example = _read("deployment_example/.env.systemd.example")

    assert "ENDOREG_DEPLOYMENT_ROLE=standalone" in env_example
    assert "ENDOREG_HUB_MODE" not in env_example
    assert "ENDOREG_ENABLE_HUB_TRANSFERS" not in env_example
    assert "LX_ANNOTATE_DEFAULT_CENTER=" in env_example
    assert "STORAGE_DIR=/var/lib/lx-annotate/data/storage" in env_example


def test_django_vite_manifest_paths_match_static_root_contract(monkeypatch):
    dev_settings = _read("lx_annotate/settings/settings_dev.py")
    prod_settings = _read("lx_annotate/settings/settings_prod.py")
    config_py = _read("lx_annotate/settings/config.py")
    secretspec = _read("secretspec.toml")
    devenv_nix = _read("devenv.nix")

    assert '"static_url_prefix": ""' in dev_settings
    monkeypatch.setenv("ENFORCE_AUTH", "0")
    dev_module = _fresh_import("lx_annotate.settings.settings_dev")
    dev_manifest_path = Path(dev_module.DJANGO_VITE["default"]["manifest_path"])
    assert dev_manifest_path == Path(dev_module.STATIC_ROOT) / ".vite" / "manifest.json"

    assert '"static_url_prefix": ""' in prod_settings
    base_module = importlib.import_module("lx_annotate.settings.settings_base")
    monkeypatch.setitem(
        base_module.REST_FRAMEWORK,
        "DEFAULT_PERMISSION_CLASSES",
        ["rest_framework.permissions.IsAuthenticated"],
    )
    prod_module = _fresh_import("lx_annotate.settings.settings_prod")
    prod_manifest_path = Path(prod_module.DJANGO_VITE["default"]["manifest_path"])
    assert (
        prod_manifest_path == Path(prod_module.STATIC_ROOT) / ".vite" / "manifest.json"
    )
    assert "DJANGO_STATIC_ROOT must not point to BASE_DIR/static" in prod_settings
    assert (
        'STATICFILES_STORAGE = "whitenoise.storage.CompressedStaticFilesStorage"'
        in prod_settings
    )
    assert "def _default_static_root() -> Path:" in config_py
    assert 'return runtime_root / "staticfiles"' in config_py
    assert (
        'DJANGO_STATIC_ROOT = { description = "Static root for django file serving", default = "staticfiles"}'
        in secretspec
    )
    assert (
        'MEDIA_URL = { description = "Media URL", default = "/protected_media/" }'
        in secretspec
    )
    assert (
        'PROTECTED_MEDIA_ROOT = { description = "Protected media root for Nginx internal handoff", default = "data/storage" }'
        in secretspec
    )
    assert (
        'LX_ANNOTATE_STREAMABLE_VIDEO_ROOT = { description = "Root for streamable video storage", default = "data/storage/streamable_videos" }'
        in secretspec
    )
    assert (
        'VITE_ENABLE_DEBUG = { description = "Frontend debug panels", default = "false" }'
        in secretspec
    )
    assert 'VITE_ENABLE_DEBUG = secret "VITE_ENABLE_DEBUG" "false";' in devenv_nix
    assert (
        "PROTECTED_MEDIA_ROOT = config.secretspec.secrets.PROTECTED_MEDIA_ROOT;"
        in devenv_nix
    )
    assert (
        "LX_ANNOTATE_STREAMABLE_VIDEO_ROOT = config.secretspec.secrets.LX_ANNOTATE_STREAMABLE_VIDEO_ROOT;"
        in devenv_nix
    )


def test_runtime_guard_checks_manifest_and_entry_file_in_static_root():
    management_nix = _read("devenv/management.nix")
    vue_tasks = _read("devenv/devTasks/vue.nix")

    assert (
        "static_root=\"''${DJANGO_STATIC_ROOT:-$REPO_ROOT/staticfiles}\""
        in management_nix
    )
    assert "DJANGO_STATIC_ROOT must not point to $REPO_ROOT/static" in management_nix
    assert 'manifest="$static_root/.vite/manifest.json"' in management_nix
    assert 'asset_path="$static_root/$entry_file"' in management_nix
    assert "devenv tasks run vue:build" in management_nix
    assert 'if [ -L "$static_root" ]; then' in vue_tasks
    assert 'static_root="$(readlink -f "$static_root")"' in vue_tasks
    assert 'if [ -L "$static_root" ]; then' in management_nix
    assert (
        'staged_static_root="$(mktemp -d "$static_root_parent/.lx-annotate-static.XXXXXX")"'
        in vue_tasks
    )
    assert 'find "$static_root" -mindepth 1 -maxdepth 1 -exec rm -rf {} +' in vue_tasks
    assert 'cp -r "$staged_static_root/." "$static_root/"' in vue_tasks
    assert 'chmod -R u+w "$staged_static_root"' in vue_tasks


def test_generated_docs_are_published_to_packaged_staticfiles():
    makefile = _read("Makefile")
    pyproject = _read("pyproject.toml")
    asset_deployment = _read("docs/guides/asset-deployment.md")

    assert "rsync -a --delete docs/_build/html/ static/docs/" in makefile
    assert "rsync -a --delete docs/_build/html/ staticfiles/docs/" in makefile
    assert '"staticfiles" = "lx_annotate/staticfiles"' in pyproject
    assert "static/docs` and `staticfiles/docs" in asset_deployment


def test_devenv_shell_pins_uv_to_devenv_state_venv():
    devenv_nix = _read("devenv.nix")

    assert 'UV_PROJECT_ENVIRONMENT = lib.mkForce ".devenv/state/venv";' in devenv_nix
    assert 'VENV_PATH=".devenv/state/venv"' in devenv_nix


def test_dockerfiles_use_devenv_state_venv_consistently():
    dockerfile_prod = _read("container/Dockerfile.prod")
    dockerfile_dev = _read("container/Dockerfile.dev")

    assert "UV_PROJECT_ENVIRONMENT=/app/.devenv/state/venv" in dockerfile_prod
    assert ". .devenv/state/venv/bin/activate && python --version" in dockerfile_prod
    assert 'PATH="/app/.devenv/state/venv/bin:$PATH"' in dockerfile_prod
    assert "/app/.venv/bin" not in dockerfile_prod

    assert "UV_PROJECT_ENVIRONMENT=/app/.devenv/state/venv" in dockerfile_dev
    assert ". .devenv/state/venv/bin/activate && python --version" in dockerfile_dev
    assert 'PATH="/app/.devenv/state/venv/bin:$PATH"' in dockerfile_dev
    assert "/app/.venv/bin" not in dockerfile_dev


@pytest.mark.skipif(
    not LUXNIX_SERVICE_MODULE.exists(),
    reason="local luxnix service module not available in this environment",
)
def test_local_luxnix_service_uses_single_devenv_environment():
    service_nix = _read_luxnix_service_tree()

    assert 'export SYNC_CMD="uv sync --active --extra dev --extra docs"' in service_nix
    assert ".devenv/state/venv/bin/activate" in service_nix
    assert ".devenv/state/venv/bin/python" in service_nix
    assert "devenv shell" in service_nix
    assert 'if [ -f ".devenv/state/venv/bin/activate" ]; then' in service_nix
    assert "source .devenv/state/venv/bin/activate" in service_nix
    assert 'elif [ -f ".venv/bin/activate" ]; then' in service_nix
    assert "source .venv/bin/activate" in service_nix


@pytest.mark.skipif(
    not LUXNIX_SERVICE_MODULE.exists(),
    reason="local luxnix service module not available in this environment",
)
def test_local_luxnix_service_keeps_repo_visible_static_root_and_var_lib_runtime_state():
    service_nix = _read_luxnix_service_tree()

    assert "runtimeDataRootPath = cfg.runtime.encryptedDataDir;" in service_nix
    assert "encryptedDataDir = mkOption {" in service_nix
    assert 'runtimeStaticRootPath = "/var/lib/lx-annotate/staticfiles";' in service_nix
    assert 'repoStaticRootPath = "${repoDir}/staticfiles";' in service_nix
    assert '"${runtimeWheelRootPath}/staticfiles"' in service_nix
    assert "repoStaticRootPath;" in service_nix
    assert "envDataDir = runtimeDataRootPath;" in service_nix
    assert 'StateDirectory = "lx-annotate";' in service_nix
    assert "DJANGO_STATIC_ROOT=${djangoStaticRootPath}" in service_nix
    assert "ln -sfn ${runtimeStaticRootPath}" in service_nix
    assert 'alias = "${djangoStaticRootPath}/";' in service_nix


@pytest.mark.skipif(
    not LUXNIX_SERVICE_MODULE.exists(),
    reason="local luxnix service module not available in this environment",
)
def test_local_luxnix_service_exposes_central_hub_backup_groundwork():
    service_nix = _read_luxnix_service_tree()

    assert 'hubRootPath = "${runtimeDataRootPath}/hub";' in service_nix
    assert 'hubBackupRootPath = "${hubRootPath}/backup";' in service_nix
    assert 'hubBackupIncomingPath = "${hubBackupRootPath}/incoming";' in service_nix
    assert 'hubBackupSnapshotPath = "${hubBackupRootPath}/snapshots";' in service_nix
    assert 'hubBackupManifestPath = "${hubBackupRootPath}/manifests";' in service_nix
    assert (
        "services.luxnix.lxAnnotateLocal.django.extraSettings.IS_CENTRAL_NODE ="
        in service_nix
    )
    assert "mkIf cfg.hub.enable (mkDefault true);" in service_nix
    assert (
        "systemd.services.lx-annotate-hub-backup = mkIf cfg.hub.backup.enable {"
        in service_nix
    )
    assert (
        "systemd.timers.lx-annotate-hub-backup = mkIf cfg.hub.backup.enable {"
        in service_nix
    )
    assert (
        'ExecStart = "${runLocalHubBackupScript}/bin/runLxAnnotateHubBackup";'
        in service_nix
    )
    assert "default = hubBackupIncomingPath;" in service_nix
    assert "default = hubBackupSnapshotPath;" in service_nix
    assert "default = hubBackupManifestPath;" in service_nix


def test_base_template_has_single_vite_asset_tag_and_no_global_labelstudio_script():
    template = _read("lx_annotate/templates/base.html")

    assert template.count("{% vite_asset 'src/main.ts' %}") == 1
    assert "label-studio@latest" not in template
    assert "window.LabelStudio" not in template


def test_frontend_defaults_to_same_origin_api_contract():
    config_ts = _read("frontend/src/config/index.ts")
    axios_ts = _read("frontend/src/api/axiosInstance.ts")
    video_axios_ts = _read("frontend/src/api/videoAxiosInstance.ts")
    endpoints_ts = _read("frontend/src/types/api/endpoints.ts")
    findings_api_ts = _read("frontend/src/api/findingsApi.ts")
    correction_vue = _read(
        "frontend/src/components/Anonymizer/AnonymizationCorrectionComponent.vue"
    )
    error_logger = _read("frontend/src/services/errorLogger.ts")

    assert "baseURL: import.meta.env.VITE_API_BASE_URL || '/'" in config_ts
    assert "baseURL: '/'," in axios_ts
    assert "import { endpoints } from '@/types/api/endpoints'" in video_axios_ts
    assert "endpoints.media.videos" in video_axios_ts
    assert ": `/api/${endpoints.media.videos}`" in video_axios_ts
    assert "videoStream: (pk: Id) => `media/videos/${pk}/stream/`" in endpoints_ts
    assert "patientPseudonym: (id: Id) => `patients/${id}/pseudonym/`" in endpoints_ts
    assert "import { endpoints } from '@/types/api/endpoints'" in findings_api_ts
    assert "ENDOREG_PATHS = {" in findings_api_ts
    assert "findings: `/api/${endpoints.router.findings}`" in findings_api_ts
    assert (
        "patientFindings: `/api/${endpoints.patient.patientFindings}`"
        in findings_api_ts
    )
    assert "http://localhost:8000" not in correction_vue
    assert "http://localhost:8000" not in error_logger


def test_frontend_endpoint_contract_covers_patient_and_reporting_helpers():
    endpoints_ts = _read("frontend/src/types/api/endpoints.ts")
    patient_service_ts = _read("frontend/src/api/patientService.ts")
    report_draft_api_ts = _read("frontend/src/api/reportDraftApi.ts")
    reporting_timeline_api_ts = _read("frontend/src/api/reportingTimelineApi.ts")
    dashboard_vue = _read("frontend/src/components/Dashboard/AnnotationDashboard.vue")
    assert (
        "patientDeletionSafety: (id: Id) => `patients/${id}/check_deletion_safety/`"
        in endpoints_ts
    )
    assert (
        "patientTimeline: (patientId: Id) => `media/patients/${patientId}/timeline/`"
        in endpoints_ts
    )
    assert (
        "patientExaminationDraft: (id: Id) => `patient-examinations/${id}/draft/`"
        in endpoints_ts
    )
    assert "examinationById: (id: Id) => `examinations/${id}/`" in endpoints_ts

    assert "import { endpoints } from '@/types/api/endpoints'" in patient_service_ts
    assert (
        "axiosInstance.post(r(endpoints.patient.patientPseudonym(id)))"
        in patient_service_ts
    )
    assert "axiosInstance.get(r(endpoints.patient.patients))" in patient_service_ts
    assert (
        "axiosInstance.put(r(endpoints.patient.patientById(patientId)), patientData)"
        in patient_service_ts
    )
    assert (
        "axiosInstance.delete(r(endpoints.patient.patientById(patientId)))"
        in patient_service_ts
    )
    assert "axiosInstance.get(r(endpoints.patient.genders))" in patient_service_ts
    assert "axiosInstance.get(r(endpoints.patient.centers))" in patient_service_ts

    assert (
        "r(endpoints.examination.patientExaminationDraft(patientExaminationId))"
        in report_draft_api_ts
    )
    assert (
        "r(endpoints.examination.patientExaminationDraft(params.patientExaminationId))"
        in report_draft_api_ts
    )
    assert (
        "axiosInstance.get(r(endpoints.media.patientTimeline(params.patientId))"
        in reporting_timeline_api_ts
    )

    assert "r(endpoints.media.videos)" in dashboard_vue
    assert "r(endpoints.media.videoSegments(videoId))" in dashboard_vue
    assert "endpoints.router.examinations" in dashboard_vue
    assert "endpoints.media.pdfSensitiveMetadataList" in dashboard_vue
    assert "endpoints.media.videoSegmentDetail(videoId, segment.id)" in dashboard_vue
    assert "endpoints.router.examinationById(examination.id)" in dashboard_vue


def test_debug_surfaces_use_global_vite_debug_flag():
    use_debug = _read("frontend/src/composables/useDebug.ts")
    anonymization_validation = _read(
        "frontend/src/components/Anonymizer/AnonymizationValidationComponent.vue"
    )
    env_types = _read("frontend/env.d.ts")

    assert "VITE_ENABLE_DEBUG" in use_debug
    assert "const { isDebug } = useDebug();" in anonymization_validation
    assert 'v-if="isDebug"' in anonymization_validation
    assert "readonly VITE_ENABLE_DEBUG?: string" in env_types
