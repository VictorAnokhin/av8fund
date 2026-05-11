import React from 'react';
import { useSuiClient } from '@mysten/dapp-kit';
import { Activity, ArrowDownLeft, ArrowUpRight, Coins, Database, RefreshCw, Users } from 'lucide-react';

import { SUI_FUND_CONFIG } from '../lib/suiFund';
import { getBasePath } from '../lib/routes';
import { useI18n, type Language } from '../i18n';
import { PageBreadcrumbsBar, PageHeroBadge, PageHeroShell } from './PageChrome';

const AV8_DECIMALS = 9n;
const EVENT_LIMIT = 50;

type FundAccountRow = {
  address: string;
  depositedSui: bigint;
  withdrawnSui: bigint;
  mintedAv8: bigint;
  burnedAv8: bigint;
  deposits: number;
  withdrawals: number;
};

type FundOperation = {
  id: string;
  type: 'deposit' | 'withdraw';
  address: string;
  amountSui: bigint;
  shares: bigint;
  assetType: string;
  digest: string;
  timestampMs: number | null;
};

type FundAccountState = {
  basket: {
    id: string;
    paused: boolean;
    creator: string;
    totalShares: bigint;
    navSui: bigint;
    liquidSui: bigint;
    lastRebalanceMs: bigint;
  };
  share: {
    id: string;
    maxSupply: bigint;
    totalMinted: bigint;
    totalBurned: bigint;
    totalSupply: bigint;
    redeemBurnBps: number;
    paused: boolean;
  };
  accounts: FundAccountRow[];
  operations: FundOperation[];
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function fieldBag(objectData: unknown): Record<string, unknown> {
  const content = asRecord(asRecord(objectData).content);
  return asRecord(content.fields);
}

function readString(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'bigint' || typeof value === 'boolean') {
    return String(value);
  }
  return '';
}

function readBigInt(value: unknown): bigint {
  const serialized = readString(value);
  return /^\d+$/.test(serialized) ? BigInt(serialized) : 0n;
}

function readBalanceValue(value: unknown): bigint {
  const direct = readBigInt(value);
  if (direct > 0n) {
    return direct;
  }
  const fields = asRecord(asRecord(value).fields);
  return readBigInt(fields.value);
}

function shortAddress(value: string, notSet: string): string {
  return value.length > 18 ? `${value.slice(0, 8)}...${value.slice(-6)}` : value || notSet;
}

function formatTimestamp(ms: number | null, localeTag: string, pending: string): string {
  if (!ms) {
    return pending;
  }
  return new Intl.DateTimeFormat(localeTag, {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(ms));
}

function localeTagForLanguage(lang: Language): string {
  if (lang === 'ua') {
    return 'uk-UA';
  }
  if (lang === 'ru') {
    return 'ru-RU';
  }
  return 'en-US';
}

function formatUnits(value: bigint, decimals: bigint, maxFraction = 4): string {
  const divisor = 10n ** decimals;
  const whole = value / divisor;
  const fraction = value % divisor;
  if (fraction === 0n || maxFraction <= 0) {
    return whole.toLocaleString('en-US');
  }
  const padded = fraction.toString().padStart(Number(decimals), '0').slice(0, maxFraction);
  const trimmed = padded.replace(/0+$/, '');
  return trimmed ? `${whole.toLocaleString('en-US')}.${trimmed}` : whole.toLocaleString('en-US');
}

function formatSui(value: bigint): string {
  return `${formatUnits(value, 9n, 6)} SUI`;
}

function formatAv8(value: bigint): string {
  return `${formatUnits(value, AV8_DECIMALS, 6)} AV8`;
}

function eventFields(parsedJson: unknown): Record<string, unknown> {
  return asRecord(parsedJson);
}

function accountRowsFromOperations(operations: FundOperation[]): FundAccountRow[] {
  const rows = new Map<string, FundAccountRow>();

  for (const operation of operations) {
    const key = operation.address.toLowerCase();
    const current = rows.get(key) ?? {
      address: operation.address,
      depositedSui: 0n,
      withdrawnSui: 0n,
      mintedAv8: 0n,
      burnedAv8: 0n,
      deposits: 0,
      withdrawals: 0,
    };

    if (operation.type === 'deposit') {
      current.depositedSui += operation.amountSui;
      current.mintedAv8 += operation.shares;
      current.deposits += 1;
    } else {
      current.withdrawnSui += operation.amountSui;
      current.burnedAv8 += operation.shares;
      current.withdrawals += 1;
    }

    rows.set(key, current);
  }

  return [...rows.values()].sort((a, b) => {
    const left = a.mintedAv8 - a.burnedAv8;
    const right = b.mintedAv8 - b.burnedAv8;
    return right > left ? 1 : right < left ? -1 : 0;
  });
}

function StatCard({
  label,
  value,
  note,
  icon,
}: {
  label: string;
  value: string;
  note: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-[1.5rem] border border-white/[0.08] bg-white/[0.04] p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] backdrop-blur-xl">
      <div className="flex items-center justify-between gap-4">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-teal-100">
          {icon}
        </div>
      </div>
      <div className="mt-4 text-2xl font-semibold text-white">{value}</div>
      <div className="mt-2 text-sm leading-6 text-slate-500">{note}</div>
    </div>
  );
}

export function FundAccountsPage() {
  const client = useSuiClient();
  const { language, messages } = useI18n();
  const t = messages.fundAccounts;
  const homeHref = getBasePath();
  const dateLocale = localeTagForLanguage(language);
  const [state, setState] = React.useState<FundAccountState | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    if (!SUI_FUND_CONFIG.basketId || !SUI_FUND_CONFIG.shareConfigId || !SUI_FUND_CONFIG.packageId) {
      setError(t.errorNotConfigured);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [basketObject, shareObject, depositEvents, withdrawEvents] = await Promise.all([
        client.getObject({ id: SUI_FUND_CONFIG.basketId, options: { showContent: true } }),
        client.getObject({ id: SUI_FUND_CONFIG.shareConfigId, options: { showContent: true } }),
        client.queryEvents({
          query: { MoveEventType: `${SUI_FUND_CONFIG.packageId}::events::DepositEvent` },
          order: 'descending',
          limit: EVENT_LIMIT,
        }),
        client.queryEvents({
          query: { MoveEventType: `${SUI_FUND_CONFIG.packageId}::events::WithdrawEvent` },
          order: 'descending',
          limit: EVENT_LIMIT,
        }),
      ]);

      const basketFields = fieldBag(basketObject.data);
      const shareFields = fieldBag(shareObject.data);
      const treasuryCapFields = asRecord(asRecord(shareFields.treasury_cap).fields);
      const totalSupplyFields = asRecord(asRecord(treasuryCapFields.total_supply).fields);

      const operations: FundOperation[] = [
        ...depositEvents.data.map((event): FundOperation => {
          const fields = eventFields(event.parsedJson);
          return {
            id: `${event.id.txDigest}:${event.id.eventSeq}`,
            type: 'deposit',
            address: readString(fields.sender),
            amountSui: readBigInt(fields.amount),
            shares: readBigInt(fields.shares_issued),
            assetType: readString(fields.asset_type),
            digest: event.id.txDigest,
            timestampMs: event.timestampMs ? Number(event.timestampMs) : null,
          };
        }),
        ...withdrawEvents.data.map((event): FundOperation => {
          const fields = eventFields(event.parsedJson);
          return {
            id: `${event.id.txDigest}:${event.id.eventSeq}`,
            type: 'withdraw',
            address: readString(fields.sender),
            amountSui: readBigInt(fields.amount),
            shares: readBigInt(fields.shares_burned),
            assetType: readString(fields.asset_type),
            digest: event.id.txDigest,
            timestampMs: event.timestampMs ? Number(event.timestampMs) : null,
          };
        }),
      ].sort((a, b) => (b.timestampMs ?? 0) - (a.timestampMs ?? 0));

      setState({
        basket: {
          id: SUI_FUND_CONFIG.basketId,
          paused: Boolean(basketFields.paused),
          creator: readString(basketFields.creator),
          totalShares: readBigInt(basketFields.total_shares),
          navSui: readBigInt(basketFields.nav_sui),
          liquidSui: readBalanceValue(basketFields.sui_vault),
          lastRebalanceMs: readBigInt(basketFields.last_rebalance_ts_ms),
        },
        share: {
          id: SUI_FUND_CONFIG.shareConfigId,
          maxSupply: readBigInt(shareFields.max_supply),
          totalMinted: readBigInt(shareFields.total_minted),
          totalBurned: readBigInt(shareFields.total_burned),
          totalSupply: readBigInt(totalSupplyFields.value),
          redeemBurnBps: Number(readBigInt(shareFields.redeem_burn_bps)),
          paused: Boolean(shareFields.paused),
        },
        accounts: accountRowsFromOperations(operations),
        operations,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [client, t]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const circulatingAv8 = state ? state.share.totalMinted - state.share.totalBurned : 0n;
  const netInvestorSui = state
    ? state.accounts.reduce((sum, row) => sum + row.depositedSui - row.withdrawnSui, 0n)
    : 0n;

  return (
    <main className="relative min-h-[calc(100vh-160px)] pb-14 pt-14">
      <PageBreadcrumbsBar
        items={[
          { label: messages.breadcrumbs.home, href: homeHref },
          { label: t.breadcrumb },
        ]}
      />
      <PageHeroShell
        badge={<PageHeroBadge label={t.heroBadge} icon={<Database className="h-3.5 w-3.5" />} variant="sky" />}
        title={t.title}
        subtitle={t.subtitle}
        belowIntro={
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.5rem] border border-white/[0.08] bg-white/[0.035] p-4 backdrop-blur-xl">
              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{t.contracts}</div>
                <div className="mt-1 break-all font-mono text-xs text-slate-400">
                  {t.basketShareLine
                    .replace('{basket}', shortAddress(SUI_FUND_CONFIG.basketId, t.notAvailableShort))
                    .replace('{share}', shortAddress(SUI_FUND_CONFIG.shareConfigId, t.notAvailableShort))}
                </div>
              </div>
              <button
                type="button"
                onClick={() => void load()}
                disabled={loading}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/[0.09] bg-white/[0.04] px-4 text-sm font-semibold text-slate-200 transition hover:border-teal-300/25 hover:bg-white/[0.07] disabled:opacity-60"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                {t.refresh}
              </button>
            </div>

            {error ? (
              <div className="rounded-[1.25rem] border border-rose-300/15 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                {error}
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label={t.statLiquidSui}
                value={state ? formatSui(state.basket.liquidSui) : loading ? t.loading : t.zeroSui}
                note={t.statLiquidNote}
                icon={<Coins className="h-5 w-5" />}
              />
              <StatCard
                label={t.statNav}
                value={state ? formatSui(state.basket.navSui) : loading ? t.loading : t.zeroSui}
                note={t.statNavNote}
                icon={<Activity className="h-5 w-5" />}
              />
              <StatCard
                label={t.statAv8Circulating}
                value={state ? formatAv8(circulatingAv8) : loading ? t.loading : t.zeroAv8}
                note={t.statAv8Note}
                icon={<Users className="h-5 w-5" />}
              />
              <StatCard
                label={t.statNetInvestor}
                value={state ? formatSui(netInvestorSui) : loading ? t.loading : t.zeroSui}
                note={t.statNetInvestorNote}
                icon={<Database className="h-5 w-5" />}
              />
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
              <section className="rounded-[2rem] border border-white/[0.08] bg-white/[0.035] p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] backdrop-blur-xl">
                <div className="flex flex-col gap-2 border-b border-white/[0.07] pb-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <div className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-200">{t.investorLedger}</div>
                    <div className="mt-1 text-sm text-slate-500">{t.ledgerSubtitle}</div>
                  </div>
                  <div className="text-xs text-slate-500">{t.addressesCount.replace('{count}', String(state?.accounts.length ?? 0))}</div>
                </div>
                <div className="mt-5 overflow-x-auto">
                  <table className="w-full min-w-[860px] text-left text-sm">
                    <thead className="text-xs uppercase tracking-[0.16em] text-slate-500">
                      <tr className="border-b border-white/[0.07]">
                        <th className="px-3 py-3 font-semibold">{t.colInvestor}</th>
                        <th className="px-3 py-3 font-semibold">{t.colDeposited}</th>
                        <th className="px-3 py-3 font-semibold">{t.colWithdrawn}</th>
                        <th className="px-3 py-3 font-semibold">{t.colAv8Minted}</th>
                        <th className="px-3 py-3 font-semibold">{t.colAv8Burned}</th>
                        <th className="px-3 py-3 font-semibold">{t.colNetAv8}</th>
                        <th className="px-3 py-3 font-semibold">{t.colOps}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {!state || state.accounts.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-3 py-8 text-center text-slate-500">
                            {loading ? t.loadingInvestorEvents : t.noDepositWithdrawYet}
                          </td>
                        </tr>
                      ) : (
                        state.accounts.map((row) => {
                          const netAv8 = row.mintedAv8 - row.burnedAv8;
                          return (
                            <tr key={row.address} className="border-b border-white/[0.05] text-slate-300">
                              <td className="px-3 py-4">
                                <div className="font-mono text-xs text-slate-200">{shortAddress(row.address, t.notAvailableShort)}</div>
                                <div className="mt-1 max-w-[220px] truncate font-mono text-[11px] text-slate-600" title={row.address}>
                                  {row.address}
                                </div>
                              </td>
                              <td className="px-3 py-4 font-mono text-xs">{formatSui(row.depositedSui)}</td>
                              <td className="px-3 py-4 font-mono text-xs">{formatSui(row.withdrawnSui)}</td>
                              <td className="px-3 py-4 font-mono text-xs">{formatAv8(row.mintedAv8)}</td>
                              <td className="px-3 py-4 font-mono text-xs">{formatAv8(row.burnedAv8)}</td>
                              <td className="px-3 py-4 font-mono text-xs text-white">{formatAv8(netAv8)}</td>
                              <td className="px-3 py-4 text-xs text-slate-500">
                                {t.opsInOut.replace('{deposits}', String(row.deposits)).replace('{withdrawals}', String(row.withdrawals))}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              <aside className="space-y-6">
                <section className="rounded-[2rem] border border-white/[0.08] bg-white/[0.035] p-5 backdrop-blur-xl">
                  <div className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-200">{t.fundState}</div>
                  <div className="mt-4 space-y-3 text-sm">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-slate-500">{t.labelBasket}</span>
                      <span className={state?.basket.paused ? 'text-amber-200' : 'text-emerald-200'}>{state?.basket.paused ? t.paused : t.live}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-slate-500">{t.labelAv8MintRedeem}</span>
                      <span className={state?.share.paused ? 'text-amber-200' : 'text-emerald-200'}>{state?.share.paused ? t.paused : t.live}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-slate-500">{t.labelRedeemBurn}</span>
                      <span className="font-mono text-slate-200">{state ? `${(state.share.redeemBurnBps / 100).toFixed(2)}%` : t.notAvailableShort}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-slate-500">{t.labelMaxAv8}</span>
                      <span className="font-mono text-slate-200">{state ? formatAv8(state.share.maxSupply) : t.notAvailableShort}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-slate-500">{t.labelTreasurySupply}</span>
                      <span className="font-mono text-slate-200">{state ? formatAv8(state.share.totalSupply) : t.notAvailableShort}</span>
                    </div>
                  </div>
                </section>

                <section className="rounded-[2rem] border border-white/[0.08] bg-white/[0.035] p-5 backdrop-blur-xl">
                  <div className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-200">{t.recentOperations}</div>
                  <div className="mt-4 space-y-3">
                    {!state || state.operations.length === 0 ? (
                      <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-4 text-sm text-slate-500">
                        {loading ? t.loadingEvents : t.noEventsYet}
                      </div>
                    ) : (
                      state.operations.slice(0, 12).map((operation) => (
                        <div key={operation.id} className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 text-sm font-semibold text-white">
                              {operation.type === 'deposit' ? (
                                <ArrowDownLeft className="h-4 w-4 text-emerald-200" />
                              ) : (
                                <ArrowUpRight className="h-4 w-4 text-amber-200" />
                              )}
                              {operation.type === 'deposit' ? t.deposit : t.withdraw}
                            </div>
                            <div className="text-xs text-slate-500">{formatTimestamp(operation.timestampMs, dateLocale, t.pendingTimestamp)}</div>
                          </div>
                          <div className="mt-2 font-mono text-xs text-slate-300">{shortAddress(operation.address, t.notAvailableShort)}</div>
                          <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-500">
                            <div>{formatSui(operation.amountSui)}</div>
                            <div>{operation.type === 'deposit' ? formatAv8(operation.shares) : `${formatAv8(operation.shares)} ${t.burnedSuffix}`}</div>
                          </div>
                          <div className="mt-2 truncate font-mono text-[11px] text-slate-600" title={operation.digest}>
                            {operation.digest}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>
              </aside>
            </div>
          </div>
        }
      />
    </main>
  );
}
