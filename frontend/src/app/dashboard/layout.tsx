import DemoLayout from '@/components/client-demo/demo-layout';
export default function Layout({ children }: { children: React.ReactNode }) {
  return process.env.LMS_LIVE_ENABLED === 'true' ? (
    <>{children}</>
  ) : (
    <DemoLayout>{children}</DemoLayout>
  );
}
