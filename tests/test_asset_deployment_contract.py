import importlib
import sys
from pathlib import Path

import pytest


REPO_ROOT = Path(__file__).resolve().parents[1]
# Optionally read values froma ctual luxnix on luxnix machines
LUXNIX_SERVICE_MODULE = Path(
    "/home/admin/luxnix/modules/nixos/services/lx-annotate-local/default.nix"
)


def _read(path: str) -> str:
    return (REPO_ROOT / path).read_text(encoding="utf-8")


def _fresh_import(module_name: str):
    sys.modules.pop(module_name, None)
    return importlib.import_module(module_name)


def test_vite_config_uses_static_root_output_and_base_url():
    vite_cfg = _read("frontend/vite.config.ts")

    assert "base: '/static/'" in vite_cfg
    assert "outDir: resolve(__dirname, '../staticfiles')" in vite_cfg
    assert "emptyOutDir: false" in vite_cfg


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
    assert 'os.getenv("DJANGO_STATIC_ROOT", "./staticfiles")' in config_py
    assert (
        'DJANGO_STATIC_ROOT = { description = "Static root for django file serving", default = "staticfiles"}'
        in secretspec
    )
    assert (
        'VITE_ENABLE_DEBUG = { description = "Frontend debug panels", default = "false" }'
        in secretspec
    )
    assert (
        "VITE_ENABLE_DEBUG = config.secretspec.secrets.VITE_ENABLE_DEBUG;" in devenv_nix
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
    service_nix = LUXNIX_SERVICE_MODULE.read_text(encoding="utf-8")

    assert 'export SYNC_CMD="uv sync --active --extra dev --extra docs"' in service_nix
    assert ".devenv/state/venv/bin/activate" in service_nix
    assert '".devenv/state/venv/bin/python"' in service_nix
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
    service_nix = LUXNIX_SERVICE_MODULE.read_text(encoding="utf-8")

    assert "runtimeDataRootPath = cfg.runtime.encryptedDataDir;" in service_nix
    assert "encryptedDataDir = mkOption {" in service_nix
    assert 'runtimeStaticRootPath = "/var/lib/lx-annotate/staticfiles";' in service_nix
    assert (
        'djangoStaticRootPath = if useWheelRuntime then "${runtimeWheelRootPath}/staticfiles" else repoStaticRootPath;'
        in service_nix
    )
    assert "envDataDir = runtimeDataRootPath;" in service_nix
    assert 'StateDirectory = "lx-annotate";' in service_nix
    assert "DJANGO_STATIC_ROOT=${djangoStaticRootPath}" in service_nix
    assert "ln -sfn ${runtimeStaticRootPath} ${djangoStaticRootPath}" in service_nix
    assert 'alias = "${djangoStaticRootPath}/";' in service_nix


def test_base_template_has_single_vite_asset_tag_and_no_global_labelstudio_script():
    template = _read("lx_annotate/templates/base.html")

    assert template.count("{% vite_asset 'src/main.ts' %}") == 1
    assert "label-studio@latest" not in template
    assert "window.LabelStudio" not in template


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
