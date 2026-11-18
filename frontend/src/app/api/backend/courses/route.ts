import { NextRequest } from 'next/server';
import { proxyBackendRequest } from '@/lib/integration/backend-proxy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET(request: NextRequest) {
  return proxyBackendRequest('/courses', request.nextUrl.searchParams, request);
}
