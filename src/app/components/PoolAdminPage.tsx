import React from 'react';
import { ConnectButton, useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { ArrowDownToLine, ArrowUpFromLine, Database, Plus, RefreshCw, Save, Trash2 } from 'lucide-react';

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
import { getBasePath } from '../lib/routes';
import { SUI_FUND_CONFIG } from '../lib/suiFund';
import { PageBreadcrumbsBar, PageHeroBadge, PageHeroShell } from './PageChrome';

const inputClass =
  'h-11 w-full rounded-xl border border-white/[0.09] bg-white/[0.04] px-3 text-sm text-slate-100 outline-none transition focus:border-teal-300/40 focus:bg-white/[0.07]';
const textareaClass =
  'min-h-24 w-full resize-y rounded-xl border border-white/[0.09] bg-white/[0.04] px-3 py-3 text-sm leading-6 text-slate-100 outline-none transition focus:border-teal-300/40 focus:bg-white/[0.07]';
const USDC_DECIMALS = 6;
const MAX_BPS = 10_000;

type CoinLike = {
  coinObjectId: string;
  balance: string;
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
  maxWeightBps: 5000,
  active: true,
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
  const normalized = value.trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    return null;
  }

  const [whole, fraction = ''] = normalized.split('.');
  if (fraction.length > USDC_DECIMALS) {
    return null;
  }

  const units = BigInt(whole || '0') * 10n ** BigInt(USDC_DECIMALS) + BigInt((fraction.padEnd(USDC_DECIMALS, '0') || '0'));
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
  if (!/^\d+$/.test(value || '')) {
    return '';
  }

  const units = BigInt(value);
  const base = 10n ** BigInt(USDC_DECIMALS);
  const whole = units / base;
  const fraction = (units % base).toString().padStart(USDC_DECIMALS, '0').replace(/0+$/, '');
  return `${whole.toString()}${fraction ? `.${fraction}` : ''}`;
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
    maxWeightBps: record.max_weight_bps,
    active: record.active,
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

export function PoolAdminPage() {
  const homeHref = getBasePath();
  const account = useCurrentAccount();
  const client = useSuiClient();
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const adminAddress = normalizeAddress(account?.address || '');

  const [pools, setPools] = React.useState<FundPoolRecord[]>([]);
  const [adminCaps, setAdminCaps] = React.useState<RwaAdminCapRecord[]>([]);
  const [form, setForm] = React.useState<FundPoolInput>(EMPTY_FORM);
  const [minDepositUsdcInput, setMinDepositUsdcInput] = React.useState(() => formatUsdcUnits(EMPTY_FORM.minDepositUsdc));
  const [editingId, setEditingId] = React.useState<number | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [lastDigest, setLastDigest] = React.useState<string | null>(null);
  const [liquidityPoolId, setLiquidityPoolId] = React.useState('');
  const [liquidityAmount, setLiquidityAmount] = React.useState('');
  const [liquidityRecipient, setLiquidityRecipient] = React.useState('');

  const selectedLiquidityPool = React.useMemo(() => {
    return pools.find((pool) => pool.pool_object_id === liquidityPoolId)
      || pools.find((pool) => pool.pool_object_id === form.poolObjectId)
      || null;
  }, [form.poolObjectId, liquidityPoolId, pools]);

  const hasAdminAccess = React.useMemo(
    () => Boolean(adminAddress && adminCaps.some((cap) => normalizeAddress(cap.owner_address) === adminAddress)),
    [adminAddress, adminCaps],
  );

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

  function update<K extends keyof FundPoolInput>(key: K, value: FundPoolInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function buildNormalizedForm(nextForm: FundPoolInput = form): FundPoolInput {
    const minDepositUnits = parseUsdcAmount(minDepositUsdcInput);
    if (minDepositUnits === null) {
      throw new Error('Минимальный депозит укажите в USDC: например 1, 10.5 или 1,000000.');
    }
    assertBps(Number(nextForm.targetApyBps || 0), 'Target APY bps');
    assertBps(Number(nextForm.realizedApyBps || 0), 'Realized APY bps');
    assertBps(Number(nextForm.maxWeightBps || 0), 'Max weight bps');

    return {
      ...nextForm,
      minDepositUsdc: minDepositUnits,
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
    setEditingId(saved.id);
    await load();
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
      }
      await load();
      setNotice('Запись пула удалена из БД. On-chain объект не удаляется.');
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
        items={[
          { label: 'Home', href: homeHref },
          { label: 'Pool admin' },
        ]}
      />
      <PageHeroShell
        badge={<PageHeroBadge label="Admin" variant="teal" />}
        title="Управление пулами"
        subtitle="Создание on-chain Pool<USDC>, обновление APY/лимитов/активности и синхронизация object IDs с backend."
        subtitleClassName="max-w-4xl text-lg leading-relaxed text-slate-400"
      />

      <section className="px-6 py-10">
        <div className="mx-auto grid max-w-7xl gap-6 xl:grid-cols-[1fr_420px]">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm uppercase tracking-[0.18em] text-teal-200">Реестр пулов</div>
                <p className="mt-2 text-sm text-slate-400">Backend хранит настройки и object id, Sui хранит сам shared pool.</p>
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
              <div className="grid grid-cols-[1.4fr_0.65fr_0.65fr_1fr_120px] gap-3 border-b border-white/[0.07] px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                <div>Пул</div>
                <div>Risk</div>
                <div>APY</div>
                <div>Object</div>
                <div className="text-right">Действия</div>
              </div>
              {pools.length === 0 ? (
                <div className="px-4 py-8 text-sm text-slate-400">Пулы еще не заведены.</div>
              ) : pools.map((pool) => (
                <div key={pool.id} className="grid grid-cols-[1.4fr_0.65fr_0.65fr_1fr_120px] gap-3 border-b border-white/[0.05] px-4 py-4 text-sm text-slate-200 last:border-b-0">
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-white">{pool.name}</div>
                    <div className="mt-1 truncate text-xs text-slate-500">{pool.symbol} · {shortId(pool.coin_type)}</div>
                  </div>
                  <div>{pool.risk_level}</div>
                  <div>{bpsToPercent(pool.target_apy_bps)}</div>
                  <div className="truncate font-mono text-xs text-slate-500">{pool.pool_object_id ? shortId(pool.pool_object_id) : 'not created'}</div>
                  <div className="flex justify-end gap-2">
                    <button
                      className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-slate-100"
                      onClick={() => {
                        setEditingId(pool.id);
                        setForm(recordToForm(pool));
                        setMinDepositUsdcInput(formatUsdcUnits(pool.min_deposit_usdc));
                        setLiquidityPoolId(pool.pool_object_id);
                      }}
                    >
                      Edit
                    </button>
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

            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-5">
              <div className="flex flex-col gap-2 border-b border-white/[0.07] pb-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-200">Операционная ликвидность</div>
                  <div className="mt-1 text-sm leading-6 text-slate-500">
                    Перенос USDC из смарт-контракта пула в рабочий кошелек и возврат обратно в пул.
                  </div>
                </div>
                <div className="text-xs text-slate-500">PoolAdminCap</div>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_0.7fr_1.2fr_auto]">
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
                <Field label="Сумма USDC">
                  <input
                    className={inputClass}
                    inputMode="decimal"
                    value={liquidityAmount}
                    placeholder="100"
                    onChange={(event) => setLiquidityAmount(event.target.value.replace(/[^\d.,]/g, ''))}
                  />
                </Field>
                <Field label="Кошелек получателя">
                  <input
                    className={`${inputClass} font-mono text-xs`}
                    value={liquidityRecipient}
                    placeholder={selectedLiquidityPool?.liquidity_wallet_address || account?.address || '0x...'}
                    onChange={(event) => setLiquidityRecipient(event.target.value)}
                  />
                </Field>
                <div className="grid gap-2 self-end sm:grid-cols-5 lg:w-[640px]">
                  <button
                    type="button"
                    className="inline-flex h-11 items-center justify-center rounded-xl border border-sky-300/25 bg-sky-300/10 px-4 text-xs font-bold text-sky-100 transition hover:bg-sky-300/15 disabled:opacity-60"
                    disabled={Boolean(busy)}
                    onClick={() => void handleCreatePoolAccounting().catch((err) => setError(err instanceof Error ? err.message : String(err)))}
                  >
                    Accounting
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-amber-300/25 bg-amber-300/10 px-4 text-xs font-bold text-amber-100 transition hover:bg-amber-300/15 disabled:opacity-60"
                    disabled={Boolean(busy)}
                    onClick={() => void handleSendPoolLiquidityToWallet().catch((err) => setError(err instanceof Error ? err.message : String(err)))}
                  >
                    <ArrowUpFromLine className="h-4 w-4" />
                    В кошелек
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-teal-300/25 bg-teal-300/10 px-4 text-xs font-bold text-teal-100 transition hover:bg-teal-300/15 disabled:opacity-60"
                    disabled={Boolean(busy)}
                    onClick={() => void handleReturnPoolLiquidityFromWallet().catch((err) => setError(err instanceof Error ? err.message : String(err)))}
                  >
                    <ArrowDownToLine className="h-4 w-4" />
                    В пул
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-violet-300/25 bg-violet-300/10 px-4 text-xs font-bold text-violet-100 transition hover:bg-violet-300/15 disabled:opacity-60"
                    disabled={Boolean(busy || !selectedLiquidityPool?.pool_accounting_id || !selectedLiquidityPool?.basket_vault_id)}
                    onClick={() => void handleSendPoolLiquidityToVault().catch((err) => setError(err instanceof Error ? err.message : String(err)))}
                  >
                    В vault
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-fuchsia-300/25 bg-fuchsia-300/10 px-4 text-xs font-bold text-fuchsia-100 transition hover:bg-fuchsia-300/15 disabled:opacity-60"
                    disabled={Boolean(busy || !selectedLiquidityPool?.pool_accounting_id || !selectedLiquidityPool?.basket_vault_id)}
                    onClick={() => void handleReturnPoolLiquidityFromVault().catch((err) => setError(err instanceof Error ? err.message : String(err)))}
                  >
                    Из vault
                  </button>
                </div>
              </div>

              {selectedLiquidityPool ? (
                <div className="mt-4 rounded-xl border border-white/[0.08] bg-black/15 px-3 py-3 text-xs leading-5 text-slate-400">
                  Coin type: <span className="font-mono text-slate-300">{selectedLiquidityPool.coin_type}</span>
                  <br />
                  PoolAccounting: <span className="font-mono text-slate-300">{selectedLiquidityPool.pool_accounting_id ? shortId(selectedLiquidityPool.pool_accounting_id) : 'не создан'}</span>
                  <br />
                  Basket vault: <span className="font-mono text-slate-300">{selectedLiquidityPool.basket_vault_id ? shortId(selectedLiquidityPool.basket_vault_id) : 'не привязан'}</span>
                </div>
              ) : null}
            </div>
          </div>

          <aside className="h-fit rounded-2xl border border-white/[0.08] bg-white/[0.045] p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-400/10 text-teal-200">
                <Database className="h-5 w-5" />
              </div>
              <div>
                <div className="text-lg font-semibold text-white">{editingId ? 'Редактировать пул' : 'Новый пул'}</div>
                <div className="text-sm text-slate-400">{hasAdminAccess ? 'Admin wallet подтвержден' : 'Нужен RWA AdminCap в БД'}</div>
              </div>
            </div>

            <div className="mt-5">
              <ConnectButton />
            </div>

            <div className="mt-5 grid gap-4">
              <Field label="Название">
                <input className={inputClass} value={form.name} onChange={(event) => update('name', event.target.value)} />
              </Field>
              <Field label="Описание">
                <textarea className={textareaClass} value={form.description || ''} onChange={(event) => update('description', event.target.value)} />
              </Field>
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
              <Field label="Рабочий кошелек ликвидности">
                <input className={inputClass} value={form.liquidityWalletAddress || ''} onChange={(event) => update('liquidityWalletAddress', event.target.value)} placeholder="0x... если нужен вывод в кошелек" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Risk 1-5">
                  <input className={inputClass} value={form.riskLevel} onChange={(event) => update('riskLevel', Number(event.target.value || 1))} />
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
            </div>

            <div className="mt-5 grid gap-3">
              <button
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-teal-300 px-4 text-sm font-semibold text-slate-950 transition hover:bg-teal-200 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={Boolean(busy)}
                onClick={() => void handleCreateOnchain()}
              >
                <Plus className="h-4 w-4" /> {busy === 'create-chain' ? 'Создание...' : 'Создать on-chain и сохранить'}
              </button>
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
            </div>

            {notice ? <div className="mt-4 rounded-xl border border-emerald-300/20 bg-emerald-400/[0.08] p-3 text-sm text-emerald-100">{notice}</div> : null}
            {error ? <div className="mt-4 rounded-xl border border-red-300/20 bg-red-400/[0.08] p-3 text-sm text-red-100">{error}</div> : null}
            {lastDigest ? <div className="mt-4 break-all font-mono text-xs text-slate-500">{lastDigest}</div> : null}
          </aside>
        </div>
      </section>
    </main>
  );
}
