import { PreviewWorkspace } from '@/components/preview/workspace';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Reviews · Development preview' };
export default function Page() {
  return process.env.LMS_UI_PREVIEW === 'true' ? (
    <PreviewWorkspace initialTab="review" />
  ) : (
    <section>
      <h1 className="text-3xl font-bold">Review preview disabled</h1>
      <p className="mt-4">
        Set the server-only LMS_UI_PREVIEW=true flag and restart the local
        frontend. This enables visual fixtures only, not privileged services.
      </p>
    </section>
  );
}
