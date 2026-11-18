# Welspun LMS � Backend branch

This branch contains only the backend application and its supporting shared packages.
`main` keeps the combined project. `dev-fe` is maintained separately.
The sibling application is maintained on `lms-dev-fe`.
Historical architecture and phase documents in `docs/` may describe both applications.

## Structure

- `backend/`: Express API, domain modules, platform adapters and API tests.
- `packages/contracts/`: versioned public DTOs and Zod schemas, kept identical across both branches.
- `packages/config/`: shared TypeScript settings.
- `backend/worker/`: backend background process entry point.
- `scripts/`: explicit isolated local database setup/test helpers.

## Install and run

Use Node.js 24 and npm 12. From the branch root:

```sh
npm ci
npm run dev
```

API listens on http://127.0.0.1:4000. Set `DATABASE_ENABLED=true` only with the approved `MONGOURI` and `DATABASE_NAME=welspun_lms_dev` values; the API then connects to that database before listening. The worker currently has no registered jobs.

```sh
npm run check
npm run start
```

Run the worker with `npm run dev:worker`. Database integration tests remain explicitly opt-in; see the guides in docs/.

Both branches install and build independently using local npm workspaces. No sibling
checkout or external private package registry is required. Changes to public
contracts must be synchronized deliberately between branches.

## Connected AWS demo

See [the AWS demo deployment guide](docs/AWS_DEMO_DEPLOYMENT.md) for Amplify frontend and Lambda/API Gateway backend setup. No real accounts or database are enabled.

## Account-based learning

See [the live LMS guide](docs/LIVE_LMS.md) for welspun_lms_dev, email/password accounts, persistent progress, administrator setup and AWS configuration.
