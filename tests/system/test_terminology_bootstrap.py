from __future__ import annotations

import json
import stat
from pathlib import Path

import pytest
from lx_dtypes.knowledge_bases import (
    BUILTIN_KNOWLEDGE_BASE_PROVIDER,
    get_packaged_knowledge_base,
)
from lx_dtypes.models.interface.KnowledgeBaseResolver import (
    clear_knowledge_base_resolver_caches,
    load_knowledge_base,
)

from lx_annotate.runtime_commands.terminology_bootstrap import (
    PACKAGED_REPORTING_MODULES,
    main,
)


def _write_custom_bundle(
    root: Path,
    *,
    module_name: str = "custom_reporting",
    version: str = "7.4.0",
) -> None:
    module_dir = root / module_name
    data_dir = module_dir / "data"
    data_dir.mkdir(parents=True)
    (module_dir / "config.yaml").write_text(
        "\n".join(
            [
                f"name: {module_name}",
                f"version: {version}",
                "modules: []",
                "depends_on: []",
                "data:",
                "  dirs:",
                "    - ./data",
            ],
        )
        + "\n",
        encoding="utf-8",
    )
    (data_dir / "units.yaml").write_text(
        "- model: unit\n  name: custom_unit\n  abbreviation: cu\n",
        encoding="utf-8",
    )


def test_bootstrap_registers_installed_lx_dtypes_reporting_bundles(
    tmp_path: Path,
    capsys,
) -> None:
    registry = tmp_path / "terminology" / "registry.json"

    assert main(["--registry", str(registry)]) == 0

    payload = json.loads(registry.read_text(encoding="utf-8"))
    assert stat.S_IMODE(registry.stat().st_mode) == 0o600
    active = payload["active"]
    assert active == {"module_name": "star_upper_gi", "version": "0.1.2"}
    assert set(payload["modules"]) == set(PACKAGED_REPORTING_MODULES)
    descriptor = get_packaged_knowledge_base(active["module_name"], active["version"])
    assert payload["modules"][active["module_name"]][active["version"]] == {
        "medical_field": "gastroenterology",
        "sources": [
            {
                "kind": "provider",
                "provider": BUILTIN_KNOWLEDGE_BASE_PROVIDER,
                "content_sha256": descriptor.content_sha256,
            },
        ],
    }
    event = json.loads(capsys.readouterr().out)
    assert event["status"] == "ok"
    assert event["module"] == active["module_name"]
    assert event["version"] == active["version"]


def test_bootstrap_treats_precreated_empty_registry_as_new(tmp_path: Path) -> None:
    registry = tmp_path / "terminology" / "registry.json"
    registry.parent.mkdir(parents=True)
    registry.write_text('{"modules": {}}\n', encoding="utf-8")

    assert main(["--registry", str(registry)]) == 0

    payload = json.loads(registry.read_text(encoding="utf-8"))
    descriptor = get_packaged_knowledge_base("star_upper_gi")
    assert payload["active"] == {
        "module_name": descriptor.module_name,
        "version": descriptor.version,
    }


def test_bootstrap_activates_default_when_registry_has_no_active_identity(
    tmp_path: Path,
) -> None:
    registry = tmp_path / "terminology" / "registry.json"
    registry.parent.mkdir(parents=True)
    registry.write_text(
        json.dumps(
            {
                "modules": {
                    "deployment_owned": {
                        "4.2.0": {"input_dirs": ["/deployment/terminology"]},
                    },
                },
            },
        ),
        encoding="utf-8",
    )

    assert main(["--registry", str(registry)]) == 0

    payload = json.loads(registry.read_text(encoding="utf-8"))
    descriptor = get_packaged_knowledge_base("star_upper_gi")
    assert payload["active"] == {
        "module_name": descriptor.module_name,
        "version": descriptor.version,
    }
    assert "deployment_owned" in payload["modules"]


def test_bootstrap_adds_packaged_choices_without_changing_existing_active_bundle(
    tmp_path: Path,
) -> None:
    registry = tmp_path / "terminology" / "registry.json"
    custom_root = tmp_path / "custom-bundles"
    _write_custom_bundle(custom_root)
    registry.parent.mkdir(parents=True)
    registry.write_text(
        json.dumps(
            {
                "active": {
                    "module_name": "custom_reporting",
                    "version": "7.4.0",
                },
                "modules": {
                    "custom_reporting": {
                        "7.4.0": {"input_dirs": [str(custom_root)]},
                    },
                },
            },
        ),
        encoding="utf-8",
    )

    assert main(["--registry", str(registry)]) == 0

    payload = json.loads(registry.read_text(encoding="utf-8"))
    assert payload["active"] == {
        "module_name": "custom_reporting",
        "version": "7.4.0",
    }
    assert set(PACKAGED_REPORTING_MODULES).issubset(payload["modules"])


def test_bootstrap_preserves_custom_active_version_of_packaged_module(
    tmp_path: Path,
) -> None:
    registry = tmp_path / "terminology" / "registry.json"
    custom_root = tmp_path / "custom-bundles"
    _write_custom_bundle(
        custom_root,
        module_name="star_upper_gi",
        version="0.1.1",
    )
    registry.parent.mkdir(parents=True)
    registry.write_text(
        json.dumps(
            {
                "active": {"module_name": "star_upper_gi", "version": "0.1.1"},
                "modules": {
                    "star_upper_gi": {
                        "0.1.1": {"input_dirs": [str(custom_root)]},
                    },
                },
            },
        ),
        encoding="utf-8",
    )

    assert main(["--registry", str(registry)]) == 0

    payload = json.loads(registry.read_text(encoding="utf-8"))
    assert payload["active"] == {
        "module_name": "star_upper_gi",
        "version": "0.1.1",
    }
    assert payload["modules"]["star_upper_gi"]["0.1.1"] == {
        "input_dirs": [str(custom_root)],
    }


@pytest.mark.parametrize(
    "stale_entry",
    [
        {
            "sources": [
                {
                    "kind": "provider",
                    "provider": BUILTIN_KNOWLEDGE_BASE_PROVIDER,
                    "content_sha256": "0" * 64,
                },
            ],
        },
        {"input_dirs": ["/removed-venv/site-packages/lx_dtypes/data"]},
        {
            "sources": [
                {
                    "kind": "filesystem",
                    "input_dirs": ["/removed-venv/site-packages/lx_dtypes/data"],
                },
            ],
        },
    ],
)
def test_bootstrap_replaces_recognized_stale_packaged_same_version_entry(
    tmp_path: Path,
    stale_entry: dict[str, object],
) -> None:
    descriptor = get_packaged_knowledge_base("star_upper_gi")
    registry = tmp_path / "terminology" / "registry.json"
    registry.parent.mkdir(parents=True)
    registry.write_text(
        json.dumps(
            {
                "active": {
                    "module_name": descriptor.module_name,
                    "version": descriptor.version,
                },
                "modules": {
                    descriptor.module_name: {
                        descriptor.version: stale_entry,
                    },
                },
            },
        ),
        encoding="utf-8",
    )

    assert main(["--registry", str(registry)]) == 0

    payload = json.loads(registry.read_text(encoding="utf-8"))
    current = payload["modules"][descriptor.module_name][descriptor.version]
    assert current["sources"] == [
        {
            "kind": "provider",
            "provider": BUILTIN_KNOWLEDGE_BASE_PROVIDER,
            "content_sha256": descriptor.content_sha256,
        },
    ]


def test_bootstrap_rejects_custom_same_packaged_identity_without_mutation(
    tmp_path: Path,
    capsys,
) -> None:
    descriptor = get_packaged_knowledge_base("star_upper_gi")
    custom_root = tmp_path / "custom-bundles"
    _write_custom_bundle(
        custom_root,
        module_name=descriptor.module_name,
        version=descriptor.version,
    )
    registry = tmp_path / "terminology" / "registry.json"
    registry.parent.mkdir(parents=True)
    registry.write_text(
        json.dumps(
            {
                "active": {
                    "module_name": descriptor.module_name,
                    "version": descriptor.version,
                },
                "modules": {
                    descriptor.module_name: {
                        descriptor.version: {
                            "sources": [
                                {
                                    "kind": "filesystem",
                                    "input_dirs": [str(custom_root)],
                                },
                            ],
                        },
                    },
                },
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    original = registry.read_bytes()

    assert main(["--registry", str(registry)]) == 1

    event = json.loads(capsys.readouterr().err)
    assert "immutable terminology identity collision" in event["detail"]
    assert registry.read_bytes() == original


def test_bootstrap_migrates_stale_active_packaged_version(tmp_path: Path) -> None:
    registry = tmp_path / "terminology" / "registry.json"
    registry.parent.mkdir(parents=True)
    registry.write_text(
        json.dumps(
            {
                "active": {"module_name": "star_upper_gi", "version": "0.1.1"},
                "modules": {
                    "star_upper_gi": {
                        "0.1.1": {
                            "input_dirs": [
                                "/removed-venv/site-packages/lx_dtypes/data",
                            ],
                        },
                    },
                },
            },
        ),
        encoding="utf-8",
    )

    assert main(["--registry", str(registry)]) == 0

    payload = json.loads(registry.read_text(encoding="utf-8"))
    descriptor = get_packaged_knowledge_base("star_upper_gi")
    assert payload["active"] == {
        "module_name": descriptor.module_name,
        "version": descriptor.version,
    }
    assert "0.1.1" not in payload["modules"]["star_upper_gi"]
    source = payload["modules"]["star_upper_gi"][descriptor.version]["sources"][0]
    assert source["provider"] == BUILTIN_KNOWLEDGE_BASE_PROVIDER
    assert "/removed-venv" not in registry.read_text(encoding="utf-8")


def test_bootstrap_registry_fully_loads_every_packaged_bundle(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    registry = tmp_path / "terminology" / "registry.json"
    assert main(["--registry", str(registry)]) == 0

    monkeypatch.setenv("LX_DTYPES_KB_REGISTRY", str(registry))
    clear_knowledge_base_resolver_caches()
    try:
        for module_name in PACKAGED_REPORTING_MODULES:
            descriptor = get_packaged_knowledge_base(module_name)
            knowledge_base = load_knowledge_base(
                descriptor.module_name,
                version=descriptor.version,
            )
            assert knowledge_base.config.name == descriptor.module_name
            assert knowledge_base.config.version == descriptor.version
            assert knowledge_base.report_template
    finally:
        clear_knowledge_base_resolver_caches()


def test_bootstrap_preserves_an_existing_valid_registry(tmp_path: Path) -> None:
    registry = tmp_path / "terminology" / "registry.json"
    assert main(["--registry", str(registry)]) == 0
    original = registry.read_bytes()

    assert main(["--registry", str(registry)]) == 0

    assert registry.read_bytes() == original


def test_missing_packaged_module_is_non_blocking_only_when_requested(
    tmp_path: Path,
    capsys,
) -> None:
    strict_registry = tmp_path / "strict" / "registry.json"
    assert (
        main(
            [
                "--registry",
                str(strict_registry),
                "--module",
                "missing_test_module",
            ],
        )
        == 1
    )
    strict_event = json.loads(capsys.readouterr().err)
    assert strict_event["status"] == "error"
    assert not strict_registry.exists()

    best_effort_registry = tmp_path / "best-effort" / "registry.json"
    assert (
        main(
            [
                "--registry",
                str(best_effort_registry),
                "--module",
                "missing_test_module",
                "--best-effort",
            ],
        )
        == 0
    )
    warning_event = json.loads(capsys.readouterr().err)
    assert warning_event["status"] == "warning"
    assert not best_effort_registry.exists()
