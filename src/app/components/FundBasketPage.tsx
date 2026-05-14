import React from 'react';
import { ConnectButton, useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { ArrowDownToLine, ArrowUpFromLine, BriefcaseBusiness, Database, Layers3, RefreshCw, Save, Wallet } from 'lucide-react';

import { SUI_NETWORK } from '../config';
import { getBasePath } from '../lib/routes';
import { SUI_FUND_CONFIG } from '../lib/suiFund';
import { getFundTokens, type FundTokenRecord } from '../lib/api';
import { calculateOracleValueUsdc, type OracleValueQuote } from '../lib/pythOracle';
import { useI18n } from '../i18n';
import { PageBreadcrumbsBar, PageHeroBadge, PageHeroShell } from './PageChrome';

const SUI_COIN_TYPE = '0x2::sui::SUI';
const EVENT_LIMIT = 80;
const MIST_DECIMALS = 9;
const USDC_DECIMALS = 6;

type CoinLike = {
  coinObjectId: string;
  balance: string;
};

type VaultRow = {
  vaultId: string;
  assetType: string;
  positionKind: string;
  balance: bigint;
  valueUsdc: bigint;
};

type ExternalPositionRow = {
  positionId: string;
  positionKind: string;
  assetType: string;
  workingTokenType: string;
  protocol: string;
  externalObjectId: string;
  amount: bigint;
  principalValueUsdc: bigint;
  currentValueUsdc: bigint;
  active: boolean;
};

type BasketSnapshot = {
  navUsdc: bigint;
  liquidSui: bigint;
  managedValueUsdc: bigint;
  vaults: VaultRow[];
  externalPositions: ExternalPositionRow[];
};

type ManagedForm = {
  coinType: string;
  vaultId: string;
  amount: string;
  valueUsdc: string;
  recipient: string;
  positionKind: string;
};

type ExternalForm = {
  positionId: string;
  positionKind: string;
  assetType: string;
  workingTokenType: string;
  protocol: string;
  externalObjectId: string;
  amount: string;
  principalValueUsdc: string;
  currentValueUsdc: string;
  active: boolean;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
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

function shortId(value: string, notSet: string): string {
  return value.length > 18 ? `${value.slice(0, 8)}...${value.slice(-6)}` : value || notSet;
}

function ensure0x(value: string): string {
  return value.startsWith('0x') ? value : `0x${value}`;
}

function parseDecimalAmount(value: string, decimals: number): bigint | null {
  const normalized = value.trim().replace(',', '.');
  if (!normalized || !/^\d+(\.\d+)?$/.test(normalized)) {
    return null;
  }
  const [whole, fraction = ''] = normalized.split('.');
  return BigInt(`${whole}${fraction.slice(0, decimals).padEnd(decimals, '0')}`.replace(/^0+(?=\d)/, '') || '0');
}

function parseU64(value: string, label: string, template: string): bigint {
  if (!/^\d+$/.test(value.trim())) {
    throw new Error(template.replace(/\{label\}/g, label));
  }
  return BigInt(value.trim());
}

function formatUnits(value: bigint, decimals = 9, maxFraction = 4): string {
  const divisor = 10n ** BigInt(decimals);
  const whole = value / divisor;
  const fraction = value % divisor;
  if (fraction === 0n) {
    return whole.toLocaleString('en-US');
  }
  const trimmed = fraction.toString().padStart(decimals, '0').slice(0, maxFraction).replace(/0+$/, '');
  return trimmed ? `${whole.toLocaleString('en-US')}.${trimmed}` : whole.toLocaleString('en-US');
}

function readVecMapEntries(value: unknown): Array<{ key: unknown; value: unknown }> {
  const contents = asRecord(value).contents;
  if (!Array.isArray(contents)) {
    return [];
  }
  return contents.map((entry) => {
    const fields = asRecord(asRecord(entry).fields);
    return { key: fields.key, value: fields.value };
  });
}

function readBalance(value: unknown): bigint {
  const direct = readBigInt(value);
  if (direct > 0n) {
    return direct;
  }
  return readBigInt(asRecord(asRecord(value).fields).value);
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
  const primaryCoin = tx.object(coins[0].coinObjectId);
  if (coins.length > 1) {
    tx.mergeCoins(primaryCoin, coins.slice(1).map((coin) => tx.object(coin.coinObjectId)));
  }
  const totalBalance = coins.reduce((sum, coin) => sum + BigInt(coin.balance), 0n);
  if (amount === totalBalance) {
    return primaryCoin;
  }
  const [splitCoin] = tx.splitCoins(primaryCoin, [tx.pure.u64(amount)]);
  return splitCoin;
}

function tokenLabel(token: FundTokenRecord | undefined, selectToken: string, notSet: string): string {
  return token ? `${token.symbol || token.coin_type} · ${shortId(token.coin_type, notSet)}` : selectToken;
}

function getDigest(result: unknown, missingMessage: string): string {
  const digest = asRecord(result).digest;
  if (typeof digest !== 'string' || !digest) {
    throw new Error(missingMessage);
  }
  return digest;
}

function readBasketSnapshot(objectData: unknown): Pick<BasketSnapshot, 'navUsdc' | 'liquidSui' | 'managedValueUsdc' | 'externalPositions'> {
  const fields = asRecord(asRecord(asRecord(objectData).content).fields);
  const tokenValueEntries = readVecMapEntries(fields.token_values_usdc);
  const externalEntries = readVecMapEntries(fields.external_positions);
  const externalPositions = externalEntries.map((entry) => {
    const value = asRecord(entry.value);
    return {
      positionId: readString(value.position_id || entry.key),
      positionKind: readString(value.position_kind),
      assetType: readString(value.asset_type),
      workingTokenType: readString(value.working_token_type),
      protocol: readString(value.protocol),
      externalObjectId: readString(value.external_object_id),
      amount: readBigInt(value.amount),
      principalValueUsdc: readBigInt(value.principal_value_usdc),
      currentValueUsdc: readBigInt(value.current_value_usdc),
      active: Boolean(value.active),
    };
  });

  return {
    navUsdc: readBigInt(fields.nav_usdc),
    liquidSui: readBalance(fields.sui_vault),
    managedValueUsdc: tokenValueEntries.reduce((sum, entry) => sum + readBigInt(entry.value), 0n)
      + externalPositions.reduce((sum, item) => sum + (item.active ? item.currentValueUsdc : 0n), 0n),
    externalPositions,
  };
}

export function FundBasketPage() {
  const { messages } = useI18n();
  const t = messages.fundBasket;
  const client = useSuiClient();
  const account = useCurrentAccount();
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const [tokens, setTokens] = React.useState<FundTokenRecord[]>([]);
  const [snapshot, setSnapshot] = React.useState<BasketSnapshot | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [lastDigest, setLastDigest] = React.useState<string | null>(null);
  const [oracleBusy, setOracleBusy] = React.useState(false);
  const [oracleQuote, setOracleQuote] = React.useState<OracleValueQuote | null>(null);
  const [managedForm, setManagedForm] = React.useState<ManagedForm>({
    coinType: SUI_COIN_TYPE,
    vaultId: '',
    amount: '',
    valueUsdc: '',
    recipient: '',
    positionKind: 'coin',
  });
  const [externalForm, setExternalForm] = React.useState<ExternalForm>({
    positionId: '',
    positionKind: 'lp',
    assetType: SUI_COIN_TYPE,
    workingTokenType: '',
    protocol: '',
    externalObjectId: '',
    amount: '0',
    principalValueUsdc: '0',
    currentValueUsdc: '0',
    active: true,
  });

  const selectedToken = React.useMemo(
    () => tokens.find((token) => token.coin_type === managedForm.coinType) ?? tokens[0],
    [managedForm.coinType, tokens],
  );

  const selectedVault = React.useMemo(
    () => snapshot?.vaults.find((vault) => vault.vaultId === managedForm.vaultId),
    [managedForm.vaultId, snapshot?.vaults],
  );

  const patchManagedForm = (patch: Partial<ManagedForm>) => {
    setOracleQuote(null);
    setManagedForm((current) => ({ ...current, ...patch }));
  };
  const patchExternalForm = (patch: Partial<ExternalForm>) => setExternalForm((current) => ({ ...current, ...patch }));

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [tokenRecords, basketObject, vaultEvents, depositEvents, withdrawEvents] = await Promise.all([
        getFundTokens({ network: SUI_NETWORK || SUI_FUND_CONFIG.network, packageId: SUI_FUND_CONFIG.packageId, includeDisabled: true }),
        SUI_FUND_CONFIG.basketId
          ? client.getObject({ id: SUI_FUND_CONFIG.basketId, options: { showContent: true } })
          : Promise.resolve(null),
        client.queryEvents({ query: { MoveEventType: `${SUI_FUND_CONFIG.packageId}::portfolio::AssetVaultCreatedEvent` }, order: 'descending', limit: EVENT_LIMIT }),
        client.queryEvents({ query: { MoveEventType: `${SUI_FUND_CONFIG.packageId}::portfolio::ManagedAssetDepositedEvent` }, order: 'descending', limit: EVENT_LIMIT }),
        client.queryEvents({ query: { MoveEventType: `${SUI_FUND_CONFIG.packageId}::portfolio::ManagedAssetWithdrawnEvent` }, order: 'descending', limit: EVENT_LIMIT }),
      ]);

      const enabledTokens = tokenRecords.filter((token) => token.enabled);
      setTokens(enabledTokens);
      setManagedForm((current) => ({
        ...current,
        coinType: current.coinType && enabledTokens.some((token) => token.coin_type === current.coinType)
          ? current.coinType
          : enabledTokens[0]?.coin_type || SUI_COIN_TYPE,
      }));

      const baseSnapshot = basketObject?.data
        ? readBasketSnapshot(basketObject.data)
        : { navUsdc: 0n, liquidSui: 0n, managedValueUsdc: 0n, externalPositions: [] };

      const valueByVault = new Map<string, bigint>();
      for (const event of depositEvents.data) {
        const fields = asRecord(event.parsedJson);
        const vaultId = readString(fields.vault_id);
        const value = readBigInt(fields.value_usdc);
        if (!vaultId) {
          continue;
        }
        valueByVault.set(vaultId, (valueByVault.get(vaultId) ?? 0n) + value);
      }
      for (const event of withdrawEvents.data) {
        const fields = asRecord(event.parsedJson);
        const vaultId = readString(fields.vault_id);
        const value = readBigInt(fields.value_usdc);
        if (!vaultId) {
          continue;
        }
        const current = valueByVault.get(vaultId) ?? 0n;
        valueByVault.set(vaultId, current > value ? current - value : 0n);
      }

      const vaults = await Promise.all(vaultEvents.data.map(async (event): Promise<VaultRow> => {
        const fields = asRecord(event.parsedJson);
        const vaultId = readString(fields.vault_id);
        let balance = 0n;
        try {
          const vaultObject = await client.getObject({ id: vaultId, options: { showContent: true } });
          const vaultFields = asRecord(asRecord(asRecord(vaultObject.data).content).fields);
          balance = readBalance(vaultFields.balance);
        } catch {
          balance = 0n;
        }
        return {
          vaultId,
          assetType: readString(fields.asset_type),
          positionKind: readString(fields.position_kind),
          balance,
          valueUsdc: valueByVault.get(vaultId) ?? 0n,
        };
      }));

      setSnapshot({ ...baseSnapshot, vaults });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [client]);

  React.useEffect(() => {
    void load();
  }, [load]);

  function assertManagerReady() {
    if (!account?.address) {
      throw new Error(t.errors.connectManagerWallet);
    }
    if (!SUI_FUND_CONFIG.packageId || !SUI_FUND_CONFIG.managerCapId || !SUI_FUND_CONFIG.registryId || !SUI_FUND_CONFIG.basketId) {
      throw new Error(t.errors.envConfigMissing);
    }
  }

  async function runTransaction(label: string, tx: Transaction) {
    setBusy(label);
    setNotice(null);
    setError(null);
    setLastDigest(null);
    try {
      const result = await signAndExecuteTransaction({ transaction: tx });
      const digest = getDigest(result, t.errors.missingDigest);
      await client.waitForTransaction({ digest, options: { showEffects: true, showEvents: true } });
      setLastDigest(digest);
      setNotice(t.noticeRecorded);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  async function handleCreateVault() {
    assertManagerReady();
    const coinType = managedForm.coinType.trim();
    const tx = new Transaction();
    tx.moveCall({
      target: `${SUI_FUND_CONFIG.packageId}::portfolio::create_asset_vault`,
      typeArguments: [coinType],
      arguments: [
        tx.object(SUI_FUND_CONFIG.managerCapId),
        tx.object(SUI_FUND_CONFIG.registryId),
        tx.object(SUI_FUND_CONFIG.basketId),
        tx.pure.string(managedForm.positionKind || 'coin'),
      ],
    });
    await runTransaction('create-vault', tx);
  }

  async function handleDepositManagedAsset() {
    assertManagerReady();
    if (!account?.address || !selectedToken) {
      throw new Error(t.errors.pickTokenConnect);
    }
    if (!managedForm.vaultId) {
      throw new Error(t.errors.vaultIdRequired);
    }
    const amount = parseDecimalAmount(managedForm.amount, selectedToken.decimals);
    const valueUsdc = parseDecimalAmount(managedForm.valueUsdc, USDC_DECIMALS);
    if (!amount || amount <= 0n || valueUsdc === null) {
      throw new Error(t.errors.fillAmountValueUsdc);
    }

    const tx = new Transaction();
    tx.setSender(account.address);
    const payment = selectedToken.coin_type.toLowerCase() === SUI_COIN_TYPE.toLowerCase()
      ? tx.splitCoins(tx.gas, [tx.pure.u64(amount)])[0]
      : buildCoinArgument(tx, await fetchAllCoins(client, account.address, selectedToken.coin_type), amount);
    tx.moveCall({
      target: `${SUI_FUND_CONFIG.packageId}::portfolio::deposit_managed_asset`,
      typeArguments: [selectedToken.coin_type],
      arguments: [
        tx.object(SUI_FUND_CONFIG.managerCapId),
        tx.object(SUI_FUND_CONFIG.registryId),
        tx.object(SUI_FUND_CONFIG.basketId),
        tx.object(managedForm.vaultId),
        payment,
        tx.pure.u64(valueUsdc),
      ],
    });
    await runTransaction('deposit', tx);
  }

  async function handleCalculateOracleValue() {
    if (!selectedToken) {
      throw new Error(t.errors.pickTokenVault);
    }
    const amount = parseDecimalAmount(managedForm.amount, selectedToken.decimals);
    if (!amount || amount <= 0n) {
      throw new Error(t.errors.oracleAmountRequired);
    }

    setOracleBusy(true);
    setError(null);
    setNotice(null);
    try {
      const quote = await calculateOracleValueUsdc({
        amountBaseUnits: amount,
        tokenDecimals: selectedToken.decimals,
        tokenPriceFeedId: selectedToken.price_feed_id,
        tokenSymbol: selectedToken.symbol,
      });
      setOracleQuote(quote);
      setManagedForm((current) => ({ ...current, valueUsdc: quote.valueUsdc }));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || t.errors.oraclePriceUnavailable);
    } finally {
      setOracleBusy(false);
    }
  }

  async function handleWithdrawManagedAsset() {
    assertManagerReady();
    if (!selectedToken || !managedForm.vaultId) {
      throw new Error(t.errors.pickTokenVault);
    }
    const amount = parseDecimalAmount(managedForm.amount, selectedToken.decimals);
    const valueUsdc = parseDecimalAmount(managedForm.valueUsdc, USDC_DECIMALS);
    if (!amount || amount <= 0n || valueUsdc === null) {
      throw new Error(t.errors.fillAmountValueUsdc);
    }
    const recipient = managedForm.recipient.trim() || account?.address || '';
    if (!recipient) {
      throw new Error(t.errors.recipientRequired);
    }
    const tx = new Transaction();
    tx.moveCall({
      target: `${SUI_FUND_CONFIG.packageId}::portfolio::withdraw_managed_asset`,
      typeArguments: [selectedToken.coin_type],
      arguments: [
        tx.object(SUI_FUND_CONFIG.managerCapId),
        tx.object(SUI_FUND_CONFIG.basketId),
        tx.object(managedForm.vaultId),
        tx.pure.u64(amount),
        tx.pure.u64(valueUsdc),
        tx.pure.address(recipient),
      ],
    });
    await runTransaction('withdraw', tx);
  }

  async function handleSetManagedValue() {
    assertManagerReady();
    if (!selectedToken || !managedForm.vaultId) {
      throw new Error(t.errors.pickTokenVault);
    }
    const valueUsdc = parseDecimalAmount(managedForm.valueUsdc, USDC_DECIMALS);
    if (valueUsdc === null) {
      throw new Error(t.errors.valueUsdcRequired);
    }
    const tx = new Transaction();
    tx.moveCall({
      target: `${SUI_FUND_CONFIG.packageId}::portfolio::set_managed_asset_value`,
      typeArguments: [selectedToken.coin_type],
      arguments: [
        tx.object(SUI_FUND_CONFIG.managerCapId),
        tx.object(SUI_FUND_CONFIG.basketId),
        tx.object(managedForm.vaultId),
        tx.pure.u64(valueUsdc),
      ],
    });
    await runTransaction('set-value', tx);
  }

  async function handleUpsertExternalPosition() {
    assertManagerReady();
    const tx = new Transaction();
    tx.moveCall({
      target: `${SUI_FUND_CONFIG.packageId}::portfolio::upsert_external_position`,
      arguments: [
        tx.object(SUI_FUND_CONFIG.managerCapId),
        tx.object(SUI_FUND_CONFIG.registryId),
        tx.object(SUI_FUND_CONFIG.basketId),
        tx.pure.string(externalForm.positionId),
        tx.pure.string(externalForm.positionKind),
        tx.pure.string(externalForm.assetType),
        tx.pure.string(externalForm.workingTokenType),
        tx.pure.string(externalForm.protocol),
        tx.pure.string(externalForm.externalObjectId),
        tx.pure.u64(parseU64(externalForm.amount, t.amount, t.errors.u64Integer)),
        tx.pure.u64(parseDecimalAmount(externalForm.principalValueUsdc, USDC_DECIMALS) ?? 0n),
        tx.pure.u64(parseDecimalAmount(externalForm.currentValueUsdc, USDC_DECIMALS) ?? 0n),
        tx.pure.bool(externalForm.active),
      ],
    });
    await runTransaction('upsert-external', tx);
  }

  async function handleCloseExternalPosition(positionId?: string) {
    assertManagerReady();
    const tx = new Transaction();
    tx.moveCall({
      target: `${SUI_FUND_CONFIG.packageId}::portfolio::close_external_position`,
      arguments: [
        tx.object(SUI_FUND_CONFIG.managerCapId),
        tx.object(SUI_FUND_CONFIG.basketId),
        tx.pure.string(positionId || externalForm.positionId),
        tx.pure.u64(parseDecimalAmount(externalForm.currentValueUsdc, USDC_DECIMALS) ?? 0n),
      ],
    });
    await runTransaction('close-external', tx);
  }

  const inputClass = 'w-full rounded-xl border border-white/[0.09] bg-slate-950/70 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-teal-300/40';
  const buttonClass = 'inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/[0.09] bg-white/[0.05] px-4 text-sm font-semibold text-slate-100 transition hover:border-teal-300/30 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-55';

  return (
    <main className="relative min-h-[calc(100vh-160px)] pb-14 pt-14">
      <PageBreadcrumbsBar items={[{ label: messages.breadcrumbs.home, href: getBasePath() }, { label: t.breadcrumb }]} />
      <PageHeroShell
        badge={<PageHeroBadge label={t.heroBadge} icon={<BriefcaseBusiness className="h-3.5 w-3.5" />} variant="teal" />}
        title={t.title}
        subtitle={t.subtitle}
        belowIntro={
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.5rem] border border-white/[0.08] bg-white/[0.035] p-4 backdrop-blur-xl">
              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{t.managerWallet}</div>
                <div className="mt-1 font-mono text-xs text-slate-300">{account?.address ? shortId(account.address, t.notAvailableShort) : t.notConnected}</div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <ConnectButton />
                <button type="button" onClick={() => void load()} disabled={loading} className={buttonClass}>
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  {t.refresh}
                </button>
              </div>
            </div>

            {notice ? <div className="rounded-xl border border-emerald-300/15 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">{notice}</div> : null}
            {error ? <div className="rounded-xl border border-rose-300/15 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">{error}</div> : null}
            {lastDigest ? <div className="break-all rounded-xl border border-white/[0.08] bg-white/[0.035] px-4 py-3 font-mono text-xs text-slate-400">{t.txPrefix} {lastDigest}</div> : null}

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-[1.5rem] border border-white/[0.08] bg-white/[0.04] p-5">
                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {t.nav} <Database className="h-4 w-4 text-teal-100" />
                </div>
                <div className="mt-4 text-2xl font-semibold text-white">{snapshot ? `${formatUnits(snapshot.navUsdc, USDC_DECIMALS, 6)}${t.usdcSuffix}` : t.loadingEllipsis}</div>
              </div>
              <div className="rounded-[1.5rem] border border-white/[0.08] bg-white/[0.04] p-5">
                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {t.liquidSui} <Wallet className="h-4 w-4 text-teal-100" />
                </div>
                <div className="mt-4 text-2xl font-semibold text-white">{snapshot ? `${formatUnits(snapshot.liquidSui, MIST_DECIMALS, 6)}${t.suiSuffix}` : t.loadingEllipsis}</div>
              </div>
              <div className="rounded-[1.5rem] border border-white/[0.08] bg-white/[0.04] p-5">
                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {t.managedValue} <Layers3 className="h-4 w-4 text-teal-100" />
                </div>
                <div className="mt-4 text-2xl font-semibold text-white">{snapshot ? `${formatUnits(snapshot.managedValueUsdc, USDC_DECIMALS, 6)}${t.usdcSuffix}` : t.loadingEllipsis}</div>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
              <section className="rounded-[2rem] border border-white/[0.08] bg-white/[0.035] p-5 backdrop-blur-xl">
                <div className="flex flex-col gap-2 border-b border-white/[0.07] pb-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <div className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-200">{t.vaultsTitle}</div>
                    <div className="mt-1 text-sm text-slate-500">{t.vaultsSubtitle}</div>
                  </div>
                  <div className="text-xs text-slate-500">{t.vaultsCount.replace('{count}', String(snapshot?.vaults.length ?? 0))}</div>
                </div>
                <div className="mt-5 overflow-x-auto">
                  <table className="w-full min-w-[820px] text-left text-sm">
                    <thead className="text-xs uppercase tracking-[0.16em] text-slate-500">
                      <tr className="border-b border-white/[0.07]">
                        <th className="px-3 py-3">{t.colToken}</th>
                        <th className="px-3 py-3">{t.colVault}</th>
                        <th className="px-3 py-3">{t.colKind}</th>
                        <th className="px-3 py-3">{t.colBalance}</th>
                        <th className="px-3 py-3">{t.colValue}</th>
                        <th className="px-3 py-3">{t.colAction}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {!snapshot?.vaults.length ? (
                        <tr><td colSpan={6} className="px-3 py-8 text-center text-slate-500">{t.vaultsEmpty}</td></tr>
                      ) : snapshot.vaults.map((vault) => {
                        const token = tokens.find((item) => item.coin_type === vault.assetType);
                        return (
                          <tr key={vault.vaultId} className="border-b border-white/[0.05] text-slate-300">
                            <td className="px-3 py-4">
                              <div className="font-semibold text-white">{token?.symbol || shortId(vault.assetType, t.notAvailableShort)}</div>
                              <div className="mt-1 max-w-[240px] truncate font-mono text-[11px] text-slate-600" title={vault.assetType}>{vault.assetType}</div>
                            </td>
                            <td className="px-3 py-4 font-mono text-xs">{shortId(vault.vaultId, t.notAvailableShort)}</td>
                            <td className="px-3 py-4 text-xs">{vault.positionKind}</td>
                            <td className="px-3 py-4 font-mono text-xs">{formatUnits(vault.balance, token?.decimals ?? 9, 6)}</td>
                            <td className="px-3 py-4 font-mono text-xs">{formatUnits(vault.valueUsdc, USDC_DECIMALS, 6)}{t.usdcSuffix}</td>
                            <td className="px-3 py-4">
                              <button type="button" className="text-xs font-semibold text-teal-200 hover:text-teal-100" onClick={() => patchManagedForm({ coinType: vault.assetType, vaultId: vault.vaultId })}>
                                {t.use}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="rounded-[2rem] border border-white/[0.08] bg-white/[0.035] p-5 backdrop-blur-xl">
                <div className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-200">{t.managedActionTitle}</div>
                <div className="mt-5 space-y-4">
                  <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{t.whitelistedToken}</label>
                  <select className={inputClass} value={managedForm.coinType} onChange={(event) => patchManagedForm({ coinType: event.target.value, vaultId: snapshot?.vaults.find((vault) => vault.assetType === event.target.value)?.vaultId || '' })}>
                        {tokens.map((token) => <option key={token.id} value={token.coin_type}>{tokenLabel(token, t.selectToken, t.notAvailableShort)}</option>)}
                  </select>

                  <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{t.vaultObjectId}</label>
                  <input className={`${inputClass} font-mono text-xs`} value={managedForm.vaultId} onChange={(event) => patchManagedForm({ vaultId: event.target.value })} placeholder={t.placeholderVaultId} />

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{t.amount}</label>
                      <input className={inputClass} value={managedForm.amount} onChange={(event) => patchManagedForm({ amount: event.target.value })} placeholder={t.placeholderAmount} />
                    </div>
	                    <div>
	                      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{t.valueInUsdc}</label>
	                      <input className={inputClass} value={managedForm.valueUsdc} onChange={(event) => patchManagedForm({ valueUsdc: event.target.value })} placeholder={t.placeholderValueUsdc} />
	                      <div className="mt-2 text-xs leading-5 text-slate-500">{t.valueInUsdcHint}</div>
	                      <button
	                        type="button"
	                        className="mt-2 inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-sky-300/25 bg-sky-300/10 px-3 text-xs font-bold text-sky-100 transition hover:bg-sky-300/15 disabled:opacity-60"
	                        disabled={oracleBusy || Boolean(busy)}
	                        onClick={() => void handleCalculateOracleValue()}
	                      >
	                        <RefreshCw className={`h-3.5 w-3.5 ${oracleBusy ? 'animate-spin' : ''}`} />
	                        {oracleBusy ? t.oracleEstimateBusy : t.oracleEstimate}
	                      </button>
	                      {oracleQuote ? (
	                        <div className="mt-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs leading-5 text-slate-400">
	                          {t.oracleQuotePrefix}: {t.oracleValueLabel} {oracleQuote.valueUsdc} USDC · {t.oracleTokenPriceLabel} ${oracleQuote.tokenUsdPrice.toFixed(6)} · {t.oracleSuiPriceLabel} ${oracleQuote.suiUsdPrice.toFixed(6)}
	                        </div>
	                      ) : null}
	                    </div>
	                  </div>

                  <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{t.positionKind}</label>
                  <input className={inputClass} value={managedForm.positionKind} onChange={(event) => patchManagedForm({ positionKind: event.target.value })} placeholder={t.placeholderPositionKind} />

                  <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{t.recipientWithdraw}</label>
                  <input className={`${inputClass} font-mono text-xs`} value={managedForm.recipient} onChange={(event) => patchManagedForm({ recipient: event.target.value })} placeholder={account?.address || t.placeholderRecipient} />

                  <div className="grid gap-2 sm:grid-cols-2">
                    <button type="button" className={buttonClass} disabled={Boolean(busy)} onClick={() => void handleCreateVault()}>
                      <Database className="h-4 w-4" /> {t.createVault}
                    </button>
                    <button type="button" className={buttonClass} disabled={Boolean(busy || !selectedVault)} onClick={() => void handleSetManagedValue()}>
                      <Save className="h-4 w-4" /> {t.setValue}
                    </button>
                    <button type="button" className={buttonClass} disabled={Boolean(busy)} onClick={() => void handleDepositManagedAsset()}>
                      <ArrowDownToLine className="h-4 w-4" /> {t.deposit}
                    </button>
                    <button type="button" className={buttonClass} disabled={Boolean(busy)} onClick={() => void handleWithdrawManagedAsset()}>
                      <ArrowUpFromLine className="h-4 w-4" /> {t.withdraw}
                    </button>
                  </div>
                </div>
              </section>
            </div>

            <section className="rounded-[2rem] border border-white/[0.08] bg-white/[0.035] p-5 backdrop-blur-xl">
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-200">{t.externalTitle}</div>
              <div className="mt-5 grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[860px] text-left text-sm">
                    <thead className="text-xs uppercase tracking-[0.16em] text-slate-500">
                      <tr className="border-b border-white/[0.07]">
                        <th className="px-3 py-3">{t.colPosition}</th>
                        <th className="px-3 py-3">{t.colProtocol}</th>
                        <th className="px-3 py-3">{t.colAsset}</th>
                        <th className="px-3 py-3">{t.colAmount}</th>
                        <th className="px-3 py-3">{t.colValueShort}</th>
                        <th className="px-3 py-3">{t.colStatus}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {!snapshot?.externalPositions.length ? (
                        <tr><td colSpan={6} className="px-3 py-8 text-center text-slate-500">{t.externalEmpty}</td></tr>
                      ) : snapshot.externalPositions.map((position) => (
                        <tr key={position.positionId} className="border-b border-white/[0.05] text-slate-300">
                          <td className="px-3 py-4">
                            <button type="button" className="font-mono text-xs text-teal-200" onClick={() => patchExternalForm({
                              positionId: position.positionId,
                              positionKind: position.positionKind,
                              assetType: position.assetType,
                              workingTokenType: position.workingTokenType,
                              protocol: position.protocol,
                              externalObjectId: position.externalObjectId,
                              amount: position.amount.toString(),
                              principalValueUsdc: formatUnits(position.principalValueUsdc, USDC_DECIMALS, USDC_DECIMALS),
                              currentValueUsdc: formatUnits(position.currentValueUsdc, USDC_DECIMALS, USDC_DECIMALS),
                              active: position.active,
                            })}>{position.positionId}</button>
                          </td>
                          <td className="px-3 py-4">{position.protocol}</td>
                          <td className="px-3 py-4 font-mono text-xs">{shortId(position.assetType, t.notAvailableShort)}</td>
                          <td className="px-3 py-4 font-mono text-xs">{position.amount.toString()}</td>
                          <td className="px-3 py-4 font-mono text-xs">{formatUnits(position.currentValueUsdc, USDC_DECIMALS, 6)}{t.usdcSuffix}</td>
                          <td className={position.active ? 'px-3 py-4 text-emerald-200' : 'px-3 py-4 text-slate-500'}>{position.active ? t.statusActive : t.statusClosed}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="space-y-3">
                  <input className={inputClass} value={externalForm.positionId} onChange={(event) => patchExternalForm({ positionId: event.target.value })} placeholder={t.placeholderPositionId} />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input className={inputClass} value={externalForm.positionKind} onChange={(event) => patchExternalForm({ positionKind: event.target.value })} placeholder={t.placeholderLp} />
                    <input className={inputClass} value={externalForm.protocol} onChange={(event) => patchExternalForm({ protocol: event.target.value })} placeholder={t.placeholderProtocol} />
                  </div>
                  <input className={`${inputClass} font-mono text-xs`} value={externalForm.assetType} onChange={(event) => patchExternalForm({ assetType: event.target.value })} placeholder={t.placeholderPrimaryAsset} />
                  <input className={`${inputClass} font-mono text-xs`} value={externalForm.workingTokenType} onChange={(event) => patchExternalForm({ workingTokenType: event.target.value })} placeholder={t.placeholderWorkingToken} />
                  <input className={`${inputClass} font-mono text-xs`} value={externalForm.externalObjectId} onChange={(event) => patchExternalForm({ externalObjectId: event.target.value })} placeholder={t.placeholderExternalObjectId} />
                  <div className="grid gap-3 sm:grid-cols-3">
                    <input className={inputClass} value={externalForm.amount} onChange={(event) => patchExternalForm({ amount: event.target.value })} placeholder={t.placeholderRawAmount} />
                    <input className={inputClass} value={externalForm.principalValueUsdc} onChange={(event) => patchExternalForm({ principalValueUsdc: event.target.value })} placeholder={t.placeholderPrincipalUsdc} />
                    <input className={inputClass} value={externalForm.currentValueUsdc} onChange={(event) => patchExternalForm({ currentValueUsdc: event.target.value })} placeholder={t.placeholderCurrentUsdc} />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-slate-400">
                    <input type="checkbox" checked={externalForm.active} onChange={(event) => patchExternalForm({ active: event.target.checked })} />
                    {t.activePosition}
                  </label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <button type="button" className={buttonClass} disabled={Boolean(busy)} onClick={() => void handleUpsertExternalPosition()}>
                      <Save className="h-4 w-4" /> {t.savePosition}
                    </button>
                    <button type="button" className={buttonClass} disabled={Boolean(busy)} onClick={() => void handleCloseExternalPosition()}>
                      <ArrowUpFromLine className="h-4 w-4" /> {t.close}
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </div>
        }
      />
    </main>
  );
}
