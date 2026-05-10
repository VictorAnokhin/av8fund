import React from 'react';
import { ShieldCheck, Search, FileCheck2, UserCheck, RefreshCw } from 'lucide-react';
import { useI18n } from '../i18n';
import { getBasePath } from '../lib/routes';
import { PageBreadcrumbsBar, PageHeroBadge, PageHeroShell } from './PageChrome';

const sectionIcons = [UserCheck, Search, ShieldCheck, FileCheck2, RefreshCw];

export function KycAmlPage() {
  const { messages } = useI18n();
  const homeHref = getBasePath();

  return (
    <main className="relative min-h-[calc(100vh-160px)] bg-slate-950 pb-20 pt-14">
      <PageBreadcrumbsBar
        items={[
          { label: messages.breadcrumbs.home, href: homeHref },
          { label: messages.kycAml.pageTitle },
        ]}
      />
      <PageHeroShell
        badge={
          <PageHeroBadge
            label={messages.kycAml.badge}
            icon={<ShieldCheck className="h-3.5 w-3.5" />}
            variant="sky"
          />
        }
        title={messages.kycAml.pageTitle}
        subtitle={messages.kycAml.intro}
        subtitleClassName="max-w-3xl text-lg leading-relaxed text-slate-400"
      />

      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid gap-6">
          {messages.kycAml.sections.map((section, index) => {
            const Icon = sectionIcons[index % sectionIcons.length];

            return (
              <article
                key={section.title}
                className="rounded-3xl border border-white/10 bg-slate-900/70 p-8 backdrop-blur-md"
              >
                <div className="mb-5 flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10">
                    <Icon className="h-6 w-6 text-blue-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">{section.title}</h2>
                </div>
                <p className="mb-6 text-slate-400">{section.body}</p>
                <ul className="space-y-3">
                  {section.points.map((point) => (
                    <li key={point} className="flex items-start gap-3 text-sm text-slate-300">
                      <span className="mt-1 h-2 w-2 rounded-full bg-emerald-400" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
