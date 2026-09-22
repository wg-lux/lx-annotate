from __future__ import annotations

import importlib
from uuid import uuid4

import pytest
from endoreg_db.utils.paths import EndoregPathsModel

from lx_annotate.hub.storage_resolver import ResolvedStorageArtifact


@pytest.mark.parametrize("kind,suffix", [("video", ".mp4"), ("report", ".pdf")])
def test_remote_media_materializes_inside_canonical_staging(
    tmp_path, monkeypatch, kind, suffix
):
    module = importlib.import_module(
        "lx_annotate.hub.storage_provider"
        if kind == "video"
        else "lx_annotate.hub.storage_report_provider"
    )
    paths = EndoregPathsModel.from_root(tmp_path)
    paths.ensure_directories()
    monkeypatch.setattr(module, "get_runtime_paths", lambda: paths)
    artifact = ResolvedStorageArtifact(
        uuid4(), "artifact", kind, "node", "a" * 64, "b" * 64, 5, None
    )
    monkeypatch.setattr(
        module, f"resolve_current_processed_{kind}_artifact", lambda **kwargs: artifact
    )

    def fetch(*, destination, **kwargs):
        destination.write_bytes(b"media")
        return destination

    monkeypatch.setattr(module, "fetch_committed_storage_artifact", fetch)
    materialize = getattr(module, f"materialize_current_processed_{kind}")
    with materialize(**{f"{kind}_id": 1}) as path:
        assert path.is_relative_to(paths.transcoding)
        assert path.name == "b" * 64 + suffix
        assert path.read_bytes() == b"media"
    assert not path.exists()


def test_storage_balancing_uses_canonical_migration_staging(tmp_path, monkeypatch):
    from lx_annotate.hub import storage_balance_worker

    paths = EndoregPathsModel.from_root(tmp_path)
    monkeypatch.setattr(storage_balance_worker, "get_runtime_paths", lambda: paths)
    monkeypatch.setenv("HUB_STORAGE_STAGING_DIRECTORY", str(tmp_path / "legacy"))
    config = storage_balance_worker.StorageBalanceWorkerConfig.from_environment()
    assert config.staging_directory == paths.migration_staging / "hub-storage"
    assert config.staging_directory.is_dir()


def test_recovery_rejects_a_separate_target(tmp_path, monkeypatch):
    from lx_annotate.services import runtime_recovery

    paths = EndoregPathsModel.from_root(tmp_path / "runtime")
    monkeypatch.setattr(runtime_recovery, "get_runtime_paths", lambda: paths)
    with pytest.raises(ValueError, match="LX_RUNTIME_ROOT"):
        runtime_recovery.RuntimeRecoveryService(lambda message: None).run(
            target=tmp_path / "other",
            state_file=tmp_path / "state",
            sources=[],
            force=False,
            force_repair=False,
            skip_repair=True,
        )
    assert not (tmp_path / "other").exists()
