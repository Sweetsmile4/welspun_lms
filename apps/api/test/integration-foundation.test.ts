import { describe, expect, it, vi } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolve, dirname, basename } from 'node:path';
import { pathToFileURL } from 'node:url';
import { mkdir, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { build } from 'tsup';
import { randomUUID } from 'node:crypto';
import { Types } from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { parseEnvironment } from '../src/platform/environment.js';
import * as wire from '@welspun/contracts/integration/v1';
import {
  parseIntegrationConfiguration,
  inspectTransportPlan,
  parseLoopbackOrigin,
} from '../src/integration/config.js';
import {
  disabledBoundaries,
  requireTrustedRequest,
} from '../src/integration/boundaries.js';
import {
  parseCommandMetadata,
  publicError,
  retryAdvice,
  assertPayloadSize,
} from '../src/integration/http-conventions.js';
import * as serialize from '../src/integration/serializers.js';
import { integrationClient } from '../../web/src/lib/integration/client.js';
import { memoryCourseHarness } from './course-fixture.js';
import { publishingFixture } from './publishing-fixture.js';

const id = () => new Types.ObjectId().toHexString();
const requestId = randomUUID(),
  digest = 'a'.repeat(64);
async function removeTestBundle(folder: string) {
  if (
    dirname(folder) !== resolve('work') ||
    !basename(folder).startsWith('integration-offline-')
  )
    throw new Error('Unexpected offline test cleanup target');
  await rm(folder, { recursive: true, force: true });
}
const headers = (revision?: string) => [
  ['Content-Type', 'application/json'],
  ['Idempotency-Key', 'offline_command_123'],
  ['X-Request-ID', requestId],
  ...(revision === undefined ? [] : [['If-Match', revision]]),
];
describe('disabled integration security foundation', () => {
  it('accepts only the approved shared database key/name while remaining disabled and redacting the URI', () => {
    const candidate = {
      MONGOURI: 'mongodb+srv://cluster.example.invalid/welspun_lms_dev',
      DATABASE_NAME: 'welspun_lms_dev',
    };
    expect(
      parseIntegrationConfiguration({
        MONGOURI: '',
        DATABASE_NAME: 'welspun_lms_dev',
      }).enabled,
    ).toBe(false);
    expect(
      parseIntegrationConfiguration({ DATABASE_NAME: 'welspun_lms_dev' })
        .enabled,
    ).toBe(false);
    const result = parseIntegrationConfiguration(candidate);
    expect(result.enabled).toBe(false);
    expect(JSON.stringify(result)).not.toContain('MONGOURI');
    expect(JSON.stringify(result)).not.toContain(candidate.MONGOURI);
    for (const database of [
      'welspun_lms_dev_other',
      'welspun_lms_dev_',
      'Welspun_lms_dev',
      'admin',
      'test',
      '',
      undefined,
    ])
      expect(() =>
        parseIntegrationConfiguration({
          ...candidate,
          DATABASE_NAME: database,
        }),
      ).toThrow('Integration configuration is not permitted.');
    expect(() =>
      parseIntegrationConfiguration({
        ...candidate,
        LMS_INTEGRATION_ENABLED: 'true',
        NODE_ENV: 'development',
        APP_ENV: 'development-integration',
        browserOrigin: 'https://127.0.0.1:4443',
        upstreamOrigin: 'https://127.0.0.1:4444',
      }),
    ).toThrow();
    expect(() =>
      parseIntegrationConfiguration({
        ...candidate,
        MONGOURI: 'DO_NOT_DISCLOSE',
      }),
    ).toThrow('Integration configuration is not permitted.');
  });
  it('is disabled with no config and never returns an enabled configuration', () => {
    expect(parseIntegrationConfiguration()).toEqual({
      enabled: false,
      reason: 'OFFLINE_FOUNDATION',
    });
    expect(
      parseIntegrationConfiguration({
        LMS_INTEGRATION_ENABLED: 'false',
        NODE_ENV: 'production',
      }).enabled,
    ).toBe(false);
    for (const input of [
      null,
      { LMS_INTEGRATION_ENABLED: true },
      { LMS_INTEGRATION_ENABLED: 'true' },
      { LMS_INTEGRATION_ENABLED: 'true', NODE_ENV: 'test' },
      { LMS_INTEGRATION_ENABLED: 'true', NODE_ENV: 'production' },
      {
        LMS_INTEGRATION_ENABLED: 'true',
        NODE_ENV: 'development',
        APP_ENV: 'development-integration',
        browserOrigin: 'https://127.0.0.1:4443',
        upstreamOrigin: 'https://127.0.0.1:4444',
      },
    ])
      expect(() => parseIntegrationConfiguration(input)).toThrow(
        'Integration configuration is not permitted.',
      );
  });
  it('rejects credential/role/fixture flags and every unapproved database target without echoing values', () => {
    for (const key of [
      'IDENTITY_MODE',
      'ISOLATED_DEVELOPMENT',
      'DATABASE_ENABLED',
      'MONGODB_URI',
      'LMS_DEV_DATABASE_NAME',
      'roles',
      'userId',
      'issuer',
      'accessToken',
      'NEXT_PUBLIC_TOKEN',
    ]) {
      try {
        parseIntegrationConfiguration({ [key]: 'DO_NOT_DISCLOSE' });
        throw new Error('Expected denial');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe(
          'Integration configuration is not permitted.',
        );
      }
    }
  });
  it('checks exact HTTPS loopback origin syntax without approving an upstream', () => {
    expect(
      inspectTransportPlan({
        browserOrigin: 'https://127.0.0.1:4443',
        upstreamOrigin: 'https://127.0.0.1:4444',
      }).enabled,
    ).toBe(false);
    for (const value of [
      'http://127.0.0.1:4443',
      'https://example.com:4443',
      'https://127.0.0.1:4443/',
      'https://user:secret@127.0.0.1:4443',
      'https://127.0.0.1:4443/?x=1',
      'https://127.0.0.1:4443#x',
      'https://127.0.0.1',
      'https://localhost:4443',
      'https://127.0.0.1.evil:4443',
      'https://2130706433:4443',
    ])
      expect(() => parseLoopbackOrigin(value)).toThrow();
    expect(() =>
      inspectTransportPlan({
        browserOrigin: 'https://127.0.0.1:4443',
        upstreamOrigin: 'https://127.0.0.1:4443',
      }),
    ).toThrow();
    expect(() =>
      parseIntegrationConfiguration({
        browserOrigin: 'https://127.0.0.1:4443',
      }),
    ).toThrow();
  });
  it('cannot turn arbitrary identity/role claims or casts into trusted requests', async () => {
    const forged = {
      userId: id(),
      roles: ['admin'],
      session: { userId: id() },
      workload: {},
      requestId,
    };
    expect(() => requireTrustedRequest(forged)).toThrow(
      'Integration request trust is unavailable.',
    );
    expect((await disabledBoundaries.sessions.verify(forged)).available).toBe(
      false,
    );
    expect((await disabledBoundaries.requests.verify(forged)).available).toBe(
      false,
    );
    expect(
      (await disabledBoundaries.workload.verify('browser-secret')).available,
    ).toBe(false);
    expect(
      (await disabledBoundaries.upstream.resolve('catalog.list')).available,
    ).toBe(false);
    // @ts-expect-error Browser-shaped data has no unexported trusted-context marker.
    expect((await disabledBoundaries.revocation.revoke(forged)).available).toBe(
      false,
    );
    expect(
      (
        await disabledBoundaries.csrf.verify(
          // @ts-expect-error Browser data lacks the trusted context marker.
          forged,
          'fake',
          'https://127.0.0.1:4443',
        )
      ).available,
    ).toBe(false);
  });
  it('frontend client is explicitly unavailable and performs no fetch or fixture fallback', async () => {
    const fetch = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new Error('Must not fetch'));
    try {
      const result = await integrationClient.read('catalog.list', {});
      expect(wire.unavailableSchema.parse(result).code).toBe(
        'INTEGRATION_UNAVAILABLE',
      );
      expect(
        await integrationClient.command(
          wire.commandMetadataSchema.parse({
            schemaVersion: 1,
            kind: 'create',
            idempotencyKey: 'offline_key',
            requestId,
          }),
          {},
        ),
      ).toEqual(result);
      expect('data' in result).toBe(false);
      expect(fetch).not.toHaveBeenCalled();
    } finally {
      fetch.mockRestore();
    }
  });
  it('imports all integration modules and invokes disabled boundaries with outbound TCP/DNS/HTTP guards', async () => {
    const script = `
      const config=await import('./apps/api/src/integration/config.ts');
      const boundary=await import('./apps/api/src/integration/boundaries.ts');
      await import('./apps/api/src/integration/serializers.ts');
      await import('./apps/api/src/integration/http-conventions.ts');
      await import('./apps/api/src/integration/session-lifecycle.ts');
      await import('./apps/api/src/integration/csrf-origin.ts');
      await import('./apps/api/src/integration/gateway-policy.ts');
      await import('./apps/api/src/integration/workload-auth.ts');
      await import('./apps/api/src/integration/session-cookie.ts');
      await import('@welspun/contracts/integration/v1');
      const client=await import('./apps/web/src/lib/integration/client.ts');
      const mongoose=(await import('mongoose')).default;
      if(config.parseIntegrationConfiguration().enabled)throw new Error('Enabled');
      if((await boundary.disabledBoundaries.sessions.verify({roles:['admin']})).available)throw new Error('Trusted');
      if((await client.integrationClient.read('session.read',{})).available)throw new Error('Client enabled');
      if(mongoose.connections.some(c=>c.readyState!==0))throw new Error('Connected');
      console.log('offline-import-and-invocation-passed');`;
    // Compile before the guard: tsx's loader opens a tooling IPC pipe, unrelated to app I/O.
    // The guarded child executes the bundled modules directly, without a runtime TS loader.
    await mkdir(resolve('work'), { recursive: true });
    const folder = await mkdtemp(resolve('work/integration-offline-'));
    try {
      const entry = resolve(folder, 'entry.ts');
      await writeFile(entry, script.replaceAll("'./apps/", "'../../apps/"));
      await build({
        entry: { runtime: entry },
        outDir: folder,
        format: ['esm'],
        platform: 'node',
        target: 'node24',
        bundle: true,
        splitting: false,
        noExternal: [/^@welspun\//],
        external: ['mongoose', 'zod'],
        config: false,
        silent: true,
        outExtension: () => ({ js: '.mjs' }),
      });
      const file = resolve(folder, 'runtime.mjs');
      const result = await promisify(execFile)(
        process.execPath,
        [
          '--import',
          pathToFileURL(resolve('apps/api/test/integration-no-outbound.mjs'))
            .href,
          file,
        ],
        { cwd: process.cwd(), windowsHide: true, timeout: 20000 },
      );
      expect(result.stdout).toContain('offline-import-and-invocation-passed');
    } finally {
      await removeTestBundle(folder);
    }
    await expect(
      promisify(execFile)(
        process.execPath,
        [
          '--import',
          pathToFileURL(resolve('apps/api/test/integration-no-outbound.mjs'))
            .href,
          '-e',
          "try { require('node:net').connect(9,'127.0.0.1'); } catch {}",
        ],
        { windowsHide: true, timeout: 10000 },
      ),
    ).rejects.toMatchObject({ code: 86 });
  });
});
it('normal API still exposes no integration session or business endpoint', async () => {
  const app = createApp(
    parseEnvironment({ NODE_ENV: 'test', LOG_LEVEL: 'silent' }),
  );
  for (const path of [
    '/api/v1/integration/session',
    '/api/v1/integration/courses',
    '/integration/api',
  ])
    await request(app).get(path).expect(404);
  await request(app)
    .post('/api/v1/integration/courses')
    .send({ title: 'Cannot create' })
    .expect(404);
});
describe('public projections and strict wire representations', () => {
  it('converts only explicit scalar IDs/dates and safely rejects invalid objects', () => {
    const objectId = new Types.ObjectId();
    expect(serialize.serializeId(objectId)).toBe(objectId.toHexString());
    expect(serialize.serializeDate(new Date('2026-10-30T00:00:00Z'))).toBe(
      '2026-10-30T00:00:00.000Z',
    );
    for (const v of [{ toString: () => id() }, 'UPPERCASE', null])
      expect(() => serialize.serializeId(v)).toThrow(
        serialize.PublicSerializationError,
      );
    for (const v of [
      new Date(NaN),
      '2026-10-30T01:00:00+01:00',
      {},
      'secret-token',
    ])
      expect(() => serialize.serializeDate(v)).toThrow(
        'Public response serialization is unavailable.',
      );
  });
  it('rejects session/candidate identity claims and avoids unrestricted directory data', () => {
    const input = {
      userId: id(),
      displayName: 'Development tester',
      expiresAt: new Date('2026-10-30T12:00:00Z'),
    };
    expect(
      wire.sessionSummarySchema.parse(serialize.serializeSession(input)).user
        .displayName,
    ).toBe('Development tester');
    for (const claim of [
      { roles: ['admin'] },
      { issuer: 'browser' },
      { accessToken: 'SECRET' },
    ])
      expect(() => serialize.serializeSession({ ...input, ...claim })).toThrow(
        serialize.PublicSerializationError,
      );
    const candidate = serialize.serializeReviewerCandidate({
      id: id(),
      displayName: 'Development reviewer',
    });
    expect(Object.keys(candidate).sort()).toEqual([
      'candidateId',
      'displayName',
      'schemaVersion',
    ]);
    expect(() =>
      serialize.serializeReviewerCandidate({
        ...candidate,
        email: 'private@example.invalid',
      }),
    ).toThrow();
  });
  it('projects real isolated domain shapes without private provenance/evidence and preserves source snapshots', async () => {
    const h = memoryCourseHarness(),
      f = await publishingFixture(h),
      a = await f.approved();
    const result = await f.workflow.execute(
      f.remote.token,
      await f.command({
        kind: 'publish',
        reviewId: a.reviewId,
        expectedReviewRevision: 2,
        expectedReleaseNumber: 0,
      }),
    );
    const rows = await h.repository.transaction(async (tx) => ({
      source: {
        course: await h.store.course(tx, f.org.id, f.courseId),
        draft: await h.store.draft(tx, f.org.id, f.courseId),
      },
      release: await h.publishing!.release(tx, f.org.id, result.releaseId!),
      review: await h.publishing!.review(tx, f.org.id, a.reviewId),
      evidence: await h.publishing!.evidence(tx, f.org.id, a.reviewId),
    }));
    const before = JSON.stringify(rows);
    const draft = serialize.serializeDraftDetail(rows.source),
      summary = serialize.serializeDraftSummary(rows.source);
    const catalog = serialize.serializeCatalogDetail(rows.release),
      history = serialize.serializeReleaseHistory(rows.release);
    expect(wire.draftSummarySchema.parse(summary).revision).toBe(
      draft.revision,
    );
    expect(wire.catalogDetailSchema.parse(catalog).title).toBe(draft.title);
    expect(
      wire.catalogEntrySchema.parse(
        serialize.serializeCatalogEntry(rows.release),
      ).releaseNumber,
    ).toBe(1);
    expect(wire.releaseHistorySchema.parse(history).digest).toBe(draft.digest);
    const review = serialize.serializeReview(rows.review, rows.evidence);
    expect(review.approvedCount).toBe(1);
    const decision = serialize.serializeDecision(
      rows.evidence.find((e) => e.kind === 'approve'),
    );
    expect(wire.decisionSchema.parse(decision).decision).toBe('approve');
    for (const [schema, value] of [
      [wire.draftDetailSchema, draft],
      [wire.draftSummarySchema, summary],
      [wire.reviewSummarySchema, review],
      [wire.decisionSchema, decision],
      [wire.releaseHistorySchema, history],
      [wire.catalogDetailSchema, catalog],
      [wire.moduleSchema, draft.modules[0]!],
      [wire.lessonSchema, draft.modules[0]!.lessons[0]!],
    ] as const)
      expect(
        schema.safeParse({ ...value, accessToken: 'SECRET' }).success,
      ).toBe(false);
    const learner = JSON.stringify(catalog);
    for (const key of [
      'approvals',
      'feedback',
      'submittedBy',
      'ownerId',
      'editedBy',
      'identityIssuer',
      'digest',
      'policy',
      'actorId',
    ])
      expect(learner).not.toContain(`"${key}"`);
    expect(JSON.stringify(draft)).not.toContain('createdBy');
    expect(JSON.stringify(review)).not.toContain('reviewers');
    expect(JSON.stringify(history)).not.toContain('approvals');
    expect(JSON.stringify(rows)).toBe(before);
    draft.modules[0]!.lessons[0]!.title = 'Changed public copy';
    expect(JSON.stringify(rows)).toBe(before);
    expect(() => serialize.serializeReview(rows.review, [])).toThrow();
    expect(() =>
      serialize.serializeDecision(
        rows.evidence.find((e) => e.kind === 'assigned'),
      ),
    ).toThrow();
    expect(() =>
      serialize.serializeCatalogDetail({ ...rows.release, digest: 'bad' }),
    ).toThrow(serialize.PublicSerializationError);
  });
  it('serializes only actual successful backend readiness and rejects forged unsupported fields', () => {
    const r = serialize.serializeReadiness({
      ready: true,
      reviewId: id(),
      digest,
      nextReleaseNumber: 1,
    });
    expect(wire.readinessSchema.parse(r).ready).toBe(true);
    expect(
      wire.readinessSchema.safeParse({
        schemaVersion: 1,
        ready: false,
        reasons: ['STALE_BINDING'],
      }).success,
    ).toBe(true);
    expect(() =>
      serialize.serializeReadiness({
        ready: true,
        reviewId: id(),
        digest,
        nextReleaseNumber: 1,
        token: 'SECRET',
      }),
    ).toThrow();
    expect(() =>
      serialize.serializeDraftDetail({ token: 'DO_NOT_DISCLOSE' }),
    ).toThrow('Public response serialization is unavailable.');
  });
  it('rejects unknown wire fields, invalid versions, offsets, revisions, bounds and module identity/order', () => {
    const candidate = {
      schemaVersion: 1,
      candidateId: id(),
      displayName: 'Fictional reviewer',
    };
    for (const extra of [
      { roles: ['admin'] },
      { schemaVersion: 2 },
      { email: 'private@example.invalid' },
    ])
      expect(
        wire.reviewerCandidateSchema.safeParse({ ...candidate, ...extra })
          .success,
      ).toBe(false);
    expect(wire.idSchema.safeParse(new Types.ObjectId()).success).toBe(false);
    expect(wire.utcDateSchema.safeParse(new Date()).success).toBe(false);
    expect(
      wire.utcDateSchema.safeParse('2026-10-30T00:00:00+00:00').success,
    ).toBe(false);
    expect(wire.revisionSchema.safeParse(Number.MAX_SAFE_INTEGER).success).toBe(
      false,
    );
    expect(wire.digestSchema.safeParse('A'.repeat(64)).success).toBe(false);
    expect(wire.paginationSchema.safeParse({ limit: 51 }).success).toBe(false);
    const page = wire.pageSchema(wire.reviewerCandidateSchema);
    expect(
      page.safeParse({
        schemaVersion: 1,
        items: Array(51).fill(candidate),
        nextCursor: null,
      }).success,
    ).toBe(false);
    expect(
      wire.lessonSchema.safeParse({
        id: id(),
        title: '<script>',
        description: '',
        position: 0,
        content: { type: 'text', text: 'safe' },
      }).success,
    ).toBe(false);
    const moduleId = id(),
      lessonId = id();
    const sampleModule = {
      id: moduleId,
      title: 'Module',
      description: '',
      position: 0,
      lessons: [
        {
          id: lessonId,
          title: 'Lesson',
          description: '',
          position: 0,
          content: { type: 'text', text: 'Safe text' },
        },
      ],
    };
    const detail = {
      schemaVersion: 1,
      courseId: id(),
      releaseId: id(),
      releaseNumber: 1,
      title: 'Published',
      description: '',
      code: 'SYN_TEST',
      scopeUnitId: null,
      publishedAt: '2026-10-30T00:00:00Z',
      moduleCount: 1,
      lessonCount: 1,
      modules: [sampleModule],
    };
    expect(wire.catalogDetailSchema.safeParse(detail).success).toBe(true);
    expect(
      wire.catalogDetailSchema.safeParse({ ...detail, feedback: 'PRIVATE' })
        .success,
    ).toBe(false);
    expect(
      wire.catalogDetailSchema.safeParse({
        ...detail,
        modules: [{ ...sampleModule, position: 1 }],
      }).success,
    ).toBe(false);
    expect(
      wire.catalogDetailSchema.safeParse({
        ...detail,
        modules: [
          {
            ...sampleModule,
            lessons: [{ ...sampleModule.lessons[0], id: moduleId }],
          },
        ],
      }).success,
    ).toBe(false);
    expect(
      wire.catalogDetailSchema.safeParse({ ...detail, lessonCount: 2 }).success,
    ).toBe(false);
    expect(
      wire.catalogDetailSchema.safeParse({
        ...detail,
        modules: [
          {
            ...sampleModule,
            lessons: [
              {
                ...sampleModule.lessons[0],
                content: { type: 'text', text: 'safe', token: 'SECRET' },
              },
            ],
          },
        ],
      }).success,
    ).toBe(false);
  });
});
describe('HTTP command conventions without HTTP endpoints', () => {
  it('validates strong If-Match and exact review/digest/release bindings', () => {
    const binding = {
      reviewId: id(),
      draftRevision: 2,
      reviewRevision: 1,
      digest,
    };
    expect(parseCommandMetadata(headers(), 'create').kind).toBe('create');
    expect(parseCommandMetadata(headers('"2"'), 'draft')).toMatchObject({
      expectedDraftRevision: 2,
    });
    expect(
      parseCommandMetadata(headers('"2"'), 'review', { binding }),
    ).toMatchObject({ binding });
    expect(
      parseCommandMetadata(headers('"2"'), 'publish', {
        binding,
        expectedReleaseNumber: 0,
      }),
    ).toMatchObject({ expectedReleaseNumber: 0 });
    expect(() => parseCommandMetadata(headers(), 'draft')).toThrowError(
      expect.objectContaining({ code: 'PRECONDITION_REQUIRED' }),
    );
    expect(() =>
      parseCommandMetadata(headers('"1"'), 'review', { binding }),
    ).toThrow();
    for (const match of [
      'W/"2"',
      '*',
      '2',
      '"02"',
      '"2", "3"',
      '"-1"',
      '"9007199254740992"',
    ])
      expect(() => parseCommandMetadata(headers(match), 'draft')).toThrow();
    expect(() => parseCommandMetadata(headers('"1"'), 'create')).toThrow();
  });
  it('denies duplicate headers, missing correlation/key, role claims and non-JSON command metadata', () => {
    for (const pairs of [
      [...headers(), ['idempotency-key', 'other_key']],
      [...headers(), ['X-Role', 'admin']],
      headers().filter(([n]) => n !== 'X-Request-ID'),
      headers().filter(([n]) => n !== 'Idempotency-Key'),
      headers().map(([n, v]) => [n, n === 'Content-Type' ? 'text/plain' : v]),
      headers().map(([n, v]) => [
        n,
        n === 'Idempotency-Key' ? 'bad\r\nheader' : v,
      ]),
    ])
      expect(() => parseCommandMetadata(pairs, 'create')).toThrow();
    expect(() =>
      parseCommandMetadata(headers(), 'create', { actorId: id() }),
    ).toThrow();
    expect(() =>
      parseCommandMetadata(headers('"1"'), 'publish', {
        binding: {
          reviewId: id(),
          draftRevision: 1,
          reviewRevision: 0,
          digest,
        },
        expectedReleaseNumber: 0,
        role: 'publisher',
      }),
    ).toThrow();
  });
  it('returns exact safe envelopes/statuses and bounded same-intent-only retry advice', () => {
    for (const code of Object.keys(wire.errorDefinitions) as wire.ErrorCode[]) {
      const error = publicError(code, requestId);
      expect(wire.safeErrorEnvelopeSchema.parse(error.body).error.code).toBe(
        code,
      );
      expect(error.status).toBe(wire.errorDefinitions[code].status);
    }
    expect(
      publicError('unsafe-driver-message' as wire.ErrorCode, requestId).body
        .error.code,
    ).toBe('INTERNAL_ERROR');
    expect(() =>
      wire.safeErrorEnvelopeSchema.parse({
        error: { code: 'INTERNAL_ERROR', message: 'SECRET', details: [] },
        requestId,
      }),
    ).toThrow();
    expect(retryAdvice('NETWORK_FAILURE', 1, true)).toMatchObject({
      retry: true,
      action: 'same-intent',
      delayMs: 250,
    });
    for (const code of [
      'REPLAY_UNAVAILABLE',
      'DRAFT_CONFLICT',
      'AUTHENTICATION_REQUIRED',
      'INTEGRATION_UNAVAILABLE',
    ] as const)
      expect(retryAdvice(code, 1, true).retry).toBe(false);
    expect(retryAdvice('DEPENDENCY_UNAVAILABLE', 3, true).retry).toBe(false);
    expect(retryAdvice('NETWORK_FAILURE', 1, false).retry).toBe(false);
    expect(() => assertPayloadSize(300 * 1024 + 1, 'command')).toThrow();
    expect(() => assertPayloadSize(NaN, 'small')).toThrow();
    expect(() => assertPayloadSize(300 * 1024, 'command')).not.toThrow();
    expect(wire.privateResponseHeaders['cache-control']).toBe(
      'private, no-store',
    );
  });
});
