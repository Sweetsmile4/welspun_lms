# Phase 2D.2B public contracts

30 October 2026. Offline foundation. These schemas define disclosure/validation boundaries, not enabled routes, authenticated principals or approved Welspun policies.

## Version and package boundary

Import future wire contracts from @welspun/contracts/integration/v1. The new package export points to integration-v1.ts; the original root exports/envelopes remain unchanged. Top-level data DTOs carry schemaVersion:1. Nested module/lesson/feedback/binding values inherit that enclosing version. Error/success envelopes retain the established structure and are versioned by the public contract subpath/future API endpoint version, not an incompatible new envelope field.

All DTO object schemas are strict, including nested content. Existing public title/description/content/metadata validators are reused. No backend/Mongoose/crypto/identity service imports enter the public package. Runtime schemas and inferred types cover the same shapes.

| Schema/type                                  | Allowed disclosure                                                                                                                        |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| sessionSummarySchema / SessionSummary        | user id and display label plus UTC expiry; no issuer/subject, email, token, session ID, roles or grants                                   |
| draftSummarySchema / DraftSummary            | course/draft IDs, code/title/description, configured scope ID, revision/lifecycle and updated time                                        |
| draftDetailSchema / DraftDetail              | summary plus validated metadata, ordered modules/lessons and server-computed digest; no contributor/owner attribution ledger              |
| moduleSchema / Module; lessonSchema / Lesson | explicit IDs/position, bounded titles/descriptions, safe text/structured content; no hidden actor fields or HTML                          |
| reviewSummarySchema / ReviewSummary          | review/draft/course binding, state/time, required/assigned/approved counts; no reviewer directory or complete evidence                    |
| decisionSchema / Decision                    | separately authorized review decision, UTC time and bounded category/message feedback; no actor identity or private evidence IDs/snapshot |
| reviewerCandidateSchema / ReviewerCandidate  | already-authorized minimal candidate ID/display label only; not an unrestricted employee User                                             |
| readinessSchema / Readiness                  | successful review/digest/next-number binding, or bounded public failure reason codes                                                      |
| releaseHistorySchema / ReleaseHistory        | release/course identity, number, source revision/digest, title/time and outline counts; no private approval evidence                      |
| catalogEntrySchema / CatalogEntry            | learner-facing published title/description/code/scope, release identity/number/time and module/lesson counts                              |
| catalogDetailSchema / CatalogDetail          | catalog entry plus published safe outline/content; no draft binding, feedback, approval identity or policy                                |
| paginationSchema, pageSchema, successSchema  | default 20/max 50, explicit ObjectId cursor, bounded typed items; standard requestId/nextCursor metadata                                  |
| safeErrorEnvelopeSchema, unavailableSchema   | fixed known public error vocabulary/messages, bounded nonsecret field codes, UUID correlation; explicit unavailable result                |

An ID field is not an access grant. Candidate identity and decision feedback must be independently authorized before invoking a serializer. Learner data can never use the richer author/reviewer DTO. UI perspective selectors are not permitted inputs to these contracts.

## Scalar and content bounds

IDs are lowercase 24-character ObjectId hex strings. UTC timestamps are Z-suffixed ISO strings; raw Date values and timezone-offset strings fail wire validation. Revisions are integers 0 through Number.MAX_SAFE_INTEGER-1; release numbers are positive. Digests are 64 lowercase hex SHA-256 characters. Keys retain the existing 8-128 character letters/digits/underscore/hyphen convention.

Each course outline has at most 20 modules, 20 lessons per module and 100 total lessons. Module/lesson IDs must be unique across the outline and sibling positions contiguous from 0. Catalog outline counts must agree with the content. Approval counts cannot exceed assignment slots or required approvals; approved/published summaries require all approvals. These are implementation constraints, not corporate policy. Structured paragraphs/headings/lists retain existing bounds and HTML/control-character rejection.

## Pure backend serializers

apps/api/src/integration/serializers.ts exports serializeSession, serializeDraftSummary/Detail, serializeReview, serializeDecision, serializeReviewerCandidate, serializeReadiness, serializeReleaseHistory and serializeCatalogEntry/Detail, plus explicit serializeId/serializeDate scalar helpers.

Domain projections accept decoded backend records validated with existing strict snapshot/review/evidence/release schemas. They do not accept raw Mongoose documents or call generic toJSON/toString traversal. Scalar serializeId accepts a real Mongoose Types.ObjectId or a valid wire string; decoded domain records themselves must already have string IDs, as the existing repository supplies. Date conversion is explicit UTC. Unsupported/missing provenance or invalid bindings fail with a fixed PublicSerializationError, with no internal values or Zod diagnostics exposed.

Fields are projected explicitly, then revalidated against the public schema. No domain record is spread wholesale into a DTO. Source snapshots are neither mutated nor shared through nested DTO references. Learner catalog is derived from a validated immutable release, with no separate data seed or private approval projection. serializeReview checks evidence IDs and organization/course/draft/review/digest binding before deriving counts; it does not perform authorization or current qualification checks.

serializeReadiness supports the existing backend successful readiness result only. The failure-reason wire schema is defined for future use, but there is no adapter that invents a checklist from internal exceptions. That requires a reviewed domain-to-public error adapter later. Similarly no list query, reviewer lookup, session verification, aggregate authorization or database access occurs inside serializers.

## Future HTTP command conventions

parseCommandMetadata is a pure parser, not middleware. It accepts only raw command-header pairs (content-type, idempotency-key, x-request-id, if-match), preserving duplicates before normalization. A future HTTP adapter must extract this subset without collapsing duplicates; authentication headers/cookies are handled separately by the trusted boundary. Unknown command-header names, duplicate case-insensitive names, CR/LF, non-JSON type, missing/invalid key or UUID correlation fail safely.

- Create has no If-Match; a supplied one is rejected.
- Draft/review/publish commands require strong quoted If-Match such as "2". Weak/multiple/wildcard/negative/leading-zero/unsafe integer forms are rejected. Missing precondition has code PRECONDITION_REQUIRED.
- Review bindings name reviewId, draftRevision, reviewRevision and digest explicitly. Header draft revision and body binding must agree. Publishing also supplies expectedReleaseNumber.
- Header parsing returns typed metadata only. AuthorizedHttpCommand additionally requires a nominal trusted request context, which this phase cannot construct. Parsing metadata is not authorization or permission to invoke a domain service.
- No domain receipt namespaces, command schemas, canonical digest, qualification or publishing behavior changed. A future adapter must map these metadata names into the existing internal commands explicitly.

Proposed transport constants: 256KiB aggregate, 300KiB command envelope, 16KiB small body, max 50 page items. assertPayloadSize validates a supplied byte count, not characters or a raw request stream; future adapters must measure actual UTF-8/raw bytes and apply both aggregate and route limits. Current Express 16KiB middleware is unchanged. No upload/media allowance was added.

The future response policy is private, no-store. Constants do not install headers or change current API responses. Auth/authoring/review data must also bypass Next/CDN caching when a real adapter is authorized.

## Errors and retry advice

publicError constructs the existing error envelope with fixed allowlisted messages, empty details and caller-supplied server correlation UUID. It returns status separately. Unsupported error codes map to safe INTERNAL_ERROR; raw driver/error text is never accepted. Strict wire error details permit only bounded field names and INVALID/REQUIRED/CONFLICT codes. Existing Express error handling remains untouched and unconnected to this future vocabulary.

Status mapping:400 malformed JSON,401 authentication,403 forbidden,404 absent,409 state/revision/idempotency conflict,413 payload,415 encoding,422 validation,428 precondition,429 rate limit,500 unexpected,503 integration/dependency/audit/replay unavailable.

retryAdvice is advice only, never an automatic loop or request. Maximum 3 total attempts, bounded exponential delay (250/500ms for remaining attempts; cap2000ms). Only dependency/audit/rate/network cases with preserved logical intent qualify for same-intent retry. Preserve exact actor/org/operation/key/body/revisions, reauthenticate/authorize and keep the same key. Conflicts/unknown internal outcomes/corrupt receipts require reconciliation;401 requires reauthentication; validation requires correction; disabled integration is never retryable. Retry-After/origin/session support remains future transport work. Reload loses pending tab intent; never silently generate a fresh key to replace an unknown commit.
