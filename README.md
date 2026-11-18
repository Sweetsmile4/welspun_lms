# Welspun LMS � Frontend branch

This branch contains only the frontend application and its supporting shared packages.
`main` keeps the combined project. `dev-fe` is maintained separately.
The sibling application is maintained on `lms-dev-be`.
Historical architecture and phase documents in `docs/` may describe both applications.

## Structure

- `frontend/`: Next.js application, components, pages and utilities.
- `packages/contracts/`: versioned public DTOs and Zod schemas, kept identical across both branches.
- `packages/config/`: shared TypeScript settings.
- `tests/`: frontend unit and Playwright tests.
- `scripts/`: preview guard helpers.

## Install and run

Use Node.js 24 and npm 12. From the branch root:

```sh
npm ci
npm run dev
```

Frontend listens on http://127.0.0.1:3000. Set the server-only LMS_UI_PREVIEW=true flag to enable fixture previews.

```sh
npm run check
npm run start
```

Browser tests: `npx playwright install chromium`, then `npm run test:e2e -- --workers=1`. Set PLAYWRIGHT_PORT to an unused loopback port if 3000 is busy.

Both branches install and build independently using local npm workspaces. No sibling
checkout or external private package registry is required. Changes to public
contracts must be synchronized deliberately between branches.

## Connected AWS demo

See [the AWS demo deployment guide](docs/AWS_DEMO_DEPLOYMENT.md) for Amplify frontend and Lambda/API Gateway backend setup. No real accounts or database are enabled.

## Account-based learning

See [the live LMS guide](docs/LIVE_LMS.md) for welspun_lms_dev, email/password accounts, persistent progress, administrator setup and AWS configuration.
