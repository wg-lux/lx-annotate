from __future__ import annotations

import base64
import os
from pathlib import Path

import pytest
from django.core.files.base import ContentFile

pytest.importorskip("cryptography")

from lx_annotate.storage.encrypted import EncryptedStorage
from lx_annotate.storage.encryption import MAGIC, load_master_key


def _random_key() -> str:
    return base64.urlsafe_b64encode(os.urandom(32)).decode("ascii")


@pytest.fixture
def master_key(monkeypatch) -> bytes:
    encoded = _random_key()
    monkeypatch.setenv("LX_ANNOTATE_MASTER_KEY", encoded)
    monkeypatch.delenv("LX_ANNOTATE_MASTER_KEY_FILE", raising=False)
    return load_master_key()


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


def test_encrypted_storage_respects_different_data_dir_contract():
    repo_root = Path(__file__).resolve().parents[1]
    encrypted_dir = Path(
        os.getenv("LX_ANNOTATE_ENCRYPTED_DATA_DIR", "/var/lib/lx-annotate/secure_data")
    )
    assert encrypted_dir != repo_root
    assert repo_root not in encrypted_dir.parents
