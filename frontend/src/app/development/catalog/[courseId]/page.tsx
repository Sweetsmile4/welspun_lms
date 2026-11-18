import { PreviewCatalog } from '@/components/preview/catalog';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Published fixture course' };
export default async function Page({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  return process.env.LMS_UI_PREVIEW === 'true' ? (
    <PreviewCatalog courseId={courseId} />
  ) : (
    <section>
      <h1 className="text-3xl font-bold">Catalog preview disabled</h1>
      <p className="mt-4">
        Synthetic details require the local LMS_UI_PREVIEW=true flag.
      </p>
    </section>
  );
}
