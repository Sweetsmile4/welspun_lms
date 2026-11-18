# Account-based Welspun LMS

## Audit and preserved work

The existing project contained tested identity/course/review domain foundations,
fixture-only demo learning, a disconnected integration client, and partial catalog
screens. Several older domain services explicitly support isolated synthetic tests
only. They were not silently enabled for production. The existing Mongo adapter,
environment edits and catalog UI work were preserved and extended.

The running application now adds a separate account-based runtime: email/password
registration and login, hash-only server sessions, an authenticated catalog,
enrollments, private server-checked quiz answers, durable learner progress,
completion records, administrator reporting and simple course publication. The five
existing courses and their reference PDFs/simulations are retained. Live lessons
include simulations and the helical calculator where their metadata enables them.
Demo routes remain available separately and do not grant live account privileges.
Editable browser-demo progress is not automatically imported into real accounts.

## Database

Only DATABASE_NAME=welspun_lms_dev is accepted for the shared runtime. The adapter
also supplies dbName explicitly, accepts an empty URI path or that exact database,
and rejects a different database path or disabled TLS. No other cluster database is
listed, read, seeded or modified. Existing organizations are not overwritten.

Runtime collections are lms_accounts, lms_sessions, lms_courses, lms_enrollments and
lms_attempts. Course setup uses setOnInsert and preserves existing course content.
Quiz keys and password hashes are never returned by catalog/account endpoints.
The Windows-only LMS_WINDOWS_SYSTEM_DNS=true compatibility flag uses the existing
Windows resolver for SRV/TXT records, validates returned hosts, preserves TLS and
never selects a public DNS server. Leave it unset on Linux/AWS.

## Local run

Backend branch, from its root:

```powershell
npm ci
npm run setup:lms
npm run dev
```

backend/.env must contain the server-only MONGOURI and these settings:

```dotenv
DATABASE_NAME=welspun_lms_dev
DATABASE_ENABLED=true
LMS_LIVE_ENABLED=true
LMS_REGISTRATION_ENABLED=true
LMS_FRONTEND_ORIGIN=http://127.0.0.1:3000
PORT=4399
```

Frontend branch, frontend/.env.local:

```dotenv
LMS_BACKEND_ORIGIN=http://127.0.0.1:4399
LMS_ALLOW_LOOPBACK_BACKEND=true
LMS_LIVE_ENABLED=true
LMS_FRONTEND_ORIGIN=http://127.0.0.1:3000
```

Run npm ci then npm run dev from the frontend branch root. Open /login to create a
learner account. /dashboard and /my-learning show account enrollments; /catalog
loads published courses; /certificates shows earned completion records.

There is no default administrator password. After registering the intended owner,
run this explicit command from the backend branch root:

```powershell
npm run admin:grant -- owner@example.com
```

Only that existing active account receives the admin role. /admin then provides
learner reporting and a form for publishing a basic course. Learners cannot select
roles during registration or call administrator endpoints.

## Sessions and assessment behavior

Passwords use salted scrypt. Session tokens are random, HttpOnly and SameSite=Lax;
only SHA-256 token hashes are stored. Production cookies are Secure. Sessions expire
after eight hours, and logout revokes the current token. Every authenticated request
rechecks the active account and current role. POST operations require the exact
configured frontend Origin and JSON. The frontend gateway only forwards the named
session cookie to one fixed backend and allowlists paths, methods/query keys,
request/response sizes and timeouts.

Enrollment/progress is scoped to the authenticated account. An incorrect answer is
stored as an attempt but does not complete a lesson. Correct answers add lesson IDs
idempotently. Completing every lesson creates one stable completion reference.
These printable completion records are learning records, not accredited industrial
certificates, regulatory compliance evidence or operating authorizations.

## AWS

Use template.live.yaml for the account-based backend; template.yaml remains the
read-only demonstration template. Store the MongoDB URL in an existing AWS Secrets
Manager JSON secret under MONGOURI. The deployment role needs permission to resolve
that secret. The value is resolved into backend Lambda environment configuration;
restrict access to Lambda configuration and never copy it into frontend variables.

```sh
npm ci
npm run build:lambda
sam validate --lint --template-file template.live.yaml
sam deploy --guided --template-file template.live.yaml --resolve-s3 --capabilities CAPABILITY_IAM
```

Supply the exact HTTPS Amplify origin and secret ARN. Decide whether public learner
registration should be enabled; it defaults off in the cloud template. Seed courses
with the explicit backend setup command using approved server-side configuration.
Configure Atlas network access with an approved AWS egress path; do not broadly open
Atlas networking merely to make deployment succeed.

Amplify uses the existing amplify.yml. Set LMS_BACKEND_ORIGIN, LMS_LIVE_ENABLED=true
and LMS_FRONTEND_ORIGIN to the exact frontend HTTPS origin. The build helper writes
only the allowlisted non-secret settings for the server runtime. No AWS resources
are created simply by pushing these branches unless the account already has a
deployment pipeline configured. SAM CLI/cloud deployment needs separate validation
in the configured AWS account.

## Verification and remaining production work

Ordinary checks use no shared database. Set MONGOD_BINARY to an installed mongod
binary to run backend/test/live-lms.test.ts against an owned disposable database.
The browser fixture tests/fixtures/live-server.ts similarly creates a private local
MongoDB process; it never loads the shared backend env. On the frontend set
LMS_TEST_LIVE=true, LMS_LIVE_ENABLED=true, PLAYWRIGHT_PORT=4321 and point the gateway
to the fixture API on port 4401 before running tests/e2e/live-lms.spec.ts.

Before public employee production, decide and implement password recovery/email
verification, account lifecycle/offboarding, persistent distributed authentication
rate limits, audit retention/backups, monitoring, content governance and approved
certificate policies. Existing review/publishing authorization prototypes are still
isolated and have not been represented as a completed production approval workflow.
The readiness response deliberately keeps productionReady=false for those broader
organizational guarantees. Existing development-tool dependency audit findings
must also be addressed before treating the repository as fully production approved.
