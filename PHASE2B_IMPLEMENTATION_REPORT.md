# Phase 2B implementation report

29 October 2026. Completed isolated backend review, approval and immutable course release foundation. Ready for review; production remains disabled. Phase 2C/2D and production integration were not started. Synthetic workflow approval is not Welspun technical approval or a production release authorization.

## Audit and design

Read README, Phase 2A report/design/service guide, Phase 2 entry criteria, Phase 0 requirements/schema/RBAC/API/open questions/prototype audit, and the Phase 1B.3C security review. Inspected actual draft models/stores/services, authoritative resolvers, current grants/role engine, organization fence, transactional audit, versioned receipts and ordinary/real Mongo fixtures. Preserved existing disconnected startup and test-only boundaries. Created [the review/publishing design](docs/PHASE2B_REVIEW_PUBLISHING_DESIGN.md) before implementation.

The audit identified that Phase 2A creator/latest-updater fields cannot establish every contributor for reviewer independence. New drafts now initialize an internal editedBy ledger, and edits accumulate distinct actors (bounded 100). Legacy absence remains unknown and blocks review; edits do not fabricate completeness. No historical records were migrated, and no old receipt contract was repurposed. Existing Phase 2A command input/acknowledgement is unchanged; contributor provenance is an additive internal field.

## Models and indexes

Three new models reuse the same connection/session without automatic indexes or startup activation:

| Model / collection                     | Records                                                                                                                                                                                       | Indexes                                                                                                       |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| CourseReview / reviewRequests          | Immutable exact submission snapshot, organization/course/draft/revision/digest/algorithm, policy and submission attribution; mutable status/reviewers/evidence IDs/review revision projection | Unique organization/course/draft/revision; scoped course/ID history                                           |
| CourseReviewEvidence / reviewDecisions | Append-only assignments, approve/changesRequested/reject decisions and supersession attribution, exact binding, feedback and timestamp                                                        | Partial unique organization/review/actor for decisions; scoped review/ID history                              |
| CourseRelease / courseReleases         | Immutable numbered full content/approval snapshot, source/digest/schema, organization/scope, publisher/time and published lifecycle                                                           | Unique organization/course/number; unique organization/course/source draft/revision; scoped course/ID history |

Typed strict runtime schemas validate records before writes and after reads; Mongoose stores typed indexed bindings with validated payloads. The internal store exposes append/read methods for evidence/releases and no update/delete port. Immutable payloads and common model mutation/replace/delete/save guards prevent accidental application overwrite. Raw database operations/privileged administrators remain outside that guarantee. No TTL or cleanup policy exists.

Trade-off: bounded embedded course/module/lesson snapshots and approval evidence duplicate data but make historical releases self-contained. Separate lesson-release reuse, a current-release catalog pointer and release withdrawal/supersession are intentionally absent. Snapshot sizes inherit Phase 2A content limits; history is bounded rather than unbounded discovery.

## State transitions, service and permissions

The workflow stays separate from draft/archived lifecycle:

| Transition / operation                     | Preconditions and permission                                                                                                                                              |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Draft ready → submitted                    | Valid nonarchived current draft; complete contributor provenance; at least one module and a lesson in every module; exact revision/digest; course.review.submit           |
| submitted → inReview / add assignment      | Qualified independent active reviewer; available configured slot; exact draft/review preconditions; course.review.assign                                                  |
| inReview → approved                        | Every configured distinct assigned reviewer approves; each has current course.review.decide and no previous decision                                                      |
| inReview → changesRequested / rejected     | Assigned independent reviewer, bounded feedback, current decide grant and exact preconditions; terminal for this submission                                               |
| Stale nonpublished submission → superseded | Current draft differs, expected revisions and old digest match; course.review.submit; prior decisions preserved                                                           |
| approved → published                       | Exact current content, complete current qualified independent approvals, matching configured policy, expected previous release number and explicit course.release.publish |
| Authorized review/release reads/history    | course.review.read / course.release.read, authoritative course scope; allowed after archive                                                                               |

`createPublishingService` exposes execute, retrieveReview, history, validatePublishReadiness and retrieveRelease. Execute uses explicit submit/assign/decide/supersede/publish actions. No generic workflow patch, approval replacement, reviewer removal/reopening or public HTTP controller was added. Readiness checks without reserving anything; publish rechecks in its own fenced transaction.

Six explicit actions extend the closed vocabulary. Security administration alone grants none. Current stored course owner/scope, grants/latest role versions, active actor/org/unit ancestry and explicit reviewer assignment determine authority. Own scope supports submit/read, not reviewer/publisher powers. Plant/department/resource and organization scopes follow existing rules; audience metadata never grants access. Histories authorize the course before querying and return bounded cursor pages (default 20, max 50), without unauthorized totals.

Author, submitter and every known contributor cannot be assigned or decide. Reviewer qualification is a synthetic current scoped decide grant plus explicit assignment, checked at assignment, decision and publication. Revocation, replaced role versions and disabled reviewers deny publication/replay. Publisher must have explicit permission and cannot bypass approval. This development policy permits an author to publish only with separately granted publish authority and independent approvals; whether publisher/author overlap is acceptable corporately remains open.

Policy is explicitly injected as a version label and requiredApprovals, with implementation bound 1–5 and no default. Tests exercise counts 1 and 2; neither is selected as Welspun policy. Submission captures policy; publication requires the same current configuration. Real SME capacities, approval count and qualifications remain approval dependencies.

## Exact revision, digest and release integrity

catalog-snapshot-v1 strictly parses Course + Draft, serializes Dates as UTC ISO strings before recursively sorted key canonicalization, preserves ordered arrays and hashes with SHA-256. It includes all IDs, organization/scope/owner, source revision/lifecycle, metadata, module/lesson parents/order/content/local revisions, timestamps and contributor attribution. Tests prove deterministic key ordering and sensitivity to dates, arrays, revision and content. A hash is not a digital signature or protection against privileged database writers.

New decisions/publication require both exact current revision and exact digest. Approval N cannot publish N+1; same-revision changed bytes also fail. Submission retains the reviewed snapshot, and stale review supersession appends evidence without rewriting approval. One submission per draft revision avoids competing approvals; changes/rejection requires editing and a new submission.

Release snapshots embed all course/module/lesson content and required approval facts/IDs. Source IDs/revisions/digest and policy bindings are verified by the release schema; current qualifications and assignment evidence are verified by the service. Later draft changes leave published bytes unchanged. Subsequent correction requires a new revision/review/release. Organization fence plus expected previous number, unique number/source indexes and review CAS prevent duplicate or conflicting publication. No withdrawal, emergency publish, automatic supersession or certificate invalidation exists. See [the integrity guide](docs/PHASE2B_RELEASE_INTEGRITY_GUIDE.md).

## Atomic audit and receipts

All mutation work uses the existing trusted identity and organization write fence, same snapshot/majority transaction and session. Domain writes, review projection, append-only evidence/release, audit and receipt commit or roll back together. No check-then-write outside the transaction or nested transaction was added.

Audit adds only course.review.submitted/assigned/decided/superseded and course.release.published. Targets are review/release IDs, validated through authoritative same-session catalog callbacks. Wrong type or organization fails. Security audit excludes content and feedback. New receipt namespaces course.review.command.v1 and course.release.publish.v1 use schema/command/response version 1, preserving Phase 2A versions. Canonical command fingerprints include action/body and preconditions; organization/actor/operation/key hash binding remains. Request ID is correlation only.

Strict small acknowledgements contain course/review IDs, original review revision and nullable release ID/number, plus replayed. Current action authority, assignment and qualifications precede receipt lookup; publish replay also requires currently qualified independent approvers/matching configured policy. A later draft edit does not erase a valid original release acknowledgement. New publication always rechecks current bytes. Changed payload/key conflicts, corrupt/unsupported receipts and malformed acknowledgement shapes fail closed. Fetch current content separately. There is no receipt TTL/deletion or invented retention period.

Lost delivery is tested by discarding a committed internal response and retrying with the same key/new correlation ID: one release and audit, original acknowledgement. No new HTTP route was introduced; prior actual HTTP response-loss regressions remain in the foundation suite. This is not a new network-failure/failover implementation.

## Executed validation

| Check                                           | Result                                                                                                                         |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Targeted initial publishing + draft service run | PASS: 26 tests before additional integrity/security cases                                                                      |
| Final npm run check                             | PASS: workspace/tool TypeScript, lint, formatting, 122 ordinary tests, API/web/worker builds and inert-worker smoke            |
| Final explicit local MongoDB run                | PASS: 111 tests across 7 passing files, 1 optional benchmark skipped; 26.59 seconds                                            |
| Existing Playwright regressions                 | PASS: 6 desktop/mobile placeholder tests on freshly built local web server                                                     |
| npm audit --audit-level=high                    | PASS: 0 vulnerabilities                                                                                                        |
| Disconnected built API with outbound guard      | PASS: liveness, envelopes, readiness disabled, default identity denial, content-type handling, no outbound attempt/URI logging |
| Disconnected built worker with outbound guard   | PASS: queues disabled, no jobs, exits 0                                                                                        |

Ordinary run: 14 files passed, 8 opt-in files skipped; 122 passed and 112 skipped tests. Separately executed Mongo run: 7 files passed, 1 optional benchmark skipped; 111 passed and 1 skipped. The Phase 1B.3C performance benchmark was not rerun or used as a capacity claim. Phase 2B adds 18 shared memory/Mongo scenarios, 2 offline digest/policy tests and 2 Mongo-specific index/immutability/target tests. All prior regressions remain.

New cases cover exact submission/assignment/approval, feedback terminal states, author/contributor/unassigned denial, missing qualification/approval/publish grant, configurable multi-reviewer policy, stale revision/digest and same-revision byte drift, editing after approval, preserved supersession evidence, concurrent decisions/publications, duplicate key/source prevention, monotonic later releases, discarded-result retry, immutable content after later edits, revoked grants/inactive latest role/disabled reviewer or publisher, receipt version/response-shape corruption, organization/plant/sibling history/read isolation, audit/receipt rollback and strict/production guards. Mongo tests exercise actual transactions/indexes and reject cross-organization/wrong-type audit targets and common immutable model mutations.

Initial full check failed only on new unused imports/destructured variables; these were removed without weakening lint and complete checks reran successfully. A patch context mismatch during test addition made no change; the corrected patch and final runs succeeded. No final failing check remains. Browser FORCE_COLOR/NO_COLOR warnings are cosmetic. Documentation formatting/whitespace is checked separately after final report creation.

Local tests used the existing MongoDB 8.0.4 binary on an owned temporary loopback replica set with disposable synthetic databases; runner stopped its processes. No corporate service, production record or reviewer was used. No package/infrastructure installation, clean reinstall, remote CI, production security test, multi-node election/failover, restore drill or independent penetration test was executed. Those are limitations, not implied passes. The normal API bundle remains disconnected and does not mount these internal domain modules as business endpoints.

## Files created or modified

Created:

- `backend/src/modules/catalog/publishing/contracts.ts`
- `backend/src/modules/catalog/publishing/repository.ts`
- `backend/src/modules/catalog/publishing/mongo-store.ts`
- `backend/src/modules/catalog/publishing/service.ts`
- `backend/test/publishing-fixture.ts`
- `backend/test/publishing-scenarios.ts`
- `backend/test/publishing.test.ts`
- `backend/test/publishing-integrity.test.ts`
- `backend/test/publishing.mongo.test.ts`
- This report and `docs/PHASE2B_REVIEW_PUBLISHING_DESIGN.md`, `docs/PHASE2B_REVIEW_SERVICE_GUIDE.md`, `docs/PHASE2B_RELEASE_INTEGRITY_GUIDE.md`.

Modified for this phase:

- `backend/src/modules/catalog/drafts/contracts.ts`, `models.ts`, `mongo-store.ts`, `service.ts`: additive contributor provenance, preserving unknown legacy state.
- `backend/src/modules/identity/authorization/types.ts`, `engine.ts`: six explicit actions, own-read/submit and archived historical read support.
- `backend/src/modules/identity/management/receipts.ts`: new receipt namespaces, no previous version repurposed.
- `backend/src/platform/security-audit.ts`, `mongo-security-audit.ts`: narrow event vocabulary and authoritative review/release target ports.
- `backend/test/course-fixture.ts`: rollback-capable review/evidence/release memory state on the same test transaction.
- `package.json`: opt-in publishing Mongo suite.
- `README.md`, `backend/src/modules/catalog/README.md`: current module status and links.

No dependencies or lockfile changed: existing Mongoose/Zod/TypeScript/Vitest tooling suffices. No monorepo restructure, frontend/server route, worker activation, prototype change, production connection or deployment. Prior staged/uncommitted work was preserved; no staging/commit performed.

## Risks, corporate decisions and readiness

This is an application integrity boundary, not database-level immutability, SME qualification certification or a sandbox against malicious trusted server code. Privileged writers can modify raw collections and recompute hashes; production IAM, validators, protected audit/archives, monitoring and independent security review remain needed. Consistent backups must preserve draft provenance, reviews/projections/evidence, releases, audit and receipts together. No restore/reconciliation tooling or policy was invented. Organization-fence contention and indefinite receipt/evidence growth remain known limitations.

Welspun must approve real reviewer capacities/count/qualifications, role/scope ownership, author/editor/publisher independence, assignment replacement and review appeals, controlled-source technical approval and content rights, release correction/withdrawal behavior, legacy provenance reconciliation, privacy/retention/legal hold and production operational controls. Existing SSO/directory/admin-bootstrap and infrastructure blockers remain unchanged. Development-policy configuration is not approval of those policies.

Ready to close Phase 2B for review as an isolated backend increment. Before any Phase 2C, obtain a separate task and agree its scoped read/catalog/learning contracts and acceptance criteria; this phase does not authorize them. Production APIs, real data, publishing UI, public discovery, enrollment, progress, assessment, certification, simulations, storage/jobs and deployment remain excluded. STOP after Phase 2B.
