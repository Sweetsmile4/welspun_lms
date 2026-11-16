# Phase 1B.2 authorization API

Implementation guidance, not approved Welspun policy. Backend only; no new HTTP routes, personnel, bootstrap privileges or production identity provider are enabled.

## Mandatory audit and retained boundaries

The implementation audited README.md, PHASE1A_FINAL_REVIEW.md, PHASE1B1_IMPLEMENTATION_REPORT.md and docs/RBAC_PERMISSION_MATRIX.md, DATABASE_SCHEMA.md, SYSTEM_ARCHITECTURE.md, API_CONTRACTS.md, OPEN_QUESTIONS.md and PHASE1B1_DATA_FOUNDATION.md against actual sources.

The Phase 1A `identity/provider.ts` supplies a disabled identity by default, or a fixed isolated development principal without database authority. It is deliberately not wired into authorization. The Phase 1B.1 organization service validates hierarchy, scoped identifiers, membership intervals and optimistic revisions inside repository transactions. Its `ActorContext` is attribution, not authentication. Those integrity checks remain in place.

`createMongoAdapter` still requires explicit, isolated, local connection consent. Neither API nor worker initializes authorization models, connects, creates indexes, seeds roles, grants authority or starts jobs. The adapter remains limited to local development/test databases. No production MongoDB connector is delivered.

## Composition and identity trust

Sources are under `backend/src/modules/identity/authorization/`. Construct a repository with `createMongoAuthorizationRepository(connection)` and a service with `createAuthorizationService(repository, provider, options)`. Construction alone does not connect. `initializeIndexes()` is an explicit connected-database setup operation, exercised only by opt-in tests in this phase.

`AuthorizationIdentityProvider` is a server-owned dependency, never a request body:

```ts
interface AuthorizationIdentityProvider {
  mode: 'disabled' | 'approved-sso' | 'synthetic-test';
  authenticate(credential: unknown): Promise<{
    issuer: string;
    subject: string;
    synthetic: boolean;
  } | null>;
}
```

Default future composition must provide a disabled implementation until SSO is approved. A future approved adapter must verify signature, issuer, audience, session/token expiry and revocation using the approved identity system, then return opaque issuer/subject values. Never implement this port by copying claims from a caller object. There is no SSO implementation here. Application inputs containing actorId, permissions, roles or unit IDs do not establish identity.

Each service operation resolves issuer/subject against the requested organization's authoritative user row and checks active user and organization status. Synthetic authorization providers require BOTH `NODE_ENV=test` and explicit `isolatedTest: true`, checked at construction and again on every operation/retry. Only test files supply a synthetic implementation; their opaque credentials are matched by a private fixture map. The existing `/me` development principal cannot authorize these services. A provider labeled approved-sso returning a synthetic identity is denied.

The provider, resource resolver and repository are trusted composition-root code. TypeScript interfaces are not a sandbox against malicious server code. Do not let HTTP callers select adapters or pass resolver functions.

## Supported application methods

All methods below take a provider credential, not `ActorContext`. Organization IDs are explicit and checked against verified identity and repository reads.

| Method | Required action and scope |
| --- | --- |
| `createUser(credential, input)` | `user.create` at organization scope; narrower provisioning awaits policy |
| `createUnit(credential, input)` | `unit.manage` on destination parent |
| `moveUnit`, `validateUnitMove` | `unit.manage` on source, destination and every affected descendant; existing expectedTreeRevision rules preserved |
| `createMembership` | `membership.manage` on employee and destination unit |
| `closeMembership` | `membership.manage` on authoritative membership; existing closure/revision rules preserved |
| `transferMembership` | `membership.manage` on source membership and destination unit; existing atomic transfer preserved |
| `membershipHistory`, `currentMemberships` | `membership.read` on employee and EACH returned membership; out-of-scope history denies the operation |
| `defineRole(credential, organizationId, input)` | organization `security.manage`; append exactly next role version |
| `grantRole(credential, organizationId, input)` | scope-covering `security.manage` plus every delegated permission, scope and validity window; never self-grant |
| `revokeGrant(credential, organizationId, id, expectedRevision, reason)` | organization `security.manage`; revision CAS and complete revocation attribution |
| `check(credential, organizationId, action, target)` | current decision only; returns `{allowed:true}` or throws generic `AuthorizationError` |
| `query(credential, organizationId, domain, consume)` | current scoped query inside the protected transaction |

There is deliberately no authorized createOrganization/bootstrap method and no HTTP mapping. Initial organization/root/security authority requires a separately approved, audited bootstrap process; no superuser exception is present. Raw integrity services and repositories remain internal infrastructure, not future controller dependencies.

Do not use `check()` followed by a separate mutation. Its decision expires when its transaction completes. Use the concrete protected methods. New domain operations must follow the service's `run` pattern: trusted identity, organization write fence, authoritative resources, policy checks, domain work in the SAME session. Do not perform external network calls, notifications or other irreversible work in retryable transactions.

## Actions, roles and scopes

Typed actions: `organization.manage`, `unit.manage`, `user.create`, `membership.read`, `membership.manage`, `employee.read`, `progress.read`, `assignment.read`, `report.read`, `audit.read`, `content.approve`, `content.publish`, `security.manage`.

These are implementation permission names, not approved job descriptions. No role names, role-to-job mappings or default grants are seeded. Creating a role alone authorizes nobody. An organization grant covers only the role's explicit actions. Actions have target-kind allowlists; employee.read cannot be repurposed to read an arbitrary revision or organizational unit.

Scopes are strict discriminated values:

```ts
{ kind: 'own' }
{ kind: 'organization' }
{ kind: 'unit', unitId, includeDescendants: false /* or explicit true */ }
{ kind: 'resource', resourceType: 'course' /* or revision */, resourceId }
```

Own is limited to membership/employee/progress/assignment READ actions and requires authoritative ownership. Unit grants apply to active plants/departments and optionally their current descendants; never parents, siblings or other plants. Root-unit grants are not treated as organization grants. Exact resource grants match type and ID; a course grant does not implicitly authorize every revision. Revision-to-course inheritance awaits an explicit future policy and resolver contract.

All current affiliations of an employee must fit ONE matching grant; multiple grants can authorize different targets but cannot assemble partial affiliations to bypass this conservative restriction. Organization grants or own-reader grants may still cover the employee. This rule and movement of a department-scoped grant with its unit identity require Welspun review. Current hierarchy and half-open current memberships are reevaluated on every call; historical membership rows are scoped using their recorded unit in the current tree. Inactive units or ancestors fail closed.

Role definitions are append-only versions: uppercase stable code unique per organization/version, immutable actions/status/version. A new version, including an inactive version, invalidates all older-version grants for that code. Reactivation requires another version and explicit new grants. This favors safe invalidation over automatic privilege upgrades, at the cost of administrative regrant work.

Grants pin a definition ID AND version. Effective intervals are `[validFrom, validTo)`; null expiry is unbounded only when the grantor has matching unbounded authority. Scheduled grants are supported but ineffective before start. Revoked/expired/future grants and inactive/replaced role versions confer no authority. Delegation cannot exceed the grantor's currently valid security authority or delegated actions, geographic/resource coverage, descendant coverage or validity interval. Organization-scoped delegation/revocation is deliberately conservative. There is no assumed technical approval permission for security administrators.

## Authoritative resource and approval policy ports

Organization/unit/user/membership facts are resolved from transaction-bound repositories; callers supply only target IDs. Course/revision targets require a server-owned `ResourceResolver`; absent, mismatched, cross-organization or nonexistent facts deny. No real course or approval workflow exists.

The future resolver must load immutable revision identity, authoritative organizational scope, owner, ALL editors, lifecycle and verified approval evidence in the same session. It must validate the current immutable content digest, approval policy version, approver identities and authentic approvals; it cannot accept these fields from a browser. Fixture resolvers test policy behavior only. Optional metadata here is not a replacement for that future workflow.

Approval requires a review-state revision and an actor who is neither owner nor any editor. Publication requires approved state, a positive approval count, enough distinct approvers, a matching nonempty approved/current revision digest, and no owner/editor among approvers. Global rules run before grant union. Additional roles cannot override self-approval. Required counts and industrial criteria are not defined here and remain subject to Welspun/SME approval. Other operations accept active state only. Unknown actions/kinds and archived resources deny.

## Query constraints and session use

`query()` supports employees, progress, assignments, departmentReports, plantReports and audit. It generates MongoDB `PipelineStage[]` with BSON ObjectIds, organization restriction, current membership lookup where relevant, scope alternatives and lifecycle guards. Tests execute real aggregations, counts and facets. These are reusable constraints and test views, not implemented learning/reporting modules.

The trusted consumer must execute stages FIRST in the same transaction/session. Append validated business filters with further `$match`, then projection/count/group/facet/sort/skip/limit. Never replace the stages, combine client filters with a top-level `$or`, permit arbitrary client aggregation stages, or re-use/return plans as durable capabilities. Restrict joins/unions to separately authorized resources. Counts, exports and drilldowns require the same constraints. Project only an approved public DTO; authorization does not imply permission to return every stored identity field.

Query view conventions, requiring adapters in future modules:

| Domain | Required authoritative view fields |
| --- | --- |
| employees | `_id` employee ID, organizationId, active status; joins current memberships |
| progress, assignments | organizationId, userId, `authorizationState: active`; joins active owner and current memberships |
| departmentReports, plantReports, audit | organizationId, orgUnitId, `authorizationState: active`; audit resource grants also require resourceType/resourceId |

`authorizationState` is a normalized policy-view field, not a proposed learning completion enum or an actual report schema. Future modules must map their real lifecycle to this view and implement additional global restrictions before enabling endpoints. Historical/as-of reporting, organization-wide records lacking a unit and revision/course inheritance are intentionally not inferred. Current query adapters require canonical unit references; rows missing required fields fail closed.

The repository's optional composition hook exposes the current session to trusted module adapters via a WeakMap keyed by transaction. Integration tests use it to bind aggregations to the same session. Future adapters should offer purpose-specific, read-only query methods; never expose sessions or raw transaction objects through HTTP. The consume callback is trusted backend code, not request input. Missing domain grants throw before it runs.

## Concurrency, bounds and performance

No authorization cache. Every protected operation, including reads, writes the shared organization revision fence before reading policy/resource facts. Existing organizational writes already take that fence; role/grant writes use it too. Snapshot/majority primary transactions retry write conflicts and re-resolve identity/policy. Revision checks protect grant revocation, role publication and existing hierarchy/membership updates. A protected operation may complete before a racing revocation; after the revocation commits, new protected transactions deny. Decisions are valid at their transaction's authorization time, not forever or retroactively.

All future user-disable, role/grant, hierarchy, membership, ownership, lifecycle and approval writers MUST participate in the same fence/session protocol. Out-of-band database writes are unsupported and can break serialization. Database credentials must prevent arbitrary application callers from writing collections. No user-disable admin workflow is delivered; integration fixtures disable synthetic accounts under the fence and verify denial.

The fence serializes activity per organization and adds write load to reads. Ancestor validation and grant evaluation perform uncached reads. Query expansion fails closed above 1,000 units, matching the existing bounded hierarchy approach. This is deliberately simple and conservative for the initial plant; load testing and any partitioned fence/query optimization require a later reviewed design. Do not introduce caching without explicit invalidation and concurrency tests.

## Errors, audit and future transport

Authorization denies with generic `AuthorizationError` (`FORBIDDEN`) without revealing whether a protected record exists. Zod rejects malformed role/grant input. Persistence duplicate errors retain the existing sanitized organization error convention. No HTTP handlers were added, so existing API envelopes are unchanged. Future controllers must map authentication failures to 401, authorization denials to the approved 403 envelope and validation/conflict errors to appropriate existing envelopes without echoing sensitive facts.

Created/updated attribution, revision, grantor and complete revocation reason/time/actor are persisted. They are not an append-only corporate audit trail. Durable access-decision/change audit, retention, external approval and bootstrap governance remain future work. Logs must not include credentials, tokens or protected resource facts.

## Validation commands

```powershell
npm run check
$env:START_LOCAL_MONGO_FOR_TESTS='true'
$env:MONGOD_BINARY='C:\Program Files\MongoDB\Server\8.0\bin\mongod.exe'
npm run test:mongo:local
$env:PLAYWRIGHT_PORT='4317'
npm run test:e2e
npm audit --audit-level=high
```

Use an already installed local mongod. The opt-in runner starts/stops only its own temporary loopback replica set; test suites generate and drop only their own synthetic test databases. Ordinary tests skip MongoDB suites and remain disconnected. CI continues offline unit/API/build/E2E validation; it does not provision MongoDB automatically. See the implementation report for executed results and outstanding external decisions.
