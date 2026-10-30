# Phase 2D.2 MongoDB readiness

30 October 2026. Supervisor approval is recorded for using the existing company shared Atlas cluster and its already-existing development database welspun_lms_dev. This approves the infrastructure choice; this task explicitly forbids an application connection. This audit did not connect, resolve a supplied cluster, provision anything or request/store credentials.

## Current code and incompatibility

platform/environment.ts fixes DATABASE_ENABLED to false. createMongoAdapter constructs an unconnected Mongoose connection; connect requires explicit permission and assertLocalMongoTarget. That target check accepts only credential-free mongodb loopback with explicit port, isolated dev/test and names starting welspun_lms_dev_ or welspun_lms_test_. The approved exact welspun_lms_dev has no trailing underscore and is rejected, as are Atlas SRV hosts and credentials. URI configuration alone cannot connect. API/worker startup never calls connect.

The local security-audit adapter additionally requires NODE_ENV=test, a connected loopback host and welspun_lms_test_ name. Changing only the connection adapter would still leave domain/audit/HTTP guards unsatisfied. Preserve all disposable-local helpers and tests unchanged. A separate reviewed integration target adapter and honest persistent audit composition are required; do not replace string prefixes with a broad allow-all.

## Proposed configuration contract

The exact required backend keys are MONGOURI and DATABASE_NAME. No alias or rename is supported for shared integration. The backend example contains only:

```dotenv
MONGOURI=
DATABASE_NAME=welspun_lms_dev
```

The disabled integration parser accepts these keys, requires the exact literal database name when a URI field is supplied, and returns only enabled:false without retaining/returning the URI. A missing URI or blank example cannot connect. Nonblank input receives only a preliminary SRV-scheme/whitespace bound check, not host/credential/TLS approval. The parser reads no environment or secret automatically. All enable attempts remain denied. Other settings below remain proposals. Normal startup ignores these integration keys and stays disconnected; the existing local adapter uses its unchanged local configuration, which is not an alias for these keys.

| Proposed setting                                          | Meaning and validation                                                                                                 |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| APP_ENV / LMS_INTEGRATION_ENABLED                         | Exact development-integration context and independent explicit enablement; deny production/missing/mixed values        |
| DATABASE_NAME                                             | Exact welspun_lms_dev, passed explicitly as driver dbName; no default admin/test database                              |
| MONGOURI                                                  | Backend-only Atlas URI via approved secret channel; never client/Next/build artifact; no hardcoded value               |
| LMS_DEV_MONGODB_ALLOWED_HOSTS                             | Operator-approved exact SRV seed hostname/cluster identity; reject user-provided addresses and mismatched URI database |
| LMS_DEV_MONGODB_TLS_REQUIRED                              | Always true for approved Atlas; reject insecure TLS/certificate/hostname overrides                                     |
| LMS_DEV_MONGODB_POOL_MAX                                  | Small capacity-reviewed per-process bound, validated with reserved concurrency and cluster headroom                    |
| LMS_DEV_MONGODB_SELECTION_TIMEOUT_MS / CONNECT_TIMEOUT_MS | Bounded validated values within end-to-end request deadline                                                            |
| LMS_DEV_SCHEMA_VERSION                                    | Expected approved migration/index manifest; readiness fails on drift                                                   |
| Setup credential delivery (separate process)              | Setup-only principal injected as MONGOURI in the setup process; same DATABASE_NAME; no automatic migration on startup  |

A later approved backend configuration loader must obtain MONGOURI and DATABASE_NAME under these exact keys; secret storage may supply MONGOURI without changing its application key. DATABASE_NAME must be passed explicitly as driver dbName, never inferred from a URI or default database. Do not place credentials in commands, reports, frontend env, tracked examples or CI logs. URI parsing/errors must never echo userinfo. Parse driver-compatible SRV/auth options using a maintained driver parser/explicit options, not a naive URL hostname-prefix check. Validate both configured target and connected database identity. The secret's authSource may differ from dbName; that does not authorize writes to other databases.

## Least privilege and cluster isolation

Use a distinct application database user restricted to this database and, where feasible, its named collections. Atlas database users and Atlas management users are distinct, and Atlas supports scoped privileges and cluster restrictions. Obtain the DBA-reviewed privilege manifest before provisioning. [Atlas database users](https://www.mongodb.com/docs/atlas/security-add-mongodb-users/)

Runtime minimum proposal: find/insert/update on approved mutable organization/draft/review projection/receipt/session collections as actually needed; find/insert only on immutable reviewDecisions, courseReleases and securityAuditEvents; no remove/update privileges on those append-only collections, no drop, database admin, createIndex, createCollection or cluster-wide role. Session revocation uses update; expiry cleanup belongs to a separate reviewed cleanup role. Receipts are never deleted as routine retry cleanup. Use separate setup credentials for create collections/indexes/schema ledger and an independently controlled backup/cleanup principal. Exact custom role support must be confirmed for the cluster tier. DB permissions cannot enforce every scoped domain rule, so server authorization remains mandatory.

A dedicated database is logical isolation, not a dedicated cluster: CPU, storage, connections, maintenance, project network settings and backup scope can still affect other applications. Require cluster-owner approval of capacity, naming, custom roles, network changes and restore/cleanup procedures. Never reuse another application's user or perform cluster-wide sync/drop/restore. Later authorized validation must prove access to allowed collections and denial to another disposable database without reading any other application's data. Do not perform that proof during this audit.

## Network and TLS requirements

Prefer an approved private connectivity route where available, otherwise tightly allowlisted stable egress from the API runtime. Atlas project IP access lists affect the project; broad ranges can affect other clusters. Do not propose 0.0.0.0/0 as a convenience. Dynamic developer/Lambda egress needs a reviewed VPN/NAT/private endpoint plan; the browser and Next build runners need no DB network access. [Atlas IP access lists](https://www.mongodb.com/docs/atlas/security/ip-access-list/)

Use TLS with trusted CA chain and hostname verification; Atlas documents TLS 1.2 and 1.3 support. Validate the actual approved cluster minimum and runtime trust store. No tlsAllowInvalidCertificates, tlsAllowInvalidHostnames or tlsInsecure; do not copy unrelated AWS CA bundles as an Atlas fix. SRV DNS resolution and all required replica-set members must be reachable from the backend. [Atlas security FAQ](https://www.mongodb.com/docs/atlas/reference/faq/security/)

## Collection/index inventory and setup

The source currently defines 13 domain/security collections. Reuse schema declarations as the authoritative index manifest; verify names, key order, uniqueness and partial filters against source at implementation time.

| Collections                     | Required existing index guarantees                                                                 |
| ------------------------------- | -------------------------------------------------------------------------------------------------- |
| organizations                   | unique organization code                                                                           |
| orgUnits                        | unique org/parent/code; one organization root via partial unique index; org/ancestor/status lookup |
| users                           | unique org/issuer/subject; optional employee ID partial unique                                     |
| memberships                     | interval start uniqueness, partial one-open unit/primary membership, user/unit temporal lookups    |
| roleDefinitions, roleGrants     | unique org/code/version; current actor grant and role grant lookups                                |
| managementCommandReceipts       | unique org/actor/operation/keyHash; versioned response/fingerprint integrity                       |
| securityAuditEvents             | unique event UUID; org/time/event cursor index                                                     |
| courses, contentDrafts          | unique org/course code; one current draft per course; lifecycle lookup                             |
| reviewRequests, reviewDecisions | unique exact draft revision; one decision per reviewer partial unique; scoped history              |
| courseReleases                  | unique org/course/number and org/course/source draft/revision; scoped history                      |

Session/login-transaction/security-outcome collections and a schema migration ledger are proposed additions, not currently implemented models. Explicit expiry checks are mandatory; any TTL for transient sessions/login state is cleanup only. Do not add TTL to domain evidence, releases, receipts or security audit without an approved retention design.

Setup sequence after approvals: verify target and feature compatibility; capture approved inventory; run a dry-run manifest diff; scan only target DB for duplicates/incompatible schema; execute ordered versioned additive setup under exclusive migration ownership; create collections outside domain transactions; create named indexes with setup credentials; verify definitions; record migration checksum/version; perform read/transaction smoke on synthetic records; publish readiness. Existing initializeIndexes helpers are explicit test setup conveniences, not a complete shared-environment migration system. Never run syncIndexes or drop/rebuild unique indexes automatically. DDL is not a single rollbackable domain transaction; interrupted steps must resume safely. Duplicate unique keys halt setup rather than auto-delete data.

Use a separately approved fictional development organization, explicit issuer/subject mapping and minimal scoped grant manifest. No actual Welspun hierarchy, real employees or automatic seed-admin. Bootstrap must be operator-authorized and audited; it must not become a public provisioning endpoint. Existing test fixtures are not a safe production/development migration.

## Transactions, errors and operations

Confirm Atlas tier/version/topology supports the exact transaction, index and aggregation features exercised by this repository, including snapshot reads, majority writes and partial-filter indexes. Keep one connection/session across authorization fence, domain, audit and receipts; no nested transaction for a store. Existing maxCommitTimeMS is 5000, selection/connect defaults 5000 and socket timeout 30000, pool max 5 in local adapter. These are observed local settings, not shared-cluster sizing policy. Set a coherent total request/transaction/retry budget before deployment.

Fail closed on missing schema, invalid credentials, network/TLS error or audit/receipt unavailability. Liveness can remain healthy; integration readiness becomes unavailable and mutations return safe 503. Do not log driver messages/URI, buffer writes indefinitely, fall back to fixtures or retry with a new idempotency key after an unknown commit. Track safe dependency category and correlation, pool saturation and transaction retry count. Session recovery and durable audit/outcome logging must also work across process restarts.

Define pool/concurrency headroom with the cluster owner; protected reads currently take the organization write fence and can contend. Catalog grouping processes matching historical releases; use representative explain/load checks later, not a claim that existing indexes guarantee capacity.

## Backup, retention and cleanup gates

Confirm cluster tier's actual backup features, current schedule, encryption/access, retention, cost owner and agreed RPO/RTO. These are unknown. Atlas backup/restore options vary with deployment; do not assume an application database is independently restorable from a cluster snapshot. [Atlas backup and restore](https://www.mongodb.com/docs/atlas/backup-restore-cluster/)

Restore into a separate approved target first, then reconcile domain/provenance/reviews/evidence/releases/audit/receipts and indexes at one consistent recovery point. Never restore over the shared cluster or rewind other applications. Revoke stale sessions/keys and reconcile in-flight command outcomes after restore. Privileged administrators can still alter data/recompute hashes; application immutability is not tamper-proof archival.

Approve retention for synthetic content, authenticated developer identity links, sessions, logs and receipts. No indefinite production retention or arbitrary TTL is selected. Shared welspun_lms_dev cleanup is an explicit owner-reviewed run manifest with exact target, authorized dataset IDs, backup and evidence/receipt consistency; runtime credentials cannot drop the DB. Do not reuse the disposable test runner's drop/cleanup behavior on Atlas. Local tests continue with generated welspun_lms_test_* databases and owned loopback processes only.

## Separate future adapter and remaining connection gates

Plan a new backend-only adapter, for example apps/api/src/integration/atlas-database.ts. No implementation is added now. It must accept the exact MONGOURI/DATABASE_NAME inputs through reviewed server configuration, validate the approved cluster hostname and URI database agreement using driver-compatible parsing, force dbName=welspun_lms_dev, verify TLS/hostname/certificate settings, and refuse every other database. Construction/import must not connect; only a separately authorized integration composition can explicitly connect after prerequisites pass. Do not import it into the frontend, Next gateway, normal API server or worker startup. Do not change platform/database.ts, database-config.ts, disposable runners or their allowlists.

Before connecting, obtain the actual approved cluster identity/tier/version and DBA-issued database-scoped runtime credentials; separate schema/setup privileges; approved network access and verified TLS; an explicit additive schema/index manifest and migration owner; and reviewed backup/restore/retention, capacity and cleanup procedures. The database already exists: inspect its authorized collection/index state before applying setup, do not create/recreate/drop the database or assume it is empty. A database's existence does not prove application schema readiness. Never run automatic syncIndexes, test cleanup or cross-application operations on the shared cluster.

Infrastructure/database choice is approved. Access, secret delivery, exact host verification, grants, migration/index execution, network/TLS and operational evidence remain prerequisites. A separate implementation task and explicit connection authorization are still required; this update does not connect or provision anything.
