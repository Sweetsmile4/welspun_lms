import type { Connection } from 'mongoose';
import {
  localIntegrationSchemaManifest,
  type SchemaManifest,
} from './schema-manifest.js';
import { assertLocalIntegrationConnection } from './local-database.js';

export type SchemaDrift = {
  collection: string;
  missing: string[];
  unexpected: string[];
  conflicting: string[];
};
export type SchemaDuplicateConflict = {
  collection: string;
  index: string;
};
export type SchemaComparison = {
  manifest: SchemaManifest;
  drift: SchemaDrift[];
  duplicates: SchemaDuplicateConflict[];
  ledger: { manifestVersion: string; checksum: string } | null;
};

function indexKey(value: {
  key: Record<string, unknown>;
  name?: string;
  unique?: boolean;
  partialFilterExpression?: unknown;
  expireAfterSeconds?: number;
  sparse?: boolean;
  collation?: unknown;
  hidden?: boolean;
}) {
  return JSON.stringify({
    name: value.name ?? null,
    key: Object.entries(value.key),
    unique: value.unique ?? false,
    partialFilterExpression: value.partialFilterExpression ?? null,
    expireAfterSeconds: value.expireAfterSeconds ?? null,
    sparse: value.sparse ?? false,
    collation: value.collation ?? null,
    hidden: value.hidden ?? false,
  });
}

async function hasDuplicateKeys(
  connection: Connection,
  collection: string,
  index: { keys: Record<string, unknown>; options: Record<string, unknown> },
) {
  if (
    index.options.unique !== true ||
    index.options.sparse === true ||
    index.options.collation !== undefined ||
    !Object.keys(index.keys).length ||
    Object.entries(index.keys).some(
      ([key, direction]) =>
        key.startsWith('$') || typeof direction !== 'number',
    )
  )
    return false;
  const group = Object.fromEntries(
    Object.keys(index.keys).map((key) => [key, `$${key}`]),
  );
  const pipeline: Record<string, unknown>[] = [];
  if (index.options.partialFilterExpression)
    pipeline.push({ $match: index.options.partialFilterExpression });
  pipeline.push(
    { $group: { _id: group, count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
    { $limit: 1 },
  );
  const rows = await connection
    .db!.collection(collection)
    .aggregate(pipeline)
    .toArray();
  return rows.length > 0;
}

export async function compareLocalIntegrationSchema(
  connection: Connection,
): Promise<SchemaComparison> {
  assertLocalIntegrationConnection(connection);
  const manifest = localIntegrationSchemaManifest(connection);
  if (
    await connection
      .db!.collection('schemaMigrationLedger')
      .findOne({ manifestVersion: { $ne: manifest.version } })
  )
    throw new Error('Unsupported local integration schema ledger version');
  const ledger = (await connection
    .db!.collection('schemaMigrationLedger')
    .findOne(
      { manifestVersion: manifest.version },
      { projection: { _id: 0, manifestVersion: 1, checksum: 1 } },
    )) as { manifestVersion: string; checksum: string } | null;
  const drift: SchemaDrift[] = [];
  const duplicates: SchemaDuplicateConflict[] = [];
  for (const expected of manifest.entries) {
    const actual = await connection
      .db!.listCollections({ name: expected.collection })
      .toArray();
    if (!actual.length) {
      drift.push({
        collection: expected.collection,
        missing: expected.indexes.map((index) => String(index.options.name)),
        unexpected: [],
        conflicting: [],
      });
      continue;
    }
    const info = actual[0]!;
    if (
      info.type !== 'collection' ||
      Object.keys('options' in info ? (info.options ?? {}) : {}).length
    ) {
      drift.push({
        collection: expected.collection,
        missing: [],
        unexpected: [],
        conflicting: ['collection-options'],
      });
      continue;
    }
    const indexes = await connection
      .db!.collection(expected.collection)
      .indexes();
    const actualByName = new Map(indexes.map((index) => [index.name, index]));
    const expectedNames = new Set(
      expected.indexes.map((index) => String(index.options.name)),
    );
    const missing: string[] = [];
    const conflicting: string[] = [];
    for (const index of expected.indexes) {
      const name = String(index.options.name);
      const existing = actualByName.get(name);
      if (!existing) missing.push(name);
      else if (
        indexKey({ key: index.keys, ...index.options }) !== indexKey(existing)
      )
        conflicting.push(name);
    }
    const unexpected = indexes
      .filter(
        (index) =>
          index.name && index.name !== '_id_' && !expectedNames.has(index.name),
      )
      .map((index) => index.name!);
    if (missing.length || unexpected.length || conflicting.length)
      drift.push({
        collection: expected.collection,
        missing,
        unexpected,
        conflicting,
      });
    for (const index of expected.indexes) {
      if (await hasDuplicateKeys(connection, expected.collection, index))
        duplicates.push({
          collection: expected.collection,
          index: String(index.options.name),
        });
    }
  }
  return { manifest, drift, duplicates, ledger };
}

export async function setupLocalIntegrationSchema(
  connection: Connection,
  options: { explicitlyAllowSetup: true; expectedChecksum: string },
) {
  assertLocalIntegrationConnection(connection);
  if (options.explicitlyAllowSetup !== true)
    throw new Error(
      'Local integration schema setup requires explicit operator intent',
    );
  const comparison = await compareLocalIntegrationSchema(connection);
  if (comparison.manifest.checksum !== options.expectedChecksum)
    throw new Error(
      'Local integration schema checksum does not match the requested manifest',
    );
  if (
    comparison.ledger &&
    comparison.ledger.checksum !== comparison.manifest.checksum
  )
    throw new Error('Local integration schema ledger checksum mismatch');
  if (comparison.duplicates.length)
    throw new Error(
      'Local integration schema duplicate keys require manual review',
    );
  if (
    comparison.drift.some(
      (item) => item.unexpected.length || item.conflicting.length,
    )
  )
    throw new Error('Local integration schema drift requires manual review');
  for (const expected of comparison.manifest.entries) {
    const model =
      connection.models[
        Object.keys(connection.models).find(
          (name) =>
            connection.models[name]!.collection.name === expected.collection,
        )!
      ];
    if (!model)
      throw new Error(
        'Local integration schema model registration is incomplete',
      );
    await model.createCollection().catch((error: unknown) => {
      if (!(
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 48
      ))
        throw error;
    });
    await model.createIndexes();
  }
  const ledger = connection.db!.collection('schemaMigrationLedger');
  await ledger.updateOne(
    { manifestVersion: comparison.manifest.version },
    {
      $setOnInsert: {
        manifestVersion: comparison.manifest.version,
        checksum: comparison.manifest.checksum,
        appliedAt: new Date(),
        operation: 'additive-index-schema',
      },
    },
    { upsert: true },
  );
  const result = await compareLocalIntegrationSchema(connection);
  if (
    result.ledger?.checksum !== result.manifest.checksum ||
    result.drift.length ||
    result.duplicates.length
  )
    throw new Error('Local integration schema setup did not converge');
  return result;
}
