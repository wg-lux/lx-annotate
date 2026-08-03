from __future__ import annotations

import io
from types import SimpleNamespace

import pytest
from django.core.management import CommandError

from lx_annotate.management.commands import (
    repair_managed_payloads,
    verify_encrypted_storage,
)
from lx_annotate.storage.encryption import MAGIC


class _ProbeStorage:
    def __init__(self, *, decrypted: bytes, raw: bytes) -> None:
        self.decrypted = decrypted
        self.raw = raw
        self.saved_name = ""
        self.deleted: list[str] = []

    def save(self, name, _content):
        self.saved_name = name
        return name

    def open(self, _name, _mode):
        return io.BytesIO(self.decrypted)

    def path(self, _name):
        return "/unused/probe"

    def delete(self, name):
        self.deleted.append(name)


class _RawPath:
    def __init__(self, raw: bytes) -> None:
        self.raw = raw

    def read_bytes(self) -> bytes:
        return self.raw

    def __str__(self) -> str:
        return "/unused/probe"


def _run_probe(monkeypatch, *, storage: _ProbeStorage, prefix: str = "health"):
    monkeypatch.setattr(verify_encrypted_storage, "EncryptedStorage", _ProbeStorage)
    monkeypatch.setattr(verify_encrypted_storage, "default_storage", storage)
    monkeypatch.setattr(
        verify_encrypted_storage,
        "uuid4",
        lambda: SimpleNamespace(hex="fixed"),
    )
    monkeypatch.setattr(
        verify_encrypted_storage,
        "Path",
        lambda _path: _RawPath(storage.raw),
    )
    verify_encrypted_storage.Command().handle(path_prefix=prefix, keep=False)
    return storage


@pytest.mark.parametrize(
    ("decrypted", "raw", "error"),
    [
        (b"wrong", MAGIC + b"ciphertext", "round-trip failed"),
        (
            b"lx-annotate-encryption-probe:fixed",
            b"lx-annotate-encryption-probe:fixed",
            "plaintext probe payload",
        ),
        (
            b"lx-annotate-encryption-probe:fixed",
            b"not-an-encrypted-header",
            "expected encrypted-file header",
        ),
    ],
)
def test_encryption_probe_fails_closed_and_cleans_up(
    monkeypatch, decrypted: bytes, raw: bytes, error: str
) -> None:
    storage = _ProbeStorage(decrypted=decrypted, raw=raw)
    with pytest.raises(CommandError, match=error):
        _run_probe(monkeypatch, storage=storage)

    # The command's finally block must run even when verification fails.
    assert storage.deleted == [storage.saved_name]


def test_encryption_probe_accepts_empty_prefix(monkeypatch) -> None:
    plaintext = b"lx-annotate-encryption-probe:fixed"
    storage = _ProbeStorage(
        decrypted=plaintext,
        raw=MAGIC + b"ciphertext",
    )
    _run_probe(monkeypatch, storage=storage, prefix="")

    assert storage.saved_name == "probe-fixed.txt"
    assert storage.deleted == ["probe-fixed.txt"]


class _RepairStorage:
    location = "/managed-storage"


@pytest.mark.parametrize(
    ("prefix", "error"),
    [
        ("../escape", "escapes the managed storage root"),
        ("missing", "Managed storage path does not exist"),
    ],
)
def test_repair_command_rejects_unsafe_or_missing_scan_roots(
    monkeypatch, prefix: str, error: str
) -> None:
    storage = _RepairStorage()
    monkeypatch.setattr(repair_managed_payloads, "EncryptedStorage", _RepairStorage)
    monkeypatch.setattr(repair_managed_payloads, "default_storage", storage)

    with pytest.raises(CommandError, match=error):
        repair_managed_payloads.Command().handle(path_prefix=prefix, dry_run=True)


class _ScanEntry:
    def __init__(self, *, symlink: bool) -> None:
        self.symlink = symlink

    def is_symlink(self) -> bool:
        return self.symlink

    def is_file(self) -> bool:
        return True

    def relative_to(self, _root):
        return self

    def as_posix(self) -> str:
        return "payload.bin"

    def __str__(self) -> str:
        return "/managed-storage/payload.bin"


class _ScanRoot:
    def __init__(self, entry: _ScanEntry) -> None:
        self.entry = entry

    def resolve(self):
        return self

    def exists(self) -> bool:
        return True

    def rglob(self, _pattern):
        return [self.entry]

    def __str__(self) -> str:
        return "/managed-storage"


class _ScanningStorage(_RepairStorage):
    def is_encrypted(self, _name: str) -> bool:
        return False

    def repair_plaintext_file(self, _name: str) -> None:
        raise AssertionError("dry-run and symlink paths must not be repaired")


class _RelativePath:
    parts = ("payload.bin",)
    name = "payload.bin"


@pytest.mark.parametrize(
    ("symlink", "expected"),
    [(True, "Skipping symlink"), (False, "Would repair plaintext payload")],
)
def test_repair_scan_skips_symlinks_and_honors_dry_run(
    monkeypatch, symlink: bool, expected: str
) -> None:
    storage = _ScanningStorage()
    root = _ScanRoot(_ScanEntry(symlink=symlink))
    command = repair_managed_payloads.Command()
    command.stdout = io.StringIO()
    monkeypatch.setattr(repair_managed_payloads, "EncryptedStorage", _ScanningStorage)
    monkeypatch.setattr(repair_managed_payloads, "default_storage", storage)
    monkeypatch.setattr(
        repair_managed_payloads,
        "Path",
        lambda value: root if value == storage.location else _RelativePath(),
    )

    command.handle(path_prefix="", dry_run=True)

    assert expected in command.stdout.getvalue()
