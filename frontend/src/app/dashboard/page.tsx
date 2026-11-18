import { Placeholder } from '@/components/placeholder';
export const metadata = { title: 'Employee dashboard' };
export default function Page() {
  return (
    <Placeholder
      title="Employee dashboard"
      description="A clear starting point for future assignments, self-paced learning and development. This preview contains no employee records."
      capabilities={[
        'Learning overview',
        'Mandatory training',
        'Recommended learning',
      ]}
    />
  );
}
