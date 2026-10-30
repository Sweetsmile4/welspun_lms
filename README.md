# Welspun Corp LMS — Phase 2D.1

Repository foundation plus internal organization-data services. No production authentication, real employee accounts, learning workflows, simulations or deployment. Ordinary API/worker startup remains disconnected. MongoDB connections occur only through explicit isolated development/test commands. The ten Phase 0 documents remain architecture proposals, not approved corporate/industrial policies.

## Prerequisites and workspace choice

Use Node.js 24 LTS and npm 12 (tested with Node 24.18.0 / npm 12.0.1). npm workspaces keeps one lockfile and avoids installing another package manager or task orchestrator. The small workspace graph needs no Turborepo/Nx. TypeScript is pinned to the supported 5.9 line rather than adopting a new compiler major during foundation work. package-lock.json locks the resolved versions; use npm ci after checkout.

## Structure

    apps/
      web/                 Next.js App Router, Tailwind, local shadcn/ui primitives
      api/                 Express modular monolith, platform adapters and boundaries
        src/modules/       identity, catalog, learning, assessment, simulation,
                           certification, reporting
        src/platform/      environment, database adapter, logger, errors
        test/              Supertest integration and environment/adapter unit tests
      worker/              Backend process entry point; no registered jobs
    packages/
      contracts/           Public DTOs, Zod runtime schemas, unit tests
      config/              Shared strict TypeScript development configuration
    tests/e2e/             Playwright desktop and mobile shell tests
    docs/                  Ten unchanged Phase 0 proposals and identity boundary guide
    .github/workflows/     CI checks; no deployment

The public contracts package exports source TypeScript privately within this monorepo. Next transpiles it; tsup bundles workspace imports into backend output. Node does not execute shared TypeScript directly in built output. No answer keys, database schemas or private environment settings belong in contracts. The worker imports only the backend platform logger; it owns no separate domain or database. apps/api remains the future authorization boundary. Identity's organization submodule now contains four Mongoose models and internal services. No business/admin HTTP endpoint exposes them; catalog now owns internal course drafts; other domain modules remain documented boundaries.

## Install and develop

From C:\MY FOLDER\Work\welspun-lms:

    npm ci
    npm run dev:web
    npm run dev:api
    npm run dev:worker

Run web and API in separate terminals. Web: http://127.0.0.1:3000. API: http://127.0.0.1:4000/api/v1. Both listeners are loopback-only in this phase. The shell does not call the API, display fixture employee data or simulate login. The fixture-only course/review preview additionally requires the server-only flag:

    $env:LMS_UI_PREVIEW = 'true'
    npm run dev:web The worker logs that queues are disabled and exits successfully; no Redis installation is needed.

Optional API local configuration (PowerShell):

    Copy-Item apps/api/.env.example apps/api/.env

The examples are tracked; actual .env files are ignored. The web needs no variables. Automatic database activation is rejected, including DATABASE_ENABLED=true. MONGODB_URI alone never connects. Do not enter a real/corporate URI. See [the data foundation guide](docs/PHASE1B1_DATA_FOUNDATION.md) for explicit, isolated local replica-set tests. Those tests use synthetic records and never run automatically during ordinary startup.

## Checks and builds

    npm run typecheck
    npm run lint
    npm run format:check
    npm run format
    npm test
    npm run build
    npx playwright install chromium
    npm run test:e2e
    npm run check

npm run check runs typecheck, lint, formatting, unit/integration tests, all application builds and a built-worker smoke check. E2E is separate and expects a completed web build; Playwright starts/stops its own production-mode local Next server. CI runs both. Playwright browser installation downloads a test browser, not database/queue infrastructure. On Linux CI use npx playwright install --with-deps chromium. npm run test:watch is the unit/integration watch mode. Build output is ignored under each app's dist/ or .next/.

Stop local development servers before running `npm ci`; on Windows, loaded native modules can prevent a clean reinstall. Playwright deliberately refuses to reuse an existing server. If port 3000 is occupied, select another loopback port with `$env:PLAYWRIGHT_PORT='4317'` before `npm run test:e2e`. This ensures browser checks exercise the intended build. CI also runs `npm audit --audit-level=high`; that is a development gate, not an approved Welspun security policy.

Built entry points:

    npm run start -w @welspun/web
    npm run start -w @welspun/api
    npm run start -w @welspun/worker

Set approved future environment explicitly when running built API; it never loads development .env automatically in start mode. NODE_ENV=production produces 503 readiness because this foundation is not production-ready. A Next production build verifies compilation, not corporate approval or deployment readiness.

## Foundation API

| GET endpoint                      | Meaning                                                                                                    |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| /api/v1/health                    | Process liveness, independent of database readiness                                                        |
| /api/v1/ready                     | Development/test foundation readiness only; explicitly reports database disabled and productionReady false |
| /api/v1/foundation?detail=modules | Strictly validated diagnostic with declared module boundaries                                              |
| /api/v1/me                        | 401 by default; fixed synthetic principal only when explicitly isolated mode is enabled                    |

Responses follow docs/API_CONTRACTS.md envelopes. Request IDs are UUIDs; an invalid incoming ID is replaced. Error bodies expose no stack traces. JSON logs include server timing, request ID, method and status, deliberately excluding URLs, query strings, headers, bodies and error messages to avoid credential/PII leakage. These request logs are not the future persistent audit trail. Helmet, bounded JSON, IP rate limiting, disabled framework identification and no cross-origin opt-in establish defaults. The rate limiter is process-local and must be revisited for multi-instance production. There are no cookie sessions or mutation workflows yet; future SSO requires CSRF/session protections and scoped authorization before business routes are enabled.

shadcn/ui is manually configured through components.json, CSS tokens, aliases and locally owned Button/Card primitives. Only dependencies actually used by these primitives are installed. Add additional official components when required; no full component library or CLI runtime is installed. There are no external fonts, images or CDNs in the shell.

## Safety and future decisions

See docs/IDENTITY_PROVIDER_BOUNDARY.md and docs/OPEN_QUESTIONS.md. No real hierarchy has been seeded. Admin is a public placeholder route, not an access-controlled admin implementation. The API's synthetic development principal is not connected to backend authorization; authorization fixtures are test-only. Thirteen internal Mongoose models exist, including command receipts, local security audit events, stable courses, mutable content drafts, review submissions/evidence and immutable releases; no real records are provisioned. Startup never requests a database connection. Ordinary tests use offline schemas/test doubles, while the separate opt-in suite exercises real local MongoDB with synthetic data. Redis/BullMQ, S3 SDKs and Three.js remain deferred.

Phase 1B.2 adds backend-only role/grant models, scoped authorization and protected organization/membership application methods. No HTTP business endpoints or production identity integration are enabled. See [the authorization API guide](docs/PHASE1B2_AUTHORIZATION_GUIDE.md) and [PHASE1B2_IMPLEMENTATION_REPORT.md](PHASE1B2_IMPLEMENTATION_REPORT.md). Phase 1B.3 requires a separate review and authorization.

Phase 1B.3A adds reusable HTTP credential/controller helpers, safe DTOs, standardized security error mapping and transaction-bound audit hooks. Only isolated tests mount management-shaped routes; normal API startup exposes none. Production management remains disabled. See [the HTTP security guide](docs/PHASE1B3_HTTP_SECURITY_GUIDE.md) and [PHASE1B3A_IMPLEMENTATION_REPORT.md](PHASE1B3A_IMPLEMENTATION_REPORT.md). Stop for review before Phase 1B.3B.

Phase 1B.3B adds reusable protected employee/unit/membership/role/grant controllers, explicit read permissions, scoped pages and transaction-bound command receipts. The router is mounted only in isolated tests; the normal API still exposes no management endpoints. See [the management API guide](docs/PHASE1B3B_MANAGEMENT_API_GUIDE.md) and [PHASE1B3B_IMPLEMENTATION_REPORT.md](PHASE1B3B_IMPLEMENTATION_REPORT.md). Production SSO, audit/idempotency lifecycle and policy approvals remain unresolved. Stop for review before Phase 1B.3C.

See [PHASE1A_FINAL_REVIEW.md](PHASE1A_FINAL_REVIEW.md) for the source review, fixes, current verification results and remaining warnings.

## Toolchain compatibility

The Next.js lint plugin set currently requires ESLint 9 rather than ESLint 10. This repository retains the compatible ESLint 9.39.5 line despite its npm deprecation notice; revisit it when the framework's React and accessibility plugins support a newer major. Peer dependency resolution was not forced.

An esbuild override selects patched 0.28.2 to resolve the low-severity Windows development-server advisory in the build-tool tree. Builds, tests and runtime smoke checks validate the override. The final dependency audit reported zero findings. No esbuild development server is used.

Phase 1B.3C hardens replay authorization and composition, adds versioned receipt validation and reusable local transactional audit storage, and records bounded contention measurements. All management APIs remain test-only. See [the implementation report](PHASE1B3C_IMPLEMENTATION_REPORT.md), [security review](docs/PHASE1B3C_SECURITY_REVIEW.md), [production checklist](docs/PRODUCTION_READINESS_CHECKLIST.md) and [Phase 2 entry criteria](docs/PHASE2_ENTRY_CRITERIA.md). Stop for review; Phase 2 has not begun.

Phase 2A adds backend-only course draft services with bounded modules/lessons, explicit authoring permissions, optimistic revisions, atomic audit and idempotent acknowledgements. There are no course HTTP routes or frontend authoring features. See [the design](docs/PHASE2A_COURSE_DOMAIN_DESIGN.md), [service guide](docs/PHASE2A_COURSE_SERVICE_GUIDE.md) and [implementation report](PHASE2A_IMPLEMENTATION_REPORT.md). Stop for review before Phase 2B; publishing and production integration remain disabled.

Phase 2B adds isolated internal exact-revision SME review and immutable course release services. Reviewer counts are explicit synthetic policy configuration; no corporate hierarchy is assumed. See [the implementation report](PHASE2B_IMPLEMENTATION_REPORT.md), [design](docs/PHASE2B_REVIEW_PUBLISHING_DESIGN.md), [service guide](docs/PHASE2B_REVIEW_SERVICE_GUIDE.md) and [release integrity guide](docs/PHASE2B_RELEASE_INTEGRITY_GUIDE.md). No normal-server endpoints, frontend or public catalog were added. Stop for review before Phase 2C.

Phase 2B.1 adds a local, fixture-only development preview at `/development/courses` and `/development/reviews`. It requires `LMS_UI_PREVIEW=true`, keeps all synthetic state in tab memory, and calls no domain API or database. The preview is not authentication, authorization or backend validation. See [the implementation report](PHASE2B1_IMPLEMENTATION_REPORT.md), [preview architecture](docs/PHASE2B1_PREVIEW_ARCHITECTURE.md) and [testing guide](docs/PHASE2B1_TESTING_GUIDE.md). Isolated browser integration remains blocked pending a separately reviewed authenticated test-session boundary. Stop after Phase 2B.1.

Phase 2C adds isolated authorized catalog read services and a development catalog derived from the same shared in-memory published release snapshots used by Release History. Open /development/catalog after simulated publishing; /catalog remains the employee placeholder. Normal in-app development navigation preserves fixtures; reload/reset clears them. See [the implementation report](PHASE2C_IMPLEMENTATION_REPORT.md), [catalog design](docs/PHASE2C_CATALOG_DESIGN.md), [internal service guide](docs/PHASE2C_CATALOG_SERVICE_GUIDE.md) and [frontend walkthrough](docs/PHASE2C_FRONTEND_PREVIEW_GUIDE.md). No production catalog API or browser integration is enabled. Stop before Phase 2D.

Phase 2D.1 refines the existing fixture-only course management UI, confirmations, validation feedback and release presentation. See [implementation report](PHASE2D1_IMPLEMENTATION_REPORT.md), [frontend architecture](docs/PHASE2D1_FRONTEND_ARCHITECTURE.md) and [UI testing guide](docs/PHASE2D1_UI_TESTING_GUIDE.md). No browser integration or production capability is enabled. Stop before Phase 2D.2.

Phase 2D.2C adds an inert, explicitly opt-in disposable local integration storage adapter, a versioned additive schema/index manifest, durable session/login/security-outcome model definitions and a non-executable fictional bootstrap manifest. It never connects to Atlas, enables browser integration, or mutates a database at startup. Use only the separately named `LOCAL_INTEGRATION_*` setup variables and the explicit setup command described in [the local storage architecture](docs/PHASE2D2C_LOCAL_STORAGE_ARCHITECTURE.md). The future shared backend remains reserved for exact `MONGOURI` and `DATABASE_NAME=welspun_lms_dev`; no connection is enabled. See the [implementation report](PHASE2D2C_IMPLEMENTATION_REPORT.md) and [testing guide](docs/PHASE2D2C_TESTING_GUIDE.md). Stop after Phase 2D.2C.

Phase 2D.2D.1 adds server-only secure session lifecycle, CSRF/origin verification, secure cookie serialization, fixed gateway allowlist policy and a disabled workload-proof boundary. These are reusable foundations only: no login, cookie-setting route, gateway, public integration API, browser persistence, Atlas connection or deployment is enabled. See [the implementation report](PHASE2D2D1_IMPLEMENTATION_REPORT.md), [session architecture](docs/PHASE2D2D1_SESSION_ARCHITECTURE.md) and [transport security guide](docs/PHASE2D2D1_TRANSPORT_SECURITY.md). Stop after Phase 2D.2D.1.
