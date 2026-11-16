# Phase 2D.2C testing guide

Ordinary offline checks remain safe and do not start MongoDB:

```powershell
npm run check
```

The focused storage checks are:

```powershell
npx vitest run backend/test/integration-storage.test.ts backend/test/integration-foundation.test.ts
```

They cover invalid target denial, credential/remote/SRV/shared-name rejection, redacted failure behavior, inert construction, cleanup ownership, stable manifest checksums, model inventory, bootstrap disablement and existing no-outbound integration boundaries.

The existing disposable Mongo runner remains the only test runner for current domain integration suites. When an installed local `mongod` is available:

```powershell
$env:START_LOCAL_MONGO_FOR_TESTS = 'true'
$env:MONGOD_BINARY = 'C:\Program Files\MongoDB\Server\8.0\bin\mongod.exe'
npm run test:mongo:local
```

This creates a temporary loopback replica set and generated `welspun_lms_test_*` databases. It does not exercise Atlas or the new integration setup command. The new setup command must use only a separately owned `welspun_lms_integration_*` database and must never be combined with the test runner cleanup.

Covered scenarios (actual): invalid target denial, credential/remote/SRV/shared-name rejection, redacted failure behavior, inert construction, cleanup ownership/unauthorized cleanup refusal, stable versioned manifest checksums, model inventory (including additive session/login-transaction/security-outcome/migration-ledger), bootstrap disablement/no-admin-grant, additive setup reruns/idempotent ledger, actual index presence (including TTL hints), explicit session expiry/revocation, login-transaction consumption/expiry, connection failure redaction, no drift/duplicates after setup and isolation from production/shared database names. Additional scenarios such as domain transaction rollback, receipt uniqueness and recovery drills are covered by existing transactional tests; integration-specific lifecycle is constrained by the disposable-local scope. Browser tests continue to validate the fixture-only preview; no browser persistence claim is made in this phase.

## Reverification additions

Ordinary tests now reject missing ports, DNS hostnames, duplicate URI options, production use and forged connections, and verify inert construction/frozen configuration. Mongo cases cover read-only comparison, additive rerun/interruption recovery, duplicate/index drift and ledger-version/checksum denial, persisted session revocation/login consumption, receipt uniqueness and native same-session domain/audit/receipt rollback, connection failure/recovery and unauthorized cleanup refusal. Generated databases use random integration names on the disposable runner's loopback replica set; the existing runner/test adapter is unchanged. Tests intentionally create malformed raw local records to prove index/transaction behavior; this is not an executable bootstrap or domain service bypass.

Use --dry-run first and --apply only with LOCAL_INTEGRATION_EXPECTED_CHECKSUM from the reviewed manifest. The CLI never reads shared MONGOURI/DATABASE_NAME. No Atlas URI is required or used. The full suite may include separate pre-existing Phase 2D.2D.1 tests; final report distinguishes those from the eleven local-storage Mongo cases and five ordinary storage tests.
