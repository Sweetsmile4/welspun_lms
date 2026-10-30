# Phase 2D.2D.1 transport security

30 October 2026. Pure policies and disabled runtime boundaries only. No proxy, public Next route, Express integration endpoint or outbound HTTP transport is activated.

## CSRF and origin

assertExactBrowserOrigin validates both inbound Origin and every configured origin. Current development syntax requires canonical HTTPS literal loopback origins with explicit ports, no userinfo/path/query/fragment and exact scheme/host/port equality. A configuration containing null, HTTP or trailing-path forms is invalid even if the same inbound value is listed. Future hosted origins require a separately approved configuration design.

verifyMutationCsrf is a low-level record validator: current usable record, POST/PUT/PATCH/DELETE, exact origin, approved JSON content type and timing-safe match of the hashed session-bound CSRF token. Missing/null/foreign Origin, unsafe content types and safe-method misuse fail. Safe request checking rejects an explicit null Origin but allows absent Origin for appropriate same-origin GET/HEAD/OPTIONS contexts; it never authenticates them.

verifyCurrentMutationCsrf is the durable entry point: re-read through the server-owned lifecycle, then apply record checks. Cached pre-revocation records alone must not authorize a mutation. The input clock and allowed-origin list are server-owned, not request DTO fields. Validate origin/method/content type and CSRF before accepting activity or calling refreshIdle. Session validity and scoped authorization must still be enforced inside the later domain transaction; no CSRF success creates trusted identity or grants.

## Fixed gateway policy

createGatewayPolicy accepts one canonical HTTPS upstream origin and explicit exact method/path pairs. Parsed routes and their query-key lists are frozen; exposing policy inspection cannot mutate the internal allowlist. Absolute/protocol-relative destinations, origin changes, encoded path aliases, traversal, backslashes, fragments, control characters, unlisted methods/paths, unlisted/duplicate query keys and oversized query values are denied. Query keys must be explicitly configured from the bounded public vocabulary; they never select an upstream host.

prepareGatewayHeaders accepts a bounded raw header-pair list so duplicates are visible before normalization. It rejects invalid names/CRLF, browser Authorization/actor/user/role/organization/scope/permission/workload claims and duplicate sensitive/command headers. Forwarded, X-Forwarded-* and X-Real-IP are stripped. A Cookie input forwards only one validated __Host session cookie, never unrelated portal cookies; duplicate copies of that cookie are denied. The curated command/CSRF/content/accept headers and valid UUID correlation may be retained. Correlation is never identity. A future server must supply a correlation ID when absent and preserve raw duplicate detection through the actual hosting adapter.

This policy has no fetch, Mongo import, environment secret loading or identity/publishing implementation. Next.js will be transport-only if later authorized; no Next route currently imports or executes it. No browser token or privileged role is selectable.

## Workload authentication remains disabled

The offline HMAC-SHA256 integrity helper now binds algorithm, keyId, audience origin, method, exact path/query, correlation, body digest, curated-header digest, timestamp and nonce in an unambiguous canonical array. It rejects altered content/header bindings, mismatched key selection/audience and invalid/NaN/excessive clock skew. Injected test keys are at least 32 bytes; no real key is hardcoded or loaded.

verifyWorkloadProof validates integrity/time only. It does NOT consume nonces, establish workload identity or return VerifiedWorkload. Repeating a valid proof is not prevented by this primitive. disabledWorkloadAuthenticator and disabledBoundaries always return unavailable, including missing credentials. No accepting adapter is enabled without approved key/audience management, durable atomic replay consumption, exact request byte/header canonicalization, trusted ingress and rotation/revocation.

Supervisor/IT must select private ingress plus mTLS, a managed AWS workload identity/signing path, or another reviewed mechanism. HMAC is an offline candidate, not an AWS or corporate decision. Do not accept a public function URL or a shared browser secret as a substitute. Hosting-specific cookie/header normalization, HTTPS certificates, callback host and private API access are separate blockers.
