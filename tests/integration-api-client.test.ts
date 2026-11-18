import { afterEach, describe, expect, it, vi } from 'vitest';
import { listCatalog } from '../frontend/src/lib/integration/api-client.js';

const validPage = {
  data: {
    schemaVersion: 1,
    items: [],
    nextCursor: null,
  },
  meta: {
    requestId: '00000000-0000-4000-8000-000000000001',
    nextCursor: null,
  },
};

afterEach(() => vi.restoreAllMocks());

describe('catalog integration client', () => {
  it('reads the typed success envelope through the same-origin proxy', async () => {
    const fetch = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify(validPage), { status: 200 }),
      );

    await expect(
      listCatalog({ search: ' safety ', limit: 20 }),
    ).resolves.toEqual(validPage);
    expect(fetch).toHaveBeenCalledWith(
      '/api/backend/courses?search=safety&limit=20',
      expect.objectContaining({
        credentials: 'include',
      }),
    );
  });

  it('preserves authentication failures as a distinct actionable error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'Valid authentication is required.',
            details: [],
          },
          requestId: '00000000-0000-4000-8000-000000000001',
        }),
        { status: 401 },
      ),
    );

    await expect(listCatalog()).rejects.toMatchObject({
      status: 401,
      code: 'AUTHENTICATION_REQUIRED',
    });
  });

  it('fails closed when the backend returns an invalid success body', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('{"data":{}}', { status: 200 }),
    );

    await expect(listCatalog()).rejects.toMatchObject({
      status: 502,
      code: 'INVALID_RESPONSE',
    });
  });
});
