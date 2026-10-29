# Database schema

Phase 0 logical MongoDB/Mongoose design · no database created

## Conventions and relationships

Use ObjectId references, UTC dates, explicit enums, bounded embedded data and server validation. Every organization-owned document has `organizationId`; all references must resolve within that organization. Common mutable fields: `_id`, `createdAt`, `createdBy`, `updatedAt`, `revision`. Immutable records omit general update/delete operations. Organization IDs are isolation keys even though the initial deployment serves one company; this is not a proposal for multi-tenant SaaS.

| Collection | Key fields and relationships |
|---|---|
| organizations | code, name, configured time zone, status |
| orgUnits | organizationId, type organization/plant/department, parentId, ancestorIds, code, name, status, treeRevision |
| users | organizationId, identityIssuer, identitySubject, optional employeeId, displayName, status; avoid unnecessary personal data |
| memberships | organizationId, userId, orgUnitId, validFrom, validTo, primary flag; preserves transfers |
| roleDefinitions | organizationId, code, allowed action names, roleVersion, active; controlled templates initially |
| roleGrants | organizationId, userId, roleDefinitionId/version, scopeUnitId or resourceId/type, includeDescendants, grantorId, validFrom/to, revokedAt |
| sessions | organizationId, userId, token hash/reference, authVersion, expiresAt, revokedAt; implementation depends on SSO choice |
| courses | organizationId, code, catalog metadata, allowedAudience, currentReleaseId, lifecycle; stable identity only |
| contentDrafts | organizationId, courseId, baseReleaseId, revision, manifest, editedBy, status; bounded structured lesson blocks |
| lessonReleases | organizationId, lessonId, version, approved body/blocks, assetRefs, objectiveRefs, completionRule, contentHash |
| courseReleases | organizationId, courseId, version, lessonReleaseIds in order, required/optional flags, assessmentReleaseIds, simulationReleaseIds, policyReleaseId, approvalSnapshot, hash, publishedAt |
| assessmentReleases | organizationId, assessmentId, version, items/options, private correct answers/rubrics, scoring rules, retry/time policies, hash; private repository projection only |
| technicalPolicyReleases | organizationId, policyId, version, typed values/units/applicability, source references/edition/clause, approvalRefs, hash |
| simulationReleases | organizationId, simulationId, version, rendererType/version, evaluatorVersion, route graph, scenario config, approved technicalPolicyReleaseId, assetRefs, completion rubric, hash |
| certificationPolicyReleases | organizationId, policyId, version, prerequisite release/objective rules, thresholds, expiry/renewal, signatory/template version, approvals, hash |
| reviewRequests | organizationId, target type/id, targetRevision/hash, required approval types, submittedBy, status |
| reviewDecisions | organizationId, requestId, reviewerId, capacity, targetHash, decision, rationale, sourceRefs, decidedAt; append-only |
| releaseActions | organizationId, releaseId/type, action publish/withdraw/supersede, actor, reason, effectiveAt; append-only lifecycle outside immutable release bodies |
| assets | organizationId, generated object key/versionId, checksum, MIME, size, scan status, provenance/license, alt text, ownerScope, lifecycle |
| assignments | organizationId, courseReleaseId, scopeUnitId, audienceDefinition, audienceMode, dueAt/timeZone, status, createdBy, audienceSnapshotHash |
| assignmentRecipients | organizationId, assignmentId, userId, enrollmentId, effective membership snapshot, addedAt, exception/cancellation references |
| enrollments | organizationId, userId, courseId, courseReleaseId, cycleId, scopeSnapshot, origin, status, enrolledAt, completedAt; one learning cycle may satisfy multiple compatible assignments |
| learningEvents | organizationId, eventId, actorId, enrollmentId, contentReleaseId, eventType/schemaVersion, sequence, occurredAt, receivedAt, bounded payload, trust/source |
| lessonProgress | organizationId, enrollmentId, lessonReleaseId, status, completedAt, evidenceRefs, resumeData, revision; derived snapshot |
| assessmentSessions | organizationId, userId, enrollmentId, assessmentReleaseId, attemptNo, selectedItemIds/order, policy snapshot, state, expiresAt, submissionHash, finalAttemptId |
| assessmentAttempts | organizationId, sessionId, userId, enrollmentId, release/policy IDs, item/order snapshot refs, submitted responses, item scores, total/max, exact pass decision, evaluatorVersion, finalizedAt; immutable |
| evidenceAdjudications | organizationId, originalEvidenceId/type, superseding decision, rationale, reviewer/approver IDs, approved policy reference, decidedAt; append-only correction without altering source evidence |
| simulationRuns | organizationId, userId, enrollmentId, simulationReleaseId, seed, state, startedAt/expiresAt, finalOutcomeId; temporary run lifecycle |
| simulationOutcomes | organizationId, runId, release/policy/evaluator versions, bounded action evidence or asset ref/checksum, metrics, rubric results, server decision, finalizedAt; immutable |
| competencyDefinitions | organizationId, code, version, objectives, required evidence types, assessor requirement, approvals |
| competencyEvidence | organizationId, userId, competency version, attempt/outcome/practical observation refs, assessorId where required, decision, validAt/until; append-only; supersession is separate evidence |
| certificates | organizationId, userId, enrollment/cycle reference, policyReleaseId, unique awardKey/serial, issuedAt, expiresAt, evidenceRefs, name/template snapshot, render status/assetRef |
| certificateActions | organizationId, certificateId, revoke/suspend/reinstate/supersede, actorId, reason, effectiveAt; immutable history |
| auditLogs | organizationId, actor/service, action, target/type, scopeSnapshot, safe change summary, reason, requestId, serverAt, outcome; append-only |
| outbox | organizationId, operationId, type, aggregateId, minimal payload, createdAt, dispatchedAt, processing state |
| jobExecutions | organizationId, businessKey, jobType, state, lastErrorCode, attempt count, completedAt; deduplication ledger |
| reportJobs | organizationId, requesterId, authorized scope/filter snapshot, asOf, state, assetRef, expiresAt |

Course releases reference immutable lesson, assessment and simulation releases; shared lesson identity does not imply automatic updates. Approval snapshots contain reviewer IDs, decision IDs and hashes. Withdrawal uses `releaseActions`, preserving the original approved bytes. Certificate render fields may change; award facts and evidence cannot. Revocation is an appended action.

## Invariants and concurrency

Org-unit parents must have the configured valid type, belong to the same organization and never form cycles. Initially allow root → plant → department with optional department descendants only if approved. Tree moves require an organization-level authorized operation; transactionally update ancestry or use a maintenance lock/version so stale authorization cannot observe mixed ancestry. Historical learning uses membership snapshots; current access uses current grants and approved historical-report policy.

Use optimistic revision checks for drafts and administration. Publication verifies the exact approved hash and ready dependencies, writes immutable release records, updates the catalog pointer and audit/outbox in a transaction. Editing after approval requires new review. Never overwrite a published lesson or grading policy.

A session may become submitted exactly once through compare-and-set. Its final immutable attempt, progress/eligibility changes, audit and outbox commit together. Replays return the stored result. Corrections append a signed adjudication/evidence record referencing the original attempt; never edit original answers or scores. An adjudication must be supported explicitly before any manual correction UI is released.

Certificates use an award key derived from learner, certification policy and learning cycle to prevent duplicate issuance. A new retraining cycle can legitimately produce another award. Bulk audiences are separate recipient documents, not unbounded arrays. Large raw action traces and media live in private storage with hashes; never grow an employee document indefinitely.

## Initial index plan

All following tuples start with organizationId except token-hash lookups and globally random certificate verification tokens. `U` means unique. Validate actual query plans and adjust after pilot measurements.

| Collection | Indexes and purpose |
|---|---|
| users | U(organizationId, identityIssuer, identitySubject); partial U(organizationId, employeeId) when a normalized employeeId exists |
| orgUnits | U(organizationId, parentId, code); (organizationId, ancestorIds, status) for scoped subtree reads |
| memberships | (organizationId, userId, validTo); (organizationId, orgUnitId, validTo) for audience resolution |
| roleGrants | (organizationId, userId, revokedAt, validTo); (organizationId, scopeUnitId) |
| courses/releases | U(organizationId, code); each release family U(organizationId, stableEntityId, version); (organizationId, lifecycle) for catalog |
| assignments/recipients | (organizationId, scopeUnitId, dueAt); U(organizationId, assignmentId, userId); (organizationId, userId, enrollmentId) |
| enrollments | U(organizationId, userId, courseId, cycleId); (organizationId, userId, status); (organizationId, courseReleaseId, status) |
| events/progress | U(organizationId, eventId); (organizationId, enrollmentId, receivedAt, _id); U(organizationId, enrollmentId, lessonReleaseId) |
| assessment sessions/attempts | U(organizationId, enrollmentId, assessmentReleaseId, attemptNo); U(organizationId, sessionId) on attempts; (organizationId, userId, finalizedAt) |
| simulation outcomes | U(organizationId, runId); (organizationId, userId, finalizedAt) |
| certificates/actions | U(organizationId, awardKey); U(organizationId, serial); (organizationId, userId, expiresAt); (organizationId, certificateId, effectiveAt) |
| reviews/audit | (organizationId, targetHash, status) on review requests; (organizationId, targetId, serverAt, _id), (organizationId, actorId, serverAt) on audit |
| outbox/jobs | (state, createdAt) on outbox; U(organizationId, operationId); U(organizationId, businessKey) on job ledger |

Unique indexes enforce concurrency invariants, not merely application checks; optional values need partial indexes to avoid missing-value collisions. See [MongoDB unique indexes](https://www.mongodb.com/docs/manual/core/index-unique/). Avoid redundant indexes: each adds write/storage cost. No initial sharding. Use cursor pagination with stable timestamp plus ID ordering. Do not use TTL on authoritative attempts, certificates, audit or learning evidence; TTL is appropriate only for approved ephemeral sessions/export artifacts after retention decisions.

## Retention, migration and restore

Mongoose schemas plus database validators enforce shape, but foreign-key consistency remains service responsibility. Use reviewed migrations, explicit index creation and restore rehearsal. Disable automatic production index creation. Soft-deactivate catalogs/users and preserve evidence references; never cascade-delete training history. Approved privacy erasure may pseudonymize identity while retaining lawful evidence; legal/HR decides retention and exceptions. Application append-only controls do not make database administrators unable to alter records: restrict production credentials and export protected audit archives, with tamper-evident controls if required.
