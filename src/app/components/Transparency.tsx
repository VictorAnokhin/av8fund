import React from 'react';
import {
  CheckCircle,
  Globe,
  ShieldCheck,
  Telescope,
} from 'lucide-react';

import { TransparencyHoldingsList } from './TransparencyHoldingsList';
import { useTransparencyOverview } from '../hooks/useTransparencyOverview';
import { useI18n } from '../i18n';
import {
  type ProjectSettings,
} from '../lib/api';

type TransparencyProps = {
  project: ProjectSettings;
  asPage?: boolean;
  headingOverride?: string;
};

export function Transparency({ project: _project, asPage = false, headingOverride }: TransparencyProps) {
  const { messages } = useI18n();
  const HeadingTag = asPage ? 'h1' : 'h2';
  const { hasWalletConnection, overview, isLoading, loadError } = useTransparencyOverview(messages.transparency.liveDataUnavailable);

  const holdings = overview?.holdings ?? [];
  const hasLiveData = Boolean(overview?.available && holdings.length > 0);
  const tvlValue = overview?.total_usd_value ?? 0;
  const tvlInteger = Math.trunc(tvlValue);
  const tvlFraction = Math.round((tvlValue - tvlInteger) * 100)
    .toString()
    .padStart(2, '0');
  const tvlDisplay = formatUsdWhole(tvlInteger);

  return (
    <section id="transparency" className="relative overflow-hidden border-t border-white/[0.06] bg-[linear-gradient(180deg,rgba(6,9,16,0.85)_0%,rgba(5,8,14,0.95)_100%)] py-24">
      <div className="absolute inset-0">
        <div className="absolute left-[8%] top-10 h-72 w-72 rounded-full bg-teal-400/[0.06] blur-3xl" />
        <div className="absolute right-[10%] bottom-8 h-72 w-72 rounded-full bg-violet-500/[0.055] blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-6">
        <div className="mb-14 grid gap-6 xl:grid-cols-[0.8fr_1.2fr] xl:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.09] bg-white/[0.04] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-slate-400 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">
              <Telescope className="h-4 w-4 text-teal-300/90" />
              Trust Surface
            </div>
            <HeadingTag className="font-display mt-5 text-3xl font-medium tracking-tight text-white md:text-5xl">
              {headingOverride || (
                <>
                  {messages.transparency.title}
                  <span className="mt-2 block bg-gradient-to-r from-teal-200 via-cyan-200 to-violet-300/90 bg-clip-text text-transparent">
                    {messages.transparency.subtitle}
                  </span>
                </>
              )}
            </HeadingTag>
          </div>

          <div className="ce-glass-slab rounded-[2rem] p-6">
            <p className="max-w-2xl text-lg leading-[1.75] tracking-wide text-slate-400">
              {messages.transparency.intro}
            </p>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="ce-glass-slab rounded-[2rem] p-6">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">{messages.transparency.tvl}</div>
                <div className="mt-3 text-5xl font-medium tracking-tight text-white">
                  {isLoading ? (
                    <span className="text-2xl text-slate-500">{messages.transparency.liveDataLoading}</span>
                  ) : hasLiveData ? (
                    <>
                      {tvlDisplay}
                      <span className="text-2xl text-teal-300/90">.{tvlFraction}</span>
                    </>
                  ) : (
                    <span className="text-2xl text-slate-500">--</span>
                  )}
                </div>
              </div>
              <div className="rounded-full border border-teal-400/20 bg-teal-400/[0.08] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-teal-200/95">
                {hasLiveData ? 'live holdings' : 'fallback state'}
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-white/[0.07] bg-[rgba(4,8,18,0.45)] p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] backdrop-blur-md">
              <div className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">
                {messages.transparency.currentHoldings}
              </div>

              {isLoading ? (
                <p className="text-sm text-slate-400">{messages.transparency.liveDataLoading}</p>
              ) : !hasWalletConnection ? (
                <div className="rounded-2xl border border-teal-400/15 bg-teal-400/[0.06] p-4 text-sm tracking-wide text-teal-100/90">
                  Connect a wallet to load live holdings from Zerion.
                </div>
              ) : hasLiveData ? (
                <TransparencyHoldingsList
                  holdings={holdings}
                  portfolioShareLabel={messages.transparency.portfolioShare}
                  tokenLabel={messages.transparency.tokenLabel}
                  defiLabel={messages.transparency.defiLabel}
                />
              ) : (
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-100">
                  {loadError || messages.transparency.liveDataUnavailable}
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="ce-glass-slab rounded-[2rem] p-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-teal-400/20 bg-teal-400/[0.08]">
                  <ShieldCheck className="h-5 w-5 text-teal-200/90" />
                </div>
                <h4 className="text-xl font-medium tracking-tight text-white">{messages.transparency.auditsTitle}</h4>
                <p className="mt-3 text-sm leading-[1.7] tracking-wide text-slate-500">{messages.transparency.auditsDescription}</p>
                <div className="mt-5 flex items-center gap-2 text-sm font-medium tracking-wide text-teal-200/90">
                  <CheckCircle className="h-4 w-4" />
                  {messages.transparency.auditsStatus}
                </div>
              </div>

              <div className="ce-glass-slab rounded-[2rem] p-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-violet-400/20 bg-violet-500/[0.08]">
                  <Globe className="h-5 w-5 text-violet-200/85" />
                </div>
                <h4 className="text-xl font-medium tracking-tight text-white">{messages.transparency.endpointTitle}</h4>
                <p className="mt-3 text-sm leading-[1.7] tracking-wide text-slate-500">{messages.transparency.endpointDescription}</p>
                <div className="mt-5 flex items-center gap-2 text-sm font-medium tracking-wide text-cyan-200/85">
                  <CheckCircle className="h-4 w-4" />
                  {messages.transparency.endpointStatus}
                </div>
              </div>
            </div>

            <div id="about" className="rounded-[2rem] border border-white/[0.08] bg-[linear-gradient(135deg,rgba(8,14,26,0.92)_0%,rgba(14,12,32,0.75)_100%)] p-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] backdrop-blur-xl">
              <div className="max-w-2xl">
                <div className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">Trust Surface</div>
                <h4 className="font-display mt-2 text-2xl font-medium tracking-tight text-white">{messages.transparency.currentHoldings}</h4>
                <p className="mt-4 text-sm leading-[1.75] tracking-wide text-slate-400">
                  Public holdings, audit posture, and endpoint status remain on the landing page without the operator profile block.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function formatUsdWhole(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}
