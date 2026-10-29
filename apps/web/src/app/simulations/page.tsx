import { Placeholder } from '@/components/placeholder';
export const metadata = { title: 'Simulations' };
export default function Page() {
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
