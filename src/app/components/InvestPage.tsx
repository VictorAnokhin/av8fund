import React from 'react';
import { HorizonLineSection } from './HorizonLineSection';
import { InvestmentSection } from './InvestmentSection';
import { ManifestSection } from './ManifestSection';
import { useI18n } from '../i18n';
import { getBasePath } from '../lib/routes';
import { PageBreadcrumbsBar, PageHeroBadge, PageHeroShell } from './PageChrome';

export function InvestPage() {
  const { messages } = useI18n();
  const homeHref = getBasePath();

  return (
    <main className="min-h-[calc(100vh-160px)] bg-slate-950 pb-20 pt-14">
      <PageBreadcrumbsBar
        items={[
          { label: messages.breadcrumbs.home, href: homeHref },
          { label: messages.invest.pageTitle },
        ]}
      />
      <PageHeroShell
        badge={<PageHeroBadge label={messages.invest.heroBadge} variant="teal" />}
        title={messages.invest.pageTitle}
        subtitle={messages.invest.pageHeroSubtitle}
        subtitleClassName="max-w-3xl text-lg leading-relaxed text-slate-400"
      />

      <section className="px-6 py-10">
        <div className="mx-auto max-w-7xl space-y-6">
          <HorizonLineSection />

          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <ManifestSection />
            <InvestmentSection asPage omitIntro />
          </div>
        </div>
      </section>
    </main>
  );
}
