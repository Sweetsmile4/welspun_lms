import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { parseEnvironment } from '../src/platform/environment.js';
import { fingerprint } from '../src/modules/identity/management/service.js';
import { createManagementRouter } from '../src/modules/identity/management/router.js';
import {
  managementFixture,
  memoryManagementStore,
} from './management-fixture.js';
import { managementScenarios } from './management-scenarios.js';
describe('isolated management command controllers (test double)', () => {
  let store: ReturnType<typeof memoryManagementStore>;
  beforeEach(() => {
    store = memoryManagementStore();
  });
  managementScenarios(() => store);
  it('canonicalizes payload ordering while binding changed fields', () => {
    expect(fingerprint({ a: 1, b: { c: 2, d: 3 } })).toBe(
      fingerprint({ b: { d: 3, c: 2 }, a: 1 }),
    );
    expect(fingerprint({ a: 1 })).not.toBe(fingerprint({ a: 2 }));
  });
  it('never registers controllers on the normal API and rejects unsafe router construction', async () => {
    const f = await managementFixture(store);
    const app = createApp(
      parseEnvironment({ NODE_ENV: 'test', LOG_LEVEL: 'silent' }),
    );
    for (const suffix of [
      '/employees',
      '/org-units',
      '/memberships',
      '/roles',
      '/role-grants',
    ]) {
      await request(app)
        .get(f.base + suffix)
        .expect(404);
      await request(app)
        .post(f.base + suffix)
        .send({})
        .expect(404);
    }
    const original = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'production';
      expect(() =>
        createManagementRouter(f.security, f.managementService, {
          isolatedTest: true,
        }),
      ).toThrow('isolated tests');
      await request(f.app)
        .get(f.base + '/employees')
        .expect(503);
    } finally {
      process.env.NODE_ENV = original;
    }
  });
  it('requires the explicit new read actions rather than borrowing management authority', async () => {
    const f = await managementFixture(store);
    await f.grant({ kind: 'organization' }, ['unit.manage', 'security.manage']);
    for (const suffix of ['/org-units', '/roles', '/role-grants'])
      await request(f.app)
        .get(f.base + suffix)
        .set('authorization', 'Bearer ' + f.bearer)
        .expect(403);
  });
});
