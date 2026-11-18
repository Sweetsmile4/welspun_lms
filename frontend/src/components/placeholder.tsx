import Link from 'next/link';
import { ArrowRight, CircleDashed } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
export function Placeholder({
  title,
  description,
  capabilities,
}: {
  title: string;
  description: string;
  capabilities: string[];
}) {
  return (
    <>
      <p className="mb-3 text-xs font-bold tracking-[.2em] text-muted-foreground">
        YOUR LEARNING WORKSPACE
      </p>
      <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{title}</h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
        {description}
      </p>
      <Card className="relative mt-8 overflow-hidden bg-primary p-7 text-white md:p-10">
        <div
          className="absolute -right-12 -top-12 size-60 rounded-full border-[30px] border-white/5"
          aria-hidden="true"
        />
        <p className="text-xs font-semibold uppercase tracking-widest text-[#f4c568]">
          Foundation in place
        </p>
        <h2 className="mt-3 max-w-xl text-2xl font-semibold">
          A workspace for technical learning.
        </h2>
        <p className="mt-3 max-w-xl text-sm leading-6 text-slate-200">
          This route establishes the application layout. Learning services and
          approved content will be introduced in later phases.
        </p>
        <div className="mt-6">
          <Button
            asChild
            variant="outline"
            className="border-white/30 bg-transparent text-white hover:bg-white/10"
          >
            <Link href={title === 'Course catalog' ? '/dashboard' : '/catalog'}>
              {title === 'Course catalog'
                ? 'Back to dashboard'
                : 'Explore the workspace'}
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </Card>
      <section aria-labelledby="planned-heading" className="mt-9">
        <div className="flex items-center justify-between gap-4">
          <h2 id="planned-heading" className="text-lg font-semibold">
            Planned capabilities
          </h2>
          <span className="text-xs text-muted-foreground">Not implemented</span>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {capabilities.map((capability, index) => (
            <Card key={capability} className="p-6">
              <div className="flex items-center justify-between">
                <CircleDashed
                  size={23}
                  className="text-muted-foreground"
                  aria-hidden="true"
                />
                <span className="text-xs text-muted-foreground">
                  0{index + 1}
                </span>
              </div>
              <h3 className="mt-5 font-semibold">{capability}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Awaiting a future implementation phase and the applicable
                approvals.
              </p>
              <span className="mt-5 inline-block rounded bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground">
                Placeholder
              </span>
            </Card>
          ))}
        </div>
      </section>
      <div className="mt-7 rounded-xl border border-dashed border-slate-300 px-5 py-4 text-sm leading-6 text-muted-foreground">
        No learning records, scores or credentials are available in this
        foundation preview.
      </div>
    </>
  );
}
