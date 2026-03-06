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

    assert '"static_url_prefix": ""' in dev_settings
    assert 'os.path.join(BASE_DIR, "static", ".vite", "manifest.json")' in dev_settings

    assert '"static_url_prefix": ""' in prod_settings
    assert 'os.path.join(STATIC_ROOT, ".vite", "manifest.json")' in prod_settings


def test_runtime_guard_checks_manifest_and_entry_file_in_static_root():
    management_nix = _read("devenv/management.nix")

    assert 'manifest="$static_root/.vite/manifest.json"' in management_nix
    assert 'asset_path="$static_root/$entry_file"' in management_nix


def test_base_template_has_single_vite_asset_tag_and_no_global_labelstudio_script():
    template = _read("lx_annotate/templates/base.html")

    assert template.count("{% vite_asset 'src/main.ts' %}") == 1
    assert "label-studio@latest" not in template
    assert "window.LabelStudio" not in template
