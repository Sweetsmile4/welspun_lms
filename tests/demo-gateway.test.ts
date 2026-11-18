import { describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { demoCourseIds, demoBootstrapSchema } from '@welspun/contracts/demo';
import {
  backendOrigin,
  demoGateway,
} from '../frontend/src/lib/integration/demo-gateway.js';
const data = {
  mode: 'demo',
  persistence: 'browser-local',
  courses: demoCourseIds.map((id, index) => ({
    id,
    title: `Backend course ${index}`,
    code: `DEMO-${index}`,
    category: 'Manufacturing Process',
    estimatedMinutes: 20,
  })),
};
const envelope = { data, meta: { requestId: randomUUID(), nextCursor: null } };
const response = () => Response.json(envelope);
describe('fixed demo gateway', () => {
  it('requires an exact HTTPS origin, with explicit loopback-only HTTP for local tests', () => {
    expect(backendOrigin('https://api.example')).toBe('https://api.example');
    expect(backendOrigin('http://127.0.0.1:4399', true)).toBe(
      'http://127.0.0.1:4399',
    );
    for (const origin of [
      'http://api.example',
      'https://user:secret@api.example',
      'https://api.example/path',
      'https://api.example/',
      'https://api.example?q=x',
      'http://169.254.169.254',
      'http://localhost:4399',
    ])
      expect(() => backendOrigin(origin, true)).toThrow();
  });
  it('never contacts an upstream when unconfigured or invalid, and does not leak configuration', async () => {
    const fetcher = vi.fn();
    expect(await (await demoGateway({}, fetcher)).json()).toEqual({
      connection: 'local',
      data: null,
    });
    const bad = await demoGateway(
      { origin: 'https://secret@api.example' },
      fetcher,
    );
    expect(bad.status).toBe(503);
    expect(await bad.text()).not.toContain('secret');
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('fetches only the fixed endpoint and never forwards browser credentials or caches responses', async () => {
    const fetcher = vi.fn().mockResolvedValue(response());
    const result = await demoGateway(
      { origin: 'https://api.example' },
      fetcher,
    );
    expect(fetcher).toHaveBeenCalledWith(
      'https://api.example/api/v1/demo/bootstrap',
      expect.objectContaining({
        method: 'GET',
        credentials: 'omit',
        cache: 'no-store',
        redirect: 'error',
        headers: { Accept: 'application/json' },
      }),
    );
    expect(await result.json()).toEqual({
      connection: 'connected',
      data: demoBootstrapSchema.parse(data),
    });
    expect(result.headers.get('cache-control')).toBe('private, no-store');
  });
  it('rejects failed, oversized, malformed and incompatible upstream responses', async () => {
    for (const reply of [
      new Response('unavailable', { status: 503 }),
      Response.json({ data: { ...data, mode: 'real' } }),
      Response.json({
        ...envelope,
        data: {
          ...data,
          courses: [data.courses[0], data.courses[0], data.courses[0]],
        },
      }),
      new Response('x'.repeat(32769), {
        headers: { 'Content-Type': 'application/json' },
      }),
    ]) {
      const result = await demoGateway(
        { origin: 'https://api.example' },
        vi.fn().mockResolvedValue(reply),
      );
      expect(result.status).toBe(503);
      expect(await result.text()).toContain('unavailable');
    }
    expect(
      (
        await demoGateway(
          { origin: 'https://api.example' },
          vi.fn().mockRejectedValue(new Error('private upstream error')),
        )
      ).status,
    ).toBe(503);
  });
  it('aborts an unresponsive upstream and returns a safe service error', async () => {
    vi.useFakeTimers();
    try {
      const fetcher = vi.fn(
        (_url: unknown, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) =>
            init?.signal?.addEventListener('abort', () =>
              reject(new Error('timeout')),
            ),
          ),
      );
      const result = demoGateway({ origin: 'https://api.example' }, fetcher);
      await vi.advanceTimersByTimeAsync(5001);
      expect((await result).status).toBe(503);
    } finally {
      vi.useRealTimers();
    }
  });
});
