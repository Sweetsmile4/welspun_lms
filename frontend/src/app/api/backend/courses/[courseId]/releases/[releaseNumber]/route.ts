import { NextRequest } from 'next/server';
import { proxyBackendRequest } from '@/lib/integration/backend-proxy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ courseId: string; releaseNumber: string }> },
) {
  const { courseId, releaseNumber } = await context.params;
  return proxyBackendRequest(
    `/courses/${encodeURIComponent(courseId)}/releases/${encodeURIComponent(releaseNumber)}`,
    request.nextUrl.searchParams,
    request,
  );
}
