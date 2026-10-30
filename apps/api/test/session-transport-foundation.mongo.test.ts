import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  hashOpaqueSecret,
  createOpaqueSecret,
} from '../src/integration/session-crypto.js';
import { verifyCurrentMutationCsrf } from '../src/integration/csrf-origin.js';
import { Types } from 'mongoose';
import { randomUUID } from 'node:crypto';
import { createLocalIntegrationDatabase } from '../src/integration/local-database.js';
import { localIntegrationSchemaManifest } from '../src/integration/schema-manifest.js';
import { setupLocalIntegrationSchema } from '../src/integration/schema-setup.js';
import {
  createMongoSessionStore,
  createSessionLifecycle,
} from '../src/integration/session-lifecycle.js';

const enabled = process.env.RUN_MONGO_INTEGRATION === 'true';
describe.skipIf(!enabled)(
  'secure session lifecycle on disposable local MongoDB',
  () => {
    let database: ReturnType<typeof createLocalIntegrationDatabase>;
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
      const manifest = localIntegrationSchemaManifest(database.connection);
      await setupLocalIntegrationSchema(database.connection, {
        explicitlyAllowSetup: true,
        expectedChecksum: manifest.checksum,
      });
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

    async function principal(org = 'a'.repeat(24), user = 'b'.repeat(24)) {
      await database.connection
        .db!.collection('organizations')
        .updateOne(
          { _id: new Types.ObjectId(org) },
          { $set: { status: 'active', code: 'DEV_' + org.toUpperCase() } },
          { upsert: true },
        );
      await database.connection.db!.collection('users').updateOne(
        { _id: new Types.ObjectId(user) },
        {
          $set: { organizationId: new Types.ObjectId(org), status: 'active' },
        },
        { upsert: true },
      );
      return { organizationId: org, userId: user };
    }
    it('persists only hashed secrets and rejects expired/revoked sessions', async () => {
      await principal();
      const base = Date.now();
      let now = new Date(base);
      const lifecycle = createSessionLifecycle(
        createMongoSessionStore(database.connection),
        {
          clock: () => now,
          lifetime: { idleMs: 1_000, absoluteMs: 5_000 },
        },
      );
      const issued = await lifecycle.issue({
        organizationId: 'a'.repeat(24),
        userId: 'b'.repeat(24),
      });
      expect(await lifecycle.verify(issued.sessionToken)).not.toBeNull();
      const raw = await database.connection
        .db!.collection('developmentSessions')
        .findOne({
          organizationId: new Types.ObjectId('a'.repeat(24)),
        });
      expect(raw?.sessionTokenHash).not.toBe(issued.sessionToken);
      now = new Date(base + 1);
      expect(await lifecycle.revoke(issued.sessionToken, 'test logout')).toBe(
        true,
      );
      expect(await lifecycle.verify(issued.sessionToken)).toBeNull();
      now = new Date(base + 2000);
      expect(
        await lifecycle.issue({
          organizationId: 'a'.repeat(24),
          userId: 'b'.repeat(24),
        }),
      ).toBeDefined();
    });

    it('rotates atomically so concurrent rotation cannot preserve the old token', async () => {
      await principal('c'.repeat(24), 'd'.repeat(24));
      const now = new Date();
      const lifecycle = createSessionLifecycle(
        createMongoSessionStore(database.connection),
        { clock: () => now },
      );
      const issued = await lifecycle.issue({
        organizationId: 'c'.repeat(24),
        userId: 'd'.repeat(24),
      });
      const results = await Promise.allSettled([
        lifecycle.rotate(issued.sessionToken, 'concurrent rotation A'),
        lifecycle.rotate(issued.sessionToken, 'concurrent rotation B'),
      ]);
      expect(
        results.filter(
          (result) => result.status === 'fulfilled' && result.value !== null,
        ),
      ).toHaveLength(1);
      expect(await lifecycle.verify(issued.sessionToken)).toBeNull();
    });
    it('denies unknown/disabled principals and invalidates current CSRF after durable revocation', async () => {
      const p = await principal(
        new Types.ObjectId().toHexString(),
        new Types.ObjectId().toHexString(),
      );
      const store = createMongoSessionStore(database.connection),
        lifecycle = createSessionLifecycle(store);
      await expect(
        lifecycle.issue({ ...p, userId: new Types.ObjectId().toHexString() }),
      ).rejects.toThrow('principal is unavailable');
      const issued = await lifecycle.issue(p);
      const input = {
        sessionToken: issued.sessionToken,
        token: issued.csrfToken,
        origin: 'https://127.0.0.1:4443',
        allowedOrigins: ['https://127.0.0.1:4443'],
        method: 'POST',
        contentType: 'application/json',
        now: new Date(),
      };
      expect(await verifyCurrentMutationCsrf(lifecycle, input)).toBe(true);
      await database.connection
        .db!.collection('users')
        .updateOne(
          { _id: new Types.ObjectId(p.userId) },
          { $set: { status: 'inactive' } },
        );
      expect(await lifecycle.verify(issued.sessionToken)).toBeNull();
      expect(
        await lifecycle.rotate(issued.sessionToken, 'disabled'),
      ).toBeNull();
      await expect(lifecycle.issue(p)).rejects.toThrow(
        'principal is unavailable',
      );
      await principal(p.organizationId, p.userId);
      await database.connection
        .db!.collection('organizations')
        .updateOne(
          { _id: new Types.ObjectId(p.organizationId) },
          { $set: { status: 'inactive' } },
        );
      expect(await lifecycle.verify(issued.sessionToken)).toBeNull();
      await principal(p.organizationId, p.userId);
      await lifecycle.revoke(issued.sessionToken, 'logout');
      await expect(verifyCurrentMutationCsrf(lifecycle, input)).rejects.toThrow(
        'Session is not active',
      );
      const stored = await database.connection
        .db!.collection('developmentSessions')
        .findOne({ sessionTokenHash: hashOpaqueSecret(issued.sessionToken) });
      expect(JSON.stringify(stored)).not.toContain(issued.sessionToken);
      expect(JSON.stringify(stored)).not.toContain(issued.csrfToken);
    });
    it('transactional rotation rejects expired records and rolls back duplicate replacement insertion', async () => {
      const p = await principal(
        new Types.ObjectId().toHexString(),
        new Types.ObjectId().toHexString(),
      );
      const base = Date.now(),
        now = new Date(base);
      let storageNow = now;
      const store = createMongoSessionStore(database.connection, {
        clock: () => storageNow,
      });
      const lifecycle = createSessionLifecycle(store, {
        clock: () => now,
        lifetime: { idleMs: 1000, absoluteMs: 10000 },
      });
      const issued = await lifecycle.issue(p),
        hash = hashOpaqueSecret(issued.sessionToken);
      await expect(
        store.rotate(hash, issued.record, now, 'rollback'),
      ).rejects.toMatchObject({ code: 11000 });
      expect(await lifecycle.verify(issued.sessionToken)).not.toBeNull();
      const replacement = {
        ...issued.record,
        sessionTokenHash: hashOpaqueSecret(createOpaqueSecret()),
        issuedAt: new Date(base + 1001),
      };
      storageNow = new Date(base + 1001);
      await expect(
        store.rotate(hash, replacement, now, 'expiry race'),
      ).rejects.toThrow('current active session');
      expect(
        await database.connection
          .db!.collection('developmentSessions')
          .countDocuments({ sessionTokenHash: replacement.sessionTokenHash }),
      ).toBe(0);
      expect(
        (await database.connection
          .db!.collection('developmentSessions')
          .findOne({ sessionTokenHash: hash }))!.revokedAt,
      ).toBeNull();
    });
  },
);
