import React from 'react';
import { ConnectButton, useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowLeft, ArrowRight, ArrowRightLeft, BadgeDollarSign, CircleDollarSign, Plus, RefreshCw, Wallet } from 'lucide-react';

import { SUI_NETWORK } from '../config';
import { getFundPoolEvents, getFundPools, type FundPoolChartPoint, type FundPoolEventRecord, type FundPoolRecord } from '../lib/api';
import { getBasePath } from '../lib/routes';
import { SUI_FUND_CONFIG } from '../lib/suiFund';
import { useI18n } from '../i18n';
import { PageBreadcrumbsBar, PageHeroBadge, PageHeroShell } from './PageChrome';

type InvestPageProps = {
  poolObjectId?: string;
};

type CoinLike = {
  coinObjectId: string;
  balance: string;
};

type LivePool = FundPoolRecord & {
  liveBalance: bigint | null;
  liveShares: bigint | null;
};

const CLOCK_OBJECT_ID = '0x6';
const FUND_POSITION_TYPE = `${SUI_FUND_CONFIG.packageId}::fund_core::FundPosition`;
const AV8_DECIMALS = 6;

const inputClass =
  'h-11 w-full rounded-xl border border-white/[0.09] bg-white/[0.04] px-3 text-sm text-slate-100 outline-none transition focus:border-teal-300/40 focus:bg-white/[0.07]';

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function readBigInt(value: unknown): bigint {
  if (typeof value === 'bigint') {
    return value;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return BigInt(Math.trunc(value));
  }
  if (typeof value === 'string' && /^\d+$/.test(value)) {
    return BigInt(value);
  }
  const fields = asRecord(value).fields;
  if (fields) {
    return readBigInt(asRecord(fields).value);
  }
  return 0n;
}

function shortId(value: string): string {
  return value.length > 18 ? `${value.slice(0, 10)}...${value.slice(-6)}` : value;
}

function formatBps(value: number): string {
  return `${(Number(value || 0) / 100).toFixed(2)}%`;
}

function parseDecimalAmount(value: string, decimals: number): bigint | null {
  const normalized = value.trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    return null;
  }
  const [whole, fraction = ''] = normalized.split('.');
  if (fraction.length > decimals) {
    return null;
  }
  return BigInt(whole || '0') * 10n ** BigInt(decimals) + BigInt((fraction.padEnd(decimals, '0') || '0'));
}

function formatUnits(value: bigint, decimals: number, maxFraction = 2): string {
  const sign = value < 0n ? '-' : '';
  const abs = value < 0n ? -value : value;
  const base = 10n ** BigInt(decimals);
  const whole = abs / base;
  const fraction = abs % base;
  if (maxFraction <= 0) {
    return `${sign}${whole.toString()}`;
  }
  const fractionText = fraction.toString().padStart(decimals, '0').slice(0, maxFraction).replace(/0+$/, '');
  return `${sign}${whole.toString()}${fractionText ? `.${fractionText}` : ''}`;
}

function getInvestRoot(): string {
  const root = getBasePath();
  return root === '/' ? '/invest' : `${root.replace(/\/+$/, '')}/invest`;
}

function getPoolHref(pool: FundPoolRecord): string {
  return `${getInvestRoot()}/${encodeURIComponent(pool.pool_object_id || String(pool.id))}`;
}

function buildPoolChartData(pool: LivePool) {
  const liveTvl = Number(pool.liveBalance || 0n) / 1_000_000;
  const fallbackTvl = Math.max(10_000, Number(pool.min_deposit_usdc || 0) / 1_000_000 * 20);
  const baseTvl = liveTvl || fallbackTvl;
  const monthlyRate = (Number(pool.realized_apy_bps || pool.target_apy_bps || 0) / 10_000) / 12;
  const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return labels.map((label, index) => ({
    label,
    tvl: Math.round(baseTvl * (0.72 + index * 0.028)),
    sharePrice: Number((1 + monthlyRate * index).toFixed(4)),
  }));
}

function chartPointToUsd(point: FundPoolChartPoint): number {
  return Number(BigInt(/^\d+$/.test(point.tvl_usdc || '') ? point.tvl_usdc : '0')) / 1_000_000;
}

async function fetchAllCoins(client: ReturnType<typeof useSuiClient>, owner: string, coinType: string): Promise<CoinLike[]> {
  const coins: CoinLike[] = [];
  let cursor: string | null | undefined = null;

  do {
    const page = await client.getCoins({ owner, coinType, cursor, limit: 50 });
    coins.push(...page.data.map((coin) => ({ coinObjectId: coin.coinObjectId, balance: coin.balance })));
    cursor = page.hasNextPage ? page.nextCursor : null;
  } while (cursor);

  return coins;
}

function buildCoinPayments(tx: Transaction, coins: CoinLike[], amounts: bigint[]) {
  const primaryCoin = tx.object(coins[0].coinObjectId);
  if (coins.length > 1) {
    tx.mergeCoins(primaryCoin, coins.slice(1).map((coin) => tx.object(coin.coinObjectId)));
  }
  return tx.splitCoins(primaryCoin, amounts.map((amount) => tx.pure.u64(amount)));
}

async function findFundPosition(client: ReturnType<typeof useSuiClient>, owner: string): Promise<string> {
  let cursor: string | null | undefined = null;
  do {
    const page = await client.getOwnedObjects({
      owner,
      cursor,
      limit: 50,
      filter: { StructType: FUND_POSITION_TYPE },
      options: { showType: true },
    });
    const objectId = page.data[0]?.data?.objectId;
    if (objectId) {
      return objectId;
    }
    cursor = page.hasNextPage ? page.nextCursor : null;
  } while (cursor);
  return '';
}

function readPoolLiveFields(objectData: unknown): Pick<LivePool, 'liveBalance' | 'liveShares'> {
  const fields = asRecord(asRecord(asRecord(objectData).content).fields);
  return {
    liveBalance: fields.balance ? readBigInt(fields.balance) : null,
    liveShares: fields.total_pool_shares ? readBigInt(fields.total_pool_shares) : null,
  };
}

export function InvestPage({ poolObjectId }: InvestPageProps) {
  const { messages } = useI18n();
  const client = useSuiClient();
  const account = useCurrentAccount();
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const investRoot = getInvestRoot();

  const [pools, setPools] = React.useState<LivePool[]>([]);
  const [amount, setAmount] = React.useState('1000');
  const [balance, setBalance] = React.useState<bigint>(0n);
  const [positionId, setPositionId] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [lastDigest, setLastDigest] = React.useState<string | null>(null);
  const [poolEvents, setPoolEvents] = React.useState<FundPoolEventRecord[]>([]);
  const [poolChart, setPoolChart] = React.useState<FundPoolChartPoint[]>([]);

  const activePools = React.useMemo(() => pools.filter((pool) => pool.active), [pools]);
  const routePool = React.useMemo(() => {
    const normalized = String(poolObjectId || '').trim().toLowerCase();
    if (!normalized) {
      return null;
    }
    return activePools.find((pool) => pool.pool_object_id.toLowerCase() === normalized || String(pool.id) === normalized) ?? null;
  }, [activePools, poolObjectId]);
  const selectedPools = routePool ? [routePool] : [];
  const depositCoinType = routePool?.coin_type || SUI_FUND_CONFIG.usdcType || activePools[0]?.coin_type || '';
  const parsedAmount = parseDecimalAmount(amount, 6);
  const expectedAv8 = parsedAmount && parsedAmount > 0n ? parsedAmount : 0n;
  const poolChartData = React.useMemo(() => {
    if (poolChart.length > 0) {
      return poolChart.map((point) => ({
        label: point.label,
        tvl: chartPointToUsd(point),
        eventType: point.event_type,
      }));
    }

    return routePool ? buildPoolChartData(routePool) : [];
  }, [poolChart, routePool]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const records = await getFundPools({
        network: SUI_NETWORK,
        packageId: SUI_FUND_CONFIG.packageId,
        includeInactive: false,
      });
      const withLive = await Promise.all(records.map(async (pool): Promise<LivePool> => {
        if (!pool.pool_object_id) {
          return { ...pool, liveBalance: null, liveShares: null };
        }
        try {
          const object = await client.getObject({ id: pool.pool_object_id, options: { showContent: true } });
          return { ...pool, ...readPoolLiveFields(object.data) };
        } catch {
          return { ...pool, liveBalance: null, liveShares: null };
        }
      }));
      setPools(withLive);
      if (account?.address) {
        const [coins, position] = await Promise.all([
          depositCoinType ? fetchAllCoins(client, account.address, depositCoinType) : Promise.resolve([]),
          findFundPosition(client, account.address),
        ]);
        setBalance(coins.reduce((sum, coin) => sum + BigInt(coin.balance), 0n));
        setPositionId(position);
      } else {
        setBalance(0n);
        setPositionId('');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void load();
  }, [account?.address, depositCoinType]);

  React.useEffect(() => {
    let active = true;
    if (!routePool?.pool_object_id) {
      setPoolEvents([]);
      setPoolChart([]);
      return;
    }

    getFundPoolEvents(routePool.pool_object_id, { limit: 300 })
      .then((payload) => {
        if (!active) {
          return;
        }
        setPoolEvents(payload.data);
        setPoolChart(payload.chart);
      })
      .catch(() => {
        if (active) {
          setPoolEvents([]);
          setPoolChart([]);
        }
      });

    return () => {
      active = false;
    };
  }, [routePool?.pool_object_id]);

  async function runTx(label: string, tx: Transaction) {
    setBusy(label);
    setError(null);
    setNotice(null);
    setLastDigest(null);
    try {
      const result = await signAndExecuteTransaction({ transaction: tx });
      const digest = typeof result === 'object' && result && 'digest' in result ? String(result.digest) : '';
      if (!digest) {
        throw new Error('Transaction digest is missing.');
      }
      await client.waitForTransaction({ digest, options: { showEffects: true, showEvents: true } });
      setLastDigest(digest);
      setNotice(label === 'position' ? 'Позиция фонда создана. Теперь можно внести средства в пул.' : 'Депозит отправлен в пул, AV8 начислен на кошелек.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  async function handleOpenPosition() {
    if (!account?.address) {
      setError('Подключите Sui кошелек.');
      return;
    }
    const tx = new Transaction();
    tx.setSender(account.address);
    tx.moveCall({
      target: `${SUI_FUND_CONFIG.packageId}::fund_core::open_position`,
      arguments: [],
    });
    await runTx('position', tx);
  }

  async function handleDeposit() {
    if (!account?.address) {
      setError('Подключите Sui кошелек.');
      return;
    }
    if (!routePool) {
      setError('Откройте страницу конкретного пула.');
      return;
    }
    if (!positionId) {
      setError('Сначала создайте FundPosition для этого кошелька.');
      return;
    }
    if (!depositCoinType || !SUI_FUND_CONFIG.navStateId || !SUI_FUND_CONFIG.shareConfigId) {
      setError('Не настроены VITE_SUI_USDC_TYPE / NavState / ShareConfig.');
      return;
    }
    if (!parsedAmount || parsedAmount <= 0n) {
      setError('Введите сумму депозита в USDC.');
      return;
    }

    const coins = await fetchAllCoins(client, account.address, depositCoinType);
    const totalBalance = coins.reduce((sum, coin) => sum + BigInt(coin.balance), 0n);
    if (totalBalance < parsedAmount) {
      setError('Недостаточно USDC на кошельке.');
      return;
    }

    const tx = new Transaction();
    tx.setSender(account.address);
    const [payment] = buildCoinPayments(tx, coins, [parsedAmount]);
    tx.moveCall({
      target: `${SUI_FUND_CONFIG.packageId}::fund_core::deposit_to_pool`,
      typeArguments: [routePool.coin_type],
      arguments: [
        tx.object(SUI_FUND_CONFIG.navStateId),
        tx.object(SUI_FUND_CONFIG.shareConfigId),
        tx.object(routePool.pool_object_id),
        tx.object(positionId),
        payment,
        tx.object(CLOCK_OBJECT_ID),
      ],
    });
    await runTx('deposit', tx);
  }

  const depositPanel = (
    <aside className="h-fit rounded-2xl border border-white/[0.08] bg-white/[0.045] p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-400/10 text-teal-200">
          <BadgeDollarSign className="h-5 w-5" />
        </div>
        <div>
          <div className="text-lg font-semibold text-white">Инвестировать</div>
          <div className="text-sm text-slate-400">{routePool?.name || 'Выберите пул'}</div>
        </div>
      </div>

      <div className="mt-5">
        <ConnectButton />
      </div>

      <div className="mt-5 grid gap-3">
        <div className="rounded-xl border border-white/[0.07] bg-black/15 p-3">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-slate-500">
            <Wallet className="h-3.5 w-3.5" /> USDC balance
          </div>
          <div className="mt-1 font-semibold text-slate-100">{depositCoinType ? `${formatUnits(balance, 6)} ${routePool?.symbol || 'USDC'}` : 'coin type not set'}</div>
        </div>
        <div className="rounded-xl border border-white/[0.07] bg-black/15 p-3">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-slate-500">
            <CircleDollarSign className="h-3.5 w-3.5" /> AV8 expected
          </div>
          <div className="mt-1 font-semibold text-slate-100">{formatUnits(expectedAv8, AV8_DECIMALS)} AV8</div>
        </div>
      </div>

      <label className="mt-5 block">
        <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Сумма, USDC</span>
        <input className={inputClass} inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} />
      </label>

      {!positionId ? (
        <button
          className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-100 px-4 text-sm font-semibold text-slate-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
          disabled={Boolean(busy) || !account?.address}
          onClick={() => void handleOpenPosition()}
        >
          <Plus className="h-4 w-4" /> {busy === 'position' ? 'Создание...' : 'Создать FundPosition'}
        </button>
      ) : (
        <button
          className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-teal-300 px-4 text-sm font-semibold text-slate-950 transition hover:bg-teal-200 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={Boolean(busy) || !routePool}
          onClick={() => void handleDeposit()}
        >
          <ArrowRightLeft className="h-4 w-4" /> {busy === 'deposit' ? 'Подпись...' : 'Внести в пул'}
        </button>
      )}

      {notice ? <div className="mt-4 rounded-xl border border-emerald-300/20 bg-emerald-400/[0.08] p-3 text-sm text-emerald-100">{notice}</div> : null}
      {error ? <div className="mt-4 rounded-xl border border-red-300/20 bg-red-400/[0.08] p-3 text-sm text-red-100">{error}</div> : null}
      {lastDigest ? <div className="mt-4 break-all font-mono text-xs text-slate-500">{lastDigest}</div> : null}
    </aside>
  );

  return (
    <main className="min-h-[calc(100vh-160px)] bg-slate-950 pb-20 pt-14">
      <PageBreadcrumbsBar
        items={[
          { label: messages.breadcrumbs.home, href: getBasePath() },
          { label: messages.invest.pageTitle, href: poolObjectId ? investRoot : undefined },
          ...(routePool ? [{ label: routePool.name }] : []),
        ]}
      />
      <PageHeroShell
        badge={<PageHeroBadge label="AV8 pools" variant="teal" />}
        title={routePool ? routePool.name : 'Пулы AV8'}
        subtitle={routePool ? 'График, параметры риска и форма инвестирования в выбранный пул.' : 'Таблица пулов фонда в стиле GMX: выберите пул, чтобы открыть график и форму инвестирования.'}
        subtitleClassName="max-w-4xl text-lg leading-relaxed text-slate-400"
      />

      <section className="px-6 py-10">
        {routePool ? (
          <div className="mx-auto grid max-w-7xl gap-6 xl:grid-cols-[1fr_390px]">
            <div className="space-y-6">
              <a
                href={investRoot}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm font-semibold text-slate-100 transition hover:border-teal-300/40"
              >
                <ArrowLeft className="h-4 w-4" /> Все пулы
              </a>

              <section className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="text-sm uppercase tracking-[0.18em] text-teal-200">Pool chart</div>
                    <h2 className="mt-2 text-2xl font-semibold text-white">{routePool.name}</h2>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">{routePool.description || routePool.notes || 'USDC allocation pool.'}</p>
                  </div>
                  <div className="rounded-xl bg-emerald-400/10 px-3 py-2 text-sm font-semibold text-emerald-200">
                    {formatBps(routePool.target_apy_bps)} target APY
                  </div>
                </div>

                <div className="mt-6 h-[360px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={poolChartData} margin={{ left: 4, right: 12, top: 12, bottom: 0 }}>
                      <defs>
                        <linearGradient id="poolTvlGradient" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor="#2dd4bf" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="#2dd4bf" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(value) => `$${Number(value).toLocaleString()}`} />
                      <Tooltip
                        contentStyle={{ background: '#020617', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, color: '#e2e8f0' }}
                        formatter={(value: unknown) => [`$${Number(value || 0).toLocaleString()}`, 'TVL']}
                      />
                      <Area type="monotone" dataKey="tvl" stroke="#2dd4bf" strokeWidth={2} fill="url(#poolTvlGradient)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <section className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm uppercase tracking-[0.18em] text-teal-200">On-chain events</div>
                    <p className="mt-2 text-sm text-slate-400">
                      {poolEvents.length > 0 ? `${poolEvents.length} сохраненных событий пула из Sui.` : 'События пока не синхронизированы; график выше использует preview.'}
                    </p>
                  </div>
                </div>
                {poolEvents.length > 0 ? (
                  <div className="mt-4 overflow-hidden rounded-xl border border-white/[0.07]">
                    {poolEvents.slice(-8).reverse().map((event) => (
                      <div key={`${event.tx_digest}-${event.event_seq}`} className="grid grid-cols-[110px_1fr_140px] gap-3 border-b border-white/[0.05] px-3 py-3 text-sm last:border-b-0">
                        <div className="font-semibold uppercase tracking-[0.12em] text-slate-400">{event.event_type}</div>
                        <div className="truncate text-slate-300">{event.event_at || event.tx_digest}</div>
                        <div className="text-right font-mono text-xs text-slate-500">{formatUnits(BigInt(event.balance_usdc || '0'), 6)} USDC</div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </section>

              <div className="grid gap-4 md:grid-cols-4">
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4">
                  <div className="text-xs uppercase tracking-[0.14em] text-slate-500">TVL</div>
                  <div className="mt-2 text-lg font-semibold text-white">{routePool.liveBalance === null ? 'n/a' : `${formatUnits(routePool.liveBalance, 6)} ${routePool.symbol}`}</div>
                </div>
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4">
                  <div className="text-xs uppercase tracking-[0.14em] text-slate-500">Risk</div>
                  <div className="mt-2 text-lg font-semibold text-white">{routePool.risk_level}/5</div>
                </div>
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4">
                  <div className="text-xs uppercase tracking-[0.14em] text-slate-500">Realized APY</div>
                  <div className="mt-2 text-lg font-semibold text-white">{formatBps(routePool.realized_apy_bps)}</div>
                </div>
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4">
                  <div className="text-xs uppercase tracking-[0.14em] text-slate-500">Min deposit</div>
                  <div className="mt-2 text-lg font-semibold text-white">{formatUnits(BigInt(routePool.min_deposit_usdc || '0'), 6)} {routePool.symbol}</div>
                </div>
              </div>
            </div>

            {depositPanel}
          </div>
        ) : poolObjectId && !loading ? (
          <div className="mx-auto max-w-7xl rounded-2xl border border-amber-300/20 bg-amber-400/[0.08] p-5 text-sm text-amber-100">
            Пул не найден или выключен. <a className="font-semibold underline" href={investRoot}>Вернуться к таблице пулов</a>.
          </div>
        ) : (
          <div className="mx-auto max-w-7xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm uppercase tracking-[0.18em] text-teal-200">Пулы фонда</div>
                <p className="mt-2 text-sm text-slate-400">Нажмите на пул, чтобы открыть график, детали риска и форму инвестирования.</p>
              </div>
              <button
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm font-semibold text-slate-100 transition hover:border-teal-300/40"
                onClick={() => void load()}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Обновить
              </button>
            </div>

            <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.035]">
              <div className="grid grid-cols-[1.4fr_0.7fr_0.7fr_0.8fr_0.9fr_44px] gap-3 border-b border-white/[0.07] px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                <div>Pool</div>
                <div>TVL</div>
                <div>APY</div>
                <div>Risk</div>
                <div>Min deposit</div>
                <div />
              </div>
              {activePools.map((pool) => (
                <a
                  key={pool.id}
                  href={getPoolHref(pool)}
                  className="grid grid-cols-[1.4fr_0.7fr_0.7fr_0.8fr_0.9fr_44px] gap-3 border-b border-white/[0.05] px-4 py-4 text-sm text-slate-200 transition last:border-b-0 hover:bg-white/[0.045]"
                >
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-white">{pool.name}</div>
                    <div className="mt-1 truncate text-xs text-slate-500">{pool.description || shortId(pool.pool_object_id)}</div>
                  </div>
                  <div className="font-mono text-xs text-slate-300">{pool.liveBalance === null ? 'n/a' : `${formatUnits(pool.liveBalance, 6)} ${pool.symbol}`}</div>
                  <div className="font-semibold text-emerald-200">{formatBps(pool.target_apy_bps)}</div>
                  <div>Risk {pool.risk_level}</div>
                  <div>{formatUnits(BigInt(pool.min_deposit_usdc || '0'), 6)} {pool.symbol}</div>
                  <div className="flex items-center justify-end text-slate-500">
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </a>
              ))}
            </div>

            {!loading && activePools.length === 0 ? (
              <div className="rounded-2xl border border-amber-300/20 bg-amber-400/[0.08] p-5 text-sm text-amber-100">
                В базе пока нет активных пулов. Создайте их в админке `/admin/pools`.
              </div>
            ) : null}
          </div>
        )}
      </section>
    </main>
  );
}
