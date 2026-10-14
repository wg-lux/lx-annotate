# Secret rotation integration

The canonical coordination catalog is
[LuxNix secrets-management.yml](https://github.com/wg-lux/luxnix/blob/main/secrets-management.yml).
It defines ownership and the inventory, prepare, activate, verify and retire gates
across LuxNix, endoreg-db and LX-Annotate. Use its local checker with all three
source checkouts before planning a rollout. Readiness remains in
[LuxNixPressingIssues.yml](../../feature-tracking/LuxNixPressingIssues.yml),
criterion `rewritten_dependency_environment_upgrade`, and the owning backend and
infrastructure feature trackers.

LuxNix provisions private files. LX-Annotate declares three optional file handles
in `secretspec.toml` and the host environment contract:

- `DJANGO_SIGNING_KEYRING_FILE`: active Django signing key and planned retiring
  verification keys. `AppConfig` uses the backend's private manifest validator;
  `settings_base` exports `SECRET_KEY` and `SECRET_KEY_FALLBACKS`, inherited by
  production settings. Restart every consumer after activation or retirement.
- `DJANGO_IDENTITY_SALT_KEYRING_FILE`: consumed by endoreg-db identity services.
  Preserve established center identities; credential renewal never creates a
  replacement salt.
- `LX_ANNOTATE_MASTER_KEYRING_FILE`: consumed by endoreg-db encrypted storage.
  Preserve required readers and local custody of the master key.

A signing manifest takes precedence over the existing single-file/inline signing
configuration. Missing, malformed, non-private or invalid manifests fail closed.
Without a manifest, the existing configuration precedence remains unchanged and
no retiring signing keys are accepted. Compromised keys must never be retained
as fallbacks. Manifests and keys stay outside Git and the Nix store.

Data migration and retirement follow the
[backend key rotation procedure](https://github.com/wg-lux/endoreg-db/blob/main/docs/key_rotation.md).
The application does not provision, delete or automatically rotate secrets.
