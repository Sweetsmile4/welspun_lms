import { SimulationLabs } from '@/components/live-lms/simulation-labs';
import { Placeholder } from '@/components/placeholder';
export const metadata = { title: 'Simulations' };
export default function Page() {
  if (process.env.LMS_LIVE_ENABLED === 'true') return <SimulationLabs />;
  return (
    <Placeholder
      title="Simulations"
      description="A future space for interactive factory walkthroughs and inspection exercises. No 3D scenes or industrial rules are implemented."
      capabilities={[
        'Factory walkthroughs',
        'Inspection exercises',
        'Simulation practice',
      ]}
    />
  );
}
