# Phase 2C frontend preview guide

29 October 2026. All UI actions remain simulated. They share one React in-memory fixture state and never call a domain API or database. Existing backend service tests separately verify real authorization and transactions.

## Start and URLs

From `C:\MY FOLDER\Work\welspun-lms`, with the existing installed dependencies:

```powershell
$env:LMS_UI_PREVIEW='true'
npm run dev:web
```

Open these URLs on the same running frontend:

- http://127.0.0.1:3000/development/courses — create/edit drafts and inspect release history.
- http://127.0.0.1:3000/development/reviews — review the selected course using shared fixtures.
- http://127.0.0.1:3000/development/catalog — latest visible simulated releases, search and filters.
- http://127.0.0.1:3000/development/catalog/COURSE_ID — published snapshot details; use the generated link rather than inventing an ID.
- http://127.0.0.1:3000/catalog — unchanged employee placeholder, intentionally separate.

If port 3000 is occupied, use `npm run dev -w @welspun/web -- --port 4320` and replace 3000 in the URLs. Do not start two servers on the same port. The repository commands bind loopback. Changing the server-only flag requires restarting the server. This is a local fixture flag, not production authentication or a backend enablement switch.

## Create → review → approve → publish → catalog

1. Open the course workspace. Confirm the simulated-fixture disclosure; select Course author.
2. Click Create synthetic course. Enter a title, unique uppercase code, description, language and tags; select a synthetic scope. Create it.
3. Add a module, then Add lesson to that module. Enter a title and safe plain text, or validated structured paragraph/heading/list JSON. Every module needs a lesson before review.
4. Open Review workflow. Keep the desired synthetic approval count (scenario configuration, not corporate policy). Submit the exact revision.
5. While still the author, assign reviewer A (and B if two approvals are configured).
6. Switch Visual perspective to Assigned reviewer, choose the assigned scenario, add structured category feedback and approve. Repeat as the second assigned reviewer if required. No real reviewer qualification is claimed.
7. Switch to Publisher, Check readiness, then Publish simulated release. Release History contains the cloned snapshot/evidence.
8. Click **View in Development Catalog** on the release card. It opens the published content details immediately. The same release object powers this view; there is no second catalog publishing step.
9. Click Back to Development Catalog, or use the development navigation link. The course appears automatically with code/title/description, release number, scope and module/lesson counts. Open published course to inspect its outline and text. Approval feedback remains in Release History, not this learner-facing view.

Use normal in-app links and tabs during the walkthrough. Opening a URL in a new browser tab or hard reloading starts a fresh context with no synthetic releases. Do not type a URL and reload expecting tab-memory fixtures to persist.

## Consistency checks

- Before publication: drafts, approved-but-unpublished and rejected submissions do not create catalog entries. The initial catalog is empty; its entries are not hardcoded.
- After publication: edit the draft title/content, then navigate to the catalog. The previous published title/content remains until a new revision is reviewed and published.
- Publish a newer revision: the catalog has one card for the latest eligible release; Release History still has both versions. The older immutable snapshot stays unchanged.
- A duplicate publish attempt is blocked by the existing simulated review/readiness state; it cannot add another card.
- Archive a draft after publication: the catalog still shows its published snapshot. Archival is not automatic withdrawal.
- Search by title or code; change the scope filter. The visible set narrows without changing any draft or release.
- Synthetic learner visibility selects organization-wide, Plant A, Department A or no access scenarios. These are explicitly fictional UI cases, not current employee membership or corporate policy.
- Reset Fixtures from the catalog or workspace clears shared courses/reviews/releases/selection and visibility consistently. All catalog cards disappear. Reload or leaving/remounting the development layout also resets tab-memory fixtures. Search/filter UI inputs are local to the catalog view, not persisted data.

## Automated verification and guards

```powershell
npm run check
$env:START_LOCAL_MONGO_FOR_TESTS='true'
$env:MONGOD_BINARY='C:\Program Files\MongoDB\Server\8.0\bin\mongod.exe'
npm run test:mongo:local
$env:PLAYWRIGHT_PORT='4317'
npm run test:e2e
node scripts/check-preview-disabled.mjs
node scripts/check-preview-disabled.mjs --unset
npm audit --audit-level=high
```

Run the production build (`npm run build` or check) before standalone Playwright/opt-out checks. Playwright uses a separate loopback server with the fixture flag enabled and refuses to reuse an existing server. Backend Mongo suites use only an owned disposable local replica set, not the frontend.

The opt-out harness verifies workspace, review, catalog and catalog-detail routes. For --unset it clears the effective runtime flag in its own prepared test server, without editing your existing .env (which may deliberately enable the preview). Default invocation tests explicit false. No public API is introduced. The viewport-independent unset guard runs once in the desktop Playwright project; its mobile duplicate is intentionally skipped.

UI tests cover the complete newly-created-course journey, in-app state continuity, drafts/approved exclusions, latest release changes, older history, archive, immutable details, duplicate publish denial, search/filter/visibility, reset/reload and responsive layout, plus all Phase 2B.1 regressions. These tests demonstrate UI simulation, not database persistence, production authorization, real reviewer approval, audit durability or receipt replay.

## Still unavailable

No browser-to-backend integration, real identity, corporate course data, public catalog endpoint, enrollment/progress, assessment/certificate, simulation, media, worker job or deployment. Real learner eligibility, course sharing and release withdrawal require approval. Phase 2D has not begun.
