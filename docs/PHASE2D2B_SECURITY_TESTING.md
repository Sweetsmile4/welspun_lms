# Phase 2D.2B security testing

30 October 2026. Offline boundary evidence, not authenticated integration certification.

## Configuration and disabled interfaces

parseIntegrationConfiguration receives a dedicated explicit object. It never reads process.env, .env, credentials or network resources. Empty input and explicit disabled configuration return a frozen enabled:false result. No enabled return type exists. Even a structurally complete development enable request throws a fixed IntegrationConfigurationError because no identity, database or service composition is implemented/approved in this increment.

Missing/contradictory enable configuration, production/test enable attempts, fixture identity flags, caller role/user/token fields and unapproved database-name/URI aliases are rejected. Existing foundation parseEnvironment and isolated-test factories are unchanged. Do not pass process.env wholesale to this strict parser.

parseLoopbackOrigin validates exact HTTPS 127.0.0.1 or IPv6 loopback origins with explicit nondefault ports, no path/trailing slash/query/fragment/userinfo, and canonical URL spelling. inspectTransportPlan requires separate browser/upstream origins and always marks its output disabled. This checks syntax only; no origin, upstream or Atlas target is approved, resolved, contacted or registered. DNS hostnames/shared HTTPS hosts remain unsupported until separately reviewed. The illustrative 4443/4444 ports are test inputs, not approved infrastructure.

SessionVerifier, SessionRevoker, CsrfVerifier, WorkloadAuthenticator, RequestContextVerifier, TrustedRequestContext, AuthorizedHttpCommand and FixedUpstreamRouter are server-owned types. Unexported nominal symbols prevent accidental structural construction in TypeScript. They are not security against malicious trusted server code/casts. requireTrustedRequest always denies at runtime; no issuer or accepting verifier exists. All frozen disabled adapters return the typed unavailable result, even when given forged claims. The frontend client likewise returns unavailable without fetch, token/storage, database or fixture fallback and is not imported into any UI route.

## New ordinary tests

backend/test/integration-foundation.test.ts covers:

1. Default disabled and complete/missing/production/test enable refusal.
2. Fixture flags, credentials, database targets and role/actor fields denied without value disclosure.
3. Exact loopback HTTPS origin syntax; invalid/mixed upstream plans.
4. Forged trust claims/casts denied; nominal type errors intentionally asserted; all disabled boundary behavior.
5. Frontend typed unavailable result with fetch spy and no fixture data.
6. Guarded fresh-process runtime imports/invocations, mongoose connection states 0, and a deliberate caught TCP attempt failing the guard.
7. Normal API still 404 for future integration session/course paths and mutations.
8. Explicit valid BSON ID/Date conversion, invalid scalar/crafted object refusal.
9. Session and candidate minimal identity projection; token/role/directory input rejection.
10. Actual memory-backed domain snapshot/review/publication projections, private-field omission, evidence-binding checks and source immutability.
11. Successful readiness projection and unsupported/forged result rejection.
12. Strict unknown-field/version/scalar/content/outline/count/page bounds, including nested secret fields.
13. Strong precondition/review/digest/release binding validation.
14. Duplicate/malformed/missing metadata and actor/role field refusal.
15. Exact safe error/status mapping, bounded same-intent retry advice, payload-size and private/no-store constants.

Existing ordinary, disposable Mongo and Playwright tests remain intact. No production trust check, authorization predicate, audit durability label or fixture guard was loosened.

## No-outbound harness

The ordinary suite uses the already-declared tsup build dependency to bundle the new runtime modules into an owned ignored work/integration-offline-* folder. It does not download a package. A separate Node process preloads integration-no-outbound.mjs, blocking TCP/TLS/UDP, DNS entrypoints, HTTP(S) and fetch before importing/invoking the bundled application modules. Any attempted call records a failing exit code even if application code catches the exception. A control child deliberately catches a connection exception and must still exit 86. This verifies the application bundle, not every possible native malicious-code channel.

Compilation occurs before the guarded runtime: a tsx runtime loader opened its own tooling IPC pipe in an initial attempt and caused a correct guard denial. The final test has no runtime TS loader and does not whitelist application network destinations. Root work is created for clean-checkout tests; cleanup verifies the exact immediate parent/prefix before removing only the generated test directory. No shared database, credential resolver or background process starts.

## Commands and prerequisites

```powershell
npm run check
$env:START_LOCAL_MONGO_FOR_TESTS='true'
$env:MONGOD_BINARY='C:\Program Files\MongoDB\Server\8.0\bin\mongod.exe'
npm run test:mongo:local
$env:PLAYWRIGHT_PORT='4317'
npm run test:e2e
node scripts/check-preview-disabled.mjs
node scripts/check-preview-disabled.mjs --unset
node work/phase1b1-startup.mjs
node --require ./work/no-outbound.cjs backend/worker/dist/index.js
npm audit --audit-level=high
```

The existing work startup smoke scripts are local audit helpers, not new committed runtime dependencies. Build before browser/guard/startup checks. The tracked ordinary test guard is self-contained. Mongo tests retain their existing explicit opt-in local runner; no shared Atlas flag was added. Playwright owns its local server. Audit queries registry advisories but changes no dependency.

Use the implementation report for actual executed totals, skips and any intermediate failures. No new browser integration, IdP verification, CSRF token checking, session revocation, shared-cluster least-privilege proof, remote CI/clean install or AWS adapter behavior is established by these offline tests.

## Approved database naming update

Shared integration uses only MONGOURI (backend-only) and DATABASE_NAME=welspun_lms_dev. Blank URI examples contain no credentials. Exact database-name validation and URI omission/redaction are tested offline; enablement remains denied. No host/network/credential approval can be inferred from syntactic acceptance, and no Atlas connection occurs. Legacy local-test configuration remains unchanged and is not an alias.
