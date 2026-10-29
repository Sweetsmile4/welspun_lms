# Decisions requiring confirmation

Phase 0 · 28 October 2026 · All items open unless explicitly approved later

The proposed architecture can be accepted independently of every industrial value, but affected content cannot be published or used for certification until its technical and policy questions are resolved. Prototype statements do not constitute approval. Owner labels below are proposed responsibilities; actual Welspun owners must be nominated.

| ID / priority | Decision or evidence needed | Proposed owner | Proposed default and consequence |
|---|---|---|---|
| Q01 / before identity work | Approved SSO provider/protocol, MFA, employee source, joiner/mover/leaver process, service/shared-account policy | Corporate IT/security, HR | Prefer OIDC SSO; do not implement local passwords without decision. |
| Q02 / before hierarchy and access | Actual organization/plant/department structure, nested units, multiple memberships, manager visibility and delegation | HR, plant learning owner | Configurable root/plant/department tree; no real units inferred. |
| Q03 / before deployment | Hosting account/services, environments, network access, residency, secrets, encryption and support ownership | Corporate IT | Separate web/API and worker; no named AWS deployment topology assumed. |
| Q04 / before sizing | Employee count, peak concurrency, plant networks, device/GPU/browser support, kiosks and connectivity | IT, pilot owner | Measure pilot; core accessible fallback; no authoritative offline exams initially. |
| Q05 / before publication | Controlled training decks, ITP/QAP, customer specifications, standard editions and rights to photos/models | TCoE/quality, legal | Keep source references and approvals; HTML alone is insufficient authority. |
| Q06 / before factory release | Canonical route: 16 vs 20 stations, optional stages, internal/external paths, station names/equipment, reprocess route and NTC meaning | Process SME | Distinct route graph and lesson model; no hardcoded station count. |
| Q07 / before technical assessment | Applicable lighting profiles: 300/350/500/1000/1076 lux, distance/angle, standard applicability and vision prerequisites | Inspection SME | No universal threshold; approve contextual profiles. |
| Q08 / before coating release | Salt/dust acceptance, roughness, units/capacity, heating bands, dwell time, layer thicknesses, quench exit criteria | Coating SME | Unapproved fields remain absent/non-assessed; never copy A's extra limits automatically. |
| Q09 / before holiday/peel release | Voltage per thickness interpretation, speed/calibration rules, repair/reject criteria, peel force/frequency/location | Quality/coating SME | Approve from controlled product/customer sources. |
| Q10 / before inspection release | Defect definitions, process-specific causes, accept/reject limits, instrument set/calibration/uncertainty, measurement method | Inspection/metrology SME | Atlas identification can be educational; disposition remains blocked pending criteria. |
| Q11 / before internal-line release | Internal profile/dust standard, lining thickness, mixing tolerance, cure/handling and final checks | Internal-lining SME | Review all c15/c16 notes in the audit. |
| Q12 / before assessment policy | 75% vs 80%, required scenes/labs, practical tasks, attempt limits, cooldown, time limits, question bank, feedback and supervision | TCoE, HR/quality | Immutable attempts and server grading; threshold is configurable only through approved release. |
| Q13 / before certification | Completion vs proficiency credential, signatory/wording, expiry, renewal lead time, revocation/appeal and equivalence rules | TCoE, HR/legal/quality | Separate course completion, competency and certification; no automatic work authorization. |
| Q14 / before authoring workflow release | Named independent authors, SMEs, policy approvers and publishers; emergency withdrawal process | TCoE governance | No self-approval; nominate reviewers beyond sole developer. |
| Q15 / before mandatory pilot | Audience snapshot/dynamic policy, assignment rights, reminders/channel, leave/exemptions, transfer and previous-completion credit | HR, learning administration | Snapshot audiences and pinned releases; explicit waivers and migration. |
| Q16 / before competencies | Approved role-to-competency framework and assessor eligibility; practical observations and evidence validity | TCoE, operations/HR | Do not equate quiz pass to practical qualification. |
| Q17 / before production | Retention, privacy, employee reporting visibility, correction/appeal, deletion/pseudonymization, export policy | HR/legal/security | Minimize PII; immutable evidence subject to approved lawful retention. |
| Q18 / before operational acceptance | Availability, measured response targets, backup tier/retention, RPO/RTO, recovery owner and audit protection | IT/operations | Restore rehearsal before pilot; no assumed corporate SLA. |
| Q19 / scope confirmation | HRIS/SAP/MES/email integrations, SCORM/xAPI, multilingual content, accessibility obligations, legacy record migration | Product owner/IT | Deferred unless required; local prototype results remain unverified. |
| Q20 / delivery approval | Pilot course/audience, reviewer capacity, budget, acceptance authority and developer availability | Sponsor/product owner | 25–35 baseline developer weeks; 30–46 with contingency, subject to re-estimation. |

## Industrial review completeness

In addition to Q06–Q11, every technical statement, measurement, tolerance, machine name, safety instruction, cause/disposition rule and claimed standard in the prototypes requires SME review. The audit appendix preserves all 26 scenes' available review notes, including missing safety content, image-only captions, likely transcription errors, unresolved internal/external profile differences and defect-list duplication. Resolve against controlled documents, not by selecting the more polished prototype.

## Decision record template

For each resolution record: question ID, decision, approved scope/applicability, source revision/edition/clause, value and units where relevant, approver identity/capacity, date, rationale, rejected alternatives, downstream content/policy versions and any expiry/review date. Architecture decisions can be approved by the project owner; industrial criteria require the designated SME and certification policy requires its designated authority.

## Recommended next approval

Confirm the modular monolith and separated web/API approach, nominate identity/IT and TCoE reviewers, choose one pilot course and resolve Q01–Q06 plus the pilot's applicable criteria. Proceed with platform foundations while non-pilot specifications are reviewed. Phase 0 does not authorize implementation, deployment or production content release by itself.
