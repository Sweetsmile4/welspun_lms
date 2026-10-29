import { beforeEach, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import {
  managementFixture,
  memoryManagementStore,
} from './management-fixture.js';
import { hardeningScenarios } from './security-hardening-scenarios.js';
import {
  fingerprint,
  receiptVersions,
  validateReceipt,
} from '../src/modules/identity/management/receipts.js';
import { createManagementRouter } from '../src/modules/identity/management/router.js';
import {
  protectedController,
  createHttpApplicationService,
} from '../src/modules/identity/http-security.js';
import { z } from 'zod';

describe('security foundation hardening (test double)', () => {
  let store: ReturnType<typeof memoryManagementStore>;
  beforeEach(() => {
    store = memoryManagementStore();
  });
  hardeningScenarios(() => store);
  it('rejects structural copies and raw service/repository composition at controller boundaries', async () => {
    const f = await managementFixture(store);
    expect(() =>
      createManagementRouter(
        f.security,
        { ...f.managementService },
        { isolatedTest: true },
      ),
    ).toThrow('Protected management');
    expect(() =>
      createManagementRouter(
        f.security,
        store.repository as unknown as typeof f.managementService,
        { isolatedTest: true },
      ),
    ).toThrow('Protected management');
    expect(() =>
      protectedController(
        { ...f.security },
        z.object({}),
        () => ({}),
        async () => ({}),
        (v) => v,
        z.object({}),
      ),
    ).toThrow('Trusted HTTP');
    expect(() =>
      createHttpApplicationService(
        store.repository,
        { ...f.security },
        { durability: 'isolated-test', append: async () => {} },
        { isolatedTest: true },
      ),
    ).toThrow('Trusted HTTP');
  });
  it('fails closed for legacy, unsupported, corrupt, oversized and misbound receipts', () => {
    const key = {
      organizationId: 'a'.repeat(24),
      actorId: 'b'.repeat(24),
      operation: 'employee.provision',
      keyHash: fingerprint(randomUUID()),
    };
    const data = {
      id: 'c'.repeat(24),
      displayName: 'Synthetic',
      status: 'active',
      revision: 0,
    };
    const receipt = {
      ...key,
      ...receiptVersions,
      fingerprint: fingerprint({ synthetic: true }),
      responseDigest: fingerprint(data),
      data,
      createdAt: new Date('2026-10-29T00:00:00Z'),
    };
    expect(validateReceipt(receipt, key).data).toEqual(data);
    for (const change of [
      { schemaVersion: undefined },
      { commandVersion: 99 },
      { responseVersion: 99 },
      { data: { ...data, id: 'd'.repeat(24) } },
      { organizationId: 'e'.repeat(24) },
      { actorId: 'e'.repeat(24) },
      { operation: 'unit.create' },
      { data: 'x'.repeat(17000) },
    ])
      expect(() => validateReceipt({ ...receipt, ...change }, key)).toThrow(
        'requires reconciliation',
      );
    // A checksum detects accidental corruption; it is not a MAC against privileged database writers.
  });
});
