# Phase 2A course domain design

29 October 2026. Recorded before implementation. These are conservative internal development choices, not approved Welspun policies. Read the Phase 1B.3C report/security/readiness/entry documents and the requested Phase 0 requirements, schema, architecture, permissions, contracts, questions, roadmap and prototype audit. Existing transaction fencing, authoritative resolvers, strict schemas, same-session audit and versioned receipts are reused.

## Ownership and relationships

Catalog owns stable `courses` identities and one mutable `contentDrafts` aggregate per course. Course identity holds immutable organization, normalized code, author owner and optional scope unit; scope may be a configured active plant or department. Null scope is organization-wide and resolves to the actual organization root for authorization. Request audience metadata is informational, validated against the same organization and confers no permission. Neither identity nor scope can be reassigned in this increment.

The draft holds title, description, language/tags/audience, lifecycle draft/archived, revision, timestamps/attribution and bounded ordered modules with embedded lessons. IDs of course, draft, modules and lessons are stable; no array-position IDs. Modules and lessons also retain local revisions; aggregate revision is the required edit precondition and advances on every mutation. Embedding prevents orphan references and makes reordering/removal atomic. It trades granular updates for bounded document rewrites; cap 20 modules, 20 lessons per module, 100 lessons total and 256 KiB serialized draft. This is deliberately a bounded draft manifest, not unlimited media storage.

Future immutable course/lesson releases remain separate from mutable drafts, consistent with Phase 0. No release model/current-release pointer or approval state is implemented. A single current draft reduces branching complexity; historical revision snapshots/branching are deferred. Revision counters and audit are not a complete historical content archive.

## Explicit authorization

Add only course.draft.create/read/edit/archive. Creation checks organization permission for null scope or unit permission for a configured plant/department. Own scope cannot authorize creation; after creation, own read/edit/archive grants match the immutable author. Organization, unit/subtree and explicit course resource grants may authorize other authors' drafts. No implicit permission derives from security.manage, hierarchy position or audience. A department grant does not expand to its plant/siblings. Resource facts come from stored course identity in the same fenced transaction, never caller metadata. Archived drafts remain readable with read permission; new edits/archive transitions are rejected. Archive replay requires current archive permission and returns the original acknowledgement; other edit replays after archive are denied.

## Safe content and ordering

Only plain text and structured text blocks (paragraph, heading, unordered list) are supported. No HTML/Markdown renderer, script, URL/embed, files, media, quiz or simulation payload. Text rejects angle-bracket markup and disallowed controls; it is data and must still be escaped by any future UI. Titles ≤200 characters, descriptions ≤2,000, text lesson ≤8,000, each structured text fragment ≤2,000, ≤20 blocks, lists ≤20 items; tags ≤10 of ≤40 characters and language is a bounded language label. No arbitrary object metadata or Mongo operators. All schemas are strict and bounded. These format/size limits are development defaults, not corporate content standards.

Arrays have contiguous zero-based positions derived on insertion/removal/reorder. Insert appends. Reorder must provide every current sibling ID exactly once; duplicates, omissions, extras and foreign parent IDs fail. Update cannot set IDs, positions, organization, author, revisions or lifecycle. Remove module removes its embedded lessons; no released evidence exists yet. Archive is soft, preserves content and identity, and is terminal in this phase. Maximum total size is checked before persistence.

## Transactions, audit and receipts

Every service call runs through the existing trusted identity and organization write fence. Each mutation validates current scope, expected aggregate revision (create uses no pre-existing revision), lifecycle and parent IDs, then writes identity/draft, domain audit and receipt on the same session. Repository compare-and-set checks the expected revision as a second guard. Audit adds course.draft.created/changed/archived, with resourceId the authoritative course identity; no authored text is logged. The audit adapter validates a same-session course target through an explicitly supplied catalog resolver.

All mutations use a new receipt operation `course.draft.command.v1`, supported command/response/schema version 1. Existing identity command contracts/versions are unchanged. Fingerprints bind organization, actor via key, operation, command kind, course, precondition and validated input. Required caller command key is bounded and hashed. Strict receipt response is only `{courseId, draftId, revision}`: small, stable original acknowledgement; retrieve separately for current content. Current authorization is checked before replay; no duplicate audit. Unsupported/corrupt receipts fail closed through the existing validator. No retention, TTL, migration or deletion is added.

## Non-goals and decisions requiring approval

No public/test HTTP course controller, production SSO, real data, corporate role/hierarchy seed, publishing/SME approval, release history, enrollment, assessment, certificate, simulation, UI, worker job, upload/storage or deployment. No prototype content is imported and no engineering threshold is supplied. Future video/document/quiz/simulation support requires a new typed payload, validation, secure asset/evaluator design and reviewed contract version rather than a generic JSON escape hatch.

Welspun must approve actual author/collaborator scope rules, cross-plant sharing, audience meaning, taxonomy/languages, ownership transfer, archival/restore and retention, independent reviewers/publishers, technical sources/rights, industrial parameters and certification policies. Phase 2B requires a separate instruction and review of exact-revision/hash approval/release contracts. Corporate production blockers remain as recorded in PRODUCTION_READINESS_CHECKLIST.md; they do not confer production readiness on this isolated internal increment.
