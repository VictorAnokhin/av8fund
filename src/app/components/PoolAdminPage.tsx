import React from 'react';
import { ConnectButton, useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { ArrowDown, Database, Plus, RefreshCw, Save, Trash2 } from 'lucide-react';

import { SUI_NETWORK } from '../config';
import {
  deleteFundPool,
  getFundPools,
  getRwaAdminCaps,
  saveFundPool,
  type FundPoolInput,
  type FundPoolRecord,
  type RwaAdminCapRecord,
} from '../lib/api';
import { getBasePath, getPoolAdminDetailPath, getPoolAdminPath } from '../lib/routes';
import { SUI_FUND_CONFIG } from '../lib/suiFund';
import { PageBreadcrumbsBar, PageHeroBadge, PageHeroShell } from './PageChrome';

const inputClass =
  'h-11 w-full rounded-xl border border-white/[0.09] bg-white/[0.04] px-3 text-sm text-slate-100 outline-none transition focus:border-teal-300/40 focus:bg-white/[0.07]';
const textareaClass =
  'min-h-24 w-full resize-y rounded-xl border border-white/[0.09] bg-white/[0.04] px-3 py-3 text-sm leading-6 text-slate-100 outline-none transition focus:border-teal-300/40 focus:bg-white/[0.07]';
const USDC_DECIMALS = 6;
const AV8_DECIMALS = 9;
const MAX_BPS = 10_000;

type PoolAdminPageProps = {
  poolId?: string;
};

type CoinLike = {
  coinObjectId: string;
  balance: string;
};

type LiquidityBalances = {
  poolBalance: bigint | null;
  accountingDeployed: bigint | null;
  vaultBalance: bigint | null;
  walletBalance: bigint | null;
  walletAddress: string;
};

const EMPTY_FORM: FundPoolInput = {
  network: SUI_NETWORK || 'testnet',
  packageId: SUI_FUND_CONFIG.packageId,
  poolRegistryId: SUI_FUND_CONFIG.poolRegistryId,
  poolAdminCapId: SUI_FUND_CONFIG.poolAdminCapId,
  poolObjectId: '',
  poolAccountingId: '',
  basketVaultId: '',
  liquidityWalletAddress: '',
  coinType: SUI_FUND_CONFIG.usdcType,
  symbol: 'USDC',
  name: 'Balanced RWA Pool',
  description: 'Core USDC pool for diversified RWA allocation.',
  riskLevel: 2,
  targetApyBps: 1200,
  realizedApyBps: 0,
  minDepositUsdc: '1000000',
  minAv8Balance: '0',
  maxWeightBps: 5000,
  active: true,
  isDefaultDeposit: false,
  logoUrl: 'https://assets.coingecko.com/coins/images/6319/large/usdc.png',
  notes: '',
};

function normalizeAddress(value?: string | null): string {
  const trimmed = String(value || '').trim().toLowerCase();
  const match = trimmed.match(/^0x([a-f0-9]{1,64})$/);
  return match ? `0x${match[1].padStart(64, '0')}` : trimmed;
}

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

function bpsToPercent(value: number): string {
  return `${(Number(value || 0) / 100).toFixed(2)}%`;
}

function assertBps(value: number, label: string) {
  if (!Number.isFinite(value) || value < 0 || value > MAX_BPS) {
    throw new Error(`${label}: укажите значение от 0 до 10000 bps. 10000 bps = 100%, 1200 bps = 12%.`);
  }
}

function parseUsdcAmount(value: string): string | null {
  return parseTokenAmount(value, USDC_DECIMALS);
}

function parseAv8Amount(value: string): string | null {
  return parseTokenAmount(value, AV8_DECIMALS);
}

function parseTokenAmount(value: string, decimals: number): string | null {
  const normalized = value.trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    return null;
  }

  const [whole, fraction = ''] = normalized.split('.');
  if (fraction.length > decimals) {
    return null;
  }

  const units = BigInt(whole || '0') * 10n ** BigInt(decimals) + BigInt((fraction.padEnd(decimals, '0') || '0'));
  return units.toString();
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

function buildCoinArgument(tx: Transaction, coins: CoinLike[], amount: bigint) {
  if (coins.length === 0) {
    throw new Error('В кошельке нет монет выбранного типа для возврата ликвидности.');
  }

  const primaryCoin = tx.object(coins[0].coinObjectId);
  if (coins.length > 1) {
    tx.mergeCoins(primaryCoin, coins.slice(1).map((coin) => tx.object(coin.coinObjectId)));
  }
  const totalBalance = coins.reduce((sum, coin) => sum + BigInt(coin.balance), 0n);
  if (totalBalance < amount) {
    throw new Error('Недостаточно USDC в кошельке для возврата ликвидности в пул.');
  }
  if (amount === totalBalance) {
    return primaryCoin;
  }
  const [splitCoin] = tx.splitCoins(primaryCoin, [tx.pure.u64(amount)]);
  return splitCoin;
}

function formatUsdcUnits(value: string): string {
  return formatTokenUnits(value, USDC_DECIMALS);
}

function formatAv8Units(value: string): string {
  return formatTokenUnits(value, AV8_DECIMALS);
}

function formatTokenUnits(value: string, decimals: number): string {
  if (!/^\d+$/.test(value || '')) {
    return '';
  }

  const units = BigInt(value);
  const base = 10n ** BigInt(decimals);
  const whole = units / base;
  const fraction = (units % base).toString().padStart(decimals, '0').replace(/0+$/, '');
  return `${whole.toString()}${fraction ? `.${fraction}` : ''}`;
}

function formatUsdcBalance(value: bigint | null): string {
  return value === null ? 'не доступно' : `${formatUsdcUnits(value.toString()) || '0'} USDC`;
}

function readObjectBalance(objectData: unknown, field = 'balance'): bigint | null {
  const fields = asRecord(asRecord(asRecord(objectData).content).fields);
  if (!(field in fields)) {
    return null;
  }
  return readBigInt(fields[field]);
}

function recordToForm(record: FundPoolRecord): FundPoolInput {
  return {
    network: record.network,
    packageId: record.package_id || SUI_FUND_CONFIG.packageId,
    poolRegistryId: record.pool_registry_id || SUI_FUND_CONFIG.poolRegistryId,
    poolAdminCapId: record.pool_admin_cap_id || SUI_FUND_CONFIG.poolAdminCapId,
    poolObjectId: record.pool_object_id,
    poolAccountingId: record.pool_accounting_id || '',
    basketVaultId: record.basket_vault_id || '',
    liquidityWalletAddress: record.liquidity_wallet_address || '',
    coinType: record.coin_type,
    symbol: record.symbol,
    name: record.name,
    description: record.description,
    riskLevel: record.risk_level,
    targetApyBps: record.target_apy_bps,
    realizedApyBps: record.realized_apy_bps,
    minDepositUsdc: record.min_deposit_usdc,
    minAv8Balance: record.min_av8_balance || '0',
    maxWeightBps: record.max_weight_bps,
    active: record.active,
    isDefaultDeposit: Boolean(record.is_default_deposit),
    logoUrl: record.logo_url,
    notes: record.notes,
  };
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function extractCreatedPoolId(result: unknown, coinType: string): string {
  const changes = Array.isArray(asRecord(result).objectChanges) ? asRecord(result).objectChanges as unknown[] : [];
  const poolChange = changes.find((change) => {
    if (!change || typeof change !== 'object' || !('type' in change) || change.type !== 'created') {
      return false;
    }
    const objectType = 'objectType' in change ? String(change.objectType || '') : '';
    return objectType.includes('::pool_manager::Pool<') && objectType.includes(coinType);
  });
  if (!poolChange || typeof poolChange !== 'object' || !('objectId' in poolChange)) {
    return '';
  }
  return String(poolChange.objectId || '');
}

function extractCreatedPoolAccountingId(result: unknown): string {
  const changes = Array.isArray(asRecord(result).objectChanges) ? asRecord(result).objectChanges as unknown[] : [];
  const accountingChange = changes.find((change) => {
    if (!change || typeof change !== 'object' || !('type' in change) || change.type !== 'created') {
      return false;
    }
    const objectType = 'objectType' in change ? String(change.objectType || '') : '';
    return objectType.includes('::pool_manager::PoolAccounting');
  });
  if (!accountingChange || typeof accountingChange !== 'object' || !('objectId' in accountingChange)) {
    return '';
  }
  return String(accountingChange.objectId || '');
}

export function PoolAdminPage({ poolId }: PoolAdminPageProps) {
  const homeHref = getBasePath();
  const poolsHref = getPoolAdminPath();
  const account = useCurrentAccount();
  const client = useSuiClient();
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const adminAddress = normalizeAddress(account?.address || '');

  const [pools, setPools] = React.useState<FundPoolRecord[]>([]);
  const [adminCaps, setAdminCaps] = React.useState<RwaAdminCapRecord[]>([]);
  const [form, setForm] = React.useState<FundPoolInput>(EMPTY_FORM);
  const [minDepositUsdcInput, setMinDepositUsdcInput] = React.useState(() => formatUsdcUnits(EMPTY_FORM.minDepositUsdc));
  const [minAv8BalanceInput, setMinAv8BalanceInput] = React.useState(() => formatAv8Units(EMPTY_FORM.minAv8Balance));
  const [editingId, setEditingId] = React.useState<number | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [lastDigest, setLastDigest] = React.useState<string | null>(null);
  const [liquidityPoolId, setLiquidityPoolId] = React.useState('');
  const [liquidityAmount, setLiquidityAmount] = React.useState('');
  const [liquidityRecipient, setLiquidityRecipient] = React.useState('');
  const [liquidityBalances, setLiquidityBalances] = React.useState<LiquidityBalances | null>(null);
  const [liquidityBalancesLoading, setLiquidityBalancesLoading] = React.useState(false);
  const [liquidityDirection, setLiquidityDirection] = React.useState<'pool-to-vault' | 'vault-to-pool'>('pool-to-vault');
  const [sidePanelTab, setSidePanelTab] = React.useState<'form' | 'liquidity'>('form');

  const detailMode = poolId !== undefined;
  const isNewPoolPage = poolId === 'new';
  const selectedDetailPool = React.useMemo(() => {
    if (!poolId || isNewPoolPage) {
      return null;
    }
    const normalizedPoolId = normalizeAddress(poolId);
    return pools.find((pool) => String(pool.id) === poolId || normalizeAddress(pool.pool_object_id) === normalizedPoolId) || null;
  }, [isNewPoolPage, poolId, pools]);

  const selectedLiquidityPool = React.useMemo(() => {
    return selectedDetailPool
      || pools.find((pool) => pool.pool_object_id === liquidityPoolId)
      || pools.find((pool) => pool.pool_object_id === form.poolObjectId)
      || null;
  }, [form.poolObjectId, liquidityPoolId, pools, selectedDetailPool]);

  const hasAdminAccess = React.useMemo(
    () => Boolean(adminAddress && adminCaps.some((cap) => normalizeAddress(cap.owner_address) === adminAddress)),
    [adminAddress, adminCaps],
  );
  const poolLiquidityLabel = selectedLiquidityPool
    ? `${selectedLiquidityPool.name} (${shortId(selectedLiquidityPool.pool_object_id)})`
    : 'Пул не выбран';
  const vaultLiquidityLabel = selectedLiquidityPool
    ? `${selectedLiquidityPool.name} (${selectedLiquidityPool.basket_vault_id ? shortId(selectedLiquidityPool.basket_vault_id) : 'vault не привязан'})`
    : 'Контейнер не выбран';
  const poolLiquidityBalance = liquidityBalancesLoading ? '...' : formatUsdcBalance(liquidityBalances?.poolBalance ?? null);
  const vaultLiquidityBalance = liquidityBalancesLoading ? '...' : formatUsdcBalance(liquidityBalances?.vaultBalance ?? null);
  const liquidityTop = liquidityDirection === 'pool-to-vault'
    ? { title: 'Текущий пул', label: poolLiquidityLabel, balance: poolLiquidityBalance }
    : { title: 'Связанный контейнер', label: vaultLiquidityLabel, balance: vaultLiquidityBalance };
  const liquidityBottom = liquidityDirection === 'pool-to-vault'
    ? { title: 'Связанный контейнер', label: vaultLiquidityLabel, balance: vaultLiquidityBalance }
    : { title: 'Текущий пул', label: poolLiquidityLabel, balance: poolLiquidityBalance };

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [nextPools, nextCaps] = await Promise.all([
        getFundPools({ network: SUI_NETWORK, packageId: SUI_FUND_CONFIG.packageId, includeInactive: true }),
        getRwaAdminCaps({ network: SUI_NETWORK }),
      ]);
      setPools(nextPools);
      setAdminCaps(nextCaps);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void load();
  }, []);

  React.useEffect(() => {
    if (!detailMode) {
      return;
    }

    if (isNewPoolPage) {
      setEditingId(null);
      setForm(EMPTY_FORM);
      setMinDepositUsdcInput(formatUsdcUnits(EMPTY_FORM.minDepositUsdc));
      setMinAv8BalanceInput(formatAv8Units(EMPTY_FORM.minAv8Balance));
      setLiquidityPoolId('');
      setSidePanelTab('form');
      return;
    }

    if (!selectedDetailPool) {
      return;
    }

    setEditingId(selectedDetailPool.id);
    setForm(recordToForm(selectedDetailPool));
    setMinDepositUsdcInput(formatUsdcUnits(selectedDetailPool.min_deposit_usdc));
    setMinAv8BalanceInput(formatAv8Units(selectedDetailPool.min_av8_balance || '0'));
    setLiquidityPoolId(selectedDetailPool.pool_object_id);
  }, [detailMode, isNewPoolPage, selectedDetailPool]);

  React.useEffect(() => {
    let active = true;

    async function loadLiquidityBalances() {
      const pool = selectedLiquidityPool;
      if (!pool?.pool_object_id) {
        setLiquidityBalances(null);
        return;
      }

      const walletAddress = normalizeAddress(liquidityRecipient || pool.liquidity_wallet_address || account?.address || '');
      setLiquidityBalancesLoading(true);
      try {
        const [poolObject, accountingObject, vaultObject, walletCoins] = await Promise.all([
          client.getObject({ id: pool.pool_object_id, options: { showContent: true } }).catch(() => null),
          pool.pool_accounting_id
            ? client.getObject({ id: pool.pool_accounting_id, options: { showContent: true } }).catch(() => null)
            : Promise.resolve(null),
          pool.basket_vault_id
            ? client.getObject({ id: pool.basket_vault_id, options: { showContent: true } }).catch(() => null)
            : Promise.resolve(null),
          walletAddress ? fetchAllCoins(client, walletAddress, pool.coin_type).catch(() => []) : Promise.resolve([]),
        ]);

        if (!active) {
          return;
        }

        setLiquidityBalances({
          poolBalance: poolObject?.data ? readObjectBalance(poolObject.data, 'balance') : null,
          accountingDeployed: accountingObject?.data ? readObjectBalance(accountingObject.data, 'deployed_balance_usdc') : null,
          vaultBalance: vaultObject?.data ? readObjectBalance(vaultObject.data, 'balance') : null,
          walletBalance: walletCoins.reduce((sum, coin) => sum + BigInt(coin.balance), 0n),
          walletAddress,
        });
      } finally {
        if (active) {
          setLiquidityBalancesLoading(false);
        }
      }
    }

    void loadLiquidityBalances();

    return () => {
      active = false;
    };
  }, [account?.address, client, lastDigest, liquidityRecipient, selectedLiquidityPool?.basket_vault_id, selectedLiquidityPool?.coin_type, selectedLiquidityPool?.liquidity_wallet_address, selectedLiquidityPool?.pool_accounting_id, selectedLiquidityPool?.pool_object_id]);

  function update<K extends keyof FundPoolInput>(key: K, value: FundPoolInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function buildNormalizedForm(nextForm: FundPoolInput = form): FundPoolInput {
    const minDepositUnits = parseUsdcAmount(minDepositUsdcInput);
    if (minDepositUnits === null) {
      throw new Error('Минимальный депозит укажите в USDC: например 1, 10.5 или 1,000000.');
    }
    const minAv8Units = parseAv8Amount(minAv8BalanceInput);
    if (minAv8Units === null) {
      throw new Error('Уровень AV8 укажите в AV8: например 100, 1000.5 или 1000,000000001.');
    }
    assertBps(Number(nextForm.targetApyBps || 0), 'Target APY bps');
    assertBps(Number(nextForm.realizedApyBps || 0), 'Realized APY bps');
    assertBps(Number(nextForm.maxWeightBps || 0), 'Max weight bps');

    return {
      ...nextForm,
      minDepositUsdc: minDepositUnits,
      minAv8Balance: minAv8Units,
    };
  }

  function assertAdminReady() {
    if (!account?.address) {
      throw new Error('Подключите Sui кошелек администратора.');
    }
    if (!hasAdminAccess) {
      throw new Error('Этот кошелек не найден в таблице RWA AdminCap на backend.');
    }
    if (!form.packageId || !form.poolRegistryId || !form.poolAdminCapId) {
      throw new Error('Не настроены packageId / PoolRegistry / PoolAdminCap.');
    }
    if (!form.coinType) {
      throw new Error('Укажите coin type USDC для пула.');
    }
  }

  function getPoolCallPackageId(pool?: FundPoolRecord | null): string {
    return SUI_FUND_CONFIG.modulePackageId || pool?.package_id || form.packageId || SUI_FUND_CONFIG.packageId;
  }

  async function runPoolTransaction(label: string, tx: Transaction) {
    setBusy(label);
    setError(null);
    setNotice(null);
    setLastDigest(null);
    try {
      const signed = await signAndExecuteTransaction({ transaction: tx });
      const digest = typeof signed === 'object' && signed && 'digest' in signed ? String(signed.digest) : '';
      if (!digest) {
        throw new Error('Transaction digest is missing.');
      }
      await client.waitForTransaction({ digest, options: { showEffects: true, showEvents: true } });
      setLastDigest(digest);
      await load();
      return digest;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return '';
    } finally {
      setBusy(null);
    }
  }

  async function saveToBackend(nextForm = form, nextEditingId = editingId) {
    assertAdminReady();
    const saved = await saveFundPool(buildNormalizedForm(nextForm), nextEditingId ?? undefined, { adminAddress });
    setForm(recordToForm(saved));
    setMinDepositUsdcInput(formatUsdcUnits(saved.min_deposit_usdc));
    setMinAv8BalanceInput(formatAv8Units(saved.min_av8_balance || '0'));
    setEditingId(saved.id);
    await load();
    if (detailMode && isNewPoolPage) {
      window.history.pushState({}, '', getPoolAdminDetailPath(saved.id));
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
    return saved;
  }

  async function handleCreateOnchain() {
    setBusy('create-chain');
    setError(null);
    setNotice(null);
    setLastDigest(null);
    try {
      assertAdminReady();
      const tx = new Transaction();
      tx.setSender(account!.address);
      tx.moveCall({
        target: `${getPoolCallPackageId()}::pool_manager::create_pool`,
        typeArguments: [form.coinType],
        arguments: [
          tx.object(form.poolAdminCapId || SUI_FUND_CONFIG.poolAdminCapId),
          tx.object(form.poolRegistryId || SUI_FUND_CONFIG.poolRegistryId),
          tx.pure.string(form.name),
          tx.pure.string(form.description || ''),
          tx.pure.u8(Number(form.riskLevel || 1)),
          tx.pure.u64(BigInt(Number(form.targetApyBps || 0))),
          tx.pure.u64(BigInt(buildNormalizedForm().minDepositUsdc)),
          tx.pure.u64(BigInt(Number(form.maxWeightBps || 0))),
        ],
      });
      const signed = await signAndExecuteTransaction({ transaction: tx });
      const digest = typeof signed === 'object' && signed && 'digest' in signed ? String(signed.digest) : '';
      if (!digest) {
        throw new Error('Transaction digest is missing.');
      }
      const receipt = await client.waitForTransaction({ digest, options: { showEffects: true, showObjectChanges: true, showEvents: true } });
      const poolObjectId = extractCreatedPoolId(receipt, form.coinType);
      if (!poolObjectId) {
        throw new Error('Pool object id was not found in transaction objectChanges.');
      }
      setLastDigest(digest);

      const accountingTx = new Transaction();
      accountingTx.setSender(account!.address);
      accountingTx.moveCall({
        target: `${getPoolCallPackageId()}::pool_manager::create_pool_accounting`,
        typeArguments: [form.coinType],
        arguments: [
          accountingTx.object(form.poolAdminCapId || SUI_FUND_CONFIG.poolAdminCapId),
          accountingTx.object(form.poolRegistryId || SUI_FUND_CONFIG.poolRegistryId),
          accountingTx.object(poolObjectId),
        ],
      });
      const accountingSigned = await signAndExecuteTransaction({ transaction: accountingTx });
      const accountingDigest = typeof accountingSigned === 'object' && accountingSigned && 'digest' in accountingSigned ? String(accountingSigned.digest) : '';
      if (!accountingDigest) {
        throw new Error('PoolAccounting transaction digest is missing.');
      }
      const accountingReceipt = await client.waitForTransaction({ digest: accountingDigest, options: { showEffects: true, showObjectChanges: true, showEvents: true } });
      const poolAccountingId = extractCreatedPoolAccountingId(accountingReceipt);
      if (!poolAccountingId) {
        throw new Error('PoolAccounting object id was not found in transaction objectChanges.');
      }
      setLastDigest(accountingDigest);

      const saved = await saveToBackend({ ...form, poolObjectId, poolAccountingId }, null);
      setNotice(`Пул и PoolAccounting созданы и сохранены в БД: ${shortId(saved.pool_object_id)} / ${shortId(saved.pool_accounting_id)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  async function handleUpdateOnchain() {
    setBusy('update-chain');
    setError(null);
    setNotice(null);
    setLastDigest(null);
    try {
      assertAdminReady();
      if (!form.poolObjectId) {
        throw new Error('Сначала создайте пул on-chain или укажите Pool object id.');
      }
      const tx = new Transaction();
      tx.setSender(account!.address);
      tx.moveCall({
        target: `${getPoolCallPackageId()}::pool_manager::update_pool`,
        typeArguments: [form.coinType],
        arguments: [
          tx.object(form.poolAdminCapId || SUI_FUND_CONFIG.poolAdminCapId),
          tx.object(form.poolRegistryId || SUI_FUND_CONFIG.poolRegistryId),
          tx.object(form.poolObjectId),
          tx.pure.bool(Boolean(form.active)),
          tx.pure.u64(BigInt(Number(form.targetApyBps || 0))),
          tx.pure.u64(BigInt(Number(form.realizedApyBps || 0))),
          tx.pure.u64(BigInt(buildNormalizedForm().minDepositUsdc)),
          tx.pure.u64(BigInt(Number(form.maxWeightBps || 0))),
        ],
      });
      const signed = await signAndExecuteTransaction({ transaction: tx });
      const digest = typeof signed === 'object' && signed && 'digest' in signed ? String(signed.digest) : '';
      if (!digest) {
        throw new Error('Transaction digest is missing.');
      }
      await client.waitForTransaction({ digest, options: { showEffects: true, showEvents: true } });
      setLastDigest(digest);
      await saveToBackend();
      setNotice('Пул обновлен on-chain и в БД.');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  async function handleSaveBackendOnly() {
    setBusy('save-db');
    setError(null);
    setNotice(null);
    try {
      await saveToBackend();
      setNotice('Пул сохранен в БД.');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  async function handleDelete(id: number) {
    setBusy(`delete-${id}`);
    setError(null);
    setNotice(null);
    try {
      assertAdminReady();
      await deleteFundPool(id, { adminAddress });
      if (editingId === id) {
        setEditingId(null);
        setForm(EMPTY_FORM);
        setMinDepositUsdcInput(formatUsdcUnits(EMPTY_FORM.minDepositUsdc));
        setMinAv8BalanceInput(formatAv8Units(EMPTY_FORM.minAv8Balance));
      }
      await load();
      setNotice('Запись пула удалена из БД. On-chain объект не удаляется.');
      if (detailMode && selectedDetailPool?.id === id) {
        window.history.pushState({}, '', poolsHref);
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  async function handleSendPoolLiquidityToWallet() {
    assertAdminReady();
    const pool = selectedLiquidityPool;
    if (!pool?.pool_object_id) {
      throw new Error('Выберите pool object id для переноса ликвидности.');
    }
    const amount = parseUsdcAmount(liquidityAmount);
    if (!amount || BigInt(amount) <= 0n) {
      throw new Error('Укажите сумму USDC для переноса.');
    }
    const recipient = liquidityRecipient.trim() || pool.liquidity_wallet_address || account?.address || '';
    if (!recipient) {
      throw new Error('Укажите кошелек получателя.');
    }

    const tx = new Transaction();
    tx.setSender(account!.address);
    const accountingId = pool.pool_accounting_id || SUI_FUND_CONFIG.poolAccountingId;
    tx.moveCall({
      target: `${getPoolCallPackageId(pool)}::pool_manager::${accountingId ? 'send_liquidity_to_wallet_accounted' : 'send_liquidity_to_wallet'}`,
      typeArguments: [pool.coin_type],
      arguments: accountingId
        ? [
            tx.object(pool.pool_admin_cap_id || SUI_FUND_CONFIG.poolAdminCapId),
            tx.object(pool.pool_registry_id || SUI_FUND_CONFIG.poolRegistryId),
            tx.object(pool.pool_object_id),
            tx.object(accountingId),
            tx.pure.u64(BigInt(amount)),
            tx.pure.address(recipient),
          ]
        : [
            tx.object(pool.pool_admin_cap_id || SUI_FUND_CONFIG.poolAdminCapId),
            tx.object(pool.pool_registry_id || SUI_FUND_CONFIG.poolRegistryId),
            tx.object(pool.pool_object_id),
            tx.pure.u64(BigInt(amount)),
            tx.pure.address(recipient),
          ],
    });
    const digest = await runPoolTransaction('send-liquidity', tx);
    if (digest) {
      setNotice(`Ликвидность пула отправлена в кошелек: ${shortId(recipient)}`);
    }
  }

  async function handleReturnPoolLiquidityFromWallet() {
    assertAdminReady();
    const pool = selectedLiquidityPool;
    if (!pool?.pool_object_id) {
      throw new Error('Выберите pool object id для возврата ликвидности.');
    }
    const amount = parseUsdcAmount(liquidityAmount);
    if (!amount || BigInt(amount) <= 0n) {
      throw new Error('Укажите сумму USDC для возврата.');
    }
    if (!account?.address) {
      throw new Error('Подключите Sui кошелек администратора.');
    }

    const tx = new Transaction();
    tx.setSender(account.address);
    const payment = buildCoinArgument(tx, await fetchAllCoins(client, account.address, pool.coin_type), BigInt(amount));
    const accountingId = pool.pool_accounting_id || SUI_FUND_CONFIG.poolAccountingId;
    tx.moveCall({
      target: `${getPoolCallPackageId(pool)}::pool_manager::${accountingId ? 'return_liquidity_from_wallet_accounted' : 'return_liquidity_from_wallet'}`,
      typeArguments: [pool.coin_type],
      arguments: accountingId
        ? [
            tx.object(pool.pool_admin_cap_id || SUI_FUND_CONFIG.poolAdminCapId),
            tx.object(pool.pool_registry_id || SUI_FUND_CONFIG.poolRegistryId),
            tx.object(pool.pool_object_id),
            tx.object(accountingId),
            payment,
          ]
        : [
            tx.object(pool.pool_admin_cap_id || SUI_FUND_CONFIG.poolAdminCapId),
            tx.object(pool.pool_registry_id || SUI_FUND_CONFIG.poolRegistryId),
            tx.object(pool.pool_object_id),
            payment,
          ],
    });
    const digest = await runPoolTransaction('return-liquidity', tx);
    if (digest) {
      setNotice('Ликвидность возвращена из кошелька в пул.');
    }
  }

  async function handleSendPoolLiquidityToVault() {
    assertAdminReady();
    const pool = selectedLiquidityPool;
    if (!pool?.pool_object_id || !pool.pool_accounting_id || !pool.basket_vault_id) {
      throw new Error('Для пула нужны pool_object_id, PoolAccounting и Basket vault.');
    }
    if (!SUI_FUND_CONFIG.managerCapId || !SUI_FUND_CONFIG.registryId || !SUI_FUND_CONFIG.basketId) {
      throw new Error('Не настроены ManagerCap / AssetRegistry / Basket.');
    }
    const amount = parseUsdcAmount(liquidityAmount);
    if (!amount || BigInt(amount) <= 0n) {
      throw new Error('Укажите сумму USDC для переноса.');
    }

    const tx = new Transaction();
    tx.setSender(account!.address);
    tx.moveCall({
      target: `${getPoolCallPackageId(pool)}::pool_manager::send_liquidity_to_vault_accounted`,
      typeArguments: [pool.coin_type],
      arguments: [
        tx.object(pool.pool_admin_cap_id || SUI_FUND_CONFIG.poolAdminCapId),
        tx.object(pool.pool_registry_id || SUI_FUND_CONFIG.poolRegistryId),
        tx.object(pool.pool_object_id),
        tx.object(pool.pool_accounting_id),
        tx.object(SUI_FUND_CONFIG.managerCapId),
        tx.object(SUI_FUND_CONFIG.registryId),
        tx.object(SUI_FUND_CONFIG.basketId),
        tx.object(pool.basket_vault_id),
        tx.pure.u64(BigInt(amount)),
        tx.pure.u64(BigInt(amount)),
      ],
    });
    const digest = await runPoolTransaction('send-vault', tx);
    if (digest) {
      setNotice(`Ликвидность перенесена из пула в Basket vault: ${shortId(pool.basket_vault_id)}`);
    }
  }

  async function handleReturnPoolLiquidityFromVault() {
    assertAdminReady();
    const pool = selectedLiquidityPool;
    if (!pool?.pool_object_id || !pool.pool_accounting_id || !pool.basket_vault_id) {
      throw new Error('Для пула нужны pool_object_id, PoolAccounting и Basket vault.');
    }
    if (!SUI_FUND_CONFIG.managerCapId || !SUI_FUND_CONFIG.basketId) {
      throw new Error('Не настроены ManagerCap / Basket.');
    }
    const amount = parseUsdcAmount(liquidityAmount);
    if (!amount || BigInt(amount) <= 0n) {
      throw new Error('Укажите сумму USDC для возврата.');
    }

    const tx = new Transaction();
    tx.setSender(account!.address);
    tx.moveCall({
      target: `${getPoolCallPackageId(pool)}::pool_manager::return_liquidity_from_vault_accounted`,
      typeArguments: [pool.coin_type],
      arguments: [
        tx.object(pool.pool_admin_cap_id || SUI_FUND_CONFIG.poolAdminCapId),
        tx.object(pool.pool_registry_id || SUI_FUND_CONFIG.poolRegistryId),
        tx.object(pool.pool_object_id),
        tx.object(pool.pool_accounting_id),
        tx.object(SUI_FUND_CONFIG.managerCapId),
        tx.object(SUI_FUND_CONFIG.basketId),
        tx.object(pool.basket_vault_id),
        tx.pure.u64(BigInt(amount)),
        tx.pure.u64(BigInt(amount)),
      ],
    });
    const digest = await runPoolTransaction('return-vault', tx);
    if (digest) {
      setNotice('Ликвидность возвращена из Basket vault в пул.');
    }
  }

  async function handleExchangePoolVaultLiquidity() {
    if (liquidityDirection === 'pool-to-vault') {
      await handleSendPoolLiquidityToVault();
      return;
    }

    await handleReturnPoolLiquidityFromVault();
  }

  async function handleCreatePoolAccounting() {
    setBusy('create-accounting');
    setError(null);
    setNotice(null);
    setLastDigest(null);
    try {
      assertAdminReady();
      const pool = selectedLiquidityPool;
      if (!pool?.pool_object_id) {
        throw new Error('Выберите pool object id для accounting.');
      }
      if (!account?.address) {
        throw new Error('Подключите Sui кошелек администратора.');
      }

      const tx = new Transaction();
      tx.setSender(account.address);
      tx.moveCall({
        target: `${getPoolCallPackageId(pool)}::pool_manager::create_pool_accounting`,
        typeArguments: [pool.coin_type],
        arguments: [
          tx.object(pool.pool_admin_cap_id || SUI_FUND_CONFIG.poolAdminCapId),
          tx.object(pool.pool_registry_id || SUI_FUND_CONFIG.poolRegistryId),
          tx.object(pool.pool_object_id),
        ],
      });
      const signed = await signAndExecuteTransaction({ transaction: tx });
      const digest = typeof signed === 'object' && signed && 'digest' in signed ? String(signed.digest) : '';
      if (!digest) {
        throw new Error('Transaction digest is missing.');
      }
      const receipt = await client.waitForTransaction({ digest, options: { showEffects: true, showObjectChanges: true, showEvents: true } });
      const poolAccountingId = extractCreatedPoolAccountingId(receipt);
      if (!poolAccountingId) {
        throw new Error('PoolAccounting object id was not found in transaction objectChanges.');
      }
      setLastDigest(digest);
      const saved = await saveFundPool(
        {
          ...recordToForm(pool),
          poolAccountingId,
        },
        pool.id,
        { adminAddress },
      );
      setForm(recordToForm(saved));
      setEditingId(saved.id);
      await load();
      setNotice(`PoolAccounting создан и сохранен в БД: ${shortId(saved.pool_accounting_id)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="min-h-[calc(100vh-160px)] bg-slate-950 pb-20 pt-14">
      <PageBreadcrumbsBar
        items={detailMode
          ? [
              { label: 'Home', href: homeHref },
              { label: 'Pool admin', href: poolsHref },
              { label: isNewPoolPage ? 'New pool' : selectedDetailPool?.name || 'Pool' },
            ]
          : [
              { label: 'Home', href: homeHref },
              { label: 'Pool admin' },
            ]}
      />
      {isNewPoolPage ? (
        <PageHeroShell
          badge={<PageHeroBadge label="Admin" variant="teal" />}
          title="Создание пула"
          subtitleClassName="max-w-4xl text-lg leading-relaxed text-slate-400"
        />
      ) : (
        <PageHeroShell
          badge={<PageHeroBadge label="Admin" variant="teal" />}
          title={detailMode ? selectedDetailPool?.name || 'Пул' : 'Управление пулами'}
          subtitle={detailMode
            ? 'Редактирование параметров пула и обмен ликвидностью между Pool, AssetVault и внешним рабочим кошельком.'
            : 'Реестр пулов фонда. В строке пула открывается карточка с настройками и управлением ликвидностью.'}
          subtitleClassName="max-w-4xl text-lg leading-relaxed text-slate-400"
        />
      )}

      <section className="px-6 py-10">
        <div className="mx-auto max-w-7xl">
          <div className="space-y-4">
            {!detailMode ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm uppercase tracking-[0.18em] text-teal-200">Реестр пулов</div>
                    <p className="mt-2 text-sm text-slate-400">Схема связи: Pool → Object ID AssetVault → внешний рабочий кошелек.</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      className="inline-flex h-10 items-center gap-2 rounded-xl bg-teal-300 px-4 text-sm font-semibold text-slate-950 transition hover:bg-teal-200"
                      href={getPoolAdminDetailPath('new')}
                    >
                      <Plus className="h-4 w-4" /> Новый пул
                    </a>
                    <button
                      className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm font-semibold text-slate-100 transition hover:border-teal-300/40"
                      onClick={() => void load()}
                      disabled={loading}
                    >
                      <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Обновить
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-white/[0.08] bg-white/[0.035]">
                  <div className="min-w-[1040px]">
                    <div className="grid grid-cols-[1.35fr_0.85fr_0.95fr_1.65fr_110px] gap-4 border-b border-white/[0.07] px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      <div>Пул</div>
                      <div>Параметры</div>
                      <div>Доходность</div>
                      <div>On-chain связи</div>
                      <div className="text-right">Действия</div>
                    </div>
                    {pools.length === 0 ? (
                      <div className="px-4 py-8 text-sm text-slate-400">Пулы еще не заведены.</div>
                    ) : pools.map((pool) => (
                      <div key={pool.id} className="grid grid-cols-[1.35fr_0.85fr_0.95fr_1.65fr_110px] items-center gap-4 border-b border-white/[0.05] px-4 py-4 text-sm text-slate-200 transition hover:bg-white/[0.025] last:border-b-0">
                        <div className="min-w-0">
                          <div className="flex min-w-0 items-center gap-2">
                            <a className="truncate text-base font-semibold text-white transition hover:text-teal-200" href={getPoolAdminDetailPath(pool.id)}>
                              {pool.name}
                            </a>
                            <span className={pool.active ? 'rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-100' : 'rounded-full border border-slate-300/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400'}>
                              {pool.active ? 'active' : 'paused'}
                            </span>
                            {pool.is_default_deposit ? (
                              <span className="rounded-full border border-sky-300/20 bg-sky-300/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-sky-100">
                                default deposit
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-1 truncate text-xs text-slate-500">{pool.symbol} · {shortId(pool.coin_type)}</div>
                          {pool.description ? <div className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{pool.description}</div> : null}
                        </div>
                        <div className="space-y-2 text-xs">
                          <div className="inline-flex items-center rounded-lg border border-white/[0.08] bg-black/15 px-2.5 py-1 font-semibold text-slate-200">AV8 {formatAv8Units(pool.min_av8_balance || '0') || '0'}</div>
                          <div className="text-slate-500">Min: <span className="font-mono text-slate-300">{formatUsdcUnits(pool.min_deposit_usdc) || '0'} USDC</span></div>
                          <div className="text-slate-500">Max weight: <span className="font-mono text-slate-300">{bpsToPercent(pool.max_weight_bps)}</span></div>
                        </div>
                        <div className="space-y-2 text-xs">
                          <div className="text-slate-500">Target <span className="ml-1 font-mono text-sm font-semibold text-teal-100">{bpsToPercent(pool.target_apy_bps)}</span></div>
                          <div className="text-slate-500">Realized <span className="ml-1 font-mono text-sm font-semibold text-white">{bpsToPercent(pool.realized_apy_bps)}</span></div>
                        </div>
                        <div className="grid gap-1.5 text-[11px]">
                          <div className="flex items-center justify-between gap-3 rounded-lg bg-black/15 px-2 py-1.5">
                            <span className="text-slate-500">Pool</span>
                            <span className="font-mono text-slate-300">{pool.pool_object_id ? shortId(pool.pool_object_id) : 'not created'}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3 rounded-lg bg-black/15 px-2 py-1.5">
                            <span className="text-slate-500">AssetVault</span>
                            <span className="font-mono text-slate-300">{pool.basket_vault_id ? shortId(pool.basket_vault_id) : 'нет'}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3 rounded-lg bg-black/15 px-2 py-1.5">
                            <span className="text-slate-500">Wallet</span>
                            <span className="font-mono text-slate-300">{pool.liquidity_wallet_address ? shortId(pool.liquidity_wallet_address) : 'не задан'}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3 rounded-lg bg-black/15 px-2 py-1.5">
                            <span className="text-slate-500">Accounting</span>
                            <span className="font-mono text-slate-300">{pool.pool_accounting_id ? shortId(pool.pool_accounting_id) : 'нет'}</span>
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <a
                            className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-slate-100 transition hover:border-teal-300/40"
                            href={getPoolAdminDetailPath(pool.id)}
                          >
                            Открыть
                          </a>
                          <button
                            className="rounded-lg border border-red-300/20 bg-red-400/[0.08] px-3 py-2 text-xs font-semibold text-red-100"
                            onClick={() => void handleDelete(pool.id)}
                            disabled={Boolean(busy)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <>
                <a className="inline-flex text-sm font-semibold text-teal-200 transition hover:text-teal-100" href={poolsHref}>
                  К пулам
                </a>
              </>
            )}

          </div>

          {detailMode ? <aside className="mx-auto mt-6 h-fit w-full max-w-5xl rounded-2xl border border-white/[0.08] bg-white/[0.045] p-5 lg:w-4/5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-400/10 text-teal-200">
                <Database className="h-5 w-5" />
              </div>
              <div>
                <div className="text-lg font-semibold text-white">{isNewPoolPage ? 'Создание пула' : editingId ? 'Редактировать пул' : 'Новый пул'}</div>
                <div className="text-sm text-slate-400">{hasAdminAccess ? 'Admin wallet подтвержден' : 'Нужен RWA AdminCap в БД'}</div>
              </div>
            </div>

            <div className="mt-5">
              <ConnectButton />
            </div>

            {!isNewPoolPage ? <div className="mt-5 grid grid-cols-2 rounded-xl border border-white/[0.08] bg-black/15 p-1">
              <button
                type="button"
                className={sidePanelTab === 'form'
                  ? 'h-10 rounded-lg bg-teal-300 text-xs font-bold uppercase tracking-[0.12em] text-slate-950'
                  : 'h-10 rounded-lg text-xs font-bold uppercase tracking-[0.12em] text-slate-400 transition hover:text-slate-100'}
                onClick={() => setSidePanelTab('form')}
              >
                Редактирование
              </button>
              <button
                type="button"
                className={sidePanelTab === 'liquidity'
                  ? 'h-10 rounded-lg bg-teal-300 text-xs font-bold uppercase tracking-[0.12em] text-slate-950'
                  : 'h-10 rounded-lg text-xs font-bold uppercase tracking-[0.12em] text-slate-400 transition hover:text-slate-100'}
                onClick={() => setSidePanelTab('liquidity')}
              >
                Обмен ликвидностью
              </button>
            </div> : null}

            {sidePanelTab === 'form' ? (
              <>
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <div className="lg:col-span-2">
              <Field label="Название">
                <input className={inputClass} value={form.name} onChange={(event) => update('name', event.target.value)} />
              </Field>
              </div>
              <div className="lg:col-span-2">
              <Field label="Описание">
                <textarea className={textareaClass} value={form.description || ''} onChange={(event) => update('description', event.target.value)} />
              </Field>
              </div>
              <Field label="USDC coin type">
                <input className={inputClass} value={form.coinType} onChange={(event) => update('coinType', event.target.value)} placeholder="0x...::usdc::USDC" />
              </Field>
              <Field label="Pool object id">
                <input className={inputClass} value={form.poolObjectId} onChange={(event) => update('poolObjectId', event.target.value)} placeholder="заполнится после create_pool" />
              </Field>
              <Field label="PoolAccounting object id">
                <input className={inputClass} value={form.poolAccountingId || ''} onChange={(event) => update('poolAccountingId', event.target.value)} placeholder="заполнится после Accounting" />
              </Field>
              <Field label="Basket vault id для USDC">
                <input className={inputClass} value={form.basketVaultId || ''} onChange={(event) => update('basketVaultId', event.target.value)} placeholder="AssetVault<USDC> из корзины" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Уровень AV8">
                  <input
                    className={inputClass}
                    inputMode="decimal"
                    value={minAv8BalanceInput}
                    placeholder="100"
                    onChange={(event) => setMinAv8BalanceInput(event.target.value.replace(/[^\d.,]/g, ''))}
                  />
                </Field>
                <Field label="Target APY bps">
                  <input className={inputClass} value={form.targetApyBps} onChange={(event) => update('targetApyBps', Number(event.target.value || 0))} />
                </Field>
                <Field label="Realized APY bps">
                  <input className={inputClass} value={form.realizedApyBps} onChange={(event) => update('realizedApyBps', Number(event.target.value || 0))} />
                </Field>
                <Field label="Max weight bps">
                  <input className={inputClass} value={form.maxWeightBps} onChange={(event) => update('maxWeightBps', Number(event.target.value || 0))} />
                </Field>
              </div>
              <Field label="Min deposit, USDC">
                <input
                  className={inputClass}
                  inputMode="decimal"
                  value={minDepositUsdcInput}
                  placeholder="1 или 1,000000"
                  onChange={(event) => setMinDepositUsdcInput(event.target.value.replace(/[^\d.,]/g, ''))}
                />
                <div className="mt-2 text-xs leading-5 text-slate-500">
                  Введите сумму в USDC. Пример: 1 USDC будет отправлен on-chain как 1000000.
                </div>
              </Field>
              <label className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-black/15 p-3 text-sm text-slate-200">
                <input type="checkbox" checked={form.active} onChange={(event) => update('active', event.target.checked)} />
                Пул активен для клиентов
              </label>
              <label className="flex items-center gap-3 rounded-xl border border-sky-300/15 bg-sky-400/10 p-3 text-sm text-sky-100">
                <input type="checkbox" checked={form.isDefaultDeposit} onChange={(event) => update('isDefaultDeposit', event.target.checked)} />
                Default route для пополнения /invest
              </label>
            </div>

            <div className="mt-5 grid gap-3 lg:grid-cols-3">
              {isNewPoolPage ? (
                <button
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-teal-300 px-4 text-sm font-semibold text-slate-950 transition hover:bg-teal-200 disabled:cursor-not-allowed disabled:opacity-60 lg:col-span-3"
                  disabled={Boolean(busy)}
                  onClick={() => void handleCreateOnchain()}
                >
                  <Plus className="h-4 w-4" /> {busy === 'create-chain' ? 'Создание...' : 'Создать on-chain и сохранить'}
                </button>
              ) : (
                <>
                  <button
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-4 text-sm font-semibold text-slate-100 transition hover:border-teal-300/40 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={Boolean(busy)}
                    onClick={() => void handleUpdateOnchain()}
                  >
                    <Save className="h-4 w-4" /> {busy === 'update-chain' ? 'Обновление...' : 'Обновить on-chain и БД'}
                  </button>
                  <button
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 text-sm font-semibold text-slate-300 transition hover:border-teal-300/40 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={Boolean(busy)}
                    onClick={() => void handleSaveBackendOnly()}
                  >
                    <Database className="h-4 w-4" /> Сохранить только в БД
                  </button>
                </>
              )}
            </div>
              </>
            ) : (
              <div className="mt-5 space-y-4">
                <div className="rounded-xl border border-white/[0.08] bg-black/15 p-3">
                  <div className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-200">Операционная ликвидность</div>
                  <div className="mt-1 text-xs leading-5 text-slate-500">
                    Обмен USDC между текущим пулом и связанным Basket vault.
                  </div>
                </div>

                <Field label="Пул">
                  <select
                    className={inputClass}
                    value={selectedLiquidityPool?.pool_object_id || liquidityPoolId}
                    onChange={(event) => setLiquidityPoolId(event.target.value)}
                  >
                    <option value="">Выберите пул</option>
                    {pools.filter((pool) => pool.pool_object_id).map((pool) => (
                      <option key={pool.id} value={pool.pool_object_id}>
                        {pool.name} · {shortId(pool.pool_object_id)}
                      </option>
                    ))}
                  </select>
                </Field>

                {selectedLiquidityPool ? (
                  <div className="space-y-3">
                    <div className="rounded-2xl border border-white/[0.08] bg-black/15 p-4">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{liquidityTop.title}</div>
                      <div className="mt-2 text-sm font-semibold text-white">{liquidityTop.label}</div>
                      <div className="mt-1 font-mono text-lg font-semibold text-teal-100">{liquidityTop.balance}</div>
                    </div>

                    <div className="flex justify-center">
                      <button
                        type="button"
                        className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-teal-300/25 bg-teal-300/10 text-teal-100 transition hover:bg-teal-300/15"
                        aria-label="Поменять направление обмена"
                        onClick={() => setLiquidityDirection((current) => current === 'pool-to-vault' ? 'vault-to-pool' : 'pool-to-vault')}
                      >
                        <ArrowDown className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="rounded-2xl border border-white/[0.08] bg-black/15 p-4">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{liquidityBottom.title}</div>
                      <div className="mt-2 text-sm font-semibold text-white">{liquidityBottom.label}</div>
                      <div className="mt-1 font-mono text-lg font-semibold text-teal-100">{liquidityBottom.balance}</div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_140px]">
                      <Field label="Сумма USDC">
                        <input
                          className={inputClass}
                          inputMode="decimal"
                          value={liquidityAmount}
                          placeholder="100"
                          onChange={(event) => setLiquidityAmount(event.target.value.replace(/[^\d.,]/g, ''))}
                        />
                      </Field>
                      <div className="flex items-end">
                        <button
                          type="button"
                          className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-teal-300 px-4 text-sm font-bold text-slate-950 transition hover:bg-teal-200 disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={Boolean(busy || !selectedLiquidityPool.pool_accounting_id || !selectedLiquidityPool.basket_vault_id)}
                          onClick={() => void handleExchangePoolVaultLiquidity().catch((err) => setError(err instanceof Error ? err.message : String(err)))}
                        >
                          {busy ? 'Подпись...' : 'Подписать'}
                        </button>
                      </div>
                    </div>

                    <div className="rounded-xl border border-white/[0.08] bg-black/15 px-3 py-3 text-xs leading-5 text-slate-400">
                      Coin type: <span className="font-mono text-slate-300">{selectedLiquidityPool.coin_type}</span>
                      <br />
                      PoolAccounting: <span className="font-mono text-slate-300">{selectedLiquidityPool.pool_accounting_id ? shortId(selectedLiquidityPool.pool_accounting_id) : 'не создан'}</span>
                      <br />
                      Basket vault: <span className="font-mono text-slate-300">{selectedLiquidityPool.basket_vault_id ? shortId(selectedLiquidityPool.basket_vault_id) : 'не привязан'}</span>
                      <br />
                      В работе: <span className="font-mono text-slate-300">{liquidityBalancesLoading ? '...' : formatUsdcBalance(liquidityBalances?.accountingDeployed ?? null)}</span>
                    </div>

                    {!selectedLiquidityPool.pool_accounting_id ? (
                      <button
                        type="button"
                        className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-sky-300/25 bg-sky-300/10 px-4 text-xs font-bold text-sky-100 transition hover:bg-sky-300/15 disabled:opacity-60"
                        disabled={Boolean(busy)}
                        onClick={() => void handleCreatePoolAccounting().catch((err) => setError(err instanceof Error ? err.message : String(err)))}
                      >
                        Создать PoolAccounting
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            )}

            {notice ? <div className="mt-4 rounded-xl border border-emerald-300/20 bg-emerald-400/[0.08] p-3 text-sm text-emerald-100">{notice}</div> : null}
            {error ? <div className="mt-4 rounded-xl border border-red-300/20 bg-red-400/[0.08] p-3 text-sm text-red-100">{error}</div> : null}
            {lastDigest ? <div className="mt-4 break-all font-mono text-xs text-slate-500">{lastDigest}</div> : null}
          </aside> : null}
        </div>
      </section>
    </main>
  );
}
