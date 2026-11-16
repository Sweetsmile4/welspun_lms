import { Schema, type Connection } from 'mongoose';
import { courseSchema, draftSchema } from './contracts.js';
import { decode } from '../../identity/organization/mongo-repository.js';

const id = { type: Schema.Types.ObjectId, required: true } as const;
const immutableId = { ...id, immutable: true };
const options = {
  strict: 'throw' as const,
  versionKey: false as const,
  autoCreate: false,
  autoIndex: false,
  bufferCommands: false,
};
const lesson = new Schema(
  {
    id,
    moduleId: id,
    courseId: id,
    position: { type: Number, required: true },
    revision: { type: Number, required: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    content: { type: Schema.Types.Mixed, required: true },
  },
  { ...options, _id: false },
);
const courseModule = new Schema(
  {
    id,
    courseId: id,
    position: { type: Number, required: true },
    revision: { type: Number, required: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    lessons: [lesson],
  },
  { ...options, _id: false },
);
const course = new Schema(
  {
    _id: immutableId,
    organizationId: immutableId,
    code: { type: String, required: true, immutable: true },
    ownerId: immutableId,
    scopeUnitId: {
      type: Schema.Types.ObjectId,
      default: null,
      immutable: true,
    },
    createdBy: immutableId,
    createdAt: { type: Date, required: true, immutable: true },
  },
  options,
);
const draft = new Schema(
  {
    _id: immutableId,
    courseId: immutableId,
    organizationId: immutableId,
    title: { type: String, required: true },
    description: { type: String, default: '' },
    metadata: { type: Schema.Types.Mixed, required: true },
    status: { type: String, required: true, enum: ['draft', 'archived'] },
    revision: { type: Number, required: true, min: 0 },
    modules: [courseModule],
    createdBy: immutableId,
    updatedBy: id,
    editedBy: { type: [Schema.Types.ObjectId], default: undefined },
    createdAt: { type: Date, required: true, immutable: true },
    updatedAt: { type: Date, required: true },
  },
  options,
);
// Validate the same bounded runtime contract even when the internal model is used directly.
for (const schema of [course, draft] as Schema[]) {
  schema.pre('validate', function () {
    (schema === course ? courseSchema : draftSchema).parse(
      decode(this.toObject()),
    );
  });
}
course.index(
  { organizationId: 1, code: 1 },
  { unique: true, name: 'course_code_identity' },
);
draft.index(
  { organizationId: 1, courseId: 1 },
  { unique: true, name: 'course_current_draft' },
);
draft.index({ organizationId: 1, status: 1 }, { name: 'draft_lifecycle' });
export function createDraftModels(connection: Connection) {
  return {
    courses: connection.model('Course', course, 'courses'),
    drafts: connection.model('ContentDraft', draft, 'contentDrafts'),
  };
}
