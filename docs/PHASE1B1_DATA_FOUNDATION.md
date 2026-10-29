# Phase 1B.1 data foundation

Internal implementation contract, not an approved Welspun HR or access policy. Actual plants, departments, employee identifiers, SSO and authorization remain unconfigured. No HTTP endpoint exposes these services.

## Services and ownership

The backend-only `modules/identity/organization/index.ts` exports service/repository factories and internal types. Public contracts and frontend imports remain unchanged. Methods cover organization/root creation, unit creation, move validation and execution, provisioning data, membership creation/closure/atomic transfer, and current/history lookups. Caller `actorId` supplies provenance only. Phase 1B.2 must authorize actor and resource scope before invoking these methods. Repository interfaces are infrastructure ports, not APIs for controllers to bypass services.

## Hierarchy and concurrency

An organization owns exactly one organization-type root orgUnit. A plant must be under that root. A department may be under a plant or another department, so every department has one plant ancestor and nested descendants have ordinary subtree semantics. Root movement and placing a plant inside a department are forbidden. No actual organizational names are seeded.

Ancestor IDs are derived from stored parents in root-to-parent order. Self/descendant parents are rejected. Moves rewrite all descendant paths atomically. Limits are 32 ancestors and 1,000 moved units; larger maintenance operations fail rather than partially apply.

`organizations.treeRevision` is the authoritative structural version. Unit create/move requires `expectedTreeRevision`. Each unit's `treeRevision` records its last structural placement; unaffected units are not rewritten. Generic revisions support conditional updates. Preview validation returns a revision and does not reserve a future move.

Every organization write conditionally increments its organization document revision before checking/writing related data. This shared serialization point protects hierarchy, provisioning and membership constraints from write skew. MongoDB snapshot transactions retry transient conflicts and re-read data; stale caller tree revisions still fail. Operations inside a transaction are sequential. External side effects must never be put in retried callbacks. This favors integrity over administrative write throughput; it is not a pattern for high-volume learning-event ingestion.

## Membership semantics

Intervals are half-open `[validFrom, validTo)`; null is unbounded. Dates must be valid; a finite end must follow the start. Backdated/future-effective data is supported, subject to future authorized HR policy. Different units can have overlapping non-primary memberships. A user/unit pair cannot overlap, and a user can have at most one primary membership at any instant, including bounded intervals. Adjacent intervals are valid.

Services examine the user's intervals under the organization transaction lock. An open membership closes once using an expected revision; unit, user, start, primary marker and creation metadata remain. Bounded/closed history cannot be rewritten or deleted through these interfaces. Atomic transfer closes an open row and creates its successor at the same instant, preserving primary status. Invalid destinations or overlaps roll back the whole transfer.

Records preserve unit identity and membership interval history, not a temporal archive of all past hierarchy paths. Future learning evidence must capture approved scope snapshots. Historical authorization, cache invalidation after moves and real transfer policy remain Phase 1B.2/external decisions.

## Validation and indexes

Organization/unit codes are trimmed uppercase technical identifiers: ASCII letter, then up to 63 letters/digits/underscore/hyphen. Names remain Unicode. Codes and organization references are immutable. Issuer/subject values remain opaque and case-sensitive without silent normalization; blank values are invalid. Employee IDs are optional, trimmed and case-sensitive. These are technical choices, not a claimed corporate ID convention.

| Collection | Indexes |
|---|---|
| organizations | Global unique code |
| orgUnits | Unique organization/parent/code; partial unique organization/type for organization roots; organization/ancestors/status subtree lookup |
| users | Unique organization/issuer/subject; partial unique organization/employeeId only for string employee IDs |
| memberships | Unique organization/user/unit/start; partial unique open user/unit; partial unique open primary per user; interval and unit lookup indexes |

Schemas reject unknown fields, validate shape, and record timestamps, creator/modifier and revisions. Automatic index/collection creation and command buffering are disabled. `initializeIndexes` explicitly creates collections/indexes before transactions; startup never invokes it. Production will need reviewed migrations rather than destructive index synchronization.

MongoDB cannot enforce foreign keys, valid parent types, derived ancestry, acyclic graphs or arbitrary interval exclusion. Services, transactions and the common lock enforce those rules. Direct database writes can bypass them. Missing and cross-organization references return the same scoped `NOT_FOUND`, avoiding existence disclosure. Schema validation alone is not the integrity boundary.

## Database lifecycle

The existing `createMongoAdapter` remains, with its optional legacy URI argument and a typed configuration alternative. Construction/import stays disconnected. A connect call needs explicit opt-in, development/test environment and isolation flag. Production, remote/SRV, credentialed, incorrectly named or unexpected-option targets are rejected before opening.

This phase permits only single-host loopback `mongodb://` URLs with explicit port and a `welspun_lms_test_...` or `welspun_lms_dev_...` database name. Allowed URI options are `replicaSet` and `directConnection`. Future Atlas configuration is deliberately not enabled. Opening is deduplicated; disconnect waits for opening and prevents a new open while closing. Failures close the connection and return a sanitized error without raw URI/driver messages.

Selection/connect defaults are five seconds, bounded to 100–30,000 ms; socket timeout is 30 seconds and pool size five. The environment-to-config helper does not connect. `DATABASE_ENABLED=true` remains rejected. API/worker startup does not call the adapter or initialize organization repositories; readiness still reports database disabled and production readiness false.

## Opt-in integration tests

`npm test` runs offline schema tests, rollback-capable in-memory service tests and Phase 1A tests. Mongo tests skip unless explicitly enabled. In-memory/mock results are not database integration proof.

For an existing **isolated local replica set**, use a dedicated non-production PowerShell terminal:

```powershell
$env:RUN_MONGO_INTEGRATION='true'
$env:MONGO_TEST_ALLOW_WRITE='true'
$env:MONGO_TEST_URI='mongodb://127.0.0.1:27017/welspun_lms_test_manual?replicaSet=localtest'
npm run test:mongo
```

The suite generates its own `welspun_lms_test_<UUID>` database, creates four collections/indexes, uses synthetic records, drops only that generated database and disconnects. Standalone MongoDB is rejected because it cannot exercise these transactions. No corporate/shared target is allowed. Missing opt-ins fail rather than selecting another target.

Alternatively, explicitly start a disposable replica set with an **already installed** mongod binary:

```powershell
$env:START_LOCAL_MONGO_FOR_TESTS='true'
$env:MONGOD_BINARY='C:\Program Files\MongoDB\Server\8.0\bin\mongod.exe'
npm run test:mongo:local
```

The example path identifies the executable available on this development machine, not a corporate installation requirement. The script downloads nothing. It creates a fresh ignored `work/mongo-phase1b1-*` dbpath and one-member replica set on an ephemeral loopback port, runs the opted-in suite and stops its own processes. Existing services are untouched; scratch logs/data are retained. Clear flags or close the terminal afterward. No database service was added to ordinary tests or CI.

## Technical references

[Mongoose transactions](https://mongoosejs.com/docs/transactions.html) documents retries and sequential transaction operations. [MongoDB unique indexes](https://www.mongodb.com/docs/manual/core/index-unique/) documents compound/partial uniqueness. These mechanisms do not approve Welspun policies.
