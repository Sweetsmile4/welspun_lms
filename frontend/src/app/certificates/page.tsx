import { Certificates } from '@/components/live-lms/certificates';
import { Placeholder } from '@/components/placeholder';
export const metadata = { title: 'Certificates' };
export default function Page() {
  if (process.env.LMS_LIVE_ENABLED === 'true') return <Certificates />;
  return (
    <Placeholder
      title="Certificates"
      description="A future record of credentials issued under approved policies. No certificates are issued or stored here."
      capabilities={[
        'Award records',
        'Credential validity',
        'Renewal requirements',
      ]}
    />
  );
}
