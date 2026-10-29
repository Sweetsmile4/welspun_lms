# Phase 2B release integrity guide

29 October 2026. Internal synthetic workflow evidence only; not a production compliance or industrial approval claim.

## Exact snapshot and digest

`catalog/publishing/contracts.ts` defines snapshotSchema and contentDigest. catalog-snapshot-v1 parses the complete Course and Draft, converts Dates to UTC ISO strings with JSON serialization, recursively sorts object keys using the existing canonical SHA-256 helper, and preserves array order. IDs, organization, ownership/scope, draft ID/revision/status, all title/description/metadata, module/lesson IDs/parents/order/local revisions/content, creator/updater/contributor provenance and timestamps are included. There is no Unicode/text normalization beyond draft input validation.

Converting dates first is essential: directly passing Date objects to an object-key canonicalizer can lose date bytes. Tests prove key-order equivalence and sensitivity to dates, revision, text and ordered arrays. Snapshot/release contracts validate course/draft organization/identity, content digest and contributor completeness. Stored review/release schema reads validate again. A plain hash detects mismatch; it is not a signature and does not resist privileged writers who can alter all evidence and recompute it.

Submission binds organization/course/draft/revision/digest/algorithm/policy/actor/time and stores the actual snapshot. Review assignments are explicit evidence. Assignment/decision authority cannot be supplied by client fields. New decision/readiness/publication reads the current authoritative draft and compares its exact revision AND digest to the submission. Same-revision byte drift fails; revision N approval cannot publish N+1. Explicit supersession preserves original approval records and snapshot. A stale state label alone is never treated as evidence.

## Immutable release payload

CourseRelease contains unique release ID, organization/stable course identity, monotonic course number, source draft ID/revision, algorithm/digest, exact full snapshot (including all module/lesson identities/order/content), authorized scope, captured development policy, embedded approval evidence and IDs, review ID, publisher/time, schemaVersion=1 and lifecycle=published. Approval references are also embedded as strict immutable evidence snapshots, so release content and historical approval facts do not require mutable review/draft rows to reconstruct.

The release schema checks digest, source/course/org/scope binding, distinct approvers, configured approval count, exact review/draft/digest evidence matching and exclusion of recorded contributors. The service additionally excludes submitter/owner, verifies assigned evidence IDs and current reviewer grants/accounts at publication. No mutable currentReleaseId pointer or separate lesson-release records were added; bounded embedded snapshots make this phase self-contained. Shared lesson reuse and released assessment/policy dependencies need a later reviewed design.

Later draft edits cannot change published bytes. Corrections require another edited draft revision, submission/approval and a new release. Expected previous release number plus organization fence and unique indexes produce monotonic numbering. No automatic withdrawal, supersession, emergency publication or certificate consequence exists. Lifecycle=published is fixed creation metadata, not a live availability flag or public-catalog entitlement.

## Persistence and concurrency guards

| Collection | Purpose / indexes |
| --- | --- |
| reviewRequests | Immutable submission payload plus mutable workflow projection; unique organization/course/draft/revision; organization/course/ID history index |
| reviewDecisions | Append-only assignment/decision/supersession evidence; partial unique organization/review/actor for decision kinds; organization/review/ID index |
| courseReleases | Append-only self-contained releases; unique organization/course/number and unique organization/course/source draft/revision; organization/course/ID history index |

Indexes initialize explicitly before transactions, never at ordinary startup. No TTL. PublishingStore requires the active mapped authorization session, exposes appendRelease/release/history but no release update/delete, and appends evidence without mutation methods. Review replacement updates only projection fields under expected review revision. Immutable payload schemas use immutable fields, refuse overwriting saved documents and block common update/replace/delete model methods. These application safeguards do not prevent raw Mongo collection operations, privileged database administrators or malicious trusted server code. Production needs approved IAM, database validation/privilege controls, monitoring, backup and archival policy; no database-level immutability is claimed.

Publication, review state transition, security audit and receipt are one transaction behind the existing organization fence. A receipt/audit fault leaves no release number reservation or partial projection. Concurrent distinct keys cannot produce two releases from the same revision. Duplicate identical keys replay one acknowledgement. The fence deliberately retains contention costs already measured in Phase 1B.3C; this phase makes no throughput/capacity claim.

## Audit, replay and restore

New allowlisted audit types: course.review.submitted/assigned/decided/superseded and course.release.published. Review IDs and release IDs are validated through explicit authoritative same-session store callbacks; tests reject wrong-type/cross-organization targets. Audit stores attribution/reference/outcome, not snapshots or feedback. Actual local insertion failures roll back domain and receipt changes.

New namespaces course.review.command.v1 and course.release.publish.v1 retain schema/command/response version 1 with strict acknowledgements; Phase 2A operations were not repurposed. Digests/bindings are validated on replay; current actor permission, assignment and reviewer qualification precede receipt use. A publish replay can be denied after offboarding/revocation even though its release remains historical evidence. A valid replay after a later draft edit returns the original release ID/number, not new content. Fetch through a separately authorized immutable read. No new HTTP route exists; tests model lost delivery by discarding the committed internal return value and retrying. Existing HTTP response-loss regressions remain in prior foundation suites.

Backups must consistently restore course identity, draft contributor provenance, review payload/projection/evidence, releases, audit and receipts with indexes and compatible schema readers. Inconsistent restore can break release numbering, replay and proof chains. No restore/migration tooling or retention schedule was invented. Legacy draft provenance cannot be recovered by inferring only creator/latest editor; publication remains blocked until an approved reconciliation/re-authoring process. Hash consistency alone cannot authenticate a restored database against privileged tampering.

## Verification scope and external approval

Tests exercise valid and rejected transitions, configured multi-reviewer approval, exact-digest drift, changed draft after approval, self/contributor/unassigned denial, account/grant/role revocation, scoped reads/history, concurrent decisions/publishes, duplicate keys/source prevention, corrupted receipts, audit/receipt rollback, unchanged release snapshots after later edits, monotonic later releases and test/production isolation. Mongo tests verify real session/index behavior and application mutation guards. No corporate SSO, actual SME validation, external penetration test, multi-node failover, backup restore, deployment or legally immutable archive was tested.

Welspun must still approve reviewer capacities/count/qualifications, assignment replacement, independent duties, controlled technical sources, publication/withdrawal/correction policy, scope/privacy, retention/legal hold, operational security and production acceptance. This phase ends at the isolated backend foundation; Phase 2C requires separate authorization.
