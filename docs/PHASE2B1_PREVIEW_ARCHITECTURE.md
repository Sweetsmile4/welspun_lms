# Phase 2B.1 preview architecture

29 October 2026. Reviewed Phase 2A/2B reports, designs, service/integrity guides, HTTP security boundary and actual Next routes/shell/styles, public contracts, draft/review services and regression tests. Existing employee routes remain placeholders.

## Two capabilities

**Working: UI fixture preview.** New development workspace uses only explicit synthetic, tab-memory fixtures. Course/module/lesson editing, ordering, archive, review assignment/decisions, readiness and immutable snapshot walkthroughs simulate the Phase 2A/2B behavior. Every outcome is labeled simulated. Reload/reset discards all edits. No employee accounts, authentication credentials, requests to domain APIs, localStorage, database, persistent audit or receipts are involved. Perspectives select visual scenarios, never impersonate a server identity.

**Unavailable: isolated integration.** No service or transport guard is loosened. Existing course services require NODE_ENV=test, explicit isolation, a trusted synthetic provider and same-session audit/receipt repositories. Next development mode, a secret in a public environment variable, browser role selectors or a loopback listener do not supply an approved browser identity/session boundary. No course HTTP router exists; real tests exercise internal methods. No browser-to-disposable-database lifecycle/session/CSRF/origin authorization transport exists. A secure bridge would require a separately reviewed trust-boundary expansion, authenticated test-session provisioning with no exposed synthetic credentials, server-side action/scope enforcement, disposal controls and independent end-to-end audit/retry tests. Those are exact blockers; integration mode is not implemented or selectable.

## Activation and routes

The fixture page requires an explicit server-only LMS_UI_PREVIEW=true flag. Without it, development URLs show a disabled explanation and no interactive workspace. The flag enables only nonsecret in-browser simulation, including when exercising a local production build; it never activates an API, identity or database. NODE_ENV=development alone is insufficient. Existing Next dev/start commands bind 127.0.0.1. This feature flag is an accidental-exposure guard, not an authentication mechanism. The fixture bundle contains no privileged capability and would remain synthetic if inspected. No preview API route, server action or credential issuer exists.

Routes: /development/courses and /development/reviews; development navigation is clearly separate from employee navigation. The same component presents authoring/review/release tabs. Existing branding, navy/sidebar shell, skip link and responsive employee routes remain. The admin dashboard remains an action-free public placeholder.

## Contracts and state

Safe text/content/metadata input schemas are extracted into packages/contracts and reused by backend and browser. Only those public input shapes move; private course/draft models, identities, review policy, repositories, answer keys and backend imports remain outside the frontend. Backend aggregate/session/authorization tests remain authoritative; sharing input validation does not turn browser validation into backend verification.

Fixture state uses synthetic perspectives (author, assigned reviewer, publisher, unauthorized), editable draft revisions, complete ordering, submitted content snapshots/digests and release snapshots. Approval count is an explicit synthetic scenario setting, not a corporate rule. Review changes bind revision and content digest; changed drafts fail readiness. Published fixture snapshots are cloned and never changed by later draft edits. Reviewer decisions carry a category (accuracy, clarity, safety, structure) and bounded message, mirroring the Phase 2B evidence shape without claiming backend persistence. The readiness panel exposes every fixture precondition, and the release card shows its synthetic identity, approval evidence and immutable snapshot. Simulation includes validation, disabled/denied perspectives, feedback, conflict demonstration and readiness reasons. There is no fake operational audit/receipt durability or corporate qualification claim.

No learner catalog/enrollment/progress/assessment/certificate/simulation, media storage, worker, production integration or deployment is added. SME count/qualification, corporate duties and policies remain unresolved as before. Stop after Phase 2B.1.
