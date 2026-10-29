# Phase 2A implementation report

29 October 2026. Completed: internal backend course draft foundation. Ready for review; stop before Phase 2B. Production authentication/administration remain disabled. All Phase 0 policies and unresolved corporate decisions remain proposals.

## Audit and design confirmation

Read README, the Phase 1B.3C implementation/security/readiness/Phase 2 entry documents and the requested Phase 0 requirements, schema, architecture, RBAC, API, open questions, roadmap and prototype audit. Inspected actual Mongoose repositories, authorization engine/services/resolvers, organization transaction fence, audit adapter, versioned receipt validator/store, synthetic fixtures, local Mongo runner and module boundaries. Preserved existing guards and regressions. Wrote [the course domain design](docs/PHASE2A_COURSE_DOMAIN_DESIGN.md) before application code.

Implementation defaults resolve only development mechanics: one current bounded draft per stable course, optional configured unit scope, explicit authoring permissions, safe structured text, aggregate revisions and small idempotent acknowledgements. They are not Welspun authoring, engineering or publication policies. The supplied HTML remains reference material; no content or scores were imported.

## Models and indexes

| Model/collection             | Fields and invariants                                                                                                                                                                                         | Explicit indexes                                            |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Course / courses             | Stable ObjectId; immutable organization, canonical uppercase code, owner, optional plant/department scope, creator/time                                                                                       | Unique (organizationId, code)                               |
| ContentDraft / contentDrafts | Stable draft ID, organization/course references, title/description, bounded language/tags/audience metadata, draft/archived lifecycle, revision, created/updated actor/time, embedded ordered modules/lessons | Unique (organizationId, courseId); (organizationId, status) |

Models disable automatic collection/index creation and buffering, use strict schemas and no versionKey, and reuse strict runtime validation on document validation. Repositories parse records on reads/writes, require the active mapped authorization session and perform organization/course/revision/lifecycle compare-and-set updates. No TTL or destructive migration was introduced. Existing receipts and security audit indexes remain unchanged.

Modules and lessons have stable ObjectIds, explicit parent course/module IDs, title/description, contiguous position and local revision. Lessons support text or structured paragraph/heading/list payloads only. Their embedding prevents orphaned lesson documents and supports atomic reorder/removal. Bounds: 20 modules, 20 lessons per module, 100 lessons total, 256 KiB UTF-8 serialized draft. Titles ≤200 characters, descriptions ≤2,000, text lessons ≤8,000; structured fragments ≤2,000, ≤20 blocks/list items. Strict schemas reject unknown properties, scripts/angle-bracket markup, disallowed controls, arbitrary Mongo operators, duplicate IDs, forged parent links and ordering gaps. Empty descriptions are supported consistently in runtime and Mongoose validation.

Trade-off: aggregate rewriting and organization fencing constrain concurrency but simplify atomicity for a sole developer. No unbounded arrays/media are stored. Mutable draft revision counters are not historical snapshots or immutable releases; publication and historical version storage remain future work. Course scope/owner reassignment, draft branching and archive restoration are intentionally absent.

## Application service and permissions

`createCourseDraftService` exposes `retrieve` and an explicit discriminated `execute` command interface. It is restricted at construction and each call to NODE_ENV=test, isolatedTest=true, a synthetic-test provider and isolated-test transactional audit. No HTTP controller or normal-server registration exists. See [the service guide](docs/PHASE2A_COURSE_SERVICE_GUIDE.md) for composition, fields and internal errors.

| Operation                                                     | Permission                                                                                |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Create draft                                                  | course.draft.create at organization for null scope, or at the configured plant/department |
| Retrieve revision/structure/content                           | course.draft.read on stored course                                                        |
| Update metadata; add/update/remove/reorder modules or lessons | course.draft.edit on stored course                                                        |
| Archive                                                       | course.draft.archive on stored course                                                     |

The four actions extend the existing closed vocabulary without automatic administrator privileges. Own scope authorizes only the recorded author's read/edit/archive; explicit unit/subtree, organization or course-resource grants can authorize collaborators. Own grants cannot create a new resource. Null scope uses the actual organization root, so department/plant authority cannot expand upward. All unit/ancestor statuses, current grants, role versions and actor/org status are rechecked through the existing authorization service. Audience metadata validates same-organization active unit references but grants no access. No corporate role definitions/hierarchy or real employees were created.

## Revision, ordering and archival semantics

Create returns aggregate revision 0. Every successful later mutation requires expectedRevision and increments the aggregate once; missing preconditions fail validation, stale edits conflict. The repository repeats the revision/lifecycle predicate. A valid no-op replacement/permutation is still a mutation and advances revision. Local module revisions advance for metadata/child edits or changed position; lesson revisions advance for content/metadata or changed position. These local counters do not replace the aggregate concurrency precondition.

New siblings append. Reorder is an exact permutation of all current sibling IDs, not arbitrary positions. Duplicates, omissions, extras and cross-parent IDs fail. Removal compacts positions and removes embedded children atomically. Course/draft IDs and surviving child IDs remain stable. Archive preserves the whole draft and identity; authorized reads remain available, edits are denied, a new archive command conflicts, and the original archive acknowledgement can replay with current archive permission. No restore/hard-delete is implemented.

## Transaction, audit and idempotency integration

Each call uses existing trusted identity resolution and the organization write fence in the same snapshot/majority transaction. Mutations authorize before receipt lookup, validate lifecycle/revision and parent relationships, write domain state, append audit and persist the receipt atomically. No check-then-write outside the transaction, nested transaction, public bootstrap or superuser bypass was added.

Audit adds only course.draft.created/changed/archived. Target is the stable authoritative course; the existing local audit adapter accepts a trusted same-session catalog lookup to confirm its organization. It denies course events without this resolver. No content, names, tokens or raw requests are logged. Application append-only behavior is not database-level immutability; production audit policies/IAM remain unresolved.

New operation `course.draft.command.v1` uses schema/command/response version 1. No previous command contract/version was repurposed. Receipts bind actor/organization/operation/key hash, with canonical fingerprint covering command kind/body, course and expected revision. Correlation requestId is excluded, permitting a new request ID on retry. Stored acknowledgement is strictly `{courseId,draftId,revision}`; execute adds replayed. It stays bounded and avoids making historical full-draft content an implicit read capability. Fetch current draft separately with read authority. Replays do not repeat domain changes/audit, and current permissions precede every replay. Lost edit permission or archived lifecycle can deny an old edit response. Corrupt/unsupported receipts or invalid response shapes fail closed; differing payload/key reuse conflicts. No TTL, cleanup, arbitrary retry window or receipt migration was added.

## Tests and executed results

Shared memory and real Mongo service scenarios cover creation/attribution, original acknowledgement replay and conflicting key reuse; metadata/module/lesson CRUD; stable IDs and contiguous ordering; duplicate/missing/foreign order and parent IDs; own versus other author; no security-admin bypass; explicit resource grant; organization/plant/sibling isolation; audience non-authority; revoked grants/disabled actors on replay; stale concurrent edits; concurrent duplicate retries; archive reads/replay/restrictions; rollback after real audit and receipt insertion; failed-edit rollback; corrupt receipt digest/version/shape; malformed content; unit-restricted creation; copied output mutation and production isolation guards. Offline model tests add aggregate byte/count/relationship bounds, strict model validation and no database connection. Real Mongo adds explicit unique/non-TTL indexes and required mapped session checks.

| Executed check                               | Result                                                                                                                            |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Initial targeted course service tests        | PASS: 11 before the additional hardening scenarios                                                                                |
| Final `npm run check`                        | PASS: all workspace/tool TypeScript, lint, formatting, 102 ordinary tests, API/web/worker builds and worker smoke                 |
| Final explicit local Mongo run               | PASS: 91 tests across 6 files; 14.73 seconds; includes 15 new course tests and preserves prior transaction suites                 |
| Playwright on freshly built local web server | PASS: 6 desktop/mobile placeholder regressions                                                                                    |
| `npm audit --audit-level=high`               | PASS: 0 vulnerabilities                                                                                                           |
| Built API with outbound guard                | PASS: liveness/envelopes/readiness disabled/default identity denial/415 handling; no attempted outbound connection or URI logging |
| Built worker with outbound guard             | PASS: queues disabled, no registered jobs, exits 0                                                                                |

The final ordinary run intentionally skipped 92 Mongo/performance tests; 91 were executed separately through the opt-in local Mongo runner. The 1 optional Phase 1B.3C performance benchmark remained skipped: this phase did not rerun capacity measurements or change the fence design. No course UI/browser journey exists; existing Playwright checks only the unchanged shell. Local Mongo uses the already installed 8.0.4 binary, a temporary owned loopback replica set and disposable synthetic databases; runner processes stopped normally. No corporate connection was used.

Initial implementation checks exposed schema-hook TypeScript union typing and lint issues (control-character regex, module variable name and unused test type). These were corrected without loosening rules, and checks reran successfully. No final failing check remains. Browser FORCE_COLOR/NO_COLOR warnings are cosmetic. No package install, clean reinstall, remote CI run, production test, multi-node failover, backup restore or independent penetration test was performed in this phase. Those are not claimed as verified. Final documentation formatting/whitespace checks are separate from the application checks.

## Files created/modified

Created:

- `apps/api/src/modules/catalog/drafts/contracts.ts`: strict internal records, commands, content and aggregate invariants.
- `apps/api/src/modules/catalog/drafts/models.ts`: Course/ContentDraft Mongoose models and indexes.
- `apps/api/src/modules/catalog/drafts/repository.ts`: internal transaction-bound store port.
- `apps/api/src/modules/catalog/drafts/mongo-store.ts`: same-session scoped persistence and CAS.
- `apps/api/src/modules/catalog/drafts/service.ts`: protected internal authoring, resolver, atomic audit/receipts.
- `apps/api/test/course-fixture.ts`, `course-scenarios.ts`, `course.test.ts`, `course-models.test.ts`, `course.mongo.test.ts`.
- This report, `docs/PHASE2A_COURSE_DOMAIN_DESIGN.md`, `docs/PHASE2A_COURSE_SERVICE_GUIDE.md`.

Modified only as needed for this phase:

- `identity/authorization/types.ts` and `engine.ts`: four course actions, own-scope action support, course lifecycle authorization.
- `platform/security-audit.ts` and `mongo-security-audit.ts`: three course audit types and scoped course target port.
- `identity/management/receipts.ts`: new namespaced receipt operation, existing versions preserved.
- `test/security-local-fixture.ts`: expose its existing session mapping for catalog test composition.
- `package.json`: include course Mongo suite in explicit opt-in command.
- `README.md` and `catalog/README.md`: current foundation/module status and guide links.

Paths above are under `apps/api/src/modules/` unless explicitly qualified. No dependency/lockfile, frontend, worker, server route, monorepo structure, prototype or corporate configuration change was made. Existing staged/uncommitted work was preserved; nothing was committed or staged.

## Security limitations and unresolved approvals

Production blockers remain as recorded in PRODUCTION_READINESS_CHECKLIST.md: approved SSO/directory/offboarding, administrator governance, corporate permissions/privacy, audit/receipt retention/reconciliation, production database IAM/encryption/backup/restore, monitoring/session/abuse controls and independent review. Raw internal stores and trusted composition callbacks are not a sandbox for malicious server code. Database administrators can bypass application immutability; backups must preserve course/draft/audit/receipt state consistently. Fence contention and indefinite receipt growth remain known risks.

Plain text validation does not establish technical accuracy. No approved thresholds, technical policy payload, SME decision or certification rule exists. Future text rendering must escape content; upload/media support requires separate review. No draft listing/catalog, historical snapshot reader, published release, approval, enrolment or learning progress is implied by these services.

Welspun confirmation remains needed for actual author/collaborator permissions and cross-plant sharing, ownership transfer and audience policy, taxonomy/languages, content-size expectations, draft history/archival/restore/retention, independent reviewers/publishers and controlled technical content/rights. Size limits and one-current-draft behavior are reviewable development defaults.

## Phase 2B readiness

The internal draft foundation is ready for review and can support a separately authorized next increment. Before Phase 2B, agree exact-revision/hash review transitions, reviewer capacities and independence, immutable lesson/course snapshot contracts, release correction/withdrawal behavior, new permissions/audit types/receipt versions and their concurrency/rollback acceptance tests. Corporate production approval remains separate. No Phase 2B, publishing, frontend, assessment, simulation or deployment work was started. STOP after Phase 2A.
