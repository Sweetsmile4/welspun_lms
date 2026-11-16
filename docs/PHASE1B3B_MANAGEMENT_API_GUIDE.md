# Phase 1B.3B management API guide

29 October 2026. Reusable protected controllers, mounted ONLY in explicitly isolated tests. No normal-server management route, production SSO, real account, administrator bootstrap or production audit/idempotency enablement is supplied. The Phase 0 baseline and unresolved Welspun decisions remain proposals.

## 1. Controller architecture and audited baseline

Read README.md, PHASE1B1_IMPLEMENTATION_REPORT.md, PHASE1B2_IMPLEMENTATION_REPORT.md, PHASE1B3A_IMPLEMENTATION_REPORT.md, PHASE1B2_AUTHORIZATION_GUIDE.md, PHASE1B3_HTTP_SECURITY_GUIDE.md, API_CONTRACTS.md, DATABASE_SCHEMA.md and OPEN_QUESTIONS.md. Inspected the actual Express app/controllers, trusted HTTP bridge, authorization engine/services, repositories/session hooks, hierarchy/membership service, schemas, local-only adapter and offline/real-Mongo test infrastructure.

Code is in `backend/src/modules/identity/management/`:

- contracts.ts: strict input/output schemas and explicit projections.
- policy.ts: authoritative scope predicates for read operations.
- service.ts: application integration, transaction-bound lists/details and command execution/replay.
- router.ts: reusable controllers, protocol validation, standardized responses and isolation gates.
- store.ts: same-session query/receipt persistence port.
- mongo-store.ts: Mongo aggregation, paginated totals and atomic command receipts.

The Phase 1B.3A identity bridge and protected-controller helper are reused. A small trusted `within` composition method extends the existing authorization service's fenced transaction; it supplies the same transaction, active actor, server time and authorization assertion. Bound existing application methods run against that transaction, not a new nested MongoDB transaction. Domain authorization, integrity and audit are not reimplemented in controllers.

`within` callbacks and persistence adapters are trusted backend code, never HTTP inputs. Controllers call only the management application integration. Neither callbacks nor raw sessions/repositories are exposed to clients. No monorepo restructuring, dependency install, infrastructure provision or new process was needed.

## 2. Implemented routes and methods

Test prefix: `/api/v1/__test/organizations/:organizationId`. Normal `/api/v1` management equivalents are NOT registered. `organizationId` and all path IDs are candidate selectors checked against authoritative records, never trusted tenant/user claims.

| Method and suffix | Operation | Mutation precondition | Result/status |
| --- | --- | --- | --- |
| GET /employees | Scoped active employees | — | Employee page, 200 |
| POST /employees | Provision identity linkage data; never credentials | Idempotency-Key | Employee summary, 201 |
| GET /employees/:resourceId | Employee summary | — | Summary, 200 |
| GET /org-units | Scoped active units | — | Unit page, 200 |
| POST /org-units | Create plant/department | Idempotency-Key and If-Match organization tree revision | Unit, 201 |
| POST /org-units/:resourceId/move-preview | Validate source/destination/subtree without business mutation | If-Match organization tree revision | Existing preview, 200 |
| POST /org-units/:resourceId/moves | Move complete subtree atomically | Idempotency-Key and If-Match organization tree revision | Unit, 200 |
| POST /memberships | Create half-open membership interval | Idempotency-Key | Membership, 201 |
| POST /memberships/:resourceId/close | Close once, preserving history | Idempotency-Key and If-Match membership revision | Closed membership, 200 |
| POST /memberships/:resourceId/transfers | Close source + insert successor atomically | Idempotency-Key and If-Match source membership revision | Closed/successor memberships, 201 |
| GET /employees/:resourceId/current-memberships | Current memberships at server time | — | Membership array, 200 |
| GET /employees/:resourceId/memberships | Complete authorized history | — | Membership array, 200 |
| POST /roles | Append next immutable role version | Idempotency-Key and If-Match previous role version; 0 for first | Role, 201 |
| GET /roles | Organization-scoped definitions and versions | — | Role page, 200 |
| POST /role-grants | Assign pinned role version with bounded authority | Idempotency-Key | Grant, 201 |
| GET /role-grants | Authorized grant records, including revocation markers | — | Grant page, 200 |
| POST /role-grants/:resourceId/revoke | Revoke once with reason | Idempotency-Key and If-Match grant revision | Grant, 200 |

Every route rejects unknown path/query/body fields and operator-shaped IDs. Dates use explicit UTC ISO instants. Read routes accept no body. Preview accepts only parentId and uses If-Match, not a request ID, for concurrency. Headers are not body fields and cannot inject actor/role/organization authority.

List queries allow `limit` (default 25, range 1–100) and an opaque canonical ObjectId cursor. Employee/unit lists additionally permit literal `namePrefix`; roles permit active/inactive `status`; grants permit exact `userId`. No arbitrary filter, sort, projection, pipeline, scope override, organization selector or regex is accepted. Prefix metacharacters are escaped. Cursor comparison uses stable ascending ID order. Its value can move within the authorized set but cannot expand scope. Membership arrays preserve the existing all-history authorization behavior and are not paginated or counted in this phase.

## 3. Authorization and explicit read permissions

The closed action vocabulary adds ONLY `unit.read`, `role.read` and `grant.read`. Existing roles gain no implicit permission, and management authority does not imply read authority.

| Operation | Required action/scope |
| --- | --- |
| Employee page/detail | employee.read; existing own or organizational scopes and all-current-affiliations rule |
| Provision employee | user.create at explicit organization scope |
| Unit page | unit.read at explicit plant/department exact/descendant or organization scope |
| Unit create | unit.manage on destination parent |
| Unit preview/move | unit.manage on source, destination and every affected descendant |
| Membership create | membership.manage on employee and destination unit |
| Close/transfer | membership.manage on authoritative source membership; transfer also destination |
| Current/history reads | membership.read on employee AND every returned membership |
| Role create | security.manage at organization scope |
| Role page | role.read at organization scope; definitions have no authoritative plant/department ownership |
| Grant create | security.manage on proposed scope plus existing service's bounded action/scope/time delegation; never self-grant |
| Grant page | grant.read with explicit organization scope or conservatively covered unit scope |
| Grant revoke | security.manage at organization scope |

Unit read never expands upward or into siblings. Inactive units/ancestors are excluded; root visibility requires organization scope. Role-read unit/resource grants deny because role definitions are organization-owned templates, not unit resources. This avoids inventing a role-to-plant relationship absent from the schema.

Organization grant-read permits organization-local grant history. Unit grant-read permits only unit-anchored grant rows entirely within that reader's exact/descendant coverage AND an active target employee whose ALL current affiliations fit that same reader grant. Exact readers cannot view descendant-enabled grants. Unit readers do not see organization, own-learner or content-resource grant rows: their future reach cannot be proven contained by that unit. Resource-only/own grant-read grants confer no administrative employee visibility. This is a conservative proposal requiring policy review.

Current actor status, organization state, grant validity/revocation and pinned/latest role version are checked without caching. Separate grants can authorize different resources but never bypass global restrictions. No role is seeded and no superuser exception or public bootstrap exists.

## 4. Public DTOs

All output is explicitly constructed and strict-schema validated. Employee and membership schemas reuse packages/contracts. Management-specific DTO schemas live in backend management/contracts.ts for these isolated controllers; no frontend API client is enabled.

| DTO | Fields |
| --- | --- |
| Employee | id, displayName, status, revision |
| Unit | id, code, name, type, parentId, status, revision, treeRevision |
| Membership | id, userId, orgUnitId, validFrom, validTo, primary, revision |
| Role | id, code, version, permissions, status, revision |
| Grant | id, userId, roleDefinitionId, roleVersion, scope, validFrom, validTo, revokedAt, revision |
| Page | items, total, nextCursor; envelope meta.nextCursor also contains the page cursor |
| Move preview | unitId, ancestorIds, expectedTreeRevision, affectedUnitCount |
| Transfer | closed membership and successor membership |

Dates are ISO UTC strings, null for absent interval ends/revocation. Responses omit issuer/subject, employee linkage metadata, tokens, grantor/revoker identity, raw revocation reason, creator/modifier fields and Mongoose internals. Provisioning accepts approved-linkage-shaped data only in synthetic tests; it never creates passwords or login credentials. Public visibility of even these minimal identity/scope fields still requires Welspun privacy approval.

## 5. Scoped queries, counts and history

Employee listing reuses the Phase 1B.2 scoped aggregation: organization isolation, active account, active ancestry and current membership containment come first. Unit listing resolves a bounded authoritative hierarchy and generates allowed-ID predicates before query execution. Grant listing uses authoritative grant scopes, active users and current membership joins before exposing rows. Role definitions are matched to the authorized organization before status filtering.

The Mongo store applies authorization stages FIRST, then validated filters, then a facet with an authorized total and stable cursor/sort/limit branch. Totals reflect the full filtered authorized set and do not shrink merely because a later page is requested. Only authorized rows enter paging and projection. Changing IDs, cursor values or name prefixes cannot inject a top-level OR or remove scope predicates.

Hierarchy expansion fails closed above the existing 1,000-unit bound; repeated active-ancestor checks favor correctness over query cost. There is no authorization cache or new analytics infrastructure. Existing history semantics remain conservative: current employee access does not authorize another plant's historical memberships. If any historical row is outside scope, the entire history request denies; current-membership lookup can still succeed. Raw historical evidence is not rewritten.

## 6. Transaction-bound audit

All privileged operations invoke existing audited application methods inside the same fenced transaction as receipt persistence. Existing event types already cover provisioning, units, memberships, roles and grants; no additional event type was required. A successful first execution appends one mutation event. A replay creates no second mutation event because it performs no new mutation; normal verification/denial auditing still applies per HTTP request.

Audit failure rolls back domain work and leaves no receipt. Receipt failure AFTER insertion rolls back the domain, audit event and receipt together. Real MongoDB tests inject both failures using the SAME ClientSession. In-memory tests are labeled test doubles and independently maintain rollback-capable receipt/audit state; they are not durability evidence.

No production audit adapter, append-only workload privileges, protected archive, retention, legal hold, monitoring or recovery policy is implemented. Capability labels and interfaces cannot prove these guarantees. The existing HTTP audit factory and management router reject production composition; no claim or environment switch can enable a production endpoint in this phase.

## 7. Optimistic concurrency and idempotency

`If-Match` must be a strong quoted nonnegative safe integer, for example `"5"`. Missing required headers return 428 PRECONDITION_REQUIRED, malformed or inappropriate preconditions return 422, and stale tree/membership/role/grant state returns 409 CONFLICT. New provisioning, membership and grant records have no existing row revision; uniqueness, interval validation, delegation and idempotency guard their creation. New units depend on the organization tree and therefore require its current tree revision. The role header represents the previously published role VERSION, not the immutable row's revision counter.

Every actual mutation requires an independently generated UUID `Idempotency-Key`. `x-request-id` is correlation only and never substitutes for that key. Operation identities are closed server-owned names, such as employee.provision and membership.transfer; path IDs and normalized body/precondition values are included in the fingerprint.

Command identity: `(organizationId, authoritative actorId, operation, SHA-256(key))`. Fingerprint: SHA-256 over stable recursively key-sorted validated JSON containing operation, organization, target path ID, body and precondition. No raw credential, request ID or private input body is stored in the receipt. Reusing a key for the same actor/organization/operation with changed authorized input returns 409 IDEMPOTENCY_CONFLICT. The same key used by another actor/organization cannot read the first receipt. Domain duplicates remain conflicts; they are not another actor's replay.

Receipt flow, entirely inside the existing organization fence:

1. Resolve the current trusted actor and current command action/resource authorization.
2. Read the bound receipt. If fingerprint matches, revalidate its strictly projected stored DTO and return it; otherwise conflict.
3. For a first execution, validate current optimistic preconditions and domain duplicate constraints.
4. Execute the existing protected service and its transactional audit hook in the SAME session.
5. Validate/project the result and insert its receipt before committing the transaction.

Concurrent identical retries serialize/retry on the organization fence and return one committed result/event/receipt. The compound unique index is the final receipt-key uniqueness boundary. There is no externally visible pending record: only completed transaction results are persisted. Failed/denied commands leave no receipt. Exact nonrevoked duplicate grants (same user/definition/scope/interval) with a new key conflict rather than creating another equivalent HTTP grant; legitimate different/overlapping grants retain existing policy behavior. Equivalent ISO timestamps in this duplicate comparison are compared as instants.

Replay returns the original public data/status with `idempotency-replayed:true`, a fresh request envelope/request ID and no new domain/audit mutation. First execution sets the header false. The replay is an ORIGINAL command result, not a current resource snapshot or an authorization capability. Current disabled/revoked/expired authority can deny replay even when a receipt exists. A closed source membership can replay an already successful transfer if current basic scope authority remains; no transfer is repeated. Current policy still applies to any later independent operation.

Receipt Mongo schema: organization/actor ObjectIds, operation, keyHash, fingerprint, immutable projected data and createdAt; unique index `(organizationId, actorId, operation, keyHash)`. Auto-create/indexing/buffering are disabled; setup is explicit in the opt-in suite. No update/delete/TTL path is provided. Results are bounded to 16 KB before storage. Receipt/session operations fail closed if no live domain transaction is bound. The same-session query port uses the existing repository hook; no transaction is silently opened by the store.

The local MongoDB receipt store and atomic persistence HAVE been implemented and tested. This is not a claim of production-safe idempotency: production management/audit storage remains disabled, and receipt retention, schema migrations, fingerprint/version migration, approved key reuse window, output schema evolution, replication/failover, restore/reconciliation and capacity/monitoring remain unresolved. Do not expire receipts without an approved retry window and surviving domain uniqueness. Different keys are different commands; idempotency does not replace business uniqueness.

## 8. Errors, testing and commands

Existing success/error envelopes, request IDs and generic security errors remain. Invalid/missing credentials return 401; authorization or concealed protected targets 403; unknown routes 404; conflicts 409; malformed validated fields 422; protocol preconditions 428; failed required audit 503. Unexpected receipt-store failure produces generic 500 and transaction rollback; corrupted stored DTO replay fails closed with generic 500. No stack, credential, private input or driver diagnostic is returned.

Ordinary tests exercise command controllers using a rollback-capable test repository. The real opt-in suite runs the same commands plus actual employee/unit/role/grant aggregates, counts, pagination, prefix/filter attacks, inactive ancestry, history isolation, real uniqueness indexes and missing-session denial. Concurrent retries, actor/org binding, replay after revocation, audit and receipt failure rollback, strict DTOs, stale revisions, duplicate roles/grants, self-grants and escalation are covered. All prior tests remain included.

```powershell
npm run check
$env:START_LOCAL_MONGO_FOR_TESTS='true'
$env:MONGOD_BINARY='C:\Program Files\MongoDB\Server\8.0\bin\mongod.exe'
npm run test:mongo:local
$env:PLAYWRIGHT_PORT='4317'
npm run test:e2e
npm audit --audit-level=high
```

Use the already installed local binary. The runner starts/stops only its own temporary loopback replica set; each suite creates/drops only its generated synthetic database. No real employee, role or infrastructure is seeded. Ordinary API/worker startup remains disconnected; ordinary tests skip opt-in database suites. Hosted CI is not provisioned with MongoDB by this phase. Exact executed results appear in PHASE1B3B_IMPLEMENTATION_REPORT.md.

## 9. Files and module boundaries

New management sources are listed in section 1. Tests are management-fixture.ts, management-scenarios.ts, management.test.ts and management.mongo.test.ts. Existing authorization types/engine add the three read actions, service adds same-session trusted composition, the HTTP helper optionally propagates page cursor metadata, and package.json includes the new opt-in suite. No previous domain workflow was replaced. No frontend, original prototype, infrastructure or dependency implementation changed.

## 10. Security limitations

All controllers remain test-only. There is no production SSO/session/offboarding, persistent corporate audit, deployment, real identity administrator or root bootstrap. Internal callbacks/stores are trusted code; bypassing them with raw database writes can break invariants. Denial audit outage limitations from Phase 1B.3A remain. Canonical cursor IDs are not signed and do not provide snapshot isolation across multiple HTTP pages; each page rechecks current authority. Large histories/hierarchies and repeated grant/ancestor lookups need later measured tuning.

Role/grant read semantics and active-only employee/unit visibility are deliberately conservative. Receipt replay is not a current-state response, and field-level data minimization still requires privacy approval. Approved production idempotency and audit lifecycle, CSRF/session strategy, IAM, security monitoring and operational recovery remain prerequisites, not guarantees implied by passing local tests.

## 11. Remaining Welspun approvals

Approved identity provider/protocol and directory provenance; actual hierarchy/job roles/delegation; the three new read actions and conservative role/grant visibility; bootstrap and privileged-change governance; public DTO privacy and historical access; production audit/receipt storage, retention/residency/IAM and recovery; idempotency/precondition policy and capacity; independent security review and deployment approval. Industrial/learning specifications remain open and untouched.

## 12. Readiness for Phase 1B.3C

This phase provides reviewable test-only protected management components and real local transaction evidence. It authorizes neither production activation nor further development phases. Review the implementation report and unresolved decisions before explicitly authorizing Phase 1B.3C. Phase 2 has not started.
