import { expect, it } from 'vitest';
import request from 'supertest';
import { demoBootstrapEnvelopeSchema } from '@welspun/contracts/demo';
import { createApp } from '../src/app.js';
import { parseEnvironment } from '../src/platform/environment.js';

it('exposes only opted-in synthetic demo assignments, without account or mutation access', async () => {
  const disabled = createApp(
    parseEnvironment({ NODE_ENV: 'test', LOG_LEVEL: 'silent' }),
  );
  expect((await request(disabled).get('/api/v1/demo/bootstrap')).status).toBe(
    404,
  );
  const enabled = createApp(
    parseEnvironment({
      NODE_ENV: 'production',
      DEMO_API_ENABLED: 'true',
      DEPLOYMENT_MODE: 'hosted',
      LOG_LEVEL: 'silent',
    }),
  );
  const response = await request(enabled).get('/api/v1/demo/bootstrap');
  expect(response.status).toBe(200);
  const result = demoBootstrapEnvelopeSchema.parse(response.body);
  expect(result.data.courses).toHaveLength(3);
  expect(result.data.persistence).toBe('browser-local');
  expect(JSON.stringify(result)).not.toMatch(
    /isCorrect|answeredQuestions|password|accessToken/,
  );
  expect(response.headers['cache-control']).toBe('no-store');
  expect(
    (await request(enabled).get('/api/v1/demo/bootstrap?userId=admin')).status,
  ).toBe(422);
  expect(
    (
      await request(enabled)
        .post('/api/v1/demo/bootstrap')
        .send({ roles: ['admin'] })
    ).status,
  ).toBe(404);
  expect((await request(enabled).get('/api/v1/me')).status).toBe(401);
  expect((await request(enabled).get('/api/v1/ready')).status).toBe(503);
});
it('requires explicit hosted network binding and rejects synthetic identities in hosted mode', () => {
  expect(() => parseEnvironment({ HOST: '0.0.0.0' })).toThrow('HOST');
  expect(
    parseEnvironment({ HOST: '0.0.0.0', DEPLOYMENT_MODE: 'hosted' }).HOST,
  ).toBe('0.0.0.0');
  expect(() =>
    parseEnvironment({
      DEPLOYMENT_MODE: 'hosted',
      IDENTITY_MODE: 'synthetic',
      ISOLATED_DEVELOPMENT: 'true',
    }),
  ).toThrow();
});
