import { PreviewProvider } from '@/components/preview/provider';
export const dynamic = 'force-dynamic';
export default function Layout({ children }: { children: React.ReactNode }) {
  return process.env.LMS_UI_PREVIEW === 'true' ? (
    <PreviewProvider>{children}</PreviewProvider>
  ) : (
    children
  );
}
