import { Schema, type Connection, type ClientSession } from 'mongoose';
import { z } from 'zod';
import type { AuthorizationTransaction as Tx } from '../../identity/authorization/types.js';
import { decode } from '../../identity/organization/mongo-repository.js';
import {
  reviewSchema,
  evidenceSchema,
  releaseSchema,
  type Review,
} from './contracts.js';
import type { PublishingStore } from './repository.js';

const options = {
  strict: 'throw' as const,
  versionKey: false as const,
  autoIndex: false,
  autoCreate: false,
  bufferCommands: false,
};
const id = {
  type: Schema.Types.ObjectId,
  required: true,
  immutable: true,
} as const;
function immutableModel(contract: z.ZodType) {
  const schema = new Schema(
    {
      _id: id,
      organizationId: id,
      courseId: id,
      reviewId: { type: Schema.Types.ObjectId, immutable: true },
      number: { type: Number, immutable: true },
      draftId: id,
      draftRevision: { type: Number, required: true, immutable: true },
      actorId: { type: Schema.Types.ObjectId, immutable: true },
      kind: { type: String, immutable: true },
      payload: { type: Schema.Types.Mixed, required: true, immutable: true },
    },
    options,
  );
  schema.pre('validate', function () {
    contract.parse(decode(this.get('payload')));
  });
  for (const operation of [
    'updateOne',
    'updateMany',
    'findOneAndUpdate',
    'replaceOne',
    'deleteOne',
    'deleteMany',
    'findOneAndDelete',
  ] as const)
    schema.pre(operation, function () {
      throw new Error(
        'Immutable catalog evidence cannot be updated or deleted',
      );
    });
  schema.pre('save', function () {
    if (!this.isNew)
      throw new Error('Immutable catalog evidence cannot be overwritten');
  });
  return schema;
}
export const reviewModelSchema = new Schema(
  {
    _id: id,
    organizationId: id,
    courseId: id,
    draftId: id,
    draftRevision: { type: Number, required: true, immutable: true },
    payload: { type: Schema.Types.Mixed, required: true, immutable: true },
    state: { type: String, required: true },
    revision: { type: Number, required: true },
    reviewers: { type: [Schema.Types.ObjectId], required: true },
    evidenceIds: { type: [Schema.Types.ObjectId], required: true },
  },
  options,
);
reviewModelSchema.index(
  { organizationId: 1, courseId: 1, draftId: 1, draftRevision: 1 },
  { unique: true, name: 'review_exact_revision' },
);
reviewModelSchema.index(
  { organizationId: 1, courseId: 1, _id: 1 },
  { name: 'review_scoped_history' },
);
export const evidenceModelSchema = immutableModel(evidenceSchema);
evidenceModelSchema.index(
  { organizationId: 1, reviewId: 1, actorId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      kind: { $in: ['approve', 'changesRequested', 'reject'] },
    },
    name: 'reviewer_one_decision',
  },
);
evidenceModelSchema.index(
  { organizationId: 1, reviewId: 1, _id: 1 },
  { name: 'review_evidence_history' },
);
export const releaseModelSchema = immutableModel(releaseSchema);
releaseModelSchema.index(
  { organizationId: 1, courseId: 1, number: 1 },
  { unique: true, name: 'release_monotonic_identity' },
);
releaseModelSchema.index(
  { organizationId: 1, courseId: 1, draftId: 1, draftRevision: 1 },
  { unique: true, name: 'release_exact_source' },
);
releaseModelSchema.index(
  { organizationId: 1, courseId: 1, _id: 1 },
  { name: 'release_scoped_history' },
);

export function createMongoPublishingStore(
  connection: Connection,
  sessionFor: (tx: Tx) => ClientSession | undefined,
) {
  const reviews = connection.model(
      'CourseReview',
      reviewModelSchema,
      'reviewRequests',
    ),
    evidence = connection.model(
      'CourseReviewEvidence',
      evidenceModelSchema,
      'reviewDecisions',
    ),
    releases = connection.model(
      'CourseRelease',
      releaseModelSchema,
      'courseReleases',
    );
  function session(tx: Tx) {
    const s = sessionFor(tx);
    if (!s?.inTransaction())
      throw new Error('Publishing store requires domain transaction');
    return s;
  }
  type Row = {
    payload: unknown;
    state: string;
    revision: number;
    reviewers: unknown[];
    evidenceIds: unknown[];
  };
  function readReview(value: unknown): Review | null {
    if (!value) return null;
    const row = decode<Row>(value);
    return reviewSchema.parse({
      ...(row.payload as object),
      state: row.state,
      revision: row.revision,
      reviewers: row.reviewers,
      evidenceIds: row.evidenceIds,
    });
  }
  const filter = (org: string, course: string, cursor?: string) => ({
    organizationId: org,
    courseId: course,
    ...(cursor ? { _id: { $gt: cursor } } : {}),
  });
  const store: PublishingStore = {
    review: async (tx, org, id) =>
      readReview(
        await reviews
          .findOne({ organizationId: org, _id: id })
          .session(session(tx))
          .lean(),
      ),
    insertReview: async (tx, input) => {
      const value = reviewSchema.parse(input);
      await reviews.create(
        [
          {
            _id: value.id,
            organizationId: value.organizationId,
            courseId: value.courseId,
            draftId: value.draftId,
            draftRevision: value.draftRevision,
            payload: value,
            state: value.state,
            revision: value.revision,
            reviewers: value.reviewers,
            evidenceIds: value.evidenceIds,
          },
        ],
        { session: session(tx) },
      );
    },
    replaceReview: async (tx, input, expected) => {
      const value = reviewSchema.parse(input);
      return (
        (
          await reviews.updateOne(
            {
              _id: value.id,
              organizationId: value.organizationId,
              courseId: value.courseId,
              revision: expected,
            },
            {
              $set: {
                state: value.state,
                revision: value.revision,
                reviewers: value.reviewers,
                evidenceIds: value.evidenceIds,
              },
            },
            { session: session(tx), runValidators: true },
          )
        ).modifiedCount === 1
      );
    },
    appendEvidence: async (tx, input) => {
      const value = evidenceSchema.parse(input);
      await evidence.create(
        [
          {
            _id: value.id,
            organizationId: value.organizationId,
            courseId: value.courseId,
            draftId: value.draftId,
            draftRevision: value.draftRevision,
            reviewId: value.reviewId,
            actorId: value.actorId,
            kind: value.kind,
            payload: value,
          },
        ],
        { session: session(tx) },
      );
    },
    evidence: async (tx, org, reviewId) =>
      (
        await evidence
          .find({ organizationId: org, reviewId })
          .limit(12)
          .sort({ _id: 1 })
          .session(session(tx))
          .lean()
      ).map((row) => evidenceSchema.parse(decode(row.payload))),
    release: async (tx, org, id) => {
      const row = await releases
        .findOne({ organizationId: org, _id: id })
        .session(session(tx))
        .lean();
      return row ? releaseSchema.parse(decode(row.payload)) : null;
    },
    appendRelease: async (tx, input) => {
      const value = releaseSchema.parse(input);
      await releases.create(
        [
          {
            _id: value.id,
            organizationId: value.organizationId,
            courseId: value.courseId,
            draftId: value.draftId,
            draftRevision: value.draftRevision,
            reviewId: value.reviewId,
            number: value.number,
            payload: value,
          },
        ],
        { session: session(tx) },
      );
    },
    latestNumber: async (tx, org, courseId) =>
      (
        await releases
          .findOne({ organizationId: org, courseId })
          .sort({ number: -1 })
          .session(session(tx))
          .lean()
      )?.number ?? 0,
    reviews: async (tx, org, courseId, limit, cursor) =>
      (
        await reviews
          .find(filter(org, courseId, cursor))
          .sort({ _id: 1 })
          .limit(limit)
          .session(session(tx))
          .lean()
      ).map((row) => readReview(row)!),
    releases: async (tx, org, courseId, limit, cursor) =>
      (
        await releases
          .find(filter(org, courseId, cursor))
          .sort({ _id: 1 })
          .limit(limit)
          .session(session(tx))
          .lean()
      ).map((row) => releaseSchema.parse(decode(row.payload))),
  };
  return {
    ...store,
    async initializeIndexes() {
      for (const model of [reviews, evidence, releases]) {
        await model.createCollection();
        await model.createIndexes();
      }
    },
  };
}
