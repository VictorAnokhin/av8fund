import React from 'react';
import { ConnectButton, useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { RefreshCw, Save, Settings } from 'lucide-react';

import { SUI_NETWORK } from '../config';
import { getBasePath } from '../lib/routes';
import { SUI_FUND_CONFIG } from '../lib/suiFund';
import {
  getFundShareSettings,
  saveFundShareSettings,
  type FundShareSettingsInput,
  type FundShareSettingsRecord,
} from '../lib/api';
import { PageBreadcrumbsBar, PageHeroBadge, PageHeroShell } from './PageChrome';

const EMPTY_SETTINGS: FundShareSettingsInput = {
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
  notes: 'AV8 fees are fund policy. Redemption requests in /invest use a 3 day liquidity return delay.',
};
const REDEEM_DELAY_MS = 3 * 24 * 60 * 60 * 1000;

function recordToInput(record: FundShareSettingsRecord): FundShareSettingsInput {
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
    notes: record.notes || '',
  };
}

function formatBps(value: number): string {
  return `${(Number(value || 0) / 100).toFixed(2)}%`;
}

function getDigest(result: unknown): string {
  return typeof result === 'object' && result && 'digest' in result && typeof result.digest === 'string' ? result.digest : '';
}

const inputClass = 'h-11 w-full rounded-xl border border-white/[0.09] bg-slate-950/70 px-3 text-sm text-slate-100 outline-none transition focus:border-teal-300/40';
const textareaClass = 'min-h-[92px] w-full rounded-xl border border-white/[0.09] bg-slate-950/70 px-3 py-3 text-sm text-slate-100 outline-none transition focus:border-teal-300/40';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</span>
      {children}
    </label>
  );
}

export function FundSettingsPage() {
  const account = useCurrentAccount();
  const suiClient = useSuiClient();
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const [settings, setSettings] = React.useState<FundShareSettingsInput>(EMPTY_SETTINGS);
  const [feeConfigId, setFeeConfigId] = React.useState(SUI_FUND_CONFIG.shareFeeConfigId || '');
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [onChainBusy, setOnChainBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [lastTxDigest, setLastTxDigest] = React.useState<string | null>(null);
  const homeHref = getBasePath();

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const record = await getFundShareSettings({
        network: SUI_NETWORK,
        packageId: SUI_FUND_CONFIG.packageId,
      });
      setSettings(recordToInput(record));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void load();
  }, []);

  function patch(patchValue: Partial<FundShareSettingsInput>) {
    setSettings((current) => ({ ...current, ...patchValue }));
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const saved = await saveFundShareSettings(settings, { adminAddress: account?.address || '' });
      setSettings(recordToInput(saved));
      setNotice('Настройки AV8 сохранены.');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleApplyFeeConfigOnChain() {
    if (!account?.address) {
      setError('Подключите Sui admin wallet.');
      return;
    }
    if (!settings.shareAdminCapId || !settings.shareConfigId) {
      setError('ShareAdminCap и ShareConfig обязательны.');
      return;
    }

    setOnChainBusy(true);
    setError(null);
    setNotice(null);
    setLastTxDigest(null);
    try {
      const tx = new Transaction();
      tx.setSender(account.address);
      const modulePackageId = SUI_FUND_CONFIG.modulePackageId || settings.packageId || SUI_FUND_CONFIG.packageId;
      if (feeConfigId.trim()) {
        tx.moveCall({
          target: `${modulePackageId}::fund_share::update_fee_config`,
          arguments: [
            tx.object(settings.shareAdminCapId),
            tx.object(settings.shareConfigId),
            tx.object(feeConfigId.trim()),
            tx.pure.u64(settings.mintFeeBps),
            tx.pure.u64(settings.redeemFeeBps),
            tx.pure.u64(REDEEM_DELAY_MS),
            tx.pure.address(account.address),
          ],
        });
      } else {
        tx.moveCall({
          target: `${modulePackageId}::fund_share::create_fee_config`,
          arguments: [
            tx.object(settings.shareAdminCapId),
            tx.object(settings.shareConfigId),
            tx.pure.u64(settings.mintFeeBps),
            tx.pure.u64(settings.redeemFeeBps),
            tx.pure.u64(REDEEM_DELAY_MS),
            tx.pure.address(account.address),
          ],
        });
      }

      const result = await signAndExecuteTransaction({ transaction: tx });
      const digest = getDigest(result);
      if (!digest) {
        throw new Error('Wallet did not return transaction digest.');
      }
      await suiClient.waitForTransaction({ digest, options: { showEffects: true, showEvents: true } });
      setLastTxDigest(digest);
      setNotice(feeConfigId.trim()
        ? 'Fee config обновлен on-chain.'
        : 'Fee config создан on-chain. Скопируйте object id из транзакции в VITE_SUI_SHARE_FEE_CONFIG_ID.');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setOnChainBusy(false);
    }
  }

  return (
    <main className="relative min-h-[calc(100vh-160px)] pb-14 pt-14">
      <PageBreadcrumbsBar
        items={[
          { label: 'Главная', href: homeHref },
          { label: 'Настройки' },
        ]}
      />
      <PageHeroShell
        badge={<PageHeroBadge label="Admin settings" icon={<Settings className="h-3.5 w-3.5" />} variant="teal" />}
        title="Настройки"
        subtitle="Политика AV8: комиссии выпуска и выкупа, паузы операций, модель NAV и лимиты эмиссии."
      />

      <section className="px-6 py-10">
        <div className="mx-auto grid max-w-7xl gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <form onSubmit={(event) => void handleSave(event)} className="rounded-[2rem] border border-white/[0.08] bg-white/[0.04] p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] pb-4">
              <div>
                <div className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-200">AV8 fees</div>
                <div className="mt-1 text-sm text-slate-500">Комиссии хранятся в Laravel и используются формой `/invest`.</div>
              </div>
              <button
                type="button"
                onClick={() => void load()}
                disabled={loading}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/[0.09] bg-white/[0.04] px-4 text-sm font-semibold text-slate-200 transition hover:border-teal-300/25 disabled:opacity-60"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Обновить
              </button>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Field label="Комиссия выпуска AV8, bps">
                <input className={inputClass} type="number" min={0} max={10000} value={settings.mintFeeBps} onChange={(event) => patch({ mintFeeBps: Number(event.target.value) })} />
              </Field>
              <Field label="Комиссия выкупа AV8, bps">
                <input className={inputClass} type="number" min={0} max={10000} value={settings.redeemFeeBps} onChange={(event) => patch({ redeemFeeBps: Number(event.target.value) })} />
              </Field>
              <Field label="Спаление при выкупе, bps">
                <input className={inputClass} type="number" min={0} max={10000} value={settings.redeemBurnBps} onChange={(event) => patch({ redeemBurnBps: Number(event.target.value) })} />
              </Field>
              <Field label="Price impact, bps">
                <input className={inputClass} type="number" min={0} max={10000} value={settings.priceImpactBps} onChange={(event) => patch({ priceImpactBps: Number(event.target.value) })} />
              </Field>
              <Field label="Модель цены">
                <select className={inputClass} value={settings.pricingModel} onChange={(event) => patch({ pricingModel: event.target.value as FundShareSettingsInput['pricingModel'] })}>
                  <option value="nav_per_share">NAV / supply</option>
                  <option value="manual_floor">Manual floor</option>
                  <option value="bonding_curve">Bonding curve</option>
                </select>
              </Field>
              <Field label="Сеть">
                <input className={inputClass} value={settings.network} onChange={(event) => patch({ network: event.target.value })} />
              </Field>
              <Field label="Max supply">
                <input className={inputClass} value={settings.maxSupply} onChange={(event) => patch({ maxSupply: event.target.value })} />
              </Field>
              <Field label="Daily mint cap">
                <input className={inputClass} value={settings.maxDailyMint} onChange={(event) => patch({ maxDailyMint: event.target.value })} />
              </Field>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-3 text-sm text-slate-300">
                <span>Пауза выпуска</span>
                <input type="checkbox" checked={settings.mintPaused} onChange={(event) => patch({ mintPaused: event.target.checked })} className="h-4 w-4 accent-teal-400" />
              </label>
              <label className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-3 text-sm text-slate-300">
                <span>Пауза выкупа</span>
                <input type="checkbox" checked={settings.redeemPaused} onChange={(event) => patch({ redeemPaused: event.target.checked })} className="h-4 w-4 accent-teal-400" />
              </label>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Field label="ShareFeeConfig ID">
                <input className={`${inputClass} font-mono text-xs`} value={feeConfigId} onChange={(event) => setFeeConfigId(event.target.value)} placeholder="создайте on-chain и вставьте object id" />
              </Field>
              <Field label="ShareConfig ID">
                <input className={`${inputClass} font-mono text-xs`} value={settings.shareConfigId || ''} onChange={(event) => patch({ shareConfigId: event.target.value })} />
              </Field>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Field label="ShareAdminCap ID">
                <input className={`${inputClass} font-mono text-xs`} value={settings.shareAdminCapId || ''} onChange={(event) => patch({ shareAdminCapId: event.target.value })} />
              </Field>
              <Field label="Fee recipient">
                <input className={`${inputClass} font-mono text-xs`} value={account?.address || ''} readOnly />
              </Field>
            </div>

            <div className="mt-4">
              <Field label="Заметки">
                <textarea className={textareaClass} value={settings.notes || ''} onChange={(event) => patch({ notes: event.target.value })} />
              </Field>
            </div>

            {error ? <div className="mt-4 rounded-xl border border-rose-300/15 bg-rose-400/10 px-3 py-2 text-sm text-rose-100">{error}</div> : null}
            {notice ? <div className="mt-4 rounded-xl border border-emerald-300/15 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-100">{notice}</div> : null}
            {lastTxDigest ? <div className="mt-4 break-all rounded-xl border border-sky-300/15 bg-sky-400/10 px-3 py-2 font-mono text-xs text-sky-100">tx: {lastTxDigest}</div> : null}

            <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
              <ConnectButton />
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-teal-300 px-5 text-sm font-bold text-slate-950 transition hover:bg-teal-200 disabled:opacity-60"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Сохранение...' : 'Сохранить'}
                </button>
                <button
                  type="button"
                  onClick={() => void handleApplyFeeConfigOnChain()}
                  disabled={onChainBusy}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-teal-300/25 bg-teal-300/10 px-5 text-sm font-bold text-teal-100 transition hover:bg-teal-300/15 disabled:opacity-60"
                >
                  {onChainBusy ? 'Подпись...' : feeConfigId.trim() ? 'Обновить on-chain' : 'Создать on-chain'}
                </button>
              </div>
            </div>
          </form>

          <aside className="space-y-4">
            <div className="rounded-[2rem] border border-white/[0.08] bg-white/[0.035] p-5">
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-200">Текущая политика</div>
              <div className="mt-4 space-y-3 text-sm text-slate-300">
                <div className="flex justify-between gap-3"><span className="text-slate-500">Выпуск</span><span>{formatBps(settings.mintFeeBps)}</span></div>
                <div className="flex justify-between gap-3"><span className="text-slate-500">Выкуп</span><span>{formatBps(settings.redeemFeeBps)}</span></div>
                <div className="flex justify-between gap-3"><span className="text-slate-500">Задержка выкупа</span><span>3 дня</span></div>
                <div className="flex justify-between gap-3"><span className="text-slate-500">Модель</span><span>{settings.pricingModel}</span></div>
              </div>
            </div>
            <div className="rounded-[2rem] border border-amber-300/15 bg-amber-400/10 p-5 text-sm leading-6 text-amber-100">
              Эти комиссии пока являются политикой API/UI. On-chain сейчас применяет только burn-настройку AV8; полное списание fee в контракте нужно делать отдельным upgrade.
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
