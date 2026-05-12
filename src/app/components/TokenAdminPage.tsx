import React from 'react';
import { ConnectButton, useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { Database, Info, Lock, Plus, RefreshCw, RotateCw, Save, ShieldCheck, Trash2, X } from 'lucide-react';

import { SUI_NETWORK, SUI_RWA_ADMIN_CAP_ID, SUI_RWA_PACKAGE_ID } from '../config';
import { getBasePath } from '../lib/routes';
import { SUI_FUND_CONFIG } from '../lib/suiFund';
import {
  deleteFundToken,
  getFundShareSettings,
  getFundTokens,
  getRwaAdminCaps,
  saveRwaAdminCap,
  saveFundShareSettings,
  saveFundToken,
  type FundShareSettingsInput,
  type FundShareSettingsRecord,
  type FundTokenInput,
  type FundTokenRecord,
  type RwaAdminCapRecord,
} from '../lib/api';
import { useSwapLinkedWallets } from '../hooks/useSwapLinkedWallets';
import { useI18n } from '../i18n';
import { PageBreadcrumbsBar, PageHeroBadge, PageHeroShell } from './PageChrome';

type TokenFormState = FundTokenInput;
type ShareSettingsFormState = FundShareSettingsInput;

const SUI_COIN_TYPE = '0x2::sui::SUI';
const CLOCK_OBJECT_ID = '0x6';

const EMPTY_FORM: TokenFormState = {
  network: SUI_NETWORK || 'testnet',
  packageId: SUI_FUND_CONFIG.packageId,
  coinType: SUI_COIN_TYPE,
  symbol: 'SUI',
  name: 'Sui',
  decimals: 9,
  targetWeightBps: 10000,
  minWeightBps: 0,
  maxWeightBps: 10000,
  priceFeedId: '',
  logoUrl: 'https://assets.coingecko.com/coins/images/26375/large/sui-ocean-square.png',
  enabled: true,
  notes: 'Allowed by av8_capital::assets_registry in the deployed MVP package.',
};

type RebalanceForm = {
  assetIn: string;
  assetOut: string;
  amountIn: string;
  expectedOut: string;
  actualOut: string;
  tradeBps: string;
  oracleAgeMs: string;
  navAfterSui: string;
};

const EMPTY_REBALANCE: RebalanceForm = {
  assetIn: SUI_COIN_TYPE,
  assetOut: SUI_COIN_TYPE,
  amountIn: '0',
  expectedOut: '0',
  actualOut: '0',
  tradeBps: '0',
  oracleAgeMs: '0',
  navAfterSui: '0',
};

const EMPTY_SHARE_SETTINGS: ShareSettingsFormState = {
  network: SUI_NETWORK || 'testnet',
  packageId: SUI_FUND_CONFIG.packageId,
  shareConfigId: SUI_FUND_CONFIG.shareConfigId,
  shareAdminCapId: SUI_FUND_CONFIG.shareAdminCapId,
  shareTreasuryCapId: SUI_FUND_CONFIG.shareTreasuryCapId,
  pricingModel: 'nav_per_share',
  mintFeeBps: 0,
  redeemFeeBps: 0,
  redeemBurnBps: 10000,
  priceImpactBps: 0,
  minPriceSui: '0',
  basePriceSui: '0',
  maxSupply: '0',
  maxDailyMint: '0',
  mintPaused: false,
  redeemPaused: false,
  notes: 'AV8 mint price should be derived from portfolio NAV / circulating supply. Daily caps and fees are backend policy until wired into portfolio::deposit.',
};

function shortObjectId(value: string, notSet: string): string {
  if (!value) {
    return notSet;
  }

  return value.length > 18 ? `${value.slice(0, 10)}...${value.slice(-6)}` : value;
}

function normalizeAddress(value?: string | null): string {
  const trimmed = String(value || '').trim().toLowerCase();
  const match = trimmed.match(/^0x([a-f0-9]{1,64})$/);
  return match ? `0x${match[1].padStart(64, '0')}` : trimmed;
}

function extractObjectOwnerAddress(data: unknown): string {
  if (!data || typeof data !== 'object' || !('owner' in data)) {
    return '';
  }
  const owner = (data as { owner?: unknown }).owner;
  if (!owner || typeof owner !== 'object' || !('AddressOwner' in owner)) {
    return '';
  }
  const address = (owner as { AddressOwner?: unknown }).AddressOwner;
  return typeof address === 'string' ? address : '';
}

function bpsToPercent(value: number): string {
  return `${(Number(value || 0) / 100).toFixed(2)}%`;
}

function recordToForm(record: FundTokenRecord): TokenFormState {
  return {
    network: record.network,
    packageId: record.package_id,
    coinType: record.coin_type,
    symbol: record.symbol,
    name: record.name,
    decimals: record.decimals,
    targetWeightBps: record.target_weight_bps,
    minWeightBps: record.min_weight_bps,
    maxWeightBps: record.max_weight_bps,
    priceFeedId: record.price_feed_id,
    logoUrl: record.logo_url,
    enabled: record.enabled,
    notes: record.notes,
  };
}

function recordToShareSettingsForm(record: FundShareSettingsRecord): ShareSettingsFormState {
  return {
    network: record.network,
    packageId: record.package_id || SUI_FUND_CONFIG.packageId,
    shareConfigId: record.share_config_id || SUI_FUND_CONFIG.shareConfigId,
    shareAdminCapId: record.share_admin_cap_id || SUI_FUND_CONFIG.shareAdminCapId,
    shareTreasuryCapId: record.share_treasury_cap_id || SUI_FUND_CONFIG.shareTreasuryCapId,
    pricingModel: record.pricing_model,
    mintFeeBps: record.mint_fee_bps,
    redeemFeeBps: record.redeem_fee_bps,
    redeemBurnBps: record.redeem_burn_bps,
    priceImpactBps: record.price_impact_bps,
    minPriceSui: record.min_price_sui,
    basePriceSui: record.base_price_sui,
    maxSupply: record.max_supply,
    maxDailyMint: record.max_daily_mint,
    mintPaused: record.mint_paused,
    redeemPaused: record.redeem_paused,
    notes: record.notes,
  };
}

function parseU64Input(value: string, fieldLabel: string, template: string): bigint {
  const normalized = value.trim();
  if (!/^\d+$/.test(normalized)) {
    throw new Error(template.replace(/\{label\}/g, fieldLabel));
  }
  return BigInt(normalized);
}

function getDigest(result: unknown, missingMessage: string): string {
  if (result && typeof result === 'object' && 'digest' in result && typeof (result as { digest?: unknown }).digest === 'string') {
    return (result as { digest: string }).digest;
  }
  throw new Error(missingMessage);
}

function Field({
  label,
  help,
  children,
  className = '',
}: {
  label: string;
  help?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block min-w-0 ${className}`}>
      <span className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
        {help ? (
          <span className="group relative inline-flex">
            <span
              tabIndex={0}
              className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-slate-400 outline-none transition hover:border-teal-300/30 hover:text-teal-200 focus:border-teal-300/40 focus:text-teal-200"
              aria-label={help}
            >
              <Info className="h-3 w-3" />
            </span>
            <span className="pointer-events-none absolute left-1/2 top-6 z-30 hidden w-64 -translate-x-1/2 rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-left text-xs font-normal leading-5 tracking-normal text-slate-200 shadow-2xl shadow-black/40 group-hover:block group-focus-within:block">
              {help}
            </span>
          </span>
        ) : null}
      </span>
      {children}
    </label>
  );
}

const inputClass =
  'h-11 w-full rounded-xl border border-white/[0.09] bg-white/[0.04] px-3 text-sm text-slate-100 outline-none transition focus:border-teal-300/40 focus:bg-white/[0.07]';

const textareaClass =
  'min-h-24 w-full resize-y rounded-xl border border-white/[0.09] bg-white/[0.04] px-3 py-3 text-sm leading-6 text-slate-100 outline-none transition focus:border-teal-300/40 focus:bg-white/[0.07]';

export function TokenAdminPage() {
  const { messages } = useI18n();
  const t = messages.tokenAdmin;
  const homeHref = getBasePath();
  const account = useCurrentAccount();
  const suiClient = useSuiClient();
  const { selectedSuiAddress } = useSwapLinkedWallets();
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const connectedAdminAddress = normalizeAddress(account?.address || '');
  const adminAddress = connectedAdminAddress || normalizeAddress(selectedSuiAddress);
  const attemptedAutoRegisterKey = React.useRef('');

  const [tokens, setTokens] = React.useState<FundTokenRecord[]>([]);
  const [adminCaps, setAdminCaps] = React.useState<RwaAdminCapRecord[]>([]);
  const [form, setForm] = React.useState<TokenFormState>(EMPTY_FORM);
  const [shareSettings, setShareSettings] = React.useState<ShareSettingsFormState>(EMPTY_SHARE_SETTINGS);
  const [editingId, setEditingId] = React.useState<number | null>(null);
  const [rebalance, setRebalance] = React.useState<RebalanceForm>(EMPTY_REBALANCE);
  const [loading, setLoading] = React.useState(false);
  const [adminLoading, setAdminLoading] = React.useState(false);
  const [shareSettingsLoading, setShareSettingsLoading] = React.useState(false);
  const [shareSettingsSaving, setShareSettingsSaving] = React.useState(false);
  const [shareSettingsBusy, setShareSettingsBusy] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [whitelistBusy, setWhitelistBusy] = React.useState(false);
  const [rebalanceBusy, setRebalanceBusy] = React.useState(false);
  const [autoRegisteringAdmin, setAutoRegisteringAdmin] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<number | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [lastTxDigest, setLastTxDigest] = React.useState<string | null>(null);

  const adminCapForWallet = React.useMemo(
    () => adminCaps.find((cap) => normalizeAddress(cap.owner_address) === normalizeAddress(adminAddress)) ?? null,
    [adminAddress, adminCaps],
  );
  const hasAdminAccess = Boolean(adminAddress && adminCapForWallet);
  const hasConnectedAdminSigner = Boolean(connectedAdminAddress && normalizeAddress(connectedAdminAddress) === normalizeAddress(adminAddress));

  const totalTargetBps = React.useMemo(
    () => tokens.filter((token) => token.enabled).reduce((sum, token) => sum + Number(token.target_weight_bps || 0), 0),
    [tokens],
  );

  const loadAdminCaps = React.useCallback(async () => {
    setAdminLoading(true);
    setError(null);
    try {
      const items = await getRwaAdminCaps({
        network: SUI_NETWORK,
        packageId: SUI_RWA_PACKAGE_ID,
      });
      setAdminCaps(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setAdminLoading(false);
    }
  }, []);

  const loadTokens = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const items = await getFundTokens({
        network: form.network || SUI_NETWORK,
        packageId: form.packageId || undefined,
        includeDisabled: true,
      });
      setTokens(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [form.network, form.packageId]);

  const loadShareSettings = React.useCallback(async () => {
    setShareSettingsLoading(true);
    setError(null);
    try {
      const item = await getFundShareSettings({
        network: SUI_NETWORK,
        packageId: SUI_FUND_CONFIG.packageId || undefined,
      });
      setShareSettings(recordToShareSettingsForm(item));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setShareSettingsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadAdminCaps();
    void loadTokens();
    void loadShareSettings();
  }, []);

  React.useEffect(() => {
    if (!adminAddress || adminCapForWallet || autoRegisteringAdmin || !SUI_RWA_PACKAGE_ID || !SUI_RWA_ADMIN_CAP_ID) {
      return;
    }
    const autoRegisterKey = `${normalizeAddress(adminAddress)}:${normalizeAddress(SUI_RWA_ADMIN_CAP_ID)}`;
    if (attemptedAutoRegisterKey.current === autoRegisterKey) {
      return;
    }
    attemptedAutoRegisterKey.current = autoRegisterKey;

    let cancelled = false;

    async function registerConfiguredAdminCapIfOwned() {
      setAutoRegisteringAdmin(true);
      try {
        const object = await suiClient.getObject({
          id: SUI_RWA_ADMIN_CAP_ID,
          options: { showOwner: true },
        });
        const owner = extractObjectOwnerAddress(object.data);
        if (cancelled || normalizeAddress(owner) !== normalizeAddress(adminAddress)) {
          return;
        }

        await saveRwaAdminCap({
          network: SUI_NETWORK,
          packageId: SUI_RWA_PACKAGE_ID,
          adminCapId: SUI_RWA_ADMIN_CAP_ID,
          ownerAddress: adminAddress,
          label: `RWA AdminCap ${shortObjectId(adminAddress, '')}`,
        });
        if (!cancelled) {
          await loadAdminCaps();
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!cancelled) {
          setAutoRegisteringAdmin(false);
        }
      }
    }

    void registerConfiguredAdminCapIfOwned();

    return () => {
      cancelled = true;
    };
  }, [adminAddress, adminCapForWallet, autoRegisteringAdmin, loadAdminCaps, suiClient]);

  function patchForm(patch: Partial<TokenFormState>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  function patchRebalance(patch: Partial<RebalanceForm>) {
    setRebalance((current) => ({ ...current, ...patch }));
  }

  function patchShareSettings(patch: Partial<ShareSettingsFormState>) {
    setShareSettings((current) => ({ ...current, ...patch }));
  }

  function assertAdminReady() {
    if (!adminAddress) {
      throw new Error(t.errors.connectWallet);
    }
    if (!adminCapForWallet) {
      throw new Error(t.errors.notRegisteredAdmin);
    }
  }

  function assertFundOwnerCapReady() {
    if (!hasConnectedAdminSigner) {
      throw new Error(t.errors.connectWallet);
    }
    if (!SUI_FUND_CONFIG.packageId || !SUI_FUND_CONFIG.registryId || !SUI_FUND_CONFIG.adminCapId) {
      throw new Error(t.errors.fundOwnerCap);
    }
  }

  function assertShareSettingsReady() {
    if (!hasConnectedAdminSigner) {
      throw new Error(t.errors.connectWallet);
    }
    if (!shareSettings.packageId || !shareSettings.shareConfigId || !shareSettings.shareAdminCapId) {
      throw new Error(t.errors.shareSettings);
    }
  }

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setNotice(null);
    setError(null);
    setLastTxDigest(null);
  }

  async function handleRegisterAssetOnChain() {
    setWhitelistBusy(true);
    setError(null);
    setNotice(null);
    setLastTxDigest(null);

    try {
      assertAdminReady();
      assertFundOwnerCapReady();

      const tx = new Transaction();
      tx.moveCall({
        target: `${SUI_FUND_CONFIG.packageId}::assets_registry::register_asset`,
        typeArguments: [form.coinType.trim()],
        arguments: [
          tx.object(SUI_FUND_CONFIG.adminCapId),
          tx.object(SUI_FUND_CONFIG.registryId),
          tx.pure.bool(form.enabled),
          tx.pure.u64(form.targetWeightBps),
          tx.pure.u64(form.targetWeightBps),
          tx.pure.u64(form.minWeightBps),
          tx.pure.u64(form.maxWeightBps),
          tx.pure.string(form.priceFeedId || ''),
          tx.pure.string(form.coinType.trim()),
        ],
      });

      const result = await signAndExecuteTransaction({ transaction: tx });
      const digest = getDigest(result, t.errors.missingDigest);
      await suiClient.waitForTransaction({ digest, options: { showEffects: true, showEvents: true } });
      setLastTxDigest(digest);

      const saved = await saveFundToken(form, editingId ?? undefined, { adminAddress });
      setTokens((current) => {
        const withoutSaved = current.filter((token) => token.id !== saved.id);
        return [...withoutSaved, saved].sort((a, b) => Number(b.enabled) - Number(a.enabled) || a.symbol.localeCompare(b.symbol));
      });
      setEditingId(saved.id);
      setForm(recordToForm(saved));
      setNotice(t.notices.assetRegistered);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setWhitelistBusy(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      assertAdminReady();
      const saved = await saveFundToken(form, editingId ?? undefined, { adminAddress });
      setTokens((current) => {
        const withoutSaved = current.filter((token) => token.id !== saved.id);
        return [...withoutSaved, saved].sort((a, b) => Number(b.enabled) - Number(a.enabled) || a.symbol.localeCompare(b.symbol));
      });
      setEditingId(saved.id);
      setForm(recordToForm(saved));
      setNotice(t.notices.tokenSaved);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(token: FundTokenRecord) {
    setDeletingId(token.id);
    setError(null);
    setNotice(null);
    try {
      assertAdminReady();
      await deleteFundToken(token.id, { adminAddress });
      setTokens((current) => current.filter((item) => item.id !== token.id));
      if (editingId === token.id) {
        resetForm();
      }
      setNotice(t.notices.tokenDeleted.replace(/\{symbol\}/g, token.symbol));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setDeletingId(null);
    }
  }

  async function handleSaveShareSettings(event?: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setShareSettingsSaving(true);
    setError(null);
    setNotice(null);

    try {
      assertAdminReady();
      const saved = await saveFundShareSettings(shareSettings, { adminAddress });
      setShareSettings(recordToShareSettingsForm(saved));
      setNotice(t.notices.emissionSaved);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setShareSettingsSaving(false);
    }
  }

  async function handleApplyShareSettingsOnChain() {
    setShareSettingsBusy(true);
    setError(null);
    setNotice(null);
    setLastTxDigest(null);

    try {
      assertAdminReady();
      assertShareSettingsReady();

      const tx = new Transaction();
      tx.moveCall({
        target: `${shareSettings.packageId}::fund_share::set_redeem_burn_bps`,
        arguments: [
          tx.object(shareSettings.shareAdminCapId || ''),
          tx.object(shareSettings.shareConfigId || ''),
          tx.pure.u64(shareSettings.redeemBurnBps),
        ],
      });
      tx.moveCall({
        target: `${shareSettings.packageId}::fund_share::set_paused`,
        arguments: [
          tx.object(shareSettings.shareAdminCapId || ''),
          tx.object(shareSettings.shareConfigId || ''),
          tx.pure.bool(shareSettings.mintPaused || shareSettings.redeemPaused),
        ],
      });

      const result = await signAndExecuteTransaction({ transaction: tx });
      const digest = getDigest(result, t.errors.missingDigest);
      await suiClient.waitForTransaction({ digest, options: { showEffects: true, showEvents: true } });
      setLastTxDigest(digest);

      const saved = await saveFundShareSettings(shareSettings, { adminAddress });
      setShareSettings(recordToShareSettingsForm(saved));
      setNotice(t.notices.shareApplied);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setShareSettingsBusy(false);
    }
  }

  async function handleRebalanceStub() {
    setRebalanceBusy(true);
    setError(null);
    setNotice(null);
    setLastTxDigest(null);

    try {
      assertAdminReady();
      if (!hasConnectedAdminSigner) {
        throw new Error(t.errors.connectWallet);
      }
      if (!SUI_FUND_CONFIG.packageId || !SUI_FUND_CONFIG.managerCapId || !SUI_FUND_CONFIG.basketId || !SUI_FUND_CONFIG.strategyId) {
        throw new Error(t.errors.basketConfig);
      }

      const tx = new Transaction();
      tx.moveCall({
        target: `${SUI_FUND_CONFIG.packageId}::strategy_manager::rebalance_stub`,
        arguments: [
          tx.object(SUI_FUND_CONFIG.managerCapId),
          tx.object(SUI_FUND_CONFIG.basketId),
          tx.object(SUI_FUND_CONFIG.strategyId),
          tx.pure.string(rebalance.assetIn.trim()),
          tx.pure.string(rebalance.assetOut.trim()),
          tx.pure.u64(parseU64Input(rebalance.amountIn, t.rebalance.fields.amountIn.label, t.errors.fieldInteger)),
          tx.pure.u64(parseU64Input(rebalance.expectedOut, t.rebalance.fields.expectedOut.label, t.errors.fieldInteger)),
          tx.pure.u64(parseU64Input(rebalance.actualOut, t.rebalance.fields.actualOut.label, t.errors.fieldInteger)),
          tx.pure.u64(parseU64Input(rebalance.tradeBps, t.rebalance.fields.tradeBps.label, t.errors.fieldInteger)),
          tx.pure.u64(parseU64Input(rebalance.oracleAgeMs, t.rebalance.fields.oracleAgeMs.label, t.errors.fieldInteger)),
          tx.pure.u64(parseU64Input(rebalance.navAfterSui, t.rebalance.fields.navAfterSui.label, t.errors.fieldInteger)),
          tx.object(CLOCK_OBJECT_ID),
        ],
      });

      const result = await signAndExecuteTransaction({ transaction: tx });
      const digest = getDigest(result, t.errors.missingDigest);
      await suiClient.waitForTransaction({ digest, options: { showEffects: true, showEvents: true } });
      setLastTxDigest(digest);
      setNotice(t.notices.rebalanceRecorded);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRebalanceBusy(false);
    }
  }

  return (
    <main className="relative min-h-[calc(100vh-160px)] pb-14 pt-14">
      <PageBreadcrumbsBar
        items={[
          { label: messages.breadcrumbs.home, href: homeHref },
          { label: t.breadcrumbCurrent },
        ]}
      />
      <PageHeroShell
        badge={<PageHeroBadge label={t.heroBadge} icon={<Database className="h-3.5 w-3.5" />} variant="sky" />}
        title={t.title}
        subtitle={t.subtitle}
        belowIntro={
          <div className="space-y-6">
            <section className="rounded-[2rem] border border-white/[0.08] bg-white/[0.035] p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] backdrop-blur-xl">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-teal-200">
                    {hasAdminAccess ? <ShieldCheck className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                    {t.admin.title}
                  </div>
                  <div className="mt-2 text-sm leading-6 text-slate-400">{t.admin.body}</div>
                  <div className="mt-2 font-mono text-xs text-slate-500">
                    {t.admin.walletPrefix}{' '}
                    {adminAddress ? shortObjectId(adminAddress, t.admin.shortNotSet) : t.admin.notConnected} · {t.admin.capPrefix}{' '}
                    {adminCapForWallet ? shortObjectId(adminCapForWallet.admin_cap_id, t.admin.shortNotSet) : t.admin.notMatched}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <ConnectButton />
                  <button
                    type="button"
                    onClick={() => void loadAdminCaps()}
                    disabled={adminLoading}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/[0.09] bg-white/[0.04] px-4 text-sm font-semibold text-slate-200 transition hover:border-teal-300/25 hover:bg-white/[0.07] disabled:opacity-60"
                  >
                    <RefreshCw className={`h-4 w-4 ${adminLoading ? 'animate-spin' : ''}`} />
                    {t.admin.capsButton}
                  </button>
                </div>
              </div>
            </section>

            <div className="space-y-6">
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_430px]">
                <section className="rounded-[2rem] border border-white/[0.08] bg-white/[0.035] p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] backdrop-blur-xl">
                <div className="flex flex-col gap-3 border-b border-white/[0.07] pb-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-200">{t.table.savedTitle}</div>
                    <div className="mt-1 text-sm text-slate-500">
                      {t.table.targetWeightPrefix} <span className="text-slate-300">{bpsToPercent(totalTargetBps)}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void loadTokens()}
                    disabled={loading}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/[0.09] bg-white/[0.04] px-4 text-sm font-semibold text-slate-200 transition hover:border-teal-300/25 hover:bg-white/[0.07] disabled:opacity-60"
                  >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    {t.table.refresh}
                  </button>
                </div>

                <div className="mt-5 overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead className="text-xs uppercase tracking-[0.16em] text-slate-500">
                      <tr className="border-b border-white/[0.07]">
                        <th className="px-3 py-3 font-semibold">{t.table.colToken}</th>
                        <th className="px-3 py-3 font-semibold">{t.table.colCoinType}</th>
                        <th className="px-3 py-3 font-semibold">{t.table.colWeights}</th>
                        <th className="px-3 py-3 font-semibold">{t.table.colStatus}</th>
                        <th className="px-3 py-3 text-right font-semibold">{t.table.colActions}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tokens.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-3 py-8 text-center text-slate-500">
                            {loading ? t.table.loading : t.table.empty}
                          </td>
                        </tr>
                      ) : (
                        tokens.map((token) => (
                          <tr key={token.id} className="border-b border-white/[0.05] text-slate-300">
                            <td className="px-3 py-4">
                              <div className="flex items-center gap-3">
                                {token.logo_url ? (
                                  <img src={token.logo_url} alt="" className="h-9 w-9 rounded-full object-cover ring-1 ring-white/10" />
                                ) : (
                                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-400/10 text-xs font-bold text-teal-200 ring-1 ring-teal-300/15">
                                    {token.symbol.slice(0, 2)}
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <div className="font-semibold text-white">{token.symbol}</div>
                                  <div className="truncate text-xs text-slate-500">{token.name}</div>
                                </div>
                              </div>
                            </td>
                            <td className="max-w-[280px] px-3 py-4">
                              <div className="truncate font-mono text-xs text-slate-400" title={token.coin_type}>
                                {token.coin_type}
                              </div>
                              <div className="mt-1 text-xs text-slate-600">
                                {t.table.decimalsWord} {token.decimals}
                              </div>
                            </td>
                            <td className="px-3 py-4 text-xs">
                              <div>
                                {t.table.targetPrefix} {bpsToPercent(token.target_weight_bps)}
                              </div>
                              <div className="mt-1 text-slate-500">
                                {bpsToPercent(token.min_weight_bps)} {t.table.rangeJoin} {bpsToPercent(token.max_weight_bps)}
                              </div>
                            </td>
                            <td className="px-3 py-4">
                              <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                                token.enabled
                                  ? 'border-emerald-300/20 bg-emerald-400/10 text-emerald-200'
                                  : 'border-slate-500/20 bg-slate-500/10 text-slate-400'
                              }`}>
                                {token.enabled ? t.table.enabled : t.table.disabled}
                              </span>
                            </td>
                            <td className="px-3 py-4">
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingId(token.id);
                                    setForm(recordToForm(token));
                                    setNotice(null);
                                    setError(null);
                                  }}
                                  className="h-9 rounded-lg border border-white/[0.09] px-3 text-xs font-semibold text-slate-200 transition hover:bg-white/[0.07]"
                                >
                                  {t.table.edit}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handleDelete(token)}
                                  disabled={deletingId === token.id || !hasAdminAccess}
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rose-300/15 text-rose-200 transition hover:bg-rose-400/10 disabled:opacity-60"
                                  aria-label={`${t.table.deleteAria} ${token.symbol}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                </section>

                <aside>
                  <section className="rounded-[2rem] border border-white/[0.08] bg-white/[0.035] p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] backdrop-blur-xl">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-200">
                        {editingId ? t.tokenPanel.editTitle : t.tokenPanel.newTitle}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {t.tokenPanel.packagePrefix} {shortObjectId(form.packageId || SUI_FUND_CONFIG.packageId, t.admin.shortNotSet)}
                      </div>
                    </div>
                    {editingId ? (
                      <button
                        type="button"
                        onClick={resetForm}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.09] text-slate-300 transition hover:bg-white/[0.07]"
                        aria-label={t.cancelEditAria}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>

                  <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label={t.tokenPanel.fields.network.label} help={t.tokenPanel.fields.network.help}>
                        <input className={inputClass} value={form.network} onChange={(event) => patchForm({ network: event.target.value })} />
                      </Field>
                      <Field label={t.tokenPanel.fields.decimals.label} help={t.tokenPanel.fields.decimals.help}>
                        <input className={inputClass} type="number" min={0} max={18} value={form.decimals} onChange={(event) => patchForm({ decimals: Number(event.target.value) })} />
                      </Field>
                    </div>
                    <Field label={t.tokenPanel.fields.packageId.label} help={t.tokenPanel.fields.packageId.help}>
                      <input className={`${inputClass} font-mono text-xs`} value={form.packageId || ''} onChange={(event) => patchForm({ packageId: event.target.value })} />
                    </Field>
                    <Field label={t.tokenPanel.fields.coinType.label} help={t.tokenPanel.fields.coinType.help}>
                      <input className={`${inputClass} font-mono text-xs`} required value={form.coinType} onChange={(event) => patchForm({ coinType: event.target.value })} />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label={t.tokenPanel.fields.symbol.label} help={t.tokenPanel.fields.symbol.help}>
                        <input className={inputClass} required value={form.symbol} onChange={(event) => patchForm({ symbol: event.target.value })} />
                      </Field>
                      <Field label={t.tokenPanel.fields.name.label} help={t.tokenPanel.fields.name.help}>
                        <input className={inputClass} required value={form.name} onChange={(event) => patchForm({ name: event.target.value })} />
                      </Field>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <Field label={t.tokenPanel.fields.targetBps.label} help={t.tokenPanel.fields.targetBps.help}>
                        <input className={inputClass} type="number" min={0} max={10000} value={form.targetWeightBps} onChange={(event) => patchForm({ targetWeightBps: Number(event.target.value) })} />
                      </Field>
                      <Field label={t.tokenPanel.fields.minBps.label} help={t.tokenPanel.fields.minBps.help}>
                        <input className={inputClass} type="number" min={0} max={10000} value={form.minWeightBps} onChange={(event) => patchForm({ minWeightBps: Number(event.target.value) })} />
                      </Field>
                      <Field label={t.tokenPanel.fields.maxBps.label} help={t.tokenPanel.fields.maxBps.help}>
                        <input className={inputClass} type="number" min={0} max={10000} value={form.maxWeightBps} onChange={(event) => patchForm({ maxWeightBps: Number(event.target.value) })} />
                      </Field>
                    </div>
                    <Field label={t.tokenPanel.fields.priceFeedId.label} help={t.tokenPanel.fields.priceFeedId.help}>
                      <input className={`${inputClass} font-mono text-xs`} value={form.priceFeedId || ''} onChange={(event) => patchForm({ priceFeedId: event.target.value })} />
                    </Field>
                    <Field label={t.tokenPanel.fields.logoUrl.label} help={t.tokenPanel.fields.logoUrl.help}>
                      <input className={inputClass} value={form.logoUrl || ''} onChange={(event) => patchForm({ logoUrl: event.target.value })} />
                    </Field>
                    <Field label={t.tokenPanel.fields.notes.label} help={t.tokenPanel.fields.notes.help}>
                      <textarea className={textareaClass} value={form.notes || ''} onChange={(event) => patchForm({ notes: event.target.value })} />
                    </Field>
                    <label className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-3 text-sm text-slate-300">
                      <span>{t.tokenPanel.enabled}</span>
                      <input type="checkbox" checked={form.enabled} onChange={(event) => patchForm({ enabled: event.target.checked })} className="h-4 w-4 accent-teal-400" />
                    </label>

                    {error ? <div className="rounded-xl border border-rose-300/15 bg-rose-400/10 px-3 py-2 text-sm text-rose-100">{error}</div> : null}
                    {notice ? <div className="rounded-xl border border-emerald-300/15 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-100">{notice}</div> : null}
                    {lastTxDigest ? (
                      <div className="break-all rounded-xl border border-sky-300/15 bg-sky-400/10 px-3 py-2 font-mono text-xs text-sky-100">
                        {t.txDigestPrefix} {lastTxDigest}
                      </div>
                    ) : null}

                    <div className="grid gap-3 sm:grid-cols-2">
                      <button
                        type="submit"
                        disabled={saving || !hasAdminAccess}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-teal-300 px-4 text-sm font-bold text-slate-950 transition hover:bg-teal-200 disabled:opacity-60"
                      >
                        {editingId ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                        {saving ? t.tokenPanel.saving : t.tokenPanel.saveApi}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleRegisterAssetOnChain()}
                        disabled={whitelistBusy || !hasAdminAccess}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-teal-300/25 bg-teal-300/10 px-4 text-sm font-bold text-teal-100 transition hover:bg-teal-300/15 disabled:opacity-60"
                      >
                        <ShieldCheck className="h-4 w-4" />
                        {whitelistBusy ? t.tokenPanel.signing : t.tokenPanel.whitelist}
                      </button>
                    </div>
                  </form>
                  </section>
                </aside>
              </div>

              <div className="grid gap-6 xl:grid-cols-2">
                <section className="rounded-[2rem] border border-white/[0.08] bg-white/[0.035] p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] backdrop-blur-xl">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-200">{t.sharePanel.title}</div>
                      <div className="mt-1 text-xs leading-5 text-slate-500">{t.sharePanel.blurb}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => void loadShareSettings()}
                      disabled={shareSettingsLoading}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.09] text-slate-300 transition hover:bg-white/[0.07] disabled:opacity-60"
                      aria-label={t.sharePanel.refreshAria}
                    >
                      <RefreshCw className={`h-4 w-4 ${shareSettingsLoading ? 'animate-spin' : ''}`} />
                    </button>
                  </div>

                  <form className="space-y-4" onSubmit={(event) => void handleSaveShareSettings(event)}>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label={t.sharePanel.fields.network.label} help={t.sharePanel.fields.network.help}>
                        <input className={inputClass} value={shareSettings.network} onChange={(event) => patchShareSettings({ network: event.target.value })} />
                      </Field>
                      <Field label={t.sharePanel.fields.pricingModel.label} help={t.sharePanel.fields.pricingModel.help}>
                        <select
                          className={inputClass}
                          value={shareSettings.pricingModel}
                          onChange={(event) => patchShareSettings({ pricingModel: event.target.value as ShareSettingsFormState['pricingModel'] })}
                        >
                          <option value="nav_per_share">{t.sharePanel.pricingNavPerShare}</option>
                          <option value="manual_floor">{t.sharePanel.pricingManualFloor}</option>
                          <option value="bonding_curve">{t.sharePanel.pricingBondingCurve}</option>
                        </select>
                      </Field>
                    </div>

                    <Field label={t.sharePanel.fields.packageId.label} help={t.sharePanel.fields.packageId.help}>
                      <input className={`${inputClass} font-mono text-xs`} value={shareSettings.packageId || ''} onChange={(event) => patchShareSettings({ packageId: event.target.value })} />
                    </Field>
                    <Field label={t.sharePanel.fields.shareConfigId.label} help={t.sharePanel.fields.shareConfigId.help}>
                      <input className={`${inputClass} font-mono text-xs`} value={shareSettings.shareConfigId || ''} onChange={(event) => patchShareSettings({ shareConfigId: event.target.value })} />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label={t.sharePanel.fields.shareAdminCap.label} help={t.sharePanel.fields.shareAdminCap.help}>
                        <input className={`${inputClass} font-mono text-xs`} value={shareSettings.shareAdminCapId || ''} onChange={(event) => patchShareSettings({ shareAdminCapId: event.target.value })} />
                      </Field>
                      <Field label={t.sharePanel.fields.treasuryCap.label} help={t.sharePanel.fields.treasuryCap.help}>
                        <input className={`${inputClass} font-mono text-xs`} value={shareSettings.shareTreasuryCapId || ''} onChange={(event) => patchShareSettings({ shareTreasuryCapId: event.target.value })} />
                      </Field>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <Field label={t.sharePanel.fields.mintFeeBps.label} help={t.sharePanel.fields.mintFeeBps.help}>
                        <input className={inputClass} type="number" min={0} max={10000} value={shareSettings.mintFeeBps} onChange={(event) => patchShareSettings({ mintFeeBps: Number(event.target.value) })} />
                      </Field>
                      <Field label={t.sharePanel.fields.redeemFeeBps.label} help={t.sharePanel.fields.redeemFeeBps.help}>
                        <input className={inputClass} type="number" min={0} max={10000} value={shareSettings.redeemFeeBps} onChange={(event) => patchShareSettings({ redeemFeeBps: Number(event.target.value) })} />
                      </Field>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label={t.sharePanel.fields.redeemBurnBps.label} help={t.sharePanel.fields.redeemBurnBps.help}>
                        <input className={inputClass} type="number" min={0} max={10000} value={shareSettings.redeemBurnBps} onChange={(event) => patchShareSettings({ redeemBurnBps: Number(event.target.value) })} />
                      </Field>
                      <Field label={t.sharePanel.fields.priceImpactBps.label} help={t.sharePanel.fields.priceImpactBps.help}>
                        <input className={inputClass} type="number" min={0} max={10000} value={shareSettings.priceImpactBps} onChange={(event) => patchShareSettings({ priceImpactBps: Number(event.target.value) })} />
                      </Field>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <Field label={t.sharePanel.fields.minPriceMist.label} help={t.sharePanel.fields.minPriceMist.help}>
                        <input className={inputClass} inputMode="numeric" value={shareSettings.minPriceSui} onChange={(event) => patchShareSettings({ minPriceSui: event.target.value })} />
                      </Field>
                      <Field label={t.sharePanel.fields.basePriceMist.label} help={t.sharePanel.fields.basePriceMist.help}>
                        <input className={inputClass} inputMode="numeric" value={shareSettings.basePriceSui} onChange={(event) => patchShareSettings({ basePriceSui: event.target.value })} />
                      </Field>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label={t.sharePanel.fields.maxSupply.label} help={t.sharePanel.fields.maxSupply.help}>
                        <input className={inputClass} inputMode="numeric" value={shareSettings.maxSupply} onChange={(event) => patchShareSettings({ maxSupply: event.target.value })} />
                      </Field>
                      <Field label={t.sharePanel.fields.dailyMintCap.label} help={t.sharePanel.fields.dailyMintCap.help}>
                        <input className={inputClass} inputMode="numeric" value={shareSettings.maxDailyMint} onChange={(event) => patchShareSettings({ maxDailyMint: event.target.value })} />
                      </Field>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-3 text-sm text-slate-300">
                        <span>{t.sharePanel.pauseMint}</span>
                        <input type="checkbox" checked={shareSettings.mintPaused} onChange={(event) => patchShareSettings({ mintPaused: event.target.checked })} className="h-4 w-4 accent-teal-400" />
                      </label>
                      <label className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-3 text-sm text-slate-300">
                        <span>{t.sharePanel.pauseRedeem}</span>
                        <input type="checkbox" checked={shareSettings.redeemPaused} onChange={(event) => patchShareSettings({ redeemPaused: event.target.checked })} className="h-4 w-4 accent-teal-400" />
                      </label>
                    </div>

                    <Field label={t.sharePanel.fields.notes.label} help={t.sharePanel.fields.notes.help}>
                      <textarea className={textareaClass} value={shareSettings.notes || ''} onChange={(event) => patchShareSettings({ notes: event.target.value })} />
                    </Field>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <button
                        type="submit"
                        disabled={shareSettingsSaving || !hasAdminAccess}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-teal-300 px-4 text-sm font-bold text-slate-950 transition hover:bg-teal-200 disabled:opacity-60"
                      >
                        <Save className="h-4 w-4" />
                        {shareSettingsSaving ? t.sharePanel.saving : t.sharePanel.savePolicy}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleApplyShareSettingsOnChain()}
                        disabled={shareSettingsBusy || !hasAdminAccess}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-teal-300/25 bg-teal-300/10 px-4 text-sm font-bold text-teal-100 transition hover:bg-teal-300/15 disabled:opacity-60"
                      >
                        <ShieldCheck className="h-4 w-4" />
                        {shareSettingsBusy ? t.sharePanel.signing : t.sharePanel.applyOnChain}
                      </button>
                    </div>
                  </form>
                </section>

                <section className="rounded-[2rem] border border-white/[0.08] bg-white/[0.035] p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] backdrop-blur-xl">
                  <div className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-200">{t.rebalance.title}</div>
                  <div className="mt-2 text-sm leading-6 text-slate-500">{t.rebalance.blurb}</div>
                  <div className="mt-4 space-y-3">
                    <Field label={t.rebalance.fields.assetIn.label} help={t.rebalance.fields.assetIn.help}>
                      <input className={`${inputClass} font-mono text-xs`} value={rebalance.assetIn} onChange={(event) => patchRebalance({ assetIn: event.target.value })} />
                    </Field>
                    <Field label={t.rebalance.fields.assetOut.label} help={t.rebalance.fields.assetOut.help}>
                      <input className={`${inputClass} font-mono text-xs`} value={rebalance.assetOut} onChange={(event) => patchRebalance({ assetOut: event.target.value })} />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label={t.rebalance.fields.amountIn.label} help={t.rebalance.fields.amountIn.help}>
                        <input className={inputClass} value={rebalance.amountIn} onChange={(event) => patchRebalance({ amountIn: event.target.value })} />
                      </Field>
                      <Field label={t.rebalance.fields.navAfterSui.label} help={t.rebalance.fields.navAfterSui.help}>
                        <input className={inputClass} value={rebalance.navAfterSui} onChange={(event) => patchRebalance({ navAfterSui: event.target.value })} />
                      </Field>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label={t.rebalance.fields.expectedOut.label} help={t.rebalance.fields.expectedOut.help}>
                        <input className={inputClass} value={rebalance.expectedOut} onChange={(event) => patchRebalance({ expectedOut: event.target.value })} />
                      </Field>
                      <Field label={t.rebalance.fields.actualOut.label} help={t.rebalance.fields.actualOut.help}>
                        <input className={inputClass} value={rebalance.actualOut} onChange={(event) => patchRebalance({ actualOut: event.target.value })} />
                      </Field>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label={t.rebalance.fields.tradeBps.label} help={t.rebalance.fields.tradeBps.help}>
                        <input className={inputClass} value={rebalance.tradeBps} onChange={(event) => patchRebalance({ tradeBps: event.target.value })} />
                      </Field>
                      <Field label={t.rebalance.fields.oracleAgeMs.label} help={t.rebalance.fields.oracleAgeMs.help}>
                        <input className={inputClass} value={rebalance.oracleAgeMs} onChange={(event) => patchRebalance({ oracleAgeMs: event.target.value })} />
                      </Field>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleRebalanceStub()}
                      disabled={rebalanceBusy || !hasAdminAccess}
                      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-sky-300/25 bg-sky-300/10 px-4 text-sm font-bold text-sky-100 transition hover:bg-sky-300/15 disabled:opacity-60"
                    >
                      <RotateCw className="h-4 w-4" />
                      {rebalanceBusy ? t.rebalance.signing : t.rebalance.sign}
                    </button>
                  </div>
                </section>
              </div>

              <section className="rounded-[2rem] border border-white/[0.08] bg-white/[0.025] p-5 text-sm leading-6 text-slate-400 backdrop-blur-xl">
                <div className="font-semibold uppercase tracking-[0.18em] text-slate-300">{t.deployed.title}</div>
                <div className="mt-3 space-y-2 font-mono text-xs">
                  <div>
                    {t.deployed.registry} {shortObjectId(SUI_FUND_CONFIG.registryId, t.admin.shortNotSet)}
                  </div>
                  <div>
                    {t.deployed.ownerCap} {shortObjectId(SUI_FUND_CONFIG.adminCapId, t.admin.shortNotSet)}
                  </div>
                  <div>
                    {t.deployed.basket} {shortObjectId(SUI_FUND_CONFIG.basketId, t.admin.shortNotSet)}
                  </div>
                  <div>
                    {t.deployed.managerCap} {shortObjectId(SUI_FUND_CONFIG.managerCapId, t.admin.shortNotSet)}
                  </div>
                  <div>
                    {t.deployed.strategy} {shortObjectId(SUI_FUND_CONFIG.strategyId, t.admin.shortNotSet)}
                  </div>
                </div>
              </section>
            </div>
          </div>
        }
      />
    </main>
  );
}
