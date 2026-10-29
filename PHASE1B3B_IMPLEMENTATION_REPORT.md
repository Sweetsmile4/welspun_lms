# Phase 1B.3B implementation report

29 October 2026 · Protected Management API Implementation.

Scope: reusable controllers and application integration, mounted ONLY by explicitly isolated tests. Normal management APIs, production SSO/audit/idempotency activation, real data, frontend management and deployment remain disabled. Phase 0 proposals and open Welspun decisions have not become approved policy.

## 1. Controller architecture

Completed the mandatory audit of all nine named baseline documents and actual source: Express app/controllers, Phase 1B.3A trusted identity/DTO/error helpers, Phase 1B.2 authorization engine and protected methods, scoped repositories, same-session hooks, integrity models/services and the opt-in local MongoDB test runner. Working services and monorepo structure were retained.

Added an identity/management submodule with strict contracts/projections, scope planning, same-session store, command orchestration and reusable router. A small trusted `within` method extends the existing fenced authorization transaction. Existing protected operations are bound to that same transaction for domain authorization, integrity and audit. The Mongo store requires the actual live session; it cannot silently start a separate transaction.

**Reasoning/trade-off:** central composition avoids controller-by-controller authorization gaps or nested transactions. The organization fence provides simple correctness for one initial plant but serializes activity per organization and adds read/write load; no caching or new infrastructure was introduced.

## 2. Implemented API routes and methods

There are 17 route definitions under the isolated test prefix `/api/v1/__test/organizations/:organizationId`:

| Method    | Suffix                                     |
| --------- | ------------------------------------------ |
| GET, POST | /employees                                 |
| GET       | /employees/:resourceId                     |
| GET, POST | /org-units                                 |
| POST      | /org-units/:resourceId/move-preview        |
| POST      | /org-units/:resourceId/moves               |
| POST      | /memberships                               |
| POST      | /memberships/:resourceId/close             |
| POST      | /memberships/:resourceId/transfers         |
| GET       | /employees/:resourceId/current-memberships |
| GET       | /employees/:resourceId/memberships         |
| GET, POST | /roles                                     |
| GET, POST | /role-grants                               |
| POST      | /role-grants/:resourceId/revoke            |

All path/query/body fields are strictly validated. Unknown fields, arbitrary filter/pipeline/sort objects, operator-shaped IDs and client role/organization claims do not confer authority. The router requires explicit isolation/test mode at construction AND request use, plus the existing trusted HTTP provider and guarded app test-mount option. Normal API startup never registers these routes; absence and production rejection are tested. No bootstrap/superuser route exists.

Full payload/header contracts and operation-specific preconditions are in [the management API guide](docs/PHASE1B3B_MANAGEMENT_API_GUIDE.md). They remain synthetic-only implementations, not enabled operational endpoints.

## 3. Authorization and permission mapping

Added the smallest explicit read-action extension: `unit.read`, `role.read`, `grant.read`. Existing roles receive none automatically. Unit/security management actions do not imply read authority.

Employee reads use employee.read; provisioning uses organization user.create. Unit reads use unit.read; creation/move/preview retain unit.manage on parent/source/destination/all descendants. Membership operations retain employee/source/destination checks and history authorization on every returned row. Role creation/revocation require organization security.manage; grants retain bounded delegation/no-self-grant. Role definition reads require organization role.read, since definitions have no authoritative unit ownership. Grant reads require grant.read with proven containment.

Unit-scoped grant readers see only fully contained unit-anchored grant scopes for active employees whose current affiliations all fit. They cannot read organization/own/resource scopes or grants referring to employees in another plant. Exact unit readers cannot read descendant-enabled grant scopes. Organization grant readers can inspect organization-local grant/revocation history. These conservative defaults need Welspun approval.

All evaluations use current database facts, active identity, organization, grant dates/revocation, pinned/latest role versions, authoritative ancestry and existing lifecycle/ownership rules. No frontend claim, request ID, role string or receipt becomes authority.

## 4. Public DTO definitions

Employee and membership summaries reuse public shared schemas. Management-specific strict backend wire schemas define units, role versions, grants, pages, previews and transfers. Every stored record is explicitly projected; no Mongoose document or record spread is returned.

| DTO              | Exposed fields                                                                 |
| ---------------- | ------------------------------------------------------------------------------ |
| Employee         | id, displayName, status, revision                                              |
| Unit             | id, code, name, type, parentId, status, revision, treeRevision                 |
| Membership       | id, userId, orgUnitId, validFrom/to, primary, revision                         |
| Role             | id, code, version, permissions, status, revision                               |
| Grant            | id, userId, roleDefinitionId/version, scope, validFrom/to, revokedAt, revision |
| Page             | items, authorized total, nextCursor; envelope metadata carries the same cursor |
| Preview/transfer | existing bounded move preview or projected closed/successor memberships        |

No external issuer/subject, token, credential, employee linkage metadata, creator/grantor/revoker identity, raw reason or database internals are returned. Dates are UTC ISO values. Stored replays are revalidated against the strict DTO schema and fail closed on invalid data. Existing envelopes/request IDs and safe generic errors remain. Real privacy approval is still required for these fields.

## 5. Scoped query behavior

Employee aggregation reuses the existing authorized current-membership query. Unit scope predicates use active current ancestry and explicit descendant flags. Role definitions match authorized organization; grant queries constrain both the grant's reach and employee affiliations before listing.

Authorization stages precede validated literal-prefix/status/user filters, which precede the count/page facet and public projection. Stable ascending-ID cursors affect page rows but not the authorized filtered total. Limits are 1–100, default 25; regex metacharacters are escaped, arbitrary filters rejected. Clients cannot expand scope by changing cursor, IDs, prefixes or injected operators. Scope is not filtered after pagination.

Hierarchy expansion retains the 1,000-unit fail-closed bound. History arrays preserve the prior conservative semantics: an out-of-scope historical plant causes denial of the whole history request, even when the current-membership lookup is allowed. Historical intervals/records are not rewritten. Multi-page requests each re-evaluate current scope; no snapshot across pages is claimed.

## 6. Audit integration

Existing mutation audit event types are sufficient; none was added. The first execution calls the existing protected application method and transaction-bound audit hook. Replay does not create a second mutation event because no new mutation occurs. Credential verification/denial auditing remains per request.

Audit failure rolls back the domain write and leaves no receipt. Receipt failure after insertion rolls back domain, audit AND receipt together. Both are tested on actual MongoDB using the same ClientSession. The new HTTP integration requires the existing isolated audit adapter; production mutation composition is still rejected. No persistent corporate audit adapter, append-only credentials, retention, legal hold or compliance claim is supplied.

## 7. Concurrency and idempotency design

Strong quoted If-Match is required for tree-dependent creation/moves, membership closure/transfers, role publication and grant revocation. It represents organization tree revision, membership/grant revision or previous role version as appropriate. Missing required headers return 428, invalid headers 422 and stale state 409. New independent records use uniqueness/interval/delegation checks plus idempotency rather than a fabricated revision. Role versions remain immutable and explicitly append-only. Exact duplicate nonrevoked grants with new command keys conflict at this HTTP boundary.

All actual mutation commands require a UUID Idempotency-Key distinct from request IDs. A receipt key binds organization, authoritative actor, stable server operation and SHA-256 key. A SHA-256 fingerprint binds validated stable key-sorted JSON, target path IDs, body and precondition. Receipt storage contains only hashes, binding metadata and the strictly projected bounded result, not raw credentials or provisioning payloads.

The shared organization fence serializes/retries concurrent commands. First execution commits domain change + audit + completed response receipt in one transaction. The unique compound receipt index is a final concurrency constraint. A matching replay returns original data/status with idempotency-replayed:true and the current request ID; changed payload/precondition conflicts. A different actor/org cannot replay the first result. Current authority is checked before receipt access; disabling or revoking access denies even a formerly valid replay. A result is historical command output, not a live resource snapshot.

Implemented a real MongoDB receipt adapter with immutable fields, explicit setup, disabled auto-index/create/buffering and no TTL/delete/update path. Real tests verify concurrent replay, uniqueness/session binding and rollback after audit/receipt writes. This is local transaction evidence, NOT production-safe idempotency approval: retention/retry window, migration/schema evolution, IAM, replication/failover, backup reconciliation and capacity remain unapproved/unverified. No production endpoint/store is activated. Different keys remain different commands; idempotency does not replace business uniqueness.

**Development defect fixed:** a duplicate-grant check compared Date.toISOString() with an equivalent input string lacking milliseconds. A failing ordinary test showed an unwanted second 201. Comparison now uses instants; the repeated command with a new key returns 409, while same-key replay returns the original result. Final ordinary and MongoDB suites pass. No permission was broadened to make tests pass.

## 8. Tests and results

Executed with the existing Node 24/npm 12 toolchain and already installed MongoDB 8.0.4. No dependencies, database service or infrastructure were installed.

| Check                                      | Result                                                                                                                                          |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| TypeScript, lint, formatting               | PASS via npm run check; final document formatting checked separately                                                                            |
| Ordinary unit/API tests                    | PASS: 80 tests (all 67 previous plus 13 new management cases); 65 real-Mongo cases deliberately skipped here                                    |
| Actual isolated local MongoDB              | PASS: 65 tests (all 49 previous plus 16 management cases)                                                                                       |
| All workspace builds                       | PASS: API, web and worker; six frontend placeholder routes retained                                                                             |
| Playwright                                 | PASS: all 6 existing desktop/mobile cases using an owned loopback server on port 4317                                                           |
| Dependency audit                           | PASS: npm audit --audit-level=high reports zero vulnerabilities                                                                                 |
| Built API with outbound sockets blocked    | PASS: liveness/envelopes, disabled database readiness, identity denial and parser error checks; no attempted outbound connection or URI logging |
| Built worker with outbound sockets blocked | PASS: queues disabled, no registered jobs, exit 0                                                                                               |

The normal run does not count skips as passes; actual database suites were executed separately through the existing explicit local runner. It started/stopped only its temporary loopback replica set and generated/dropped only synthetic test databases. Hosted CI, clean reinstall, production HA/durability/recovery and deployment were not executed or claimed. Package dependencies and lockfile are unchanged.

Coverage includes credentials/forged headers, disabled employees, default-deny management, plant/department/cross-organization isolation, forged IDs, unauthorized totals, pagination/filter injection, prefix escaping, history/transfers, optimistic revisions, duplicate roles/grants, no self-grant/escalation, explicit read actions, strict DTOs, absent normal routes, concurrent retries, actor/org binding, revoked/expired authority on replay, missing transaction sessions, real unique indexes and audit/receipt rollback. Earlier Phase 1A/1B suites remain passing.

## 9. Files created/modified

Created:

- apps/api/src/modules/identity/management/contracts.ts — strict input/wire schemas and explicit projections.
- apps/api/src/modules/identity/management/policy.ts — authoritative read scope predicates.
- apps/api/src/modules/identity/management/service.ts — protected application integration, preconditions, fingerprint/replay and duplicate handling.
- apps/api/src/modules/identity/management/router.ts — isolated reusable controllers and HTTP protocol.
- apps/api/src/modules/identity/management/store.ts — same-session page/receipt port.
- apps/api/src/modules/identity/management/mongo-store.ts — real aggregation and receipt persistence/index.
- apps/api/test/management-fixture.ts — reused synthetic HTTP identity and rollback-capable test store.
- apps/api/test/management-scenarios.ts — shared command/security/concurrency scenarios.
- apps/api/test/management.test.ts — ordinary scenarios, fingerprint and isolation gates.
- apps/api/test/management.mongo.test.ts — actual scoped aggregation/receipt/index/history tests.
- docs/PHASE1B3B_MANAGEMENT_API_GUIDE.md — complete route, permission, DTO, transaction and operational contracts.
- PHASE1B3B_IMPLEMENTATION_REPORT.md — this report.

Modified:

- apps/api/src/modules/identity/authorization/types.ts and engine.ts — explicit unit/role/grant read actions and kind allowlist.
- apps/api/src/modules/identity/authorization/service.ts — trusted same-fence transaction composition; original methods retained.
- apps/api/src/modules/identity/http-security.ts — optional validated page cursor propagation in existing success envelope helper.
- package.json — include new opt-in MongoDB test suite; dependencies unchanged.
- README.md and apps/api/src/modules/identity/README.md — phase and module guidance.

Earlier staged/unstaged changes, reports and Phase 0 proposals were preserved. No commit, deployment, production identity, frontend code, original HTML prototype, worker activation or real employee/role seed was introduced.

## 10. Security limitations

Controllers are restricted to isolated tests. No approved production SSO/session/offboarding, real management bootstrap, durable corporate audit, receipt lifecycle, privacy-approved data view or deployment exists. Trusted callbacks/adapters are not sandboxes against malicious server code or raw database writes. All future writers must honor the existing fence/session protocol.

Role/grant read policies, active-only employee/unit visibility, all-affiliation containment and historical access are conservative technical defaults requiring approval. Cursors are opaque IDs rather than signed capabilities and cannot authorize data; page-to-page snapshot stability is not promised. Long histories, hierarchy/grant expansion and organization serialization need measured performance review. Retention/migration/recovery and output evolution for receipts remain necessary before production claims. Nontransactional denial-audit outage limits from Phase 1B.3A remain.

## 11. Remaining Welspun approvals

Approved identity provider/protocol and directory linkage; actual hierarchy/job roles; the new read capabilities and scope semantics; privileged delegation/bootstrap; field-level DTO privacy and historical visibility; production audit/receipt storage, IAM, retention, residency and recovery; idempotency window/preconditions/schema migrations and operational monitoring; independent security review and deployment ownership. Industrial/learning questions remain unchanged and open.

## 12. Readiness for Phase 1B.3C

Phase 1B.3B is implemented and ready for review, with all requested validation passing. It provides reusable test-only management controllers and actual local atomic persistence evidence; this is not production activation or policy approval. Review the report/guide and unresolved decisions before explicit Phase 1B.3C authorization. Phase 1B.3C and Phase 2 have not started.
