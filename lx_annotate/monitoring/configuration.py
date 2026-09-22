from __future__ import annotations

from pathlib import Path

from django.conf import settings
from endoreg_db.utils.paths import get_runtime_paths

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
    paths = get_runtime_paths()
    return MonitoringConfiguration(
        storage=[
            StorageLocation(key="protected_data", path=paths.runtime_root),
            StorageLocation(key="media", path=paths.storage),
            StorageLocation(key="terminology", path=paths.terminology),
        ]
    ), False
