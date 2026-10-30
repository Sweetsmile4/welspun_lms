# Phase 2D.2C implementation report

30 October 2026. Isolated disposable-local integration storage/setup foundation reviewed and completed from existing partial work. No Atlas connection, browser integration, deployment or production identity was enabled. Stop after Phase 2D.2C.

## Audit before changes

Read the Phase 2D.2A readiness report, Phase 2D.2B report and requested integration roadmap/architecture/security/MongoDB/next-step guides. Inspected actual local adapter, Mongoose source definitions/index helpers, transaction repository, local audit adapter, command receipts, immutable publishing store, disposable runner, setup CLI, tests and all six existing Phase 2D.2C deliverables. Git status was checked first. Most implementation files already existed; they were refined instead of rebuilt.

The initial working tree contained staged and unstaged work. All was preserved without staging, committing or resetting. Additional separate Phase 2D.2D.1 source/tests/report files appeared in the shared working tree during review; they were left outside this task. Final whole-repository checks may include those tests, but this report does not approve or claim their implementation. No runtime API mounting was added. The prior Phase 2D.2C report's completion counts were not accepted without fresh execution.

## Confirmed gaps and fixes

| Finding                                                                                   | Resolution                                                                                                                                                                                                                                       |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| CLI applied setup directly and computed its own approval checksum                         | Explicit --dry-run or --apply required; apply requires LOCAL_INTEGRATION_EXPECTED_CHECKSUM from operator review. Missing checksum causes no writes. CLI disconnects only its own adapter and reports fixed safe failure text.                    |
| Prefix/host-only checks accepted arbitrary similarly named Connection objects             | Adapter-private WeakMap binds exact connection/name/port; setup and cleanup require it. Configuration is frozen. Literal loopback IP/explicit port only, duplicate URI options and production use rejected.                                      |
| Config parse errors could expose Zod input values                                         | Fixed safe configuration errors; driver errors redacted. No credentials are permitted in local URIs.                                                                                                                                             |
| Manifest checksum omitted model paths and could lose compound index order                 | Manifest includes field path/type/required/immutable descriptors and explicit key-order arrays alongside source-derived named indexes. Canonical checksum remains version-bound.                                                                 |
| Drift comparison ignored semantic flags and collection options                            | Sparse/collation/hidden/TTL/partial/unique/name/key order are compared; incompatible collection options/views are rejected rather than altered.                                                                                                  |
| Ledger duplicate insert could conceal a mismatch                                          | Insert-only upsert plus pre/post checksum verification; unknown ledger versions fail closed. No ledger success on interrupted DDL.                                                                                                               |
| Missing coverage for rollback, receipt uniqueness, recovery, drift and durable revocation | Added disposable native transaction/index probes, interrupted setup/rerun, read-only comparison/CLI, duplicate/drift/version/checksum denial, connection recovery and saved revocation/one-time consumption tests.                               |
| Bootstrap had role names but no permission lists; own-scope create would be invalid       | Added typed proposed permissions and named grantees. Author create is a separate unit-scoped role; own authoring/submit role excludes create. Reviewer and publisher grants are limited to the fictional unit. No admin or executable bootstrap. |
| Security outcome category/reason accepted arbitrary strings                               | Fixed bounded vocabularies; no diagnostic body/token/URI fields. Explicit session checks reject future issuance, expiry/revocation and invalid idle/absolute ordering.                                                                           |

## Implemented storage boundary

createLocalIntegrationDatabase is a dedicated adapter, not a fallback to platform/database.ts. It accepts only credential-free mongodb:// literal 127.0.0.1 or IPv6 loopback with explicit port, exact matching welspun_lms_integration_* database name and appName/ownership marker welspun-lms-local-integration-v1. Atlas SRV, remote/DNS hosts, shared welspun_lms_dev, unknown/duplicate query options, credentials and production use are denied. Construction/import is inert; connect requires explicit intent, bounded pool of at most 5 and bounded selection/connect/socket timeouts. AutoCreate/autoIndex/buffering remain disabled.

Cleanup requires explicit intent, the ownership marker, connected registered Connection and the exact validated name/port. It can only drop that named disposable local database. It cannot clean Atlas or a test-prefix database. The public marker is an operator acknowledgement, not a secret or protection against malicious code running as the same OS user. Local unauthenticated storage is not a substitute for future database IAM.

No normal API/worker composition imports the adapter/setup. Shared configuration remains disabled and uses exact MONGOURI and DATABASE_NAME=welspun_lms_dev, unchanged. Local CLI reads only separate LOCAL_INTEGRATION_MONGOURI, LOCAL_INTEGRATION_DATABASE_NAME, LOCAL_INTEGRATION_SETUP and reviewed checksum settings; these are not aliases/fallbacks for the shared keys.

## Schema, session and bootstrap preparation

Version local-integration-schema-v1 covers 13 existing domain/security collections plus developmentSessions, loginTransactions, securityOutcomes and schemaMigrationLedger. Existing Mongoose definitions are the source of truth; already-added schema exports are retained with guards unchanged. compareLocalIntegrationSchema is read-only; setup is explicit additive collection/index creation, duplicate/conflict preflight and ledger verification. No syncIndexes, automatic index replacement, data deletion, startup migration or backfill exists.

DDL is not a domain transaction. Partial setup may remain after interruption and is resumed by additive rerun; operators must serialize setup. Only v1 is supported, with unknown versions denied. The manifest records selected field descriptors, not executable validation hooks or complete collection validators. Duplicate preflight covers current scalar/partial unique definitions; future sparse/collation/multikey uniqueness requires a reviewed detector. Runtime schema/authorization validation is not replaced by this manifest. Ordinary runtime has no setup entry point; local no-auth Mongo does not enforce a privileged setup user against arbitrary same-user scripts.

Session models/interfaces store opaque-value hashes, explicit idle/absolute expiry, revocation and CSRF binding. Login transaction models store hashes, expiry and consumed state. TTL on transient records is cleanup only; explicit checks and atomic conditional consumption remain required. No session issuer, login callback, cookie or CSRF endpoint was implemented by this phase.

Fictional organization/unit/author/reviewer/publisher manifests remain review-only and executable:false. Identity strings are placeholders. Proposed roles/grantees are explicit, with no administrator permissions. No corporate hierarchy, employee, approval count or qualification policy is inferred; no records are seeded.

## Transaction and authorization evidence

Existing organization-fenced authorization, same-session domain/audit/receipt adapters, canonical digest/revision/current reviewer checks and immutable release/evidence behavior remain unchanged. The integration database cannot be used with the existing test-only audit/domain composition by changing a label or removing a guard. That trust-boundary expansion is deferred.

New native transaction probes deliberately write synthetic raw local records to verify MongoDB rollback across domain/audit/receipt collections and unique receipt indexes; they do not prove authenticated application composition or valid command receipts. Existing domain suites separately exercise those full contracts. No publishing rule or audit durability label was changed.

## Files inspected/refined

- apps/api/src/integration/local-database.ts, schema-manifest.ts, schema-setup.ts.
- apps/api/src/integration/session-models.ts, session-store.ts, bootstrap-manifest.ts.
- scripts/setup-integration-local.ts.
- apps/api/test/integration-storage.test.ts and integration-storage.mongo.test.ts.
- This report and all five docs/PHASE2D2C_* guides.

Existing README/package scripts/schema exports were preserved. No packages were installed, lockfile edited, disposable adapter/runner modified or source prototype changed. Separate Phase 2D.2D.1 files were not implemented or connected by this task.

## Fresh verification

| Check                                             | Actual result                                                                                                                            |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| npm run check                                     | PASS: type checking, lint, formatting, ordinary tests, API/Next/worker builds and inert-worker smoke                                     |
| Ordinary tests                                    | PASS: 154 passed, 131 opt-in skipped; 18 files passed, 11 skipped; includes 5 storage cases and separate pre-existing work               |
| Final disposable MongoDB run                      | PASS: 130 passed, 1 optional benchmark skipped; 10 files passed, 1 skipped; 29.71 seconds; includes all 11 local-storage cases           |
| Playwright desktop/mobile                         | PASS: 31 passed, 1 duplicate server-only mobile guard skipped; 48.6 seconds                                                              |
| Explicit false and unset preview guards           | PASS: all development workspaces disabled; no preview API                                                                                |
| Disconnected built API/worker with outbound guard | PASS: liveness/envelopes/readiness DB disabled/default identity denial/415; no outbound attempt/URI logging; queues disabled and no jobs |
| Dependency audit                                  | PASS: 0 vulnerabilities; no dependency changes                                                                                           |
| Final affected type/manifest/format checks        | PASS: final full check, tools type check, 5 ordinary storage cases, all 6 deliverables formatted and diff check passed                   |

A schema-comparison union-type error was corrected without weakening types. One restricted local runner attempt timed out before Mongo startup and was rerun with loopback access. An initial combined CLI test exceeded the existing 30-second test deadline while browser/full suites ran; it was split into independently bounded dry-run, checksum-denial and successful-apply tests without changing timeouts or adding retries. Failed attempts are not counted as passes. Final Mongo includes the corrected one-time conditional-consumption probe and compound-key-order manifest.

No Atlas was contacted. Existing local runner owns/stops its replica-set processes and retains ignored scratch logs. No clean install, remote CI, failover/restore drill, shared-cluster permission proof or independent security review was performed. Cosmetic browser color warnings and pre-existing CRLF normalization notices do not affect checks.

## Remaining approvals and stop boundary

Supervisor approval covers restricted internal review/testing intent, shared Atlas/database choice in principle and fictional account concepts; it does not authorize deployment, insecure login or connection during this task. Bootstrap remains disabled pending exact issuer/subject mapping, operator authority, scoped role/assignment duties and demonstration review policy. Session lifetimes/revocation/CSRF/workload trust, security-outcome retention and operational ownership remain decisions for a separately authorized identity/transport increment.

Before shared Atlas use: exact host/tier/transaction compatibility, database-scoped runtime/setup credentials, approved network/TLS, schema/index migration manifest/execution authority, concurrency budget and backup/retention/cleanup must be approved and validated. The existing database must never be dropped/recreated or cleaned by this local tool.

Phase 2D.2C stops with isolated local storage and explicit setup only. No new browser-backed CRUD, public business routes, production authentication, queues, deployment or automatic Phase 2D.2D begins here.

Final verdict: ready for Phase 2D.2C review. No failing required check remains. The 131 ordinary opt-in skips comprise 130 separately executed local Mongo tests and the optional benchmark. Storage-specific coverage is 5 ordinary and 11 Mongo cases; other suite counts include existing domain and separate working-tree tests. Bootstrap and browser/domain integration on the new local database remain disabled; no Phase 2D.2D implementation was begun by this task.
