# Phase 2B internal review service guide

29 October 2026. Isolated synthetic backend services only. No review/course/management HTTP endpoint or production-enable switch was added. The development policy is proposed; see PHASE2B_REVIEW_PUBLISHING_DESIGN.md for the decision record and unresolved approvals.

## Composition

`catalog/publishing/createPublishingService(repository, drafts, store, receipts, identity, audit, options)` reuses the authorization repository, DraftStore, same-session PublishingStore and existing receipt port. Options require isolatedTest=true and an explicit `{key, requiredApprovals}` policy, with optional clock. There is no approval-count default. Policy key is a bounded version label; count 1–5 is an implementation bound, not a corporate decision. Factory and each call require NODE_ENV=test, synthetic-test identity and isolated-test audit. Runtime/production composition is rejected.

`createMongoPublishingStore(connection, sessionFor)` uses the authorization repository's mapped active session and exposes explicit initializeIndexes. It neither connects nor creates indexes at startup. No nested transactions. Test composition in publishing.mongo.test.ts shows draft/review/release stores and the existing audit adapter sharing one session mapping. Supply authoritative reviewTarget/releaseTarget audit callbacks that read the corresponding store within that transaction; wrong type/organization is rejected. Raw stores are internal persistence ports, not authorization boundaries.

## Entry points

| Method | Behavior / current permission |
| --- | --- |
| execute(credential, command) | Explicit workflow command, returning a small receipt acknowledgement |
| retrieveReview(credential, org, reviewId) | Exact submitted snapshot, workflow projection and append-only evidence; course.review.read |
| history(credential, org, courseId, 'reviews', page) | Authorized course's review history, ordered by stable ID; course.review.read |
| validatePublishReadiness(credential, input) | Exact current draft/review/digest/approval/number checks; course.release.publish; no business record or receipt written |
| retrieveRelease(credential, org, releaseId) | Validated immutable snapshot; course.release.read |
| history(credential, org, courseId, 'releases', page) | Authorized course's immutable releases; course.release.read |

All calls use the organization fence, including readiness/reads. Histories authorize the course before querying; page limit defaults 20, max 50, cursor is last returned opaque ObjectId. No global discovery, unauthorized totals or public catalog is implemented. Evidence queries are bounded to 12 records (maximum legitimate review evidence is 11). Dates are internal Date objects, not a public transport DTO. Use a separately authorized read for current state after any acknowledgement/replay.

## Command contract

Every command supplies organizationId, courseId, expectedDraftRevision, 64-character lowercase SHA-256 digest, UUID requestId, key (8–128 ASCII letters/digits/underscore/hyphen), and strict action object. No actor, roles, policy override, qualification claim or arbitrary metadata is accepted. Trusted identity supplies the actor. New operations use receipt namespaces course.review.command.v1 and course.release.publish.v1.

| action.kind | Additional action fields | Permission / preconditions |
| --- | --- | --- |
| submit | none | course.review.submit; current nonarchived draft revision/digest, complete contributor provenance and nonempty lesson-bearing modules |
| assign | reviewId, expectedReviewRevision, reviewerId | course.review.assign; submitted/inReview; independent active reviewer with current course.review.decide scope; available policy slot |
| decide | reviewId, expectedReviewRevision, decision, feedback | course.review.decide; assigned and independent actor; inReview; no previous decision for actor; exact current draft |
| supersede | reviewId, expectedReviewRevision | course.review.submit; review must be stale and not published/superseded |
| publish | reviewId, expectedReviewRevision, expectedReleaseNumber | course.release.publish; approved exact content, configured approvals/current qualifications; previous release number matches |

Decision values are approve/changesRequested/reject. Feedback is 1–10 structured items, category accuracy/clarity/safety/structure and nonblank safe message ≤2,000 characters. Even an approval records feedback. No arbitrary HTML, scripts, URLs-as-embeds or engineering policy payload is supported. Feedback is review evidence, not logged in security audit.

For supersede, expectedDraftRevision is the current draft revision but digest is the old review's digest; the service proves the current draft differs from that submission. Other new commands require digest to match both current snapshot and target submission. Stale decisions cannot be used to bless newer bytes. One review per source draft revision is enforced; changes/rejection require an edited revision and fresh submission. No automatic reassignment or review reopening is available.

Example internal synthetic submission:

```ts
const command = {
  organizationId: fixtureOrganizationId,
  courseId: fixtureCourseId,
  expectedDraftRevision: exactSnapshot.draft.revision,
  digest: contentDigest(exactSnapshot),
  requestId: crypto.randomUUID(),
  key: crypto.randomUUID(),
  action: { kind: 'submit' },
};
await workflow.execute(trustedSyntheticCredential, command);
```

Readiness accepts the same organization/course/draft/digest fields and publish action, omitting key/requestId. It validates publish readiness in a fenced transaction but does not reserve a number or approval; execute must recheck everything.

## State and duties

submitted → inReview on first assignment. Additional assignments fill configured distinct slots. Approvals leave inReview until all configured assigned reviewers approve, then approved. A changesRequested or reject decision is terminal for that submission. Approved → published commits an immutable release. Any stale nonpublished nonsuperseded submission can become superseded without rewriting earlier decisions. Each successful transition increments the review projection revision; the content draft revision/lifecycle is unchanged by review operations.

Author, every known contributor and submission actor cannot be assigned or decide. Synthetic qualification is an active explicit scoped decide grant and assignment. The same checks run again for decision/publication; revoked grants, replaced/inactive role versions, disabled accounts and scope loss deny publication/replay. Security administration alone grants no content permission. Publisher must have explicit publish permission; publisher/author overlap is allowed only after independent approvals in this proposed development policy. Actual required reviewer capacities and publisher independence still need approval.

Own scope can cover submit/read based on immutable course owner; it does not confer assign/decide/publish. Explicit organization, unit/subtree and course-resource grants are supported. Department scope cannot extend upward or sideways. Audience metadata is not authority. Review/release reads can be authorized after draft archival; new workflow mutations cannot.

## Evidence, receipts and errors

ReviewRequest's initial snapshot, binding, policy and submission attribution are immutable through the store; only status/reviewers/evidence IDs/revision form its CAS-controlled projection. ReviewEvidence appends assignment and decision/supersession records; no update/delete port exists. New approval records never replace prior decisions. Complete draft contributor provenance is accumulated for new drafts; legacy drafts without it are blocked from submission rather than guessing historical authors. A validated migration/re-authoring process is unresolved.

Each command atomically persists domain records, strict audit and versioned receipt using the same session. Audit failure rolls back projections, evidence/releases and receipts. Receipt insertion failure rolls back audit/domain writes. Current action permission and assignment/qualification checks precede replay. Publish replay additionally requires current independent qualified approvers; a later draft edit does not change the original release acknowledgement. New publication still requires current exact bytes. Unsupported/corrupt receipts or malformed stored acknowledgements fail closed; different payload under the same key conflicts.

Acknowledgement: `{courseId, reviewId, reviewRevision, releaseId, releaseNumber, replayed}`. Review commands use null release fields; publish has immutable release identity/number. Request ID is correlation only and may change on retry. No retention/TTL/cleanup policy was selected. Lost response delivery is handled by retrying the same command/key; the service never returns current mutable content as an old command result.

Errors remain internal: strict Zod validation for malformed input/stored data; FORBIDDEN for scope/identity/assignment/duty denial; REVIEW_CONFLICT for stale revisions/digests, state/policy or release-number conflicts; IDEMPOTENCY_CONFLICT for key reuse; REPLAY_UNAVAILABLE for invalid stored receipt; SECURITY_AUDIT_UNAVAILABLE for audit failure. Existing Mongo repository maps duplicate-key conflicts. There is no new HTTP controller; a future reviewed controller must translate validation errors to the existing envelopes without exposing internals.

## Test and stop boundary

Ordinary publishing tests use rollback-capable memory stores; opt-in Mongo tests share the same scenarios on real local transactions and add target/index/model guards. Previous Phase 1–2A suites remain. No production qualification, technical approval authority, public release discovery, enrollment, frontend or Phase 2C was implemented.
