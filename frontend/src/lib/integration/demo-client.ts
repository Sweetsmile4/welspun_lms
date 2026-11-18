import {
  demoBootstrapSchema,
  type DemoBootstrap,
} from '@welspun/contracts/demo';
export type DemoConnection =
  | { connection: 'connected'; data: DemoBootstrap }
  | { connection: 'local' | 'unavailable'; data: null };
export async function readDemoConnection(
  signal?: AbortSignal,
): Promise<DemoConnection> {
  try {
    const response = await fetch('/api/backend/demo', {
      cache: 'no-store',
      credentials: 'omit',
      signal,
    });
    if (!response.ok) return { connection: 'unavailable', data: null };
    const result = await response.json();
    if (result.connection === 'local' && result.data === null)
      return { connection: 'local', data: null };
    if (result.connection === 'connected')
      return {
        connection: 'connected',
        data: demoBootstrapSchema.parse(result.data),
      };
  } catch {
    /* Show explicit local fallback; never claim a failed API is connected. */
  }
  return { connection: 'unavailable', data: null };
}
