'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  RotateCcw,
  User,
  Building2,
  BookOpen,
  LayoutDashboard,
  CheckCircle2,
} from 'lucide-react';
import { useDemo } from './demo-context';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function DemoHeader() {
  const pathname = usePathname();
  const { user, overallStats, resetDemoProgress } = useDemo();
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const handleReset = () => {
    resetDemoProgress();
    setShowResetConfirm(false);
    setResetSuccess(true);
    setTimeout(() => setResetSuccess(false), 2500);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-700 bg-[#0a2540] text-white shadow-md">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        {/* Brand & Portal Title */}
        <div className="flex items-center gap-3">
          <Link
            href="/client-demo/dashboard"
            className="flex items-center gap-3 group focus-visible:outline-2 focus-visible:outline-amber-300 rounded-lg p-1"
          >
            <div className="grid size-9 place-items-center rounded-lg bg-gradient-to-br from-[#f4c568] to-[#e8a93a] text-xl font-black text-[#0a2540] shadow-sm transition-transform group-hover:scale-105">
              W
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-extrabold tracking-wider text-white">
                  WELSPUN CORP
                </span>
                <span className="rounded-sm bg-red-600/80 px-1.5 py-0.2 text-[9px] font-bold tracking-widest text-white uppercase">
                  Client Demo
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                Employee Technical Learning Portal
              </p>
            </div>
          </Link>
        </div>

        {/* Center Nav Links */}
        <nav
          aria-label="Demo portal navigation"
          className="hidden md:flex items-center gap-1"
        >
          <Link
            href="/client-demo/dashboard"
            className={cn(
              'flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
              pathname === '/client-demo/dashboard'
                ? 'bg-white/15 text-white'
                : 'text-slate-300 hover:bg-white/10 hover:text-white',
            )}
          >
            <LayoutDashboard className="size-3.5" aria-hidden="true" />
            Dashboard
          </Link>
          <Link
            href="/client-demo/course/pipe-process-101"
            className={cn(
              'flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
              pathname?.includes('/client-demo/course')
                ? 'bg-white/15 text-white'
                : 'text-slate-300 hover:bg-white/10 hover:text-white',
            )}
          >
            <BookOpen className="size-3.5" aria-hidden="true" />
            Active Course
          </Link>
        </nav>

        {/* Right Employee Info & Actions */}
        <div className="flex items-center gap-3">
          {/* Progress pill */}
          <div className="hidden lg:flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs">
            <span className="text-slate-300">Progress:</span>
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-16 overflow-hidden rounded-full bg-slate-700">
                <div
                  className="h-full bg-amber-400 transition-all duration-300"
                  style={{ width: `${overallStats.percentComplete}%` }}
                />
              </div>
              <span className="font-bold text-amber-300">
                {overallStats.percentComplete}%
              </span>
            </div>
          </div>

          {/* Fictional Employee Pill */}
          {user && (
            <div className="flex items-center gap-2.5 rounded-lg border border-slate-600/70 bg-[#153457] px-3 py-1.5 text-xs shadow-xs">
              <div className="grid size-6 place-items-center rounded-full bg-amber-400/20 text-[11px] font-bold text-amber-300">
                <User className="size-3.5" aria-hidden="true" />
              </div>
              <div className="text-left leading-tight">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-white">{user.fullName}</span>
                  <span className="rounded bg-slate-800 px-1 py-0.5 text-[10px] text-slate-300">
                    {user.employeeCode}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-slate-400">
                  <Building2
                    className="size-2.5 text-slate-400"
                    aria-hidden="true"
                  />
                  <span className="truncate max-w-[120px] sm:max-w-none">
                    {user.plantLocation}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Reset Demo Button */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowResetConfirm(true)}
              aria-label="Reset Demo"
              className="h-8 border-slate-600 bg-slate-800/80 px-2.5 text-xs font-medium text-slate-200 hover:bg-slate-700 hover:text-white"
              title="Reset all demo progress to initial state"
            >
              <RotateCcw
                className="mr-1.5 size-3.5 text-amber-400"
                aria-hidden="true"
              />
              <span className="hidden sm:inline">Reset Demo</span>
              <span className="sm:hidden">Reset</span>
            </Button>

            {/* Reset confirmation popover */}
            {showResetConfirm && (
              <div className="absolute right-0 top-10 z-50 w-72 rounded-xl border border-slate-300 bg-white p-4 text-xs text-slate-800 shadow-xl">
                <p className="font-semibold text-slate-900">
                  Reset Demo Progress?
                </p>
                <p className="mt-1 text-slate-600">
                  This will clear browser-local progress and reset all three
                  courses to not-started.
                </p>
                <div className="mt-3 flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowResetConfirm(false)}
                    className="h-7 text-xs text-slate-600"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleReset}
                    className="h-7 bg-red-600 text-xs text-white hover:bg-red-700"
                  >
                    Confirm Reset
                  </Button>
                </div>
              </div>
            )}

            {/* Toast notice on successful reset */}
            {resetSuccess && (
              <div className="absolute right-0 top-10 z-50 flex items-center gap-2 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white shadow-lg animate-in fade-in">
                <CheckCircle2 className="size-4" aria-hidden="true" />
                Demo state reset successfully!
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
