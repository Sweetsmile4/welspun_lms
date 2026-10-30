# Phase 2C catalog design

29 October 2026. Reviewed the requested Phase 2A/2B/2B.1 reports and guides, release integrity, RBAC/API/open decisions, and actual fixture state, routes, authorization, release persistence and tests. Existing work is preserved. No corporate eligibility or withdrawal rule is inferred.

## Backend visibility

Add only explicit course.catalog.read. Neither author ownership, course.release.read, security administration, plant membership nor caller audience metadata automatically grants learner discovery. Conservative development eligibility requires this grant at organization, configured unit/subtree, or explicit course scope. Own scope is unsupported. Current actor/org, grants/latest roles and active scope ancestry are rechecked in the existing organization-fenced transaction. All results and counts are filtered before pagination. Missing authority denies; an authorized query with no matching releases returns an empty page.

Only courseReleases with lifecycle=published are queried. Latest eligible release per stable course is selected by greatest release number. Immutable stored course identity/scope must agree with the release snapshot; current configured scope must remain active. Draft lifecycle is not availability: archiving a draft does not withdraw releases. No inferred audience or withdrawal policy, public route, enrollment or progress is added. Corporate learner entitlement and cross-plant sharing remain unresolved.

Mongo adapter uses a set-based aggregation over authorized published releases, joins authoritative course identity, groups latest release, then applies literal title/code search and selected unit/subtree filter, stable course-ID cursor and bounded page (default 20/max 50). Totals exclude unauthorized courses and precede cursor slicing. Scope IDs are derived once from a bounded current unit tree (max 1,000), avoiding per-course authorization queries. Existing grant evaluation still performs its existing role lookups. Learner DTOs allow only published title/description/code, release identity/number/time, scope, module/lesson counts and safe published outline/content; no owner/editor IDs, pending review, approvals or feedback. Page and details share predicates. A cursor is not a snapshot across separate transactions; concurrent publication/new courses require refresh to see earlier IDs.

## Frontend state and catalog

A small React context/provider in the persistent development layout owns the existing synthetic courses, reviews, releases and selection. Existing editor reuses these state setters. In-app Next Link navigation across courses/reviews/catalog/details preserves state; no new global state package, browser storage, API or database. Hard reload, leaving/remounting the development layout or Reset Fixtures starts a fresh fixture. Reset clears published entries everywhere.

The catalog derives one latest release per course from the exact existing release objects. There is no independent catalog seed or second publication write. Details render the immutable published snapshot; draft edits/archive cannot alter it. Release History retains every version and all evidence, while the learner catalog intentionally omits evidence. Successful publishing adds View in Development Catalog, linked to the course details.

Synthetic catalog visibility is an explicitly labeled visual scenario: organization-wide or synthetic Plant A/Department A selection. It is not corporate eligibility or server authorization. Fixture forms/scopes remain fictional. Drafts, pending/approved/rejected reviews without releases never appear. All pages retain LMS_UI_PREVIEW=true opt-in; no privileged capability or credential is exposed. /catalog remains its employee placeholder.

## Boundaries and trade-offs

Internal catalog service is isolated-test composition with trusted synthetic identities/disposable MongoDB. Browser integration remains unavailable for Phase 2B.1's documented identity/session/origin/transport reasons. Public learner access, entitlement policy, withdrawal, caching, media, enrollment, certificates, simulations and deployment remain excluded. A bounded database aggregation is preferable to loading every release into Node or doing N+1 course calls. Shared in-memory context provides navigation continuity without making persistence claims. Phase 2D requires separate authorization.
