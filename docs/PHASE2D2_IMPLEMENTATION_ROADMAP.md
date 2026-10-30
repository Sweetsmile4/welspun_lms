# Phase 2D.2 implementation roadmap

30 October 2026. Proposed independently reviewed increments. These labels are planning labels, not authorization to begin. Phase 2D.2A changes documentation only. Keep /development fixtures independent and preserve all test wrappers, review authorization and disposable tests.

## 2D.2B: Disabled integration contracts and transport boundary

- Scope: add public DTO schemas/serializers and a disabled integration configuration/session/transport port with safe default errors. No login, session issuer, enabled course route, domain-factory widening or DB activation. Specify narrow route allowlists and error/precondition/key mapping.
- Expected files: packages/contracts/src integration schemas/tests; proposed apps/api/src/integration/config.ts and identity/session interfaces; proposed apps/web/src/lib/integration client interface; offline API/unit tests; guide updates. Filenames are proposed, not existing files.
- Security: missing/production/mixed configuration denied; no fixture principal/role inputs; no browser secrets; exact server target/origin configuration; all enabled capability requests unavailable.
- Dependencies: review this architecture and agree intended same-origin transport. Identity provider decision can remain open because every adapter stays disabled.
- Tests: strict DTO unknown-field rejection, ISO/ObjectId projections, private-field omission, headers/envelopes, body budget, no-network-on-import, default disabled and production/test-fixture bypass denial.
- Acceptance: all existing suites pass; new contracts work offline; no runtime network change, cookie issuance, database connection or reachable business handler.
- Stop: review contract/security diff before any functional login or private service composition. Any attempt to bypass a test guard is out of scope.

## 2D.2C: Disposable-local integration storage and explicit setup

- Scope: a separate owned local integration target adapter, migration/index manifest, session/login/security-outcome models and operator bootstrap plan. Reuse existing domain schemas/sessionFor mapping; do not touch Atlas or existing local-test adapter. Setup creates only fictional development data under separately authorized execution.
- Expected files: proposed apps/api/src/integration/database.ts, schema/setup/session-store modules, explicit scripts/setup-integration-local.mjs, migration manifest, targeted disposable-Mongo tests. Keep scripts/test-mongo-local.mjs unchanged.
- Security: exact owned loopback target marker and database allowlist, explicit setup intent, no automatic seed/index/write on import/start, setup credentials separated conceptually from runtime, no public bootstrap endpoint, honest audit durability labels.
- Dependencies: reviewed B contracts; explicit authorization for local integration setup/data; approved fictional organization and scoped principal/grant manifest. Identity issuer bindings may remain placeholders in offline fixtures until approved, with no functional login.
- Tests: target guard, concurrent connection reuse/failure cleanup, resumable additive setup, exact unique/partial indexes, duplicate/index drift refusal, same-session audit/receipt rollback, session explicit expiry and no corporate/foreign target cleanup.
- Acceptance: synthetic local initialization and disposal demonstrable; ordinary startup still disconnected; no shared credentials/infrastructure; no public course APIs.
- Stop: inspect setup privileges and schema manifest before connecting any non-disposable target. Do not generalize test cleanup to Atlas.

## 2D.2D: Approved development identity, sessions and same-origin transport

- Scope: implement only the supervisor-approved development identity option, session establish/read/logout/revoke and fixed Next gateway to private Express. No course CRUD yet. Use loopback HTTPS for browser session tests and separate authenticated user/workload boundaries.
- Expected files: new identity/session verifier and callback modules, proposed apps/api/src/integration/app.ts and local-server.ts, Next integration session/gateway route handlers, session/CSRF tests and browser security spec; environment examples without credentials.
- Security: OIDC code/state/nonce/PKCE if selected, stable issuer/subject mapping, no auto-grant/linking, hashed random session tokens, Secure HttpOnly host cookie, explicit expiries, origin/CSRF, revoke ordering, gateway authentication, no browser impersonation or synthetic-test fallback.
- Dependencies: B/C plus supervisor approval of provider/tenant/client, distinct test people/principals, callback/origin, session lifetimes/revocation behavior and workload transport. No decision means no session issuer implementation; remain disabled.
- Tests: login/callback replay, invalid issuer/audience/signature, session fixation/rotation, CSRF/origin, forged role headers, cookie flags, expiry/logout/revocation/multi-process behavior, no secrets in bundles/logs/cache, missing workload credential, provider outage.
- Acceptance: independently authenticated approved development principals see only safe /session data; revoked/unknown/disabled principals denied; no course endpoint enabled; fixture pages unaffected.
- Stop: security review of session/transport evidence before any domain factory or write is exposed. No production SSO/production deployment.

## 2D.2E: Guarded application composition and durable evidence

- Scope: extract private domain implementation while retaining existing guarded test exports; add separately gated integration factory using trusted context and real development session/audit/receipt adapters. No change to course/review/publish permissions/state machine. No browser course mutation yet.
- Expected files: narrow refactor under catalog/drafts, publishing, discovery; new integration composition and audit adapters; session check in authorized transaction unit of work; test additions beside existing services.
- Security: per-call context verification, current session after org fence, active actor/grants/reviewer rechecks, same connection/session for audit/domain/receipts, no forged provider/durability modes, no production factory. Default foundation entry unchanged.
- Dependencies: approved D boundary, C storage, explicit review of guard-preserving extraction plan and honest durable outcome log failure policy.
- Tests: unchanged old production/isolation guard denials; differential old/new domain scenarios on local Mongo; auth revoke races, receipt replay current-authority checks, audit outage rollback, contributor independence, same-revision byte drift and concurrent publish.
- Acceptance: all existing invariants proven through the new internal composition on disposable local data; no caller can construct a trusted context from browser input; normal app exposes none of it.
- Stop: review before mounting even read-only course routes. Any invariant drift blocks closure.

## 2D.2F: Authenticated reads and public safe DTOs

- Scope: bounded authorized course draft list/details, narrow reviewer-candidate projection where permitted, review/readiness/history and catalog read HTTP contracts. Add new scoped authoring list service; do not substitute learner catalog or reuse broad management directory.
- Expected files: integration-only course routers/controllers, explicit public serializers/contracts, scoped list projection/service, Next API client/read-only integration pages and unit/API/browser tests.
- Security: authenticate first; server-side action/scope enforcement before counts/pages; safe no-store serialization; independent learner and reviewer data visibility; no directory exposure or fixture fallback.
- Dependencies: B/E; approved DTO disclosure and fictional development grants. Reviewer candidate eligibility must follow current policy and server checks, not a role dropdown.
- Tests: org/plant/sibling/own/resource grants, revoked/disabled users, private feedback omission, cursor/filter bounds, forged IDs, 401/403/503 and cache behavior, real HTTP session path.
- Acceptance: read-only browser data comes from authorized persisted synthetic local records; /development remains memory-only and /catalog remains placeholder unless separately scoped.
- Stop: no writes until read disclosure/security review passes.

## 2D.2G: Persistent draft commands

- Scope: enable only create/edit/module/lesson/reorder/archive commands through the reviewed transport. Introduce API-backed builder on separate integration pages, not fixture mutation handlers.
- Expected files: integration draft router/controller, HTTP precondition/key adapter, web integration data adapter/forms, contract and local HTTP/browser tests.
- Security: exact revision and immutable scope/ownership, attribution from trusted session, endpoint-specific payload bounds, CSRF/origin, stable idempotency key, no optimistic success before commit; current authorization before replay.
- Dependencies: F and explicit approval to enable draft writes on disposable local integration data.
- Tests: complete create/save/reload persistence; stale If-Match/missing precondition, double submit, changed key payload, lost response, unknown commit, rollback and disabled/revoked session; modules/lessons ordering and bounds.
- Acceptance: persisted drafts survive process/browser restart in owned local environment; one command causes one domain/audit/receipt result; no review/publish mutation endpoint yet.
- Stop: review persistence/concurrency/retry evidence before review/publication integration.

## 2D.2H: Review, immutable publication and catalog end-to-end

- Scope: add submit/assign/decide/supersede/readiness/publish and release history/catalog wiring, using unchanged current domain policy/invariants. No withdrawal/correction feature or approval bypass.
- Expected files: integration review/publishing controllers/DTO adapters, API-backed review/history/catalog pages; shared UI primitives where reusable; disposable multi-session Playwright and API tests.
- Security: distinct approved principals, contributor/author/submitter exclusion, explicit configured demonstration policy, current reviewer qualification at publication/replay, exact complete digest/revisions/source number, atomic audit/evidence/receipt.
- Dependencies: G plus approved development policy key/count and principal duties; real corporate policy remains a separate approval. Full flow requires multiple legitimate development sessions, not a browser perspective selector.
- Tests: Create -> Save Mongo -> Submit -> Assign -> Approve -> Publish -> Catalog, restart persistence, incomplete/rejected/changes/stale/revoked denial, concurrent duplicate publish, older history immutable, draft edits/archive preserving published content, rollback/lost-response retries and catalog private-field exclusion.
- Acceptance: one persisted latest catalog entry per course from the same immutable release records; historical evidence preserved; old fixture and employee regressions still pass. Clearly label all content as development demonstration.
- Stop: local integration review and security sign-off; no shared Atlas/production/deployment enablement implied.

## Shared-cluster decision update

Supervisor approved the existing shared Atlas cluster and already-existing welspun_lms_dev database. Future backend integration must consume exact MONGOURI and DATABASE_NAME keys; DATABASE_NAME is validated as the literal welspun_lms_dev and used explicitly as driver dbName. Disabled preparation is complete without an enabled adapter. The infrastructure decision does not start Phase 2D.2C/I, approve credentials/roles/migrations or authorize a connection during this task. Preserve the local adapter and all normal startup/fixture behavior.

## 2D.2I: Separately authorized Atlas readiness and limited connection

- Scope: after owner approval, implement the separate exact-target Atlas adapter, runtime/setup privilege split, resumable setup and non-destructive isolated verification. Start with target/credential/permissions/readiness proof, then an explicitly approved synthetic dataset. Do not bundle this into browser UI work.
- Expected files: new backend-only integration Atlas adapter/config consuming MONGOURI and DATABASE_NAME, schema manifest/setup command, safe failure/health checks, DB permission validation and operational runbooks. Existing disposable-local tests remain unchanged.
- Security: DATABASE_NAME=welspun_lms_dev only, MONGOURI backend-only with no alias; approved host/TLS/network/runtime identity; no destructive shared cleanup; no cross-application reads; no setup privileges in runtime; credentials delivered via approved secret channel outside chat.
- Dependencies: infrastructure choice approved; separately authorize connection/setup/dataset and confirm cluster-owner access, exact cluster/tier, custom roles, capacity/egress, backup/restore/retention and cleanup owner. H should first pass locally; connection checks cannot retroactively approve missing identity controls.
- Tests: offline target rejection first; separately authorized target-specific TLS/transaction/index/readiness and cross-DB denial tests; connection failure redaction, pool limits, recovery; no corporate data loaded.
- Acceptance: documented owner-approved least-privilege connection and index evidence for only the dedicated development database. Not a production readiness verdict.
- Stop: any target/role/schema/backup mismatch or scope broader than approval. No dropDatabase, restore over cluster or test-runner cleanup.

## Deferred deployment gate

Only after a separate task choose Amplify compatibility/alternative, conventional Lambda event adapter versus other hosting, CodeBuild or Jenkins, runtime secret/network/ingress, package manifests, alarms and rollback. Expected new deployment config is intentionally absent. Package/cold/warm/session/timeout tests precede any sandbox deployment approval. Private worker stays disabled until a real approved background job exists. Enrollment/progress/assessment/certification/simulations are outside every increment above.

## Sequencing and effort

Recommended order is B -> C -> D -> E -> F -> G -> H, with I separately authorized after local proof and infrastructure approvals. Offline B can proceed without a chosen IdP; functional D cannot. Do not compress all boundaries into one full-stack commit.

Rough solo-developer planning allowance: B 2-3 days, C 3-5, D 5-10, E 4-7, F 3-5, G 4-7, H 5-8, I 3-5 after approvals: 29-50 developer days total, excluding approval waits, remediation and deployment. This is an estimate for scope negotiation, not a delivery commitment. Measure and re-estimate after session/identity proof; new security requirements may change it.
