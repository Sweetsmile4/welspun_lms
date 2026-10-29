# catalog

Course drafts, approvals and immutable published releases. No publishing workflow implemented.

This module owns its future domain writes. Expose explicit application services; do not import another module's persistence internals.

Phase 2A implements the internal drafts/ boundary: stable course identity, one bounded mutable draft aggregate, modules/lessons, revision editing, scoped authoring, transactional audit and command receipts. No controller, publishing or production composition is enabled. See docs/PHASE2A_COURSE_SERVICE_GUIDE.md from the repository root.

Phase 2B adds publishing/ for explicit synthetic reviewer assignments, exact snapshot decisions, append-only review evidence and immutable course releases. Internal test composition only; no normal-server publishing API. See docs/PHASE2B_REVIEW_SERVICE_GUIDE.md and docs/PHASE2B_RELEASE_INTEGRITY_GUIDE.md.
