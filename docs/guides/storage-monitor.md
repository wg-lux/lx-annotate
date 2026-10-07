# Storage monitoring center

Scope and verification are tracked in [StorageOptimization.yml](../../feature-tracking/StorageOptimization.yml), criterion `storage_monitor`.

The `/speicher` page inventories local video and report records in every persisted state, upload jobs, and files below the runtime storage, import, transcoding, quarantine and migration-staging roots. File references, recorded video generations, streaming directories, frame directories and upload provenance are reconciled with the filesystem. Missing references and unindexed files remain visible. This is a local inventory, not a remote storage-node inventory.

Search matches filenames, runtime-relative paths, database identifiers, references and displayed metadata. The table supports state/type filters, pagination, expandable metadata, associated artifact sizes and explicit selection. Filesystem capacity is independent of table filters; the inventory byte total counts each observed file once, not the aggregate media rows again. An inventory above 100,000 entries fails explicitly instead of returning a silently truncated result.

Access requires global center administration or the exact `storage:monitor` group. Only global administrators can delete. The API never serves file contents or keys. Responses are private and not cached.

Deletion requires confirmation of the displayed scope. Signed observations expire after five minutes. Media actions call their owning deletion service, preserving its processing and reference guards. Associated artifacts are removed through their medium; the interface does not unlink a current master or streaming segment individually. Unindexed regular import files can be deleted individually after acquiring the import source lock and repeating the reference and inode/size/timestamp checks. Symlinks, hard links and lock files are protected. Unassigned files outside the import boundary remain visible but require ownership reconciliation; this page does not bypass quarantine retention or turn absent database rows into an automatic cleanup authorization.

Terminal upload jobs without retry or live lease also offer an explicit source-deletion action. It locks the job and source files, rejects shared or unsafe references and verifies every source content hash before unlinking. It preserves the upload audit row and its processing result, while recording source cleanup completion. This manual administrative action is independent of the automatic retention policy.

A failed deletion can have already removed some files through the owning service. The page reports each successful or failed action separately and reloads the inventory. A failed inventory refresh clears stale rows. No automatic cleanup policy, remote host or production deployment is changed by this feature.
