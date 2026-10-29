# Phase 2 entry criteria

29 October 2026. Recommendation: the reviewed foundation can support a separately authorized Phase 2 internal development increment with synthetic identities and isolated repositories/tests. This document does not start Phase 2 or authorize production endpoints, employee data, deployment or an SSO choice.

## Minimum development prerequisites

Before the first Phase 2 change, explicitly agree its scope and acceptance criteria. Re-read the proposed Phase 0 course/publishing design; resolve its internal API and schema choices in a small design change before coding. Keep the existing authorized application-service boundary, organization-scoped repositories and DTO separation. Do not place learning workflows in controllers, identity modules or the worker.

| Feature | Prerequisite for internal synthetic development | Corporate decision before real use |
| --- | --- | --- |
| Course drafts | Define organization ownership, stable course identity, draft revision/preconditions, bounded metadata and new explicit permissions; fixtures with no implicit admin | Authoring roles, ownership and cross-plant sharing |
| Lessons/modules | Define ordering, stable IDs, supported safe content types, input/output bounds and accessibility contract; defer uploads until a secure storage design exists | Allowed materials, IP/privacy and language requirements |
| Content versioning | Separate mutable draft revision from immutable published release identity; bind dependent lesson versions; test concurrent edits | Revision retention and correction rules |
| Technical SME review | Model reviewer assignment, review record and approval tied to exact draft version; invalidate approval on relevant change; use clearly synthetic decisions | Actual qualified reviewers, engineering parameters and inspection criteria |
| Publishing approval | Define explicit state transitions, reject unauthorized/self-approval where the agreed development rule requires separation; atomic audit/receipt with versioned commands | Corporate approvers, separation of duties, withdrawal and emergency change policy |
| Immutable release | Snapshot complete lesson/module content and approvals; append new versions rather than overwrite; test revision conflicts and rollback | Release/certification consequences, records retention and historical access |
| Catalog read model | Return only authorized published versions using scoped queries before count/pagination; strict DTOs and version-aware reads | Enrollment/discovery audience, confidentiality, plant/department access |

These are proposed development acceptance conditions, not invented Welspun policies. Review state names, permission names and approval rules still need a scoped design decision; none were implemented here. Industrial technical values and certification/retraining policies remain SME/corporate approval items. Do not populate example parameters as authoritative engineering standards.

## Genuine development blockers

- No agreed Phase 2 increment or reviewed draft/release/approval model yet. Obtain task authorization and settle those contracts before implementation.
- New permissions and resource resolvers must be designed and tested for organization and resource isolation; existing identity permissions do not automatically authorize course operations.
- Any new command must define its receipt version and strict response, transaction-bound audit type/target validation, optimistic revision behavior and replay authorization. Extend the audit allowlist deliberately; the current adapter only accepts existing identity-domain mutations.
- Historical receipt compatibility must fail closed; do not silently reuse a version for a changed command. A migration/reconciliation plan is needed before reusing any persistent non-disposable environment.
- Maintain ordinary checks, real transaction failure/replay tests and scope regressions. Content input safety must be decided before rendering authored content; uploads need an explicit secure design before becoming part of an increment.

These are manageable entry tasks for a future explicitly authorized development phase, rather than a demand to finish production infrastructure first. Local tests use disposable databases and synthetic reviewers; they cannot supply real policy approval.

## Production blockers that do not prevent isolated development

Approved SSO/directory integration, real employee mapping/offboarding, administrator bootstrap, approved roles/hierarchy, corporate audit/receipt retention, production Mongo IAM/backup/restore, monitoring, session/abuse protection, representative load testing and independent review all remain required before production. See PRODUCTION_READINESS_CHECKLIST.md. No production identity, audit durability or operational readiness is implied by the local development recommendation.

## Stop boundary

Phase 1B.3C ends with this assessment. No course model, lesson, catalog feature, release, enrollment, assessment, certificate, UI, simulation or production endpoint was created. Wait for review and a separate Phase 2 instruction.
