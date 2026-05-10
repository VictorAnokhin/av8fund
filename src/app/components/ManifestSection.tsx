import React from 'react';

import { useSuiFundDashboard } from '../hooks/useSuiFundDashboard';
import { useI18n } from '../i18n';
import type { FundAsset } from '../lib/suiFund';
import { cn } from '../utils';

type ManifestRow = {
  category: string;
  role: string;
  accentClassName: string;
  assets: FundAsset[];
};

function formatWeight(bps: number): string {
  return `${(bps / 100).toFixed(1)}%`;
}

function manifestCategory(asset: FundAsset, messages: ReturnType<typeof useI18n>['messages']): ManifestRow {
  if (asset.type === 'stable') {
    return {
      category: messages.portfolio.manifest.liquidYield,
      role: messages.portfolio.manifest.liquidYieldRole,
      accentClassName: 'text-sky-300',
      assets: [asset],
    };
  }

  if (asset.type === 'crypto') {
    return {
      category: messages.portfolio.manifest.cryptoBase,
      role: messages.portfolio.manifest.cryptoBaseRole,
      accentClassName: 'text-cyan-300',
      assets: [asset],
    };
  }

  if (asset.symbol.includes('BOND') || asset.name.toLowerCase().includes('treasury')) {
    return {
      category: messages.portfolio.manifest.fixedIncome,
      role: messages.portfolio.manifest.fixedIncomeRole,
      accentClassName: 'text-amber-300',
      assets: [asset],
    };
  }

  return {
    category: messages.portfolio.manifest.equity,
    role: messages.portfolio.manifest.equityRole,
    accentClassName: 'text-emerald-300',
    assets: [asset],
  };
}

function groupManifestRows(assets: FundAsset[], messages: ReturnType<typeof useI18n>['messages']): ManifestRow[] {
  const grouped = new Map<string, ManifestRow>();

  assets.forEach((asset) => {
    const row = manifestCategory(asset, messages);
    const existing = grouped.get(row.category);

    if (existing) {
      existing.assets.push(asset);
      return;
    }

    grouped.set(row.category, row);
  });

  return Array.from(grouped.values());
}

export function ManifestSection() {
  const { messages } = useI18n();
  const { snapshot } = useSuiFundDashboard();
  const manifestRows = groupManifestRows(snapshot.assets, messages);

  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-2xl">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <div className="text-sm uppercase tracking-[0.18em] text-slate-400">{messages.portfolio.manifestTitle}</div>
          <div className="mt-2 text-2xl font-semibold text-white">{messages.portfolio.manifestSubtitle}</div>
        </div>
        <div className="rounded-full bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.14em] text-slate-300">
          {snapshot.assets.length} {messages.portfolio.sleeves}
        </div>
      </div>

      <div className="overflow-hidden rounded-[1.5rem] border border-white/10">
        <table className="w-full border-collapse text-left">
          <thead className="bg-slate-950/80 text-xs uppercase tracking-[0.16em] text-slate-400">
            <tr>
              <th className="px-4 py-4 font-medium">{messages.portfolio.category}</th>
              <th className="px-4 py-4 font-medium">{messages.portfolio.asset}</th>
              <th className="px-4 py-4 font-medium text-right">{messages.portfolio.share}</th>
              <th className="px-4 py-4 font-medium">{messages.portfolio.role}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/6 bg-slate-950/45">
            {manifestRows.map((row) => {
              const totalBps = row.assets.reduce((sum, asset) => sum + asset.actualWeightBps, 0);
              const assetLabel = row.assets.map((asset) => asset.symbol).join(' / ');

              return (
                <tr key={row.category} className="align-top text-sm text-slate-300">
                  <td className={cn('px-4 py-4 font-semibold', row.accentClassName)}>{row.category}</td>
                  <td className="px-4 py-4">
                    <div className="font-medium text-white">{assetLabel}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {row.assets.map((asset) => asset.name).join(' • ')}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right font-semibold text-white">{formatWeight(totalBps)}</td>
                  <td className="px-4 py-4 text-slate-400">{row.role}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
