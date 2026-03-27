from __future__ import annotations

import sys
from types import SimpleNamespace


def _fresh_import(module_name: str):
    import importlib

    sys.modules.pop(module_name, None)
    return importlib.import_module(module_name)


def test_read_project_version_and_contract_exports(tmp_path):
    from lx_annotate import urls

    pyproject = tmp_path / "pyproject.toml"
    pyproject.write_text("[project]\nversion='1.2.3'\n", encoding="utf-8")
    assert urls._read_project_version(pyproject) == "1.2.3"
    assert urls._read_project_version(tmp_path / "missing.toml") is None

    submodule_root = tmp_path / "lx-data-models"
    contracts_dir = submodule_root / "lx_dtypes" / "models" / "contracts"
    contracts_dir.mkdir(parents=True)
    contracts_init = contracts_dir / "__init__.py"

    contracts_init.write_text("PdfRedactionRequest\n", encoding="utf-8")
    assert urls._has_required_base_api_contracts(submodule_root) is False

    contracts_init.write_text(
        "\n".join(urls.REQUIRED_BASE_API_CONTRACT_EXPORTS), encoding="utf-8"
    )
    assert urls._has_required_base_api_contracts(submodule_root) is True


def test_resolve_lx_data_models_root_prefers_env(monkeypatch, settings, tmp_path):
    from lx_annotate import urls

    env_root = tmp_path / "nix-provided-lx-data-models"
    monkeypatch.setenv("LX_DATA_MODELS_ROOT", str(env_root))
    monkeypatch.setattr(settings, "BASE_DIR", tmp_path / "ignored-base-dir")

    assert urls._resolve_lx_data_models_root() == env_root.resolve()


def test_urls_import_mounts_base_api_when_submodule_contracts_match(
    monkeypatch, settings, tmp_path
):
    submodule_root = tmp_path / "lx-data-models"
    contracts_dir = submodule_root / "lx_dtypes" / "models" / "contracts"
    contracts_dir.mkdir(parents=True)
    (submodule_root / "pyproject.toml").write_text(
        "[project]\nversion='0.1.1'\n", encoding="utf-8"
    )
    (contracts_dir / "__init__.py").write_text(
        "\n".join(
            [
                "PdfRedactionRequest = object()",
                "PdfRedactionResponse = object()",
                "CaseResolutionRequest = object()",
                "CaseResolutionResponse = object()",
                "RequirementEvaluationRequest = object()",
                "RequirementEvaluationResponse = object()",
                "DocumentType = object()",
                "ReportContext = object()",
            ]
        ),
        encoding="utf-8",
    )

    fake_api = SimpleNamespace(urls=("base-api-patterns", "base-api-app", "base-api"))
    monkeypatch.setenv("LX_ENABLE_BASE_API", "1")
    monkeypatch.setenv("LX_BASE_API_EXPECTED_VERSION", "0.1.1")
    monkeypatch.setattr(settings, "BASE_DIR", tmp_path)
    monkeypatch.setitem(
        sys.modules,
        "lx_dtypes.django.api.main",
        SimpleNamespace(api=fake_api),
    )

    module = _fresh_import("lx_annotate.urls")

    assert module.lx_dtypes_api_urls == fake_api.urls
    assert str(submodule_root) in sys.path
    assert any(
        getattr(pattern, "pattern", None) and str(pattern.pattern) == "base_api/"
        for pattern in module.urlpatterns
    )
