import React from 'react';

import { cn } from '../utils';
import { Breadcrumbs, type BreadcrumbItem } from './Breadcrumbs';

export type { BreadcrumbItem };

const HERO_BADGE_VARIANT = {
  teal: 'border-teal-400/20 bg-teal-400/[0.08] text-teal-200/90',
  blue: 'border-blue-500/20 bg-blue-500/10 text-blue-300',
  emerald: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200/90',
  amber: 'border-amber-400/20 bg-amber-400/10 text-amber-200/90',
  violet: 'border-violet-400/20 bg-violet-400/10 text-violet-200/90',
  sky: 'border-sky-400/20 bg-sky-400/10 text-sky-200/90',
} as const;

export type PageHeroBadgeVariant = keyof typeof HERO_BADGE_VARIANT;

export function PageHeroBadge({
  label,
  icon,
  variant = 'teal',
  className,
}: {
  label: string;
  icon?: React.ReactNode;
  variant?: PageHeroBadgeVariant;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em]',
        HERO_BADGE_VARIANT[variant],
        className,
      )}
    >
      {icon}
      <span>{label}</span>
    </div>
  );
}

export function PageBreadcrumbsBar({ items }: { items: BreadcrumbItem[] }) {
  return (
    <section className="border-b border-white/[0.06] px-6 pb-4 pt-10">
      <div className="mx-auto max-w-7xl">
        <Breadcrumbs centered items={items} />
      </div>
    </section>
  );
}

type PageHeroShellProps = {
  title: string;
  subtitle?: React.ReactNode;
  /** Applied to the subtitle wrapper (default body copy). */
  subtitleClassName?: string;
  badge?: React.ReactNode;
  /** Rendered inside the title stack after subtitle (e.g. blog search). */
  afterSubtitle?: React.ReactNode;
  /** Rendered after the title stack block (e.g. portfolio cockpit, swap widget). */
  belowIntro?: React.ReactNode;
  innerPb?: string;
  sectionClassName?: string;
};

export function PageHeroShell({
  title,
  subtitle,
  subtitleClassName = 'max-w-2xl text-base leading-[1.75] tracking-wide text-slate-400',
  badge,
  afterSubtitle,
  belowIntro,
  innerPb = 'pb-12',
  sectionClassName = '',
}: PageHeroShellProps) {
  return (
    <section
      className={`relative overflow-hidden border-b border-white/[0.06] bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.09),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(139,92,246,0.07),transparent_38%),linear-gradient(180deg,rgba(6,9,16,0.92)_0%,rgba(7,11,20,0.88)_50%,rgba(5,7,14,0.95)_100%)] pt-10 ${sectionClassName}`}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[10%] top-24 h-72 w-72 rounded-full bg-teal-400/[0.07] blur-3xl" />
        <div className="absolute right-[8%] top-16 h-80 w-80 rounded-full bg-violet-500/[0.06] blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-cyan-400/[0.05] blur-3xl" />
      </div>

      <div className={`relative mx-auto grid max-w-7xl gap-8 px-6 pt-4 ${innerPb} lg:items-center`}>
        <div className="space-y-6">
          {badge ? <div>{badge}</div> : null}
          <div className="space-y-3">
            <h1 className="font-display max-w-4xl text-4xl font-medium leading-[1.05] tracking-tight text-white md:text-6xl md:leading-[1.02]">
              {title}
            </h1>
            <div
              className="h-px max-w-4xl bg-gradient-to-r from-transparent via-teal-300/25 to-transparent"
              aria-hidden
            />
            {subtitle != null ? <div className={subtitleClassName}>{subtitle}</div> : null}
            {afterSubtitle}
          </div>
          {belowIntro}
        </div>
      </div>
    </section>
  );
}
