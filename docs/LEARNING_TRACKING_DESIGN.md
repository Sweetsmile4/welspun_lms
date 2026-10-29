# Learning tracking and evidence design

Phase 0 proposal

## Enrollment, assignment and versions

An enrollment is a learner's attempt to complete a pinned course release in a learning cycle. An assignment is an organizational obligation, with recipient rows linking to an enrollment. Self-paced enrollment is allowed only for eligible published content. Assignment creation resolves the authorized audience to recipient snapshots, previews counts/exclusions and materializes idempotently. Default audience mode is snapshot; dynamic membership additions require an explicit policy and reconciliation job. Transfers, leave, cancellation and due-date changes append reasoned administrative history.

One compatible enrollment can satisfy several assignments targeting the same release/cycle; each obligation retains its due date and status. Mandatory assignment must not create a second duplicate course effort when approved existing evidence qualifies. Existing completion credit, equivalent versions, waivers and retraining rules require policy approval. Never assume that an older release satisfies a new mandatory assignment.

Course status: enrolled → in_progress → completed; withdrawn/cancelled are explicit administrative dispositions. Assessment failure is an attempt result, not permanent course failure. Assignment compliance is pending/in_progress/completed/overdue/cancelled/exempt; overdue means dueAt has passed and no accepted completion exists. Certification validity is a separate state. A completed course can have an expired or revoked certificate.

Published releases pin lesson IDs, assessment forms, simulation configs, technical parameters and certification policies. Publishing a correction does not change active enrollment requirements. Critical withdrawal blocks new starts and flags existing runs; an approved migration chooses stop/retrain/continue and creates a new cycle when necessary, preserving prior evidence. No automatic copying of progress across semantically changed lessons.

## Event envelope and trust

Proposed event fields: eventId (UUID), schemaVersion, eventType, enrollmentId, lessonReleaseId or simulationRunId, clientSequence, occurredAt, receivedAt, session/correlation ID, and bounded typed payload. The API derives actor, organization, authoritative versions and scope. Client time is advisory; server receive/finalization time decides deadlines. Event IDs deduplicate retries; a repeated ID with different payload returns conflict.

Examples: lesson.opened, lesson.resume_saved, practice.answer_submitted, simulation.action_recorded, assessment.started, assessment.finalized, lesson.completed, course.completed and certificate.issued. The first group can be client-reported interaction evidence; finalized/completed/issued events are server-produced domain facts. A browser must never submit an authoritative passed/completed flag.

Do not stream animation frames or every mouse movement. Record meaningful actions, gate inputs, bounded summaries and periodic resume data. Server validates enrollment ownership, release membership, event type, sequence/range limits and payload size. Event ordering across devices is not assumed; use per-run sequence, server state revisions and explicit conflict responses. Raw interaction telemetry is not proof of attention or identity.

## Completion and assessments

Each published lesson declares its required evidence: acknowledgement, correct formative decision, evaluated simulation outcome or assessment result. Required gates combine with AND unless the approved rubric says otherwise. Widgets used only for exploration do not silently become certification requirements. Displayed percent is completed required units / total required units, with optional units shown separately; weights, if needed, belong to the release. Never calculate authoritative progress from page visits or a client-supplied percent.

Assessment start checks release eligibility, prerequisites, retry count/cooldown, active session and time policy. Server chooses and persists item order/seed and private scoring references. API returns questions/options without correct keys. Formative practice may reveal immediate explanations; summative feedback timing is a separate approved policy. Server grades exact raw totals; compare fractions without rounding before pass determination. For example 80% of eight questions requires seven correct, while six correct is exactly 75%.

Persist mutable session state for resume; final submission produces an immutable attempt including responses, item scores, rubric/evaluator versions and timestamps. Concurrent tabs/retries use one session finalization and a stable idempotency key. Out-of-time sessions receive the approved timeout disposition; server deadlines apply. Cooldowns, abandoned-session counting, maximum attempts and practical requirements are unresolved policy decisions.

## Projection and reliable processing

LessonProgress and enrollment summaries are rebuildable projections over accepted evidence, not replacements for attempts/outcomes. Final grade and immediate course eligibility update transactionally where bounded. Audit/outbox records commit with the domain transaction. Workers handle reminders, report aggregates and certificate rendering idempotently. Return a progress revision to the UI; UI refetches after conflict and shows pending/confirmed states.

Example: submission arrives twice → same immutable attempt is returned → completion evaluated once → one certificate award key inserted → outbox dispatch may repeat → renderer writes one linked artifact → repeated notification uses a durable delivery key. If Redis is lost, pending outbox and reconciliation recover jobs. If a projection fails, learner history remains intact and the projection can be rebuilt using versioned reducer logic. Corrections append adjudications rather than rewriting facts.

## Simulation and competencies

Simulation outcomes retain scenario/release/evaluator versions, seed, inputs/actions, metrics and rubric results. Server re-evaluates bounded evidence; client display scores are advisory. Separate knowledge evidence, simulation evidence and observed practical performance. A competency mapping can require several types and an authorized assessor. Learning portal completion does not automatically assert industrial personnel qualification.

Certificate issuance requires all policy prerequisites and valid evidence for the correct learner/cycle. Record signatory/template snapshot, issue/expiry timestamps and evidence IDs. Append revocation and supersession actions; renew through a new cycle rather than editing issuance dates. Renewal scheduler produces assignments under approved lead-time rules, with deduplication and missed-run reconciliation.

## Reporting definitions

| Metric | Definition |
|---|---|
| Mandatory completion rate | Completed non-cancelled/non-exempt recipients / all non-cancelled/non-exempt recipients in the selected assignment cohort |
| Overdue recipients | Eligible recipients with dueAt before report cutoff and no accepted completion by cutoff |
| First-attempt pass rate | Learners passing their first finalized attempt / learners with a first finalized attempt; show abandoned/expired separately |
| Latest/best score | Separate aggregates from immutable attempts, never overwrite the source |
| Valid certifications | Issued, within validity window and not effectively revoked/suspended at cutoff |
| Competency coverage | Approved required competencies supported by currently valid evidence / required competencies for the approved role mapping |

Reports state cohort, filters, time zone, cutoff/asOf and freshness watermark. Historical reports use evidence and effective-dated assignment changes; current org filters must not silently rewrite past cohort membership. Avoid time-spent as a compliance measure unless validated, since idle tabs distort it. Scope reports at query, generation and download. Retention, historical access and employee analytics use need HR/IT approval.

Trade-off: immutable evidence plus small projections costs more storage than local summary flags, but makes disputes, retries, content changes and audits explainable without full event sourcing of every application state.
