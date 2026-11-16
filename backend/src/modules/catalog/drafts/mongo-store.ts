import { type ClientSession, type Connection } from 'mongoose';
import type { AuthorizationTransaction } from '../../identity/authorization/types.js';
import { decode } from '../../identity/organization/mongo-repository.js';
import {
  courseSchema,
  draftSchema,
  type Course,
  type Draft,
} from './contracts.js';
import { createDraftModels } from './models.js';
import type { DraftStore } from './repository.js';

export function createMongoDraftStore(
  connection: Connection,
  sessionFor: (tx: AuthorizationTransaction) => ClientSession | undefined,
) {
  const models = createDraftModels(connection);
  function session(tx: AuthorizationTransaction) {
    const value = sessionFor(tx);
    if (!value?.inTransaction())
      throw new Error('Draft store requires domain transaction');
    return value;
  }
  function record<T extends { id: string }>(input: T) {
    const { id, ...rest } = input;
    return { _id: id, ...rest };
  }
  const store: DraftStore = {
    course: async (tx, org, id) => {
      const row = decode<Course | null>(
        await models.courses
          .findOne({ organizationId: org, _id: id })
          .session(session(tx))
          .lean(),
      );
      return row ? courseSchema.parse(row) : null;
    },
    draft: async (tx, org, courseId) => {
      const row = decode<Draft | null>(
        await models.drafts
          .findOne({ organizationId: org, courseId })
          .session(session(tx))
          .lean(),
      );
      return row ? draftSchema.parse(row) : null;
    },
    insert: async (tx, course, draft) => {
      await models.courses.create([record(courseSchema.parse(course))], {
        session: session(tx),
      });
      await models.drafts.create([record(draftSchema.parse(draft))], {
        session: session(tx),
      });
    },
    replace: async (tx, input, expected) => {
      const draft = draftSchema.parse(input);
      const result = await models.drafts.updateOne(
        {
          _id: draft.id,
          organizationId: draft.organizationId,
          courseId: draft.courseId,
          revision: expected,
          status: 'draft',
        },
        {
          $set: {
            title: draft.title,
            description: draft.description,
            metadata: draft.metadata,
            modules: draft.modules,
            status: draft.status,
            revision: draft.revision,
            updatedAt: draft.updatedAt,
            updatedBy: draft.updatedBy,
            editedBy: draft.editedBy,
          },
        },
        { session: session(tx), runValidators: true },
      );
      return result.modifiedCount === 1;
    },
  };
  return {
    ...store,
    async initializeIndexes() {
      for (const model of Object.values(models)) {
        await model.createCollection();
        await model.createIndexes();
      }
    },
  };
}
