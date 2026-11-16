import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createLocalIntegrationDatabase } from '../src/integration/local-database.js';
import { localIntegrationSchemaManifest } from '../src/integration/schema-manifest.js';
import {
  compareLocalIntegrationSchema,
  setupLocalIntegrationSchema,
} from '../src/integration/schema-setup.js';
import { createIntegrationModels } from '../src/integration/session-models.js';
import {
  isLoginTransactionConsumable,
  isSessionUsable,
} from '../src/integration/session-store.js';

const enabled = process.env.RUN_MONGO_INTEGRATION === 'true';
describe.skipIf(!enabled)('disposable local integration storage', () => {
  let database: ReturnType<typeof createLocalIntegrationDatabase>;
  async function fresh(
    work: (
      db: ReturnType<typeof createLocalIntegrationDatabase>,
    ) => Promise<void>,
  ) {
    const name = 'welspun_lms_integration_' + randomUUID().replaceAll('-', '');
    const uri = new URL(database.configuration.uri);
    uri.pathname = '/' + name;
    const db = createLocalIntegrationDatabase({
      ...database.configuration,
      uri: uri.toString(),
      databaseName: name,
    });
    try {
      await db.connect({ explicitlyAllowConnection: true });
      await work(db);
    } finally {
      if (db.state === 1)
        await db.cleanup({
          explicitlyAllowCleanup: true,
          ownershipMarker: 'welspun-lms-local-integration-v1',
        });
      await db.disconnect();
    }
  }
  beforeAll(async () => {
    if (
      !process.env.MONGO_TEST_URI ||
      process.env.MONGO_TEST_ALLOW_WRITE !== 'true'
    )
      throw new Error(
        'Explicit disposable local Mongo URI/write opt-in required',
      );
    const source = new URL(process.env.MONGO_TEST_URI);
    const databaseName =
      'welspun_lms_integration_' + randomUUID().replaceAll('-', '');
    const uri = new URL(
      `mongodb://${source.hostname}:${source.port}/${databaseName}`,
    );
    uri.searchParams.set(
      'replicaSet',
      source.searchParams.get('replicaSet') ?? 'phase1b1',
    );
    uri.searchParams.set('appName', 'welspun-lms-local-integration-v1');
    database = createLocalIntegrationDatabase({
      uri: uri.toString(),
      databaseName,
      ownershipMarker: 'welspun-lms-local-integration-v1',
    });
    await database.connect({ explicitlyAllowConnection: true });
  });
  afterAll(async () => {
    if (database) {
      await database.cleanup({
        explicitlyAllowCleanup: true,
        ownershipMarker: 'welspun-lms-local-integration-v1',
      });
      await database.disconnect();
    }
  });

  it('creates an additive manifest and safely converges on rerun', async () => {
    const manifest = localIntegrationSchemaManifest(database.connection);
    const first = await setupLocalIntegrationSchema(database.connection, {
      explicitlyAllowSetup: true,
      expectedChecksum: manifest.checksum,
    });
    const second = await setupLocalIntegrationSchema(database.connection, {
      explicitlyAllowSetup: true,
      expectedChecksum: manifest.checksum,
    });
    expect(first.drift).toEqual([]);
    expect(first.duplicates).toEqual([]);
    expect(second.drift).toEqual([]);
    expect(second.duplicates).toEqual([]);
    expect(second.ledger?.checksum).toBe(manifest.checksum);
    const indexes = await database.connection
      .db!.collection('developmentSessions')
      .indexes();
    expect(
      indexes.some(
        (index) =>
          index.name === 'development_session_token_unique' && index.unique,
      ),
    ).toBe(true);
    expect(
      indexes.some(
        (index) =>
          index.name === 'development_session_expiry_cleanup' &&
          index.expireAfterSeconds === 0,
      ),
    ).toBe(true);
  });
  async function runCli(
    db: ReturnType<typeof createLocalIntegrationDatabase>,
    mode: string,
    checksum = '',
  ) {
    return promisify(execFile)(
      process.execPath,
      ['--import', 'tsx', 'scripts/setup-integration-local.ts', mode],
      {
        cwd: process.cwd(),
        windowsHide: true,
        timeout: 20000,
        env: {
          ...process.env,
          NODE_ENV: 'test',
          LOCAL_INTEGRATION_SETUP: 'true',
          LOCAL_INTEGRATION_MONGOURI: db.configuration.uri,
          LOCAL_INTEGRATION_DATABASE_NAME: db.configuration.databaseName,
          LOCAL_INTEGRATION_EXPECTED_CHECKSUM: checksum,
        },
      },
    );
  }
  it('operator CLI dry-run does not mutate', async () => {
    await fresh(async (db) => {
      const dry = await runCli(db, '--dry-run');
      const comparison = JSON.parse(dry.stdout) as {
        manifest: { checksum: string };
      };
      expect(comparison.manifest.checksum).toBe(
        localIntegrationSchemaManifest(db.connection).checksum,
      );
      expect(await db.connection.db!.listCollections().toArray()).toEqual([]);
    });
  });
  it('operator CLI apply refuses a missing reviewed checksum before any writes', async () => {
    await fresh(async (db) => {
      await expect(runCli(db, '--apply')).rejects.toMatchObject({ code: 1 });
      expect(await db.connection.db!.listCollections().toArray()).toEqual([]);
    });
  });
  it('operator CLI apply converges with an explicitly reviewed checksum', async () => {
    await fresh(async (db) => {
      const checksum = localIntegrationSchemaManifest(db.connection).checksum;
      expect((await runCli(db, '--apply', checksum)).stdout).toContain(
        'Applied local-integration-schema-v1',
      );
      expect(
        (await compareLocalIntegrationSchema(db.connection)).drift,
      ).toEqual([]);
    });
  });

  it('checks session expiry and revocation explicitly while TTL remains cleanup', async () => {
    const models = createIntegrationModels(database.connection);
    const now = new Date();
    const record = {
      sessionTokenHash: 'a'.repeat(64),
      organizationId: '000000000000000000000001',
      userId: '000000000000000000000002',
      issuedAt: now,
      authenticatedAt: now,
      idleExpiresAt: new Date(now.getTime() + 60_000),
      expiresAt: new Date(now.getTime() + 3_600_000),
      revokedAt: null,
      csrfBindingHash: 'b'.repeat(64),
    };
    const stored = await models.sessions.create(record);
    expect(isSessionUsable(stored.toObject() as never, now)).toBe(true);
    expect(
      isSessionUsable(
        stored.toObject() as never,
        new Date(now.getTime() + 60_001),
      ),
    ).toBe(false);
    stored.revokedAt = new Date(now.getTime() + 1_000);
    await stored.save();
    const revoked = await models.sessions.findById(stored._id).lean();
    expect(isSessionUsable(revoked as never, now)).toBe(false);
    const tx = await models.loginTransactions.create({
      transactionHash: 'c'.repeat(64),
      stateHash: 'd'.repeat(64),
      issuer: 'urn:placeholder:development-issuer',
      subject: 'placeholder-author',
      createdAt: now,
      expiresAt: new Date(now.getTime() + 60_000),
      consumedAt: null,
    });
    expect(isLoginTransactionConsumable(tx.toObject() as never, now)).toBe(
      true,
    );
    const consumed = await Promise.all(
      [1, 2].map(() =>
        models.loginTransactions.findOneAndUpdate(
          {
            transactionHash: 'c'.repeat(64),
            stateHash: 'd'.repeat(64),
            consumedAt: null,
            expiresAt: { $gt: now },
          },
          { $set: { consumedAt: now } },
          { returnDocument: 'after' },
        ),
      ),
    );
    expect(consumed.filter(Boolean)).toHaveLength(1);
    expect(
      isLoginTransactionConsumable(
        (await models.loginTransactions.findById(tx._id).lean()) as never,
        now,
      ),
    ).toBe(false);
    expect(
      isLoginTransactionConsumable(
        tx.toObject() as never,
        new Date(now.getTime() + 120_000),
      ),
    ).toBe(false);
  });
  it('dry-run is read-only; interrupted setup resumes without an applied ledger', async () => {
    await fresh(async (db) => {
      const comparison = await compareLocalIntegrationSchema(db.connection);
      expect(await db.connection.db!.listCollections().toArray()).toEqual([]);
      const model = db.connection.models.Course!;
      const original = model.createIndexes.bind(model);
      const spy = vi
        .spyOn(model, 'createIndexes')
        .mockRejectedValueOnce(new Error('injected interruption'));
      await expect(
        setupLocalIntegrationSchema(db.connection, {
          explicitlyAllowSetup: true,
          expectedChecksum: comparison.manifest.checksum,
        }),
      ).rejects.toThrow('injected');
      spy.mockRestore();
      expect(
        await db.connection
          .db!.collection('schemaMigrationLedger')
          .countDocuments(),
      ).toBe(0);
      expect(original).toBeTypeOf('function');
      const done = await setupLocalIntegrationSchema(db.connection, {
        explicitlyAllowSetup: true,
        expectedChecksum: comparison.manifest.checksum,
      });
      expect(done.drift).toEqual([]);
      expect(
        await db.connection
          .db!.collection('schemaMigrationLedger')
          .countDocuments(),
      ).toBe(1);
    });
  });
  it('duplicate data, index options drift, checksum and unknown version fail closed', async () => {
    await fresh(async (db) => {
      const before = await compareLocalIntegrationSchema(db.connection);
      await db.connection
        .db!.collection('organizations')
        .insertMany([{ code: 'DUP' }, { code: 'DUP' }]);
      expect(
        (await compareLocalIntegrationSchema(db.connection)).duplicates.some(
          (d) => d.collection === 'organizations',
        ),
      ).toBe(true);
      await expect(
        setupLocalIntegrationSchema(db.connection, {
          explicitlyAllowSetup: true,
          expectedChecksum: before.manifest.checksum,
        }),
      ).rejects.toThrow('duplicate keys');
      expect(
        await db.connection.db!.collection('organizations').countDocuments(),
      ).toBe(2);
    });
    await fresh(async (db) => {
      const manifest = localIntegrationSchemaManifest(db.connection);
      await db.connection
        .db!.collection('courses')
        .createIndex(
          { organizationId: 1, code: 1 },
          { name: 'course_code_identity', sparse: true },
        );
      expect(
        (await compareLocalIntegrationSchema(db.connection)).drift.some((d) =>
          d.conflicting.includes('course_code_identity'),
        ),
      ).toBe(true);
      await expect(
        setupLocalIntegrationSchema(db.connection, {
          explicitlyAllowSetup: true,
          expectedChecksum: manifest.checksum,
        }),
      ).rejects.toThrow('drift');
    });
    await expect(
      setupLocalIntegrationSchema(database.connection, {
        explicitlyAllowSetup: true,
        expectedChecksum: 'wrong',
      }),
    ).rejects.toThrow('checksum');
    await fresh(async (db) => {
      await db.connection
        .db!.collection('schemaMigrationLedger')
        .insertOne({ manifestVersion: 'unknown-future', checksum: 'x' });
      await expect(
        compareLocalIntegrationSchema(db.connection),
      ).rejects.toThrow('Unsupported');
    });
    await fresh(async (db) => {
      const manifest = localIntegrationSchemaManifest(db.connection);
      await db.connection
        .db!.collection('schemaMigrationLedger')
        .insertOne({ manifestVersion: manifest.version, checksum: 'bad' });
      await expect(
        setupLocalIntegrationSchema(db.connection, {
          explicitlyAllowSetup: true,
          expectedChecksum: manifest.checksum,
        }),
      ).rejects.toThrow('ledger checksum');
    });
  });
  it('rolls back domain/audit/receipt writes together and enforces receipt uniqueness', async () => {
    const conn = database.connection,
      session = await conn.startSession();
    const organizationId = new (await import('mongoose')).Types.ObjectId();
    const receipt = {
      organizationId,
      actorId: organizationId,
      operation: 'storage-only-probe',
      keyHash: randomUUID(),
    };
    try {
      await expect(
        session.withTransaction(async () => {
          await conn
            .db!.collection('courses')
            .insertOne({ organizationId, code: 'ROLLBACK' }, { session });
          await conn
            .db!.collection('securityAuditEvents')
            .insertOne({ eventId: randomUUID(), organizationId }, { session });
          await conn
            .db!.collection('managementCommandReceipts')
            .insertOne(receipt, { session });
          throw new Error('storage rollback probe');
        }),
      ).rejects.toThrow('rollback probe');
      for (const collection of [
        'courses',
        'securityAuditEvents',
        'managementCommandReceipts',
      ])
        expect(
          await conn
            .db!.collection(collection)
            .countDocuments({ organizationId }),
        ).toBe(0);
      await conn.db!.collection('managementCommandReceipts').insertOne(receipt);
      await expect(
        conn
          .db!.collection('managementCommandReceipts')
          .insertOne({ ...receipt, _id: undefined }),
      ).rejects.toMatchObject({ code: 11000 });
    } finally {
      await session.endSession();
    }
  });
  it('same adapter recovers from an open failure and reconnects with no automatic setup', async () => {
    const db = createLocalIntegrationDatabase(database.configuration);
    const spy = vi
      .spyOn(db.connection, 'openUri')
      .mockRejectedValueOnce(new Error('private driver diagnostic'));
    await expect(
      db.connect({ explicitlyAllowConnection: true }),
    ).rejects.toThrow('Local integration MongoDB connection failed');
    spy.mockRestore();
    try {
      await db.connect({ explicitlyAllowConnection: true });
      expect(db.state).toBe(1);
    } finally {
      await db.disconnect();
    }
  });

  it('redacts connection failure and refuses unauthorized cleanup', async () => {
    const invalid = createLocalIntegrationDatabase({
      uri: 'mongodb://127.0.0.1:1/welspun_lms_integration_failure?appName=welspun-lms-local-integration-v1',
      databaseName: 'welspun_lms_integration_failure',
      ownershipMarker: 'welspun-lms-local-integration-v1',
      serverSelectionTimeoutMS: 100,
      connectTimeoutMS: 100,
    });
    await expect(
      invalid.connect({ explicitlyAllowConnection: true }),
    ).rejects.toThrow('Local integration MongoDB connection failed');
    await expect(
      database.cleanup({
        explicitlyAllowCleanup: true,
        ownershipMarker: 'wrong',
      }),
    ).rejects.toThrow('ownership marker');
    await expect(
      database.cleanup({
        explicitlyAllowCleanup: false as never,
        ownershipMarker: 'welspun-lms-local-integration-v1',
      }),
    ).rejects.toThrow('ownership marker');
    await invalid.disconnect();
  });

  it('reports no drift after setup and does not infer a production target', async () => {
    const comparison = await compareLocalIntegrationSchema(database.connection);
    expect(comparison.drift).toEqual([]);
    expect(comparison.duplicates).toEqual([]);
    expect(database.configuration.databaseName).toMatch(
      /^welspun_lms_integration_/,
    );
    expect(database.configuration.databaseName).not.toBe('welspun_lms_dev');
  });
});
