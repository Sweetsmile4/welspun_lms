import type { Metadata } from 'next';
import { Shell } from '@/components/shell';
import './globals.css';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: {
    default:
      process.env.LMS_LIVE_ENABLED === 'true'
        ? 'Welspun LMS'
        : 'Welspun LMS | Foundation preview',
    template:
      process.env.LMS_LIVE_ENABLED === 'true'
        ? '%s | Welspun LMS'
        : '%s | Welspun LMS preview',
  },
  description:
    process.env.LMS_LIVE_ENABLED === 'true'
      ? 'Your courses, learning progress and completion records.'
      : 'Phase 1A application foundation. No real employee data or authentication.',
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Shell live={process.env.LMS_LIVE_ENABLED === 'true'}>{children}</Shell>
      </body>
    </html>
  );
}
