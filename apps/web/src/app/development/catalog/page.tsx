import { PreviewCatalog } from '@/components/preview/catalog';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Development Course Catalog' };
export default function Page() {
  return process.env.LMS_UI_PREVIEW === 'true' ? (
    <PreviewCatalog />
  ) : (
    <section>
      <h1 className="text-3xl font-bold">Catalog preview disabled</h1>
      <p className="mt-4">
        Set LMS_UI_PREVIEW=true on the local frontend to enable synthetic
        catalog fixtures. No backend access is enabled.
      </p>
    </section>
  );
}
