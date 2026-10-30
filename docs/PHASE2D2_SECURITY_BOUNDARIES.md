# Phase 2D.2 security boundaries

30 October 2026. Proposed controls and threat review, not implemented capabilities or approved corporate policies.

## Observed boundaries

| Boundary              | Current evidence                                                                                                                                  | Integration requirement                                                                                                      |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Browser preview       | development layout/pages check LMS_UI_PREVIEW=true; React provider holds fictional arrays; no domain fetch/storage                                | Keep independent; no fixture identity/visibility/policy selector crosses into authenticated integration                      |
| Foundation identity   | identity/provider.ts returns disabled or one fixed synthetic display principal in isolated dev/test                                               | This /me principal has no grants and must never authenticate course services                                                 |
| Trusted HTTP identity | http-security.ts verifies a server-provided bearer verifier, puts opaque credentials in request-scoped WeakMaps, checks expiry and synthetic mode | New approved session verifier/bridge with durable revocation; do not accept raw principal objects                            |
| Test HTTP composition | createApp accepts isolatedTestRouter only in test + explicit isolation; management router/service checks test provider                            | Leave unchanged; no existing course HTTP router to simply enable                                                             |
| Domain services       | draft/publishing/catalog factories and methods require test + isolatedTest + synthetic-test; mutations require isolated audit                     | Separate reviewed integration factory with trusted context and preserved domain invariants                                   |
| Authorization         | issuer/subject maps to active stored user; actor/org/unit/grants/latest roles and authoritative resource scope checked inside fenced transaction  | Keep all checks, including replay/current reviewer qualification; no administrator/publisher bypass                          |
| Persistence           | credential-free loopback adapter; target name prefix; autoCreate/autoIndex/buffering off; explicit index setup                                    | Separate approved target adapter/setup; no extension of disposable test allowlist                                            |
| Audit/receipts        | local same-session audit verifies target type/org; versioned unique receipts; immutable review/release APIs                                       | Real durable development adapter with honest durability semantics, protected security-outcome logging and consistent restore |

The foundation provider, HTTP verifier and authorization provider are three distinct contracts. A matching TypeScript shape or caller-provided mode is not verified identity. An environment flag, loopback listener or WeakSet alone cannot secure malicious trusted server code; protect the deployment/configuration authority too.

## Threat/control/required evidence

| Threat                        | Proposed control                                                                                      | Required tests before enablement                                                                               |
| ----------------------------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Role/actor spoofing           | no x-user-id/role mapping; verified session + stored grants                                           | forged/duplicate headers, body actor, arbitrary credential, unknown user denied                                |
| Session fixation/theft        | rotate on login; opaque random token hash; Secure HttpOnly host-only cookie; no browser token storage | old token rejected; cookie flags; expiry/revocation/logout; logs/body/cache contain no token                   |
| Login CSRF/replay             | OIDC state/nonce/PKCE, initiating-browser binding, exact redirect and one-use transaction             | mismatched/replayed state/code/nonce/verifier, open redirect, issuer/audience/signature failure denied         |
| Mutation CSRF                 | server-session synchronizer token plus exact origin/method/content-type checks                        | missing/wrong token, foreign/null/missing Origin, form/text payload and method override denied                 |
| Cross-scope disclosure        | authoritative organization/course resolution and filtered queries before counts                       | other org/plant/sibling IDs, forged filters, pagination and resource enumeration                               |
| Session/grant revocation race | current session/user/grants and common transaction fence for revoke/mutate                            | concurrent logout/disable/revoke vs command and receipt replay; either committed-before-revocation or denied   |
| Confused gateway              | fixed upstream, path/method/header allowlists; authenticated workload                                 | absolute URL, encoded traversal, duplicate headers, arbitrary upstream/forwarded identity and cookie injection |
| Stale/duplicate publication   | exact revisions/digest/source number; receipts and unique indexes                                     | edit after approval, concurrent publish, altered payload/key, lost response, corrupt/unsupported receipt       |
| Audit failure                 | same transaction for domain/audit/receipt; separate safe denial sink                                  | injected errors before/after domain/audit/receipt and unknown commit; one commit or complete rollback          |
| Shared cluster escape         | exact DB/host approval and DB-scoped credentials; separate setup identity                             | disposable target validation plus separately authorized future cross-database denial proof                     |
| XSS/content injection         | bounded strict text/structured schemas, safe React renderer, CSP/Helmet                               | markup, unknown fields/operator keys, unsafe structured content and secret serialization rejected              |
| Multi-instance drift          | durable sessions; current grants; shared rate-control policy; no process authority cache              | separate process revocation/replay, cold/warm handler isolation and throttling                                 |

## Cookie, CSRF and origin proposal

Use __Host-welspun-dev-session with Secure, HttpOnly, Path=/, no Domain and SameSite=Lax for the proposed code-flow callback. Lax is defense in depth, not CSRF protection. Use loopback HTTPS for interactive integration rather than weaken cookie flags. Exact hostname, scheme and port form the allowlisted origin. No wildcard/subdomain suffix matching. Current HTTP fixture routes can remain HTTP because they have no session.

Require a session-bound unpredictable synchronizer token in a custom header for every mutation, logout included. Deliver only the CSRF token to authenticated same-origin JavaScript with no-store; never the session secret. Rotate CSRF binding on session establishment/privilege change. Validate Origin exactly for browser mutations; reject absent/null/foreign origin rather than infer from untrusted Host/X-Forwarded-Host. Check Fetch Metadata where available as additional defense. Login callback uses its state/nonce/PKCE exception, not a blanket CSRF exemption. All GETs are side-effect free except audited authentication callback completion; no state change on a link.

The API independently validates the trusted original browser origin and CSRF binding, and accepts gateway identity/origin forwarding only from its authenticated internal channel. Browser-supplied forwarding headers are stripped. Disable browser CORS on private Express. A future direct cross-origin API design would require separately reviewed exact credentialed CORS and cookie/CSRF policies; it is not covered by this proposal.

## Security policy limits and approval boundary

Proposed idle/absolute lifetimes, authenticated development people/test principals, issuer/client, offboarding/revocation SLA, gateway workload identity, trusted ingress/proxy list and rate limits require supervisor/security confirmation. Do not map all developers to a shared admin or use production users to demonstrate fictional duties. Default grants are none; bootstrap is an explicit audited operator command with approved manifest and no HTTP self-grant path. Real organization and publication policies remain unapproved.

Current Helmet/no-CORS, request IDs, 16 KiB JSON cap and process-local limiter are useful foundation controls but not sufficient integration security. The JSON cap cannot carry the allowed 256 KiB draft aggregate; define measured endpoint-specific bounded JSON budgets including envelope overhead before adding endpoints, without widening every route. Rate limiter/trust proxy configuration must be reconsidered for authenticated ingress; trust only known proxy hops, not all forwarded headers. A maximum permitted aggregate size still applies server-side.

No production authentication, session implementation, security-policy alteration or shared database connection was made in this audit. Identity selection is a supervisor decision; stop before implementing a provider or session issuer.
