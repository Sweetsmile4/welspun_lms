# Phase 1B.3C implementation report

Date: 29 October 2026. Verdict: completed for the isolated backend foundation; ready for review. Production management remains disabled. Phase 2 has not begun. Phase 0 documents remain proposed architecture, not approved Welspun policy.

## Summary and existing safeguards

Reviewed the mandatory baseline reports/guides and actual identity, authorization, organization, management, persistence, controller, environment and test source. Preserved request-bound credentials, server-side identity linkage, current scoped grants/latest roles, filtered totals/pages, organization transaction fencing, optimistic revisions, strict DTOs, same-session mutation audits/receipts and test-only router guards. No public bootstrap, production authentication or management routes were added.

Fixed two concrete replay gaps: grant replay now rechecks every delegated permission and the full grant plan; unit-move replay now rechecks every current descendant. Added factory provenance checks against accidental controller/service substitution. Added strict receipt version/binding/digest validation and a reusable local transactional audit adapter. See [the security review](docs/PHASE1B3C_SECURITY_REVIEW.md) for findings, trust boundaries and limitations.

## Changes and trade-offs

- Extracted grant validation once and reused it for mutation and replay. This avoids diverging security rules, at the cost of conservative denial when the original grant plan is no longer valid.
- Rechecked bounded move descendants before replay. This adds queries but closes lost-child-authority replay without weakening existing tree integrity checks.
- Private WeakSet provenance protects factory composition at runtime. It prevents accidental structural substitutes, not malicious trusted server code.
- Receipts now require supported schema/command/response version 1, exact binding and response SHA-256 digest. Strict DTOs remain the final response boundary. Unsupported/legacy/corrupt receipts fail closed with 503; invalid projected responses remain sanitized 500. No automatic reexecution, TTL, deletion or migration exists. The digest is corruption detection, not tamper-proof authentication.
- The audit adapter accepts only strict, attributed allowed domain events on the active domain session. It validates organization/actor/target and exposes no update/delete/model. Explicit unique-event and organization/time/event indexes support deduplication and bounded organization-authorized reads. No HTTP audit route was added. Test-only local guards preserve the current disconnected infrastructure boundary.

Audit writes roll back with domain writes and receipts. Only organization-level audit.read can read internal pages; unit-scoped history visibility is not guessed. Local persistence is not production durability or database-level immutability. Identity/denial outcomes still need an approved nontransactional durable destination. Production IAM, retention/legal hold, encryption/key governance and privileged access monitoring remain unresolved.

## Receipt lifecycle

Actor/organization/operation/key binding, canonical request fingerprinting, atomic persistence, current authorization and original-response replay are preserved. Concurrent retries and lost responses do not create duplicate committed domain mutations or mutation audits in the tested cases. Replay is historical, so use a separately authorized read to obtain current state.

Receipts grow indefinitely. Possible future policies include full retention, archived payloads with online tombstones, payload expiry with permanent key rejection, or version-aware migrations. Each trades storage against replay availability and operational complexity; none was selected. Deleting receipt uniqueness can permit duplicate execution. Restore domain/audit/receipt state consistently, retain indexes and use compatible readers. A missing-receipt restore simulation safely conflicts for employee uniqueness; it is not a general inconsistent-restore guarantee. Legacy receipts require explicit reconciliation before any persistent environment upgrade.

## Failure and concurrency verification

The isolated real Mongo suites exercised:

| Boundary                           | Evidence                                                                                                                      |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Before domain mutation             | Receipt read failure: sanitized error, no user/audit/receipt                                                                  |
| After domain work, before audit    | Injected append failure aborts transaction                                                                                    |
| During/after audit insertion       | Actual duplicate event insertion and failure after real insert roll back domain/receipt                                       |
| Receipt insertion                  | Existing failure test plus transient failure after actual insert; no partial commit                                           |
| Transaction retry                  | Injected driver TransientTransactionError after receipt insertion reruns callback; exactly one committed result/audit/receipt |
| Commit retry                       | Actual commit followed by injected UnknownTransactionCommitResult; two commit calls, one mutation/audit/receipt               |
| After commit before HTTP response  | Destroyed response; retry returns stored response with replay header, no duplicate                                            |
| Concurrent command/revocation/move | Prior actual Mongo race suites retained; current authorization and revision/fence assertions pass                             |

Failure labels are deterministic test injections around real local transactions/commits, not multi-node failover tests. The organization fence remains unchanged: correctness comes with per-organization contention, including protected reads. No caching/distributed locks were introduced.

## Measured local baseline

Recorded 29 October 2026 at 09:32:44 UTC (15:02:44 IST). Windows 10.0.26300, AMD Ryzen 7 7735HS, 16 logical CPUs, OS-reported 15 GiB RAM; Node 24.18.0, MongoDB 8.0.4, temporary loopback single-member replica set. Dataset: 1 organization, 6 units, 31 users, 30 memberships, 11 roles, 11 grants and 1 receipt. All are synthetic. Other test suites and local validation could compete for resources. No disk/cache isolation or production network was simulated.

Each sequential operation used 2 warmups and 10 timed samples; nearest-rank percentiles (p95 is the maximum at n=10). Times are wall-clock milliseconds; HTTP includes middleware, loopback, authorization, queries, transaction/fence and projection. The direct authorization row includes its transaction, not just pure policy computation.

| Operation                           |   n |    min |    p50 | p95/max |   mean |
| ----------------------------------- | --: | -----: | -----: | ------: | -----: |
| Authorization service + transaction |  10 |  31.14 |  46.14 |   47.61 |  43.51 |
| Scoped employee HTTP list           |  10 | 107.55 | 125.03 |  287.83 | 146.01 |
| Role HTTP list                      |  10 |  29.93 |  31.41 |   56.42 |  35.68 |
| Grant HTTP list                     |  10 |  31.52 |  47.02 |   59.03 |  45.36 |
| Membership history HTTP             |  10 |  62.76 |  77.16 |   78.34 |  74.60 |
| Idempotent HTTP replay              |  10 |  29.93 |  45.19 |   49.70 |  40.74 |

Three batches of 8 concurrent employee reads completed 24/24. Request min/p50/p95/max/mean: 277.87/699.59/1,176.73/1,393.01/720.44 ms. Batch durations: min 1,179.18, p50 1,191.44, max 1,393.05 ms. There were 188 transaction callbacks: 164 beyond the 24 initial callbacks. Pure lock wait was not separately measured. This exposes fence contention and is a scaling WARNING. It is a bounded reproducible diagnostic, not throughput, production capacity, an SLA or a stable performance regression threshold. Representative data sizes/topologies and production workload goals remain external prerequisites.

Raw measurement artifact: ignored `work/phase1b3c-performance.json`. Reproduce using the already installed local Mongo binary:

```powershell
$env:START_LOCAL_MONGO_FOR_TESTS='true'
$env:MONGOD_BINARY='C:\Program Files\MongoDB\Server\8.0\bin\mongod.exe'
$env:RUN_SECURITY_BENCHMARK='true'
npm run test:mongo:local
```

The runner owns a new loopback replica set, generates suite databases and stops its processes. It does not use an existing Mongo service. Scratch files remain ignored. No new infrastructure or package was installed.

## Files created or modified in this phase

Created:

- `backend/src/platform/mongo-security-audit.ts`
- `backend/src/modules/identity/management/receipts.ts`
- `backend/test/security-hardening-scenarios.ts`
- `backend/test/security-hardening.test.ts`
- `backend/test/security-hardening.mongo.test.ts`
- `backend/test/security-local-fixture.ts`
- `backend/test/security-performance.mongo.test.ts`
- This report and `docs/PHASE1B3C_SECURITY_REVIEW.md`, `docs/PRODUCTION_READINESS_CHECKLIST.md`, `docs/PHASE2_ENTRY_CRITERIA.md`

Modified:

- `backend/src/modules/identity/authorization/service.ts`: shared grant plan/replay check and service provenance.
- `backend/src/modules/identity/http-security.ts`: HTTP boundary/controller provenance.
- `backend/src/modules/identity/management/service.ts`: replay authorization, validated versioned receipts and service provenance.
- `backend/src/modules/identity/management/router.ts`: protected composition validation.
- `backend/src/modules/identity/management/store.ts`: compatibility representation for legacy receipt reads.
- `backend/src/modules/identity/management/mongo-store.ts`: explicit version/digest fields and strict new receipt writes.
- `backend/test/management.mongo.test.ts`: use the reusable audit adapter instead of its ad hoc collection writer.
- `package.json`: include hardening and optional performance suites in explicit Mongo validation.
- `README.md`: current phase, audit model count and review links.

No dependencies, lockfile, monorepo structure, prototypes, frontend, employee records or corporate hierarchy were changed by this phase. Existing staged/uncommitted baseline was preserved; no commit or staging was performed.

## Validation executed

| Check                                                             | Result                                                                                                                    |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Focused ordinary hardening + management tests                     | PASS: 18 tests                                                                                                            |
| `npm run check`                                                   | PASS: workspace/tool TypeScript, lint, formatting, 85 ordinary tests, API/web/worker builds and worker smoke              |
| Explicit actual local Mongo tests with optional benchmark enabled | PASS: 77 tests across 6 files, 25.13 seconds                                                                              |
| Playwright production web regression                              | PASS: 6 desktop/mobile tests; repeated after fresh build                                                                  |
| `npm audit --audit-level=high`                                    | PASS: 0 vulnerabilities                                                                                                   |
| Built disconnected API smoke with outbound guard                  | PASS: liveness, envelopes, readiness disabled, identity denial, content-type handling, no outbound attempt or URI logging |
| Built worker with outbound guard                                  | PASS: queues disabled, no jobs, exits 0                                                                                   |

The ordinary run intentionally skips 77 real Mongo/benchmark tests; those were separately executed with explicit opt-in. Without RUN_SECURITY_BENCHMARK=true the performance suite remains skipped even in Mongo mode. Initial sandbox loopback startup timed out and registry audit failed DNS; both succeeded using normal local/network tool access. An initial restricted full check was interrupted after lint/format while the complete normal-access rerun passed. No infrastructure change was needed. Browser emits harmless FORCE_COLOR/NO_COLOR warnings. A clean reinstall was not repeated: no dependencies changed, and previous clean-install evidence remains in prior phase reports. CI itself was not executed remotely. No production, corporate SSO, restore drill, penetration test or multi-node failover test was executed.

## Remaining risks, dependencies and readiness

See [the production checklist](docs/PRODUCTION_READINESS_CHECKLIST.md) for evidence classifications. Production is blocked on corporate SSO/directory and offboarding approval, administrator/bootstrap governance, real role/scope/privacy decisions, audit/receipt retention/reconciliation, database IAM/encryption/backups/restore, monitoring/incident response, deployment/session/abuse controls and independent security review. The local audit API does not stop privileged database tampering; receipts are not perpetual authority. Fence contention and indefinite storage growth need representative operational design before real use.

Recommendation: accept this phase for isolated backend foundation review. Separately authorized Phase 2 internal synthetic development can proceed after agreeing the draft/release/approval contracts and extending explicit permissions/audit types safely. Production approval is not a prerequisite to writing isolated tests, but is required before real use. [Phase 2 entry criteria](docs/PHASE2_ENTRY_CRITERIA.md) distinguish those dependencies. STOP here; no Phase 2 implementation or deployment was started.
