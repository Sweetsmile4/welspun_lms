# Phase 2D.2D.1 session architecture

30 October 2026. Server-only foundation on explicitly owned disposable-local storage. No login, OIDC, callback, browser session creation or production identity integration is enabled.

## Existing work retained and corrected

Opaque-secret generation, lifecycle/store interfaces, Mongo persistence, rotation and secure-cookie serializers were already present. The review found missing active-principal checks, insufficient store isolation, and a rotation transaction that checked only revokedAt. These were corrected without touching domain authorization/publishing guards.

session-crypto.ts generates 32 cryptographically random bytes encoded as 43 base64url characters. Only SHA-256 hashes are persisted. Exact validated hash comparison uses timingSafeEqual. Untrusted malformed session tokens return no session; internal signing/serialization failures use safe messages.

## Storage and lifecycle

createMongoSessionStore requires the exact registered connection produced by the Phase 2D.2C local adapter. A private store registry binds the lifecycle to that owned connected target at construction and each operation. Arbitrary stores/maps are allowed only under NODE_ENV=test plus explicit isolatedTest:true for unit tests. There is no exported authoritative memory store, synthetic login route or production factory.

issue accepts only strict organizationId/userId input and checks active persisted organization and same-organization user records. Unknown/disabled principals are denied; role/actor claim extras are rejected. This verifies current stored state, not an external identity: a future approved authenticated provisioner still must establish who may request a session. No seed or identity issuer is supplied.

verify hashes the opaque token and checks durable record status, finite server clock, issuance/authentication times, idle/absolute expiry and current user/org status. It does not refresh activity implicitly. refreshIdle is a separate explicit operation for accepted authenticated activity, bounded by the original absolute expiration. A compare-and-update refuses an expired/revoked record, uses max semantics for concurrent activity and cannot move idle beyond absolute expiry. Default 30-minute idle/8-hour absolute durations are development scenario defaults only; configured values are copied/validated and corporate lifetimes remain unapproved.

rotate revokes the old token and inserts a fresh session/CSRF pair in one snapshot/majority transaction. It recomputes the server storage clock on each transaction attempt/retry, rechecks active expiry/issuance and current principal state inside that transaction, preserves principal IDs, authenticatedAt and absolute deadline, and rejects invalid replacement bindings. One concurrent rotation can succeed; losing operations deny or conflict. Replacement insertion failure rolls back old-token revocation. Rotation cannot extend the existing idle deadline by itself; refresh requires explicit accepted activity.

revoke marks the current token revoked, and future verify/current-CSRF calls deny it. Revocation is idempotent at the store boundary. This is per-token revocation, not an approved global logout/all-device/session-family policy. A revoked old token cannot revoke an already rotated replacement by itself. Define logout-versus-rotation ordering, account-wide epochs and in-flight request rules before authenticated transport activation. Domain actions must later recheck session/user/grants inside the organization-fenced unit of work; these primitives do not establish that composition or instantaneous IdP offboarding.

## Secret disclosure and cookies

Raw session/CSRF values are returned only to the trusted internal issue/rotation caller for a future secure handoff. They are not DTOs and must never be logged or returned wholesale. Records persist hashes only. The existing public session serializer accepts a minimal summary and excludes all token material. Structured logger redaction now includes session/CSRF tokens and hashes in root and documented nested issue/record fields, plus MONGOURI. This is defense in depth, not permission to log arbitrary records/headers/bodies; existing API request logs still exclude them.

The cookie helpers only serialize/clear __Host-welspun-dev-session with Secure, HttpOnly, Path=/, SameSite=Lax and no Domain. No route sets a cookie. Do not weaken flags for ordinary HTTP; a future browser environment needs loopback HTTPS. TTL remains eventual cleanup; explicit durable checks determine validity.

## Limits and activation gate

Session storage validates current user/org existence but does not authenticate issuer/subject, evaluate grants, provide an IdP revocation feed or issue a nominal trusted HTTP context. The old disabled boundaries and frontend client remain unavailable. Shared Atlas and normal startup remain disconnected. Supervisor/security must approve identity mapping, lifetime/revocation semantics, bootstrap authority and transport/session-race design before a separately reviewed activation increment.
