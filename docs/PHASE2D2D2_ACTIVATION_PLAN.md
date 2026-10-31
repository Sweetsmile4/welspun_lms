# Phase 2D.2D.2 activation plan

31 October 2026. Planned activation only. This document does not start Phase 2D.2D.2B.

## Preconditions

Supervisor/security/IT must approve the restricted external OIDC tenant/client, issuer/audience/algorithm/JWKS policy, three legitimate fictional development principals, exact HTTPS callback/origin, session/revocation lifetimes, bootstrap operator and scoped grants, security-outcome retention, gateway topology, workload authentication and AWS hosting compatibility. Obtain actual credentials through an approved secret channel; never place them in source, chat, frontend variables or test output.

The shared Atlas choice is not enough to activate it. Before any non-disposable target, obtain exact host/TLS/network evidence, database-scoped runtime/setup credentials, schema readiness, pool/concurrency budget, backup/restore/retention and cleanup ownership. Phase 2D.2D.2B should start against the already-tested disposable-local integration target only.

## Smallest implementation slice

1. **Provider adapter, disabled by default**
   - Verify OIDC discovery, issuer, audience, signature algorithms, JWKS rotation, state, nonce, PKCE, callback and one-time login transaction.
   - Produce only a verified `{issuer, subject, authenticatedAt}` value. Reject claims, roles, email-based linking and unknown/disabled subjects.

2. **Session composition, no domain routes**
   - Use `createSessionLifecycle` and `createMongoSessionStore` with current user/org checks.
   - Add only server-side establish/read/logout/revoke behavior under a separately gated integration composition.
   - Return a minimal session summary; set/clear the secure host cookie only through the approved server route. Never return the raw token.

3. **Trusted transport**
   - Add one fixed same-origin gateway boundary and one approved gateway-to-Express workload verifier.
   - Consume workload nonces atomically, bind proof to method/path/query/request/body/header digests and rotate keys through the approved secret system.
   - Apply current-state session, exact origin and CSRF checks before any command; strip all browser identity headers.

4. **Stored mapping and scoped authorization proof**
   - Resolve exact issuer/subject to the fictional user, then enter the existing organization-fenced authorization transaction.
   - Recheck active org/user, current grants, role versions, unit ancestry and revocation before every action/replay.
   - Expose no course, catalog, management, review or publishing route in this slice.

## Acceptance tests

- Valid callback creates one session for the mapped fictional user; raw token is absent from database, logs, DTOs and browser bundle.
- Unknown issuer, wrong audience, wrong algorithm, bad signature, stale key, invalid state/nonce/PKCE, callback mismatch and replayed login transaction deny without session creation.
- Author, reviewer and publisher map only to their pre-provisioned users; browser-supplied role/actor/org claims are ignored or rejected; grants are not created by login.
- Unknown/disabled user or organization, revoked session, expired idle/absolute session and logout deny; revocation works across process boundaries.
- Rotation invalidates the old token, preserves the absolute deadline and has one winner under concurrent rotation.
- Missing/null/foreign Origin, wrong CSRF, unsafe content type, duplicate sensitive headers, forwarded identity claims, arbitrary destinations and missing/invalid workload credentials deny.
- A valid workload proof cannot replay after nonce consumption; altered body/header/path/query or wrong audience/key fails.
- No business route is reachable; `/development/*` remains fixture-only and normal API/worker startup remains disconnected.
- Existing ordinary, disposable Mongo, Playwright and preview guard suites remain green.

## Rollback and operational gates

Abort activation and leave the feature disabled if any test shows forged trust, identity-to-grant expansion, callback/login replay, nonce replay, stale revocation acceptance, secret disclosure, public route exposure, Atlas access outside the approved gate, test-guard weakening or publishing behavior drift. Roll back by disabling the integration composition/feature configuration and removing its route registration; retain disposable test evidence and do not run destructive cleanup against shared infrastructure.

After local acceptance, perform a separate security review before adding read-only domain routes. Do not combine identity activation with course CRUD, review, publishing, frontend persistence, worker queues or AWS deployment. AWS hosting remains blocked until the Next 16 compatibility gap and private API/workload ingress are explicitly resolved.
