from __future__ import annotations

from io import BytesIO
from zipfile import ZIP_DEFLATED, ZipFile

from django.core.files.uploadedfile import SimpleUploadedFile

from lx_dtypes.django.api.terminology_routes import (
    _read_bundle_identity,
    _read_zip_file_map,
    _strip_single_zip_root,
)


def test_lx_terminology_editor_single_root_export_is_accepted() -> None:
    archive_buffer = BytesIO()
    with ZipFile(archive_buffer, "w", compression=ZIP_DEFLATED) as archive:
        archive.writestr(
            "custom_terminology/config.yaml",
            "\n".join(
                (
                    "name: custom_terminology",
                    'version: "1.2.3"',
                    "medical_field: gastroenterology",
                    "modules:",
                    "  - lx_findings",
                )
            ),
        )
        archive.writestr(
            "custom_terminology/lx_findings/config.yaml",
            "name: lx_findings\nversion: 0.1.0\ndata:\n  dirs:\n    - ./data\n",
        )
        archive.writestr(
            "custom_terminology/lx_findings/data/custom.yaml",
            "- model: finding\n  name: custom_finding\n",
        )

    upload = SimpleUploadedFile(
        "custom_terminology.zip",
        archive_buffer.getvalue(),
        content_type="application/zip",
    )
    files = _strip_single_zip_root(_read_zip_file_map(upload))

    assert "config.yaml" in files
    assert "lx_findings/config.yaml" in files
    assert _read_bundle_identity(files) == (
        "custom_terminology",
        "1.2.3",
        "gastroenterology",
    )
