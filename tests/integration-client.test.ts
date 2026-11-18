import { expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import * as wire from '@welspun/contracts/integration/v1';
import { integrationClient } from '../frontend/src/lib/integration/client.js';
const requestId = randomUUID();
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
