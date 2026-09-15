from __future__ import annotations

import os
from functools import partial
from pathlib import Path
from tempfile import NamedTemporaryFile

import fitz
import pytest
from cryptography.exceptions import InvalidTag
from django.core.files.base import ContentFile
from django.db.models.fields.files import FieldFile
from endoreg_db.models import RawPdfFile
from endoreg_db.utils.encryption import storage_materialization
from endoreg_db.utils.encryption.storage_materialization import (
    materialized_plaintext_field_file,
)
from endoreg_db.utils.file_operations import (
    atomic_write_file,
    ensure_directory,
    safe_unlink_file,
)

from lx_annotate.storage.encrypted import EncryptedStorage
from lx_annotate.storage.encryption import MAGIC


@pytest.fixture
def encrypted_pdf(tmp_path: Path) -> tuple[FieldFile, bytes, Path]:
    with fitz.open() as document:
        document.new_page().insert_text((72, 72), "Synthetic research review document")
        plaintext = document.tobytes()
    storage = EncryptedStorage(location=tmp_path / "vault", master_key=os.urandom(32))
    name = storage.save("review.pdf", ContentFile(plaintext))
    report = RawPdfFile(processed_file=name)
    report.processed_file.storage = storage
    return report.processed_file, plaintext, tmp_path / "vault" / name


@pytest.fixture
def plaintext_scope(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> Path:
    # Isolate actual temporary files without replacing the materializer or reader.
    directory = ensure_directory(tmp_path / "plaintext", dir_mode=0o700)
    monkeypatch.setattr(
        storage_materialization,
        "NamedTemporaryFile",
        partial(NamedTemporaryFile, dir=directory),
    )
    return directory


def test_encrypted_pdf_reaches_real_parser_only_inside_private_scope(
    encrypted_pdf: tuple[FieldFile, bytes, Path],
    plaintext_scope: Path,
) -> None:
    # Arrange
    field_file, plaintext, ciphertext_path = encrypted_pdf
    original_ciphertext = ciphertext_path.read_bytes()
    assert original_ciphertext.startswith(MAGIC)
    assert plaintext not in original_ciphertext

    # Act
    with materialized_plaintext_field_file(field_file, suffix=".pdf") as path:
        permissions = path.stat().st_mode & 0o777
        with fitz.open(path) as document:
            extracted = document[0].get_text()
        materialized_bytes = path.read_bytes()

    # Assert
    assert "Synthetic research review document" in extracted
    assert materialized_bytes == plaintext
    assert permissions == 0o600
    assert not path.exists()
    assert list(plaintext_scope.iterdir()) == []
    assert ciphertext_path.read_bytes() == original_ciphertext


def test_consumer_exception_removes_plaintext_and_preserves_ciphertext(
    encrypted_pdf: tuple[FieldFile, bytes, Path],
    plaintext_scope: Path,
) -> None:
    # Arrange
    field_file, _, ciphertext_path = encrypted_pdf
    original_ciphertext = ciphertext_path.read_bytes()

    # Act
    with (
        pytest.raises(RuntimeError, match="consumer interrupted"),
        materialized_plaintext_field_file(field_file, suffix=".pdf") as path,
    ):
        with fitz.open(path) as document:
            assert document.page_count == 1
        raise RuntimeError("consumer interrupted")

    # Assert
    assert not path.exists()
    assert list(plaintext_scope.iterdir()) == []
    assert ciphertext_path.read_bytes() == original_ciphertext


@pytest.mark.parametrize("damage", ["wrong_key", "tampered", "truncated", "header"])
def test_damaged_encrypted_input_never_reaches_consumer_or_leaves_plaintext(
    encrypted_pdf: tuple[FieldFile, bytes, Path],
    plaintext_scope: Path,
    damage: str,
) -> None:
    # Arrange
    field_file, _, ciphertext_path = encrypted_pdf
    ciphertext = ciphertext_path.read_bytes()
    if damage == "wrong_key":
        field_file.storage = EncryptedStorage(
            location=ciphertext_path.parent,
            master_key=os.urandom(32),
        )
    else:
        if damage == "tampered":
            damaged = ciphertext[:-1] + bytes([ciphertext[-1] ^ 1])
        elif damage == "truncated":
            damaged = ciphertext[:-8]
        else:
            damaged = b"BROKEN!!" + ciphertext[8:]
        atomic_write_file(destination=ciphertext_path, content=[damaged])
    consumer_entered = False

    # Act
    with (
        pytest.raises((InvalidTag, ValueError, RuntimeError, OSError)),
        materialized_plaintext_field_file(field_file, suffix=".pdf"),
    ):
        consumer_entered = True

    # Assert
    assert consumer_entered is False
    assert list(plaintext_scope.iterdir()) == []


def test_cleanup_failure_is_reported_instead_of_silent_success(
    encrypted_pdf: tuple[FieldFile, bytes, Path],
    plaintext_scope: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    # Arrange
    field_file, _, _ = encrypted_pdf

    def refuse_cleanup(path: Path, *, missing_ok: bool = True) -> None:
        raise PermissionError("plaintext cleanup denied")

    monkeypatch.setattr(storage_materialization, "safe_unlink_file", refuse_cleanup)

    # Act
    try:
        with (
            pytest.raises(PermissionError, match="plaintext cleanup denied"),
            materialized_plaintext_field_file(field_file, suffix=".pdf") as path,
        ):
            assert path.exists()
        # Assert: failure stays visible; test teardown removes the fault-injected residue.
        assert path.exists()
    finally:
        for residue in plaintext_scope.iterdir():
            safe_unlink_file(residue)
    assert list(plaintext_scope.iterdir()) == []
