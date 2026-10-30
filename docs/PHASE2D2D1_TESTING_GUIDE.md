# Phase 2D.2D.1 testing guide

30 October 2026. Tests distinguish offline security policies, disposable durable storage and unchanged fixture-only browser behavior. No browser test authenticates an integration session.

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
node --require ./work/no-outbound.cjs apps/worker/dist/index.js
npm audit --audit-level=high
```

Build first for standalone browser/guard/startup checks. Mongo uses only the existing owned loopback replica-set runner and random welspun_lms_integration_* databases. MONGOURI/DATABASE_NAME and Atlas are not consumed. Temporary local principal records are test data, not an executable account bootstrap. Existing command receipt, audit, scoped authorization and publishing suites remain intact.

Focused ordinary command:

```powershell
npx vitest run apps/api/test/session-transport-foundation.test.ts apps/api/test/integration-foundation.test.ts apps/api/test/integration-storage.test.ts
```

Ordinary policies cover hash-only internal records, random opaque tokens, explicit isolated-store gating, unknown/forged principals, fixed session/CSRF binding, idle refresh with absolute/authentication-age preservation, durable CSRF re-read after revoke, malformed/null/foreign/HTTP origins, unsafe types/methods, frozen route/query allowlists, header/cookie filtering and duplicates, arbitrary destinations, secure-cookie flags, workload signature/time/content/audience/key failures, missing workload credentials and disabled runtime authentication. Known log fields and public DTO serialization are checked for session/CSRF secret leakage.

The existing guarded fresh-process import test now imports the session/CSRF/gateway/workload/cookie modules too. Its TCP/TLS/UDP/DNS/HTTP/fetch guard rejects even swallowed application network attempts. The default API still exposes none of the future integration paths. Current source contains no active proxy or login callback.

Four new/revalidated Mongo lifecycle scenarios cover: persisted hash-only sessions and revoke/expiry; one-winner concurrent rotation; active/unknown/disabled user/org checks and current-CSRF invalidation; and transaction rollback on duplicate replacement plus expiry refusal at the final rotation write. Existing Phase 2D.2C cases still prove setup/checksum/index/cleanup isolation. The session fixture supplies unique fictional organization codes to satisfy the actual existing indexes; fixed old timestamps were replaced with current test-relative times to avoid TTL races.

No timeout, guard, lint or TypeScript rule is weakened. Use the implementation report for actual final counts, intermediate failures and intentional skips. No clean install, remote CI, authenticated HTTPS browser flow, IdP/AWS/Atlas integration, replay-store validation or independent security certification is claimed.
