import { demoBootstrapEnvelopeSchema } from '@welspun/contracts/demo';

const headers = {
  'Cache-Control': 'private, no-store',
  'Content-Type': 'application/json',
};
const unavailable = () =>
  Response.json(
    { connection: 'unavailable', message: 'Demo API unavailable.' },
    { status: 503, headers },
  );
export function backendOrigin(value: string, allowLoopback = false): string {
  const url = new URL(value);
  const loopback =
    allowLoopback &&
    url.protocol === 'http:' &&
    url.hostname === '127.0.0.1' &&
    !!url.port;
  if (
    (!loopback && url.protocol !== 'https:') ||
    value !== url.origin ||
    url.username ||
    url.password
  )
    throw new Error('Invalid backend origin');
  return url.origin;
}
/** Fixed server-side read-only target. No browser headers, cookies, destinations or credentials are forwarded. */
export async function demoGateway(
  config: { origin?: string; allowLoopback?: boolean },
  fetcher: typeof fetch = fetch,
): Promise<Response> {
  if (!config.origin)
    return Response.json({ connection: 'local', data: null }, { headers });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const origin = backendOrigin(config.origin, config.allowLoopback);
    const response = await fetcher(`${origin}/api/v1/demo/bootstrap`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      credentials: 'omit',
      cache: 'no-store',
      redirect: 'error',
      signal: controller.signal,
    });
    if (
      !response.ok ||
      !response.headers.get('content-type')?.includes('application/json') ||
      !response.body
    )
      return unavailable();
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 32768) {
          controller.abort();
          await reader.cancel();
          return unavailable();
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const result = demoBootstrapEnvelopeSchema.parse(
      JSON.parse(new TextDecoder().decode(bytes)),
    );
    return Response.json(
      { connection: 'connected', data: result.data },
      { headers },
    );
  } catch {
    return unavailable();
  } finally {
    clearTimeout(timeout);
  }
}
