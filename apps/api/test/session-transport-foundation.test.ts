import { describe, expect, it, vi } from 'vitest';
import {
  createSessionLifecycle,
  type DurableSessionStore,
} from '../src/integration/session-lifecycle.js';
import { hashOpaqueSecret } from '../src/integration/session-crypto.js';
import {
  verifyMutationCsrf,
  verifyCurrentMutationCsrf,
  assertExactBrowserOrigin,
  assertNoUnsafeOriginForSafeRequest,
} from '../src/integration/csrf-origin.js';
import {
  createGatewayPolicy,
  prepareGatewayHeaders,
} from '../src/integration/gateway-policy.js';
import {
  disabledWorkloadAuthenticator,
  signWorkloadRequest,
  verifyWorkloadProof,
} from '../src/integration/workload-auth.js';
import { serializeDevelopmentSessionCookie } from '../src/integration/session-cookie.js';
import type { DevelopmentSessionRecord } from '../src/integration/session-store.js';
import { createLogger } from '../src/platform/logger.js';
import { serializeSession } from '../src/integration/serializers.js';

function memoryStore(): DurableSessionStore & {
  records: Map<string, DevelopmentSessionRecord>;
} {
  const records = new Map<string, DevelopmentSessionRecord>();
  return {
    records,
    async principalActive(principal) {
      return (
        principal.organizationId === 'a'.repeat(24) &&
        principal.userId === 'b'.repeat(24)
      );
    },
    async touch(hash, at, idleExpiresAt) {
      const r = records.get(hash);
      if (!r || r.revokedAt || r.idleExpiresAt <= at || r.expiresAt <= at)
        return false;
      records.set(hash, { ...r, idleExpiresAt });
      return true;
    },
    async create(record) {
      records.set(record.sessionTokenHash, record);
    },
    async findActive(tokenHash, now) {
      const record = records.get(tokenHash);
      return record &&
        record.revokedAt === null &&
        record.idleExpiresAt > now &&
        record.expiresAt > now
        ? record
        : null;
    },
    async revoke(tokenHash, at, reason) {
      const record = records.get(tokenHash);
      if (!record || record.revokedAt !== null) return false;
      records.set(tokenHash, {
        ...record,
        revokedAt: at,
        revocationReason: reason,
      });
      return true;
    },
    async rotate(tokenHash, replacement, at, reason) {
      if (!(await this.revoke(tokenHash, at, reason)))
        throw new Error('Session rotation requires a current active session');
      await this.create(replacement);
    },
  };
}

describe('secure development session and transport foundation', () => {
  it('redacts raw secrets in supported log fields and public session responses', async () => {
    const lifecycle = createSessionLifecycle(memoryStore(), {
      isolatedTest: true,
    });
    const issued = await lifecycle.issue({
      organizationId: 'a'.repeat(24),
      userId: 'b'.repeat(24),
    });
    let logs = '';
    const logger = createLogger('info', {
      write: (chunk) => {
        logs += chunk;
      },
    });
    logger.info(issued);
    logger.info({ issued });
    for (const secret of [
      issued.sessionToken,
      issued.csrfToken,
      issued.record.sessionTokenHash,
      issued.record.csrfBindingHash,
    ])
      expect(logs).not.toContain(secret);
    const response = serializeSession({
      userId: 'b'.repeat(24),
      displayName: 'Fictional tester',
      expiresAt: issued.record.expiresAt,
    });
    for (const secret of [issued.sessionToken, issued.csrfToken])
      expect(JSON.stringify(response)).not.toContain(secret);
  });
  it('requires owned storage or explicit unit isolation and denies unknown principal claims', async () => {
    const store = memoryStore();
    expect(() => createSessionLifecycle(store)).toThrow('owned local storage');
    const lifecycle = createSessionLifecycle(store, { isolatedTest: true });
    await expect(
      lifecycle.issue({
        organizationId: 'a'.repeat(24),
        userId: 'c'.repeat(24),
      }),
    ).rejects.toThrow('principal is unavailable');
    await expect(
      lifecycle.issue({
        organizationId: 'a'.repeat(24),
        userId: 'b'.repeat(24),
        roles: ['admin'],
      } as never),
    ).rejects.toThrow('principal is unavailable');
    expect(await lifecycle.verify('bad')).toBeNull();
    expect(store.records.size).toBe(0);
    vi.stubEnv('NODE_ENV', 'production');
    try {
      expect(() =>
        createSessionLifecycle(store, { isolatedTest: true }),
      ).toThrow('owned local storage');
    } finally {
      vi.unstubAllEnvs();
    }
  });
  it('refreshes idle explicitly without extending absolute expiry or resetting authentication age', async () => {
    const base = Date.now();
    let now = new Date(base);
    const lifecycle = createSessionLifecycle(memoryStore(), {
      isolatedTest: true,
      clock: () => now,
      lifetime: { idleMs: 1000, absoluteMs: 3000 },
    });
    const issued = await lifecycle.issue({
      organizationId: 'a'.repeat(24),
      userId: 'b'.repeat(24),
    });
    for (const delta of [900, 1800, 2700]) {
      now = new Date(base + delta);
      expect(
        (await lifecycle.refreshIdle(
          issued.sessionToken,
        ))!.idleExpiresAt.getTime(),
      ).toBe(Math.min(base + delta + 1000, base + 3000));
    }
    const rotated = await lifecycle.rotate(issued.sessionToken, 'rotation');
    expect(rotated!.record.authenticatedAt.getTime()).toBe(base);
    expect(rotated!.record.expiresAt.getTime()).toBe(base + 3000);
    now = new Date(base + 3000);
    expect(await lifecycle.verify(rotated!.sessionToken)).toBeNull();
  });
  it('rechecks durable state for CSRF instead of trusting a cached pre-revocation record', async () => {
    const lifecycle = createSessionLifecycle(memoryStore(), {
      isolatedTest: true,
    });
    const issued = await lifecycle.issue({
      organizationId: 'a'.repeat(24),
      userId: 'b'.repeat(24),
    });
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
    await lifecycle.revoke(issued.sessionToken, 'logout');
    await expect(verifyCurrentMutationCsrf(lifecycle, input)).rejects.toThrow(
      'Session is not active',
    );
    for (const origin of [
      'null',
      'http://127.0.0.1:4443',
      'https://127.0.0.1:4443/',
    ])
      expect(() => assertExactBrowserOrigin(origin, [origin])).toThrow();
    expect(() =>
      assertNoUnsafeOriginForSafeRequest('GET', 'null', [
        'https://127.0.0.1:4443',
      ]),
    ).toThrow();
  });
  it('creates random opaque secrets, stores only hashes, verifies, rotates and revokes sessions', async () => {
    let now = new Date('2026-10-30T00:00:00Z');
    const store = memoryStore();
    const lifecycle = createSessionLifecycle(store, {
      isolatedTest: true,
      clock: () => now,
      lifetime: { idleMs: 1_000, absoluteMs: 10_000 },
    });
    const first = await lifecycle.issue({
      organizationId: 'a'.repeat(24),
      userId: 'b'.repeat(24),
    });
    expect(first.sessionToken).not.toBe(first.record.sessionTokenHash);
    expect(store.records.has(hashOpaqueSecret(first.sessionToken))).toBe(true);
    expect(await lifecycle.verify(first.sessionToken)).not.toBeNull();
    const rotated = await lifecycle.rotate(first.sessionToken, 'test rotation');
    expect(rotated).not.toBeNull();
    expect(await lifecycle.verify(first.sessionToken)).toBeNull();
    expect(await lifecycle.verify(rotated!.sessionToken)).not.toBeNull();
    now = new Date('2026-10-30T00:00:02Z');
    expect(await lifecycle.verify(rotated!.sessionToken)).toBeNull();
    expect(await lifecycle.revoke(rotated!.sessionToken, 'test revoke')).toBe(
      true,
    );
  });

  it('requires active sessions, exact origin, JSON content type and session-bound CSRF', async () => {
    const store = memoryStore();
    const lifecycle = createSessionLifecycle(store, {
      isolatedTest: true,
      clock: () => new Date('2026-10-30T00:00:00Z'),
    });
    const issued = await lifecycle.issue({
      organizationId: 'a'.repeat(24),
      userId: 'b'.repeat(24),
    });
    const session = (await lifecycle.verify(issued.sessionToken))!;
    expect(
      verifyMutationCsrf({
        session,
        token: issued.csrfToken,
        origin: 'https://127.0.0.1:4443',
        method: 'POST',
        contentType: 'application/json',
        allowedOrigins: ['https://127.0.0.1:4443'],
        now: new Date('2026-10-30T00:00:00Z'),
      }),
    ).toBe(true);
    for (const change of [
      {
        token: 'wrong',
        origin: 'https://127.0.0.1:4443',
        contentType: 'application/json',
      },
      {
        token: issued.csrfToken,
        origin: 'https://evil.invalid',
        contentType: 'application/json',
      },
      {
        token: issued.csrfToken,
        origin: undefined,
        contentType: 'application/json',
      },
      {
        token: issued.csrfToken,
        origin: 'https://127.0.0.1:4443',
        contentType: 'text/plain',
      },
      {
        token: issued.csrfToken,
        origin: 'https://127.0.0.1:4443',
        contentType: 'application/json',
        method: 'GET',
      },
    ])
      expect(() =>
        verifyMutationCsrf({
          session,
          ...change,
          method: change.method ?? 'POST',
          allowedOrigins: ['https://127.0.0.1:4443'],
          now: new Date('2026-10-30T00:00:00Z'),
        }),
      ).toThrow();
    await lifecycle.revoke(issued.sessionToken, 'logout');
    expect(() =>
      verifyMutationCsrf({
        session: { ...session, revokedAt: new Date() },
        token: issued.csrfToken,
        origin: 'https://127.0.0.1:4443',
        method: 'POST',
        contentType: 'application/json',
        allowedOrigins: ['https://127.0.0.1:4443'],
        now: new Date(),
      }),
    ).toThrow();
  });

  it('keeps gateway destinations fixed and strips or rejects untrusted headers', () => {
    const policy = createGatewayPolicy({
      upstreamOrigin: 'https://127.0.0.1:4444',
      routes: [
        {
          method: 'GET',
          path: '/integration/api/v1/session',
          queryKeys: ['detail'],
        },
      ],
    });
    expect(
      policy.resolve('GET', '/integration/api/v1/session?detail=summary'),
    ).toBe('https://127.0.0.1:4444/integration/api/v1/session?detail=summary');
    expect(() =>
      policy.resolve('GET', 'https://evil.invalid/integration/api/v1/session'),
    ).toThrow();
    expect(() =>
      policy.resolve('POST', '/integration/api/v1/session'),
    ).toThrow();
    expect(() =>
      prepareGatewayHeaders([['x-user-id', 'b'.repeat(24)]]),
    ).toThrow();
    expect(() =>
      prepareGatewayHeaders([
        ['cookie', 'a'],
        ['cookie', 'b'],
      ]),
    ).toThrow();
    expect(() =>
      prepareGatewayHeaders([
        ['X-Forwarded-For', 'evil'],
        ['X-Request-ID', '00000000-0000-4000-8000-000000000000'],
        ['Authorization', 'Bearer forged'],
      ]),
    ).toThrow();
    expect(
      prepareGatewayHeaders([
        ['X-Forwarded-For', 'evil'],
        ['X-Request-ID', '00000000-0000-4000-8000-000000000000'],
      ]),
    ).toEqual([['x-request-id', '00000000-0000-4000-8000-000000000000']]);
  });

  it('defines a server-owned workload proof while the runtime authenticator remains disabled', async () => {
    const secret = new Uint8Array(32).fill(7);
    const input = {
      secret,
      keyId: 'development-gateway',
      audience: 'https://127.0.0.1:4444',
      bodyDigest: 'a'.repeat(64),
      headersDigest: 'b'.repeat(64),
      method: 'GET' as const,
      path: '/integration/api/v1/session',
      requestId: '00000000-0000-4000-8000-000000000000',
      timestamp: 1_000,
      nonce: 'n'.repeat(16),
    };
    const proof = {
      algorithm: 'hmac-sha256-v1' as const,
      keyId: 'development-gateway',
      timestamp: input.timestamp,
      nonce: input.nonce,
      signature: signWorkloadRequest(input),
    };
    expect(verifyWorkloadProof({ proof, ...input, nowMs: 1_001 })).toBe(true);
    expect(verifyWorkloadProof({ proof, ...input, nowMs: 40_001 })).toBe(false);
    for (const changed of [
      { bodyDigest: 'c'.repeat(64) },
      { headersDigest: 'c'.repeat(64) },
      { keyId: 'other' },
      { audience: 'https://127.0.0.1:4445' },
      { nowMs: NaN },
      { maxSkewMs: NaN },
      { maxSkewMs: 100000 },
    ])
      expect(
        verifyWorkloadProof({ proof, ...input, nowMs: 1001, ...changed }),
      ).toBe(false);
    expect(
      verifyWorkloadProof({ proof: undefined, ...input, nowMs: 1001 }),
    ).toBe(false);
    expect(
      (await disabledWorkloadAuthenticator().verify(undefined)).available,
    ).toBe(false);
    expect(
      (await disabledWorkloadAuthenticator().verify(proof)).available,
    ).toBe(false);
  });
  it('freezes route entries, bounds query/header inputs and forwards only the session cookie', () => {
    const policy = createGatewayPolicy({
      upstreamOrigin: 'https://127.0.0.1:4444',
      routes: [{ method: 'GET', path: '/integration/api/v1/session' }],
    });
    expect(Object.isFrozen(policy.routes[0])).toBe(true);
    for (const path of [
      '/integration/api/v1/session#x',
      '/integration/api/v1/session?role=admin',
      '//evil.invalid/integration/api/v1/session',
      '/integration/api/v1/../v1/session',
      '/integration/api/v1/%73ession',
    ])
      expect(() => policy.resolve('GET', path)).toThrow();
    expect(() =>
      createGatewayPolicy({
        upstreamOrigin: 'https://127.0.0.1:4444/',
        routes: [{ method: 'GET', path: '/integration/api/v1/session' }],
      }),
    ).toThrow();
    for (const header of [
      'Authorization',
      'X-Role',
      'X-Actor-ID',
      'X-Workload-Signature',
    ])
      expect(() => prepareGatewayHeaders([[header, 'forged']])).toThrow();
    expect(() =>
      prepareGatewayHeaders([
        ['X-CSRF-Token', 'a'],
        ['x-csrf-token', 'b'],
      ]),
    ).toThrow();
    expect(() => prepareGatewayHeaders([['Bad\r\nName', 'x']])).toThrow();
    const token = 'a'.repeat(43),
      cookie = '__Host-welspun-dev-session=' + token;
    expect(
      prepareGatewayHeaders([['Cookie', 'unrelated=private; ' + cookie]]),
    ).toEqual([['cookie', cookie]]);
    expect(() =>
      prepareGatewayHeaders([['Cookie', cookie + '; ' + cookie]]),
    ).toThrow();
  });

  it('serializes only a secure host cookie and never exposes a domain or insecure flag', async () => {
    const token = (
      await createSessionLifecycle(memoryStore(), { isolatedTest: true }).issue(
        {
          organizationId: 'a'.repeat(24),
          userId: 'b'.repeat(24),
        },
      )
    ).sessionToken;
    const cookie = serializeDevelopmentSessionCookie(token);
    expect(cookie).toContain('__Host-welspun-dev-session=');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Secure');
    expect(cookie).toContain('Path=/');
    expect(cookie).not.toContain('Domain=');
    expect(cookie).not.toContain('csrf');
  });
});
