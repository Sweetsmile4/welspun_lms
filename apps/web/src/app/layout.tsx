import type { Metadata } from 'next';
import { Shell } from '@/components/shell';
import './globals.css';
export const metadata: Metadata = {
  title: {
    default: 'Welspun LMS | Foundation preview',
    template: '%s | Welspun LMS preview',
  },
  description:
    'Phase 1A application foundation. No real employee data or authentication.',
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
