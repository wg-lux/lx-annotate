# Encrypted Storage Process

This guide documents how `lx-annotate` encrypts managed files on disk today,
how files are read back through Django storage, and how operators can verify or
repair the managed storage tree.

## Scope

This guide is about local managed storage implemented by:

- `lx_annotate.storage.encrypted.EncryptedStorage`
- `lx_annotate.storage.encryption`

It does not describe outbound transfer encryption. Per the current architecture,
transport security is handled separately, and raw media export remains
prohibited.

## Summary

When encrypted storage is enabled, Django `default_storage` is configured to use
`EncryptedStorage`. Plaintext content is accepted at the application boundary,
but ciphertext is what gets persisted on disk. Each saved file gets:

- a fresh per-file Data Encryption Key (DEK)
- a file header containing wrapped key metadata
- chunked AES-GCM encryption for the file payload
- atomic replacement semantics when writing or repairing files

The long-lived master key is used only to wrap and unwrap the per-file DEK. It
is not embedded into file payloads and must not be committed to version control
or transmitted over the network.

## Key Loading

`EncryptedStorage` resolves its master key at initialization time.

- `LX_ANNOTATE_MASTER_KEY` may contain the key directly.
- `LX_ANNOTATE_MASTER_KEY_FILE` may point to a file containing the key.
- The key material must be urlsafe-base64 encoded.
- After decoding, the raw key length must be 16, 24, or 32 bytes for AES-GCM.

If neither variable is set, storage initialization fails closed with a runtime
error. The application does not generate a fallback key.

## On-Disk Format

Each encrypted file starts with a small framing structure before the encrypted
payload bytes:

1. Magic prefix: `LXENC01\n`
2. Four-byte big-endian header length
3. JSON-encoded header
4. Repeated encrypted chunks:
   - four-byte big-endian ciphertext length
   - ciphertext bytes for that chunk

The header contains:

- `version`
- `algorithm`
- `chunk_size`
- `wrapped_dek`
- `wrap_nonce`
- `nonce_prefix`

The current algorithm value is `AESGCM-chunked-v1`.

## Write Path

Normal encrypted writes happen through `EncryptedStorage._save()`.

1. Django hands plaintext content to storage.
2. `EncryptedStorage` creates a temporary file in the target directory.
3. `encrypt_stream()` generates a fresh 32-byte per-file DEK.
4. The DEK is wrapped with the long-lived master key using AES-GCM and stored
   in the file header.
5. The plaintext stream is read in chunks. The default chunk size is 1 MiB.
6. Each chunk is encrypted with AES-GCM using the unwrapped DEK.
7. The chunk nonce is derived from:
   - a random per-file `nonce_prefix`
   - a monotonically increasing chunk counter
8. The encrypted temp file is flushed and `fsync()`'d.
9. The temp file is atomically moved into place with
   `endoreg_db.utils.file_operations.atomic_move_file`.

If any step fails, the temp file is removed and the original target path is not
left half-written.

## Read Path

Reads go through `EncryptedStorage._open()`.

1. The raw on-disk file is opened as ciphertext.
2. A `DecryptedStream` reads the header and unwraps the per-file DEK using the
   configured master key.
3. Each ciphertext chunk is decrypted on demand.
4. Django callers receive plaintext bytes through the storage API.

This means application code that uses Django storage sees normal file contents,
while the filesystem only stores ciphertext.

## Random Access And Indexing

The storage implementation also supports byte-range reads for streamable access.

- `build_chunk_index()` walks the encrypted file and records the ciphertext and
  plaintext offsets for each chunk.
- `iter_decrypted_byte_range()` uses that index to decrypt only the required
  chunk range.
- `EncryptedStorage` caches the chunk index using path, modification time, and
  file size as the cache key.

This avoids decrypting the whole file when only a portion of the plaintext is
needed.

## How Encryption Is Detected

`EncryptedStorage.is_encrypted(name)` checks whether the raw file starts with
the expected magic prefix `LXENC01\n`.

That check is intentionally simple:

- if the magic prefix is present, the file is treated as encrypted
- if the prefix is absent, the file is treated as plaintext or unsupported

## Repair Path For Accidentally Plaintext Files

The `repair_managed_payloads` management command exists for cases where a file
was copied directly into managed storage and bypassed the encrypted save path.

The command:

1. Verifies that Django `default_storage` is actually `EncryptedStorage`
2. Scans the managed storage root, or a `--path-prefix` subtree
3. Skips symlinks
4. Uses `is_encrypted()` to classify each regular file
5. Re-encrypts plaintext files in place with
   `EncryptedStorage.repair_plaintext_file()`

`repair_plaintext_file()` works by:

1. Opening the existing on-disk file as raw plaintext
2. Encrypting it into a temp file in the same directory
3. Flushing and syncing the temp file
4. Copying the original file mode onto the temp file
5. Atomically replacing the plaintext file with the encrypted version

This is an in-place repair of storage state, not a decryption step.

## Verification Command

The `verify_encrypted_storage` management command performs a round-trip probe:

1. Writes a unique plaintext probe through Django storage
2. Reads the probe back through Django storage and verifies the plaintext
3. Reads the raw file directly from disk
4. Fails if the plaintext appears directly on disk
5. Fails if the file does not start with the encrypted-file magic header

This command is useful after deployment changes, key provisioning changes, or
storage migrations.

## Operational Notes

- The application service must be able to read the configured master key file.
- If encrypted storage is active but the key cannot be read, Django storage
  initialization fails and repair or verification commands will not run.
- The file header contains the wrapped per-file DEK and nonce metadata, but not
  the long-lived master key itself.
- Encryption at this layer protects managed files on disk. It does not replace
  deployment requirements such as protected mounts, strict permissions, and
  transport security controls.

## Related Files

- `/home/admin/dev/lx-annotate/lx_annotate/storage/encryption.py`
- `/home/admin/dev/lx-annotate/lx_annotate/storage/encrypted.py`
- `/home/admin/dev/lx-annotate/lx_annotate/management/commands/repair_managed_payloads.py`
- `/home/admin/dev/lx-annotate/lx_annotate/management/commands/verify_encrypted_storage.py`
- `/home/admin/dev/lx-annotate/docs/guides/deployment-strategy.md`
- `/home/admin/dev/lx-annotate/docs/guides/wheel-deployment.md`
