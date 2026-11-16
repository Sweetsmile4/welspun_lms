import { Placeholder } from '@/components/placeholder';
export const metadata = { title: 'Course catalog' };
export default function Page() {
  return (
    <Placeholder
      title="Course catalog"
      description="A future home for approved technical courses. No published courses or enrollment workflows are connected."
      capabilities={[
        'Approved course library',
        'Course discovery',
        'Self-paced enrollment',
      ]}
    />
  );
}
