import { Placeholder } from '@/components/placeholder';
export const metadata = { title: 'My learning' };
export default function Page() {
  return (
    <Placeholder
      title="My learning"
      description="A future view of assigned and self-paced learning. Progress tracking has not been implemented."
      capabilities={[
        'Active learning',
        'Assignments and due dates',
        'Learning history',
      ]}
    />
  );
}
