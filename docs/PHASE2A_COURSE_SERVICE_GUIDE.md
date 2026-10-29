# Phase 2A internal course draft service

29 October 2026. Backend-only synthetic test composition. No course HTTP endpoint, production identity integration, publishing or frontend authoring exists. The design and corporate decisions are in PHASE2A_COURSE_DOMAIN_DESIGN.md.

## Composition and ownership

`catalog/drafts` owns its schemas, store and service. Compose `createCourseDraftService(repository, store, receipts, identity, audit, {isolatedTest:true, clock?})` with the existing authorization repository, a DraftStore, the existing receipt port, trusted synthetic-test provider and transaction-bound isolated-test audit. Construction and every service entry require NODE_ENV=test and these explicit test capabilities. No normal-server registration was added. Raw attribution IDs cannot authenticate a call.

The authorization repository creates the transaction/session; `createMongoDraftStore(connection, sessionFor)` must receive the same mapping used by the authorization repository's onTransaction hook. It rejects unmapped/inactive sessions. Initialize indexes explicitly before transactions. Never create nested domain transactions or compose a raw repository as an HTTP service.

Compose the existing Mongo audit adapter with `courseTarget: async (tx, org, courseId) => !!await draftStore.course(tx, org, courseId)`. The callback is trusted server composition, uses the same transaction and checks stored organization ownership. Without it the adapter denies course events. `course.mongo.test.ts` demonstrates full real composition; `course-fixture.ts` supplies a rollback-capable memory equivalent. These fixtures are not bootstrap APIs or corporate seeds.

## Entry points and commands

`retrieve(credential, organizationId, courseId)` returns the strict internal Draft record including current revision and ordered modules/lessons, after course.draft.read. Dates are Date objects in this internal contract. No public DTO/HTTP contract is claimed.

`execute(credential, command)` supports the explicit command variants below. Every command requires organizationId, key (8–128 ASCII letters/digits/underscore/hyphen) and UUID requestId; caller actor/role fields are rejected. Credential verification supplies the actor. All non-create commands additionally require courseId and expectedRevision. Create rejects both of those fields. Inputs are strict allowlists.

| change.kind | Required fields besides kind | Permission |
| --- | --- | --- |
| create | code (uppercase canonical), scopeUnitId (null or configured plant/department), title, description, metadata | course.draft.create at organization or stored creation unit |
| metadata | title, description, metadata | course.draft.edit |
| addModule | title, description | course.draft.edit |
| updateModule | moduleId, title, description | course.draft.edit |
| removeModule | moduleId | course.draft.edit |
| reorderModules | ids (complete sibling permutation) | course.draft.edit |
| addLesson | moduleId, title, description, content | course.draft.edit |
| updateLesson | moduleId, lessonId, title, description, content | course.draft.edit |
| removeLesson | moduleId, lessonId | course.draft.edit |
| reorderLessons | moduleId, ids (complete sibling permutation) | course.draft.edit |
| archive | no extra fields | course.draft.archive |

Creation permanently records author ownerId, organization, optional scope and createdBy/time in Course. Code is unique within organization. Draft holds mutable metadata/content and timestamps/attribution. There is one draft per course. No generic patch, owner/scope reassignment, restore, hard course deletion or published state is available.

For example, a synthetic internal command (not an HTTP API) can use:

```ts
await service.execute(trustedSyntheticCredential, {
  organizationId: fixtureOrganizationId,
  requestId: crypto.randomUUID(),
  key: crypto.randomUUID(),
  change: {
    kind: 'create',
    code: 'SYNTHETIC_TEXT_COURSE',
    scopeUnitId: null,
    title: 'Synthetic draft',
    description: 'Unapproved test material',
    metadata: { language: 'en', tags: ['synthetic'], audienceUnitIds: [] },
  },
});
```

Success is `{courseId, draftId, revision, replayed}`. Create starts revision 0. Every later successful command increments aggregate revision exactly once, even a valid no-op replacement/permutation. A replay returns its original acknowledgement and does not increment. Fetch current content separately. The revision is the complete aggregate concurrency token, not an immutable content release identifier.

Modules/lessons start local revision 0. Module revision advances on its metadata or child-list/content edits; reordered/compacted siblings advance when their positions change. Lesson revision advances on content/metadata or changed position. Removing a module removes its embedded lessons atomically. IDs are server generated and stable until removed. Sibling positions are contiguous zero-based values. Reorder arrays must include exactly all current siblings once; foreign IDs, duplicates, gaps and extra IDs are rejected.

## Permissions and content bounds

Own read/edit/archive matches stored author. Explicit organization, unit/subtree or course-resource permissions may cover collaborators. Security administrators have no automatic course permission. A null course scope resolves to the stored organization's root; unit grants cannot authorize an organization-wide draft. Current unit/ancestor status and grants are resolved on every transaction/retry. Audience IDs are same-organization active plant/department references only and never authorize anyone. Archived drafts can be read with current read permission; edit is denied. New archive on archived state conflicts; replay of the original archive is allowed with current archive permission.

Metadata is exactly language, tags and audienceUnitIds. Titles ≤200 characters; descriptions ≤2,000 (empty allowed). Language uses a bounded simple language-tag format. At most 10 unique tags, 40 characters each; at most 20 distinct audience units. Text content is `{type:'text',text}` (1–8,000 characters). Structured content is `{type:'structured',blocks}` with 1–20 paragraph/heading/list blocks. Paragraph/heading text and list items are 1–2,000 characters; headings allow levels 2 or 3; lists allow 1–20 items. Angle brackets and disallowed control characters are rejected. This is plain data, not HTML or Markdown; a future renderer must escape text and preserve accessibility semantics.

Drafts allow at most 20 modules, 20 lessons per module, 100 lessons overall and 256 KiB UTF-8 serialized content/metadata. The runtime stored-record schema enforces identifiers, parent links, unique IDs and contiguous positions as well as payload bounds. Repository writes parse the schema; Mongoose document validation reuses it. Raw update operators/database administrators are not a substitute for service invariants or an authorization boundary.

No arbitrary metadata objects, executable HTML/scripts, URL/embed/file/media payloads or Mongo operators are accepted. Future video/document/quiz/simulation types require a separate reviewed typed schema and asset/evaluator security design. Plain text is not semantic technical approval: drafts remain unapproved; no thresholds or prototype content were imported.

## Transactions, audit, receipts and errors

Identity resolution, organization fence, current permission check, revision check, identity/draft writes, audit and receipt all share the existing snapshot/majority transaction. Store replacement also filters organization/course/revision and draft lifecycle. Stale/concurrent edits conflict; transaction abort leaves no partial identity, content, audit or receipt.

Audit allowlist adds course.draft.created, course.draft.changed and course.draft.archived; target is the stable course ID. No content or employee names are recorded. The adapter validates target ownership using the supplied same-session port. Application append-only behavior is not database-level immutability.

Receipt operation is newly namespaced `course.draft.command.v1`, schema/command/response version 1. No old identity command version was changed. Binding is organization/actor/operation/key hash; fingerprint includes command kind, validated body, course and expected revision. Request ID is correlation only and can differ on retry. Strict stored response is the three-field acknowledgement; retrieval requires a separate read grant. Current create/edit/archive authority precedes receipt lookup. Lost permissions can prevent an old response from being replayed. Archive can similarly block an old edit replay. Invalid versions/bindings/digests or malformed acknowledgements produce REPLAY_UNAVAILABLE; different payload under the same key conflicts. Receipts have no TTL or deletion.

Internal failures use Zod validation errors for invalid schemas, FORBIDDEN for missing/inaccessible authority/resource, DRAFT_CONFLICT for stale revisions, invalid parent/permutation or lifecycle, VALIDATION_ERROR for invalid command/precondition combination, IDEMPOTENCY_CONFLICT for key reuse and SECURITY_AUDIT_UNAVAILABLE for audit failure. Existing repository duplicate/index errors remain mapped by the organization transaction adapter. There is no HTTP status/envelope contract for this module yet; future controllers must translate validation errors safely and preserve standard envelopes.

## Development checks

`npm test` includes offline model validation and shared memory service scenarios. Opt-in `npm run test:mongo:local` includes the same scenarios against actual transactions plus indexes/session checks. Set START_LOCAL_MONGO_FOR_TESTS=true and MONGOD_BINARY to the existing installed binary as documented in the Phase 1B.3C report. No corporate database or ordinary-startup connection is used. Phase 2A adds no package or infrastructure. Existing Playwright remains a regression of placeholder routes only, not a course UI test.
