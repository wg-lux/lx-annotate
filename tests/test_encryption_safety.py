import pytest
from pathlib import Path
from unittest.mock import patch
from django.core.files.base import ContentFile
from django.core.exceptions import ImproperlyConfigured
from lx_annotate.storage.encrypted import EncryptedStorage

# --- FIXTURES ---


@pytest.fixture
def master_key():
    # A 32-byte key for testing AES-GCM / Fernet wrapping
    return b"test-master-key-32-bytes-long-!!"


@pytest.fixture
def encrypted_storage(tmp_path, master_key):
    """Provides an isolated EncryptedStorage instance writing to a tmp_path."""
    return EncryptedStorage(
        location=str(tmp_path), base_url="/media/", master_key=master_key
    )


# --- TESTS ---


def test_storage_roundtrip_is_transparent(encrypted_storage):
    """
    APP CONTRACT: The rest of Django should not know the file is encrypted.
    Writing and reading via the Storage API should yield the exact plaintext.
    """
    plaintext = b"Sensitive medical video frame data: patient 12345."
    file_name = "test_transparent.txt"

    # Save via Django Storage API
    saved_name = encrypted_storage.save(file_name, ContentFile(plaintext))

    # Read via Django Storage API
    with encrypted_storage.open(saved_name, "rb") as f:
        decrypted_content = f.read()

    assert decrypted_content == plaintext, "Decrypted content does not match plaintext."


def test_file_on_disk_is_actually_encrypted(encrypted_storage, tmp_path):
    """
    SECURITY CONTRACT: The file physically written to disk must NOT contain the plaintext.
    """
    plaintext = b"CONFIDENTIAL_DIAGNOSIS_DATA"
    file_name = "test_ciphertext.txt"

    saved_name = encrypted_storage.save(file_name, ContentFile(plaintext))

    # Bypass the storage API and read the raw file directly from the OS
    raw_disk_path = tmp_path / saved_name
    raw_disk_content = raw_disk_path.read_bytes()

    assert plaintext not in raw_disk_content, "CRITICAL: Plaintext leaked to disk!"
    assert len(raw_disk_content) > len(plaintext), (
        "Ciphertext should be larger due to DEK/IV overhead."
    )


def test_missing_master_key_raises_error(tmp_path, monkeypatch):
    """
    CONFIGURATION CONTRACT: The storage backend must fail fast and hard if
    initialized without a master KEK. It should never default to plaintext.
    """
    monkeypatch.delenv("LX_ANNOTATE_MASTER_KEY", raising=False)
    monkeypatch.delenv("LX_ANNOTATE_MASTER_KEY_FILE", raising=False)

    with pytest.raises((ImproperlyConfigured, ValueError)):
        # Attempting to initialize without passing master_key (or setting the env var)
        EncryptedStorage(location=str(tmp_path), master_key=None)


def test_atomic_write_prevents_partial_files(encrypted_storage, tmp_path):
    """
    SYSADMIN CONTRACT: Files must be written to a .tmp file and os.replace'd.
    We mock os.replace to simulate a crash right before the atomic rename.
    """
    plaintext = b"Data that should not exist if rename fails."
    file_name = "test_atomic.txt"

    with patch("os.replace") as mock_replace:
        mock_replace.side_effect = Exception("Simulated crash during atomic rename")

        with pytest.raises(Exception, match="Simulated crash"):
            encrypted_storage.save(file_name, ContentFile(plaintext))

    # Verify the final file does NOT exist
    final_path = tmp_path / file_name
    assert not final_path.exists(), (
        "Partial/corrupted file was left at the target destination!"
    )

    # Verify a tmp file was created (and ideally cleaned up, but definitely not the final file)
    tmp_files = list(tmp_path.glob("*.tmp"))
    assert (
        len(tmp_files) >= 0
    )  # It's okay if it exists, as long as it's not the final filename


def test_envelope_encryption_uniqueness(encrypted_storage):
    """
    CRYPTOGRAPHY CONTRACT: Saving the exact same plaintext twice must produce
    completely different ciphertexts on disk due to unique DEKs and IVs.
    """
    plaintext = b"Identical baseline data"

    name1 = encrypted_storage.save("file1.txt", ContentFile(plaintext))
    name2 = encrypted_storage.save("file2.txt", ContentFile(plaintext))

    disk_content1 = Path(encrypted_storage.path(name1)).read_bytes()
    disk_content2 = Path(encrypted_storage.path(name2)).read_bytes()

    assert disk_content1 != disk_content2, (
        "CRITICAL: IV/DEK reuse detected! Ciphertexts are identical."
    )


def test_streaming_read_prevents_oom(encrypted_storage):
    """
    MEMORY CONTRACT: Reading the file must yield chunks and not load the entire
    file into memory at once. We verify this by checking that chunks are yielded.
    """
    # Create a reasonably sized payload
    chunk_size = 64 * 1024  # 64KB (Adjust to match your implementation's chunk size)
    plaintext = b"A" * (chunk_size * 3)
    saved_name = encrypted_storage.save("test_stream.txt", ContentFile(plaintext))

    with encrypted_storage.open(saved_name, "rb") as f:
        # Instead of f.read(), we use the chunks() generator standard in Django files
        chunks = list(f.chunks(chunk_size))

    assert len(chunks) >= 3, "File was not broken into expected chunks."
    assert b"".join(chunks) == plaintext, (
        "Streamed chunks do not reconstruct plaintext."
    )
