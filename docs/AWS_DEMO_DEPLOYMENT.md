# AWS connected demo deployment

This deployment is a public synthetic demonstration: no real accounts, SSO, database
or shared learning records. Course assignments come from the backend. Interactive
lesson content stays bundled in the frontend, and progress remains in the browser.
When no backend is configured the portal explicitly labels local mode. An upstream
failure shows an unavailable notice and a retry control instead of claiming a connection.

## Backend first — branch lms-dev-be

Amplify Hosting runs the Next.js frontend, not a long-running Express listener.
Deploy the backend AWS SAM template as Lambda plus an API Gateway HTTP API.
Install AWS CLI and SAM CLI, authenticate to your AWS account, choose a region, then:

```sh
npm ci
npm run check
npm run build:lambda
sam validate --lint
sam deploy --guided --template-file template.yaml --resolve-s3 --capabilities CAPABILITY_IAM
```

Choose a demo stack name and region in the guided prompt. Deployment creates billable
AWS resources. The template exposes only GET /api/v1/health and GET
/api/v1/demo/bootstrap. Other domain routes are not mapped. The Lambda has basic log
permissions, no database credentials, and DEMO_API_ENABLED=true. Do not deploy the worker.
Use the BackendOrigin stack output, such as https://API_ID.execute-api.REGION.amazonaws.com.
Use the $default stage: adding a stage prefix is not supported by the fixed gateway.
The API is intentionally public and read-only with synthetic course metadata. API
Gateway throttles traffic; Express rate limiting is per Lambda instance. AWS account
budgets and API monitoring remain operational settings.

## Frontend — branch lms-dev-fe

1. Create/select an Amplify Hosting app connected to the GitHub repository.
2. Deploy only lms-dev-fe. Set AMPLIFY_MONOREPO_APP_ROOT=frontend. Use the AL2023 build image.
3. Set LMS_BACKEND_ORIGIN to the exact HTTPS BackendOrigin output (no trailing slash,
   path, credentials or query). Do not prefix the variable with NEXT_PUBLIC_.
4. Use the committed amplify.yml; it installs from the repository root, builds the
   frontend workspace, and publishes frontend/.next. Build-time environment values
   are written through an explicit allowlist into the server runtime environment.
5. Redeploy after changing LMS_BACKEND_ORIGIN. Open /dashboard (also available at
   /client-demo/dashboard) and verify
   “Demo API connected”. Do not add an SPA catch-all rewrite to this SSR app.

The browser calls its own /api/backend/demo route. Next.js contacts the one fixed
upstream /api/v1/demo/bootstrap endpoint. No CORS configuration is required, and no
browser cookies, user identity claims or credentials are forwarded. Redirects, invalid
schemas, excess response size and timeouts fail closed. Lesson actions do not write
to the API. The production readiness endpoint remains false for real employee use;
use /api/v1/health as the infrastructure liveness check.

## Local connection and verification

On lms-dev-be, set DEMO_API_ENABLED=true and PORT=4399 before npm run dev. On the
frontend, set LMS_BACKEND_ORIGIN=http://127.0.0.1:4399 and
LMS_ALLOW_LOOPBACK_BACKEND=true in frontend/.env.local, then npm run dev. This flag
only permits explicit loopback HTTP and is never written by the Amplify build helper.

For the integrated browser check, build both apps, run the built backend with those
settings, and run the frontend tests with the same origin/loopback flag and
LMS_TEST_CONNECTED_DEMO=true. Set PLAYWRIGHT_PORT to an unused port. Ordinary CI
runs the explicit local-demo variant without requiring a sibling checkout.

## Runtime compatibility

Next.js is pinned to the patched 15.5 line because AWS documents Amplify Hosting SSR
support through Next.js 15. The frontend pins PostCSS 8.5.33 to patch the older
transitive version bundled by that Next.js line. Source: https://docs.aws.amazon.com/amplify/latest/userguide/ssr-amplify-support.html
Monorepo settings: https://docs.aws.amazon.com/amplify/latest/userguide/monorepo-configuration.html
The backend uses Lambda nodejs24.x. Source: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
This repository prepares infrastructure; pushing a branch does not create an AWS app
or stack unless your AWS account has separately configured deployment automation.
