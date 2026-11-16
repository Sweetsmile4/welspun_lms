import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { parseEnvironment } from '../src/platform/environment.js';
import { createMongoAdapter } from '../src/platform/database.js';
import { errorEnvelopeSchema, requestIdSchema } from '@welspun/contracts';
import { createIdentityProvider } from '../src/modules/identity/provider.js';
const env = (values = {}) =>
  parseEnvironment({ NODE_ENV: 'test', LOG_LEVEL: 'silent', ...values });
describe('API foundation', () => {
  it('reports liveness separately from dependency readiness', async () => {
    const app = createApp(env(), { readiness: async () => false });
    const live = await request(app).get('/api/v1/health').expect(200);
    expect(requestIdSchema.safeParse(live.body.meta.requestId).success).toBe(
      true,
    );
    const ready = await request(app).get('/api/v1/ready').expect(503);
    expect(errorEnvelopeSchema.parse(ready.body).error.code).toBe('NOT_READY');
  });
  it('has explicit foundation-only readiness and security headers', async () => {
    const response = await request(createApp(env()))
      .get('/api/v1/ready')
      .expect(200);
    expect(response.body.data).toMatchObject({
      database: 'disabled',
      productionReady: false,
    });
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-powered-by']).toBeUndefined();
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });
  it('validates queries and replaces unsafe request IDs', async () => {
    const response = await request(createApp(env()))
      .get('/api/v1/foundation?detail=private')
      .set('x-request-id', 'untrusted text')
      .expect(422);
    expect(errorEnvelopeSchema.safeParse(response.body).success).toBe(true);
    expect(response.headers['x-request-id']).toBe(response.body.requestId);
    await request(createApp(env()))
      .get('/api/v1/foundation?role=admin')
      .expect(422);
  });
  it('rate-limits repeated requests using the standard error envelope', async () => {
    const app = createApp(env());
    for (let index = 0; index < 120; index++) {
      await request(app).get('/api/v1/health').expect(200);
    }
    const response = await request(app).get('/api/v1/health').expect(429);
    expect(errorEnvelopeSchema.parse(response.body).error.code).toBe(
      'RATE_LIMITED',
    );
    expect(response.headers['retry-after']).toBeDefined();
  });
  it('handles malformed JSON, oversized bodies, and unknown routes consistently', async () => {
    const app = createApp(env());
    const response = await request(app)
      .post('/api/v1/foundation')
      .set('content-type', 'application/json')
      .send('{')
      .expect(400);
    expect(response.body.error.code).toBe('MALFORMED_JSON');
    await request(app)
      .post('/api/v1/foundation')
      .send({ payload: 'x'.repeat(20_000) })
      .expect(413);
    const missing = await request(app).get('/api/v2/health').expect(404);
    expect(errorEnvelopeSchema.safeParse(missing.body).success).toBe(true);
  });
  it('fails closed without identity and never trusts user headers', async () => {
    await request(createApp(env()))
      .get('/api/v1/me')
      .set('x-user-id', 'admin')
      .expect(401);
    const response = await request(
      createApp(
        env({ IDENTITY_MODE: 'synthetic', ISOLATED_DEVELOPMENT: 'true' }),
      ),
    )
      .get('/api/v1/me')
      .expect(200);
    expect(response.body.data.synthetic).toBe(true);
    expect(response.body.data).not.toHaveProperty('roles');
  });
  it('returns a client error for unsupported body encodings', async () => {
    const app = createApp(env());
    for (const headers of [
      { 'content-type': 'application/json; charset=not-a-charset' },
      {
        'content-type': 'application/json',
        'content-encoding': 'not-an-encoding',
      },
    ]) {
      const response = await request(app)
        .post('/api/v1/foundation')
        .set(headers)
        .send('{}')
        .expect(415);
      expect(errorEnvelopeSchema.parse(response.body).error.code).toBe(
        'UNSUPPORTED_ENCODING',
      );
    }
  });
  it('does not advertise production readiness', async () => {
    await request(createApp(env({ NODE_ENV: 'production' })))
      .get('/api/v1/ready')
      .expect(503);
  });
  it('normalizes unexpected readiness failures without leaking details', async () => {
    const response = await request(
      createApp(env(), {
        readiness: async () => {
          throw new Error('secret connection string');
        },
      }),
    )
      .get('/api/v1/ready')
      .expect(500);
    expect(JSON.stringify(response.body)).not.toContain('secret');
  });
});
describe('isolation and environment safety', () => {
  it('rejects synthetic production/non-isolated identities, database activation and invalid ports', () => {
    for (const values of [
      {
        NODE_ENV: 'production',
        IDENTITY_MODE: 'synthetic',
        ISOLATED_DEVELOPMENT: 'true',
      },
      { IDENTITY_MODE: 'synthetic' },
      { DATABASE_ENABLED: 'true' },
      { PORT: '0' },
    ])
      expect(() => env(values)).toThrow('Invalid environment');
  });
  it('never exposes invalid environment secret values', () => {
    expect(() => env({ MONGODB_URI: 'secret-invalid-value' })).toThrow(
      'Invalid environment fields: MONGODB_URI',
    );
  });
  it('permits the fixed fixture only in opted-in development/test configurations', async () => {
    for (const NODE_ENV of ['development', 'test'] as const) {
      const provider = createIdentityProvider(
        env({
          NODE_ENV,
          IDENTITY_MODE: 'synthetic',
          ISOLATED_DEVELOPMENT: 'true',
        }),
      );
      expect(await provider.resolveIdentity({})).toEqual({
        subject: 'synthetic-development-learner',
        displayName: 'Synthetic development learner',
        synthetic: true,
      });
      expect(() =>
        createIdentityProvider({
          ...env(),
          NODE_ENV,
          IDENTITY_MODE: 'synthetic',
          ISOLATED_DEVELOPMENT: 'false',
        }),
      ).toThrow('Synthetic identity is forbidden');
    }
    expect(() =>
      createIdentityProvider({
        ...env(),
        NODE_ENV: 'production',
        IDENTITY_MODE: 'synthetic',
        ISOLATED_DEVELOPMENT: 'true',
      }),
    ).toThrow('Synthetic identity is forbidden');
    for (const values of [{ NODE_ENV: 'staging' }, { HOST: '0.0.0.0' }]) {
      expect(() =>
        env({
          ...values,
          IDENTITY_MODE: 'synthetic',
          ISOLATED_DEVELOPMENT: 'true',
        }),
      ).toThrow('Invalid environment');
    }
  });
  it('constructs a disconnected adapter and rejects non-opted-in connections', async () => {
    const openUri = vi
      .spyOn(mongoose.Connection.prototype, 'openUri')
      .mockImplementation(() => {
        throw new Error('Network opening is forbidden in this test');
      });
    try {
      const adapter = createMongoAdapter(
        'mongodb://127.0.0.1:27017/synthetic_review_only',
      );
      expect(adapter.state).toBe(0);
      createApp(
        env({ MONGODB_URI: 'mongodb://127.0.0.1:27017/synthetic_review_only' }),
      );
      await expect(
        adapter.connect({ explicitlyAllowConnection: false }),
      ).rejects.toThrow('disabled');
      await expect(
        createMongoAdapter().connect({ explicitlyAllowConnection: true }),
      ).rejects.toThrow('not configured');
      expect(adapter.state).toBe(0);
      expect(openUri).not.toHaveBeenCalled();
    } finally {
      openUri.mockRestore();
    }
  });
});
