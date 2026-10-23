# Secret rotation integration

## Central identity delivery is disabled

Identity salts remain on the source node. The backend rejects runtime bundles
and SecretSpec identity delivery. Keep the established local file/keyring and
historical generations; do not delete or regenerate them to bypass startup
validation. LuxNix rejects central salt options and no longer provisions salts
through machine enrollment. Deploy the matching backend and infrastructure
changes together; this source change does not activate existing hosts.

The canonical coordination catalog is
[LuxNix secrets-management.yml](https://github.com/wg-lux/luxnix/blob/main/secrets-management.yml).
It defines ownership and the inventory, prepare, activate, verify and retire gates
across LuxNix, endoreg-db and LX-Annotate. Use its local checker with all three
source checkouts before planning a rollout. Readiness remains in
[LuxNixPressingIssues.yml](../../feature-tracking/LuxNixPressingIssues.yml),
criteria `managed_secret_consumer_acceptance` and
`rewritten_dependency_environment_upgrade`, and the owning backend and
infrastructure feature trackers.

LuxNix provisions private files. LX-Annotate declares three optional file handles
in `secretspec.toml` and the host environment contract:

- `DJANGO_SIGNING_KEYRING_FILE`: active Django signing key. `AppConfig` uses
  the backend private manifest validator. `SECRET_KEY_FALLBACKS` is always empty;
  historical readers never authorize retired signatures. Restart every consumer
  after activation, invalidating sessions and signatures made with the old key.
- `DJANGO_IDENTITY_SALT_KEYRING_FILE`: consumed by endoreg-db identity services.
  Preserve historical salts at the source for returning-patient identification.
  Only the active salt writes new identities. `DJANGO_IDENTITY_CENTER_ID` and
  optional `DJANGO_IDENTITY_SALT_GENERATION` validate the host-authorized
  center and positive integer generation using the backend validator.
  Host provisioning enforces monotonic generations; a fixed application
  generation pin is reserved for controlled activation exercises;
  credential renewal never invents a replacement salt.
- `LX_ANNOTATE_MASTER_KEYRING_FILE`: consumed by endoreg-db encrypted storage.
  Preserve required readers and local custody of the master key.

A signing manifest takes precedence over the existing single-file/inline signing
configuration. Missing, malformed, non-private or invalid manifests fail closed.
Configured credential files take precedence over inline signing, database and
OpenID Connect secrets, including stale inline values. Missing, non-private or
invalid files fail closed rather than reverting to inline credentials. Config
representations and serialization exclude those secret values.

Manifests and keys stay outside Git and the Nix store. Host provisioning owns
authenticated delivery, encrypted persistent backing, and protected decrypted
runtime handles; private permissions alone do not establish encryption. For these managed credentials, rendered environment copies must contain handles
and non-secret center/generation pins only. Audit other host-owned credentials
against the LuxNix encrypted-persistence criterion before production acceptance.
The application does not implement a separate Vault client.

Drain all identity-writing consumers before activation, then restart web, every
Celery queue, watcher and maintenance processes with the same authorized generation.
When an explicit generation pin is used, backend validation rejects a changed
manifest generation against an old process pin. Keep authorized historical salts at the source for identity matching and
required media keys for authenticated old-file reads; neither grants obsolete
signing or client-authentication trust. Installed-runtime and multi-client
acceptance remains required before a fleet rollout.

Data migration and retirement follow the
[backend key rotation procedure](https://github.com/wg-lux/endoreg-db/blob/main/docs/key_rotation.md).
The application does not provision, delete or automatically rotate secrets.
