import React from 'react';
import { ArrowRightLeft, CreditCard, LoaderCircle, Search, Wallet } from 'lucide-react';

import {
  createWalletLinkChallenge,
  getWalletPortfolioTokens,
  getWalletSwapPrice,
  getWalletSwapQuote,
  getWeb3SwapTokens,
  linkAuthenticatedWallet,
  type WalletPortfolioToken,
  walletLinkTypeFromPortfolioNetwork,
  type Web3SwapToken,
} from '../lib/api';
import {
  EXTERNAL_WALLET_SESSION_EVENT,
  getExternalSessionAddress,
  isExternalSessionEvm,
  readExternalWalletSession,
  persistExternalWalletSession,
  type ExternalWalletSession,
} from '../lib/externalWalletSession';
import { persistIdentitySession, readIdentitySession } from '../lib/identitySession';
import { normalizeSwapWalletAddress } from '../lib/swapLinkedWallets';
import { useSwapLinkedWallets } from '../hooks/useSwapLinkedWallets';
import { useI18n } from '../i18n';
import { SuiSwapPanel } from './SuiSwapPanel';

type SwapWidgetSectionProps = {
  compact?: boolean;
  centered?: boolean;
  hideInfoPanel?: boolean;
  minimal?: boolean;
};

type Eip1193Provider = {
  isMetaMask?: boolean;
  isRabby?: boolean;
  providers?: Eip1193Provider[];
  request: (args: { method: string; params?: unknown[] | object }) => Promise<unknown>;
};

type SwapSellToken = Web3SwapToken & {
  balance?: number;
};

type SwapRail = 'evm' | 'sui';

const NATIVE_TOKEN_ADDRESS = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

const PORTFOLIO_CHAIN_TO_HEX: Record<string, string> = {
  ethereum: '0x1',
  eth: '0x1',
  mainnet: '0x1',
  'binance-smart-chain': '0x38',
  'bnb-smart-chain': '0x38',
  'bnb chain': '0x38',
  bsc: '0x38',
  bnb: '0x38',
  polygon: '0x89',
  'polygon-pos': '0x89',
  matic: '0x89',
  optimism: '0xa',
  opt: '0xa',
  base: '0x2105',
  arbitrum: '0xa4b1',
  'arbitrum-one': '0xa4b1',
  'arbitrum one': '0xa4b1',
  arb: '0xa4b1',
  avalanche: '0xa86a',
  avax: '0xa86a',
};

const CHAIN_NATIVE_TOKEN: Record<string, { symbol: string; name: string; decimals: number }> = {
  '0x1': { symbol: 'ETH', name: 'Ethereum', decimals: 18 },
  '0xa4b1': { symbol: 'ETH', name: 'Ethereum', decimals: 18 },
  '0xa': { symbol: 'ETH', name: 'Ethereum', decimals: 18 },
  '0x2105': { symbol: 'ETH', name: 'Ethereum', decimals: 18 },
  '0x38': { symbol: 'BNB', name: 'BNB', decimals: 18 },
  '0x89': { symbol: 'POL', name: 'Polygon', decimals: 18 },
  '0xa86a': { symbol: 'AVAX', name: 'Avalanche', decimals: 18 },
};

const CHAIN_ID_TO_WALLET_TYPE: Record<string, string> = {
  '0x1': 'eth',
  '0xa4b1': 'arbitrum',
  '0x2105': 'base',
  '0x89': 'polygon',
  '0x38': 'bnb',
};

function getEthereumProvider(kind: 'metamask' | 'rabby'): Eip1193Provider | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const ethereum = (window as Window & { ethereum?: Eip1193Provider }).ethereum;
  if (!ethereum) {
    return null;
  }

  const candidates = Array.isArray(ethereum.providers) && ethereum.providers.length > 0
    ? ethereum.providers
    : [ethereum];

  return candidates.find((provider) => (kind === 'rabby' ? provider.isRabby : provider.isMetaMask && !provider.isRabby)) ?? null;
}

async function resolveEvmProvider(session: ExternalWalletSession | null): Promise<Eip1193Provider | null> {
  if (!session) {
    return null;
  }

  async function getEmbeddedProvider() {
    const { getGoogleEvmProvider } = await import('../lib/web3auth');
    return getGoogleEvmProvider();
  }

  if (session.type === 'evm') {
    return session.provider === 'web3auth'
      ? getEmbeddedProvider()
      : getEthereumProvider(session.provider);
  }

  if (session.type === 'google' && session.provider === 'web3auth' && session.walletNetwork === 'evm') {
    return getEmbeddedProvider();
  }

  return null;
}

function formatTokenAmount(value: number): string {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: value >= 1000 ? 0 : value >= 1 ? 4 : 6,
  }).format(value);
}

function formatUsd(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value);
}

function normalizeHexChainId(value?: string | null): string | null {
  if (!value) {
    return null;
  }

  const raw = value.trim().toLowerCase();
  if (!raw) {
    return null;
  }

  if (raw.startsWith('0x')) {
    return raw;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? `0x${parsed.toString(16)}` : null;
}

function normalizeTokenAddress(value?: string | null): string {
  return String(value || '').trim().toLowerCase();
}

function normalizeSwapTokenAddress(value?: string | null): string {
  const normalized = normalizeTokenAddress(value);
  return normalized === '' || normalized === 'native' ? NATIVE_TOKEN_ADDRESS : normalized;
}

function normalizeChainReference(value?: string | null): string | null {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) {
    return null;
  }

  const eip155Match = raw.match(/^eip155:(\d+)$/);
  if (eip155Match) {
    return normalizeHexChainId(eip155Match[1]);
  }

  return normalizeHexChainId(raw) ?? PORTFOLIO_CHAIN_TO_HEX[raw] ?? null;
}

function walletTokenChainId(token: WalletPortfolioToken): string | null {
  return normalizeChainReference((token as WalletPortfolioToken & { chain_id?: string | null }).chain_id)
    ?? normalizeChainReference(token.chain);
}

function walletTypeForEvmLink(network?: string | null, chainId?: string | null) {
  const normalizedChainId = normalizeChainReference(chainId ?? network);
  return walletLinkTypeFromPortfolioNetwork(
    (normalizedChainId ? CHAIN_ID_TO_WALLET_TYPE[normalizedChainId] : null)
      ?? String(network || ''),
  );
}

function decimalToUnits(amount: string, decimals: number): string {
  const normalized = amount.trim().replace(',', '.');
  if (!/^\d*\.?\d*$/.test(normalized) || normalized === '' || normalized === '.') {
    return '0';
  }

  const [wholePart = '0', fractionPart = ''] = normalized.split('.');
  const safeWhole = wholePart.replace(/^0+(?=\d)/, '') || '0';
  const safeFraction = fractionPart.slice(0, decimals).padEnd(decimals, '0');

  return `${safeWhole}${safeFraction}`.replace(/^0+(?=\d)/, '') || '0';
}

function unitsToDecimal(amount: string, decimals: number): number {
  const normalized = amount.replace(/\D/g, '');
  if (!normalized) {
    return 0;
  }

  const padded = normalized.padStart(decimals + 1, '0');
  const whole = padded.slice(0, -decimals) || '0';
  const fraction = padded.slice(-decimals).replace(/0+$/, '');

  return Number(fraction ? `${whole}.${fraction}` : whole);
}

function toHexQuantity(value?: string | number | null): string | undefined {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }

  if (typeof value === 'number') {
    return `0x${Math.trunc(value).toString(16)}`;
  }

  const raw = String(value).trim();
  if (raw.startsWith('0x')) {
    return raw;
  }

  return `0x${BigInt(raw).toString(16)}`;
}

async function waitForTransactionReceipt(provider: Eip1193Provider, hash: string): Promise<void> {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const receipt = await provider.request({
      method: 'eth_getTransactionReceipt',
      params: [hash],
    });

    if (receipt) {
      return;
    }

    await new Promise((resolve) => window.setTimeout(resolve, 1500));
  }

  throw new Error('Transaction was sent but receipt did not arrive in time.');
}

export function SwapWidgetSection({
  compact = false,
  centered = false,
  hideInfoPanel = false,
  minimal = false,
}: SwapWidgetSectionProps) {
  const { messages } = useI18n();
  const [walletSession, setWalletSession] = React.useState<ExternalWalletSession | null>(null);
  const [walletChainId, setWalletChainId] = React.useState<string | null>(null);
  const [tokens, setTokens] = React.useState<Web3SwapToken[]>([]);
  const [walletTokens, setWalletTokens] = React.useState<WalletPortfolioToken[]>([]);
  const [tokensError, setTokensError] = React.useState<string | null>(null);
  const [walletTokensError, setWalletTokensError] = React.useState<string | null>(null);
  const [isLoadingWalletTokens, setIsLoadingWalletTokens] = React.useState(false);
  const [fromTokenAddress, setFromTokenAddress] = React.useState('');
  const [toTokenAddress, setToTokenAddress] = React.useState('');
  const [fromAmount, setFromAmount] = React.useState('0');
  const [receiveAmount, setReceiveAmount] = React.useState('');
  const [quoteMessage, setQuoteMessage] = React.useState<string | null>(null);
  const [commissionPercent, setCommissionPercent] = React.useState(0);
  const [routeHint, setRouteHint] = React.useState<string | null>(null);
  const [isPricing, setIsPricing] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [connectPending, setConnectPending] = React.useState<'metamask' | 'rabby' | null>(null);
  const [connectError, setConnectError] = React.useState<string | null>(null);
  const [lastTxHash, setLastTxHash] = React.useState<string | null>(null);
  const [swapRail, setSwapRail] = React.useState<SwapRail>('evm');

  const swapLinked = useSwapLinkedWallets();
  const isEvmWallet = isExternalSessionEvm(walletSession);
  const sessionWalletAddress = getExternalSessionAddress(walletSession) ?? '';
  const evmSwapAddress = swapLinked.selectedEvmAddress.trim() || sessionWalletAddress;
  const selectedEvmWallet = React.useMemo(
    () => swapLinked.evmLinked.find((wallet) => (
      normalizeSwapWalletAddress(wallet.address) === normalizeSwapWalletAddress(evmSwapAddress)
    )) ?? null,
    [evmSwapAddress, swapLinked.evmLinked],
  );
  const selectedEvmChainId = React.useMemo(
    () => normalizeChainReference(selectedEvmWallet?.chain_id ?? selectedEvmWallet?.network),
    [selectedEvmWallet],
  );
  const selectedEvmNeedsExtensionConnect = Boolean(selectedEvmWallet && Number(selectedEvmWallet.web3auth ?? 0) === 0);
  const evmSessionMatchesSelection =
    Boolean(isEvmWallet && sessionWalletAddress)
    && normalizeSwapWalletAddress(evmSwapAddress) === normalizeSwapWalletAddress(sessionWalletAddress);
  const activeChainId = selectedEvmChainId ?? walletChainId ?? normalizeHexChainId(tokens[0]?.chain_id) ?? null;
  const chainTokens = React.useMemo(
    () => tokens.filter((token) => normalizeHexChainId(token.chain_id) === activeChainId),
    [activeChainId, tokens],
  );
  const walletSellTokens = React.useMemo<SwapSellToken[]>(() => {
    if (!activeChainId || walletTokens.length === 0) {
      return [];
    }

    return walletTokens
      .filter((asset) => walletTokenChainId(asset) === activeChainId)
      .filter((asset) => Number(asset.balance || 0) > 0)
      .map((asset) => {
        const address = normalizeSwapTokenAddress(asset.token_address);
        const configured = chainTokens.find((token) => normalizeTokenAddress(token.address) === address);
        const native = address === NATIVE_TOKEN_ADDRESS ? CHAIN_NATIVE_TOKEN[activeChainId] : undefined;

        return {
          id: configured?.id ?? 0,
          symbol: asset.symbol || configured?.symbol || native?.symbol || 'TOKEN',
          name: asset.name || configured?.name || native?.name || asset.symbol || 'Token',
          address,
          decimals: Number(asset.decimals || configured?.decimals || native?.decimals || 18),
          chain_id: activeChainId,
          chain_id_decimal: configured?.chain_id_decimal || String(Number.parseInt(activeChainId.replace(/^0x/, ''), 16)),
          coingecko_id: configured?.coingecko_id || '',
          commission: Number(asset.commission ?? configured?.commission ?? 0),
          balance: Number(asset.balance || 0),
        };
      });
  }, [activeChainId, chainTokens, walletTokens]);
  const sellTokenOptions = evmSwapAddress ? walletSellTokens : chainTokens;
  const fromToken = sellTokenOptions.find((token) => token.address === fromTokenAddress) ?? sellTokenOptions[0] ?? null;
  const toToken = chainTokens.find((token) => token.address === toTokenAddress) ?? chainTokens[1] ?? chainTokens[0] ?? null;
  const numericFromAmount = Number(fromAmount.replace(',', '.'));
  const validAmount = Number.isFinite(numericFromAmount) && numericFromAmount > 0;
  const fromAmountUnits = fromToken ? decimalToUnits(fromAmount, fromToken.decimals) : '0';
  const hasTokenPair = Boolean(fromToken && toToken && fromToken.address !== toToken.address);
  const hasEnoughBalance = !fromToken || fromToken.balance === undefined || numericFromAmount <= fromToken.balance;
  const canSubmit = Boolean(
    isEvmWallet
      && activeChainId
      && validAmount
      && hasTokenPair
      && fromAmountUnits !== '0'
      && hasEnoughBalance
      && !isSubmitting
      && evmSessionMatchesSelection,
  );

  React.useEffect(() => {
    setWalletSession(readExternalWalletSession());

    if (typeof window === 'undefined') {
      return;
    }

    function syncExternalSession() {
      setWalletSession(readExternalWalletSession());
    }

    window.addEventListener(EXTERNAL_WALLET_SESSION_EVENT, syncExternalSession as EventListener);
    window.addEventListener('storage', syncExternalSession);

    return () => {
      window.removeEventListener(EXTERNAL_WALLET_SESSION_EVENT, syncExternalSession as EventListener);
      window.removeEventListener('storage', syncExternalSession);
    };
  }, []);

  React.useEffect(() => {
    let cancelled = false;

    getWeb3SwapTokens()
      .then((items) => {
        if (cancelled) {
          return;
        }

        setTokens(items);
        setTokensError(null);
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }

        setTokens([]);
        setTokensError(error instanceof Error ? error.message : 'Failed to load swap tokens.');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (!isEvmWallet) {
      setWalletChainId(null);
      return;
    }

    let cancelled = false;

    resolveEvmProvider(walletSession)
      .then((provider) => {
        if (!provider) {
          setWalletChainId(null);
          return null;
        }

        return provider.request({ method: 'eth_chainId' });
      })
      .then((chainId) => {
        if (cancelled) {
          return;
        }

        if (typeof chainId === 'string') {
          setWalletChainId(normalizeHexChainId(chainId));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setWalletChainId(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isEvmWallet, walletSession]);

  React.useEffect(() => {
    if (swapRail !== 'evm' || !evmSwapAddress) {
      setWalletTokens([]);
      setWalletTokensError(null);
      setIsLoadingWalletTokens(false);
      return;
    }

    let cancelled = false;
    setIsLoadingWalletTokens(true);

    getWalletPortfolioTokens(evmSwapAddress, { refresh: false, includeUnselected: true })
      .then((portfolio) => {
        if (cancelled) {
          return;
        }

        setWalletTokens(portfolio.result);
        setWalletTokensError(null);
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }

        setWalletTokens([]);
        setWalletTokensError(error instanceof Error ? error.message : 'Failed to load wallet assets.');
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingWalletTokens(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [evmSwapAddress, swapRail]);

  React.useEffect(() => {
    if (!sellTokenOptions.length) {
      setFromTokenAddress('');
      setToTokenAddress('');
      return;
    }

    const nextFromToken = sellTokenOptions.find((token) => token.address === fromTokenAddress) ?? sellTokenOptions[0];
    setFromTokenAddress(nextFromToken.address);

    const nextToToken = chainTokens.find((token) => token.address === toTokenAddress && token.address !== nextFromToken.address)
      ?? chainTokens.find((token) => token.address !== nextFromToken.address)
      ?? nextFromToken;
    setToTokenAddress(nextToToken.address);
  }, [chainTokens, fromTokenAddress, sellTokenOptions, toTokenAddress]);

  React.useEffect(() => {
    if (swapRail !== 'evm') {
      return;
    }

    if (!fromToken || !toToken || !validAmount || fromToken.address === toToken.address) {
      setReceiveAmount('');
      setQuoteMessage(null);
      setCommissionPercent(fromToken?.commission ?? 0);
      setRouteHint(null);
      return;
    }

    let cancelled = false;
    setIsPricing(true);

    const timeoutId = window.setTimeout(() => {
      getWalletSwapPrice({
        chain_id: fromToken.chain_id,
        sell_token: fromToken.address,
        buy_token: toToken.address,
        sell_amount: fromAmountUnits,
        address: evmSwapAddress || undefined,
      })
        .then((price) => {
          if (cancelled) {
            return;
          }

          const dstAmount = price.dstAmount ?? price.toTokenAmount ?? '0';
          setReceiveAmount(formatTokenAmount(unitsToDecimal(dstAmount, toToken.decimals)));
          setCommissionPercent(Number(price.meta?.commission_percent ?? fromToken.commission ?? 0));
          setQuoteMessage(null);
          setRouteHint(`1inch route preview: ${fromToken.symbol} -> ${toToken.symbol}`);
        })
        .catch((error) => {
          if (cancelled) {
            return;
          }

          setReceiveAmount('');
          setQuoteMessage(error instanceof Error ? error.message : 'Failed to fetch quote.');
          setRouteHint(null);
        })
        .finally(() => {
          if (!cancelled) {
            setIsPricing(false);
          }
        });
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [evmSwapAddress, fromAmountUnits, fromToken, swapRail, toToken, validAmount]);

  function handleSwapDirection() {
    if (!fromToken || !toToken) {
      return;
    }

    setFromTokenAddress(toToken.address);
    setToTokenAddress(fromToken.address);
  }

  async function handleConnectLinkedEvmWallet(providerName: 'metamask' | 'rabby') {
    const provider = getEthereumProvider(providerName);
    if (!provider) {
      setConnectError(`${providerName === 'metamask' ? 'MetaMask' : 'Rabby Wallet'} was not detected in this browser.`);
      return;
    }

    setConnectPending(providerName);
    setConnectError(null);

    try {
      const accounts = await provider.request({ method: 'eth_requestAccounts' });
      const address = Array.isArray(accounts) && typeof accounts[0] === 'string' ? accounts[0] : '';
      if (!address) {
        throw new Error('Wallet did not return an account.');
      }

      const normalizedConnected = normalizeSwapWalletAddress(address);
      const normalizedSelected = normalizeSwapWalletAddress(evmSwapAddress);
      if (normalizedSelected && normalizedConnected !== normalizedSelected) {
        throw new Error('Connected wallet does not match the selected linked EVM address.');
      }

      const chainId = normalizeHexChainId(await provider.request({ method: 'eth_chainId' }) as string) ?? undefined;
      const identitySession = readIdentitySession();

      if (identitySession?.token) {
        const walletType = walletTypeForEvmLink(selectedEvmWallet?.network, selectedEvmChainId ?? chainId);
        const challenge = await createWalletLinkChallenge(identitySession.token, {
          address,
          walletType,
        });
        const signature = await provider.request({
          method: 'personal_sign',
          params: [challenge.message, address],
        });

        if (typeof signature !== 'string' || signature.trim() === '') {
          throw new Error('Wallet did not return a signature.');
        }

        const user = await linkAuthenticatedWallet(identitySession.token, {
          address,
          signature,
          network: selectedEvmWallet?.network ?? walletType,
          walletType,
        });

        persistIdentitySession({
          ...identitySession,
          user,
        });
      }

      const session: ExternalWalletSession = {
        type: 'evm',
        provider: providerName,
        address,
        chainId,
      };

      persistExternalWalletSession(session);
      setWalletSession(session);
      setWalletChainId(chainId ?? null);
    } catch (error) {
      setConnectError(error instanceof Error ? error.message : 'Wallet connection failed.');
    } finally {
      setConnectPending(null);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!walletSession || !isEvmWallet || !fromToken || !toToken || !evmSwapAddress || !evmSessionMatchesSelection) {
      return;
    }

    const provider = await resolveEvmProvider(walletSession);

    if (!provider) {
      setQuoteMessage(walletSession.type === 'google'
        ? 'Google EVM session is not available. Open Google embedded wallet login again.'
        : `${walletSession.provider === 'metamask' ? 'MetaMask' : walletSession.provider === 'rabby' ? 'Rabby Wallet' : 'Web3Auth'} is not available in this browser.`);
      return;
    }

    try {
      setIsSubmitting(true);
      setQuoteMessage(null);
      setLastTxHash(null);

      const targetChainId = normalizeHexChainId(fromToken.chain_id);
      const activeChain = normalizeHexChainId(await provider.request({ method: 'eth_chainId' }) as string);

      if (activeChain !== targetChainId) {
        await provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: fromToken.chain_id }],
        });
      }

      const quotePayload = {
        chain_id: fromToken.chain_id,
        sell_token: fromToken.address,
        buy_token: toToken.address,
        sell_amount: fromAmountUnits,
        taker: evmSwapAddress,
        slippage_bps: 100,
      };
      let quote = await getWalletSwapQuote(quotePayload);

      if (quote.approval_required && quote.approve_tx) {
        const result = await provider.request({
          method: 'eth_sendTransaction',
          params: [{
            from: sessionWalletAddress,
            to: quote.approve_tx.to,
            data: quote.approve_tx.data,
            value: toHexQuantity(quote.approve_tx.value ?? '0'),
            gasPrice: toHexQuantity(quote.approve_tx.gasPrice),
          }],
        });
        const approveHash = typeof result === 'string' ? result : undefined;

        if (approveHash) {
          await waitForTransactionReceipt(provider, approveHash);
        }

        quote = await getWalletSwapQuote(quotePayload);
      }

      if (!quote.tx?.to || !quote.tx?.data) {
        throw new Error('1inch did not return a swap transaction.');
      }

      const result = await provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: sessionWalletAddress,
          to: quote.tx.to,
          data: quote.tx.data,
          value: toHexQuantity(quote.tx.value ?? '0'),
          gas: toHexQuantity(quote.tx.gas),
          gasPrice: toHexQuantity(quote.tx.gasPrice),
        }],
      });
      const swapHash = typeof result === 'string' ? result : undefined;

      if (swapHash) {
        setLastTxHash(swapHash);
        setQuoteMessage('Swap transaction submitted through 1inch. Waiting for confirmation...');
        await waitForTransactionReceipt(provider, swapHash);
        setQuoteMessage('Swap confirmed. Refreshing wallet balances...');
        const portfolio = await getWalletPortfolioTokens(evmSwapAddress, { refresh: true, includeUnselected: true });
        setWalletTokens(portfolio.result);
        setQuoteMessage('Swap confirmed.');
      }
    } catch (error) {
      setQuoteMessage(error instanceof Error ? error.message : 'Swap failed.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className={`ce-glass-slab flex flex-col rounded-3xl border border-white/[0.08] ${compact ? 'p-8 lg:p-10' : 'p-8 lg:p-12'} ${hideInfoPanel ? 'items-center justify-center' : 'lg:flex-row lg:items-center'} gap-12`}
    >
      {hideInfoPanel ? null : (
        <div className="flex-1">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-teal-400/20 bg-teal-400/[0.08] px-3 py-1.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">
            <Search className="h-4 w-4 text-teal-300/90" />
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-200/90">{messages.features.secureGateway}</span>
          </div>
          <p className="mb-8 max-w-md text-slate-500">
            {messages.features.exchangeDescription}
          </p>
          <ul className="space-y-4">
            {messages.features.checklist.map((item, index) => (
              <li key={index} className="flex items-center gap-3 tracking-wide text-slate-400">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-400/15">
                  <Search className="h-3.5 w-3.5 text-teal-300/90" />
                </div>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className={`flex w-full max-w-md flex-col ${centered ? 'mx-auto' : ''}`}>
        <div className="relative mb-4 flex w-full rounded-xl border border-white/[0.08] bg-[rgba(4,8,16,0.55)] p-1 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
          <button
            type="button"
            onClick={() => setSwapRail('evm')}
            className={`flex-1 rounded-lg px-3 py-2 text-center text-xs font-semibold uppercase tracking-[0.12em] transition-colors ${
              swapRail === 'evm'
                ? 'bg-[rgba(12,18,32,0.95)] text-teal-100 shadow-[0_0_20px_-12px_rgba(45,212,191,0.4)]'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            EVM · 1inch
          </button>
          <button
            type="button"
            onClick={() => setSwapRail('sui')}
            className={`flex-1 rounded-lg px-3 py-2 text-center text-xs font-semibold uppercase tracking-[0.12em] transition-colors ${
              swapRail === 'sui'
                ? 'bg-[rgba(12,18,32,0.95)] text-cyan-100 shadow-[0_0_20px_-12px_rgba(34,211,238,0.35)]'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Sui · Cetus
          </button>
        </div>

        {swapRail === 'evm' && swapLinked.evmLinked.length > 0 ? (
          <div className="mb-4 w-full max-w-md rounded-xl border border-white/[0.08] bg-[rgba(4,8,16,0.55)] p-3 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Google-linked EVM account</div>
            <select
              value={swapLinked.selectedEvmAddress}
              onChange={(event) => swapLinked.setSelectedEvmAddress(event.target.value)}
              className="mt-2 w-full rounded-lg border border-white/[0.08] bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-teal-400/30"
            >
              {swapLinked.evmLinked.map((w) => {
                const addr = w.address.trim();
                return (
                  <option key={addr} value={addr}>
                    {addr.length > 16 ? `${addr.slice(0, 10)}…${addr.slice(-6)}` : addr}
                    {w.network ? ` · ${w.network}` : ''}
                  </option>
                );
              })}
            </select>
            {swapLinked.lookupError ? (
              <p className="mt-2 text-xs text-amber-200/90">{swapLinked.lookupError}</p>
            ) : null}
            {isEvmWallet && sessionWalletAddress && !evmSessionMatchesSelection ? (
              <p className="mt-2 text-xs text-amber-200/90">
                Connect an EVM wallet that matches the selected address to sign the swap.
              </p>
            ) : null}
            {selectedEvmNeedsExtensionConnect && !evmSessionMatchesSelection ? (
              <div className="mt-3 grid grid-cols-2 gap-2">
                {(['metamask', 'rabby'] as const).map((providerName) => (
                  <button
                    key={providerName}
                    type="button"
                    onClick={() => void handleConnectLinkedEvmWallet(providerName)}
                    disabled={connectPending !== null}
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-teal-400/20 bg-teal-400/[0.08] px-3 text-xs font-semibold text-teal-100 transition-colors hover:border-teal-300/35 hover:bg-teal-400/[0.12] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {connectPending === providerName ? (
                      <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Wallet className="h-3.5 w-3.5" />
                    )}
                    {providerName === 'metamask' ? 'MetaMask' : 'Rabby'}
                  </button>
                ))}
              </div>
            ) : null}
            {connectError ? (
              <p className="mt-2 text-xs text-amber-200/90">{connectError}</p>
            ) : null}
          </div>
        ) : null}

        {swapRail === 'sui' ? (
          <SuiSwapPanel
            minimal={minimal}
            centered={false}
            linkedSuiWallets={swapLinked.suiLinked}
            selectedOwnerAddress={swapLinked.selectedSuiAddress}
            onSelectOwnerAddress={swapLinked.setSelectedSuiAddress}
          />
        ) : null}

      {swapRail === 'evm' ? (
      <form
        onSubmit={(event) => void handleSubmit(event)}
        className={`relative w-full max-w-md rounded-2xl border border-white/[0.09] bg-[rgba(5,9,18,0.72)] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05),0_24px_64px_-28px_rgba(0,0,0,0.55)] backdrop-blur-xl ${minimal ? 'p-5' : 'p-6'} ${centered ? 'mx-auto' : ''}`}
      >
        <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-b from-teal-500/[0.06] via-transparent to-violet-500/[0.04]" />

        <div className="relative mb-6 flex items-center justify-between">
          <h4 className="font-medium tracking-wide text-white">{messages.features.swap}</h4>
          {minimal ? null : (
            <button type="button" className="text-slate-500 transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-teal-100/90">
              <CreditCard className="h-5 w-5" />
            </button>
          )}
        </div>

        <div className="relative space-y-2">
          <div className="rounded-xl border border-white/[0.08] bg-[rgba(4,8,16,0.85)] p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] transition-[border-color,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] focus-within:border-teal-400/35 focus-within:shadow-[0_0_24px_-12px_rgba(45,212,191,0.25)]">
            <div className="mb-2 flex justify-between text-sm tracking-wide text-slate-500">
              <span>{messages.features.youPay}</span>
              <span>{messages.features.balance}: {fromToken?.balance !== undefined ? `${formatTokenAmount(fromToken.balance)} ${fromToken.symbol}` : '--'}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <input
                type="text"
                value={fromAmount}
                onChange={(event) => setFromAmount(event.target.value)}
                className="w-1/2 bg-transparent text-2xl font-semibold tracking-tight text-white outline-none"
              />
              <select
                value={fromTokenAddress}
                onChange={(event) => setFromTokenAddress(event.target.value)}
                className="rounded-lg border border-white/[0.08] bg-[rgba(8,12,22,0.9)] px-3 py-1.5 font-medium text-white outline-none transition-[border-color] duration-300 hover:border-teal-400/25"
              >
                {sellTokenOptions.map((token) => (
                  <option key={`${token.chain_id}:${token.address}`} value={token.address}>
                    {token.balance !== undefined ? `${token.symbol} · ${formatTokenAmount(token.balance)}` : token.symbol}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSwapDirection}
            className="absolute left-1/2 top-1/2 z-10 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border-[4px] border-[rgba(5,8,14,0.95)] bg-[rgba(12,18,32,0.95)] text-slate-400 shadow-[0_0_20px_-8px_rgba(45,212,191,0.35)] transition-[background,color,border-color,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-teal-400/30 hover:bg-[rgba(16,24,40,0.98)] hover:text-teal-100"
          >
            <ArrowRightLeft className="h-4 w-4 rotate-90" />
          </button>

          <div className="rounded-xl border border-white/[0.08] bg-[rgba(4,8,16,0.85)] p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] transition-[border-color,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] focus-within:border-cyan-400/35 focus-within:shadow-[0_0_24px_-12px_rgba(34,211,238,0.2)]">
            <div className="mb-2 flex justify-between text-sm tracking-wide text-slate-500">
              <span>{messages.features.youReceive}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <input
                type="text"
                value={receiveAmount}
                readOnly
                className="w-1/2 bg-transparent text-2xl font-semibold tracking-tight text-white outline-none"
              />
              <select
                value={toTokenAddress}
                onChange={(event) => setToTokenAddress(event.target.value)}
                className="rounded-lg border border-white/[0.08] bg-[rgba(8,12,22,0.9)] px-3 py-1.5 font-medium text-white outline-none transition-[border-color] duration-300 hover:border-cyan-400/25"
              >
                {chainTokens.map((token) => (
                  <option key={`${token.chain_id}:${token.address}`} value={token.address}>{token.symbol}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-2 text-sm tracking-wide text-slate-500">
          <div>Commission: {commissionPercent.toFixed(4)}%</div>
          {!minimal && routeHint ? <div>{routeHint}</div> : null}
          {quoteMessage ? <div className="text-teal-200/90">{quoteMessage}</div> : null}
          {lastTxHash ? <div className="break-all text-cyan-200/90">Tx: {lastTxHash}</div> : null}
          {!walletSession ? <div>Connect an EVM wallet to execute swap.</div> : null}
          {walletSession?.type === 'google' && walletSession.provider === 'zklogin' ? (
            <div className="text-slate-400">
              Sui zkLogin is only for the Sui network. Switch to{' '}
              <button
                type="button"
                className="text-cyan-200 underline decoration-cyan-200/40 underline-offset-2 hover:text-cyan-100"
                onClick={() => setSwapRail('sui')}
              >
                Sui · Cetus
              </button>{' '}
              to swap with Google, or connect Google EVM / MetaMask / Rabby for 1inch.
            </div>
          ) : null}
          {tokensError ? <div className="text-amber-200">{tokensError}</div> : null}
          {walletTokensError ? <div className="text-amber-200">{walletTokensError}</div> : null}
          {isLoadingWalletTokens ? <div>Loading wallet balances...</div> : null}
          {evmSwapAddress && walletSellTokens.length === 0 && !isLoadingWalletTokens ? (
            <div>No wallet tokens with balance are available for swap on this network.</div>
          ) : null}
          {!hasEnoughBalance ? <div className="text-amber-200">Amount is greater than wallet balance.</div> : null}
          {isPricing ? <div>Fetching 1inch quote...</div> : null}
          {!minimal && fromToken ? (
            <div>
              Network: {fromToken.chain_id} · Estimated fee on amount: {formatUsd((numericFromAmount || 0) * (commissionPercent / 100))}
            </div>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className="mt-6 w-full rounded-xl border border-teal-400/25 bg-gradient-to-r from-teal-500 to-cyan-600 py-4 font-bold tracking-wide text-slate-950 shadow-[0_0_32px_-10px_rgba(45,212,191,0.55)] transition-[filter,box-shadow,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:shadow-[0_0_44px_-8px_rgba(45,212,191,0.65)] hover:brightness-[1.04] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:shadow-none"
        >
          {isSubmitting ? 'Sending 1inch swap...' : messages.features.confirmExchange}
        </button>
      </form>
      ) : null}
      </div>
    </div>
  );
}
