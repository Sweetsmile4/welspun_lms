import React from 'react';
import { AlertCircle, ShieldAlert } from 'lucide-react';

export function DemoDisclaimerBanner() {
  return (
    <div
      role="region"
      aria-label="Demonstration environment notice"
      className="border-b border-amber-300/80 bg-gradient-to-r from-amber-50 via-amber-100/60 to-amber-50 px-4 py-2.5 text-xs text-amber-950 shadow-xs"
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-medium">
          <ShieldAlert
            className="size-4 shrink-0 text-amber-800"
            aria-hidden="true"
          />
          <span>
            <strong className="font-semibold text-amber-900">
              Demonstration Environment:
            </strong>{' '}
            Fictional employee profile and sample training data for client
            review only.
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-amber-800/90">
          <span className="inline-flex items-center rounded-md bg-amber-200/70 px-2 py-0.5 font-medium text-amber-900">
            No Production Credentials
          </span>
          <span className="hidden sm:inline">•</span>
          <span className="hidden sm:inline">
            Illustrative SOPs & Calculations
          </span>
        </div>
      </div>
    </div>
  );
}

export function DemoFooterNotice() {
  return (
    <div className="mt-12 rounded-xl border border-slate-200 bg-white p-5 text-xs text-slate-600 shadow-xs">
      <div className="flex items-start gap-3">
        <AlertCircle
          className="mt-0.5 size-4 shrink-0 text-slate-500"
          aria-hidden="true"
        />
        <div className="space-y-1">
          <p className="font-semibold text-slate-800">
            Client Demonstration & Architecture Boundary
          </p>
          <p className="leading-relaxed text-slate-600">
            This demonstration runs entirely in the browser using static typed
            educational content and local demonstration state. It does not
            connect to MongoDB Atlas, call production identity providers, modify
            employee records, or generate legally binding qualification
            certificates. All engineering figures and process sequences are
            illustrative models designed to evaluate portal UX and multi-tier
            explanations.
          </p>
        </div>
      </div>
    </div>
  );
}
