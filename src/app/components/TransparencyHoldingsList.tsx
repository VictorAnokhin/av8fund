import React from 'react';
import { ExternalLink, Info } from 'lucide-react';

import type { TransparencyHolding } from '../lib/api';
import { ImageWithFallback } from './figma/ImageWithFallback';

type TransparencyHoldingsListProps = {
  holdings: TransparencyHolding[];
  portfolioShareLabel: string;
  tokenLabel: string;
  defiLabel: string;
  className?: string;
  onShowGmxDetails?: (asset: TransparencyHolding) => void;
  onShowAaveDetails?: (asset: TransparencyHolding) => void;
  onShowMorphoDetails?: (asset: TransparencyHolding) => void;
};

export function TransparencyHoldingsList({
  holdings,
  portfolioShareLabel,
  tokenLabel,
  defiLabel,
  className = 'space-y-2',
  onShowGmxDetails,
  onShowAaveDetails,
  onShowMorphoDetails,
}: TransparencyHoldingsListProps) {
  return (
    <div className={className}>
      {holdings.map((asset) => (
        <HoldingRow
          key={`${asset.type}:${asset.id}`}
          asset={asset}
          portfolioShareLabel={portfolioShareLabel}
          tokenLabel={tokenLabel}
          defiLabel={defiLabel}
          onShowGmxDetails={onShowGmxDetails}
          onShowAaveDetails={onShowAaveDetails}
          onShowMorphoDetails={onShowMorphoDetails}
        />
      ))}
    </div>
  );
}

function HoldingRow({
  asset,
  portfolioShareLabel,
  tokenLabel,
  defiLabel,
  onShowGmxDetails,
  onShowAaveDetails,
  onShowMorphoDetails,
}: {
  asset: TransparencyHolding;
  portfolioShareLabel: string;
  tokenLabel: string;
  defiLabel: string;
  onShowGmxDetails?: (asset: TransparencyHolding) => void;
  onShowAaveDetails?: (asset: TransparencyHolding) => void;
  onShowMorphoDetails?: (asset: TransparencyHolding) => void;
}) {
  const amountLabel = asset.type === 'token'
    ? formatTokenAmount(asset.amount, asset.symbol)
    : formatUsd(asset.usd_value);
  const chainLabel = typeof asset.chain === 'string' && asset.chain !== ''
    ? asset.chain.toUpperCase()
    : 'N/A';
  const metaLabel = asset.type === 'token'
    ? `${tokenLabel} • ${chainLabel}`
    : `${defiLabel} • ${chainLabel}`;
  const canShowGmxDetails = typeof onShowGmxDetails === 'function' && isGmxHolding(asset);
  const canShowAaveDetails = typeof onShowAaveDetails === 'function' && isAaveHolding(asset);
  const canShowMorphoDetails = typeof onShowMorphoDetails === 'function' && isMorphoHolding(asset);

  return (
    <div className="group flex items-center justify-between gap-1.5 rounded-xl border border-white/[0.08] bg-[rgba(4,8,16,0.52)] px-1.5 py-1.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] backdrop-blur-sm transition-[border-color,box-shadow,background-color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-teal-400/22 hover:bg-[rgba(6,12,22,0.68)] hover:shadow-[0_0_32px_-14px_rgba(45,212,191,0.18)] sm:gap-4 sm:rounded-[1.25rem] sm:p-3">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        {asset.logo_url ? (
          <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-white/5 ring-1 ring-white/10 sm:h-10 sm:w-10">
            <ImageWithFallback src={asset.logo_url} alt={asset.name} className="h-full w-full object-cover" />
          </div>
        ) : (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/5 text-[10px] font-semibold text-slate-300 ring-1 ring-white/10 sm:h-10 sm:w-10 sm:text-xs">
            {asset.type === 'token' ? tokenLabel.slice(0, 1) : 'D'}
          </div>
        )}

        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-white sm:text-base">{asset.name}</div>
          <div className="truncate text-[11px] text-slate-400 sm:text-sm">
            {metaLabel} • {(asset.share ?? 0).toFixed(1)}% {portfolioShareLabel}
          </div>
        </div>
      </div>

      <div className="flex min-w-0 items-center gap-2 sm:gap-4">
        <span className="min-w-0 text-right font-mono text-xs text-slate-300 sm:text-base">
          <span className="block">{formatUsd(asset.usd_value)}</span>
          <span className="block truncate text-[10px] text-slate-500 sm:text-xs">{amountLabel}</span>
        </span>
        {canShowGmxDetails || canShowAaveDetails || canShowMorphoDetails ? (
          <button
            type="button"
            onClick={() => {
              if (canShowGmxDetails) {
                onShowGmxDetails?.(asset);
                return;
              }

              if (canShowAaveDetails) {
                onShowAaveDetails?.(asset);
                return;
              }

              onShowMorphoDetails?.(asset);
            }}
            className="rounded-full border border-teal-400/28 bg-teal-400/10 p-1 text-teal-100/90 transition-[border-color,background-color,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-teal-300/45 hover:bg-teal-400/18"
            aria-label={`${canShowGmxDetails ? 'GMX' : canShowAaveDetails ? 'Aave' : 'Morpho'} details`}
          >
            <Info className="h-4 w-4" />
          </button>
        ) : null}
        {asset.link ? (
          <a
            href={asset.link}
            target="_blank"
            rel="noreferrer"
            className="text-teal-300/90 opacity-0 transition-[opacity,color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:opacity-100 hover:text-teal-200"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        ) : null}
      </div>
    </div>
  );
}

function isGmxHolding(asset: TransparencyHolding): boolean {
  const haystack = [
    asset.name,
    asset.symbol,
    asset.protocol_key,
    asset.protocol_name,
  ].join(' ').toLowerCase();

  return asset.type === 'defi'
    && (
      haystack.includes('gmx')
      || haystack.includes('gm ')
      || haystack.includes('glv')
      || haystack.includes('gm[')
      || haystack.includes('gmx market')
    );
}

function isAaveHolding(asset: TransparencyHolding): boolean {
  const haystack = [
    asset.name,
    asset.symbol,
    asset.protocol_key,
    asset.protocol_name,
  ].join(' ').toLowerCase();

  return asset.type === 'defi' && haystack.includes('aave');
}

function isMorphoHolding(asset: TransparencyHolding): boolean {
  const haystack = [
    asset.name,
    asset.symbol,
    asset.protocol_key,
    asset.protocol_name,
  ].join(' ').toLowerCase();

  return asset.type === 'defi' && haystack.includes('morpho');
}

function formatUsd(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value);
}

function formatTokenAmount(amount?: number | null, symbol?: string | null): string {
  if (amount === null || amount === undefined) {
    return symbol || '';
  }

  const formattedAmount = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: amount >= 1000 ? 0 : amount >= 1 ? 4 : 6,
  }).format(amount);

  return symbol ? `${formattedAmount} ${symbol}` : formattedAmount;
}
