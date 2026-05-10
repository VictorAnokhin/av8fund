import React from 'react';
import { ArrowRightLeft } from 'lucide-react';
import { useI18n } from '../i18n';
import { getBasePath } from '../lib/routes';
import { PageBreadcrumbsBar, PageHeroBadge, PageHeroShell } from './PageChrome';
import { SwapWidgetSection } from './SwapWidgetSection';

export function SwapPage() {
  const { messages } = useI18n();
  const homeHref = getBasePath();

  return (
    <main className="relative min-h-[calc(100vh-160px)] pb-14 pt-14">
      <PageBreadcrumbsBar
        items={[
          { label: messages.breadcrumbs.home, href: homeHref },
          { label: messages.swap.pageTitle },
        ]}
      />
      <PageHeroShell
        badge={
          <PageHeroBadge
            label={messages.swap.heroBadge}
            icon={<ArrowRightLeft className="h-3.5 w-3.5" />}
            variant="teal"
          />
        }
        title={messages.swap.pageTitle}
        subtitle={messages.swap.subtitle}
        belowIntro={
          <div className="overflow-hidden rounded-[2rem] border border-white/[0.06] bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.1),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(139,92,246,0.08),transparent_36%),linear-gradient(180deg,rgba(6,9,16,0.95)_0%,rgba(7,11,20,0.98)_100%)] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
            <SwapWidgetSection centered hideInfoPanel />
          </div>
        }
      />
    </main>
  );
}
