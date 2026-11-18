import DemoDashboard from '../client-demo/dashboard/page';
import { LiveDashboard } from '@/components/live-lms/dashboard';
export const dynamic = 'force-dynamic';
export default function Page() {
  return process.env.LMS_LIVE_ENABLED === 'true' ? (
    <LiveDashboard />
  ) : (
    <DemoDashboard />
  );
}
