# Phase 2D.1 frontend architecture

30 October 2026. Local simulated course-management refinement. Phase 0 proposals remain unapproved corporate policies.

## Audit and retained architecture

Read README; Phase 2A, 2B, 2B.1 and 2C reports; catalog design/frontend guide; preview architecture; review/publishing design; open questions. Inspected Next routes, shell, CSS tokens, provider, fixture model, public Zod contracts and existing Playwright scenarios. Git status was checked before edits; existing uncommitted Phase 2C and earlier work was preserved.

The existing workspace already provides bounded metadata/module/lesson editing, named sibling reorder controls, a keyboard tablist, explicit perspectives, configurable synthetic approval slots, immutable submitted snapshots, exact revision/digest checks, structured decisions, readiness reasons, release history and catalog links. Retaining this logic avoids a high-risk rewrite for a presentation phase.

The persistent development layout and React provider remain the only shared state owner. Drafts, reviews, releases, selection, visual perspective, visibility, operation status and busy state survive in-app navigation. Search and lifecycle filters are local presentation state. No new state-management dependency, storage, fetch, server action, API registration or database connection was introduced. Reload/reset semantics are unchanged.

## Refinements and trade-offs

- Dashboard counts distinguish active drafts, unique published course IDs and all simulated releases. These are derived from fixture arrays, not employee metrics. A course can have both an active draft and a published snapshot.
- Search matches draft title/code; lifecycle filter separates active and archived drafts. Empty results give recovery instructions. Cards retain code, title, configured fictional scope, revision, lifecycle and published-snapshot availability.
- Builder retains exact contracts and mutation helpers. Inline title/description validation reuses public schemas on blur; submit/aggregate validation remains authoritative within the simulation. Language/code/tags retain existing specialized submit validation rather than applying a generic title rule. Form notes explain save/discard behavior and read-only perspectives. Module/lesson totals and reorder instructions clarify the hierarchy.
- Native browser confirmation dialogs guard archive and publication. Native modality provides browser-managed keyboard focus and Escape/cancel behavior without adding a dialog library. Appearance depends on browser; this is a deliberate simplicity trade-off. Publication still checks readiness first and clones the exact submitted snapshot only after confirmation. Cancel creates no release. Archive cancel leaves lifecycle unchanged.
- Review shows assigned slots/approval progress and a prominent stale-revision warning. The existing complete digest check remains in readiness; the visible revision warning does not replace it. Changes-requested/rejected evidence and configurable demonstration approval count remain unchanged.
- Release History identifies latest versus previous release while retaining source revision, timestamps, digest, evidence and content. No withdrawal/correction policy is introduced.
- ContentView is shared by catalog details and history. React renders text and safe structured blocks; there is no HTML execution or second catalog dataset.
- Navy tokens, subtle surface shadows, consistent green published indicators, field-error styles, link focus rings and reduced-motion behavior extend the existing visual system. Existing employee placeholders remain unchanged.

## Boundaries and integration prerequisites

LMS_UI_PREVIEW must equal the server-only string true at layout/page guards. The flag permits only nonsecret synthetic UI; it does not authenticate or authorize. Normal API and worker remain disconnected and management services test-only. Browser perspectives never identify employees.

Before Phase 2D.2: agree an explicitly isolated authenticated test-session/transport boundary; server-side scoped action enforcement; CSRF/origin/session lifecycle; DTO/error/version/retry mapping; disposable-data lifecycle; audit/idempotency tests; corporate SSO and real authorization/publishing policies where applicable. None is inferred from a polished preview. No Phase 2D.2 implementation is included.
