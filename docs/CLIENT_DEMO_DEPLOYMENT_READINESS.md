# Client Demo Deployment Readiness

## Ready for client review

- Serve the existing web application with the `/client-demo` route enabled.
- Use a normal browser origin so `localStorage` can retain progress during the demonstration.
- Verify the static production build and the focused Playwright walkthrough in the target environment.
- Confirm the visible fictional-data and non-SOP disclaimers remain present after deployment.

## Prerequisites

- Node and npm versions declared by the root `package.json`.
- Existing web build configuration and workspace dependencies.
- No database, Atlas cluster, identity provider, API secret, employee directory, or migration is required for this route.

## Explicit non-goals

Do not connect this route to SSO, production sessions, MongoDB, employee records, certificates, compliance reporting, or LMS publishing workflows. Do not treat browser-local progress as an official learning record. Clear the browser profile between client demonstrations when a clean starting state is required.

## Release gate

Run the typecheck, lint, focused unit and browser tests, and production build listed in `docs/CLIENT_DEMO_TESTING_GUIDE.md`. Record any skipped full-suite, environment-dependent, or visual-browser checks in the client handoff. No automatic deployment is part of this deliverable.