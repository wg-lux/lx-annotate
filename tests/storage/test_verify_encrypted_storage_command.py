from __future__ import annotations

from io import StringIO

import pytest
from django.core.management import CommandError, call_command

from lx_annotate.storage.encrypted import EncryptedStorage


@pytest.fixture
def encryption_probe_storage(tmp_path):
    return EncryptedStorage(
        location=str(tmp_path),
        base_url="/media/",
        master_key=b"test-master-key-32-bytes-long-!!",
    )


def test_verify_encrypted_storage_command_round_trips_and_cleans_up(
    monkeypatch, encryption_probe_storage, tmp_path
):
    from lx_annotate.management.commands import verify_encrypted_storage as command_mod

    monkeypatch.setattr(command_mod, "default_storage", encryption_probe_storage)
    out = StringIO()

    call_command("verify_encrypted_storage", stdout=out)

    text = out.getvalue()
    assert "Encrypted storage verified" in text
    assert not list(tmp_path.rglob("probe-*.txt"))


def test_verify_encrypted_storage_command_fails_when_backend_is_not_encrypted(
    monkeypatch,
):
    from django.core.files.storage import FileSystemStorage
    from lx_annotate.management.commands import verify_encrypted_storage as command_mod

    monkeypatch.setattr(
        command_mod,
        "default_storage",
        FileSystemStorage(location="/tmp", base_url="/media/"),
    )

    with pytest.raises(CommandError, match="Encrypted storage is not active"):
        call_command("verify_encrypted_storage")
