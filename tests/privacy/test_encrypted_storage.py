from __future__ import annotations

import base64
import os

import pytest
from django.core.files.base import ContentFile

pytest.importorskip("cryptography")

from lx_annotate.storage.encrypted import EncryptedStorage
from lx_annotate.storage.encryption import MAGIC, load_master_key


def test_lx_storage_imports_use_endoreg_db_source_of_truth():
    from endoreg_db.utils.encryption.encrypted import (
        EncryptedStorage as EndoregEncryptedStorage,
    )
    from endoreg_db.utils.encryption.encryption import MAGIC as ENDOREG_MAGIC
    from endoreg_db.utils.encryption.encryption import (
        encrypt_stream as endoreg_encrypt_stream,
    )
    from lx_annotate.storage import encryption as lx_encryption

    assert EncryptedStorage is EndoregEncryptedStorage
    assert MAGIC is ENDOREG_MAGIC
    assert lx_encryption.encrypt_stream is endoreg_encrypt_stream


def _random_key() -> str:
    return base64.urlsafe_b64encode(os.urandom(32)).decode("ascii")


def test_encrypted_storage_round_trips_large_payload(tmp_path, master_key):  # noqa: ARG001
    storage = EncryptedStorage(
        location=str(tmp_path),
        base_url="/media/",
        chunk_size=64 * 1024,
    )
    payload = (b"frame-0001\n" * 32768) + os.urandom(8192)

    name = storage.save("videos/patient-a.bin", ContentFile(payload))
    saved = tmp_path / name

    assert saved.exists()
    ciphertext = saved.read_bytes()
    assert ciphertext.startswith(MAGIC)
    assert payload[:128] not in ciphertext

    with storage.open(name, "rb") as handle:
        assert handle.read() == payload


def test_encrypted_storage_leaves_no_tmp_file_after_save(tmp_path, master_key):  # noqa: ARG001
    storage = EncryptedStorage(location=str(tmp_path), base_url="/media/")
    storage.save("reports/report.pdf", ContentFile(b"secret-report"))

    assert not list(tmp_path.rglob("*.tmp"))


def test_encrypted_storage_uses_chunked_ciphertext_records(tmp_path, master_key):  # noqa: ARG001
    chunk_size = 32 * 1024
    storage = EncryptedStorage(
        location=str(tmp_path),
        base_url="/media/",
        chunk_size=chunk_size,
    )
    payload = os.urandom(chunk_size * 3 + 123)
    name = storage.save("videos/chunked.dat", ContentFile(payload))
    ciphertext = (tmp_path / name).read_bytes()

    assert ciphertext.startswith(MAGIC)
    assert len(ciphertext) > len(payload)
    assert payload not in ciphertext


def test_master_key_file_is_supported(tmp_path, monkeypatch):
    key_bytes = os.urandom(32)
    key_file = tmp_path / "master.key"
    key_file.write_text(
        base64.urlsafe_b64encode(key_bytes).decode("ascii"),
        encoding="utf-8",
    )
    monkeypatch.delenv("LX_ANNOTATE_MASTER_KEY", raising=False)
    monkeypatch.setenv("LX_ANNOTATE_MASTER_KEY_FILE", str(key_file))

    assert load_master_key() == key_bytes
