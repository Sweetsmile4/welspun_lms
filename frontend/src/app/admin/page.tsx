import { Placeholder } from '@/components/placeholder';
export const metadata = { title: 'Admin dashboard' };
export default function Page() {
  return (
    <Placeholder
      title="Admin dashboard"
      description="A layout preview for future authorized administrators. This page grants no administrative access and performs no actions."
      capabilities={[
        'Content governance',
        'Training administration',
        'Scoped reporting',
      ]}
    />
  );
}
