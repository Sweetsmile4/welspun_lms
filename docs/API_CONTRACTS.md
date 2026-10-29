# API contracts

Phase 0 REST contract proposal · `/api/v1` · JSON unless stated otherwise

## Shared rules

IDs are opaque strings; dates are ISO 8601 UTC with explicit zones supplied for business deadlines. Backend derives user/organization/scope. Request bodies cannot set scores, approver identity or completed state. Use runtime validation with allowlisted fields, bounded arrays/body sizes, output DTOs and private answer-key projections. Authentication uses the approved session/SSO adapter; cookie mutations require CSRF protection.

Success: `{ "data": {...}, "meta": { "requestId": "...", "nextCursor": null } }`. Error: `{ "error": { "code": "PREREQUISITE_NOT_MET", "message": "...", "details": [] }, "requestId": "..." }`. Never include stack traces, answer keys or unauthorized object details. 400 malformed; 401 no valid session; 403 denied; 404 absent or concealed inaccessible object; 409 stale revision/invalid transition/idempotency conflict; 422 valid shape but invalid domain values; 429 throttled; 503 dependency unavailable. Apply one concealment rule consistently.

GET lists use opaque cursor, limit (proposed default 25, maximum 100), allowlisted sort/filter and stable timestamp/ID ordering. Apply scope before counts and pagination. Draft mutations use `If-Match` revision; missing precondition returns 428, stale returns 409. Retriable creation/finalization commands require `Idempotency-Key`, bound to actor, method, route and canonical request hash. Same key/body returns original result; changed body returns 409. Durable business uniqueness remains after key-cache expiry.

## Identity, hierarchy and content

| Method and route | Input → result | Authorization and constraints |
|---|---|---|
| GET /auth/login; GET /auth/callback | Approved SSO redirect/callback → session | Validate state/nonce and provider response; final details depend on IT |
| POST /auth/logout | CSRF → revoked session, 204 | Current session |
| GET /me | → identity, memberships, permitted capabilities | Authenticated; no global employee list |
| GET/POST /org-units | parent/type/code/name → unit | Scoped read; security hierarchy grant for creation |
| PATCH /org-units/:id | metadata/parent plus revision → updated unit | Cycle/type/scope checks; tree move coordinated |
| POST /users/:id/role-grants | role version, scope, validity, reason → grant | Bounded delegation only |
| POST /role-grants/:id/revoke | reason → revocation | Security administration and scope |
| GET /courses | filters → eligible catalog | Published, authorized audience only |
| GET /courses/:id/releases/:version | → public manifest and lesson refs | Release eligibility; private questions/keys excluded |
| POST /courses/:id/drafts | baseReleaseId → draft | Author resource scope |
| PATCH /drafts/:id | structured blocks/config plus revision → draft | Author scope; only supported renderer config |
| POST /drafts/:id/review-requests | revision/hash, requested review types → review | Author; exact revision required |
| POST /review-requests/:id/decisions | approve/reject, rationale, sourceRefs → decision | Required reviewer capacity; self-approval denied |
| POST /drafts/:id/publish | approvedHash plus revision → immutable release, 201 | Publisher; verify all approvals and ready dependencies transactionally |
| POST /releases/:id/withdraw | reason, disposition → release action | Publisher; approved critical-content disposition |
| POST /assets/upload-intents | type/size/checksum/provenance → generated key and restricted upload URL | Author resource scope, quarantine only |
| POST /assets/:id/finalize | uploaded checksum → scan pending/ready, 202 | Verify actual object and scanner; never trust MIME alone |
| GET /assets/:id/access | → short-lived read URL | Recheck resource and learner entitlement |

## Learning, assessment and evidence

Administrative policy configuration uses POST `/configuration-drafts` and PATCH `/configuration-drafts/:id` with target type `technical-policy`, `assessment-policy`, `certification-policy`, `competency` or `simulation`. Each draft has a revision/hash, resource scope and typed schema; it follows the same review-request, decision and publication rules as course content. Technical approval and certification-policy approval are distinct required capacities. This avoids treating configurable policies as editable live constants.

Employee administration uses POST `/users` for approved directory provisioning/import, PATCH `/users/:id/status` with reason and revision, and POST `/users/:id/membership-changes` with effective dates. These require scoped identity administration; account deactivation revokes sessions/grants. The approved directory remains the authority where integrated. Assignment due-date amendments and exemptions use POST `/assignments/:id/amendments` and POST `/assignment-recipients/:id/exemptions`, with reason, approved authority and audit. No direct deletion of recipient history is allowed.

| Method and route | Input → result | Authorization and constraints |
|---|---|---|
| POST /enrollments | courseReleaseId → enrollment, 201 | Self only; audience/availability and cycle uniqueness |
| POST /assignments/preview | release, audience filter, scope, due date/zone → counts/exclusions | Assignment grant; filter cannot exceed actor scope |
| POST /assignments | preview hash, release, audience, due date/zone → assignment/job, 202 | Revalidate audience; idempotent recipient materialization |
| POST /assignments/:id/cancel | reason → action | Assignment scope; preserve recipient history |
| GET /me/enrollments | → own journey list | Own only |
| GET /enrollments/:id/progress | → progress, revision, pinned versions | Owner or scoped learning-record read |
| POST /enrollments/:id/events | bounded batch of interaction events → per-event accepted/duplicate/rejected and revision | Owner; no authoritative completion types allowed from client |
| POST /enrollments/:id/lesson-decisions | lessonReleaseId, itemId, optionId → feedback and accepted evidence | Owner; server checks formative answer and completion gate |
| POST /enrollments/:id/assessment-sessions | assessmentReleaseId → session, items, deadline, 201 | Owner, prerequisite/retry policy; no correct keys |
| PUT /assessment-sessions/:id/responses | responses plus revision → saved revision | Owner, active session; not final grade |
| POST /assessment-sessions/:id/submit | selected responses, revision → immutable attempt and progress | Owner; server grade, finalization transaction, idempotent replay |
| GET /assessment-attempts/:id | → permitted result/feedback | Owner or scoped records permission; release feedback according to policy |
| POST /enrollments/:id/simulation-runs | simulationReleaseId → run/seed/public config, 201 | Owner; published enrollment dependency |
| POST /simulation-runs/:id/finalize | actions/input evidence plus revision → server outcome | Owner; bounded evidence, server evaluator, one final outcome |
| POST /competency-observations | learner, competency version, evidence, decision → immutable evidence | Explicit assessor permission and learner scope; reason/source required |
| GET /me/certificates | → award and effective validity list | Own only |
| GET /certificates/:id/download | → artifact URL or render pending, 202 | Owner/scoped records permission; no arbitrary generation |
| POST /certificates/:id/revoke | reason, effectiveAt → action | Explicit policy/revocation permission; audit and retain award |

Certificate issuance is an internal domain command triggered by eligible evidence, not a learner endpoint accepting a pass flag. A future public verification endpoint needs a random unguessable token and privacy approval; do not expose employee identity through sequential serial lookup.

## Reports and audit

GET `/reports/compliance?scopeUnitId=...&asOf=...` returns scoped denominators, counts and freshness. POST `/report-jobs` accepts allowlisted report type, filters and cutoff, returns 202 with job ID. GET `/report-jobs/:id` returns pending/ready/failed and authorized download access. Recheck permissions on generation and download; expire artifacts under approved retention. GET `/audit-logs` requires explicit audit scope and cursor filters. No generic update/delete endpoint exists for attempts, outcomes, approvals or audit records.

## Representative domain payloads

Assessment submit request: `{ "responses": [{ "itemId": "opaque-item", "optionId": "opaque-option" }], "revision": 3 }`. Response: `{ "attemptId": "opaque-attempt", "score": 7, "maximum": 8, "passed": true, "policyReleaseId": "opaque-policy", "progressRevision": 8 }`. These numbers illustrate an approved 80% policy; they are not a decision to adopt that policy.

Simulation finalize request: `{ "actions": [{ "sequence": 1, "type": "setInspectionInputs", "distanceMm": 500, "angleDegrees": 45, "illuminationLux": 500 }] }`. Server checks allowed units and scenario policy; response contains outcome ID, objective/rubric results and evaluator version, not universal industrial compliance.

Atomicity contract: submit either commits final attempt + immediate eligibility/progress + audit/outbox, or returns retryable failure without partial finalization. Job status distinguishes accepted work from completed work. Event batches report per-item outcomes so clients retry only unconfirmed items. Pending assignments do not claim audience completion until materialization is reconciled.

Trade-off: REST command routes and explicit transitions are easier for one developer to secure and test than generic CRUD or GraphQL mutations over all collections. Produce machine-readable OpenAPI and contract tests in implementation; this Markdown is the Phase 0 contract baseline.
