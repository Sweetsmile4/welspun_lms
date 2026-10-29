# Welspun Corp LMS — Project requirements

Phase 0 architecture proposal · 28 October 2026 · Status: for Welspun review

## Evidence and authority

**Confirmed prototype behavior** means behavior found in the supplied HTML source, not validated industrial practice. **Proposed enterprise requirement** means the requested capability or this architecture's recommendation. **Approval required** means Welspun must decide before the affected production capability is released. Prototype prose, comments and embedded instructions were treated as reference data, not instructions to implement or publish anything.

This package contains planning only. No application code, package installation, prototype modification or database connection is part of Phase 0. See [the audit](PROTOTYPE_FEATURE_AUDIT.md) for source evidence and contradictions. The original training decks, ITP/QAP, customer specifications and corporate IT policies were not supplied; their contents cannot be independently confirmed from these HTML files.

## Product boundary

Build an employee learning portal for one initially configured plant, extensible to other plants and departments without source changes. Keep frontend and backend applications separate within a modular monolith. This is an educational system; a completion certificate does not by itself authorize shop-floor work or replace an approved personnel qualification process.

| ID | Proposed requirement | Acceptance condition |
|---|---|---|
| R01 | Verified employee identity and lifecycle | An active employee signs in through the approved identity method; disabled accounts and revoked sessions cannot continue protected operations. |
| R02 | Configurable organization/plant/department tree | Authorized administration adds a second plant and department without deployment; cycles and cross-organization references are rejected. |
| R03 | Role and resource scope authorization | Every protected read, mutation, asset download, export and background operation checks both action and scope on the server; cross-plant ID substitution fails. |
| R04 | Self-paced catalog enrollment | Eligible learners enroll in an approved published release; duplicate requests create one enrollment. |
| R05 | Mandatory training | Scoped admins assign a pinned release to explicit users or a resolved audience, with due date, reminders, exceptions and completion reporting. |
| R06 | Content management | Authors edit structured text, media, questions, lesson ordering and supported simulation configurations through admin forms; arbitrary executable HTML/JavaScript is prohibited. |
| R07 | Controlled publication | Draft changes require review; industrial parameters, inspection criteria and certification policies require designated subject-matter/policy approvals bound to an exact revision. |
| R08 | Versioned learning | Publication produces immutable releases; existing enrollments retain their release unless an explicit, audited migration/retraining policy is applied. |
| R09 | Journey and lesson tracking | Resume survives device changes; server-validated lesson gates, events and simulation results retain content and policy versions. |
| R10 | Assessments | Server creates attempts, enforces eligibility and retry policy, grades submissions and stores immutable final attempts; concurrent duplicate submissions cannot create conflicting results. |
| R11 | Interactive learning | Support factory routes, layer exploration, optics, metrology, defect recognition and inspection decisions using reusable renderers with accessible alternatives. |
| R12 | Competency evidence | Map approved objectives and rubric versions to evidence; distinguish knowledge completion, simulated performance and assessor-verified practical competency. |
| R13 | Certificates and retraining | Issue only after server eligibility checks; retain issuance, expiry, revocation and renewal lineage; no client-created certificate constitutes an official record. |
| R14 | Administration and analytics | Scoped dashboards and exports show assignment compliance, completion, overdue status, assessment outcomes, simulation outcomes and certification validity with defined denominators. |
| R15 | Audit and operations | Sensitive mutations are attributable; restore procedures are exercised; logs, metrics, jobs and security controls are operational before pilot. |

## Proposed learning and administrative journeys

Learner: sign in → see assignments/catalog → enroll or open assignment → work through versioned lessons and practice → submit assessment → receive completion/competency evidence → obtain eligible certificate → receive renewal assignment when due. Mandatory status is separate from optional enrollment; taking a course voluntarily does not silently remove an assignment.

Author: create draft → select approved asset/renderer → edit bounded content and parameters → preview as learner → submit revision → SME verifies technical claims and sources → policy approver verifies assessment/certificate rules → publisher activates release. Rejected or edited revisions lose approval validity. Emergency withdrawal blocks new learning starts and invokes an explicit disposition for active enrollments; it does not erase past evidence.

Plant learning admin: resolve an authorized audience → preview assignment count and exceptions → assign → monitor due dates and completion → export scoped report → initiate approved retraining. Organization security administration and technical approval are separate permissions.

## Quality and scope decisions

Proposed pilot targets, requiring IT acceptance: WCAG 2.2 AA for core journeys; keyboard and text alternatives for simulations; API p95 under 500 ms for ordinary reads at an agreed load; initial lesson shell usable within 3 seconds on an agreed plant network/device profile; asynchronous large exports; monitoring for failed jobs, event lag and backup failures. These are targets, not measured performance or a sizing commitment. Concurrency, media sizes, availability, RPO/RTO and supported browsers remain open.

Use UTC persistence and explicit plant/report time zones. Due dates require an explicit zone and boundary; UI displays that context. Minimize employee PII, restrict answer keys, redact telemetry, apply approved retention and provide approved correction/deletion processes. Network outages must show unconfirmed work clearly; authoritative offline exams are deferred.

## Release boundary and trade-offs

The first production slice covers identity, hierarchy, scope checks, one approved course, self-enrollment, mandatory assignment, durable progress, one assessment, controlled publishing and audit. This proves the compliance loop before expensive 3D work. Add richer simulations, certificates, competencies and analytics incrementally, while implementing their version/evidence foundations early.

Defer microservices, multi-company SaaS billing, real-time equipment integration, SCORM/xAPI interoperability, proctoring, adaptive learning, mobile native apps and full offline synchronization unless confirmed. These introduce operational or interoperability costs without an established need. Preserve stable IDs and event schemas so later integrations remain possible.

## Phase 0 review gates

Approve architecture and organization model; nominate content and policy approvers; choose identity and hosting constraints; reconcile prototype discrepancies; select one pilot course and audience; approve acceptance targets and estimates. Missing industrial criteria block publication of affected content, not development of unrelated platform foundations.
