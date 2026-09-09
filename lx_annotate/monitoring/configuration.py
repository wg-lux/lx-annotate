from __future__ import annotations

from pathlib import Path

from django.conf import settings

from .contracts import MonitoringConfiguration, StorageLocation

MAX_CONFIGURATION_BYTES = 65536


def load_configuration() -> tuple[MonitoringConfiguration, bool]:
    """Only deployment-owned configuration; request parameters never enter here."""
    configured = str(
        getattr(settings, "LX_ANNOTATE_MONITORING_CONFIG_FILE", "")
    ).strip()
    if configured:
        with Path(configured).open("rb") as stream:
            content = stream.read(MAX_CONFIGURATION_BYTES + 1)
        if len(content) > MAX_CONFIGURATION_BYTES:
            raise ValueError("Monitoring configuration exceeds its size limit")
        return MonitoringConfiguration.model_validate_json(content), True
    return MonitoringConfiguration(
        storage=[
            StorageLocation(key="protected_data", path=Path(settings.APP_DATA_DIR)),
            StorageLocation(key="media", path=Path(settings.PROTECTED_MEDIA_ROOT)),
            StorageLocation(
                key="terminology", path=Path(settings.LX_DTYPES_TERMINOLOGY_IMPORT_ROOT)
            ),
        ]
    ), False
