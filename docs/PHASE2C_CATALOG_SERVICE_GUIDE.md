# Phase 2C internal catalog service

29 October 2026. Isolated backend read services only. No production or browser HTTP catalog endpoint is registered. Browser fixture tests and these service tests are separate.

## Composition and authority

`createCatalogService(repository, store, identity, { isolatedTest:true, clock? })` requires NODE_ENV=test and the trusted synthetic-test identity provider at construction and every call. Use the existing authorization repository and its organization-fenced transaction. `createMongoCatalogStore(connection, sessionFor)` requires the same active mapped ClientSession; it neither connects nor initializes infrastructure. Initialize existing course/release indexes through their owning stores before use. Raw persistence ports are trusted server composition, not end-user authorization APIs.

An explicit `course.catalog.read` grant is required. Supported scopes: organization; an active configured unit with optional descendants; or an explicit course resource. Own grants, author ownership, employee membership, security administration and course.release.read do not imply discovery access. Caller metadata/audience cannot grant access. This is a conservative development authorization rule; it does not settle Welspun learner eligibility.

Current actor/org, valid grants/latest active role versions and current unit ancestry are rechecked. Scope IDs come from a bounded current organization tree (maximum 1,000); inactive units/ancestors are excluded. A selected unit filter narrows the visible intersection, never expands it. A cross-organization/missing/inactive filter fails closed. Missing catalog authority gives FORBIDDEN; an authorized empty result gives a zero-count page. Unknown/inaccessible details use the same FORBIDDEN concealment.

## Operations

`list(credential, organizationId, query={})` accepts a strict allowlist:

| Field | Rule |
| --- | --- |
| search | Optional trimmed text ≤100 characters; literal case-insensitive title/code substring, not a caller regex or Mongo operator |
| scopeUnitId | Optional configured plant/department ID; narrows to this unit/subtree intersected with granted visibility |
| courseId | Optional internal exact stable-course selector |
| limit | Integer 1–50, default 20 |
| cursor | Optional last returned stable course ObjectId |

Returns `{items,total,nextCursor}`. Each item contains only courseId, releaseId, releaseNumber, title, description, code, scopeUnitId, publishedAt (UTC ISO), moduleCount and lessonCount. No pending review, approval decision/feedback, owner/editor identity or arbitrary metadata appears. Totals are computed after authorization/search/scope/latest-release selection but before cursor slicing. Paging orders by stable course ID. Concurrent publication between requests can change content/totals; no cross-request snapshot or signed cursor capability is claimed. Refresh to discover new courses preceding the cursor.

`details(credential, organizationId, courseId)` applies the same visibility/latest-release predicates, then returns the item plus bounded modules/lessons: ID, position, title, description and safe published lesson content. It does not read mutable drafts for content and does not include approval evidence. Immutable release ID/number lets a caller identify exactly which version is shown. It is an internal read contract, not enrollment or an authorization to teach unapproved industrial values.

## Published selection and query behavior

Only `courseReleases` with lifecycle=published and the matching organization enter the query. Authorized active scope filters and authoritative course identity/scope agreement precede results/counts. A set-based lookup to courses avoids application N+1 fetches; greatest release number selects one eligible release per course. Search applies to that selected release, so an older matching title cannot resurrect an obsolete version. A facet applies bounded paging and counts consistently in one transaction.

Existing organization/course/number and identity indexes support the organization/source lookups. Grouping/sorting still processes matching historical releases; no production capacity claim or materialized catalog index was introduced. Representative data/query-plan/load work may justify a maintained read model later, but a separate pointer is unnecessary for this bounded foundation. Existing per-grant role lookups and organization fence costs remain. No new collection, mutation, audit event or receipt version is needed for catalog reads; publication remains the existing atomic Phase 2B command.

Course identity ownership/scope is immutable in this phase. Current draft archival does not withdraw an existing release. Historical releases and approval evidence remain in the publishing module; catalog DTOs deliberately do not expose them. No withdrawal, availability scheduling, HR audience entitlement, cross-plant sharing, enrollment or progress policy is invented. Future release lifecycle changes need explicit reviewed predicates and tests.

## Verification and limitations

Shared memory and actual disposable Mongo scenarios cover draft/approved/rejected exclusions; published-only projection; private-field omission; immutable detail body; newer release selection; edits/archive preserving snapshots; scoped filters before totals; sibling/plant isolation; literal search/code search; stable pagination; separate organizations; audience/membership/own non-authority; explicit course grant; revocation/disabled actor; bounded input and production guard. Existing publication/receipt/audit regressions remain authoritative and unchanged.

Ordinary: `npm test`. Real local transactions: set START_LOCAL_MONGO_FOR_TESTS=true and MONGOD_BINARY to the existing local binary, then `npm run test:mongo:local`. No shared/corporate cluster is used. The UI makes no calls to these services. Production SSO, learner eligibility approval, infrastructure IAM, retention/withdrawal, monitoring and independent security review remain unresolved.
