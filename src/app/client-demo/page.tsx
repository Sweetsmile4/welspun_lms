'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDemo } from '@/components/client-demo/demo-context';
import { DEMO_USER } from '@/lib/client-demo/course-data';
import { Button } from '@/components/ui/button';
import {
  ShieldAlert,
  ArrowRight,
  UserCheck,
  Lock,
  Sparkles,
} from 'lucide-react';

export default function ClientDemoLoginPage() {
  const router = useRouter();
  const { loginAsDemoUser } = useDemo();
  const [employeeCode, setEmployeeCode] = useState(DEMO_USER.employeeCode);
  const [plantLocation, setPlantLocation] = useState(DEMO_USER.plantLocation);

  const handleEnterDemo = (e: React.FormEvent) => {
    e.preventDefault();
    loginAsDemoUser();
    router.push('/client-demo/dashboard');
  };

  const handleQuickDemoEntry = () => {
    loginAsDemoUser();
    router.push('/client-demo/dashboard');
  };

  return (
    <div className="flex min-h-[75vh] flex-col items-center justify-center py-6 sm:py-12">
      <div className="w-full max-w-xl">
        {/* Main Card */}
        <div className="overflow-hidden rounded-3xl border border-slate-300 bg-white shadow-xl">
          {/* Card Top Brand Banner */}
          <div className="bg-[#0a2540] p-8 text-center text-white">
            <div className="mx-auto mb-3 grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-[#f4c568] to-[#e8a93a] text-3xl font-black text-[#0a2540] shadow-md">
              W
            </div>
            <h1 className="text-2xl font-black tracking-wider text-white">
              WELSPUN CORP
            </h1>
            <p className="mt-1 text-xs font-semibold tracking-wide text-slate-300 uppercase">
              Technical Learning Portal · Client Demonstration
            </p>
            <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 px-3 py-1 text-xs font-bold text-amber-200 border border-amber-300/30">
              <ShieldAlert className="size-3.5" aria-hidden="true" />
              Demonstration Environment · Fictional Employee Profile
            </div>
          </div>

          <div className="p-8">
            {/* Quick 1-Click Entry Callout */}
            <div className="rounded-2xl border-2 border-dashed border-[#203d68]/40 bg-[#f0f6fc] p-5 text-center">
              <div className="flex items-center justify-center gap-2 text-xs font-bold text-[#152d50] uppercase tracking-wider">
                <Sparkles
                  className="size-4 text-amber-600"
                  aria-hidden="true"
                />
                Recommended Demonstration Flow
              </div>
              <h2 className="mt-2 text-base font-extrabold text-slate-900">
                Explore as Rajesh Sharma
              </h2>
              <p className="mt-1 text-xs text-slate-600">
                Junior Pipe Production Operator · Anjar Manufacturing Division
                (Mill 1)
              </p>

              <div className="mt-4 flex flex-wrap justify-center gap-3 text-xs text-slate-700">
                <span className="rounded-md bg-white px-2.5 py-1 font-mono font-bold border border-slate-200">
                  ID: WCL-DEMO-7042
                </span>
                <span className="rounded-md bg-white px-2.5 py-1 font-medium border border-slate-200">
                  HSAW Pipe Operations
                </span>
                <span className="rounded-md bg-white px-2.5 py-1 font-medium border border-slate-200">
                  3 Assigned Courses
                </span>
              </div>

              <div className="mt-5">
                <Button
                  onClick={handleQuickDemoEntry}
                  className="w-full h-11 bg-[#152d50] hover:bg-[#203d68] text-white font-bold text-sm shadow-md transition-all rounded-xl"
                >
                  <UserCheck
                    className="mr-2 size-4 text-amber-400"
                    aria-hidden="true"
                  />
                  Enter Demonstration Portal
                  <ArrowRight className="ml-2 size-4" aria-hidden="true" />
                </Button>
              </div>
            </div>

            {/* Simulated Form for realistic UI look */}
            <div className="relative my-6 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <span className="relative bg-white px-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                Or inspect credentials
              </span>
            </div>

            <form onSubmit={handleEnterDemo} className="space-y-4">
              <div>
                <label
                  htmlFor="empCode"
                  className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
                >
                  Fictional Employee Code
                </label>
                <div className="mt-1 relative">
                  <input
                    id="empCode"
                    type="text"
                    value={employeeCode}
                    onChange={(e) => setEmployeeCode(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-xs font-mono font-bold text-slate-800 focus:border-[#203d68] focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="plantLoc"
                  className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
                >
                  Plant / Operating Unit
                </label>
                <div className="mt-1 relative">
                  <input
                    id="plantLoc"
                    type="text"
                    value={plantLocation}
                    onChange={(e) => setPlantLocation(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-xs font-medium text-slate-800 focus:border-[#203d68] focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-xs text-slate-500">
                <div className="flex items-start gap-2">
                  <Lock
                    className="mt-0.5 size-3.5 shrink-0 text-slate-400"
                    aria-hidden="true"
                  />
                  <p className="text-[11px] leading-relaxed">
                    <strong>Demo Security Policy:</strong> No real passwords or
                    enterprise credentials are collected, stored, or
                    transmitted. Clicking enter activates browser-local demo
                    state.
                  </p>
                </div>
              </div>

              <Button
                type="submit"
                variant="outline"
                className="w-full h-10 border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100"
              >
                Proceed with Selected Profile
              </Button>
            </form>
          </div>

          {/* Safety Disclaimer Footer */}
          <div className="border-t border-slate-200 bg-amber-50/80 px-6 py-3 text-center text-xs text-amber-950">
            <p>
              This is an isolated prototype demonstration. It does not replace
              or activate the future Welspun corporate single sign-on (SSO)
              architecture.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
