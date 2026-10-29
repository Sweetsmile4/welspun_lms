import {
  Schema,
  Types,
  type ClientSession,
  type Connection,
  type PipelineStage,
} from 'mongoose';
import { createOrganizationModels } from '../organization/models.js';
import { createAuthorizationModels } from '../authorization/models.js';
import { decode } from '../organization/mongo-repository.js';
import type { AuthorizationTransaction } from '../authorization/types.js';
import type { ManagementStore } from './store.js';
import { receiptSchema as validatedReceipt } from './receipts.js';
const receiptSchema = new Schema(
  {
    schemaVersion: { type: Number, required: true, immutable: true, enum: [1] },
    commandVersion: {
      type: Number,
      required: true,
      immutable: true,
      enum: [1],
    },
    responseVersion: {
      type: Number,
      required: true,
      immutable: true,
      enum: [1],
    },
    responseDigest: {
      type: String,
      required: true,
      immutable: true,
      match: /^[a-f\d]{64}$/,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      required: true,
      immutable: true,
    },
    actorId: { type: Schema.Types.ObjectId, required: true, immutable: true },
    operation: {
      type: String,
      required: true,
      immutable: true,
      maxlength: 100,
    },
    keyHash: {
      type: String,
      required: true,
      immutable: true,
      match: /^[a-f\d]{64}$/,
    },
    fingerprint: {
      type: String,
      required: true,
      immutable: true,
      match: /^[a-f\d]{64}$/,
    },
    data: { type: Schema.Types.Mixed, required: true, immutable: true },
    createdAt: { type: Date, required: true, immutable: true },
  },
  {
    strict: 'throw',
    versionKey: false,
    autoCreate: false,
    autoIndex: false,
    bufferCommands: false,
  },
);
receiptSchema.index(
  { organizationId: 1, actorId: 1, operation: 1, keyHash: 1 },
  { unique: true, name: 'management_command_identity' },
);
export function createMongoManagementStore(
  connection: Connection,
  sessionFor: (tx: AuthorizationTransaction) => ClientSession | undefined,
) {
  const receipts = connection.model(
    'ManagementCommandReceipt',
    receiptSchema,
    'managementCommandReceipts',
  );
  const org = createOrganizationModels(connection),
    auth = createAuthorizationModels(connection);
  function session(tx: AuthorizationTransaction) {
    const value = sessionFor(tx);
    if (!value?.inTransaction())
      throw new Error('Management store requires the domain transaction');
    return value;
  }
  const store: ManagementStore = {
    page: async (tx, entity, stages, query) => {
      const model = {
        employee: org.users,
        unit: org.orgUnits,
        role: auth.roleDefinitions,
        grant: auth.roleGrants,
      }[entity];
      const page: PipelineStage.FacetPipelineStage[] = [
        ...(query.cursor
          ? [{ $match: { _id: { $gt: new Types.ObjectId(query.cursor) } } }]
          : []),
        { $sort: { _id: 1 } },
        { $limit: query.limit + 1 },
      ];
      const result = await model
        .aggregate<Record<string, unknown>>([
          ...stages,
          { $facet: { items: page, total: [{ $count: 'value' }] } },
        ])
        .session(session(tx));
      const value = result[0] as unknown as {
        items: Record<string, unknown>[];
        total: { value: number }[];
      };
      const more = value.items.length > query.limit;
      const items = decode<Record<string, unknown>[]>(
        value.items.slice(0, query.limit),
      );
      return {
        items,
        total: value.total[0]?.value ?? 0,
        nextCursor: more ? String(items.at(-1)!.id) : null,
      };
    },
    receipt: async (tx, key) =>
      decode(
        await receipts
          .findOne(key)
          .select({ _id: 0 })
          .session(session(tx))
          .lean(),
      ),
    saveReceipt: async (tx, value) => {
      const record = validatedReceipt.parse(value);
      await receipts.create([record], { session: session(tx) });
    },
  };
  return {
    ...store,
    async initializeIndexes() {
      if (connection.readyState !== 1)
        throw new Error('Disconnected management store');
      await receipts.createCollection();
      await receipts.createIndexes();
    },
  };
}
