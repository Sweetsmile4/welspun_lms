import { demoGateway } from '@/lib/integration/demo-gateway';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export function GET(request: Request) {
  if (new URL(request.url).search)
    return Response.json(
      {
        connection: 'unavailable',
        message: 'Query parameters are not accepted.',
      },
      { status: 422, headers: { 'Cache-Control': 'private, no-store' } },
    );
  return demoGateway({
    origin: process.env.LMS_BACKEND_ORIGIN,
    allowLoopback: process.env.LMS_ALLOW_LOOPBACK_BACKEND === 'true',
  });
}
