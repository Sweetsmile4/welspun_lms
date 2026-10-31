# Phase 2D.2D.2 authentication decision

31 October 2026. Decision record only. No provider, login route, browser session or database activation is enabled.

## Decision

**Recommended approach: a restricted external OIDC tenant/client dedicated to fictional development users, using Authorization Code + PKCE and individually authenticated operator accounts.**

Corporate OIDC/SSO is the eventual target but is deferred because the issuer, tenant, client, claims, callbacks and lifecycle owner are not finalized. A custom operator-provisioned identity mechanism is retained only as a disposable-local fallback after a separate approval; it is not a suitable default for browser integration against shared development infrastructure.

The provider adapter must authenticate, not authorize. The API verifies issuer, audience/client, signature algorithm, key lifecycle, state, nonce, PKCE and code replay. It then performs an exact `issuer + subject` lookup in the pre-provisioned fictional organization. Email, display names, IdP groups and browser claims are not mapping inputs. Stored role grants remain the only authorization source.

## Why this fits the repository

The current `IdentityProvider` and `AuthorizationIdentityProvider` ports already separate credential verification from authorization. The D.2D.1 session lifecycle accepts an already-authorized principal and gives durable hash-only sessions, explicit expiry, revocation and rotation. The existing user and role models preserve issuer/subject identity and current role versions/scopes. This permits an external OIDC adapter to be replaced later by a company SSO adapter without changing domain permissions, publishing integrity, organization fencing, audit/receipt behavior or public DTOs.

The current Next client and API composition remain disabled. The future browser path should be same-origin and transport-only; Express remains the verifier/session/authorization boundary. Mongo credentials remain backend-only. The local integration adapter remains disposable and separate from the exact future `MONGOURI`/`DATABASE_NAME=welspun_lms_dev` contract.

## Required security contract

- Exact HTTPS browser origin and callback per environment; loopback HTTPS for local browser tests, no HTTP downgrade or wildcard origins.
- OIDC Authorization Code + PKCE, server-stored one-use login transaction, state/nonce bound to the initiating browser, exact redirect allowlist and bounded callback lifetime.
- Session cookie: `__Host-welspun-dev-session`, `Secure`, `HttpOnly`, `Path=/`, `SameSite=Lax`, no `Domain`; raw token never appears in a DTO or log.
- Development session defaults may be 30-minute idle and 8-hour absolute only as explicit scenario values; supervisor must approve actual lifetimes. Rotation preserves the absolute deadline.
- Logout/revocation semantics must define per-token, session-family and all-device behavior, account disable/offboarding, IdP revocation latency and in-flight request ordering.
- Mutations require exact Origin, session-bound CSRF, safe JSON content type, current session state and the existing server-side authorization transaction. No browser actor/role/organization headers are accepted.
- Gateway uses one fixed allowlisted upstream and explicit routes/query keys. Forwarded headers are stripped, duplicates rejected and only the named session cookie is retained.
- Gateway-to-Express workload authentication requires private ingress plus an approved mTLS/managed identity/signing mechanism, or another reviewed equivalent. The existing HMAC helper is not replay protection until nonce consumption and key lifecycle are implemented.
- Security outcomes, login transactions, sessions, audit and receipts need approved retention, backup/restore and failure-alert behavior.

## Alternatives and exit criteria

Select company SSO instead if IT can immediately provide an approved nonproduction tenant/client and lifecycle contract; it gives better eventual alignment but remains unavailable today. Select an operator-provisioned local mechanism only when external OIDC cannot be approved and only for one controlled workstation with no shared Atlas, no public mint route and no browser role selector. In either case, the interface must preserve the same verified issuer/subject-to-user mapping and session/RBAC boundary.

Do not proceed from this decision record until the provider/tenant, principals, callback/origin, session policy, workload channel, bootstrap authority and retention owner are recorded. Provider selection alone does not authorize implementation or connection.
