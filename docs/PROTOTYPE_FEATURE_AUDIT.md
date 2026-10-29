# Prototype feature audit

Phase 0 · 28 October 2026 · Static source inspection

## Method and limitations

Inspected HTML, embedded course data, JavaScript state changes, renderers, answer keys, thresholds, certificate gates and persistence paths in all three supplied files. Base64 photographs were identified as embedded assets; their content and provenance were not independently authenticated. This is a source-level audit, not a browser execution, accessibility certification or operational test. No prototypes were modified. References below use original file line numbers and function/data names; very long course/image lines contain substantial embedded data.

Aliases:

* **A:** `Welspun Corp Technical Centre of Excellence_ Factory Twin & Visual Inspection Master Simulator.html`.
* **B:** `Welspun Learning Portal_ Follow the Pipe and The Inspector’s Eye.html`.
* **C:** `Welspun_Learning_Portal.html` (expanded portal).

All are supplied from the user's Downloads directory. Their claims about decks, Anjar equipment and standards are prototype claims, not independently verified Welspun requirements.

## Comparative inventory

| Dimension | A: standalone simulator | B: course portal | C: expanded portal |
|---|---|---|---|
| Structure | Six navigable work areas; no equivalent two-course enrollment model | Two courses: Follow the Pipe and The Inspector’s Eye | Same two-course data, plus six labs |
| Course scenes | No structured 16+10 scene curriculum | Coating: 16 scenes, displayed 150 minutes; inspection: 10 scenes, displayed 110 minutes | Same scene counts and displayed durations |
| Factory stations | 16, including internal spray bay as station 16 | 20-station external flow widget, separate internal preparation/lining scenes | Same 20-station widget plus animated 20-node factory lab |
| Assessment | Eight scenarios; 75%, so 6/8 | Ten questions per course; 80%, so 8/10 each | Same course quizzes plus eight-question lab exam at 80%, so 7/8 |
| Course certificate | No required scene gates | All scenes in that course plus passed course quiz | Same |
| Combined certificate | Exam alone unlocks printable TCoE certificate | None found | Both completed courses, both passed quizzes, passed lab exam |
| Persistence | In-memory state; no durable learning store found | Local storage user/progress/quiz/review | Same plus lab visits/exam state |
| Identity | Generic candidate wording and static certificate details; no verified learner identity | Local name and optional employee ID; guest option | Same |
| Renderer | SVG animations plus Three.js r128 layer model via CDN | Custom projected 3D geometry rendered to Canvas 2D, SVG widgets | Same custom renderer, additional lab compositions |
| Admin/review | Hardcoded source content | Learner-toggleable review notes | Same, with lab discrepancy notes |

The 16 course scenes, 16 A stations and 20 B/C flow stations are different concepts. They must not share a hardcoded station-count constant in production.

## A: confirmed source behavior

`navigateSection` (1385) switches factory, peeler3d, optics, toolbench, atlas and simulator views. `factoryStations` (932–1077) defines receiving, hot wash, gas preheat, abrasive blasting, blasted-surface gate, acid wash/RO rinse, induction heating, FBE booth, extrusion/seam plunger, quench, thickness scan, holiday test, cutback/bevel, peel test, marking/storage release and internal epoxy spray bay. Selecting a station changes technical details and highlights; `toggleFactoryAnimation`/`animateFactoryPipe` animate a pipe and auto-highlight stations. This is a teaching animation, not an equipment-connected digital twin.

`init3DLayerPeeler`/`apply3DLayer` (1533–1717) create concentric pipe/coating geometry, layer visibility changes, rotation/touch controls and camera reset. `setLightingTech` and `updateOpticsSimulation` (1733–1817) combine viewing distance, angle and light sliders with an SVG eye/target and qualitative feedback. Code checks distance ≤600 mm, angle ≥30°, API light ≥300 lux and ASME light ≥1076 lux. Displayed contrast percentages are illustrative values, not a measured optical model.

`selectGaugeTool` (1823) has bridge-cam, Hi-Lo, micrometer and vernier tab keys; its final fallback renders the same micrometer presentation for the latter keys. Bridge-cam slider evaluation rejects readings above 3.0 mm (`updateGaugeValue`, 1981–1998); other tool presentations do not demonstrate an equivalent general production acceptance engine. The atlas has 12 entries including sound weld, penetration, undercut, concavity, excess penetration, porosity, slag, arc strike, sliver, scab, rolled-in scale and gouge/over-grinding, with category filters, diagrams and explanatory content (`defectAtlasData`, 1082; atlas functions, 2006–2110).

`examScenarios` (1277) and `submitExam` (2152–2180) award one point per correct answer, reveal correct choices/explanations, count unanswered questions as incorrect, round the displayed percentage and reveal the certificate at ≥75%. No all-stations/peeler/optics completion prerequisite is checked. Answers remain in client source; resubmission/reset is available. Printed wording claims technical proficiency; that wording is not evidence of an approved credential.

## B and C: confirmed course learning flow

`COURSES` (B 624, C 636) defines the same course data: story-led scenes, three reading levels, source page references, equipment images/lightbox, decision questions, review notes and model/widget bindings. Coating scenes cover purpose, arrival/wash, preheat, blast, blast gate, acid/rinse, induction, epoxy, outer layers/seam, quench, visual/dimensions, holiday test, peel, final release, internal preparation and internal lining. Inspection scenes cover NDT purpose, visual testing, inspection setup, viewing methods, lighting/aids, instruments, steel defects, pipe-body defects, weld causes and coating-line inspection.

`initScene` (B 757, C 771) marks a scene complete after its **decision question** is correctly answered. Wrong choices are disabled and can be retried; explanations appear after repeated errors. It records time and tries locally. Exploring every hotspot, completing a widget, reading all tabs or spending the displayed duration is not required by this completion gate. Navigation and `nextScene` support resume but do not provide secure sequential enforcement.

Seven practice widgets: peel/name layers (`layers`), switch 3LPE/3LPP vs FBE/DFBE process flow (`flowA`), make three blast-gate decisions (`gate`), adjust coating system/thickness/electrode speed (`holiday`), order ten selected process steps (`order`), adjust distance/angle/light (`vt`) and match welding defects to causes (`causes`). Widget feedback is practice; it is separate from persisted scene completion.

Both portals include custom Canvas 2D projected 3D models with drag, zoom, keyboard arrows, hotspots, guided captions and some view/state controls. Reduced-motion and visibility handling exist in renderer source, but full accessibility was not tested. Searchable glossary, system dark-mode styling, learner records, copyable CSV text, print views and review/learner toggles are local features, not admin controls. No theme-switch UI or CSV file-download handler was found.

`initQuiz` (B 782, C 796) runs a fixed question set, locks each answered question, reveals immediate feedback and grades locally. Pass is score/total ≥0.8. Local storage retains best, last, first successful date and a sticky passed flag; a later failed attempt does not revoke a prior pass. It does **not** retain immutable individual attempt history. `pct` uses (completed scenes + one unit for a passed quiz)/(scene count + 1), not time weighting. `certView` gates on all scenes and quiz pass. No approved expiry, attempt limit, cooldown, practical sign-off or revocation workflow was found.

Both use the same `welspun-portal-v1` storage key (B 623, C 635), with no identity-bound partition. A name change is not a secure account switch; browsers sharing the same origin/key can reuse or overwrite state. The `review` toggle hides/shows notes and is available to learners. It is not an approval workflow.

The extracted `COURSES` JSON is byte-identical between B and C (SHA-256 `ECDD55526E03725E2478B2BAFB526B0DB494C13F5CC4BCFB75CCC559C90CA252`). C adds labs and renderer/lifecycle changes around that shared curriculum. Both record views offer change-learner and clear-progress actions; C's clear handler resets `prog` and `quiz` but leaves `lab` intact (847), so lab exam/visit state can survive clearing course progress. This is another reason not to import local flags as trusted credentials.

## C: additional labs

`LABS` (969–976) adds factory, peeler, optics, bench, atlas and exam. `labSeen` records visits only. The factory `LST` (997) has 20 external nodes with route switching, click/keyboard selection, play/pause animation, gate/reprocess explanations and links into course scenes. The internal route remains in course scenes, not as a twenty-first external node.

Peeler explores 3LPE/3LPP buildup and explicitly notes omitted adhesive/topcoat thickness limits. Optics combines the course setup widget and a light-position model. Bench chooses from five tolerances and compares tool smallest reading using the teaching rule resolution < tolerance, plus a vernier model and weld gauge descriptions. This rule is not a complete metrology suitability assessment. Atlas has 12 entries, weld/steel/body filters, cross-sections and deck photos/causes; it explicitly avoids acceptance limits absent from its sources.

`EXAM` (1084–1093), `initExam` (1095) require all eight answers before submit, freeze answers, reveal feedback and use ≥80%. Retrying creates no immutable history; stored best/pass/date are summaries. `allCoursesDone` and `dualCertView` (981, 1102) require both courses and lab exam pass; visiting all labs is not a certificate condition. Lab visit count is reported separately.

A's certificate uses a hardcoded serial and signatory text (867–899), with generic candidate wording and a fixed distinction label. It does not generate a unique learner-bound award. B/C insert the locally entered name/employee ID and stored pass date into print views. None is an authoritative credential service.

## Conflicts requiring SME and policy approval

| Conflict | Source evidence | Required disposition |
|---|---|---|
| 16 vs 20 process stations | A `factoryStations`; B/C `STN`; C `LST` and `LABNOTES.factory` | Approve equipment/process route and distinguish external/internal/optional stations from lesson structure. |
| 75% vs 80% certificate rules | A `submitExam`; B/C `PASS`; C combined gate | Approve each assessment threshold, required evidence and credential meaning; do not average thresholds. |
| 1076 lux vs 1000/350/300 lux | A optics; B/C `W.vt`; C `LABNOTES.optics` | Approve standard edition, clause, product/customer applicability and units. B/C evaluate setup with ≥350 lux and separately indicate 300/1000 lux; that is not universal compliance. |
| Technical values omitted by C | C `LABNOTES` 1111–1118 | A includes salt/dust limits, bevel/root-face dimensions, 230–260°C band, layer thicknesses, cutback limits and peel acceptance values that C says are not in the decks. Approve independently or remove. |
| Gauge/defect acceptance | A bridge-cam 3.0 mm and atlas thresholds; C bench/atlas disclaimers | Use approved ITP/customer criteria; resolution alone is insufficient. |
| NTC expansion and welding terminology | A expands NTC and labels process; C notes dispute this | Confirm terminology and approved reprocess route. |
| Certificate authority | A technical-proficiency wording; B/C completion wording | Approve signatory, legal status, validity, practical qualification and retraining. |

The portals cite deck values including 250°C heating, 300 mm/s holiday speed and 5 V/µm interpretation, but those remain **SME approval required**. C's assertions about which values appear in decks are not independently verified. No external engineering standard was used here to resolve industrial conflicts.

## Enterprise gaps common to all three

No production authentication, server-side RBAC, resource scope enforcement, centralized progress, immutable attempts, versioned publication, formal approval, mandatory audience assignment, authoritative certificate issuance, shared analytics, managed audit trail or backup/restore workflow was found. Source answer keys and local storage are user-controlled. Embedded photographs, names and equipment claims need rights, provenance and content review. These gaps are proposed enterprise work, not features to migrate as trusted records.

## Source review-note register

The appendix below transcribes all per-scene `tbc` review notes from the shared B/C course data. They are unresolved source statements, not endorsed industrial instructions. Every item requires TCoE/SME review against controlled sources before release.

### Follow the Pipe

**c1 — Why a pipe needs a coat**

* The deck labels “CWC Coating” without expanding it. Confirm the wording (commonly concrete weight coating).

* The one-line job of the adhesive layer is inferred from its position between epoxy and topcoat. Confirm with TCoE.

**c2 — Arrival and the hot wash**

* The deck gives no detail for receiving inspection. Add the checks (documents, surface condition, identification) from the ITP.

* Confirm that the air knife and wash stage have no recorded limits beyond those on the slide.

**c3 — Preheat: dry before you blast**

* The deck writes the oven capacity as “3500 KWH”. Confirm the unit (kW).

* Preheating is optional on the 3LPE/3LPP chart. Confirm when it is applied.

**c4 — Blasting: clean and rough**

* Air blow out has no detail in the deck. Add its purpose and check, if any.

* Confirm how the abrasive mix is chosen for a given order.

**c5 — The blast gate**

* The deck gives no acceptance limit for salt contamination or dust level. Add the specified limits from the ITP.

* Confirm how the NTC route is recorded (traveller, SAP entry).

**c6 — Acid wash and the rinse**

* Confirm the preset dwell time range and who may change it.

* Confirm the two induction pre heating stations on the chart against the equipment layout.

**c7 — Induction heating to 250 °C**

* The deck gives no temperature tolerance. Add the permitted band and the action if the pipe is out of range.

* Confirm the ΔT 225 °C reference temperature for the throughput figure.

**c8 — The epoxy booth**

* The deck gives no layer thickness limits for a 3LPE order. Add them from the order specification.

* The deck names the manufacturer “ITW Gama”; the company is ITW Gema. Correct before release.

* Confirm what the operator does when thickness drifts or the air alarm trips.

**c9 — Layers two and three, and the weld seam**

* The deck gives no thickness limits for the adhesive and PE/PP layers. Add them.

* The deck says “molten HDPE” for the seam. Confirm whether PP pipes use a different material.

**c10 — The quench: 40 metres of water**

* The deck gives no exit temperature and no action for water marks or uneven cooling. Add them.

**c11 — Measure it and look at it**

* The deck gives no thickness limits per layer and no action for under- or over-thickness. Add them.

* Dimensional checks at this station are listed on the chart only. Add the characteristics and tolerances.

**c12 — The holiday test**

* The deck writes “5 volt/Rm” for FBE/DFBE. The reading used here is 5 volts per micrometre of thickness. Confirm.

* The deck prints “3LPE/SLPP” on one slide; read as 3LPE/3LPP.

* The repair criteria are not in the deck. Add them.

**c13 — The peel test**

* The minimum peel value that passes is not in the deck. Add it from the standard or order.

* Confirm the test frequency and sample location.

**c14 — Final inspection, marking and dispatch**

* Acceptance limits for cut back length, bevel angle and FBE toe are not in the deck. Add them.

* Confirm who signs the clearance and whether a third party inspector is involved.

**c15 — Inside the pipe: prepare**

* The internal blasting slide gives dust level as “Level 1 (ISO 8503)”. ISO 8503 covers surface profile, and dust is rated under ISO 8502-3 (as the inspection slide shows). Confirm the intended standard.

* The internal anchor pattern (50 to 100 µm) differs from the external (50 to 110 µm). Confirm both are intended.

* Blow out station has no detail in the deck.

**c16 — Inside the pipe: line it**

* The deck gives no dry film thickness limits or inspection checks after lining. Add them.

* Confirm curing time and handling rules in the yard.

### The Inspector’s Eye

**v1 — Why we test without breaking**

* The “Safety Precautions” slide (p.4) has a title only. Add the safety content.

* The table on p.5 and the “Types of NDT techniques” picture on p.9 are images. Transcribe the list of methods.

**v2 — The oldest test: your eyes**

No scene-specific review note present; this does not establish technical approval.

**v3 — Set up the look**

* The deck gives four different light levels across standards. Confirm which applies to each product and customer.

* The deck says the near vision test uses Jaeger No. 2 at 12 inches. Confirm the current SNT-TC-1A wording used at the plant.

**v4 — The method and three ways to look**

* The deck labels the middle type “Directed Aided VT” on one slide. Read as direct aided.

**v5 — Light, surfaces and the inspector’s aids**

* Mechanical aids on p.34 are shown as a picture only. Add a written list (thread, pitch and thickness gauges, rules and tapes, angle tools, levels, callipers and micrometers) after trainer confirmation.

* Confirm the standard weld gauge set used at the plant.

**v6 — Measure it**

* Slides 42 to 47 are picture-only. Add captions for each instrument shown.

* Confirm calibration intervals for each instrument at the plant.

**v7 — Steel defects atlas**

* The Roll Mark slide (p.52) repeats the Rolled-in Scale text. Correct the description.

* Pitting (p.54) is defined as a coating defect inside the steel-defect list. Confirm its place.

* Tong mark, lap and lamination are listed but have no description slide. Add them.

* Accept and reject limits for each defect are not in the deck.

**v8 — Pipe-body defects**

* Slides 61 to 63 carry only a title and a photograph. Add description, cause, measurement method and acceptance limit for each.

* “Roller mark” and “scratches” appear in the list (p.60) without a photograph slide.

**v9 — Weld defects: cause and defect**

* Cause lists are written for general welding processes. Add how each applies to submerged arc welding in the spiral mill.

* Acceptance limits are not in the deck. Add the limits from the customer specification or API 5L.

* Pages 70 to 72 repeat incomplete root penetration and 73 repeats the same cause list for incomplete root fusion. Confirm that is intended.

**v10 — Where the eye matters on the coating line**

* Add accept and reject criteria that link the two courses, once confirmed with the TCoE.

## Source fingerprints

SHA-256 fingerprints identify the exact files inspected:

* Welspun Corp Technical Centre of Excellence_ Factory Twin & Visual Inspection Master Simulator.html (133192 bytes): `F92F7DF2714EE23DE888CE70CB6928438654BBBB837E8AF48A60624021C66B61`

* Welspun Learning Portal_ Follow the Pipe and The Inspector’s Eye.html (1871275 bytes): `A77CA81AA1E7C5111E84FF6850921D43735423A84759C5554BE9402A73E155E7`

* Welspun_Learning_Portal.html (1913866 bytes): `8BED8CB8373968EA36E6240936B0E37E5D96059BA90E556CD920DCA2E3C68B64`
