# Phase 2D.2 integration architecture

30 October 2026. Proposed design only. No connection, deployment, new endpoint, credential or corporate policy is authorized by this document.

## Readiness and recommended topology

The frontend is a fixture simulator; the existing course application services require isolated tests. The next environment must have its own reviewed composition, rather than run an interactive application under NODE_ENV=test or remove guards.

Proposed request path:

    Browser -> same-origin Next integration gateway -> private Express integration API
                                                    -> approved development identity/session adapters
                                                    -> current scoped authorization and domain services
                                                    -> dedicated approved MongoDB development database

Keep apps/web, apps/api and apps/worker in the modular monolith. A narrow Next gateway is transport only, not a second domain service: no Mongoose, grant decisions, publishing logic or privileged environment in client components. Express owns identity verification, sessions, scoped authorization, validation, transactions, receipts and audit. The worker stays inert. MongoDB is reachable only by authorized backend/setup processes, never the browser or normal Next build.

A same-origin gateway avoids credentialed browser CORS and lets one host own secure cookies. It adds a forwarding hop and requires end-to-end header/cookie/timeout tests. An edge reverse proxy routing /api directly to Express is an alternative with fewer application hops, but needs an approved ingress and separate routing proof. Select one before implementation; do not support both initially. Proposed default is the Next gateway, pending hosting support and supervisor review.

## Shared-cluster configuration update

Supervisor approval now covers the existing shared company Atlas cluster and already-existing welspun_lms_dev database. Use exact backend-only environment keys MONGOURI and DATABASE_NAME=welspun_lms_dev. Do not alias them to the local-test URI key or another database-name key. The disabled config parser validates the exact database name and still cannot enable an adapter or connect. Credentials, approved host/network/TLS, scoped permissions and explicit schema/index setup remain connection gates. See the updated MongoDB readiness guide. The frontend and Next gateway never receive MONGOURI; normal API/worker startup and all disposable-test guards remain unchanged.

## Separate environment and composition

Use a future explicit APP_ENV=development-integration plus an independent integration enable flag, approved origin, identity issuer/audience, deployment identity and exact database allowlist. These are proposed settings, not currently recognized variables. NODE_ENV retains its normal runtime meaning, including production for a local optimized build; it cannot establish application trust. No flag alone proves isolation. Missing/mismatched configuration fails closed. The normal foundation entry remains disconnected.

Keep current exported test factories, local database guard, test HTTP router and test audit adapter intact. In a separately reviewed increment, extract unchanged domain operations into private reusable implementation functions; retain guarded test wrappers and add a distinct integration composition factory requiring a server-created trusted context. That context is issued only after validated environment, approved identity/session adapter, verified database identity/schema and same-session durable audit/receipt adapters are present. No public arbitrary object, type assertion, fake durability label or synthetic-test mode may manufacture it. Test every construction and per-call denial. Production composition remains absent.

This is an intentional security boundary change requiring its own review, not a mechanical refactor. Preserve authorization, provenance, revision/digest, policy, current reviewer qualification, replay and transaction semantics byte-for-byte where possible; differential memory/local-Mongo regressions establish equivalence. Do not expose organization-management controllers merely to bootstrap the integration environment.

## Identity establishment and lifecycle

Recommended conditional option: an approved nonproduction OIDC tenant/client with Authorization Code + PKCE and individually authenticated development principals. Provider remains unspecified. Express validates discovery/issuer, audience/client, signature/algorithm/key lifecycle, state, nonce, PKCE and code replay; redirects are exact allowlisted URLs. Login transactions are short-lived, server-stored and bound to the initiating browser. No redirect supplied by a browser may become an arbitrary upstream address.

Map verified issuer + immutable subject to an explicitly provisioned active application user in an allowlisted fictional development organization. Do not auto-link by email, auto-create roles, trust IdP group claims as grants or select actors via browser controls. Login authenticates; current stored grants authorize. Unknown/disabled users fail closed. Distinct approved principals are needed to demonstrate reviewer separation. Development approvals remain demonstrations, never SME qualification.

On successful login rotate the session identifier; store only a hash of a cryptographically random opaque token with subject binding, issued/authenticated times, idle/absolute expiry, revocation epoch/status and CSRF binding. Proposed reviewable defaults: idle 30 minutes, absolute 8 hours, shorter login transaction 5 minutes; supervisor must confirm these development values. Multi-instance sessions use durable server storage, not process memory. Check expiry explicitly, not via asynchronous TTL deletion. Session store/schema is new work, not an existing feature.

Logout is a CSRF-protected POST; revoke server-side, clear the cookie, and terminate future use. Account disable/offboarding, security epoch changes and operator revocation invalidate sessions. Revalidate active user/org/grants on every action. To close revoke-versus-mutation races, authoritative session validity must be checked within the domain unit of work after the organization fence, and revocation/disable must use the same fence ordering for the pilot organization. The current HTTP verifier only captures expiry; it does not supply this durable revocation mechanism. External IdP revocation latency/back-channel events require an explicit policy.

If sandbox OIDC cannot be approved, a strictly single-workstation alternative is a trusted OS/operator provisioner that creates short-lived opaque sessions for fixed fictional principals over an authenticated local control channel. No public mint endpoint, browser role switch, reusable fixture bearer or shared-cluster use is permitted. This has weaker human attribution and is only a disposable-local test option after explicit supervisor approval; it is not the recommended shared Atlas path. Do not implement either identity option before that decision.

## Browser/API transport and contract

Reserve a separate future /integration UI tree and /integration/api gateway; preserve /development/* fixture routes and provider independently. Do not turn a fixture perspective into an authenticated session or persist fixture snapshots into the database. A persistent UI uses an API-backed adapter and separate loading/error state with no fallback-to-fixtures on failure.

Gateway routes explicitly allowlist method/path/query/body size and fixed upstream origin. They reject arbitrary proxy URLs, strip browser Authorization/actor/role/organization-forwarding claims and hop-by-hop headers, and forward only approved cookie/session, CSRF, correlation and command headers. The private API authenticates the gateway workload as well as the user session; use an approved workload credential/mTLS/private-ingress policy, not a browser-shipped shared secret. Redact all such values. Cookies from session endpoints alone may be forwarded through a curated Set-Cookie policy; never expose session tokens as browser JSON. No caching of identity, authoring or review responses, including Next fetch caches and CDN caches.

Express validates path/query/body/headers and constructs server-owned commands. Request organization/course IDs are selectors, never authority; resolve stored scope/owner and current grants. Draft metadata/content public schemas can be reused. Current backend aggregate DTOs include internal identities, Dates and provenance and are not public HTTP contracts. Add versioned strict public authoring/review/catalog DTOs and explicit serializers: ObjectIds as strings, UTC ISO dates, minimal permitted identities, no tokens/raw documents. Learner catalog omits review/feedback/provenance. Authoring lists require a new explicitly scoped bounded read service; catalog.list cannot list drafts. Reviewer selection requires a narrow authorized candidate projection; do not expose the whole employee directory.

Authorized authoring/review reads should return a server-computed digest and explicit revision binding for subsequent commands. Compute it from the complete authoritative backend snapshot; validate it again on execution. This avoids exporting private provenance merely so the browser can hash it. A digest is a concurrency binding, not authority or a signature.

Maintain envelopes: success {data,meta:{requestId,nextCursor}}, error {error:{code,message,details},requestId}. Use 401 absent/expired session, 403 denied action/origin/CSRF, 404 absent authorized resource where allowed by disclosure policy, 409 revision/idempotency/state conflict, 422 invalid fields, 428 missing revision precondition, 413 oversize, 429 rate limit and 503 unavailable dependency/audit/replay. Map internal safe errors explicitly; do not serialize driver/Zod diagnostics wholesale. Correlation is not identity or idempotency. Do not leak existence/counts across unauthorized scopes.

## Concurrency, retries and evidence

Use exact draft/review revisions and digest plus expected previous release number; map strong quoted If-Match to the relevant draft revision with no body/header mismatch. Review commands carry separately named review revision/digest fields. Missing/stale preconditions never silently refresh and execute. Preserve server SHA-256 canonicalization over complete authoritative snapshots; browser hashes are not trusted. Do not hash the smaller fixture Draft shape as a backend snapshot.

One logical command uses one random idempotency key, stable across bounded retries and lost responses. Reauthenticate/re-authorize before replay; retain actor/org/operation binding, payload fingerprint, schema/command/response versions and response digest. Never generate a fresh key automatically after timeout, key conflict, unknown commit or receipt corruption. 401 requires reauthentication; 409 requires user reconciliation/new intent; 422 requires correction; 429/503/network failures may retry only identical intent with bounded backoff and the same key. Session rotation for the same actor does not change command identity. Keep pending intent only in tab memory initially; after reload/unknown outcome, fetch authorized state and reconcile rather than guessing. A replay is the historical acknowledgement; fetch current state separately.

All domain changes, same-session audit, review evidence and receipts commit atomically in the existing snapshot/majority transaction behind the organization fence. Keep contributor/author/submitter independence, current reviewer qualification and exact policy requirements unchanged. Approval count/version is explicit development configuration, not a Welspun default. Catalog reads the same persisted immutable releases as publishing; drafts/approved submissions do not appear. Archive does not withdraw releases.

Authentication outcomes/denials require a separate durable safe security-outcome sink; current persistent audit handles allowed domain mutations only. Failure policy: protected mutations fail closed if audit/receipt infrastructure cannot commit; denial remains denial if its log sink fails and triggers operational alerts. Do not claim request logs are durable audit. No feedback, lesson text or credentials in security logs. Retention and backup policy require approval.

## Failure and acceptance boundary

Liveness remains process-only; future integration readiness checks identity/session, database reachability, required schema/index manifest and audit availability without seeding data or leaking details. Startup failure exposes no partial writable API. Bounded DB selection/transaction/request timeouts and graceful shutdown must fit the transport budget. No in-memory fallback writes. Organization-fence contention needs representative measurements before shared use.

The first implementation increment should add disabled transport/session ports and offline security tests only. Enabling identity, domain factories, database targets and browser mutations are later independently reviewed increments in the roadmap. No deployment is necessary to validate the local design.
