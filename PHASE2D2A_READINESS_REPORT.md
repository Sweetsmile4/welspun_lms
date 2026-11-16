# Phase 2D.2A readiness report

30 October 2026. Verdict: PASS for completing this audit/design increment; BLOCKED for enabling persistent browser integration, shared Atlas or deployment. Existing tests pass, but session trust and non-test service composition are not implemented. No application code, guards, routes, policies, packages or infrastructure were changed.

## Scope and evidence

Checked git status before edits. The working tree already contains uncommitted Phase 2C/2D.1 and earlier changes; all were preserved. No commit/staging/reset, original HTML modification, credential request, real account creation or shared cluster connection occurred. This increment creates only the six requested Markdown files.

Reviewed README, Phase 2A/2B/2B.1/2C/2D.1 reports and relevant identity, HTTP security, review/release/catalog/preview architecture and Phase 0 open questions. Inspected actual source rather than relying on completion reports:

| Area                   | Source evidence inspected                                                                                                                                                        |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend               | frontend/src/app/development layout and course/review/catalog/detail routes; components/preview provider, model, workspace, catalog, content renderer; existing Playwright specs |
| API process            | backend/src/server.ts, app.ts, platform/environment.ts and errors.ts                                                                                                             |
| Identity               | identity/provider.ts, http-security.ts, authorization types/service/engine/repository, organization models/repository                                                            |
| Test HTTP              | identity/management router/service/contracts/store and HTTP test composition                                                                                                     |
| Course domain          | catalog/drafts service/contracts/models/store; publishing service/contracts/store; discovery service/Mongo projection                                                            |
| Persistence/evidence   | platform/database.ts, database-config.ts, security-audit.ts and mongo-security-audit.ts; management receipts/store; local Mongo fixtures/tests                                   |
| Public contracts/build | packages/contracts/src/index.ts and package.json; root/web/API package manifests and lockfile; Next/tsup config; GitHub validation workflow and guard/startup scripts            |

AWS/Atlas/Jenkins compatibility was checked against current official documentation on the audit date, with supporting links in the deployment/database guides. Public research did not access the user's cloud accounts. One guessed Atlas TLS URL returned 404; the official security FAQ was used instead. No secret .env content was read or copied into these deliverables.

## Findings

PASS means the existing foundation supports its present restricted scope, not approval for production. BLOCKER means a prerequisite for the proposed next environment is missing, not a defect to bypass.

| ID  | Classification | Finding and implication                                                                                                                                                                                                                                                             |
| --- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A01 | PASS           | Modular npm workspaces retain separate web/API/worker/contracts/config. The worker exits with queues disabled. No microservice split or queue infrastructure is necessary.                                                                                                          |
| A02 | PASS           | /development/* is guarded by exact LMS_UI_PREVIEW=true and uses a shared React memory provider; catalog derives the same immutable fixture releases as history. Employee routes remain placeholders.                                                                                |
| A03 | BLOCKER        | No authenticated browser session/login/callback/CSRF/revocation or approved development provider exists. The display-only synthetic /me principal is not the test authorization principal. Browser perspective controls grant no server identity.                                   |
| A04 | PASS           | HTTP credentials are server-verified and held in request-scoped opaque maps; current actor/grants/resource scope are resolved server-side. Test-only management mounting and course factories fail closed. Preserve these guards.                                                   |
| A05 | BLOCKER        | Draft/publishing/catalog service factories demand test/synthetic isolation; local audit also checks test process, loopback host and test DB name. No reviewed persistent integration composition exists. Setting NODE_ENV=test or relabeling durability is unacceptable.            |
| A06 | PASS           | Snapshot/majority transactions, common org write fence, same-session domain/audit/receipt operations and versioned unique receipts are available in isolated tests. Publishing rechecks exact revision/digest, policy, independence and current reviewer qualification.             |
| A07 | WARNING        | Current HTTP credential expiry is not durable session revocation. Protected reads also write the organization fence; contention, pooled connections and end-to-end deadlines need measurement before shared use.                                                                    |
| A08 | BLOCKER        | Local database adapter intentionally rejects Atlas and the exact welspun_lms_dev name. Proposed shared-cluster permission is not application connection approval; no target, role, network, setup/bootstrap or recovery approval is present.                                        |
| A09 | BLOCKER        | No versioned shared-environment migration/index manifest or durable session/outcome store exists. Existing explicit initializeIndexes helpers are test setup, not operational migrations. Runtime must not gain setup/drop privileges.                                              |
| A10 | WARNING        | Public packages share safe content/metadata schemas and envelopes, but authoring/review aggregates remain backend-only with internal identities and Date fields. Safe versioned HTTP DTOs/serializers, server digest bindings and scoped list/reviewer-candidate reads are missing. |
| A11 | WARNING        | Current 16 KiB JSON cap is smaller than allowed 256 KiB course aggregates; process-local limiting, trust proxy=false and no cookie/CSRF handling suit the foundation, not a multi-instance session API. Route-specific bounds and trusted ingress are needed.                       |
| A12 | BLOCKER        | Lockfile Next16.4.3 is beyond the currently documented native Amplify compute support through Next15. Node24 support alone does not prove framework compatibility; no downgrade is authorized.                                                                                      |
| A13 | WARNING        | Express has a loopback listen entry, no Lambda event handler/adapter; production dependencies need packaging. Lambda pools, normalized headers/cookies, timeout budgets, process-local limits and environment trust need explicit tests.                                            |
| A14 | PASS           | Existing CI uses npm ci/Node24/npm12, audit, check and browser tests. No deployment config is present. CodeBuild/Jenkins can reuse commands; neither is configured or tested remotely.                                                                                              |
| A15 | BLOCKER        | Real development issuer/principals, scoped bootstrap manifest, reviewer duties/policy, retention, Atlas capacity/backup/network and deployment ownership require supervisor/IT decisions. Phase 0 questions remain proposals.                                                       |

## Proposed architecture and trade-offs

Recommend an independently gated development-integration environment: same-origin Next transport gateway to private Express; server-established opaque sessions; scoped current server authorization; existing unchanged domain invariants; same-session durable audit and receipts; and a dedicated approved development Mongo database. A Next gateway reduces browser cross-origin complexity but adds a forwarding hop and deployment-cookie tests. It owns no domain rules or Mongo credentials. Edge path routing is an alternative requiring a deliberate ingress choice, not an additional parallel implementation.

Prefer an approved sandbox OIDC tenant/client with real individual development authentication mapped to fictional records. Do not invent a provider or approve corporate SSO. A trusted single-workstation session provisioner is documented only as a weaker disposable-local option needing explicit approval; it cannot become a browser principal selector or shared Atlas login bypass. Stop before implementing either identity issuer.

Preserve test factories and local DB/audit adapters. A separate reviewed private-core extraction and integration factory must preserve authorization and revision/digest/replay behavior, and require an honestly verified trust context. Do not remove guards or add flags to make synthetic tests run as a shared application. Session validation/revocation must be consistent with the domain fence, not merely verified once at the gateway.

Atlas requires exact host/db identity, database-specific least privilege, verified TLS, approved network access, explicit migrations/bootstrap, pool budget and consistent restore/cleanup. Logical database separation does not isolate shared cluster resources or project network/backup operations. No connection is authorized by the database name alone.

For AWS, the actual package/lock versions and current official support gaps are in the dedicated guide. Assess conventional Lambda event handling separately from other execution models; preserve the modular monolith. Choose CodeBuild or Jenkins as a primary build orchestrator rather than requiring both. Keep the private worker disabled until an approved background workload exists.

## Fresh validation executed

| Command/check                                       | Result                                                                                                                                      |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| npm run check                                       | PASS: all workspace/tool type checks, lint, formatting, ordinary tests, API/Next/worker builds and worker smoke                             |
| Ordinary Vitest                                     | 15 files passed, 9 opt-in files skipped; 128 tests passed, 118 opt-in tests skipped                                                         |
| Explicit npm run test:mongo:local                   | PASS: 8 files passed, 1 optional benchmark file skipped; 117 passed, 1 skipped; 31.17 seconds                                               |
| Playwright on owned loopback port 4317              | PASS: 31 passed, 1 duplicate server-only mobile guard skipped; 34.6 seconds                                                                 |
| node scripts/check-preview-disabled.mjs and --unset | PASS: every development route disabled; no preview API                                                                                      |
| node work/phase1b1-startup.mjs                      | PASS: built API liveness/envelope/readiness disabled/default identity denial/415; outbound guard saw no attempted connection or URI logging |
| Built worker with work/no-outbound.cjs              | PASS: queues disabled, no registered jobs; exits successfully                                                                               |
| npm audit --audit-level=high                        | PASS: zero vulnerabilities; no dependency changes                                                                                           |

The ordinary Mongo skips were separately executed against the existing MongoDB 8.0.4 binary in an owned disposable loopback replica set. Runner stopped its processes; no existing/shared service was used. The only unexecuted Mongo check was the optional performance benchmark, and the browser skip avoids duplicate viewport-independent guard work. Cosmetic FORCE_COLOR/NO_COLOR warnings do not affect results.

No new integration security behavior was implemented, so existing passes do not demonstrate authenticated browser persistence, CSRF/session security, Atlas privilege isolation, AWS hosting support, remote CI reproducibility, clean reinstall, failover/restore or production readiness. No infrastructure/account connectivity test was attempted. Final explicit Prettier checks passed for all six documents, and git diff --check passed. The only Git output was a pre-existing CRLF normalization notice for the earlier Phase 2B.1 guide. Final status shows the same prior working changes plus these six new documents; no tracked application file was changed by this increment.

## Deliverables

1. This readiness report.
2. docs/PHASE2D2_INTEGRATION_ARCHITECTURE.md - trust/session/transport/domain/DTO/concurrency/error/evidence design.
3. docs/PHASE2D2_SECURITY_BOUNDARIES.md - observed boundaries, threat controls, cookie/CSRF/origin and test gates.
4. docs/PHASE2D2_MONGODB_READINESS.md - exact-target guard gap, proposed config, privilege/index/setup/network/backup/cleanup requirements.
5. docs/PHASE2D2_AWS_DEPLOYMENT_READINESS.md - actual versions, official support evidence, packaging/runtime/CI/worker assessment.
6. docs/PHASE2D2_IMPLEMENTATION_ROADMAP.md - independently testable B-I increments, expected files, dependencies, security, tests, acceptance and stop conditions.

## Recommendation and supervisor decision list

First safe increment: 2D.2B, disabled integration contracts/session/transport ports plus offline denial/DTO tests only. No authentication, database activation, business route or publishing behavior change is needed for that increment. Proceed only under a new implementation task after this design review.

Before functional sessions, supervisor/security must choose the development identity approach and nominate legitimate test principals, approved issuer/client/callback/origin, session lifetimes/revocation and workload ingress. Before persistent shared data, supervisor/cluster owner must authorize exact Atlas target, database roles/secret delivery/network, fictional org/grants bootstrap, schema/index ownership, capacity and backup/retention/cleanup. Before integrated review/publishing, approve demonstration policy key/count and distinct duties without treating them as corporate SME policy. Before deployment, choose supported Next hosting/adapter, API execution mode, CI orchestrator, AWS ownership/region/network/secrets and operations budgets.

Phase 2D.2A is complete for review. Identity implementation, shared-cluster connection, production SSO/API enablement, AWS deployment, publishing authorization changes and enrollment/progress features remain stopped.

## Subsequent supervisor database decision

Supervisor approved the company shared Atlas cluster and its existing welspun_lms_dev database. This supersedes only the infrastructure-choice uncertainty in A08/A15; their connection/composition/access prerequisites remain open. Exact future backend keys are MONGOURI and DATABASE_NAME, with literal database validation. No Atlas connection or guard change was authorized/performed by this documentation and disabled configuration update. See the updated MongoDB readiness guide.
