import { NextRequest } from 'next/server';
import { proxyBackendRequest } from '@/lib/integration/backend-proxy';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
async function handle(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  return proxyBackendRequest(
    '/' + path.join('/'),
    request.nextUrl.searchParams,
    request,
  );
}
export const GET = handle;
export const POST = handle;
