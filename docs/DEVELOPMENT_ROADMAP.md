# Development roadmap and effort

Phase 0 proposal · one developer implementing incrementally with Codex

## Delivery assumptions

Estimates are developer effort, not a fixed delivery commitment. Assume an experienced full-stack developer, a modest pilot audience, two supplied courses as the initial content source, access to timely IT/SME reviewers and no bespoke photorealistic 3D asset production. Use a five-day developer week. Reviewer waiting time, procurement, source-deck reconstruction, translation and major integrations can extend calendar duration separately. Codex assists implementation and review; it does not remove validation or approval work.

| Phase | Scope and concrete exit gate | Developer weeks |
|---|---|---|
| 1: decisions and foundation | Confirm identity/hosting and pilot; repository/app boundaries, CI, environments, basic monitoring and configuration. Exit: web/API deploy to staging with synthetic data. | 2–3 |
| 2: identity and scoped administration | Verified login, employee lifecycle, configurable hierarchy, role grants, server scope checks and audit. Exit: negative authorization cases pass, including separate plants. | 3–4 |
| 3: content and approvals | Structured authoring, asset pipeline, review/hash workflow, immutable releases, safe preview and publication. Exit: independent reviewer approves one course release; edit invalidates approval. | 4–5 |
| 4: learning obligations | Catalog, self-enrollment, snapshot assignments, due dates, durable lesson evidence/resume and scoped compliance view. Exit: second-device resume and duplicate assignment requests behave correctly. | 3–4 |
| 5: assessment and credentials | Server sessions/grading, immutable attempts, retry policy, certificate award/render/revoke/expiry and initial retraining. Exit: duplicate/racing submits issue one award; invalid evidence cannot certify. | 3–4 |
| 6: interactive content | Migrate course widgets and a reusable factory/layer/optics/metrology/atlas renderer set in small slices. Exit: approved profiles, accessible alternatives and evaluated simulation outcomes for selected pilot objectives. | 5–8 |
| 7: competencies and reporting | Approved competency mapping, assessor evidence, scoped exports, audit views, reporting definitions and reconciliation. Exit: HR/TCoE agree sample totals and access. | 2–3 |
| 8: hardening and pilot | Load/device/accessibility checks, threat review, recovery rehearsal, monitoring/runbooks, UAT fixes and pilot support. Exit: operational owner accepts measured targets and restores. | 3–4 |
| Total baseline | Sequential effort before contingency | **25–35** |

Reserve 20–30% contingency: approximately **30–46 developer weeks**, or roughly **7–11 full-time calendar months** with prompt approvals. Part-time development, late specifications, extensive custom assets or enterprise integrations can extend this substantially. Re-estimate after phases 2 and 4 using actual throughput and approved content scope.

## Recommended implementation sequence

Build the smallest complete governed learning loop first: identity → scope checks → one approved published lesson/course → enrollment/assignment → server evidence → assessment → auditable completion. Then add certificate lifecycle and one assessed simulation before expanding to the complete lab set. Phase 8 controls start in Phase 1 and accumulate; the final phase verifies them rather than introducing security at the end.

A useful early internal pilot can follow phases 1–5 at approximately 15–20 baseline weeks, provided the approved course can use text/images and simple interactions. It is a scoped pilot, not delivery of the full factory simulation suite or a declaration of production readiness. Do not publish industrial scoring that still lacks SME approval.

## Incremental Codex work pattern

For each slice, supply a bounded task containing requirement IDs, relevant schema/API/permission rules, approved policy references and acceptance cases. Review a small change set, run relevant tests and demonstrate the learner/admin flow in staging. Update this architecture when a deliberate decision changes a contract. Never ask Codex to invent industrial thresholds, silently migrate credentials or treat local prototype progress as trusted production evidence.

Suggested first tasks after Phase 0 approval: scaffold separate web/API TypeScript apps; define public DTOs and error format; implement verified identity adapter; implement hierarchy/grants and negative scope tests; add draft→review→publish for one structured lesson. Each task should have a reviewable exit before the next dependency is added.

## Validation by risk

Use Vitest for shared schemas, evaluators and domain rules; choose one backend unit runner rather than maintaining both Jest and Vitest without need. Use Supertest for real API authorization, validation, idempotency and transactional behavior. Use Playwright for learner/admin journeys and representative simulation controls. Exercise Mongo transaction behavior against an isolated compatible test deployment during implementation, not an in-memory substitute alone. No connections are required during Phase 0.

Critical cases: cross-scope IDs and exports, role revocation, self-approval, stale draft publication, exact score boundaries, simultaneous submits, duplicate events, worker retry/Redis outage, certificate uniqueness and revocation, transfer/history rules, inaccessible media and backup restoration. Include meaningful failure paths; avoid tests that only mirror trivial styling or implementation details.

## Risks and trade-offs

The largest uncertainty is approved content, not framework choice. Start the controlled-source/SME review early. SSO and procurement decisions can block identity deployment, so use an adapter and synthetic test identities in isolated development. Keep supported renderer types small; a general simulator authoring platform would overwhelm a sole developer. Defer detailed assets until learning value and device support are demonstrated. Retain modular boundaries, but resist splitting services or adding infrastructure before measured need.

Stop-ship conditions: missing identity/security approval, unresolved industrial grading criteria used in certification, cross-scope data leakage, mutable finalized attempts, non-recoverable authoritative data, absent independent publication approval or untested certificate eligibility. Unaffected foundation work can proceed while content owners resolve technical issues.
