# Encrypted model weights in inference

`ModelMeta.weights` is application-managed storage. The filename extension
(`.safetensors`, `.pt`, or `.pth`) describes the decrypted model content; the
file on disk is expected to begin with the `LXENC01` encrypted-storage header.
That header is not evidence that the model is corrupt.

Inference reads the field through Django storage and materializes authenticated
plaintext in a restrictive temporary file only for the duration of model
construction and prediction. Model loaders must never receive
`ModelMeta.weights.path`, and operators must not decrypt or copy weights by
hand. Missing keys, a wrong key identity, malformed headers, authentication
failures, and unsupported model formats fail closed.

## Read-only operator checks

Use the service account and the configured protected root when running these
checks. Do not print the master key or decrypted content.

```sh
# Confirm ownership and permissions without opening the payload.
stat -c '%U %G %a %n' /protected/lx-annotate/storage/model_weights/*

# Confirm the encrypted container header and ciphertext digest.
od -An -N8 -tc /protected/lx-annotate/storage/model_weights/<weight-file>
sha256sum /protected/lx-annotate/storage/model_weights/<weight-file>

# Check key-file metadata only; never print its contents.
stat -c '%U %G %a %n' /var/lib/lx-annotate/.env.systemd

# Check the inference worker and queue health.
systemctl is-active lx-annotate-celery-inference-worker.service
systemctl show lx-annotate-celery-inference-worker.service --property=ActiveState,SubState

# Check free space and temporary-file inventory without reading files.
df -h /protected/lx-annotate
find /tmp -maxdepth 1 -type f -name 'endoreg-fieldfile-*' -printf '%u %g %m %p\n'
```

Classified failures appear in service logs as encrypted-storage access,
authenticated decryption, plaintext format validation, GPU loading, CPU
fallback, or model construction failures. `VideoProcessingHistory.details`
stores a non-secret failure message. A failed inference does not rewrite the
ciphertext or leave a persistent plaintext model behind.

## Release acceptance record

For an approved production acceptance run, record the exact lx-annotate,
endoreg-db, LuxNix, Safetensors, and PyTorch versions; target host; model
identity; ciphertext SHA-256 digest; focused test results; worker queue health;
key-identity preflight result; and the successful encrypted-weight inference.
Keep this evidence alongside the deployment-source-hygiene acceptance record.
