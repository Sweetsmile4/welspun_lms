import { randomUUID } from 'node:crypto';
import { cpus, platform, release, totalmem } from 'node:os';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { localSecurityStore } from './security-local-fixture.js';
import { managementFixture } from './management-fixture.js';
import { createAuthorizationService } from '../src/modules/identity/authorization/service.js';
import { now } from './authorization-scenarios.js';

describe.skipIf(
  process.env.RUN_MONGO_INTEGRATION !== 'true' ||
    process.env.RUN_SECURITY_BENCHMARK !== 'true',
)('bounded local security performance observations (explicit opt-in)', () => {
  let local: Awaited<ReturnType<typeof localSecurityStore>>,
    callbacks = 0;
  beforeAll(async () => {
    local = await localSecurityStore(() => {
      callbacks++;
    });
  });
  afterAll(async () => {
    if (local) await local.close();
  });
  it('records small synthetic latency samples and fence-contention observations without capacity assertions', async () => {
    const f = await managementFixture(local.store);
    await f.grant({ kind: 'organization' }, [
      'employee.read',
      'membership.read',
      'role.read',
      'grant.read',
      'user.create',
    ]);
    for (let i = 0; i < 25; i++) {
      const user = await f.raw.createUser(
        {
          organizationId: f.org.id,
          identityIssuer: 'urn:synthetic:benchmark',
          identitySubject: 'sample-' + i,
          displayName: 'Synthetic benchmark ' + i,
        },
        { actorId: 'synthetic-benchmark-seed' },
      );
      await f.raw.createMembership(
        {
          organizationId: f.org.id,
          userId: user.id,
          orgUnitId: i % 2 ? f.department.id : f.sibling.id,
          validFrom: new Date('2026-10-01T00:00:00Z'),
          primary: true,
        },
        { actorId: 'synthetic-benchmark-seed' },
      );
      if (i < 10)
        await f.grant(
          { kind: 'unit', unitId: f.plantA.id, includeDescendants: true },
          ['employee.read'],
          { userId: user.id },
        );
    }
    const key = randomUUID();
    const replay = () =>
      request(f.app)
        .post(f.base + '/employees')
        .set('authorization', 'Bearer ' + f.bearer)
        .set('idempotency-key', key)
        .send(f.provision)
        .expect(201);
    await replay();
    const core = createAuthorizationService(local.repository, f.provider, {
      isolatedTest: true,
      clock: () => now,
    });
    const get = (path: string) =>
      request(f.app)
        .get(f.base + path)
        .set('authorization', 'Bearer ' + f.bearer)
        .expect(200);
    const samples: Record<string, number[]> = {};
    function stats(values: number[]) {
      const sorted = [...values].sort((a, b) => a - b);
      const round = (n: number) => Math.round(n * 100) / 100;
      return {
        n: values.length,
        minMs: round(sorted[0]!),
        p50Ms: round(sorted[Math.ceil(values.length * 0.5) - 1]!),
        p95Ms: round(sorted[Math.ceil(values.length * 0.95) - 1]!),
        maxMs: round(sorted.at(-1)!),
        meanMs: round(values.reduce((a, b) => a + b, 0) / values.length),
      };
    }
    const operations: Record<string, () => PromiseLike<unknown>> = {
      authorizationServiceWithTransaction: () =>
        core.check(f.actor.token, f.org.id, 'employee.read', {
          kind: 'user',
          id: f.peer.id,
        }),
      employeeScopedListHttp: () => get('/employees?limit=10'),
      roleListHttp: () => get('/roles?limit=10'),
      grantListHttp: () => get('/role-grants?limit=10'),
      membershipHistoryHttp: () =>
        get('/employees/' + f.peer.id + '/memberships'),
      idempotentReplayHttp: replay,
    };
    for (const [name, operation] of Object.entries(operations)) {
      for (let i = 0; i < 2; i++) await operation();
      const values: number[] = [];
      for (let i = 0; i < 10; i++) {
        const at = performance.now();
        await operation();
        values.push(performance.now() - at);
      }
      samples[name] = values;
    }
    const before = callbacks,
      concurrent: number[] = [],
      batches: number[] = [];
    for (let batch = 0; batch < 3; batch++) {
      const started = performance.now();
      await Promise.all(
        Array.from({ length: 8 }, async () => {
          const at = performance.now();
          await get('/employees?limit=10');
          concurrent.push(performance.now() - at);
        }),
      );
      batches.push(performance.now() - started);
    }
    const db = local.adapter.connection.db!;
    const record = {
      recordedAt: new Date().toISOString(),
      environment: {
        node: process.version,
        platform: platform(),
        release: release(),
        cpu: cpus()[0]?.model,
        logicalCpus: cpus().length,
        totalMemoryGiB: Math.round(totalmem() / 1024 ** 3),
        mongoVersion: (await db.admin().command({ buildInfo: 1 })).version,
        replicaSet: 'temporary loopback single member',
        otherSuitesMayRunConcurrently: true,
      },
      dataset: {
        organizations: 1,
        units: await db.collection('orgUnits').countDocuments(),
        users: await db.collection('users').countDocuments(),
        memberships: await db.collection('memberships').countDocuments(),
        roles: await db.collection('roleDefinitions').countDocuments(),
        grants: await db.collection('roleGrants').countDocuments(),
        receipts: await db
          .collection('managementCommandReceipts')
          .countDocuments(),
      },
      method: {
        warmupsPerSequentialOperation: 2,
        measuredPerSequentialOperation: 10,
        percentile: 'nearest rank',
        timings:
          'end-to-end wall time; HTTP rows include loopback middleware, Mongo queries, transaction/fence and response work',
        noProductionCapacityClaim: true,
      },
      sequential: Object.fromEntries(
        Object.entries(samples).map(([name, values]) => [name, stats(values)]),
      ),
      contention: {
        concurrency: 8,
        batches: 3,
        completed: concurrent.length,
        transactionCallbacks: callbacks - before,
        retryCallbacks: callbacks - before - concurrent.length,
        requests: stats(concurrent),
        batchDuration: stats(batches),
        pureLockWaitNotSeparatelyInstrumented: true,
      },
    };
    mkdirSync('work', { recursive: true });
    writeFileSync(
      join('work', 'phase1b3c-performance.json'),
      JSON.stringify(record, null, 2) + '\n',
    );
    expect(concurrent).toHaveLength(24);
  }, 60000);
});
