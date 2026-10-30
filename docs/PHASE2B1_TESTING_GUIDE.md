# Phase 2B.1 testing guide

29 October 2026. This guide covers the local synthetic UI preview only. It does not describe a production LMS workflow or browser integration with the Phase 2A/2B backend services.

## Start the frontend

From `C:\MY FOLDER\Work\welspun-lms`:

```powershell
npm ci
$env:LMS_UI_PREVIEW = 'true'
npm run dev:web
```

Open:

- `http://127.0.0.1:3000/development/courses`
- `http://127.0.0.1:3000/development/reviews`

The preview flag is server-only. Restart the frontend after changing it. It enables only in-browser synthetic fixtures; it does not enable an API, identity provider, database, or test credentials.

## Walkthroughs

### Course authoring

1. Open `/development/courses` and confirm the disclosure says `UI fixture mode · simulated actions only`.
2. Select `Course author` in `Visual perspective`.
3. Use `Create synthetic course` to create a course with a title, uppercase course code, description, language, tags, and one of the displayed synthetic scopes.
4. Open the new draft, edit its details, add modules, add text lessons, and add a structured lesson using JSON blocks of `paragraph`, `heading`, or `list` content.
5. Use the up/down controls to reorder modules and lessons. The displayed sibling order changes and the status says the action is simulated.
6. Use `Archive draft` to verify editing, submission, and publishing controls become unavailable.
7. Use `Reset fixtures` or reload the page to discard the tab-memory state.

The validation walkthrough can use a script tag in a title, a duplicate course code, blank required native fields, malformed structured JSON, unsafe structured content, oversized values, and invalid module/lesson counts. Each blocked action should produce a visible, field-specific message. Browser validation and fixture validation are UI checks only; backend validation is not being exercised.

### Review and publishing

1. Open the `Review workflow` tab or `/development/reviews`.
2. In the author perspective, choose one or two synthetic required approvals. This is an explicit scenario setting, not a Welspun policy or employee count.
3. Submit the complete draft. The review records the fixture revision and a synthetic SHA-256 digest in tab memory.
4. Stay in the author perspective and assign reviewer A (and reviewer B if the submission requires two approvals). Then select `Assigned reviewer`, choose the assigned reviewer scenario, and record `approve`, `changesRequested`, or `reject` with a feedback category and structured message. For two approvals, repeat the decision as the other assigned reviewer. The unassigned scenario must be denied visibly.
5. Select `Publisher`, run `Check readiness`, and inspect the checklist: active draft, lesson-bearing modules, exact revision, exact digest, assigned approval slots, independent approvals and next release number. Publish only after the configured synthetic approvals are complete. All results say `Simulated`.
6. Open `Release history` and inspect the release number, release ID, source/submitted revision, digest, timestamp, approval evidence with structured feedback, and snapshot details.
7. Edit the draft after publishing and return to release history. The release card remains unchanged, demonstrating fixture snapshot immutability.
8. Use `Demo revision conflict` before publishing to confirm stale review/readiness is blocked. The readiness panel shows the failing revision/digest checks.
9. Use the tabs with the keyboard: Left/Right move between views, and Home/End jump to the first or last view.

### Unauthorized perspective

Select `Unauthorized visitor · synthetic`. The workspace shows an access-unavailable state and hides draft editing, review decisions, and publishing. This is a visual scenario, not an authorization test. No production impersonation or role bypass exists.

## Automated checks

Run ordinary checks, including typecheck, lint, formatting, unit/integration tests, builds and the worker smoke check:

```powershell
npm run check
```

Ordinary tests are 122 passing with 112 opt-in Mongo tests skipped. The opt-in Mongo suite can be run against a disposable local replica set when an installed `mongod` binary is available:

```powershell
$env:START_LOCAL_MONGO_FOR_TESTS = 'true'
$env:MONGOD_BINARY = 'C:\Program Files\MongoDB\Server\8.0\bin\mongod.exe'
npm run test:mongo:local
```

That command creates a temporary database under `work/`, starts a loopback-only replica set, runs the existing Phase 2A/2B Mongo suites, and stops the temporary processes. It never connects to a corporate or existing MongoDB service.

Check the preview opt-out guard:

```powershell
node scripts/check-preview-disabled.mjs
```

Run the desktop and mobile Playwright suite. Chromium must be installed first:

```powershell
npx playwright install chromium
$env:PLAYWRIGHT_PORT = '4317'
npm run test:e2e
```

Playwright starts a built local server with `LMS_UI_PREVIEW=true`, refuses to reuse an existing server, checks that preview pages make no `/api/*` requests, and covers the existing employee route regressions. Run `npm run build` (or `npm run check`) once before a standalone suite run. The suite currently passes 22 tests across desktop and mobile. Use an unused loopback port if port 3000 is occupied.

## What is and is not exercised

Working and simulated:

- course listing and creation
- metadata and bounded content editing
- module/lesson ordering
- archive and field-specific validation states
- review submission and assignment
- reviewer decisions and category-based structured feedback
- readiness checklist and blocked-readiness reasons
- release display with immutable approval evidence
- stale revision/digest conflict behavior
- immutable release snapshot display
- unauthorized visual state
- keyboard-accessible tabs and responsive desktop/tablet/mobile layout
- existing route regressions

Unavailable by design:

- no action persists after reload
- no browser storage is written
- no action reaches a course or publishing service
- no real authorization, audit, receipt, revision CAS, Mongo transaction, or idempotent retry is exercised from the browser
- no synthetic credentials or backend identity is exposed
- no employee records, production SSO, corporate database, or production API is used

The existing backend service tests remain separate. Use `npm test` for ordinary backend tests and the repository's explicitly opt-in Mongo command only with disposable local MongoDB, as described in the Phase 2A/2B service guides. Those suites do not turn the browser preview into integration mode.

## Reset and security verification

Fixture state resets by reloading the page or selecting `Reset fixtures`; the preview writes neither localStorage nor sessionStorage and has no server-side fixture store. Verify with DevTools that these browser storage areas remain unchanged after authoring, reviewing and publishing; unrelated existing entries need not be empty or deleted. To verify the guard, build the web app, and run `node scripts/check-preview-disabled.mjs`. It starts its own loopback production server with `LMS_UI_PREVIEW=false` and verifies both development routes are disabled and `/api/preview` returns 404.

Do not set a corporate Mongo URI, add real identities, expose the preview on a public interface, or treat a simulated approval/release as technical or corporate approval. Isolated browser integration remains blocked pending a separately reviewed authenticated test-session boundary, server-side scope enforcement, CSRF/origin controls, disposable database lifecycle, and dedicated persistence/audit/retry tests.
