import { NextRequest } from 'next/server';
import { backendOrigin } from './demo-gateway';
const routePattern =
  /^\/(?:auth\/(?:register|login|logout|session)|courses(?:\/[a-f0-9]{24}\/releases\/[1-9][0-9]*)?|learning(?:\/[a-f0-9]{24}\/(?:enroll|lessons\/[a-f0-9]{24}\/complete))?|certificates|admin\/(?:overview|courses))$/;
const headers = {
  'Cache-Control': 'private, no-store',
  'Content-Type': 'application/json',
};
function failure(status: number, code: string, message: string) {
  return Response.json(
    { error: { code, message, details: [] }, requestId: crypto.randomUUID() },
    { status, headers },
  );
}
async function boundedText(
  stream: ReadableStream<Uint8Array> | null,
  limit: number,
) {
  if (!stream) return '';
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new Error('Response too large');
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
  return new TextDecoder().decode(bytes);
}
export async function proxyBackendRequest(
  path: string,
  searchParams: URLSearchParams,
  request?: NextRequest,
) {
  if (!routePattern.test(path))
    return failure(404, 'NOT_FOUND', 'Route not found');
  const method = request?.method ?? 'GET';
  if (!['GET', 'POST'].includes(method))
    return failure(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
  if (
    [...searchParams.keys()].some(
      (key) =>
        path !== '/courses' || !['search', 'cursor', 'limit'].includes(key),
    )
  )
    return failure(422, 'VALIDATION_ERROR', 'Unsupported query parameters');
  if (
    method === 'POST' &&
    !request?.headers.get('content-type')?.startsWith('application/json')
  )
    return failure(415, 'UNSUPPORTED_CONTENT_TYPE', 'Use application/json');
  try {
    const origin = backendOrigin(
      process.env.LMS_BACKEND_ORIGIN ?? '',
      process.env.LMS_ALLOW_LOOPBACK_BACKEND === 'true',
    );
    const url = new URL(`/api/v1${path}`, origin);
    url.search = searchParams.toString();
    const cookie = (request?.headers.get('cookie') ?? '')
      .split(';')
      .map((item) => item.trim())
      .filter((item) => item.startsWith('welspun_session='));
    if (cookie.length > 1)
      return failure(401, 'AUTHENTICATION_REQUIRED', 'Invalid session');
    const response = await fetch(url, {
      method,
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(8000),
      headers: {
        Accept: 'application/json',
        ...(cookie[0] ? { Cookie: cookie[0] } : {}),
        ...(method === 'POST'
          ? {
              'Content-Type': 'application/json',
              Origin: request?.headers.get('origin') ?? '',
            }
          : {}),
      },
      ...(method === 'POST'
        ? { body: await boundedText(request!.body, 16384) }
        : {}),
    });
    if (!response.headers.get('content-type')?.includes('application/json'))
      return failure(502, 'INVALID_RESPONSE', 'Invalid backend response');
    const result = new Response(await boundedText(response.body, 1024 * 1024), {
      status: response.status,
      headers,
    });
    for (const cookieValue of response.headers.getSetCookie()) {
      if (cookieValue.startsWith('welspun_session='))
        result.headers.append('Set-Cookie', cookieValue);
    }
    return result;
  } catch {
    return failure(
      503,
      'INTEGRATION_UNAVAILABLE',
      'The learning service could not be reached',
    );
  }
}
