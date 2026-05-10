import React from 'react';
import { ConnectButton, useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { normalizeStructTag, isValidSuiAddress } from '@mysten/sui/utils';
import { getZkLoginSignature } from '@mysten/sui/zklogin';
import { Transaction } from '@mysten/sui/transactions';
import { AggregatorClient, Env } from '@cetusprotocol/aggregator-sdk';
import BN from 'bn.js';
import { ArrowRightLeft, Settings2 } from 'lucide-react';

import { resolveSuiSwapRpcUrl, SUI_NETWORK, SUI_RPC_URL } from '../config';
import type { ResolvedUserWallet } from '../lib/api';
import { readZkLoginSession } from '../lib/zkloginSession';
import { normalizeSwapWalletAddress, resolveSuiSigningRoute } from '../lib/swapLinkedWallets';
import { normalizeZkLoginSessionProofForSigning } from '../lib/zkloginProof';
import { SuiJsonRpcClient } from '@cetus-mysten/json-rpc';
import { Transaction as CetusTransaction } from '@cetus-mysten/transactions';
import { cetusAggregatorEnv, getDefaultSuiSwapTokens, isSuiSwapSupportedNetwork, type SuiSwapToken } from '../lib/suiSwapTokens';

function formatTokenAmount(value: number): string {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: value >= 1000 ? 0 : value >= 1 ? 6 : 8,
  }).format(value);
}

function parseAmountToAtomic(amount: string, decimals: number): BN | null {
  const normalized = amount.trim().replace(',', '.');
  if (!/^\d*\.?\d*$/.test(normalized) || normalized === '' || normalized === '.') {
    return null;
  }

  const [wholePart = '0', fractionPart = ''] = normalized.split('.');
  const safeWhole = wholePart.replace(/^0+(?=\d)/, '') || '0';
  const safeFraction = fractionPart.slice(0, decimals).padEnd(decimals, '0');
  const combined = `${safeWhole}${safeFraction}`.replace(/^0+(?=\d)/, '') || '0';

  try {
    return new BN(combined, 10);
  } catch {
    return null;
  }
}

type CetusRouteQuote = NonNullable<Awaited<ReturnType<AggregatorClient['findRouters']>>>;

function atomicToDecimal(amount: BN, decimals: number): number {
  const base = new BN(10).pow(new BN(decimals));
  const whole = amount.div(base).toString(10);
  const fraction = amount.mod(base).toString(10).padStart(decimals, '0').replace(/0+$/, '');
  if (!fraction) {
    return Number(whole);
  }

  return Number(`${whole}.${fraction}`);
}

function shortAddr(addr: string): string {
  const t = addr.trim();
  if (t.length <= 14) {
    return t;
  }

  return `${t.slice(0, 8)}…${t.slice(-6)}`;
}

function slippagePctToBps(slippagePct: string): number {
  const slip = Number(slippagePct.replace(',', '.')) / 100;
  const finite = Number.isFinite(slip) && slip > 0 && slip < 0.5 ? slip : 0.01;
  return Math.min(5000, Math.max(1, Math.round(finite * 10_000)));
}

export type SuiSwapPanelProps = {
  minimal?: boolean;
  centered?: boolean;
  /** Sui addresses from the Google-linked account (Portfolio API). */
  linkedSuiWallets?: ResolvedUserWallet[];
  selectedOwnerAddress?: string;
  onSelectOwnerAddress?: (address: string) => void;
};

export function SuiSwapPanel({
  minimal = false,
  centered = false,
  linkedSuiWallets = [],
  selectedOwnerAddress = '',
  onSelectOwnerAddress,
}: SuiSwapPanelProps) {
  const account = useCurrentAccount();
  const ownerAddress = (selectedOwnerAddress || account?.address || '').trim();
  const suiClient = useSuiClient();
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();

  const norm = normalizeSwapWalletAddress;
  const zkSession = readZkLoginSession();
  const isZkSigningAddress = Boolean(zkSession && norm(zkSession.walletAddress) === norm(ownerAddress));
  const isExtensionSigningAddress = Boolean(account?.address && norm(account.address) === norm(ownerAddress));

  const activeLinkedWallet = React.useMemo(
    () => linkedSuiWallets.find((w) => norm(w.address) === norm(ownerAddress)),
    [linkedSuiWallets, ownerAddress],
  );
  const activeWalletIsSui = isValidSuiAddress(ownerAddress);
  const suiSwapSigningRoute = React.useMemo(
    () => resolveSuiSigningRoute({
      activeWalletIsSui,
      web3auth: activeLinkedWallet?.web3auth,
      extensionAddressMatchesActive: isExtensionSigningAddress,
      zkSessionMatchesActive: isZkSigningAddress,
    }),
    [activeLinkedWallet?.web3auth, activeWalletIsSui, isExtensionSigningAddress, isZkSigningAddress],
  );

  const swapRpcUrl = React.useMemo(() => resolveSuiSwapRpcUrl(), []);
  const swapUsesDedicatedRpc = React.useMemo(() => {
    const n = (u: string) => u.trim().replace(/\/+$/, '');
    return n(swapRpcUrl) !== n(SUI_RPC_URL);
  }, [swapRpcUrl]);

  const tokens = React.useMemo(() => getDefaultSuiSwapTokens(), []);
  const [fromCoinType, setFromCoinType] = React.useState(tokens[0]?.coinType ?? '');
  const [toCoinType, setToCoinType] = React.useState(tokens[1]?.coinType ?? '');
  const [fromAmount, setFromAmount] = React.useState('0');
  const [receiveLabel, setReceiveLabel] = React.useState('');
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);
  const [lastDigest, setLastDigest] = React.useState<string | null>(null);
  const [isQuoting, setIsQuoting] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [showAdvanced, setShowAdvanced] = React.useState(false);
  const [slippagePct, setSlippagePct] = React.useState('1');
  const [routeHint, setRouteHint] = React.useState<string | null>(null);
  const [cachedRouter, setCachedRouter] = React.useState<CetusRouteQuote | null>(null);
  const [fromBalance, setFromBalance] = React.useState<bigint>(0n);

  const fromToken = tokens.find((t) => t.coinType === fromCoinType) ?? tokens[0] ?? null;
  const toToken = tokens.find((t) => t.coinType === toCoinType) ?? tokens[1] ?? null;

  React.useEffect(() => {
    if (fromCoinType === toCoinType && tokens.length > 1) {
      const other = tokens.find((t) => t.coinType !== fromCoinType);
      if (other) {
        setToCoinType(other.coinType);
      }
    }
  }, [fromCoinType, toCoinType, tokens]);

  const aggClient = React.useMemo(() => {
    if (!ownerAddress || !isSuiSwapSupportedNetwork()) {
      return null;
    }

    const networkTag = cetusAggregatorEnv();
    const rpcClient = new SuiJsonRpcClient({
      url: swapRpcUrl,
      network: networkTag,
    });

    return new AggregatorClient({
      signer: ownerAddress,
      client: rpcClient,
      env: networkTag === 'mainnet' ? Env.Mainnet : Env.Testnet,
    });
  }, [ownerAddress, swapRpcUrl]);

  React.useEffect(() => {
    if (!ownerAddress || !fromToken) {
      setFromBalance(0n);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const coinType = normalizeStructTag(fromToken.coinType);
        const bal = await suiClient.getBalance({ owner: ownerAddress, coinType });
        if (cancelled) {
          return;
        }

        setFromBalance(BigInt(bal.totalBalance));
      } catch {
        if (!cancelled) {
          setFromBalance(0n);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ownerAddress, fromToken, suiClient]);

  const numericFrom = Number(fromAmount.replace(',', '.'));
  const validAmount = Number.isFinite(numericFrom) && numericFrom > 0;
  const amountBn = fromToken && validAmount ? parseAmountToAtomic(fromAmount, fromToken.decimals) : null;
  const atomicFromBn = amountBn && amountBn.gt(new BN(0)) ? amountBn : null;
  const displayBalance = fromToken ? atomicToDecimal(new BN(fromBalance.toString()), fromToken.decimals) : 0;
  const hasEnough = !fromToken || !atomicFromBn || fromBalance >= BigInt(atomicFromBn.toString());

  /** Cetus aggregator quotes (mainnet and testnet). */
  React.useEffect(() => {
    if (!aggClient || !fromToken || !toToken || fromToken.coinType === toToken.coinType || !atomicFromBn) {
      setReceiveLabel('');
      setRouteHint(null);
      setCachedRouter(null);
      setStatusMessage(null);
      return;
    }

    let cancelled = false;
    setIsQuoting(true);
    setStatusMessage(null);

    const timer = window.setTimeout(() => {
      aggClient
        .findRouters({
          from: fromToken.coinType,
          target: toToken.coinType,
          amount: atomicFromBn,
          byAmountIn: true,
        })
        .then((router) => {
          if (cancelled) {
            return;
          }

          setCachedRouter(router);

          if (!router || router.insufficientLiquidity) {
            setReceiveLabel('');
            setRouteHint(null);
            setStatusMessage('No Cetus route for this pair or amount (insufficient liquidity).');
            return;
          }

          if (router.error?.msg) {
            setReceiveLabel('');
            setRouteHint(null);
            setStatusMessage(router.error.msg);
            return;
          }

          const out = atomicToDecimal(router.amountOut, toToken.decimals);
          setReceiveLabel(formatTokenAmount(out));

          const providers = [...new Set(router.paths.map((p) => p.provider))];
          setRouteHint(providers.length ? `Cetus route: ${providers.join(' → ')}` : 'Cetus aggregated route');
        })
        .catch((err) => {
          if (cancelled) {
            return;
          }

          setReceiveLabel('');
          setRouteHint(null);
          setCachedRouter(null);
          setStatusMessage(err instanceof Error ? err.message : 'Quote failed.');
        })
        .finally(() => {
          if (!cancelled) {
            setIsQuoting(false);
          }
        });
    }, 400);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [aggClient, atomicFromBn?.toString(), fromToken, toToken]);

  React.useEffect(() => {
    if (!aggClient || !fromToken || !toToken || !atomicFromBn || fromToken.coinType === toToken.coinType) {
      return;
    }

    const id = window.setInterval(() => {
      void aggClient
        .findRouters({
          from: fromToken.coinType,
          target: toToken.coinType,
          amount: atomicFromBn,
          byAmountIn: true,
        })
        .then((router) => {
          if (!router || router.insufficientLiquidity || router.error?.msg) {
            return;
          }

          setCachedRouter(router);
          const out = atomicToDecimal(router.amountOut, toToken.decimals);
          setReceiveLabel(formatTokenAmount(out));
          const providers = [...new Set(router.paths.map((p) => p.provider))];
          setRouteHint(providers.length ? `Cetus route: ${providers.join(' → ')}` : 'Cetus aggregated route');
        })
        .catch(() => {});
    }, 14_000);

    return () => window.clearInterval(id);
  }, [aggClient, atomicFromBn?.toString(), fromToken, toToken]);

  function handleFlip() {
    setFromCoinType(toCoinType);
    setToCoinType(fromCoinType);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!ownerAddress || !fromToken || !toToken || !atomicFromBn || !hasEnough) {
      return;
    }

    if (!isZkSigningAddress && !isExtensionSigningAddress) {
      setStatusMessage('Connect a Sui wallet matching the selected address, or select your Google zkLogin Sui address and complete zkLogin.');
      return;
    }

    if (!aggClient) {
      return;
    }

    let router = cachedRouter;
    if (!router || router.insufficientLiquidity || router.error) {
      router = await aggClient.findRouters({
        from: fromToken.coinType,
        target: toToken.coinType,
        amount: atomicFromBn,
        byAmountIn: true,
      });
    }

    if (!router || router.insufficientLiquidity || router.error?.msg) {
      setStatusMessage(router?.error?.msg ?? 'No valid route to execute.');
      return;
    }

    const slip = Number(slippagePct.replace(',', '.')) / 100;
    const slippage = Number.isFinite(slip) && slip > 0 && slip < 0.5 ? slip : 0.01;

    setIsSubmitting(true);
    setStatusMessage(null);
    setLastDigest(null);

    try {
      const tx = new CetusTransaction();
      await aggClient.fastRouterSwap({
        router,
        slippage,
        txb: tx,
      });

      const liveZk = readZkLoginSession();
      if (suiSwapSigningRoute.useExtension) {
        const result = await signAndExecuteTransaction({
          transaction: tx as unknown as Transaction,
        });

        const digest = 'digest' in result && typeof result.digest === 'string' ? result.digest : null;
        if (digest) {
          setLastDigest(digest);
        }

        setStatusMessage('Swap submitted.');
      } else if (suiSwapSigningRoute.useZkLogin) {
        if (!liveZk || norm(liveZk.walletAddress) !== norm(ownerAddress)) {
          setStatusMessage('zkLogin session missing or wrong address. Sign in with Google again.');
          return;
        }
        const signer = Ed25519Keypair.fromSecretKey(liveZk.ephemeralPrivateKey);
        const { bytes, signature: userSignature } = await tx.sign({
          client: aggClient.client,
          signer,
        });
        const zkSignature = getZkLoginSignature({
          inputs: normalizeZkLoginSessionProofForSigning(liveZk),
          maxEpoch: liveZk.maxEpoch,
          userSignature,
        });
        const execResult = await aggClient.client.executeTransactionBlock({
          transactionBlock: bytes,
          signature: zkSignature,
          options: {
            showEffects: true,
          },
        });
        if (execResult.digest) {
          setLastDigest(execResult.digest);
        }
        setStatusMessage('Swap submitted (Google zkLogin).');
      } else {
        setStatusMessage('Connect the Sui wallet or zkLogin session that matches this address.');
        return;
      }
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : 'Swap failed.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const hasValidCetusRoute =
    Boolean(cachedRouter && !cachedRouter.insufficientLiquidity && !cachedRouter.error);

  const canSubmit =
    Boolean(
      ownerAddress
      && (suiSwapSigningRoute.useExtension || suiSwapSigningRoute.useZkLogin)
      && fromToken
      && toToken
      && atomicFromBn
      && hasEnough
      && hasValidCetusRoute
      && aggClient,
    ) && !isSubmitting;

  const showLinkedPicker = linkedSuiWallets.length > 0 && typeof onSelectOwnerAddress === 'function';

  const swapEngineLabel = `Cetus aggregator (${cetusAggregatorEnv()})`;

  if (!isSuiSwapSupportedNetwork()) {
    return (
      <div className={`relative w-full max-w-md rounded-2xl border border-white/[0.09] bg-[rgba(5,9,18,0.72)] p-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05),0_24px_64px_-28px_rgba(0,0,0,0.55)] backdrop-blur-xl ${centered ? 'mx-auto' : ''}`}>
        <p className="text-sm tracking-wide text-slate-400">
          Sui swaps use the <span className="text-teal-200/90">Cetus</span> aggregator on{' '}
          <span className="text-teal-200/90">mainnet</span> and <span className="text-teal-200/90">testnet</span>.
          Current config: <span className="text-white">{SUI_NETWORK}</span>.
          Set <code className="text-cyan-200/80">VITE_SUI_NETWORK</code> to testnet or mainnet to enable this panel.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      className={`relative w-full max-w-md rounded-2xl border border-white/[0.09] bg-[rgba(5,9,18,0.72)] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05),0_24px_64px_-28px_rgba(0,0,0,0.55)] backdrop-blur-xl ${minimal ? 'p-5' : 'p-6'} ${centered ? 'mx-auto' : ''}`}
    >
      <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-b from-cyan-500/[0.06] via-transparent to-teal-500/[0.04]" />

      <div className="relative mb-6 flex flex-wrap items-center justify-between gap-3">
        <h4 className="font-medium tracking-wide text-white">Sui swap</h4>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-white/[0.06] hover:text-teal-100/90"
            aria-label="Swap settings"
          >
            <Settings2 className="h-5 w-5" />
          </button>
          <ConnectButton className="!rounded-lg !border !border-white/10 !bg-slate-900 !px-3 !py-2 !text-xs !font-semibold !text-white hover:!bg-slate-800" />
        </div>
      </div>

      {showAdvanced ? (
        <div className="relative mb-4 rounded-xl border border-white/[0.08] bg-[rgba(4,8,16,0.85)] p-3 text-sm text-slate-400">
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-slate-500">Slippage tolerance (%)</span>
            <input
              type="text"
              value={slippagePct}
              onChange={(e) => setSlippagePct(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/[0.08] bg-[rgba(8,12,22,0.9)] px-3 py-2 text-white outline-none"
            />
          </label>
          <p className="mt-2 text-xs text-slate-500">Gas is estimated by your wallet; no extra nonce settings.</p>
        </div>
      ) : null}

      {showLinkedPicker ? (
        <div className="relative mb-4 rounded-xl border border-teal-400/15 bg-[rgba(4,8,16,0.75)] p-3 text-sm text-slate-300">
          <div className="text-xs font-medium uppercase tracking-wider text-teal-200/80">Google-linked Sui account</div>
          <select
            value={(selectedOwnerAddress || ownerAddress).trim()}
            onChange={(e) => onSelectOwnerAddress?.(e.target.value)}
            className="mt-2 w-full rounded-lg border border-white/[0.08] bg-[rgba(8,12,22,0.9)] px-3 py-2 text-sm text-white outline-none"
          >
            {linkedSuiWallets.map((w) => {
              const a = w.address.trim();
              const isZk = Boolean(zkSession && norm(zkSession.walletAddress) === norm(a));
              return (
                <option key={a} value={a}>
                  {shortAddr(a)}{isZk ? ' · Google zkLogin' : ''}
                </option>
              );
            })}
          </select>
        </div>
      ) : null}

      <div className="relative space-y-2">
        <div className="rounded-xl border border-white/[0.08] bg-[rgba(4,8,16,0.85)] p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] transition-[border-color,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] focus-within:border-teal-400/35">
          <div className="mb-2 flex justify-between text-sm tracking-wide text-slate-500">
            <span>You pay</span>
            <span>
              Balance: {fromToken ? `${formatTokenAmount(displayBalance)} ${fromToken.symbol}` : '--'}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <input
              type="text"
              value={fromAmount}
              onChange={(e) => setFromAmount(e.target.value)}
              className="w-1/2 bg-transparent text-2xl font-semibold tracking-tight text-white outline-none"
            />
            <select
              value={fromCoinType}
              onChange={(e) => setFromCoinType(e.target.value)}
              className="max-w-[52%] rounded-lg border border-white/[0.08] bg-[rgba(8,12,22,0.9)] px-3 py-1.5 font-medium text-white outline-none"
            >
              {tokens.map((t: SuiSwapToken) => (
                <option key={t.coinType} value={t.coinType}>
                  {t.symbol}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="button"
          onClick={handleFlip}
          className="absolute left-1/2 top-1/2 z-10 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border-[4px] border-[rgba(5,8,14,0.95)] bg-[rgba(12,18,32,0.95)] text-slate-400 shadow-[0_0_20px_-8px_rgba(34,211,238,0.35)] transition-[background,color,border-color] duration-300 hover:border-cyan-400/30 hover:text-teal-100"
          aria-label="Swap direction"
        >
          <ArrowRightLeft className="h-4 w-4 rotate-90" />
        </button>

        <div className="rounded-xl border border-white/[0.08] bg-[rgba(4,8,16,0.85)] p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
          <div className="mb-2 flex justify-between text-sm tracking-wide text-slate-500">
            <span>You receive</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <input
              type="text"
              value={receiveLabel}
              readOnly
              placeholder={isQuoting ? '…' : '0'}
              className="w-1/2 bg-transparent text-2xl font-semibold tracking-tight text-white outline-none placeholder:text-slate-600"
            />
            <select
              value={toCoinType}
              onChange={(e) => setToCoinType(e.target.value)}
              className="max-w-[52%] rounded-lg border border-white/[0.08] bg-[rgba(8,12,22,0.9)] px-3 py-1.5 font-medium text-white outline-none"
            >
              {tokens.map((t: SuiSwapToken) => (
                <option key={t.coinType} value={t.coinType}>
                  {t.symbol}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="relative mt-4 space-y-2 text-sm tracking-wide text-slate-500">
        {routeHint ? <div className="text-slate-400">{routeHint}</div> : null}
        {statusMessage ? <div className="text-teal-200/90">{statusMessage}</div> : null}
        {lastDigest ? (
          <div className="break-all text-cyan-200/80">
            Digest:{' '}
            <a
              href={`https://suiexplorer.com/txblock/${encodeURIComponent(lastDigest)}?network=${cetusAggregatorEnv()}`}
              target="_blank"
              rel="noreferrer"
              className="underline decoration-teal-500/40 underline-offset-2 hover:text-cyan-100"
            >
              {lastDigest}
            </a>
          </div>
        ) : null}
        {ownerAddress && !isZkSigningAddress && !isExtensionSigningAddress ? (
          <div className="text-xs text-amber-200/90">
            Choose a linked address that matches your connected Sui extension wallet, or the address of your active Google zkLogin session.
          </div>
        ) : null}
        {!ownerAddress ? (
          <div>Connect a Sui wallet or sign in with Google to load linked Sui addresses.</div>
        ) : null}
        {!hasEnough && ownerAddress ? <div className="text-amber-200">Amount exceeds wallet balance.</div> : null}
        {isQuoting ? <div className="text-slate-600">Fetching Cetus quote…</div> : null}
        {swapUsesDedicatedRpc ? (
          <div className="text-xs text-cyan-200/70">
            Swap quotes use a dedicated RPC (public fullnode or <code className="text-cyan-100/80">VITE_SUI_SWAP_RPC_URL</code>), so routing works when the app RPC points at a machine-local validator.
          </div>
        ) : null}
        <div className="text-xs text-slate-600">
          Network: {SUI_NETWORK} · {swapEngineLabel}
        </div>
      </div>

      <button
        type="submit"
        disabled={!canSubmit}
        className="relative mt-6 w-full rounded-xl border border-cyan-400/25 bg-gradient-to-r from-cyan-600 to-teal-600 py-4 font-bold tracking-wide text-slate-950 shadow-[0_0_32px_-10px_rgba(34,211,238,0.55)] transition-[filter,box-shadow,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:brightness-[1.04] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? 'Signing…' : isZkSigningAddress ? 'Confirm swap (Google zkLogin)' : 'Confirm Sui swap'}
      </button>
    </form>
  );
}
