from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]


def _read(path: str) -> str:
    return (REPO_ROOT / path).read_text(encoding="utf-8")


def test_vite_config_uses_static_root_output_and_base_url():
    vite_cfg = _read("frontend/vite.config.ts")

    assert "base: '/static/'" in vite_cfg
    assert "outDir: resolve(__dirname, '../static')" in vite_cfg
    assert "emptyOutDir: false" in vite_cfg


def test_django_vite_manifest_paths_match_static_root_contract():
    dev_settings = _read("lx_annotate/settings/settings_dev.py")
    prod_settings = _read("lx_annotate/settings/settings_prod.py")
    config_py = _read("lx_annotate/settings/config.py")
    secretspec = _read("secretspec.toml")
    devenv_nix = _read("devenv.nix")

    assert '"static_url_prefix": ""' in dev_settings
    assert 'os.path.join(BASE_DIR, "static", ".vite", "manifest.json")' in dev_settings

    assert '"static_url_prefix": ""' in prod_settings
    assert 'os.path.join(STATIC_ROOT, ".vite", "manifest.json")' in prod_settings
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

    assert (
        "static_root=\"''${DJANGO_STATIC_ROOT:-$REPO_ROOT/staticfiles}\""
        in management_nix
    )
    assert "DJANGO_STATIC_ROOT must not point to $REPO_ROOT/static" in management_nix
    assert 'manifest="$static_root/.vite/manifest.json"' in management_nix
    assert 'asset_path="$static_root/$entry_file"' in management_nix


def test_base_template_has_single_vite_asset_tag_and_no_global_labelstudio_script():
    template = _read("lx_annotate/templates/base.html")

    assert template.count("{% vite_asset 'src/main.ts' %}") == 1
    assert "label-studio@latest" not in template
    assert "window.LabelStudio" not in template


def test_reporting_debug_panels_use_global_vite_debug_flag():
    use_debug = _read("frontend/src/composables/useDebug.ts")
    findings_detail = _read(
        "frontend/src/components/RequirementReport/FindingsDetail.vue"
    )
    requirement_generator = _read(
        "frontend/src/components/RequirementReport/RequirementGenerator.vue"
    )
    assisted_report = _read("frontend/src/components/AssistedReporting/Report.vue")
    env_types = _read("frontend/env.d.ts")

    assert "VITE_ENABLE_DEBUG" in use_debug
    assert "const { isDebug } = useDebug()" in findings_detail
    assert 'v-if="isDebug && debugInfo.findingId"' in findings_detail
    assert "const { isDebug } = useDebug();" in requirement_generator
    assert 'v-if="lookup && isDebug"' in requirement_generator
    assert "const { isDebug } = useDebug();" in assisted_report
    assert 'v-if="lookup && isDebug"' in assisted_report
    assert "readonly VITE_ENABLE_DEBUG?: string" in env_types
