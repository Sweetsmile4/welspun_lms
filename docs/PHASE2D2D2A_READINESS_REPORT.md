# Phase 2D.2D.2A readiness report

31 October 2026. **Verdict: READY FOR SECURITY/SUPERVISOR DECISION, NOT READY FOR ACTIVATION.** This audit compares development authentication options and defines the smallest next increment. It does not implement login, expose API business routes, connect Atlas, modify the fixture preview or start Phase 2D.2D.2B.

## Audit evidence

The current D.2D.1 implementation provides server-only session primitives, not an identity source:

- `session-lifecycle.ts` generates opaque tokens, persists hashes through owned durable storage, checks current active organization/user state, enforces idle/absolute expiry, refreshes idle activity explicitly, revokes and atomically rotates sessions.
- `session-crypto.ts` uses 32-byte random base64url secrets, SHA-256 hashes and timing-safe hash comparison.
- `csrf-origin.ts` requires fresh session state, canonical loopback HTTPS origins, safe mutation methods, JSON content type and session-bound CSRF. `verifyCurrentMutationCsrf` re-reads durable state before validation.
- `gateway-policy.ts` fixes the HTTPS upstream, exact method/path/query allowlist, strips forwarded headers, rejects duplicate sensitive headers and rejects browser actor/role/authorization/workload claims.
- `workload-auth.ts` provides offline HMAC integrity binding, but does not consume nonces, establish workload identity or enable an authenticator.
- `config.ts`, `boundaries.ts`, the frontend integration client and normal API composition remain disabled. No route sets cookies or creates sessions.
- `session-models.ts` and the local adapter provide durable disposable-local storage only. The local adapter rejects Atlas/SRV/remote/shared targets and requires explicit connection/setup ownership.
- `provider.ts` supports only the existing disabled or isolated synthetic display principal. It is not an authenticated development provider and has no issuer/subject-to-user mapping.
- RBAC is stored separately in `users`, `roleDefinitions` and `roleGrants`. `AuthorizationIdentityProvider` is a future composition port; current authorization derives actor, organization, current grants, role versions and scope inside the organization-fenced transaction.
- The fictional bootstrap manifest contains placeholder author, reviewer and publisher records plus proposed scoped roles, but remains non-executable. It does not create records, identity claims or administrator access.

## Authentication option comparison

| Option                                                          | Security                                                                                                                                                                                                                   | Complexity                                                                                                                                  | AWS suitability                                                                                                                                  | Replacement with corporate SSO                                                                                | Decision                                                                                                                           |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Existing company OIDC/SSO                                       | Highest eventual alignment if IT owns issuer, MFA, lifecycle, tenant and callback approval. It is inappropriate to invent or assume before those details exist.                                                            | Medium after approval; requires discovery, PKCE, state/nonce, claims and offboarding mapping.                                               | Strong once approved issuer, callback, ingress and secret management are available.                                                              | Native replacement target.                                                                                    | Deferred because corporate SSO is not finalized.                                                                                   |
| Restricted external OIDC tenant for fictional development users | Strongest practical interim choice if it is a dedicated nonproduction tenant/client with MFA/admin controls, no production users, exact issuer/audience and allowlisted redirect. Avoids building password authentication. | Lowest secure implementation complexity among viable choices; use standard Authorization Code + PKCE and a narrow issuer adapter.           | Good for a later AWS deployment if callbacks, secrets and outbound discovery/JWKS access are approved and the API remains the verifier boundary. | High: replace only the issuer adapter/configuration and mapping policy; session/RBAC/domain contracts remain. | **Recommended**, subject to provider/security approval.                                                                            |
| Operator-provisioned identities with custom mechanism           | Can be safe only as a tightly controlled single-workstation/local operator ceremony. A browser role selector, public mint route, shared bearer or password shortcut is unacceptable.                                       | Lowest apparent initial coding cost but high security and operational ownership cost; custom authentication becomes a long-lived liability. | Weak for restricted AWS testing unless backed by an approved operator channel, device authentication, audit and secret/replay controls.          | Low; later OIDC replacement would discard the custom trust path.                                              | Use only as a disposable-local fallback if external OIDC cannot be approved, never for shared Atlas/browser activation by default. |

### Recommendation

Use a restricted external OIDC provider/tenant for fictional development users, with individually authenticated developer accounts and no production employee identities. The provider authenticates an issuer/subject pair; it does not supply roles or permissions. The API maps the verified pair to a pre-provisioned fictional `users` record and evaluates current stored grants through the existing authorization service. Corporate SSO later replaces the provider adapter and configuration, not the session, RBAC, transaction, audit or publishing model.

This recommendation is conditional. Until the provider, tenant, client, callback and operational owner are approved, the implementation must remain disabled. Do not select a vendor, create a tenant, request credentials or add a login endpoint in this audit.

## Fictional identity and RBAC mapping

Use stable immutable mappings:

`verified issuer + verified subject -> users.identityIssuer + users.identitySubject -> active user -> current roleGrants/roleDefinitions -> scoped authorization`

The mapping must be exact and organization-bound. Do not link by email, display name or IdP group claim; do not auto-create users or grants. Unknown, inactive, cross-organization or disabled mappings deny authentication/session establishment. The stored user is the actor used by authorization; browser input cannot select author/reviewer/publisher.

Proposed development records remain review artifacts only:

- `SYNTHETIC_AUTHOR`: author issuer/subject maps to one active fictional user; proposed author grants are limited to draft read/edit/archive, review submit/read, plus a separately reviewed unit-scoped draft-create grant because own scope cannot create a resource.
- `SYNTHETIC_REVIEWER`: maps to a distinct active fictional user; proposed grants are review read/decide within the fictional unit. Assignment and decision still enforce contributor/author exclusion and current reviewer qualification.
- `SYNTHETIC_PUBLISHER`: maps to a distinct active fictional user; proposed grants are review assignment/read, release publish/read and catalog read within the fictional unit. This is a proposed development duty, not a corporate approval policy.

No administrator, `security.manage`, organization-wide bypass, automatic role grant, reviewer count or publishing policy is approved by this document. The bootstrap manifest remains non-executable until the supervisor approves the exact records, scopes, operator and policy.

## Activation requirements

Before any activation task, supervisor/security/IT must decide:

1. Identity provider/tenant, client ownership, issuer, audience, allowed algorithms/JWKS lifecycle, MFA and account recovery.
2. Three legitimate development principals or an approved alternative, exact issuer/subject mapping, offboarding/disable process and attribution owner.
3. HTTPS browser origin and exact callback URLs. Loopback HTTPS is required for local browser testing; hosted origins must be exact, environment-specific and never wildcarded.
4. Session policy: idle and absolute lifetimes, logout/all-device/session-family revocation, rotation/logout ordering, IdP revocation latency and in-flight request behavior.
5. Gateway topology and private API reachability. Choose same-origin Next gateway versus approved ingress; do not implement both initially.
6. Workload authentication: private networking plus mTLS, managed AWS workload identity/signing or another reviewed mechanism. HMAC is only an offline candidate until durable nonce consumption, key rotation and secret delivery are approved.
7. Durable security-outcome retention, failure handling, alerting, backup/restore and cleanup ownership.
8. Whether the fictional bootstrap manifest may become executable and who performs the audited operator ceremony.

Developer-owned technical choices after those decisions: strict OIDC library/provider adapter boundaries, PKCE/state/nonce implementation details, hash-only session storage, exact safe error mapping, no-store headers, route allowlists, test fixtures, bounded timeouts and preserving the existing domain/RBAC ports. These choices cannot override the decisions above.

## Smallest Phase 2D.2D.2B plan

1. Add a disabled-by-default provider adapter that verifies discovery/issuer, audience, signature/algorithm, state, nonce, PKCE and callback exactness. No business routes.
2. Add a server-only authenticated session establishment/read/logout path on disposable local storage, using the existing lifecycle and secure cookie helpers. Revoke before clearing the cookie; never return the raw token.
3. Add a trusted integration composition that maps the verified issuer/subject to the stored fictional user and rechecks session/user/org/grants inside the existing organization fence. Keep test factories unchanged.
4. Add the approved gateway/workload adapter with one-use nonce replay protection, fixed route/header policy and exact origin/CSRF checks. Keep the frontend client and `/development/*` fixture routes separate.
5. Add only a safe session summary/read proof first. Do not expose course, management, catalog, review or publishing routes in this increment.

Acceptance requires: unknown/disabled principals denied; callback replay/state/nonce/PKCE/signature/audience/issuer failures denied; old tokens fail after rotation; revoked sessions fail across process boundaries; expired sessions and CSRF fail; exact origin/header/gateway/workload rules pass; no browser role selector or actor header works; no secrets appear in logs/DTOs/builds; ordinary startup stays disconnected; fixture preview remains unchanged; local Mongo setup is explicit and disposable; existing authorization/publishing tests pass.

Rollback if any trust context can be forged from browser input, if provider claims can create or expand grants, if nonce replay is accepted, if revocation races allow a denied mutation, if a route is reachable without workload/session proof, if secrets enter browser/build/log output, if test guards are loosened, or if any Atlas/shared target is contacted. Rollback means disable the new composition and remove its route/configuration entry; do not drop or rewrite shared data.

## Validation performed for this audit

- `npm run check`: PASS, 159 ordinary tests passed and 133 opt-in tests skipped; typecheck, lint, formatting, builds and worker smoke passed.
- Preview-disabled guard: PASS; development routes disabled and no preview API.
- `git diff --check`: PASS.
- `npm audit --audit-level=high`: **FAIL/ADVISORY** with 17 moderate `minimatch` findings in the ESLint/Next tooling tree. `npm audit fix --force` proposes a breaking ESLint 4 change and was not run. No dependency changes were made.
- No Atlas, `welspun_lms_dev`, external OIDC, AWS resource or remote service was contacted.

## Stop condition

This audit stops before Phase 2D.2D.2B. No login, identity provider, browser session, API route, Atlas activation, deployment or fixture change was made.
