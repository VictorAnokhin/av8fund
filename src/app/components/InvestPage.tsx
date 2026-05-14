import React from 'react';
import { ConnectButton, useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { getZkLoginSignature } from '@mysten/sui/zklogin';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowLeft, ExternalLink, Info, MoreVertical, RefreshCw, Star } from 'lucide-react';

import { SUI_NETWORK } from '../config';
import {
  getFundPoolEvents,
  getFundPools,
  getFundShareSettings,
  type FundPoolChartPoint,
  type FundPoolEventRecord,
  type FundPoolRecord,
  type FundShareSettingsRecord,
} from '../lib/api';
import { EXTERNAL_WALLET_SESSION_EVENT, getExternalSessionAddress, isExternalSessionSui, readExternalWalletSession } from '../lib/externalWalletSession';
import { getBasePath } from '../lib/routes';
import { SUI_FUND_CONFIG } from '../lib/suiFund';
import { normalizeSwapWalletAddress, resolveSuiSigningRoute } from '../lib/swapLinkedWallets';
import { normalizeZkLoginSessionProofForSigning } from '../lib/zkloginProof';
import { readZkLoginSession, ZKLOGIN_SESSION_EVENT } from '../lib/zkloginSession';
import { useSwapLinkedWallets } from '../hooks/useSwapLinkedWallets';
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
  liveMinDepositUsdc: bigint | null;
};

type PoolWithdrawRequestRecord = {
  objectId: string;
  poolId: string;
  amountUsdc: bigint;
  burnedAv8: bigint;
  feeAv8: bigint;
  availableAtMs: bigint;
};

type PoolAv8StakeRecord = {
  objectId: string;
  poolId: string;
  owner: string;
  stakedAv8: bigint;
  entryValueUsdc: bigint;
  updatedAtMs: bigint;
};

const CLOCK_OBJECT_ID = '0x6';
const FUND_TYPE_PACKAGE_ID = SUI_FUND_CONFIG.packageId;
const FUND_MODULE_PACKAGE_ID = SUI_FUND_CONFIG.modulePackageId || SUI_FUND_CONFIG.packageId;
const FUND_POSITION_TYPE = `${FUND_TYPE_PACKAGE_ID}::fund_core::FundPosition`;
const POOL_WITHDRAW_REQUEST_TYPE = `${FUND_TYPE_PACKAGE_ID}::fund_core::PoolWithdrawRequest`;
const POOL_AV8_STAKE_TYPE = `${FUND_TYPE_PACKAGE_ID}::pool_manager::PoolAv8Stake`;
const SHARE_TYPE = `${FUND_TYPE_PACKAGE_ID}::fund_share::FUND_SHARE`;
const AV8_DECIMALS = 9;
const DEFAULT_NAV_PRICE_USDC = 1_000_000n;
const REDEEM_DELAY_DAYS = 3;

const ACTIVE_WALLET_KEY = 'av8fund.active-wallet';
const ACTIVE_WALLET_EVENT = 'av8fund:active-wallet';

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

function readObjectId(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  const record = asRecord(value);
  const direct = record.id ?? record.bytes ?? record.objectId;
  if (typeof direct === 'string') {
    return direct;
  }
  const fields = asRecord(record.fields);
  const nested = fields.id ?? fields.bytes ?? fields.value;
  return typeof nested === 'string' ? nested : '';
}

function shortId(value: string): string {
  return value.length > 18 ? `${value.slice(0, 10)}...${value.slice(-6)}` : value;
}

function sameSuiAddress(a?: string | null, b?: string | null): boolean {
  const left = String(a || '').trim().toLowerCase();
  const right = String(b || '').trim().toLowerCase();
  return Boolean(left && right && left === right);
}

function readActiveSuiWalletAddress(): string {
  if (typeof window === 'undefined') {
    return '';
  }

  try {
    const raw = window.localStorage.getItem(ACTIVE_WALLET_KEY);
    if (!raw) {
      return '';
    }

    const payload = JSON.parse(raw) as { address?: unknown; isSui?: unknown; network?: unknown };
    const address = typeof payload.address === 'string' ? payload.address.trim() : '';
    const network = typeof payload.network === 'string' ? payload.network.trim().toLowerCase() : '';
    if (!address || (payload.isSui !== true && network !== 'sui')) {
      return '';
    }

    return address;
  } catch {
    return '';
  }
}

function formatBps(value: number): string {
  return `${(Number(value || 0) / 100).toFixed(2)}%`;
}

function applyBps(value: bigint, bps: number): bigint {
  return value * BigInt(Math.max(0, Math.min(10000, Math.trunc(Number(bps || 0))))) / 10000n;
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

function readUsdcAmount(value: string | null | undefined): bigint {
  return BigInt(/^\d+$/.test(String(value || '')) ? String(value) : '0');
}

function bigintToUnits(value: bigint, decimals: number): number {
  const sign = value < 0n ? -1 : 1;
  const abs = value < 0n ? -value : value;
  const base = 10n ** BigInt(decimals);
  const whole = Number(abs / base);
  const fraction = Number(abs % base) / Number(base);
  return sign * (whole + fraction);
}

function formatCompactUsdFromUsdc(value: bigint | null | undefined): string {
  if (value === null || value === undefined) {
    return 'N/A';
  }

  const amount = bigintToUnits(value, 6);
  const abs = Math.abs(amount);
  const suffix = abs >= 1_000_000_000 ? 'b' : abs >= 1_000_000 ? 'm' : abs >= 1_000 ? 'k' : '';
  const divisor = suffix === 'b' ? 1_000_000_000 : suffix === 'm' ? 1_000_000 : suffix === 'k' ? 1_000 : 1;
  const compact = amount / divisor;

  return `$${new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
    minimumFractionDigits: suffix ? 2 : 0,
  }).format(compact)}${suffix}`;
}

function buildSnapshotPoints(seedInput: string, trend: number | null | undefined): string {
  const seed = Array.from(seedInput).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const positiveTrend = Number.isFinite(trend) ? Number(trend) >= 0 : true;
  const points = Array.from({ length: 28 }, (_, index) => {
    const wave = Math.sin((index + seed) * 0.55) * 4;
    const jitter = ((seed + index * 17) % 9) - 4;
    const drift = positiveTrend ? index * 0.9 : -index * 0.55;
    const y = 34 - drift - wave - jitter;
    return {
      x: index * 5,
      y: Math.max(7, Math.min(45, y)),
    };
  });

  return points.map((point) => `${point.x},${point.y}`).join(' ');
}

function getPoolSparkId(pool: LivePool): string {
  return `invest-pool-spark-${String(pool.pool_object_id || pool.id).replace(/[^a-zA-Z0-9]/g, '')}`;
}

function getInvestRoot(): string {
  const root = getBasePath();
  return root === '/' ? '/invest' : `${root.replace(/\/+$/, '')}/invest`;
}

function getPoolHref(pool: FundPoolRecord): string {
  return `${getInvestRoot()}/${encodeURIComponent(pool.pool_object_id || String(pool.id))}`;
}

function getPoolAccountingId(pool?: FundPoolRecord | null): string {
  return pool?.pool_accounting_id || SUI_FUND_CONFIG.poolAccountingId || '';
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

async function fetchPoolWithdrawRequests(client: ReturnType<typeof useSuiClient>, owner: string): Promise<PoolWithdrawRequestRecord[]> {
  const requests: PoolWithdrawRequestRecord[] = [];
  let cursor: string | null | undefined = null;

  do {
    const page = await client.getOwnedObjects({
      owner,
      cursor,
      limit: 50,
      filter: { StructType: POOL_WITHDRAW_REQUEST_TYPE },
      options: { showContent: true, showType: true },
    });

    for (const item of page.data) {
      const objectId = item.data?.objectId || '';
      const fields = asRecord(asRecord(asRecord(item.data).content).fields);
      if (!objectId) {
        continue;
      }
      requests.push({
        objectId,
        poolId: readObjectId(fields.pool_id),
        amountUsdc: readBigInt(fields.amount_usdc),
        burnedAv8: readBigInt(fields.burned_av8),
        feeAv8: readBigInt(fields.fee_av8),
        availableAtMs: readBigInt(fields.available_at_ms),
      });
    }

    cursor = page.hasNextPage ? page.nextCursor : null;
  } while (cursor);

  return requests.sort((a, b) => Number(a.availableAtMs - b.availableAtMs));
}

async function fetchPoolAv8Stakes(client: ReturnType<typeof useSuiClient>, owner: string): Promise<PoolAv8StakeRecord[]> {
  const stakes: PoolAv8StakeRecord[] = [];
  let cursor: string | null | undefined = null;

  do {
    const page = await client.getOwnedObjects({
      owner,
      cursor,
      limit: 50,
      filter: { StructType: POOL_AV8_STAKE_TYPE },
      options: { showContent: true, showType: true },
    });

    for (const item of page.data) {
      const objectId = item.data?.objectId || '';
      const fields = asRecord(asRecord(asRecord(item.data).content).fields);
      if (!objectId) {
        continue;
      }
      stakes.push({
        objectId,
        poolId: readObjectId(fields.pool_id),
        owner: String(fields.owner || owner),
        stakedAv8: readBigInt(fields.balance),
        entryValueUsdc: readBigInt(fields.entry_value_usdc),
        updatedAtMs: readBigInt(fields.updated_at_ms),
      });
    }

    cursor = page.hasNextPage ? page.nextCursor : null;
  } while (cursor);

  return stakes;
}

function readPoolLiveFields(objectData: unknown): Pick<LivePool, 'liveBalance' | 'liveShares' | 'liveMinDepositUsdc'> {
  const fields = asRecord(asRecord(asRecord(objectData).content).fields);
  return {
    liveBalance: fields.balance ? readBigInt(fields.balance) : null,
    liveShares: fields.total_pool_shares ? readBigInt(fields.total_pool_shares) : null,
    liveMinDepositUsdc: fields.min_deposit_usdc ? readBigInt(fields.min_deposit_usdc) : null,
  };
}

function readNavPriceUsdc(objectData: unknown): bigint {
  const fields = asRecord(asRecord(asRecord(objectData).content).fields);
  const value = readBigInt(fields.nav_price_usdc);
  return value > 0n ? value : DEFAULT_NAV_PRICE_USDC;
}

function formatDateTime(value: number): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function InvestPoolsTable({ pools }: { pools: LivePool[] }) {
  return (
    <div className="overflow-x-auto rounded-[1.25rem] border border-white/[0.07] bg-[rgba(4,8,16,0.34)]">
      <div className="min-w-[980px]">
        <div className="grid grid-cols-[2.1fr_1.25fr_1.15fr_1fr_1.45fr_1.55fr_130px] gap-4 px-5 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          <div>Pool</div>
          <div className="flex items-center gap-1">TVL (Supply) <Info className="h-3.5 w-3.5" /></div>
          <div className="flex items-center gap-1">Balance <Info className="h-3.5 w-3.5" /></div>
          <div className="flex items-center gap-1">Fee APY <Info className="h-3.5 w-3.5" /></div>
          <div className="flex items-center gap-1">Annualized performance <Info className="h-3.5 w-3.5" /></div>
          <div className="flex items-center gap-1">Snapshot <Info className="h-3.5 w-3.5" /></div>
          <div />
        </div>

        <div className="space-y-2 pb-2">
          {pools.map((pool) => {
            const apyBps = Number(pool.realized_apy_bps || pool.target_apy_bps || 0);
            const performanceBps = Math.round(apyBps * 0.92);
            const minDeposit = pool.liveMinDepositUsdc ?? readUsdcAmount(pool.min_deposit_usdc);
            const snapshotPoints = buildSnapshotPoints(pool.pool_object_id || String(pool.id), performanceBps);
            const sparkId = getPoolSparkId(pool);

            return (
              <div
                key={pool.pool_object_id || pool.id}
                className="grid min-h-[94px] grid-cols-[2.1fr_1.25fr_1.15fr_1fr_1.45fr_1.55fr_130px] items-center gap-4 rounded-2xl bg-[rgba(13,17,32,0.96)] px-5 py-4 text-slate-200 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.035)]"
              >
                <div className="flex min-w-0 items-center gap-4">
                  <button
                    type="button"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-white/[0.04] hover:text-slate-200"
                    aria-label="Watch pool"
                  >
                    <Star className="h-5 w-5" />
                  </button>

                  {pool.logo_url ? (
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full bg-white/5 ring-1 ring-white/10">
                      <img src={pool.logo_url} alt={pool.name} className="h-full w-full object-cover" />
                    </div>
                  ) : (
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-cyan-300 text-lg font-black text-slate-950 ring-1 ring-white/10">
                      {(pool.symbol || 'AV8').slice(0, 3).toUpperCase()}
                    </div>
                  )}

                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-2">
                      <div className="truncate text-xl font-semibold text-white">{pool.name}</div>
                      <MoreVertical className="h-4 w-4 shrink-0 text-slate-500" />
                    </div>
                    <div className="mt-1 truncate text-sm text-slate-500">[{pool.symbol || 'USDC'}-AV8]</div>
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="text-lg font-medium text-white">{formatCompactUsdFromUsdc(pool.liveBalance)}</div>
                  <div className="mt-1 text-sm text-slate-500">USDC liquidity</div>
                </div>

                <div className="min-w-0">
                  <div className="text-lg font-medium text-white">{formatUnits(minDeposit, 6, 6)} {pool.symbol || 'USDC'}</div>
                  <div className="mt-1 text-sm text-slate-500 underline decoration-dotted underline-offset-4">
                    Min deposit
                  </div>
                </div>

                <div className="text-lg font-medium text-white">{formatBps(apyBps)}</div>
                <div className="text-lg font-medium text-white">{formatBps(performanceBps)}</div>

                <div className="h-14">
                  <svg viewBox="0 0 135 54" className="h-full w-full overflow-visible" role="img" aria-label="Pool performance snapshot">
                    <defs>
                      <linearGradient id={sparkId} x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="rgba(74,222,128,0.42)" />
                        <stop offset="100%" stopColor="rgba(74,222,128,0)" />
                      </linearGradient>
                    </defs>
                    <polyline
                      points={`0,54 ${snapshotPoints} 135,54`}
                      fill={`url(#${sparkId})`}
                      stroke="none"
                    />
                    <polyline
                      points={snapshotPoints}
                      fill="none"
                      stroke="#4ade80"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>

                <div className="flex items-center justify-end gap-3">
                  <a
                    href={getPoolHref(pool)}
                    className="inline-flex items-center gap-2 text-base font-medium text-slate-300 transition hover:text-white"
                  >
                    Details
                    <ExternalLink className="h-4 w-4" />
                  </a>
                  <MoreVertical className="h-5 w-5 text-slate-600" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function InvestPage({ poolObjectId }: InvestPageProps) {
  const { messages } = useI18n();
  const client = useSuiClient();
  const account = useCurrentAccount();
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const {
    suiLinked,
    selectedSuiAddress,
    setSelectedSuiAddress,
    lookupError: linkedWalletsError,
    hasGoogleIdentity,
  } = useSwapLinkedWallets();
  const investRoot = getInvestRoot();

  const [activeSuiWalletAddress, setActiveSuiWalletAddress] = React.useState(() => readActiveSuiWalletAddress());
  const [externalWalletAddress, setExternalWalletAddress] = React.useState('');
  const [zkLoginWalletAddress, setZkLoginWalletAddress] = React.useState(() => readZkLoginSession()?.walletAddress || '');
  const [pools, setPools] = React.useState<LivePool[]>([]);
  const [amount, setAmount] = React.useState('');
  const [amountEdited, setAmountEdited] = React.useState(false);
  const [formMode, setFormMode] = React.useState<'deposit' | 'withdraw'>('deposit');
  const [depositAssetMode, setDepositAssetMode] = React.useState<'av8' | 'usdc'>('usdc');
  const [balance, setBalance] = React.useState<bigint>(0n);
  const [av8Balance, setAv8Balance] = React.useState<bigint>(0n);
  const [navPriceUsdc, setNavPriceUsdc] = React.useState<bigint>(DEFAULT_NAV_PRICE_USDC);
  const [positionId, setPositionId] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [lastDigest, setLastDigest] = React.useState<string | null>(null);
  const [lastDepositAmountLabel, setLastDepositAmountLabel] = React.useState<string | null>(null);
  const [poolEvents, setPoolEvents] = React.useState<FundPoolEventRecord[]>([]);
  const [poolChart, setPoolChart] = React.useState<FundPoolChartPoint[]>([]);
  const [shareSettings, setShareSettings] = React.useState<FundShareSettingsRecord | null>(null);
  const [quickPoolObjectId, setQuickPoolObjectId] = React.useState('');
  const [quickMode, setQuickMode] = React.useState<'deposit' | 'redeem'>('deposit');
  const [quickAmount, setQuickAmount] = React.useState('');
  const [redeemRequests, setRedeemRequests] = React.useState<Array<{ id: string; amountAv8: string; expectedUsdc: string; availableAt: number }>>([]);
  const [onChainRedeemRequests, setOnChainRedeemRequests] = React.useState<PoolWithdrawRequestRecord[]>([]);
  const [poolAv8Stakes, setPoolAv8Stakes] = React.useState<PoolAv8StakeRecord[]>([]);
  const selectedLinkedWallet = React.useMemo(() => {
    const normalizedSelected = normalizeSwapWalletAddress(selectedSuiAddress);
    return suiLinked.find((wallet) => normalizeSwapWalletAddress(wallet.address) === normalizedSelected) || null;
  }, [selectedSuiAddress, suiLinked]);
  const currentOwnerAddress = selectedSuiAddress || account?.address || zkLoginWalletAddress || externalWalletAddress || activeSuiWalletAddress;
  const signingRoute = React.useMemo(() => {
    const active = normalizeSwapWalletAddress(currentOwnerAddress);
    return resolveSuiSigningRoute({
      activeWalletIsSui: Boolean(active),
      web3auth: selectedLinkedWallet?.web3auth,
      extensionAddressMatchesActive: Boolean(account?.address && normalizeSwapWalletAddress(account.address) === active),
      zkSessionMatchesActive: Boolean(zkLoginWalletAddress && normalizeSwapWalletAddress(zkLoginWalletAddress) === active),
    });
  }, [account?.address, currentOwnerAddress, selectedLinkedWallet?.web3auth, zkLoginWalletAddress]);

  const activePools = React.useMemo(() => pools.filter((pool) => pool.active), [pools]);
  const defaultDepositPool = React.useMemo(() => {
    return activePools.find((pool) => pool.is_default_deposit) || activePools[0] || null;
  }, [activePools]);
  const quickPool = React.useMemo(() => {
    return activePools.find((pool) => pool.pool_object_id === quickPoolObjectId) || defaultDepositPool;
  }, [activePools, defaultDepositPool, quickPoolObjectId]);
  const routePool = React.useMemo(() => {
    const normalized = String(poolObjectId || '').trim().toLowerCase();
    if (!normalized) {
      return defaultDepositPool;
    }
    return activePools.find((pool) => pool.pool_object_id.toLowerCase() === normalized || String(pool.id) === normalized) ?? defaultDepositPool;
  }, [activePools, defaultDepositPool, poolObjectId]);
  const selectedPools = routePool ? [routePool] : [];
  const depositCoinType = SUI_FUND_CONFIG.usdcType;
  const shareFeeConfigId = shareSettings?.share_fee_config_id?.trim() || SUI_FUND_CONFIG.shareFeeConfigId;
  const minDepositAmount = routePool ? routePool.liveMinDepositUsdc ?? BigInt(routePool.min_deposit_usdc || '0') : 0n;
  const requiredAv8Balance = routePool ? BigInt(routePool.min_av8_balance || '0') : 0n;
  const routePoolAv8Stakes = React.useMemo(() => {
    if (!routePool?.pool_object_id) {
      return [];
    }
    const poolId = normalizeSwapWalletAddress(routePool.pool_object_id);
    return poolAv8Stakes.filter((stake) => normalizeSwapWalletAddress(stake.poolId) === poolId);
  }, [poolAv8Stakes, routePool?.pool_object_id]);
  const routePoolPrimaryStake = routePoolAv8Stakes[0] || null;
  const routePoolStakedAv8 = routePoolAv8Stakes.reduce((sum, stake) => sum + stake.stakedAv8, 0n);
  const routePoolStakedValueUsdc = routePoolAv8Stakes.reduce((sum, stake) => sum + stake.entryValueUsdc, 0n);
  const hasRoutePoolAccess = requiredAv8Balance === 0n || routePoolStakedAv8 >= requiredAv8Balance;
  const parsedAmount = parseDecimalAmount(amount, 6);
  const parsedAv8Amount = parseDecimalAmount(amount, AV8_DECIMALS);
  const av8StakeValueUsdc = parsedAv8Amount && parsedAv8Amount > 0n ? parsedAv8Amount * navPriceUsdc / 10n ** BigInt(AV8_DECIMALS) : 0n;
  const expectedAv8 = parsedAmount && parsedAmount > 0n ? parsedAmount * 10n ** BigInt(AV8_DECIMALS) / navPriceUsdc : 0n;
  const expectedUsdc = parsedAv8Amount && parsedAv8Amount > 0n ? parsedAv8Amount * navPriceUsdc / 10n ** BigInt(AV8_DECIMALS) : 0n;
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

  React.useEffect(() => {
    setAmountEdited(false);
    setLastDepositAmountLabel(null);
    setDepositAssetMode(routePool && BigInt(routePool.min_av8_balance || '0') > 0n ? 'av8' : 'usdc');
  }, [routePool?.pool_object_id]);

  React.useEffect(() => {
    if (amountEdited) {
      return;
    }

    if (formMode === 'withdraw') {
      if (depositAssetMode === 'av8') {
        setAmount(routePoolStakedAv8 > 0n ? formatUnits(routePoolStakedAv8, AV8_DECIMALS, 6) : '');
      } else {
        setAmount(av8Balance > 0n ? formatUnits(av8Balance, AV8_DECIMALS, 6) : '');
      }
      return;
    }

    if (depositAssetMode === 'av8') {
      setAmount(requiredAv8Balance > 0n ? formatUnits(requiredAv8Balance, AV8_DECIMALS, 6) : '');
      return;
    }

    if (minDepositAmount > 0n) {
      setAmount(formatUnits(minDepositAmount, 6, 6));
    }
  }, [amountEdited, av8Balance, depositAssetMode, formMode, minDepositAmount, requiredAv8Balance, routePoolStakedAv8]);

  React.useEffect(() => {
    function syncActiveWallet() {
      setActiveSuiWalletAddress(readActiveSuiWalletAddress());
    }

    syncActiveWallet();

    if (typeof window === 'undefined') {
      return;
    }

    window.addEventListener(ACTIVE_WALLET_EVENT, syncActiveWallet as EventListener);
    window.addEventListener('storage', syncActiveWallet);

    return () => {
      window.removeEventListener(ACTIVE_WALLET_EVENT, syncActiveWallet as EventListener);
      window.removeEventListener('storage', syncActiveWallet);
    };
  }, []);

  React.useEffect(() => {
    function syncExternalSession() {
      const session = readExternalWalletSession();
      setExternalWalletAddress(isExternalSessionSui(session) ? String(getExternalSessionAddress(session) || '') : '');
      setZkLoginWalletAddress(readZkLoginSession()?.walletAddress || '');
    }

    syncExternalSession();

    if (typeof window === 'undefined') {
      return;
    }

    window.addEventListener(EXTERNAL_WALLET_SESSION_EVENT, syncExternalSession as EventListener);
    window.addEventListener(ZKLOGIN_SESSION_EVENT, syncExternalSession as EventListener);
    window.addEventListener('storage', syncExternalSession);

    return () => {
      window.removeEventListener(EXTERNAL_WALLET_SESSION_EVENT, syncExternalSession as EventListener);
      window.removeEventListener(ZKLOGIN_SESSION_EVENT, syncExternalSession as EventListener);
      window.removeEventListener('storage', syncExternalSession);
    };
  }, []);

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
          return { ...pool, liveBalance: null, liveShares: null, liveMinDepositUsdc: null };
        }
        try {
          const object = await client.getObject({ id: pool.pool_object_id, options: { showContent: true } });
          return { ...pool, ...readPoolLiveFields(object.data) };
        } catch {
          return { ...pool, liveBalance: null, liveShares: null, liveMinDepositUsdc: null };
        }
      }));
      setPools(withLive);
      if (SUI_FUND_CONFIG.navStateId) {
        try {
          const navObject = await client.getObject({ id: SUI_FUND_CONFIG.navStateId, options: { showContent: true } });
          setNavPriceUsdc(readNavPriceUsdc(navObject.data));
        } catch {
          setNavPriceUsdc(DEFAULT_NAV_PRICE_USDC);
        }
      }
      if (currentOwnerAddress) {
        const [coins, shareCoins, position, withdrawRequests, av8Stakes] = await Promise.all([
          depositCoinType ? fetchAllCoins(client, currentOwnerAddress, depositCoinType) : Promise.resolve([]),
          fetchAllCoins(client, currentOwnerAddress, SHARE_TYPE).catch(() => []),
          findFundPosition(client, currentOwnerAddress),
          fetchPoolWithdrawRequests(client, currentOwnerAddress).catch(() => []),
          fetchPoolAv8Stakes(client, currentOwnerAddress).catch(() => []),
        ]);
        setBalance(coins.reduce((sum, coin) => sum + BigInt(coin.balance), 0n));
        setAv8Balance(shareCoins.reduce((sum, coin) => sum + BigInt(coin.balance), 0n));
        setPositionId(position);
        setOnChainRedeemRequests(withdrawRequests);
        setPoolAv8Stakes(av8Stakes);
      } else {
        setBalance(0n);
        setAv8Balance(0n);
        setPositionId('');
        setOnChainRedeemRequests([]);
        setPoolAv8Stakes([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void load();
  }, [currentOwnerAddress, depositCoinType]);

  React.useEffect(() => {
    if (!quickPoolObjectId && activePools[0]?.pool_object_id) {
      setQuickPoolObjectId(activePools[0].pool_object_id);
    }
  }, [activePools, quickPoolObjectId]);

  React.useEffect(() => {
    let active = true;
    getFundShareSettings({
      network: SUI_NETWORK,
      packageId: SUI_FUND_CONFIG.packageId,
    })
      .then((settings) => {
        if (active) {
          setShareSettings(settings);
        }
      })
      .catch(() => {
        if (active) {
          setShareSettings(null);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  React.useEffect(() => {
    if (typeof window === 'undefined' || !currentOwnerAddress) {
      setRedeemRequests([]);
      return;
    }

    try {
      const raw = window.localStorage.getItem(`av8fund.redeem-requests.${normalizeSwapWalletAddress(currentOwnerAddress)}`);
      const parsed = raw ? JSON.parse(raw) : [];
      setRedeemRequests(Array.isArray(parsed) ? parsed : []);
    } catch {
      setRedeemRequests([]);
    }
  }, [currentOwnerAddress]);

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

  async function executeSignedTransaction(transaction: Transaction): Promise<string> {
    if (selectedLinkedWallet?.web3auth === 0 && !signingRoute.useExtension) {
      throw new Error('Выбранный кошелек требует подпись кошельком. Подключите этот Sui wallet.');
    }
    if (selectedLinkedWallet?.web3auth === 1 && !signingRoute.useZkLogin) {
      throw new Error('Выбранный кошелек требует подпись zkLogin. Войдите через Google zkLogin для этого адреса.');
    }

    if (signingRoute.useExtension) {
      const result = await signAndExecuteTransaction({ transaction });
      if (typeof result === 'object' && result && 'digest' in result && typeof result.digest === 'string') {
        return result.digest;
      }

      throw new Error('Connected wallet did not return a transaction digest.');
    }

    const zkSession = readZkLoginSession();
    if (!signingRoute.useZkLogin || !sameSuiAddress(zkSession?.walletAddress, currentOwnerAddress)) {
      if (account?.address && !sameSuiAddress(account.address, currentOwnerAddress)) {
        throw new Error('Подключенный Sui кошелек не совпадает с выбранным активным адресом. Переключите кошелек или выберите подключенный адрес.');
      }
      throw new Error('Для выбранного адреса нет способа подписи. Подключите Sui кошелек или заново войдите через Google zkLogin.');
    }

    const signer = Ed25519Keypair.fromSecretKey(zkSession.ephemeralPrivateKey);
    const { bytes, signature: userSignature } = await transaction.sign({
      client,
      signer,
    });
    const zkSignature = getZkLoginSignature({
      inputs: normalizeZkLoginSessionProofForSigning(zkSession),
      maxEpoch: zkSession.maxEpoch,
      userSignature,
    });
    const result = await client.executeTransactionBlock({
      transactionBlock: bytes,
      signature: zkSignature,
      options: {
        showEffects: true,
      },
    });

    if (!result.digest) {
      throw new Error('zkLogin transaction finished without a digest.');
    }

    return result.digest;
  }

  async function runTx(label: string, tx: Transaction): Promise<boolean> {
    setBusy(label);
    setError(null);
    setNotice(null);
    setLastDigest(null);
    setLastDepositAmountLabel(null);
    try {
      const digest = await executeSignedTransaction(tx);
      await client.waitForTransaction({ digest, options: { showEffects: true, showEvents: true } });
      setLastDigest(digest);
      setNotice(
        label === 'position'
          ? 'Позиция фонда создана. Теперь можно внести средства в пул.'
          : label === 'stake-av8'
            ? 'AV8 внесен в пул и закреплен за вашей позицией.'
          : label === 'unstake-av8'
            ? 'AV8 выведен из пула и возвращен на кошелек.'
          : label === 'withdraw'
            ? 'Заявка на вывод отправлена, USDC возвращен на кошелек.'
            : label === 'withdraw-request'
              ? `Заявка на выкуп создана on-chain. Claim USDC будет доступен после задержки ${REDEEM_DELAY_DAYS} дня.`
              : label === 'withdraw-claim'
                ? 'Заявка на выкуп исполнена, USDC отправлены на кошелек.'
              : 'Депозит отправлен в пул, AV8 начислен на кошелек.',
      );
      await load();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function handleOpenPosition() {
    if (!currentOwnerAddress) {
      setError('Подключите Sui кошелек или войдите через Google zkLogin.');
      return;
    }
    const tx = new Transaction();
    tx.setSender(currentOwnerAddress);
    tx.moveCall({
      target: `${FUND_MODULE_PACKAGE_ID}::fund_core::open_position`,
      arguments: [],
    });
    await runTx('position', tx);
  }

  async function submitDeposit(targetPool: LivePool, amountUsdc: bigint, label: 'deposit' | 'quick-deposit' = 'deposit', displayLabel?: string) {
    if (!currentOwnerAddress) {
      setError('Подключите Sui кошелек или войдите через Google zkLogin.');
      return;
    }
    if (!positionId) {
      setError('Сначала создайте FundPosition для этого кошелька.');
      return;
    }
    if (!depositCoinType || !SUI_FUND_CONFIG.navStateId || !SUI_FUND_CONFIG.shareConfigId || !shareFeeConfigId || !SUI_FUND_CONFIG.registryId || !SUI_FUND_CONFIG.basketId) {
      setError('Не настроены VITE_SUI_USDC_TYPE / NavState / ShareConfig / ShareFeeConfig / AssetRegistry / Basket.');
      return;
    }
    if (!targetPool.basket_vault_id) {
      setError('Для default deposit route должен быть привязан Basket AssetVault<USDC> в /admin/pools.');
      return;
    }
    if (!amountUsdc || amountUsdc <= 0n) {
      setError('Введите сумму депозита в USDC.');
      return;
    }
    const targetMinDeposit = targetPool.liveMinDepositUsdc ?? readUsdcAmount(targetPool.min_deposit_usdc);
    if (targetMinDeposit > 0n && amountUsdc < targetMinDeposit) {
      setError(`Минимальный депозит: ${formatUnits(targetMinDeposit, 6, 6)} ${targetPool.symbol}.`);
      return;
    }

    const coins = await fetchAllCoins(client, currentOwnerAddress, depositCoinType);
    const totalBalance = coins.reduce((sum, coin) => sum + BigInt(coin.balance), 0n);
    if (totalBalance < amountUsdc) {
      setError('Недостаточно USDC на кошельке.');
      return;
    }

    const tx = new Transaction();
    tx.setSender(currentOwnerAddress);
    const [payment] = buildCoinPayments(tx, coins, [amountUsdc]);
    tx.moveCall({
      target: `${FUND_MODULE_PACKAGE_ID}::fund_core::deposit_to_asset_vault_with_fee`,
      typeArguments: [depositCoinType],
      arguments: [
        tx.object(SUI_FUND_CONFIG.navStateId),
        tx.object(SUI_FUND_CONFIG.shareConfigId),
        tx.object(shareFeeConfigId),
        tx.object(SUI_FUND_CONFIG.registryId),
        tx.object(SUI_FUND_CONFIG.basketId),
        tx.object(targetPool.basket_vault_id),
        tx.object(positionId),
        payment,
        tx.object(CLOCK_OBJECT_ID),
      ],
    });
    const submittedAmount = displayLabel || `${formatUnits(amountUsdc, 6, 6)} ${targetPool.symbol}`;
    const ok = await runTx(label, tx);
    if (ok) {
      setLastDepositAmountLabel(submittedAmount);
    }
  }

  async function handleDeposit() {
    if (!routePool) {
      setError('Откройте страницу конкретного пула.');
      return;
    }
    if (!routePool.coin_type) {
      setError('У пула не настроен тип монеты.');
      return;
    }
    if (!parsedAmount || parsedAmount <= 0n) {
      setError('Введите сумму депозита в USDC.');
      return;
    }
    await submitDeposit(routePool, parsedAmount);
  }

  async function handleDepositAv8() {
    if (!currentOwnerAddress) {
      setError('Подключите Sui кошелек или войдите через Google zkLogin.');
      return;
    }
    if (!routePool) {
      setError('Откройте страницу конкретного пула.');
      return;
    }
    if (!routePool.coin_type) {
      setError('У пула не настроен тип монеты.');
      return;
    }
    if (!SUI_FUND_CONFIG.navStateId) {
      setError('Не настроен NavState для оценки AV8.');
      return;
    }
    if (!parsedAv8Amount || parsedAv8Amount <= 0n) {
      setError('Введите сумму AV8.');
      return;
    }
    if (av8StakeValueUsdc <= 0n) {
      setError('Не удалось рассчитать USDC по текущему NAV AV8.');
      return;
    }

    const shareCoins = await fetchAllCoins(client, currentOwnerAddress, SHARE_TYPE);
    const totalBalance = shareCoins.reduce((sum, coin) => sum + BigInt(coin.balance), 0n);
    if (totalBalance < parsedAv8Amount) {
      setError('Недостаточно AV8 на кошельке.');
      return;
    }

    const tx = new Transaction();
    tx.setSender(currentOwnerAddress);
    const [av8Payment] = buildCoinPayments(tx, shareCoins, [parsedAv8Amount]);
    if (routePoolPrimaryStake) {
      tx.moveCall({
        target: `${FUND_MODULE_PACKAGE_ID}::pool_manager::add_pool_av8_stake`,
        typeArguments: [routePool.coin_type],
        arguments: [
          tx.object(routePool.pool_object_id),
          tx.object(routePoolPrimaryStake.objectId),
          tx.object(SUI_FUND_CONFIG.navStateId),
          av8Payment,
          tx.object(CLOCK_OBJECT_ID),
        ],
      });
    } else {
      tx.moveCall({
        target: `${FUND_MODULE_PACKAGE_ID}::pool_manager::create_pool_av8_stake`,
        typeArguments: [routePool.coin_type],
        arguments: [
          tx.object(routePool.pool_object_id),
          tx.object(SUI_FUND_CONFIG.navStateId),
          av8Payment,
          tx.object(CLOCK_OBJECT_ID),
        ],
      });
    }

    const ok = await runTx('stake-av8', tx);
    if (ok) {
      setLastDepositAmountLabel(`${formatUnits(parsedAv8Amount, AV8_DECIMALS, 6)} AV8 = ${formatUnits(av8StakeValueUsdc, 6, 6)} USDC`);
      setDepositAssetMode('usdc');
      setAmountEdited(false);
    }
  }

  async function handleUnstakeAv8() {
    if (!currentOwnerAddress) {
      setError('Подключите Sui кошелек или войдите через Google zkLogin.');
      return;
    }
    if (!routePool) {
      setError('Откройте страницу конкретного пула.');
      return;
    }
    if (!routePool.coin_type) {
      setError('У пула не настроен тип монеты.');
      return;
    }
    if (!parsedAv8Amount || parsedAv8Amount <= 0n) {
      setError('Введите сумму AV8 для вывода из пула.');
      return;
    }
    if (routePoolStakedAv8 <= 0n || routePoolAv8Stakes.length === 0) {
      setError('В этом пуле нет внесенного AV8 для вывода.');
      return;
    }
    if (routePoolStakedAv8 < parsedAv8Amount) {
      setError(`В пуле доступно только ${formatUnits(routePoolStakedAv8, AV8_DECIMALS, 6)} AV8.`);
      return;
    }

    const tx = new Transaction();
    tx.setSender(currentOwnerAddress);
    let remaining = parsedAv8Amount;
    for (const stake of routePoolAv8Stakes) {
      if (remaining <= 0n) {
        break;
      }
      if (stake.stakedAv8 <= 0n) {
        continue;
      }

      const amountFromStake = stake.stakedAv8 < remaining ? stake.stakedAv8 : remaining;
      tx.moveCall({
        target: `${FUND_MODULE_PACKAGE_ID}::pool_manager::unstake_pool_av8`,
        typeArguments: [routePool.coin_type],
        arguments: [
          tx.object(routePool.pool_object_id),
          tx.object(stake.objectId),
          tx.pure.u64(amountFromStake),
          tx.object(CLOCK_OBJECT_ID),
        ],
      });
      remaining -= amountFromStake;
    }

    await runTx('unstake-av8', tx);
  }

  async function handleWithdraw() {
    if (!currentOwnerAddress) {
      setError('Подключите Sui кошелек или войдите через Google zkLogin.');
      return;
    }
    if (!routePool) {
      setError('Откройте страницу конкретного пула.');
      return;
    }
    if (!positionId) {
      setError('Для этого кошелька не найдена FundPosition.');
      return;
    }
    if (!SUI_FUND_CONFIG.navStateId || !SUI_FUND_CONFIG.shareConfigId) {
      setError('Не настроены NavState / ShareConfig.');
      return;
    }
    const av8Amount = parseDecimalAmount(amount, AV8_DECIMALS);
    if (!av8Amount || av8Amount <= 0n) {
      setError('Введите сумму AV8 для вывода.');
      return;
    }

    const shareCoins = await fetchAllCoins(client, currentOwnerAddress, SHARE_TYPE);
    const totalBalance = shareCoins.reduce((sum, coin) => sum + BigInt(coin.balance), 0n);
    if (totalBalance < av8Amount) {
      setError('Недостаточно AV8 на кошельке.');
      return;
    }

    const tx = new Transaction();
    tx.setSender(currentOwnerAddress);
    const [av8Payment] = buildCoinPayments(tx, shareCoins, [av8Amount]);
    tx.moveCall({
      target: `${FUND_MODULE_PACKAGE_ID}::fund_core::withdraw_from_pool`,
      typeArguments: [routePool.coin_type],
      arguments: [
        tx.object(SUI_FUND_CONFIG.navStateId),
        tx.object(SUI_FUND_CONFIG.shareConfigId),
        tx.object(routePool.pool_object_id),
        tx.object(positionId),
        av8Payment,
        tx.pure.u64(0),
        tx.object(CLOCK_OBJECT_ID),
      ],
    });
    await runTx('withdraw', tx);
  }

  async function handleQuickDeposit() {
    if (!quickPool) {
      setError('Не найден default deposit route для пополнения депозита.');
      return;
    }
    const value = parseDecimalAmount(quickAmount, 6);
    if (!value || value <= 0n) {
      setError('Введите сумму депозита в USDC.');
      return;
    }
    await submitDeposit(quickPool, value, 'quick-deposit');
  }

  function handleQuickRedeemRequest() {
    if (!currentOwnerAddress) {
      setError('Подключите Sui кошелек или войдите через Google zkLogin.');
      return;
    }
    const value = parseDecimalAmount(quickAmount, AV8_DECIMALS);
    if (!value || value <= 0n) {
      setError('Введите сумму AV8 для выкупа.');
      return;
    }
    if (av8Balance < value) {
      setError('Недостаточно AV8 на кошельке.');
      return;
    }
    if (!quickPool) {
      setError('Выберите пул для заявки на выкуп.');
      return;
    }
    if (!positionId) {
      setError('Для этого кошелька не найдена FundPosition.');
      return;
    }
    const poolAccountingId = getPoolAccountingId(quickPool);
    if (!shareFeeConfigId || !poolAccountingId) {
      setError('Не настроены ShareFeeConfig или PoolAccounting для выбранного пула. Создайте их в админке и сохраните object id в БД.');
      return;
    }

    void (async () => {
      const shareCoins = await fetchAllCoins(client, currentOwnerAddress, SHARE_TYPE);
      const totalBalance = shareCoins.reduce((sum, coin) => sum + BigInt(coin.balance), 0n);
      if (totalBalance < value) {
        setError('Недостаточно AV8 на кошельке.');
        return;
      }

      const tx = new Transaction();
      tx.setSender(currentOwnerAddress);
      const [av8Payment] = buildCoinPayments(tx, shareCoins, [value]);
      tx.moveCall({
        target: `${FUND_MODULE_PACKAGE_ID}::fund_core::request_withdraw_from_pool`,
        typeArguments: [quickPool.coin_type],
        arguments: [
          tx.object(SUI_FUND_CONFIG.navStateId),
          tx.object(SUI_FUND_CONFIG.shareConfigId),
          tx.object(shareFeeConfigId),
          tx.object(quickPool.pool_object_id),
          tx.object(poolAccountingId),
          tx.object(positionId),
          av8Payment,
          tx.object(CLOCK_OBJECT_ID),
        ],
      });
      await runTx('withdraw-request', tx);
    })().catch((err) => setError(err instanceof Error ? err.message : String(err)));
  }

  async function handleClaimRedeemRequest(request: PoolWithdrawRequestRecord) {
    if (!currentOwnerAddress) {
      setError('Подключите Sui кошелек или войдите через Google zkLogin.');
      return;
    }
    const pool = activePools.find((item) => normalizeSwapWalletAddress(item.pool_object_id) === normalizeSwapWalletAddress(request.poolId));
    if (!pool) {
      setError('Пул для этой заявки не найден в активных пулах.');
      return;
    }
    if (BigInt(Date.now()) < request.availableAtMs) {
      setError(`Заявка будет доступна ${formatDateTime(Number(request.availableAtMs))}.`);
      return;
    }
    const poolAccountingId = getPoolAccountingId(pool);
    if (!poolAccountingId) {
      setError('Для этого пула не сохранен PoolAccounting object id.');
      return;
    }

    const tx = new Transaction();
    tx.setSender(currentOwnerAddress);
    tx.moveCall({
      target: `${FUND_MODULE_PACKAGE_ID}::fund_core::claim_pool_withdrawal`,
      typeArguments: [pool.coin_type],
      arguments: [
        tx.object(pool.pool_object_id),
        tx.object(poolAccountingId),
        tx.object(request.objectId),
        tx.object(CLOCK_OBJECT_ID),
      ],
    });
    await runTx('withdraw-claim', tx);
  }

  const walletCanSign = signingRoute.useExtension || signingRoute.useZkLogin;
  const walletLabel = currentOwnerAddress ? shortId(currentOwnerAddress) : 'Not connected';
  const availableLabel = formMode === 'deposit'
    ? depositAssetMode === 'av8'
      ? `${formatUnits(av8Balance, AV8_DECIMALS)} AV8`
      : `${formatUnits(balance, 6)} ${routePool?.symbol || 'USDC'}`
    : depositAssetMode === 'av8'
      ? `${formatUnits(routePoolStakedAv8, AV8_DECIMALS, 6)} AV8`
      : `${formatUnits(av8Balance, AV8_DECIMALS)} AV8`;
  const receiveLabel = formMode === 'deposit'
    ? depositAssetMode === 'av8'
      ? `${formatUnits(parsedAv8Amount || 0n, AV8_DECIMALS, 6)} AV8 = ${formatUnits(av8StakeValueUsdc, 6, 6)} USDC`
      : `${formatUnits(expectedAv8, AV8_DECIMALS)} AV8`
    : depositAssetMode === 'av8'
      ? `${formatUnits(parsedAv8Amount || 0n, AV8_DECIMALS, 6)} AV8 = ${formatUnits(expectedUsdc, 6, 6)} USDC`
      : `${formatUnits(expectedUsdc, 6)} ${routePool?.symbol || 'USDC'}`;
  const submitLabel = formMode === 'deposit'
    ? (depositAssetMode === 'av8' ? 'Внести AV8' : 'Внести USDC')
    : depositAssetMode === 'av8'
      ? 'Вывести AV8'
      : 'Забрать USDC';
  const completedDepositLabel = formMode === 'deposit' && lastDepositAmountLabel ? `Внесено ${lastDepositAmountLabel}` : null;
  const selectedWalletRequiresZkLogin = selectedLinkedWallet?.web3auth === 1;
  const canSubmit = Boolean(
    routePool
    && currentOwnerAddress
    && walletCanSign
    && (formMode !== 'deposit' || depositAssetMode !== 'usdc' || depositCoinType)
    && !busy
    && (formMode !== 'deposit' || depositAssetMode !== 'usdc' || hasRoutePoolAccess),
  );
  const quickParsedAmount = parseDecimalAmount(quickAmount, quickMode === 'deposit' ? 6 : AV8_DECIMALS) ?? 0n;
  const quickMintFee = quickMode === 'deposit' ? applyBps(quickParsedAmount, shareSettings?.mint_fee_bps ?? 0) : 0n;
  const quickNetDeposit = quickParsedAmount > quickMintFee ? quickParsedAmount - quickMintFee : 0n;
  const quickExpectedAv8 = quickMode === 'deposit'
    ? quickNetDeposit * (10n ** BigInt(AV8_DECIMALS)) / navPriceUsdc
    : 0n;
  const quickGrossRedeemUsdc = quickMode === 'redeem'
    ? quickParsedAmount * navPriceUsdc / (10n ** BigInt(AV8_DECIMALS))
    : 0n;
  const quickRedeemFee = quickMode === 'redeem' ? applyBps(quickGrossRedeemUsdc, shareSettings?.redeem_fee_bps ?? 0) : 0n;
  const quickExpectedRedeemUsdc = quickGrossRedeemUsdc > quickRedeemFee ? quickGrossRedeemUsdc - quickRedeemFee : 0n;
  const quickCanSubmit = Boolean(currentOwnerAddress && walletCanSign && !busy && (quickMode === 'redeem' ? quickPool : quickPool?.basket_vault_id));

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
          <div className="mx-auto grid max-w-7xl gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(450px,520px)]">
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
                  <div className="text-xs uppercase tracking-[0.14em] text-slate-500">Уровень AV8</div>
                  <div className="mt-2 text-lg font-semibold text-white">{formatUnits(BigInt(routePool.min_av8_balance || '0'), AV8_DECIMALS, 6)} AV8</div>
                </div>
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4">
                  <div className="text-xs uppercase tracking-[0.14em] text-slate-500">Realized APY</div>
                  <div className="mt-2 text-lg font-semibold text-white">{formatBps(routePool.realized_apy_bps)}</div>
                </div>
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4">
                  <div className="text-xs uppercase tracking-[0.14em] text-slate-500">Min deposit</div>
                  <div className="mt-2 text-lg font-semibold text-white">{formatUnits(minDepositAmount, 6, 6)} {routePool.symbol}</div>
                </div>
              </div>
            </div>

            <aside className="h-fit space-y-4">
              <section className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-2xl sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Доступный кошелек</div>
                    <div className="mt-2 text-xl font-semibold text-white">{walletLabel}</div>
                  </div>
                  <div className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${walletCanSign ? 'bg-emerald-400/10 text-emerald-200' : 'bg-amber-400/10 text-amber-100'}`}>
                    {walletCanSign
                      ? selectedLinkedWallet?.web3auth === 1
                        ? 'zkLogin'
                        : 'wallet'
                      : 'no signer'}
                  </div>
                </div>

                <label className="mt-5 block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Кошельки аккаунта Google
                  </span>
                  {suiLinked.length > 0 ? (
                    <select
                      value={selectedSuiAddress}
                      onChange={(event) => setSelectedSuiAddress(event.target.value)}
                      className="h-12 w-full rounded-xl border border-white/[0.09] bg-slate-950/70 px-3 text-sm font-semibold text-slate-100 outline-none transition focus:border-teal-300/40"
                    >
                      {suiLinked.map((wallet) => {
                        const address = normalizeSwapWalletAddress(wallet.address);
                        return (
                          <option key={`${address}-${wallet.web3auth ?? 'wallet'}`} value={address}>
                            {wallet.web3auth === 1 ? 'Google zkLogin' : 'Sui wallet'} - {shortId(address)}
                          </option>
                        );
                      })}
                    </select>
                  ) : (
                    <div className="rounded-xl border border-amber-300/15 bg-amber-400/10 p-3 text-sm leading-6 text-amber-100">
                      {hasGoogleIdentity
                        ? 'К аккаунту Google пока не привязан Sui-кошелек.'
                        : 'Войдите через Google в portfolio, чтобы увидеть привязанные кошельки.'}
                    </div>
                  )}
                </label>

                {linkedWalletsError ? (
                  <div className="mt-3 rounded-xl border border-rose-300/15 bg-rose-400/10 p-3 text-sm text-rose-100">
                    {linkedWalletsError}
                  </div>
                ) : null}

                <div className="mt-4 grid grid-cols-2 rounded-xl border border-white/[0.08] bg-slate-950/60 p-1">
                  {[
                    ['deposit', 'Добавить'],
                    ['withdraw', 'Забрать'],
                  ].map(([mode, label]) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => {
                        const nextMode = mode as 'deposit' | 'withdraw';
                        setFormMode(nextMode);
                        setError(null);
                        setNotice(null);
                        setLastDepositAmountLabel(null);
                        setAmountEdited(false);
                        setDepositAssetMode(nextMode === 'deposit' && requiredAv8Balance === 0n ? 'usdc' : 'av8');
                      }}
                      className={`h-10 rounded-lg text-sm font-semibold transition ${
                        formMode === mode
                          ? 'bg-teal-300 text-slate-950'
                          : 'text-slate-300 hover:bg-white/[0.05] hover:text-white'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div className="mt-4 grid grid-cols-2 rounded-xl border border-white/[0.08] bg-slate-950/60 p-1">
                  {[
                    ['av8', 'AV8'],
                    ['usdc', 'USDC'],
                  ].map(([mode, label]) => {
                    const disabled = formMode === 'deposit' && mode === 'usdc' && !hasRoutePoolAccess;
                    return (
                      <button
                        key={mode}
                        type="button"
                        disabled={disabled}
                        onClick={() => {
                          const nextMode = mode as 'av8' | 'usdc';
                          setDepositAssetMode(nextMode);
                          setAmountEdited(false);
                          setError(null);
                          setNotice(null);
                          setLastDepositAmountLabel(null);
                        }}
                        className={`h-10 rounded-lg text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-45 ${
                          depositAssetMode === mode
                            ? 'bg-teal-300 text-slate-950'
                            : 'text-slate-300 hover:bg-white/[0.05] hover:text-white'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>

                {formMode === 'deposit' && requiredAv8Balance > 0n ? (
                  <div className="mt-4 rounded-2xl border border-white/[0.08] bg-slate-950/50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">AV8 в пуле</div>
                    <div className="mt-2 text-lg font-semibold text-white">
                      {formatUnits(routePoolStakedAv8, AV8_DECIMALS, 6)} / {formatUnits(requiredAv8Balance, AV8_DECIMALS, 6)} AV8
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      Внесено: {formatUnits(routePoolStakedValueUsdc, 6, 6)} USDC по NAV на момент внесения.
                    </div>
                  </div>
                ) : null}

                <div className="mt-4 rounded-2xl border border-sky-400/18 bg-sky-400/10 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-100/75">
                    {formMode === 'deposit'
                      ? (depositAssetMode === 'av8' ? 'Доступно AV8' : 'Доступно USDC')
                      : depositAssetMode === 'av8'
                        ? 'AV8 в пуле'
                        : 'Доступно AV8'}
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-white">
                    {loading && currentOwnerAddress ? messages.invest.depositLoading : availableLabel}
                  </div>
                </div>

                <label className="mt-4 block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    {formMode === 'deposit'
                      ? (depositAssetMode === 'av8' ? 'Внести AV8' : 'Внести USDC')
                      : depositAssetMode === 'av8'
                        ? 'Вывести AV8 из пула'
                        : 'Забрать USDC'}
                  </span>
                  <div className="flex overflow-hidden rounded-xl border border-white/[0.09] bg-slate-950/70 focus-within:border-teal-300/40">
                    <input
                      value={amount}
                      onChange={(event) => {
                        setAmount(event.target.value);
                        setAmountEdited(true);
                        setLastDepositAmountLabel(null);
                      }}
                      inputMode="decimal"
                      className="h-12 min-w-0 flex-1 bg-transparent px-3 text-sm text-slate-100 outline-none"
                    />
                    <div className="flex items-center border-l border-white/[0.08] px-3 text-sm font-semibold text-slate-300">
                      {formMode === 'deposit' ? (depositAssetMode === 'av8' ? 'AV8' : routePool.symbol) : 'AV8'}
                    </div>
                  </div>
                  {formMode === 'deposit' && depositAssetMode === 'usdc' && minDepositAmount > 0n ? (
                    <div className="mt-2 text-xs text-slate-500">
                      Минимальный депозит: {formatUnits(minDepositAmount, 6, 6)} {routePool.symbol}
                    </div>
                  ) : null}
                  {formMode === 'deposit' && depositAssetMode === 'av8' && requiredAv8Balance > 0n ? (
                    <div className="mt-2 text-xs text-slate-500">
                      Минимум для входа: {formatUnits(requiredAv8Balance, AV8_DECIMALS, 6)} AV8.
                    </div>
                  ) : null}
                  {formMode === 'deposit' && depositAssetMode === 'usdc' && !hasRoutePoolAccess ? (
                    <div className="mt-2 text-xs text-amber-200">
                      Сначала внесите минимум {formatUnits(requiredAv8Balance, AV8_DECIMALS, 6)} AV8 в пул.
                    </div>
                  ) : null}
                  {formMode === 'withdraw' && depositAssetMode === 'av8' ? (
                    <div className="mt-2 text-xs text-slate-500">
                      Доступно к выводу из пула: {formatUnits(routePoolStakedAv8, AV8_DECIMALS, 6)} AV8.
                    </div>
                  ) : null}
                </label>

                <div className="mt-4 rounded-2xl border border-white/[0.08] bg-slate-950/50 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Получим</div>
                  <div className="mt-2 text-xl font-semibold text-white">{receiveLabel}</div>
                </div>

                {notice ? (
                  <div className="mt-4 rounded-2xl border border-emerald-300/15 bg-emerald-400/10 p-3 text-sm leading-6 text-emerald-100">
                    {notice}
                  </div>
                ) : null}

                {error ? (
                  <div className="mt-4 rounded-2xl border border-rose-300/15 bg-rose-400/10 p-3 text-sm leading-6 text-rose-100">
                    {error}
                  </div>
                ) : null}

                {lastDigest ? (
                  <div className="mt-4 break-all rounded-2xl border border-sky-300/15 bg-sky-400/10 p-3 font-mono text-xs text-sky-100">
                    tx: {lastDigest}
                  </div>
                ) : null}

                <div className="mt-5 grid gap-3">
                  {selectedWalletRequiresZkLogin ? (
                    <a
                      href={`${getBasePath() === '/' ? '' : getBasePath()}/portfolio`}
                      className="inline-flex h-11 items-center justify-center rounded-xl border border-teal-300/25 bg-teal-400/10 px-4 text-sm font-semibold text-teal-100 transition hover:bg-teal-400/15"
                    >
                      Google zkLogin
                    </a>
                  ) : (
                    <ConnectButton />
                  )}

                  <button
                    type="button"
                    onClick={() => void (!positionId && formMode === 'deposit' && depositAssetMode === 'usdc'
                      ? handleOpenPosition()
                      : formMode === 'deposit' && depositAssetMode === 'av8'
                        ? handleDepositAv8()
                      : formMode === 'deposit'
                          ? handleDeposit()
                          : depositAssetMode === 'av8'
                            ? handleUnstakeAv8()
                          : handleWithdraw())}
                    disabled={!canSubmit}
                    className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-teal-300 px-4 text-sm font-bold text-slate-950 transition hover:bg-teal-200 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {busy ? (busy === 'position' ? 'Создание...' : 'Подпись...') : completedDepositLabel || (!positionId && formMode === 'deposit' && depositAssetMode === 'usdc' ? 'Создать FundPosition' : submitLabel)}
                  </button>
                </div>
              </section>

              {activePools.length > 1 ? (
                <label className="block rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Другой пул
                  </span>
                  <select
                    value={routePool.pool_object_id}
                    onChange={(event) => {
                      const nextPool = activePools.find((pool) => pool.pool_object_id === event.target.value);
                      if (nextPool) {
                        window.location.href = getPoolHref(nextPool);
                      }
                    }}
                    className="h-11 w-full rounded-xl border border-white/[0.09] bg-slate-950/70 px-3 text-sm font-semibold text-slate-100 outline-none transition focus:border-teal-300/40"
                  >
                    {activePools.map((pool) => (
                      <option key={pool.pool_object_id || pool.id} value={pool.pool_object_id}>
                        {pool.name} - {pool.symbol} - {formatBps(pool.target_apy_bps)}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </aside>
          </div>
        ) : poolObjectId && !loading ? (
          <div className="mx-auto max-w-7xl rounded-2xl border border-amber-300/20 bg-amber-400/[0.08] p-5 text-sm text-amber-100">
            Пул не найден или выключен. <a className="font-semibold underline" href={investRoot}>Вернуться к таблице пулов</a>.
          </div>
        ) : (
          <div className="mx-auto max-w-7xl space-y-6">
            <section className="rounded-[2rem] border border-white/[0.08] bg-white/[0.04] p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
              <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
                <div>
                  <div className="text-sm uppercase tracking-[0.18em] text-teal-200">AV8 fund token</div>
                  <h2 className="mt-2 text-2xl font-semibold text-white">Внести депозит и получить AV8</h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                    Депозит минтит AV8 как долю в капитале фонда. Выкуп AV8 оформляется заявкой с задержкой {REDEEM_DELAY_DAYS} дня, чтобы фонд успел вернуть ликвидность из рабочих стратегий.
                  </p>

                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-white/[0.08] bg-slate-950/45 p-4">
                      <div className="text-xs uppercase tracking-[0.16em] text-slate-500">NAV AV8</div>
                      <div className="mt-2 text-lg font-semibold text-white">{formatUnits(navPriceUsdc, 6, 6)} USDC</div>
                    </div>
                    <div className="rounded-2xl border border-white/[0.08] bg-slate-950/45 p-4">
                      <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Комиссия выпуска</div>
                      <div className="mt-2 text-lg font-semibold text-white">{formatBps(shareSettings?.mint_fee_bps ?? 0)}</div>
                    </div>
                    <div className="rounded-2xl border border-white/[0.08] bg-slate-950/45 p-4">
                      <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Комиссия выкупа</div>
                      <div className="mt-2 text-lg font-semibold text-white">{formatBps(shareSettings?.redeem_fee_bps ?? 0)}</div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/[0.08] bg-slate-950/65 p-4">
                  <div className="grid grid-cols-2 rounded-xl border border-white/[0.08] bg-slate-950/60 p-1">
                    {[
                      ['deposit', 'Внести'],
                      ['redeem', 'Выкуп'],
                    ].map(([mode, label]) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => {
                          setQuickMode(mode as 'deposit' | 'redeem');
                          setQuickAmount('');
                          setError(null);
                          setNotice(null);
                        }}
                        className={`h-10 rounded-lg text-sm font-semibold transition ${
                          quickMode === mode ? 'bg-teal-300 text-slate-950' : 'text-slate-300 hover:bg-white/[0.05] hover:text-white'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <label className="mt-4 block">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Доступный кошелек</span>
                    {suiLinked.length > 0 ? (
                      <select
                        value={selectedSuiAddress}
                        onChange={(event) => setSelectedSuiAddress(event.target.value)}
                        className="h-11 w-full rounded-xl border border-white/[0.09] bg-slate-950/70 px-3 text-sm font-semibold text-slate-100 outline-none transition focus:border-teal-300/40"
                      >
                        {suiLinked.map((wallet) => {
                          const address = normalizeSwapWalletAddress(wallet.address);
                          return (
                            <option key={`${address}-${wallet.web3auth ?? 'wallet'}`} value={address}>
                              {wallet.web3auth === 1 ? 'Google zkLogin' : 'Sui wallet'} - {shortId(address)}
                            </option>
                          );
                        })}
                      </select>
                    ) : (
                      <div className="rounded-xl border border-amber-300/15 bg-amber-400/10 p-3 text-sm leading-6 text-amber-100">
                        Войдите через Google в portfolio, чтобы увидеть привязанные кошельки.
                      </div>
                    )}
                  </label>

                  <div className="mt-4 rounded-2xl border border-sky-400/18 bg-sky-400/10 p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-100/75">
                      {quickMode === 'deposit' ? 'Доступно USDC' : 'Доступно AV8'}
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-white">
                      {quickMode === 'deposit'
                        ? `${formatUnits(balance, 6, 6)} USDC`
                        : `${formatUnits(av8Balance, AV8_DECIMALS, 6)} AV8`}
                    </div>
                  </div>

                  <label className="mt-4 block">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      {quickMode === 'deposit' ? 'Сумма депозита' : 'Сумма AV8 к выкупу'}
                    </span>
                    <div className="flex overflow-hidden rounded-xl border border-white/[0.09] bg-slate-950/70 focus-within:border-teal-300/40">
                      <input
                        value={quickAmount}
                        onChange={(event) => setQuickAmount(event.target.value.replace(/[^\d.,]/g, ''))}
                        inputMode="decimal"
                        className="h-12 min-w-0 flex-1 bg-transparent px-3 text-sm text-slate-100 outline-none"
                        placeholder="0.00"
                      />
                      <div className="flex items-center border-l border-white/[0.08] px-3 text-sm font-semibold text-slate-300">
                        {quickMode === 'deposit' ? 'USDC' : 'AV8'}
                      </div>
                    </div>
                  </label>

                  <div className="mt-4 rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      {quickMode === 'deposit' ? 'Получим AV8' : 'Получим USDC после задержки'}
                    </div>
                    <div className="mt-2 text-xl font-semibold text-white">
                      {quickMode === 'deposit'
                        ? `${formatUnits(quickExpectedAv8, AV8_DECIMALS, 6)} AV8`
                        : `${formatUnits(quickExpectedRedeemUsdc, 6, 6)} USDC`}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {quickMode === 'deposit'
                        ? `Комиссия: ${formatUnits(quickMintFee, 6, 6)} USDC`
                        : `Комиссия: ${formatUnits(quickRedeemFee, 6, 6)} USDC · доступно через ${REDEEM_DELAY_DAYS} дня`}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3">
                    {selectedWalletRequiresZkLogin ? (
                      <a
                        href={`${getBasePath() === '/' ? '' : getBasePath()}/portfolio`}
                        className="inline-flex h-11 items-center justify-center rounded-xl border border-teal-300/25 bg-teal-400/10 px-4 text-sm font-semibold text-teal-100 transition hover:bg-teal-400/15"
                      >
                        Google zkLogin
                      </a>
                    ) : (
                      <ConnectButton />
                    )}
                    <button
                      type="button"
                      onClick={() => void (!positionId && quickMode === 'deposit' ? handleOpenPosition() : quickMode === 'deposit' ? handleQuickDeposit() : handleQuickRedeemRequest())}
                      disabled={!quickCanSubmit}
                      className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-teal-300 px-4 text-sm font-bold text-slate-950 transition hover:bg-teal-200 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {busy ? (busy === 'position' ? 'Создание...' : 'Подпись...') : !positionId && quickMode === 'deposit' ? 'Создать FundPosition' : quickMode === 'deposit' ? 'Внести' : 'Создать заявку на выкуп'}
                    </button>
                  </div>
                </div>
              </div>

              {onChainRedeemRequests.length > 0 || redeemRequests.length > 0 ? (
                <div className="mt-5 rounded-2xl border border-white/[0.08] bg-slate-950/45 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Заявки на выкуп</div>
                  <div className="mt-3 grid gap-2">
                    {onChainRedeemRequests.map((request) => {
                      const ready = BigInt(Date.now()) >= request.availableAtMs;
                      return (
                        <div key={request.objectId} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white/[0.035] px-3 py-3 text-sm">
                          <div>
                            <div className="text-slate-300">
                              {formatUnits(request.burnedAv8, AV8_DECIMALS, 6)} AV8 → {formatUnits(request.amountUsdc, 6, 6)} USDC
                            </div>
                            <div className="mt-1 font-mono text-xs text-slate-600">{shortId(request.objectId)}</div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-slate-500">Доступно: {formatDateTime(Number(request.availableAtMs))}</div>
                            <button
                              type="button"
                              onClick={() => void handleClaimRedeemRequest(request)}
                              disabled={!ready || Boolean(busy)}
                              className="inline-flex h-9 items-center justify-center rounded-lg border border-teal-300/25 bg-teal-300/10 px-3 text-xs font-bold text-teal-100 transition hover:bg-teal-300/15 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Получить
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    {redeemRequests.map((request) => (
                      <div key={request.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white/[0.035] px-3 py-3 text-sm">
                        <div className="text-slate-300">{request.amountAv8} AV8 → {request.expectedUsdc} USDC</div>
                        <div className="text-slate-500">Доступно: {formatDateTime(request.availableAt)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </section>

            {notice ? (
              <div className="rounded-2xl border border-emerald-300/15 bg-emerald-400/10 p-4 text-sm leading-6 text-emerald-100">
                {notice}
              </div>
            ) : null}

            {error ? (
              <div className="rounded-2xl border border-rose-300/15 bg-rose-400/10 p-4 text-sm leading-6 text-rose-100">
                {error}
              </div>
            ) : null}

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

            <InvestPoolsTable pools={activePools} />

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
