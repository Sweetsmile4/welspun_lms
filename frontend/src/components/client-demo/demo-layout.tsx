import React from 'react';
import type { Metadata } from 'next';
import { DemoProvider } from '@/components/client-demo/demo-context';
import {
  DemoDisclaimerBanner,
  DemoFooterNotice,
} from '@/components/client-demo/demo-disclaimer';
import { DemoConnectionNotice } from '@/components/client-demo/demo-connection';
import { DemoHeader } from '@/components/client-demo/demo-header';

export const metadata: Metadata = {
  title: 'Welspun Learning Portal · Client Demonstration',
  description:
    'Demonstration environment for Welspun Corp employee learning experience, interactive HSAW manufacturing scenes, and multi-tier explanations.',
};

export default function DemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DemoProvider>
      <a
        href="#main-content"
        className="sr-only fixed left-4 top-4 z-50 rounded bg-white p-3 focus:not-sr-only"
      >
        Skip to content
      </a>
      <div className="min-h-screen bg-[#f4f6f9] text-[#172638] flex flex-col font-sans">
        <DemoDisclaimerBanner />
        <DemoHeader />
        <DemoConnectionNotice />
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8"
        >
          {children}
          <DemoFooterNotice />
        </main>
      </div>
    </DemoProvider>
  );
}
