# Phase 2D.2 AWS deployment readiness

30 October 2026. Research and source audit only. No AWS account/region/resource was inspected, configured or deployed. Recheck provider support in the approved account before selecting a platform.

## Actual repository versions and artifacts

Root engines require Node >=24 <25 and npm >=11 <13; packageManager pins npm@12.0.1. Local node is 24.18.0. frontend declares next ^16.4.3, React ^19.3.1; lockfile resolves Next 16.4.3 and React 19.3.1. API resolves Express 5.3.0/Mongoose 9.11.4; TypeScript resolves 5.9.3. These values were read from package manifests/lockfile, not assumed from reports. A successful local build is not hosting certification.

npm workspaces use a root lockfile; contracts exports private source TypeScript. Next transpilePackages handles @welspun/contracts; API tsup bundles workspace imports but external production dependencies still need packaging. tsup currently targets node24 and builds server.ts only. next.config.ts has no standalone/static export or deployment adapter. Both existing web scripts bind loopback; API has a listen/signal entry, not a Lambda event handler. No amplify.yml, buildspec, Jenkinsfile, Lambda adapter or infrastructure template currently exists in the audited application setup.

## Amplify compatibility gate

AWS's Amplify Hosting compute page currently lists Next support through 15; the repository uses 16.4.3. Treat native managed compute compatibility as BLOCKED/unverified until AWS confirms this exact version/feature set or an independently reviewed alternative adapter/host is chosen. Do not silently downgrade Next/React or claim successful hosting. The same documentation lists streaming and Edge API routes as unsupported for that provider. [Amplify Next support](https://docs.aws.amazon.com/amplify/latest/userguide/ssr-amplify-support.html)

Node 24 is separately listed as a supported Amplify SSR runtime; this does not resolve the Next major-version mismatch. [Amplify SSR runtime support](https://docs.aws.amazon.com/amplify/latest/userguide/ssr-supported-features.html)

AWS documents npm-workspace monorepos, appRoot/AMPLIFY_MONOREPO_APP_ROOT agreement and root build paths. A future configuration would install from the repository root with npm ci, build @welspun/web, and identify frontend/.next as the appropriate managed Next artifact under the selected build path. Verify these paths in a nondeploying packaging test before any hosting trial. [Amplify monorepos](https://docs.aws.amazon.com/amplify/latest/userguide/monorepo-configuration.html)

The future Next gateway requires runtime route support, forwarded secure cookies, no-store/private responses, exact callback host, request-size/deadline behavior and private/authenticated Express reachability. Preview branches must have no shared identity/database secrets. LMS_UI_PREVIEW is off by default in a hosted environment; an enabled fixture must remain visibly separate from any integration workflow. Do not place DB secrets in Next build/runtime merely because hosting accepts environment variables. No reliance on static export: the development routes are dynamic and future sessions need server execution.

## Lambda-compatible Express path

AWS documents nodejs24.x. A future event-handler adapter is possible, but current dist/server.js starts a listener and cannot be uploaded as an event handler unchanged. Keep createApp-style middleware composition separate from listen/signal and a new reviewed integration app factory; add a dedicated lambda entry and package the handler, runtime dependencies and source-map policy for the chosen Linux architecture. No adapter package is selected or installed here. [Lambda Node runtimes](https://docs.aws.amazon.com/lambda/latest/dg/lambda-nodejs.html)

The proposed baseline for evaluation is a conventional Lambda event handler behind an API Gateway HTTP API, not an unspecified long-running HTTP runtime. AWS now also documents other Lambda execution models; selecting them would require a separate assessment. For the conventional path, test method/path/query/raw headers, duplicate authorization/CSRF/header rejection, cookies/multiple Set-Cookie, base64 body, content-type/size limits, thrown async errors and request IDs. Gateway header normalization can alter rawHeaders behavior; existing duplicate-bearer tests must run through the adapter. Do not trust caller-supplied X-Forwarded-* or carry mutable request credentials between invocations.

Reuse one initialized connection/pool promise per warm execution environment with bounded reconnection after failure; keep user/session/transaction state per invocation. Do not connect/disconnect per request. Each concurrent Lambda environment still has its own pool, so reserved concurrency times pool/headroom must fit the shared Atlas budget. Do not cache current grants or active sessions as permanent process authority. [MongoDB Lambda connections](https://www.mongodb.com/docs/atlas/manage-connections-aws-lambda/), [Lambda execution reuse](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)

Standard Lambda invocation has a maximum 900-second timeout, but API Gateway HTTP integration has a 30-second maximum. The API must finish within the shortest gateway/client/session/transaction deadline with cold start, TLS/DNS, fence contention and commit retries included. Do not use the Lambda maximum as a request budget. Existing socket timeout 30 seconds leaves no safe margin for that ingress; proposed smaller budgets need failure testing. Long work must not run after an HTTP response. [Lambda limits](https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html), [HTTP API quotas](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-quotas.html)

The HTTP API page lists 10 MB payloads; conventional synchronous Lambda buffered invocation has a smaller 6 MB quota. Account for event/base64/header overhead and retain much smaller route-specific application bounds. Neither limit justifies enabling uploads here. Configure environment secrets at runtime through approved secret management/IAM, validate once and fail closed on incompatible APP_ENV/database/issuer. Do not set NODE_ENV=test to unlock services. Foundation readiness currently intentionally denies production; a new deployment-aware integration readiness contract is needed, not a global removal of this check.

Process-local rate limiting is not a multi-instance security control; agree gateway/WAF and application actor throttling, trusted ingress and storage trade-offs. Bounded reserved concurrency, alarms and private connectivity/stable egress must precede any shared-cluster load trial. Do not deploy public unauthenticated function URLs as a shortcut.

## CodeBuild or Jenkins

The existing GitHub workflow uses read-only checkout permissions, Node24, npm12, npm ci, audit, check and Chromium/Playwright; Mongo opt-in tests are not currently part of that CI job. Preserve these commands for portability. CodeBuild lists Node24 in its runtime versions; select a documented compatible Linux image/architecture explicitly and pin npm12 rather than using latest. [CodeBuild runtimes](https://docs.aws.amazon.com/codebuild/latest/userguide/runtime-versions.html)

Either CI system can run: clean checkout -> npm ci -> type/lint/format/unit -> explicit owned disposable replica-set tests -> builds -> browser regressions/guard -> package scan -> versioned artifacts. Choose one primary orchestrator; CodeBuild and Jenkins are alternatives, not four required infrastructure services. Add deployment only in a later approved pipeline with environment approval, least-privilege role, artifact provenance, health checks and rollback. No package installs, clean install or remote CI execution was performed by this audit.

Jenkins requires trusted isolated agents with Node24/npm12/browser prerequisites, a reviewed Jenkinsfile and scoped credentials. Credential masking is not protection against malicious pipeline code; never expose secrets to untrusted PR jobs or concurrent unrelated executors. Prefer short-lived workload identities to static AWS keys. [Jenkins credential binding](https://www.jenkins.io/doc/pipeline/steps/credentials-binding/)

Build/test stages need no shared Atlas secret; packaging must not contain .env files, tokens, test fixture credentials or privileged source maps. Deploy jobs should use immutable artifacts and distinct deploy/runtime identities. Publishing authorization and database migration approval are not CI bypasses. Changes to DB schema/indexes run as explicit reviewed setup jobs, not every Lambda cold start or frontend build.

## Future private worker

apps/worker currently logs queues disabled and exits; no Redis connection, job registration or HTTP handler. Preserve this. If BullMQ is later approved, it needs a private long-lived process/container with Redis reachability, idempotent handlers, bounded concurrency and shutdown/retry semantics. A conventional short-lived Lambda event handler is not a drop-in host for a persistent BullMQ polling worker. An ECS/Fargate-style private service is a possible future option; no cluster/service is selected. Using an AWS event queue instead would change the proposed queue architecture and needs a separate decision. Amplify does not replace the separate worker domain runtime, and no new domain microservice is needed.

## Decisions and evidence still required

Supervisor/IT must select hosting/provider mode, confirm Next16 support or approve a tested alternative, choose region/account/network, identity tenant/callbacks, API ingress/workload authentication, build orchestrator, secret management, Atlas egress/pool limits, backup/monitoring and budget/operations owners. Require packaging and cold/warm handler tests, public-route denial, session/cookie/origin behavior and dependency failure evidence before a separately authorized sandbox deployment. This document approves no deployment.
