import React from 'react';
import { motion } from 'motion/react';
import {
  Activity,
  BrainCircuit,
  CircleDot,
  Coins,
  Landmark,
} from 'lucide-react';

import { useSuiFundDashboard } from '../hooks/useSuiFundDashboard';
import { useI18n } from '../i18n';
import { SUI_FUND_CONFIG } from '../lib/suiFund';
import { cn } from '../utils';

type SuiFundDashboardProps = {
  asPage?: boolean;
  omitIntro?: boolean;
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function ObjectNode({
  label,
  sublabel,
  tone,
  icon,
}: {
  label: string;
  sublabel: string;
  tone: string;
  icon: React.ReactNode;
}) {
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      className={cn(
        'relative rounded-3xl border px-5 py-4 backdrop-blur-xl transition-colors',
        tone,
      )}
    >
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
        {icon}
      </div>
      <div className="text-sm font-semibold uppercase tracking-[0.18em] text-white/65">{label}</div>
      <div className="mt-2 text-lg font-semibold text-white">{sublabel}</div>
    </motion.div>
  );
}

function formatAiLogStatus(
  status: 'verified' | 'pending' | 'failed',
  inv: ReturnType<typeof useI18n>['messages']['invest'],
): string {
  if (status === 'verified') {
    return inv.aiStatusVerified;
  }

  if (status === 'failed') {
    return inv.aiStatusFailed;
  }

  return inv.aiStatusPending;
}

export function SuiFundDashboard({ asPage = false, omitIntro = false }: SuiFundDashboardProps) {
  const { messages } = useI18n();
  const inv = messages.invest;
  const {
    snapshot,
    isLoading,
    error,
  } = useSuiFundDashboard();
  const cryptoAssets = snapshot.assets.filter((asset) => asset.type === 'crypto');
  const rwaAssets = snapshot.assets.filter((asset) => asset.type === 'rwa');
  const stableAssets = snapshot.assets.filter((asset) => asset.type === 'stable');

  return (
    <section
      id="fund-dashboard"
      className={cn(
        'relative overflow-hidden border-t border-white/[0.06] bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.1),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(139,92,246,0.08),transparent_34%),linear-gradient(180deg,rgba(6,9,16,0.92)_0%,rgba(7,11,20,0.97)_100%)]',
        asPage ? 'pt-10 pb-20' : 'py-24',
      )}
    >
      <div className="absolute inset-0 opacity-40">
        <div className="absolute left-[8%] top-20 h-64 w-64 rounded-full bg-teal-400/[0.07] blur-3xl" />
        <div className="absolute right-[12%] top-1/3 h-72 w-72 rounded-full bg-violet-500/[0.06] blur-3xl" />
        <div className="absolute bottom-10 left-1/3 h-80 w-80 rounded-full bg-cyan-400/[0.05] blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-6">
        {!omitIntro ? (
        <div className={cn(asPage ? 'mb-10' : 'mb-14')}>
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-teal-400/22 bg-teal-400/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-teal-200/90">
              <Activity className="h-4 w-4" />
              {inv.cockpitBadge}
            </div>
            <h2 className={cn('font-display max-w-4xl text-white tracking-tight', asPage ? 'text-4xl font-semibold md:text-6xl' : 'text-3xl font-semibold md:text-5xl')}>
              {inv.cockpitTitle}
            </h2>
            <p className="mt-5 max-w-3xl text-lg leading-relaxed text-slate-300/85">
              {inv.cockpitSubtitle}
            </p>
          </div>
        </div>
        ) : null}

        <div className="grid gap-6">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 backdrop-blur-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <div className="text-sm uppercase tracking-[0.18em] text-slate-400">{inv.fundCoreLabel}</div>
                <div className="mt-2 text-2xl font-semibold text-white">{inv.av8ObjectTitle}</div>
              </div>
              <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                {inv.navPrefix} {formatCurrency(snapshot.totalNavUsd)}
              </div>
            </div>

            <div className="relative overflow-hidden rounded-[1.75rem] border border-teal-400/18 bg-[radial-gradient(circle_at_center,_rgba(45,212,191,0.14),_transparent_55%),linear-gradient(180deg,rgba(12,18,32,0.88)_0%,rgba(5,8,16,0.96)_100%)] p-5">
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(148,163,184,0.08)_50%,transparent_100%)] opacity-30" />
              <div className="grid gap-4">
                <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full border border-teal-300/28 bg-teal-400/10 shadow-[0_0_70px_-8px_rgba(45,212,191,0.28)]">
                  <div className="text-center">
                    <div className="text-xs uppercase tracking-[0.22em] text-teal-200/90">{inv.av8Abbrev}</div>
                    <div className="mt-1 text-lg font-semibold text-white">{inv.fundWord}</div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <ObjectNode
                    label={inv.assetCryptoLabel}
                    sublabel={cryptoAssets.length ? cryptoAssets.map((asset) => asset.symbol).join(' / ') : inv.awaitingAssets}
                    tone="border-cyan-400/20 bg-cyan-400/10 shadow-[0_0_35px_rgba(34,211,238,0.12)]"
                    icon={<Coins className="h-5 w-5 text-cyan-200" />}
                  />
                  <ObjectNode
                    label={inv.assetRwaLabel}
                    sublabel={rwaAssets.length ? rwaAssets.map((asset) => asset.symbol).join(' / ') : inv.awaitingAssets}
                    tone="border-amber-400/20 bg-amber-400/10 shadow-[0_0_35px_rgba(245,158,11,0.12)]"
                    icon={<Landmark className="h-5 w-5 text-amber-200" />}
                  />
                  <ObjectNode
                    label={inv.assetYieldLabel}
                    sublabel={stableAssets.length ? stableAssets.map((asset) => asset.symbol).join(' / ') : inv.reserveLayer}
                    tone="border-emerald-400/20 bg-emerald-400/10 shadow-[0_0_35px_rgba(16,185,129,0.12)]"
                    icon={<BrainCircuit className="h-5 w-5 text-emerald-200" />}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 backdrop-blur-2xl">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <div className="text-sm uppercase tracking-[0.18em] text-slate-400">{inv.aiLogTitle}</div>
                <div className="mt-2 text-2xl font-semibold text-white">{inv.aiLogSubtitle}</div>
              </div>
              <div className="rounded-full border border-fuchsia-400/20 bg-fuchsia-400/10 px-3 py-1 text-xs uppercase tracking-[0.14em] text-fuchsia-200">
                {inv.trustLayerBadge}
              </div>
            </div>

            <div className="space-y-4">
              {snapshot.aiLogs.map((entry) => (
                <motion.div
                  key={entry.id}
                  whileHover={{ x: 4 }}
                  className="rounded-[1.5rem] border border-white/[0.09] bg-[rgba(5,9,18,0.68)] p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] backdrop-blur-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-1 rounded-full bg-white/8 p-2">
                        <CircleDot className="h-4 w-4 text-teal-300/90" />
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{entry.timestampLabel}</div>
                        <div className="mt-1 text-lg font-semibold text-white">{entry.title}</div>
                      </div>
                    </div>
                    <div
                      className={cn(
                        'rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em]',
                        entry.status === 'verified'
                          ? 'bg-emerald-500/15 text-emerald-300'
                          : entry.status === 'failed'
                            ? 'bg-rose-500/15 text-rose-300'
                            : 'bg-amber-500/15 text-amber-300',
                      )}
                    >
                      {formatAiLogStatus(entry.status, inv)}
                    </div>
                  </div>

                  <p className="mt-3 text-sm leading-6 text-slate-400">{entry.summary}</p>

                  <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                    <span>
                      {entry.txDigest
                        ? `${inv.digestPrefix} ${entry.txDigest.slice(0, 12)}`
                        : inv.digestPending}
                    </span>
                    <span>{inv.aiPilotTrace}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3 text-sm">
          <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-slate-300">
            {inv.basketIdLabel}: {SUI_FUND_CONFIG.basketId || inv.notConfigured}
          </div>
          <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-slate-300">
            {inv.packageIdLabel}: {SUI_FUND_CONFIG.packageId || inv.notConfigured}
          </div>
          {error ? (
            <div className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-amber-200">
              {inv.rpcNoticePrefix}: {error}
            </div>
          ) : null}
          {isLoading ? (
            <div className="rounded-full border border-teal-500/22 bg-teal-500/10 px-3 py-1.5 text-teal-200/90">
              {inv.refreshingSui}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
