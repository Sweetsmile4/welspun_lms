'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ArrowUpRight,
  BookOpen,
  Boxes,
  GraduationCap,
  LayoutDashboard,
  Medal,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
export const navigation = [
  { href: '/dashboard', title: 'Employee dashboard', icon: LayoutDashboard },
  { href: '/catalog', title: 'Course catalog', icon: BookOpen },
  { href: '/my-learning', title: 'My learning', icon: GraduationCap },
  { href: '/simulations', title: 'Simulations', icon: Boxes },
  { href: '/certificates', title: 'Certificates', icon: Medal },
  { href: '/admin', title: 'Admin dashboard', icon: ShieldCheck },
];
export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      <a
        href="#main-content"
        className="sr-only fixed left-4 top-4 z-50 rounded bg-white p-3 focus:not-sr-only"
      >
        Skip to content
      </a>
      <aside className="border-b border-white/10 bg-[#152d50] text-white lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto">
        <div className="flex items-center gap-3 px-6 py-7">
          <div className="grid size-10 place-items-center rounded-xl border border-white/25 text-2xl font-black text-[#f4c568]">
            W
          </div>
          <div>
            <p className="text-lg font-bold tracking-wide">WELSPUN CORP</p>
            <p className="text-xs text-slate-300">
              Learning portal · Foundation
            </p>
          </div>
        </div>
        <p className="px-6 pb-3 text-[10px] font-bold tracking-[.2em] text-slate-300">
          LEARNING WORKSPACE
        </p>
        <nav
          aria-label="Main navigation"
          className="flex gap-1 overflow-x-auto px-3 pb-5 lg:flex-col"
        >
          {navigation.map(({ href, title, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={pathname === href ? 'page' : undefined}
              className={cn(
                'flex shrink-0 items-center gap-3 rounded-lg px-3 py-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300',
                pathname === href
                  ? 'bg-white/12 font-semibold text-white'
                  : 'text-slate-300 hover:bg-white/5 hover:text-white',
              )}
            >
              <Icon size={18} aria-hidden="true" />
              {title}
            </Link>
          ))}
        </nav>
        <nav
          aria-label="Development preview navigation"
          className="flex gap-1 overflow-x-auto px-3 pb-4 lg:flex-col"
        >
          <span className="shrink-0 px-3 py-2 text-[10px] font-bold tracking-widest text-slate-300">
            DEVELOPMENT PREVIEW
          </span>
          {[
            ['/development/courses', 'Course workspace'],
            ['/development/reviews', 'Review workflows'],
            ['/development/catalog', 'Development Course Catalog'],
          ].map(([href, title]) => (
            <Link
              key={href}
              href={href!}
              aria-current={pathname === href ? 'page' : undefined}
              className={cn(
                'shrink-0 rounded-lg px-3 py-3 text-sm focus-visible:outline-2 focus-visible:outline-amber-300',
                pathname === href
                  ? 'bg-white/12 text-white font-semibold'
                  : 'text-slate-300 hover:bg-white/5',
              )}
            >
              {title}
            </Link>
          ))}
        </nav>
        <div className="m-5 hidden rounded-xl border border-white/15 p-4 text-xs leading-5 text-slate-300 lg:block">
          <ShieldCheck
            className="mb-2 text-[#f4c568]"
            size={20}
            aria-hidden="true"
          />
          Local development preview
          <br />
          No employee accounts or learning records are connected.
        </div>
      </aside>
      <div className="min-w-0">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-6 py-5 lg:px-10">
          <p className="text-sm font-medium text-muted-foreground">
            Technical learning{' '}
            <span aria-hidden="true" className="mx-2 text-slate-300">
              /
            </span>{' '}
            Workspace preview
          </p>
          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900">
            Development foundation
          </span>
        </header>
        <div
          role="note"
          className="border-b border-amber-200 bg-[#fff9ec] px-6 py-3 text-sm text-amber-950 lg:px-10"
        >
          <strong>Preview only.</strong> Authentication is not configured. All
          employee sections are placeholders; development workspaces use labeled
          synthetic fixtures. No real employee data is displayed.
        </div>
        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto max-w-7xl px-6 py-9 outline-none lg:px-10 lg:py-11"
        >
          {children}
        </main>
        <footer className="mx-6 flex flex-wrap justify-between gap-3 border-t border-border py-6 text-xs text-muted-foreground lg:mx-10">
          <span>Welspun Corp · LMS foundation</span>
          <span className="flex items-center gap-1">
            Phase 0 policies remain proposals{' '}
            <ArrowUpRight size={12} aria-hidden="true" />
          </span>
        </footer>
      </div>
    </div>
  );
}
