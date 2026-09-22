from __future__ import annotations

from io import BytesIO
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

import pytest
from lx_dtypes.terminology.terminology_service import TerminologyService


@pytest.mark.parametrize(
    "zip_root",
    ["custom_terminology/", ""],
    ids=["single-root", "flat"],
)
def test_lx_terminology_editor_export_is_accepted(
    tmp_path: Path,
    zip_root: str,
) -> None:
    archive_buffer = BytesIO()
    with ZipFile(archive_buffer, "w", compression=ZIP_DEFLATED) as archive:
        archive.writestr(
            f"{zip_root}config.yaml",
            "\n".join(
                (
                    "name: custom_terminology",
                    'version: "1.2.3"',
                    "medical_field: gastroenterology",
                    "modules:",
                    "  - lx_findings",
                ),
            ),
        )
        archive.writestr(
            f"{zip_root}lx_findings/config.yaml",
            "name: lx_findings\nversion: 0.1.0\ndata:\n  dirs:\n    - ./data\n",
        )
        archive.writestr(
            f"{zip_root}lx_findings/data/custom.yaml",
            "- model: finding\n  name: custom_finding\n",
        )

    # The constructor receives the registry FILE, not the root directory.
    registry_path = tmp_path / "terminology" / "registry.json"
    service = TerminologyService(registry_path=registry_path)
    assert not registry_path.exists()

    # A fresh stream starts at byte zero. No Django/Ninja upload cast is needed.
    result = service.import_zip(BytesIO(archive_buffer.getvalue()))

    assert result.ok is True
    assert (
        result.imported.module_name,
        result.imported.version,
        result.imported.medical_field,
    ) == ("custom_terminology", "1.2.3", "gastroenterology")
    assert result.imported.is_active is False
    assert result.counts["finding"] == 1
    assert registry_path.is_file()

    # Reload through a new service to verify registration and loadability.
    reopened = TerminologyService(registry_path=registry_path)
    assert reopened.active_identity() is None  # Import does not select a bundle.
    kb = reopened.load("custom_terminology", "1.2.3")

    assert kb.config is not None
    assert (kb.config.name, kb.config.version) == ("custom_terminology", "1.2.3")
    assert {finding["name"] for finding in kb.export_core_concepts()["finding"]} == {
        "custom_finding"
    }

    # Obtain the published location from the loaded KB, not an assumed hash/path.
    assert kb.config.source_file is not None
    config_path = Path(kb.config.source_file)
    assert config_path.is_file()
    assert config_path.resolve().is_relative_to(tmp_path.resolve())
    module_dir = config_path.parent
    assert (module_dir / "lx_findings" / "config.yaml").is_file()
    assert (module_dir / "lx_findings" / "data" / "custom.yaml").is_file()
