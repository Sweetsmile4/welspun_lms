# Phase 2C implementation report

29 October 2026. Internal authorized catalog and shared fixture publishing-to-discovery increment. No production HTTP catalog, real employee data, browser-to-MongoDB bridge or Phase 2D implementation.

## Audit and resulting change

Reviewed Phase 2A/2B/2B.1 reports, preview architecture/testing, review/release integrity guides, RBAC/API/open decisions and actual Next routes, fixture state, immutable release stores, authorization/fencing and tests. Preserved the existing authoring/review UI. The missing connection was page-owned React fixture state and the absence of a discovery projection: published versions were only displayed in Release History.

The development catalog now derives its cards/details from the **same release objects** created by the existing publish handler. There is no second catalog dataset, publish action or copy into a simulated backend. Release History retains every immutable snapshot/evidence; the catalog shows only the latest visible release per stable course. /catalog remains the employee placeholder.

## Backend catalog services and visibility

New `catalog/discovery` owns a typed CatalogStore, strict query/output schemas, createCatalogService and a same-session Mongo aggregation adapter. Internal methods: list eligible published entries and retrieve latest visible published details. No mutation, receipt contract change, audit event or collection is needed for these reads; existing Phase 2B publication stays atomic and authoritative.

Added one explicit action, course.catalog.read. Supported development scopes: organization, active unit/subtree or explicit course resource. Own grants, author ownership, employee membership, security administration, existing release-read rights and audience metadata confer no discovery access. Current trusted actor/org, grants/latest active role versions and active unit ancestry are reevaluated inside the existing organization fence. This conservative rule is not approval of Welspun learner eligibility.

The Mongo query filters organization/published lifecycle/authorized active scopes and joins stored course identity/scope, selects greatest eligible release number per course, then applies escaped literal title/code search, selected unit/subtree intersection, stable course-ID cursor and a bounded facet (default 20/max 50). Counts are authorized and filtered before cursor slicing. There are no application N+1 course fetches or unbounded release arrays loaded into Node. Current tree expansion is capped at 1,000. Existing role-grant evaluation costs remain.

Learner DTOs include title/description/code, immutable course/release IDs and release number, scope ID, publication time and module/lesson counts. Detail adds bounded published outline and safe content only. No pending review, feedback, approval evidence, author/editor identity or raw Mongoose document is returned. Draft edits cannot affect returned content. Archive is not withdrawal; releases survive it. Historical evidence remains in the publishing service.

Trade-offs: set-based grouping reuses existing course/release indexes and avoids a maintained catalog pointer, but still processes matching historical releases. No production query-plan/load capacity or across-request paging snapshot is claimed. Concurrent new courses before a cursor require refresh. No withdrawal/availability or HR audience rule is invented. See the catalog design and service guide.

## Shared frontend fixture architecture

A small React provider in the persistent /development layout owns existing synthetic drafts, selection, review records, releases, perspective and visibility scenario. The editor reuses these state setters; it was not rebuilt. Busy state and operation notices are shared too, preventing navigation from losing a pending action's status. Reset is disabled during a pending action to avoid stale callbacks restoring cleared fixture data. No external state library or browser persistence was added.

New routes:

- /development/catalog — cards, code/title search, scope filter, explicit synthetic visibility scenarios and empty states.
- /development/catalog/[courseId] — latest visible immutable published snapshot and module/lesson content, without review feedback.

Existing /development/courses and /development/reviews share the provider. Normal Next Link navigation preserves fixtures. Full reload, a new browser tab, leaving/remounting the development layout or Reset Fixtures creates fresh state; no persistence is claimed. The server-only LMS_UI_PREVIEW=true check guards every page and the provider. No production guard or backend identity capability is weakened.

Publishing exposes **View in Development Catalog** on the release card. New release → one latest course card; later releases replace that card while older history stays intact. Editing/archiving drafts does not alter catalog snapshots. Duplicate publishing is blocked by existing simulated readiness state. Synthetic organization/plant/department/no-access scenarios are labeled visual examples, not employee eligibility. Existing navy/blue styling, employee navigation and placeholders are preserved; sidebar scrolling accommodates the additional development link.

## Test evidence and validation

Six shared ordinary/real Mongo scenarios cover published-only projection; draft/approved/rejected exclusions; latest versions and immutable details; archive preserving published content; scope filtering before counts/pagination; cross-plant/sibling/organization isolation; literal title/code search; explicit course grants; audience/membership/own non-authority; revoked grants and disabled actors; private-field omission and bounded/test-only guards.

New browser scenarios create a course from scratch, add content, review/approve, prove unpublished states remain hidden, publish, navigate through all development views, open snapshot details and verify no review feedback/domain API call; update to a newer release while preserving older history; reject duplicate publish; archive without withdrawal; search/filter/visibility; shared reset and reload; mobile layout. Existing authoring/review/employee regressions remain.

The opt-out harness covers all four development route shapes with explicit false and absent runtime flags. Its owned prepared Next test process can remove the effective runtime flag without editing an existing user .env that intentionally enables preview. The viewport-independent unset check runs once in Playwright's desktop project; its mobile duplicate is intentionally skipped.

| Executed check                         | Result                                                                                                                   |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Ordinary unit/API tests                | 128 passed; 118 opt-in tests intentionally skipped                                                                       |
| Disposable local MongoDB suite         | 117 passed, 1 optional performance benchmark skipped; 37.19 seconds                                                      |
| npm run check                          | PASS: workspace/tool TypeScript, lint, formatting, 128 ordinary tests, API/web/worker production builds and worker smoke |
| Final Playwright desktop/mobile run    | PASS: 29 tests; 1 duplicate viewport-independent server guard intentionally skipped; 30.5 seconds                        |
| Explicit false and unset opt-out guard | PASS: every development workspace disabled; no preview API route                                                         |
| Disconnected API / worker startup      | PASS: foundation responses/default identity denial; no outbound attempt or URI logging; queues disabled and worker exits |
| Dependency audit                       | PASS: zero vulnerabilities                                                                                               |

Initial validation found a foreign-organization test incorrectly using the first fixture's identity provider; the fixture composition was corrected, without changing authorization. A new server-only browser guard test had an empty destructuring lint error, corrected without disabling rules. A browser run then caught a navigation-timing issue with page-local operation notices: shared busy/notice state and destination-URL waits now address it. Failed/intermediate runs are not claimed as final passes. Browser color-environment warnings are cosmetic.

Real backend service checks and simulated UI checks are distinct: no browser action tests Mongo persistence, real learner authorization, audit durability or receipt replay. The local Mongo runner owns/disposes its synthetic databases and loopback process; no existing/corporate service is used. No dependencies or major infrastructure were installed. No remote CI, clean reinstall, production deployment, restore/failover drill or independent security assessment was executed. No production capacity claim.

## Files created / modified

Created:

- apps/api/src/modules/catalog/discovery/service.ts and mongo-store.ts.
- apps/api/test/catalog-scenarios.ts, catalog.test.ts and catalog.mongo.test.ts.
- apps/web/src/components/preview/provider.tsx and catalog.tsx.
- apps/web/src/app/development/layout.tsx, catalog/page.tsx and catalog/[courseId]/page.tsx.
- scripts/preview-guard-server.mjs and tests/e2e/catalog.spec.ts.
- This report, docs/PHASE2C_CATALOG_DESIGN.md, docs/PHASE2C_CATALOG_SERVICE_GUIDE.md and docs/PHASE2C_FRONTEND_PREVIEW_GUIDE.md.

Modified:

- Identity authorization action vocabulary and action/lifecycle mapping: only new catalog permission.
- apps/api/test/course-fixture.ts: rollback-capable catalog memory projection.
- package.json: include catalog suite in explicit Mongo command.
- Existing preview workspace: reuse shared state, keep operation status across navigation, shared reset and publish-to-catalog link.
- Existing shell: development catalog navigation and scrollable desktop sidebar.
- scripts/check-preview-disabled.mjs: false/unset harness and all development route guards.
- README.md: current phase and guide links.

Pre-existing Phase 2B.1 report/testing-guide edits were preserved. No staging/commit/reset, prototype change, dependency/lockfile update, normal API registration, production authentication, real hierarchy/records, enrollment/progress, assessment/certificate, simulation, storage, worker activation or deployment.

## Remaining decisions and stop boundary

Corporate approval is still needed for real learner entitlement, cross-plant sharing, audience semantics, confidential content visibility, withdrawal/availability, identity/directory integration, data retention/backup/IAM and operational acceptance. Explicit development grants are a conservative internal boundary, not corporate policy. Phase 1B/2B security/retention/receipt limitations remain. Browser integration is still unavailable for the documented identity/session/origin/transport reasons.

Manual walkthrough and exact URLs are in docs/PHASE2C_FRONTEND_PREVIEW_GUIDE.md. Use one tab and in-app development links: Create Course → add module/lesson → Submit → author assigns reviewer → reviewer approves → Publisher publishes → View in Development Catalog. Refresh clears fixtures. Stop after Phase 2C; do not begin Phase 2D automatically.

Final browser evidence includes all 22 prior preview/employee route regressions plus six catalog viewport journeys and one server-only unset-flag check. Only the duplicate mobile invocation of that server-only check is skipped. The final ordinary run has 15 passing files and 9 opt-in skipped files; 117 of the 118 skipped tests were separately executed on local MongoDB, with only the optional performance benchmark left skipped. The desktop catalog screenshot was inspected for visual consistency. Final results leave no failing required check; Phase 2C is ready for review.
