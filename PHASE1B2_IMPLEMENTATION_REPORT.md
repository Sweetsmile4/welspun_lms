# Phase 1B.2 implementation report

Date: 2026-10-28. Scope: backend RBAC and scoped authorization foundation only. Phase 0 documents remain proposals, not approved Welspun policies. Phase 1B.3 has not started.

## 1. Architecture and security design

The mandatory baseline and source audit is documented in [the authorization guide](docs/PHASE1B2_AUTHORIZATION_GUIDE.md). It confirmed that Phase 1A identity is disabled by default, the development principal has no database authority, Phase 1B.1 provides integrity services rather than authentication/authorization, and MongoDB transactions already serialize organization changes. Existing hierarchy, membership, adapter and startup behavior was preserved.

Added a backend-only authorization submodule inside the existing identity domain. No microservice, new package, public DTO, endpoint, UI or infrastructure was needed. It uses the same Mongoose connection/session as organization persistence. Authorization resolves trusted issuer/subject to an active organization-scoped user, defaults to denial, verifies explicit permission and authoritative resource scope, and applies lifecycle/ownership/separation-of-duties rules before combining grants. The synthetic provider is supplied only by isolated tests; production authentication remains absent.

Trade-off: deliberately conservative authorization and synchronous transaction fences prioritize correctness over throughput and administrative convenience. Future policy owners must approve the choices called out below before production use.

## 2. Models and indexes

`roleDefinitions`: organization ID, immutable stable uppercase code, immutable positive version, explicit typed unique permissions, active/inactive status, timestamps, attribution and revision. Unique compound index `(organizationId, code, version desc)` supports latest-version lookup and prevents duplicate publication. Status changes are new versions rather than edits to published authority.

`roleGrants`: organization/user, definition ID/version, strict own/organization/unit/resource scope, explicit descendant flag, effective/expiry interval, grantor, immutable grant fields, revision, full revocation time/actor/reason and timestamps. Actor-evaluation index `(organizationId, userId, revokedAt, validFrom, validTo)` and role-reference index `(organizationId, roleDefinitionId, roleVersion)`. No TTL index deletes history. No default administrator privileges or real data are seeded.

Schemas retain strict throw, disabled buffering, disabled automatic collection/index creation and timestamps. Index initialization is opt-in setup. Foreign-reference integrity and scope coverage are validated by the application service; MongoDB does not supply foreign keys. Direct persistence methods are not authorization APIs.

## 3. Role and permission definitions

There are no seeded corporate roles or job mappings. `Action` is a closed TypeScript/Zod vocabulary: organization.manage, unit.manage, user.create, membership.read/manage, employee.read, progress.read, assignment.read, report.read, audit.read, content.approve/publish and security.manage. Unknown actions deny and each action has an explicit target-kind allowlist. Own scope permits only the selected learner read actions. No wildcard or superuser action exists.

Role grants pin both definition and version. Publishing any newer version invalidates older grants for that role code. Inactive latest versions confer no authority. Regranting is explicit. This prevents silent privilege upgrades but increases administration work.

## 4. Authorization evaluation flow

1. Validate organization identifier and configured identity mode; resolve credentials using a trusted server-owned provider.
2. Resolve exact issuer/subject to an active user in an active organization.
3. Acquire the shared organization revision write fence in the transaction.
4. Resolve resource facts from scoped repositories or a trusted future resource resolver; reject nonexistent, forged or cross-organization IDs and inactive unit ancestry.
5. Enforce action target kind, lifecycle, ownership and global separation-of-duties rules.
6. Load uncached current grants, check half-open dates/revocation, active pinned role and latest role version, explicit action and scope coverage.
7. Execute protected domain work or constrained query consumption in that same session; preserve existing integrity checks and attribution from verified user ID.

Denials use generic `AuthorizationError` with FORBIDDEN code, without revealing resource existence. No HTTP endpoints were added; existing envelopes remain unchanged. Future transport mapping must be implemented before endpoints are enabled.

## 5. Resource-scoping implementation

Own learner, department/plant exact or descendant, organization and explicit course/revision resource scopes are supported. Unit ancestry is authoritative and current; scopes never expand upward or sideways. Root units are not a substitute for explicit organization scope. Multiple grants can authorize different targets but cannot override global rules or combine partial affiliations for a multi-plant employee.

Protected wrappers cover Phase 1B.1 provisioning, unit creation/move/preview, membership create/close/transfer and history/current reads. Moves check all affected descendants and destination. History checks every returned membership so current employee access does not leak other plants' history. Organization creation/bootstrap stays internal and unavailable through an authorized runtime bypass. Provisioning and grant revocation are conservatively organization-scoped.

Query plans support employee/progress/assignment/report/audit views, BSON IDs, organization constraints, current memberships, active ownership/unit ancestry and normalized lifecycle guards. Filters apply before counts/facets/pagination. Future view adapters and DTO projections remain required; no reporting/learning modules were implemented. Exact resource inheritance across course revisions and historical/as-of scope are deliberately deferred.

## 6. Separation-of-duties enforcement

Authors/owners/editors cannot approve their own revisions. Publication requires approved lifecycle, distinct sufficient approvers, matching immutable revision digest, and excludes author/editor approvals. Multiple organization/resource roles cannot override those rules. The future authoritative resolver must verify authentic approval evidence and approved policy versions; current fixtures do not constitute a completed content workflow.

Security administrators cannot self-grant. Delegation requires current security authority AND every delegated action with covering scope, descendant flag and effective/expiry window. Creating/changing a role confers no grant. Revocation requires attribution/reason and optimistic revision, so racing edits cannot silently overwrite each other. Real technical criteria, approval counts and certification rules remain unapproved and unimplemented.

## 7. Database and transaction behavior

The existing Mongo repository gains an internal session-composition hook and exported record decoder; organization service integrity behavior is retained. The authorization repository extends the SAME transaction, avoiding nested transactions or check-then-mutate races. Snapshot/majority primary transactions and the shared organization write fence serialize compliant hierarchy, role/grant and protected operations. Driver retries re-evaluate identity and policy. No cache is introduced.

Reads now write the organization fence: correctness and simplicity cost throughput. Query expansion is bounded to 1,000 units and fails closed beyond that bound. Ancestor checks perform additional database reads. All future user-disable, resource ownership/lifecycle/approval and policy writers must follow the same fence/session protocol; out-of-band database edits are unsupported. No disable-management workflow is added in this phase.

Startup remains disconnected. No real database, employee account, Redis connection, job, S3 resource, deployment or prototype modification was introduced. The local opt-in test runner still starts/stops only its own temporary replica set and drops only each suite's generated synthetic database. CI remains offline for MongoDB; provisioned test infrastructure is not silently added.

## 8. Tests executed and results

Executed on Windows with the existing Node 24/npm 12 toolchain and already installed MongoDB 8.0.4. Earlier development runs passed 31 and then 37 real MongoDB tests. Development failures identified a lowercase synthetic role-code fixture, a test-double ObjectId serialization assertion and an accidentally nested test registration. These test-harness defects were corrected and affected checks rerun. Formatting checks were rerun after iterative edits. No application behavior was weakened to make tests pass.

| Check                                            | Final result                                                                                                                                 |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| TypeScript, lint, formatting                     | PASS — npm run check                                                                                                                         |
| Unit/API and existing offline organization tests | PASS — 55 ordinary tests; opt-in MongoDB suites skipped in the ordinary run                                                                  |
| Explicit real local MongoDB replica-set tests    | PASS — 40 tests (12 existing organization, 28 authorization) via npm run test:mongo:local                                                    |
| API, web and worker builds                       | PASS — all workspace builds                                                                                                                  |
| Playwright desktop/mobile regressions            | PASS — 6 tests on isolated loopback port 4317                                                                                                |
| Dependency audit                                 | PASS — npm audit --audit-level=high: zero vulnerabilities                                                                                    |
| Disconnected built API and worker                | PASS — outbound connection blocker enabled; health/envelopes/readiness, identity 401, invalid charset 415; worker queues disabled and exit 0 |

`npm run check` includes type checking, lint, formatting, ordinary tests, all builds and the built-worker smoke. The final opt-in MongoDB run collected all 40 tests and stopped its own temporary processes. The default suite's skipped MongoDB tests are not counted as passing; their separate real execution is reported above. Playwright used its own built Next server and left the existing development server on port 3000 untouched. No package reinstall was needed because dependencies and lockfile are unchanged; clean-install/production infrastructure validation was not repeated or claimed in this phase. CI wiring remains intact but no hosted CI execution is claimed.

Coverage includes own/other learner, exact/descendant department, sibling/parent denial, plant isolation, explicit resource IDs, forged actor claims/IDs, cross-organization references, account disabling, current hierarchy moves and stale revisions, future/expired/revoked grants, multiple roles, inactive/replaced versions, self-approval/publication restrictions, delegation scope/window limits, self-escalation denial, concurrent role publication/revocation, membership-history isolation, query counts/pagination and real aggregation execution. Test-only future query records are fixtures, not business implementations.

## 9. Files created/modified

Created:

- apps/api/src/modules/identity/authorization/types.ts — actions, input schemas, internal records/ports/errors.
- apps/api/src/modules/identity/authorization/models.ts — two strict Mongoose schemas/indexes.
- apps/api/src/modules/identity/authorization/mongo-repository.ts — typed session-bound persistence.
- apps/api/src/modules/identity/authorization/engine.ts — resource/scoping/global policy/query constraints.
- apps/api/src/modules/identity/authorization/service.ts — trusted identity boundary and protected application methods.
- apps/api/test/authorization-memory.ts — isolated transactional test double.
- apps/api/test/authorization-scenarios.ts — shared offline/real-Mongo denial and concurrency cases.
- apps/api/test/authorization.test.ts — offline authorization suite.
- apps/api/test/authorization.mongo.test.ts — opt-in actual MongoDB policy, aggregation/index and race tests.
- docs/PHASE1B2_AUTHORIZATION_GUIDE.md — API usage, contracts, session protocol, limitations and examples.
- PHASE1B2_IMPLEMENTATION_REPORT.md — this report.

Modified:

- apps/api/src/modules/identity/organization/mongo-repository.ts — minimal same-session composition extension.
- package.json — include authorization suite in opt-in test:mongo command.
- apps/api/src/modules/identity/README.md and README.md — document current phase and boundaries.

No dependencies installed or upgraded, no lockfile change required, no environment variables/secrets added, no original prototypes changed. Existing staged/unstaged work was preserved; no commit or deployment was made.

## 10. Security limitations

Not production-ready authentication or deployment. The trusted identity provider port has no approved SSO implementation. Resource/approval adapters, persistent decision/change audit, production database credentials and real administrative controls are absent. Internal repositories, resolver and query callbacks are trusted server code; they are not safe APIs for request-supplied code. A standalone check is not a reusable authorization capability. Future controllers must validate inputs, map errors into approved envelopes and use protected methods, never raw services.

Future domain schemas need authoritative query views, field-level DTO projection, approval evidence integrity and additional lifecycle policies. Current all-affiliations semantics and history restrictions are conservative. No load-test claim, external pen-test claim, corporate approval claim or automatic production MongoDB support is made. ESLint 9 compatibility warning from the prior foundation remains a toolchain maintenance issue, not expanded here.

## 11. Unresolved Welspun decisions

- Approved SSO issuer/provider, credential/session validation, user linkage, offboarding and session revocation.
- Official organization/plant/department configuration, job-to-role mappings and permission ownership.
- Audited initial organization/security-authority bootstrap and privileged delegation/change approvals.
- Acceptance of role-version invalidation, all-current-affiliations scope, unit grant movement and historical access semantics.
- Technical approver independence, authoritative revision/policy digest evidence and SME-approved industrial criteria.
- Employee data classifications, field-level visibility, reporting/export/as-of rules, durable audit retention and security monitoring.
- Production database credentials/backup/recovery and performance/availability requirements for the organization fence.
- Phase 1B.3 scope and approval; no inferred authorization to continue.

## 12. Readiness for Phase 1B.3

Phase 1B.2 is implemented and ready for review, with the validation above passing. It provides a tested backend foundation without enabling real accounts or business endpoints. Welspun decisions above remain external dependencies for production use; this is not production approval. Phase 1B.3 is not started and requires explicit review/authorization.
