# Phase 1B.3A HTTP security guide

29 October 2026. Implementation foundation and future endpoint proposal, not approved Welspun identity, HR, delegation or audit policy. No production authentication or operational management endpoint is enabled.

## 1. Architecture summary and audit

Read README.md, PHASE1A_FINAL_REVIEW.md, PHASE1B1_IMPLEMENTATION_REPORT.md, PHASE1B2_IMPLEMENTATION_REPORT.md, PHASE1B2_AUTHORIZATION_GUIDE.md, SYSTEM_ARCHITECTURE.md, RBAC_PERMISSION_MATRIX.md, API_CONTRACTS.md and OPEN_QUESTIONS.md. Inspected actual Express middleware, identity ports, authorization engine/service, organization integrity service, typed repositories, same-session extension hooks, models, connection guards, contracts, logging and tests.

Reuse the modular monolith. `identity/http-security.ts` handles credentials and controller composition; the existing authorization service remains the authoritative application boundary. Its organization write fence, snapshot/majority transaction, identity-to-user mapping, uncached grants, resource resolution and integrity rules are preserved. No check-then-unprotected-write path is introduced. Public DTO schemas remain in packages/contracts; private identity, database and audit types remain backend-only.

Normal startup still connects to neither MongoDB nor Redis and starts no jobs. The new HTTP security factory is not mounted on the normal server. Test routes exist only in test source and are mounted through a guarded app option. This allows end-to-end verification without enabling administration or making unapproved identity decisions.

## 2. Middleware and identity-provider boundaries

`createHttpSecurity({verifier?, audit, isolatedTest?, clock?})` defaults to a disabled verifier. There is no SSO implementation, local-password flow, login endpoint or assumed corporate provider. The future server-owned verifier port is:

```ts
interface HttpIdentityVerifier {
  readonly mode: 'disabled' | 'approved-sso' | 'synthetic-test';
  verifyBearer(token: string): Promise<{
    issuer: string;
    subject: string;
    synthetic: boolean;
    expiresAt: number; // Unix milliseconds, server-verified
  } | null>;
}
```

The port receives a bounded Bearer credential, not an actor ID or an organization/role claim. Future approved implementations must verify authenticity, trusted issuer, intended audience, lifetime, revocation and the approved session protocol. Returning a decoded token without verification is forbidden. Expiry and mode/synthetic consistency are checked again by this boundary. No JWT decoding, OAuth setup, Entra configuration, provider discovery or network access is implemented.

The new integration supports only a single syntactically valid Authorization Bearer header, at most 4,096 characters. Missing, invalid, unsupported, duplicate/comma-combined, expired or rejected credentials produce the same 401 envelope and `WWW-Authenticate: Bearer`. Verifier exceptions are sanitized. Credential extraction ignores user-ID, role, permissions and organization headers, query tokens and cookies. Body fields used for provisioning are target record data; they never authenticate the caller.

Synthetic verification requires `NODE_ENV=test` AND explicit `isolatedTest:true`, enforced at construction and request use. Actual synthetic implementations and token maps exist only in test files. Test tokens are opaque fixture credentials, not a proposed authentication protocol. A configured approved-sso verifier cannot return a synthetic identity. Unknown modes do not authenticate.

Successful verification creates an opaque request-bound credential held in private WeakMaps. The existing authorization service receives only that credential through a server-owned adapter. Arbitrary objects, JSON claims, `request.user`, response-local role strings or a copied actor ID cannot mint it. Credentials are removed on response finish/close and cannot be reused on another request. Expiry and environment restrictions are reevaluated when the adapter resolves them; no cross-request identity cache exists. The verifier authenticates once per HTTP request; future revocation/session policy must define any stronger in-flight revalidation requirement.

Issuer/subject are still mapped to an active user inside the requested organization's database transaction. The organization ID in a path is an untrusted candidate selector, not an authenticated tenant claim. A disabled/unmapped user or cross-organization selection cannot acquire authority. A verified credential does not by itself authorize an active account: that later failure is concealed as 403.

The Phase 1A `/me` diagnostic principal is unchanged for regression compatibility. It is not accepted by this boundary and cannot select a database actor or use management methods. Its existing isolated development mode must not be confused with the new strictly test-only HTTP fixtures.

## 3. HTTP authorization integration

Composition sequence for isolated tests:

1. Create the existing authorization repository on an explicitly connected local test adapter.
2. Construct `createHttpSecurity` with a test verifier and separate security audit sink.
3. Construct `createHttpApplicationService(repository, security, transactionalAudit, {isolatedTest:true})`.
4. Mount `security.authenticate`, followed by validation/controller helpers. Mutations additionally use `security.isolatedMutation`.
5. Invoke only protected application methods with `security.credential(request)`; never read actor claims from the request or call the integrity service/repository from a controller.

`protectedController` validates an allowlisted Zod input, invokes one protected application operation and explicitly projects/validates its public DTO before writing the standard success envelope. Its arguments are server-owned functions, never request-supplied code. Shared `resourceIdSchema` checks canonical IDs; strict nested schemas reject operator-shaped IDs, extra roles and unknown input fields. Transfer dates are validated ISO instants before conversion to domain Dates. Existing 16 KB JSON limits and parser safeguards apply.

Authorization and mutation stay in the existing service transaction. Optional audit hooks were added inside that boundary, after successful domain work and before commit. No separate `check()` followed by mutation is used. Requests cannot submit a trusted ActorContext. List implementations must use the existing transaction-bound scoped query API, apply scope before totals/pagination and project an approved DTO; no management list endpoint is implemented here.

`createApp` accepts `isolatedTestRouter` only when process NODE_ENV is test, parsed environment NODE_ENV is test and ISOLATED_DEVELOPMENT is true. Its prefix is `/api/v1/__test`. Normal server startup never supplies that option. The HTTP application-service factory and mutation middleware independently reject production/non-isolated composition. Even a caller claiming a persistent audit capability cannot enable production HTTP management through this phase's factory. There is no public bootstrap or superuser route.

## 4. Error and DTO contracts

Existing success/error envelopes and request ID middleware are reused. An accepted incoming UUID request ID is a correlation value, not identity or an idempotency key. Each audit event has a separate server-generated event ID. All responses retain no-store/security headers and request ID propagation.

| Status | Meaning in this integration |
| --- | --- |
| 401 AUTHENTICATION_REQUIRED | No accepted, unexpired supported credential; generic message |
| 403 FORBIDDEN | Active account/grant/scope/lifecycle policy did not permit the operation; missing/inaccessible target IDs are concealed consistently by the authorization resolver |
| 404 NOT_FOUND | Unknown route or scoped domain NOT_FOUND after an authorized operation; never a cross-organization existence oracle |
| 409 CONFLICT | Stale revision, duplicate record, interval/history/hierarchy conflict; generic message |
| 422 VALIDATION_ERROR | Malformed allowlisted identifiers/fields or domain values; no submitted values or raw Zod diagnostic messages |
| 503 DEPENDENCY_UNAVAILABLE | Required database service unavailable |
| 503 SECURITY_AUDIT_UNAVAILABLE | Successful verification could not be recorded, or required transactional mutation audit failed |
| 503 MANAGEMENT_DISABLED | Attempt to use an isolated mutation outside approved test conditions |
| 500 INTERNAL_ERROR | Unexpected failure or unsafe/invalid output projection; no raw exception, stack or invalid DTO |

Existing parser, rate-limit and other foundation status contracts remain intact. Only known error classes are mapped; client objects cannot set their own status. A valid credential whose actor is disabled receives 403 rather than revealing account existence. AuthorizationError emits a denial audit signal in the controller; no protected record metadata is exposed in that signal.

Added public schemas: `resourceIdSchema`, `employeeSummarySchema` (ID, display name, active/inactive status, revision) and `membershipSummarySchema` (ID, user/unit IDs, ISO validity interval, primary flag, revision). Controllers construct these fields explicitly and strict output validation rejects extras. They do not return issuer/subject, tokens, grant internals, Mongoose documents, creator metadata or raw errors. These minimal fixture DTOs still need HR/privacy approval before real data use.

Serialization/network failure may occur after a transaction committed. Production mutation routes therefore still require the approved idempotency/retry/precondition protocol; no such operational endpoint is activated here.

## 5. Append-only security audit design

`platform/security-audit.ts` defines a strict, immutable event contract and append-only ports. Fields are server-generated eventId, requestId, occurredAt, a closed event type, allowed/denied outcome and optional authoritative organization/actor/resource IDs. It has no arbitrary metadata bag, token, username, raw header, body, URL, identity subject, display name or exception message. `securityEvent` validates and freezes the flat record. The append interface has no update/delete methods. This is an API constraint, not a durable-storage guarantee.

| Event family | Emitted where and meaning |
| --- | --- |
| identity.verified / identity.rejected | HTTP verification boundary; verification success does not imply active-account authorization |
| authorization.denied | Protected controller upon service AuthorizationError; no protected IDs from untrusted path claims |
| employee.provisioned | Authorized provisioning transaction |
| unit.created / unit.moved | Authorized hierarchy transaction |
| membership.created / membership.closed / membership.transferred | Authorized membership transaction |
| role.defined / role.granted / role.revoked | Authorized role/grant transaction |

Ordinary Pino request logs continue to contain only request ID, method, response status and duration; server errors log request ID and safe code. Audit events use separate injected sinks, not ordinary request logging. These records may still be sensitive and require restricted access and retention decisions.

`SecurityAuditSink.append(event)` handles nontransactional verification/denial outcomes. Failure to record a successful verification fails closed with 503 before a credential is issued. Failed verification still returns 401 if audit is unavailable; authorization denial remains denied if its audit sink fails. Denial records can therefore be lost during an outage; monitoring/reliable denial capture is a production dependency, not a compliance claim here.

`TransactionalSecurityAudit.append(tx, event)` MUST persist using the supplied domain transaction/session, throwing on failure. The HTTP composition requires mutation audit; the service also requires transactional-persistent audit for production mutations regardless of optional legacy flags. Test-only sinks are rejected outside explicitly isolated tests. Event emission is inside the same transaction as domain work. Driver retries may rebuild event IDs, but rolled-back attempts do not commit events. External logging calls or in-memory arrays are not transactionally durable sinks.

Only test implementations are supplied. Ordinary tests use a memory sink; real MongoDB tests write to a synthetic test collection using the exact existing ClientSession. They force failure AFTER audit insert and verify both employee and event are absent. That proves transaction integration on the local test replica set, not production durability, append-only database permissions, WORM protection, backup recovery, retention or compliance.

Before any future production management endpoint can be enabled: implement and review a persistent transactional audit adapter (or approved atomic outbox), schema/index migrations, append-only workload privileges, retention/legal hold/privacy controls, protection against tampering, restricted audit reads, availability monitoring and recovery tests. All resource/policy writers must retain the existing organization fence protocol. The durability label is a server-owned capability declaration, not proof supplied by clients. The current HTTP factory intentionally has no production enable switch; policy review and later implementation are required.

## 6. Future management endpoints — design only

The following routes are proposals under `/api/v1`; NONE is registered on the normal server. Organization IDs are candidate selectors authorized against database facts. Dates/filters/sorts/limits must be strict and bounded. Use scoped query predicates before lists/counts/exports. Mutations require an approved transactionally reliable audit sink, error mapping, CSRF/session protections where applicable, idempotency for retryable commands and approved concurrency preconditions before activation.

| Future route | Existing service/policy boundary | Key constraints and public response |
| --- | --- | --- |
| GET /organizations/:organizationId/employees | scoped query employees / employee.read | Current scope/active account; cursor and authorized totals; employee summary projection |
| POST /organizations/:organizationId/employees | createUser / user.create | Organization provisioning authority only; approved directory provenance; employee.provisioned event; safe summary |
| GET /organizations/:organizationId/org-units | future scoped unit query | Approved unit-read action/DTO still needed; never raw repository listing |
| POST /organizations/:organizationId/org-units | createUnit / unit.manage | Destination parent scope, expectedTreeRevision, hierarchy integrity and unit.created audit |
| POST /organizations/:organizationId/org-units/:unitId/move-preview | validateUnitMove / unit.manage | Source, destination and every descendant; no mutation; authoritative tree revision |
| POST /organizations/:organizationId/org-units/:unitId/moves | moveUnit / unit.manage | Same resource scope plus expectedTreeRevision and unit.moved audit |
| POST /organizations/:organizationId/employees/:userId/memberships | createMembership / membership.manage | Employee and destination scope, half-open interval/overlap rules, membership.created event |
| POST /organizations/:organizationId/memberships/:membershipId/close | closeMembership / membership.manage | Revision and valid end; preserve history; membership.closed event |
| POST /organizations/:organizationId/memberships/:membershipId/transfers | transferMembership / membership.manage | Source and destination scope, expectedRevision, atomic close+successor, membership.transferred event |
| GET /organizations/:organizationId/employees/:userId/memberships | membershipHistory / membership.read | Check employee AND every historical membership; out-of-scope history denies |
| GET /organizations/:organizationId/employees/:userId/current-memberships | currentMemberships / membership.read | Server current instant; employee/each membership scope; strict public projection |
| POST /organizations/:organizationId/roles | defineRole / security.manage | Organization scope, exact next version, explicit action vocabulary; role.defined event |
| POST /organizations/:organizationId/employees/:userId/role-grants | grantRole / security.manage plus delegated authority | No self-grant; action/scope/descendant/time-window subset; role.granted event |
| POST /organizations/:organizationId/role-grants/:grantId/revoke | revokeGrant / security.manage | Organization scope, expectedRevision and reason; preserve row; role.revoked event |

Read-only role/grant administration, account disable/offboarding, broad unit metadata editing and production bootstrap require explicit additional service design and policy approval. There is no generic CRUD/delete API. Existing revision fields demonstrate conflict handling in tests; final If-Match/428 and Idempotency-Key persistence remain future production transport work under API_CONTRACTS.md. Path naming above is a proposal, not a rewrite of the Phase 0 baseline or a claim of implemented endpoints.

## 7. Tests and commands

Normal HTTP tests mount only synthetic routers from `backend/test/http-security-fixture.ts`. Shared scenarios run against both the existing rollback-capable memory repository and actual opt-in MongoDB. Tests exercise missing/invalid/unsupported/expired credentials, forged headers/IDs, disabled actors, missing/expired/revoked grants, department/plant/organization isolation, standard errors, DTO/log/audit leakage, provisioning, transfers, revisions, denied-write integrity and audit failure rollback. Additional tests check normal routes absent, unsafe mounting rejected, disabled default provider, production rejection and audit requirements/role-change event types.

```powershell
npm run check
$env:START_LOCAL_MONGO_FOR_TESTS='true'
$env:MONGOD_BINARY='C:\Program Files\MongoDB\Server\8.0\bin\mongod.exe'
npm run test:mongo:local
$env:PLAYWRIGHT_PORT='4317'
npm run test:e2e
npm audit --audit-level=high
```

No packages, database services or Redis infrastructure are installed. The opt-in runner uses an existing mongod and temporary loopback replica set; suites generate/drop only their own synthetic databases. Normal startup and ordinary tests stay disconnected. The real suite also runs all previous MongoDB tests. Hosted CI remains unexecuted here and does not provision MongoDB automatically. See PHASE1B3A_IMPLEMENTATION_REPORT.md for exact executed results.

## 8. Security limitations

There is no production verifier, session store, approved directory, CSRF/session strategy, persistent audit implementation, audit administration, management UI, bootstrap or deployment. Audit failure monitoring and denial-event durability are not implemented. The existing local-only database adapter is unchanged and does not support production Atlas connections. Identity and sink ports are trusted server code; TypeScript and capability labels cannot defend against malicious composition code or direct database writes.

A verified credential may become unusable after its account/grants/hierarchy change; authoritative checks remain uncached inside the same organization fence transaction. Audit sinks and all future status/resource/policy writers must use the same session/fence. Persistent external side effects must not run inside retryable callbacks. Field-level employee visibility, as-of history and production capacity require further review. No security certification, production durability or corporate approval is claimed.

## 9. External decisions required

Welspun must approve identity provider/protocol, issuer/audience/session/MFA/revocation, directory linkage/offboarding, real hierarchy and job-to-role mapping, field-level visibility/history, privileged delegation and bootstrap governance, production database/audit storage ownership, residency/retention/append-only controls, operational monitoring/recovery, API preconditions/idempotency and independent security review. Existing industrial/learning policy questions remain open and untouched.

## 10. Readiness for Phase 1B.3B

This phase supplies test-proven integration ports without activating management. Review the implementation report and unresolved decisions before authorizing Phase 1B.3B. No automatic continuation, SSO selection, policy approval or production enablement is implied.
