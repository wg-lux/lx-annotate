from __future__ import annotations

from io import StringIO
from pathlib import Path

import pytest
from django.core.files.base import ContentFile
from django.core.management import CommandError, call_command

from lx_annotate.storage.encrypted import EncryptedStorage
from lx_annotate.storage.encryption import MAGIC


@pytest.fixture
def repair_storage(tmp_path):
    return EncryptedStorage(
        location=str(tmp_path),
        base_url="/media/",
        master_key=b"test-master-key-32-bytes-long-!!",
    )


def test_repair_managed_payloads_repairs_plaintext_file_in_place(
    monkeypatch, repair_storage
):
    from lx_annotate.management.commands import repair_managed_payloads as command_mod

    plaintext = b"CONFIDENTIAL_MEDICAL_DATA"
    raw_path = Path(repair_storage.path("videos/copied-plaintext.bin"))
    raw_path.parent.mkdir(parents=True, exist_ok=True)
    raw_path.write_bytes(plaintext)
    monkeypatch.setattr(command_mod, "default_storage", repair_storage)
    out = StringIO()

    call_command("repair_managed_payloads", stdout=out)

    assert raw_path.read_bytes().startswith(MAGIC)
    assert plaintext not in raw_path.read_bytes()
    with repair_storage.open("videos/copied-plaintext.bin", "rb") as handle:
        assert handle.read() == plaintext
    assert "repaired=1" in out.getvalue()


def test_repair_managed_payloads_skips_already_encrypted_files(
    monkeypatch, repair_storage
):
    from lx_annotate.management.commands import repair_managed_payloads as command_mod

    name = repair_storage.save("reports/report.pdf", ContentFile(b"secret-report"))
    saved_path = Path(repair_storage.path(name))
    before = saved_path.read_bytes()
    monkeypatch.setattr(command_mod, "default_storage", repair_storage)
    out = StringIO()

    call_command("repair_managed_payloads", stdout=out)

    assert saved_path.read_bytes() == before
    assert "already_encrypted=1" in out.getvalue()


def test_repair_managed_payloads_fails_when_backend_is_not_encrypted(monkeypatch):
    from django.core.files.storage import FileSystemStorage
    from lx_annotate.management.commands import repair_managed_payloads as command_mod

    monkeypatch.setattr(
        command_mod,
        "default_storage",
        FileSystemStorage(location="/tmp", base_url="/media/"),
    )

    with pytest.raises(CommandError, match="Encrypted storage is not active"):
        call_command("repair_managed_payloads")
