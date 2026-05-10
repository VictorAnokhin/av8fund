import React from 'react';
import { ShieldCheck, TrendingUp, Wallet } from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { useSuiFundDashboard } from '../hooks/useSuiFundDashboard';
import { useI18n } from '../i18n';
import type { FundAsset } from '../lib/suiFund';
import { cn } from '../utils';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function formatWeight(bps: number): string {
  return `${(bps / 100).toFixed(1)}%`;
}

function annualizedApy(monthlyChangePct: number): number {
  const monthly = monthlyChangePct / 100;
  return (Math.pow(1 + monthly, 12) - 1) * 100;
}

function getHealthStatus(deltaBps: number, messages: ReturnType<typeof useI18n>['messages']): string {
  if (deltaBps <= 40) {
    return messages.portfolio.healthStatus.stable;
  }

  if (deltaBps <= 120) {
    return messages.portfolio.healthStatus.monitoring;
  }

  return messages.portfolio.healthStatus.rebalancing;
}

function getHealthTone(deltaBps: number): string {
  if (deltaBps <= 40) {
    return 'text-emerald-300';
  }

  if (deltaBps <= 120) {
    return 'text-amber-300';
  }

  return 'text-sky-300';
}

export function HorizonLineSection() {
  const { messages } = useI18n();
  const { snapshot, isUsingFallbackData } = useSuiFundDashboard();

  const chartData = snapshot.performance.map((point, index) => ({
    ...point,
    horizon: index === 0 ? point.navUsd : snapshot.performance[index - 1]?.navUsd ?? point.navUsd,
  }));

  const driftBps = Math.max(
    ...snapshot.assets.map((asset: FundAsset) => Math.abs(asset.actualWeightBps - asset.targetWeightBps)),
    0,
  );
  const healthStatus = getHealthStatus(driftBps, messages);
  const inferredApy = annualizedApy(snapshot.monthlyChangePct);

  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-5 shadow-[0_25px_90px_rgba(0,0,0,0.28)] backdrop-blur-2xl">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <div className="text-sm uppercase tracking-[0.18em] text-slate-400">{messages.portfolio.badge}</div>
          <div className="mt-2 text-2xl font-semibold text-white">{messages.portfolio.sectionTitle}</div>
        </div>
        <div className="rounded-full border border-sky-400/15 bg-sky-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-sky-200">
          {isUsingFallbackData ? messages.portfolio.sectionBadgeScenario : messages.portfolio.sectionBadgeLive}
        </div>
      </div>

      <div className="mb-5 grid gap-3 md:grid-cols-3">
        <div className="rounded-3xl border border-white/10 bg-slate-950/55 p-4">
          <div className="mb-3 flex items-center gap-3 text-slate-300">
            <div className="rounded-2xl bg-emerald-500/15 p-3 text-emerald-300">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <span className="text-sm uppercase tracking-[0.14em] text-slate-400">{messages.portfolio.health}</span>
          </div>
          <div className={cn('text-3xl font-semibold', getHealthTone(driftBps))}>{healthStatus}</div>
          <div className="mt-2 text-sm text-slate-400">{messages.portfolio.maxDrift}: {formatWeight(driftBps)}</div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-950/55 p-4">
          <div className="mb-3 flex items-center gap-3 text-slate-300">
            <div className="rounded-2xl bg-amber-500/15 p-3 text-amber-300">
              <TrendingUp className="h-5 w-5" />
            </div>
            <span className="text-sm uppercase tracking-[0.14em] text-slate-400">{messages.portfolio.altitude}</span>
          </div>
          <div className="text-3xl font-semibold text-white">{formatPercent(inferredApy)}</div>
          <div className="mt-2 text-sm text-slate-400">{messages.portfolio.annualizedClimb}</div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-950/55 p-4">
          <div className="mb-3 flex items-center gap-3 text-slate-300">
            <div className="rounded-2xl bg-sky-500/15 p-3 text-sky-300">
              <Wallet className="h-5 w-5" />
            </div>
            <span className="text-sm uppercase tracking-[0.14em] text-slate-400">{messages.portfolio.fuelHeld}</span>
          </div>
          <div className="text-3xl font-semibold text-white">{formatCurrency(snapshot.availableUsdcUsd)}</div>
          <div className="mt-2 text-sm text-slate-400">{messages.portfolio.fuelHeldDescription}</div>
        </div>
      </div>

      <div className="h-[290px] rounded-[1.75rem] border border-white/8 bg-[linear-gradient(180deg,rgba(15,23,42,0.86)_0%,rgba(3,7,18,0.96)_100%)] p-3">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="portfolioNavGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.45} />
                <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="portfolioHorizonGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.18} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
            <XAxis dataKey="label" stroke="#64748b" tickLine={false} axisLine={false} />
            <YAxis
              stroke="#64748b"
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `$${Math.round(value / 1000)}k`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#08111f',
                borderColor: 'rgba(148,163,184,0.15)',
                borderRadius: '18px',
                color: '#e2e8f0',
              }}
              formatter={(value: number) => formatCurrency(value)}
            />
            <Area type="monotone" dataKey="horizon" stroke="#f59e0b" strokeWidth={1.5} fill="url(#portfolioHorizonGradient)" />
            <Area type="monotone" dataKey="navUsd" stroke="#38bdf8" strokeWidth={3} fill="url(#portfolioNavGradient)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
