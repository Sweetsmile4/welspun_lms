import { CourseDetailView } from '@/components/catalog/course-detail-view';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Course details' };

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ release?: string }>;
}) {
  const [{ courseId }, query] = await Promise.all([params, searchParams]);
  const release = Number(query.release ?? '');
  return (
    <CourseDetailView
      courseId={courseId}
      releaseNumber={
        Number.isInteger(release) && release > 0 ? release : undefined
      }
    />
  );
}
