# Phase 1B.3C security review

Reviewed 29 October 2026. Scope: the existing backend foundation and isolated synthetic tests. Phase 0 documents remain proposals, not approved Welspun policies. This is a source review and local regression exercise, not an independent penetration test or production certification.

## Reviewed baseline and trust flow

Read README, Phase 1A final review, Phase 1B.1/1B.2/1B.3A/1B.3B implementation reports, the authorization, HTTP security and management API guides, SYSTEM_ARCHITECTURE, DATABASE_SCHEMA, API_CONTRACTS and OPEN_QUESTIONS. Inspected identity providers, HTTP helpers/controllers, authorization engine/service/repository, organization integrity service/models, management policy/store/router, environment/startup guards and ordinary/real Mongo tests.

| Boundary | Existing safeguard and verification | Result |
| --- | --- | --- |
| HTTP credential → identity | Bounded single Bearer credential, verifier default disabled, strict verified claims and expiry; private request-bound credential registry; synthetic verifier requires explicit isolated tests | PASS |
| Identity → organization user | Server-side issuer/subject lookup, active user and organization, no caller role or organization claim authority | PASS |
| User → grants | Current uncached grants, validity dates, active latest role version, current hierarchy and explicit permissions; no implicit administrator role | PASS |
| Resource authorization | Organization filters, ancestry scope, sibling/resource isolation; employee visibility checked across memberships; unauthorized totals filtered before page/count | PASS |
| Authorization → write | Organization revision fence and snapshot/majority transaction; resource revisions and tree revision preconditions; no separate unlocked HTTP check/write | PASS |
| Write → audit → receipt | Same transaction/session, audit failure aborts domain write, receipt unique compound key, original response projection | PASS in isolated real Mongo tests |
| Receipt → response | Current authorization, strict response DTO, envelope and sanitized errors | PASS after fixes below |
| Composition | Router accepts factory-minted security/service instances; copied objects/raw repositories rejected | PASS for accidental composition errors |
| Normal startup | No management router, public bootstrap or superuser bypass; database disabled, inert worker; admin UI placeholder | PASS |

Factories and private WeakSets prevent accidental structural substitution. Trusted server code can still import raw repositories and construct services; this is not a sandbox against malicious application code. The organization integrity service supplies integrity and attribution, not end-user authorization, and must remain behind the protected application service.

## Defects and changes

| Finding | Before | Fix and regression | Result |
| --- | --- | --- | --- |
| F01: incomplete grant replay check | A stored grant command checked security.manage but could return after the actor lost a permission delegated by that grant | Extracted and reused the full grant plan before receipt replay: target, latest role, every delegated permission/scope and validity checks. Memory and Mongo HTTP regressions revoke delegation while retaining security.manage | Fixed |
| F02: incomplete subtree replay check | Unit move replay could retain source/destination authority while losing authority over a descendant | Recheck each current descendant before receipt lookup, preserving the existing 1,000-node bound. Memory/Mongo regressions revoke child authority | Fixed |
| F03: structurally substitutable composition | TypeScript structural types alone did not prove a controller received the protected factories' objects | Factory provenance checks in HTTP/controller/router and authorized audit reads; copied boundaries/service and raw repository rejected in tests | Fixed within stated server trust model |
| F04: receipt evolution/corruption gap | Existing receipts lacked an explicit supported schema/command/response version and response digest | New strict version-1 receipts, binding validation, 16,384-character serialized response bound, SHA-256 digest, existing strict DTO projection; legacy/unsupported/misbound/damaged receipts fail closed | Fixed; legacy reconciliation remains external |

Grant replay deliberately re-evaluates its full original grant plan against current policy. It can therefore deny an originally valid response after role replacement, expiration or target changes. This conservative behavior avoids treating receipts as lasting authorization capabilities.

## Audit persistence

`platform/mongo-security-audit.ts` provides append, explicit initializeIndexes and internal readAuthorized methods. It exposes no model/update/delete operation. Activation requires NODE_ENV=test, isolatedTest=true, an already connected loopback database with the test-name prefix, and a mapped active domain transaction session. No normal-server connection or audit route was added.

Events use the existing strict allowlist; only allowed, organization-attributed domain mutations are accepted. Organization/actor must be active and the referenced user/unit/membership/role/grant must exist in that organization with the correct event type. No tokens, raw requests, passwords or names are persisted. UUID event identity is globally unique; a compound organization/time/event index supports bounded chronological pages. No TTL exists. Internal reads require current organization-level audit.read through a genuine authorization service; unit-level permission is insufficient because the stored event cannot prove historical unit visibility. Limit is 1–100, default 25; cursor contains time and UUID. Same-session reads also use the organization fence.

Malformed, duplicate-ID and cross-organization events are rejected. Actual audit insertion failures roll back user creation and receipt persistence. Model immutability flags and the adapter API prevent accidental application mutation; privileged Mongo users can still change data. Database IAM, append-only credentials/collection validation, privileged access monitoring, legal hold, archival, encryption and key management need corporate approval and operational implementation. Identity rejection/verification and authorization-denial hooks are not made durable by this adapter: unauthenticated events lack an authoritative tenant, and transactional denial records would roll back. An approved separate security-log destination is still needed.

## Receipt lifecycle and recovery

The unique organization/actor/operation/key-hash binding, canonical request fingerprint (including target/body/precondition), same-session write and original projected response are preserved. Reused keys with different requests conflict. Current account, grant, role and resource authority precede replay. Tests cover disabled accounts, expired/revoked grants, inactive role versions and lost delegation/descendant permission. Replay creates no second domain mutation or mutation audit.

All new receipts carry schemaVersion, commandVersion and responseVersion=1 plus responseDigest. Legacy receipts are not defaulted to version 1. Invalid/unsupported receipts return REPLAY_UNAVAILABLE (503) and require reconciliation; an invalid projected response produces a sanitized 500. The digest detects accidental corruption, not a privileged writer who can recompute it. Key hashes are not secrets or authorization credentials. No receipt deletion, TTL or automatic migration was introduced.

Receipt growth is indefinite. Future choices require an approved maximum retry window and ownership: retain full receipts (strongest replay, storage growth); archive response payloads with an online uniqueness tombstone (extra lookup/restore complexity); expire payloads while keeping tombstones and explicit expired-key rejection (cannot replay original response); migrate historical versions with tested deterministic readers (compatibility burden). Deleting the unique record permits key reuse and can duplicate operations that lack independent business uniqueness. Do not select expiry without policy.

Backups/restores must preserve domain state, audit and receipts at the same consistent point, indexes and supported application versions. Restoring only one collection can defeat replay guarantees. The missing-receipt test returns business uniqueness conflict for employee provisioning; it does not prove safety for every operation after an inconsistent restore. Production restore drills and reconciliation tooling remain unimplemented. Never recover a corrupt receipt by silently running the command again.

A replay returns the original successful response, including historical revision; it does not fetch current resource state. Clients should fetch a currently authorized read after replay when they need current state. Current authorization may legitimately deny even the old response.

## Failure and contention evidence

Actual local replica-set tests cover failure before domain work; after domain work before audit; duplicate event during audit insert; failure after real audit insertion; receipt insertion failure; transient error after receipt insertion; lost commit acknowledgement; and committed mutation followed by a destroyed HTTP response. Assertions verify rollback or exactly one committed domain result/audit/receipt. Concurrent duplicate commands and revocation/move races remain covered by prior suites. Driver-label tests inject deterministic failures at real transaction boundaries; they do not simulate infrastructure failover, network partitions or multi-node elections.

The fence serializes security-relevant operations per organization, including protected reads, preventing stale authorization from racing mutations. The small local benchmark completed all 24 requests at concurrency 8 but used 188 transaction callbacks (164 retries); request p50 699.59 ms, p95 1,176.73 ms. This is a WARNING for scaling, not a reason to remove the fence without a correctness-preserving design and representative tests. No distributed locks/cache were introduced. See the implementation report for the complete environment and measurements.

## Verdict

PASS for this bounded isolated foundation after the fixes. WARNING: contention, indefinite receipt growth, privileged database tampering, unsupported historical receipts and incomplete durable security-outcome logging. BLOCKER for production: approved identity integration, directory/offboarding, administrator governance, permissions/privacy policies, audit/receipt lifecycle, production IAM/backups/monitoring, abuse/session protections and independent security review. No claim of exhaustive absence of vulnerabilities is made.
