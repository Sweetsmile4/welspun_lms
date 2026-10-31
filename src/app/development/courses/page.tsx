import { PreviewWorkspace } from '@/components/preview/workspace';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Course operations · Development preview' };
export default function Page() {
  return process.env.LMS_UI_PREVIEW === 'true' ? (
    <PreviewWorkspace />
  ) : (
    <section>
      <h1 className="text-3xl font-bold">Course preview disabled</h1>
      <p className="mt-4">
        Set the server-only LMS_UI_PREVIEW=true flag and restart the local
        frontend to enable synthetic UI fixtures. No backend integration is
        available.
      </p>
    </section>
  );
}
