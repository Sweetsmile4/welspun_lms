# Phase 2D.2C schema and migrations

`localIntegrationSchemaManifest` is versioned as `local-integration-schema-v1` and computes a SHA-256 checksum over canonical collection/index metadata plus path/type/required/immutable descriptors. It includes organizations, units, users, memberships, roles, grants, receipts, security audit, courses, drafts, review requests, review decisions and releases, plus development sessions, login transactions, security outcomes and the migration ledger.

The manifest is additive. `compareLocalIntegrationSchema` reports missing, unexpected and conflicting named indexes and detects duplicate keys on required unique indexes without changing the database. `setupLocalIntegrationSchema` requires an already connected owned local target, explicit setup intent and the expected checksum. It creates collections and indexes using existing Mongoose definitions, records the version/checksum ledger, uses insert-only upsert semantics without replacing existing ledger bindings and verifies the final state, and can resume after an interrupted additive step.

Duplicate data, duplicate unique keys, conflicting definitions and unexpected indexes fail closed for manual review. There is no automatic deletion, index replacement, `syncIndexes`, database drop, startup mutation or destructive migration. A TTL index exists only for cleanup of transient sessions/login transactions; authorization must check expiry and revocation explicitly. Domain evidence, releases, receipts and audit have no TTL.

Run the explicit command only against a disposable local target:

```powershell
$env:LOCAL_INTEGRATION_SETUP = 'true'
$env:LOCAL_INTEGRATION_MONGOURI = 'mongodb://127.0.0.1:27017/welspun_lms_integration_local?appName=welspun-lms-local-integration-v1'
$env:LOCAL_INTEGRATION_DATABASE_NAME = 'welspun_lms_integration_local'
npm run setup:integration:local -- --dry-run
# Review the manifest checksum from dry-run before any writes.
$env:LOCAL_INTEGRATION_EXPECTED_CHECKSUM = '<reviewed-checksum>'
npm run setup:integration:local -- --apply
```

The command never consumes `MONGOURI` or `DATABASE_NAME`; those remain reserved for the disabled future shared backend contract. Do not run this command with an Atlas URI. Cleanup must be explicit and ownership-gated; do not rely on automatic teardown.

## Audit corrections and limits

The CLI requires an explicit --dry-run or --apply argument; it no longer silently applies setup. Dry-run connects only to the explicitly named local target and reads metadata/data for comparison without creating collections. Apply requires a caller-supplied reviewed checksum; it does not approve its own newly computed checksum. Unknown ledger versions, mismatched current checksums, incompatible collection options/views, unexpected indexes and semantic index conflicts (including sparse/collation/hidden flags) halt setup. Compound key order remains significant. Ledger is written only after additive steps finish and final comparison verifies it.

Only version v1 is supported; a later version needs reviewed migration sequencing. DDL is not transactionally rollbackable: an interrupted run may leave some collections/indexes, but no successful ledger row. Rerun completes missing additive operations. Concurrent setup by different code versions is unsupported; operators must serialize setup. No lock service or destructive rollback is added. Duplicate preflight covers the current scalar unique indexes and partial filters; future sparse/collation/multikey unique definitions require a reviewed detector before use. Collection validators and document backfills are not generated. Mongoose and existing domain Zod validators remain authoritative for application data. The path descriptor checksum does not fingerprint executable validation hooks or every policy; those changes require a version review.

No ordinary runtime entry imports setup or obtains setup credentials. Local MongoDB runs without authentication on the owned test process: application separation is architectural, not a database IAM guarantee against other code running as the same developer. A future shared deployment requires real separate principals; this local command cannot be used for Atlas.
