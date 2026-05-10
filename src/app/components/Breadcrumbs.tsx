import React from 'react';
import { ChevronRight } from 'lucide-react';

import { cn } from '../utils';

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

type BreadcrumbsProps = {
  items: BreadcrumbItem[];
  /** Центрирование и без нижнего отступа (например, компактный hero) */
  centered?: boolean;
  className?: string;
};

export function Breadcrumbs({ items, centered = false, className }: BreadcrumbsProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn(centered ? 'mb-0 flex w-full justify-center' : 'mb-8', className)}
    >
      <ol
        className={cn(
          'flex flex-wrap items-center gap-2 text-sm tracking-wide text-slate-500',
          centered && 'justify-center',
        )}
      >
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <React.Fragment key={`${item.label}-${index}`}>
              <li>
                {item.href && !isLast ? (
                  <a
                    href={item.href}
                    className="transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-teal-100/90"
                  >
                    {item.label}
                  </a>
                ) : (
                  <span className={isLast ? 'font-medium text-slate-200' : undefined}>{item.label}</span>
                )}
              </li>
              {!isLast ? (
                <li aria-hidden="true" className="text-slate-600/80">
                  <ChevronRight className="h-4 w-4" />
                </li>
              ) : null}
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
