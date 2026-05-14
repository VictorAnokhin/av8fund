import React from 'react';
import { useCurrentAccount, useCurrentWallet, useSuiClient, useSuiClientQuery } from '@mysten/dapp-kit';
import {
  Activity,
  Radar,
  RefreshCcw,
  Settings2,
  ShieldCheck,
  Waves,
} from 'lucide-react';
import { motion } from 'motion/react';

import { useI18n } from '../i18n';
import {
  getWalletProtocols,
  getWalletPortfolioTokens,
  getWalletTokenSettings,
  resolveUserByWallet,
  saveWalletTokenSettings,
  type ResolvedUserWallet,
  type ResolvedWalletUser,
  type ProjectSettings,
  type WalletPortfolioResponse,
  type WalletPortfolioToken,
} from '../lib/api';
import { inferWeb3authForLinkedAddress, mergeLinkedWalletsForUser } from '../lib/swapLinkedWallets';
import { isValidSuiAddress } from '@mysten/sui/utils';
import {
  HEADER_NETWORK_CHANGE_EVENT,
  HEADER_NETWORK_IDS,
  readStoredHeaderNetwork,
  getHeaderNetworkFamily,
  walletMatchesHeaderNetwork,
  SELECTED_HEADER_NETWORK_STORAGE_KEY,
  type HeaderNetwork,
} from '../lib/headerNetwork';
import {
  AV8_BASKET_ID,
  FALLBACK_FUND_SNAPSHOT,
  mapBasketObjectToSnapshot,
} from '../lib/suiFund';
import { SUI_NETWORK } from '../config';
import {
  EXTERNAL_WALLET_SESSION_EVENT,
  getExternalSessionAddress,
  hasStoredExternalWalletSession,
  readExternalWalletSession,
  type ExternalWalletSession,
} from '../lib/externalWalletSession';
import {
  IDENTITY_SESSION_EVENT,
  readIdentitySession,
  type IdentitySession,
} from '../lib/identitySession';
import { Checkbox } from './ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Input } from './ui/input';

type HeroCoinLike = {
  coinObjectId: string;
  balance: string;
};

const USDC_COIN_TYPE =
  '0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC';
const NATIVE_SUI_COIN_TYPE = '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI';
const USDC_DECIMALS = 6;
const SUI_DECIMALS = 9;
const AV8_SHARE_DECIMALS = 6;

async function fetchAllCoinsForOwner(
  client: ReturnType<typeof useSuiClient>,
  owner: string,
  coinType: string,
): Promise<HeroCoinLike[]> {
  const coins: HeroCoinLike[] = [];
  let cursor: string | null | undefined = null;

  do {
    const page = await client.getCoins({
      owner,
      coinType,
      cursor,
      limit: 50,
    });

    coins.push(...page.data.map((coin) => ({
      coinObjectId: coin.coinObjectId,
      balance: coin.balance,
    })));

    cursor = page.hasNextPage ? page.nextCursor : null;
  } while (cursor);

  return coins;
}

function formatSuiNetworkTier(network: string): string {
  const normalized = network.trim().toLowerCase();
  if (normalized === 'mainnet') {
    return 'Mainnet';
  }

  if (normalized === 'testnet') {
    return 'Testnet';
  }

  if (normalized === 'devnet') {
    return 'Devnet';
  }

  return network;
}

function formatBigIntBalance(balance: bigint, decimals: number): string {
  if (decimals <= 0) {
    return balance.toString();
  }

  const negative = balance < 0n;
  const value = negative ? -balance : balance;
  const base = 10n ** BigInt(decimals);
  const whole = value / base;
  const fraction = value % base;
  const fractionStr = fraction.toString().padStart(decimals, '0').replace(/0+$/, '');

  const wholeNumber = Number(whole);
  const formattedWhole = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(wholeNumber);

  if (!fractionStr) {
    return `${negative ? '-' : ''}${formattedWhole}`;
  }

  return `${negative ? '-' : ''}${formattedWhole}.${fractionStr}`;
}

function formatHeroAv8SharesFromChainTotal(totalShares: number): string {
  const n = Number(totalShares);
  if (!Number.isFinite(n) || n < 0) {
    return '—';
  }

  if (n === 0) {
    return '0 AV8';
  }

  return `${formatBigIntBalance(BigInt(Math.floor(n)), AV8_SHARE_DECIMALS)} AV8`;
}

function formatHeroAv8SharesPlain(totalShares: number): string {
  const n = Number(totalShares);
  if (!Number.isFinite(n) || n <= 0) {
    return '—';
  }

  return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(n)} AV8`;
}

type HeroProps = {
  project: ProjectSettings;
};

const ACTIVE_WALLET_KEY = 'av8fund.active-wallet';
const ACTIVE_WALLET_EVENT = 'av8fund:active-wallet';
const ACTIVE_WALLET_REFRESH_EVENT = 'av8fund:active-wallet-refresh';

function persistActiveWallet(wallet: ResolvedUserWallet | null, isSui: boolean): void {
  if (typeof window === 'undefined') {
    return;
  }

  if (!wallet?.address) {
    window.localStorage.removeItem(ACTIVE_WALLET_KEY);
    window.dispatchEvent(new CustomEvent(ACTIVE_WALLET_EVENT));
    return;
  }

  window.localStorage.setItem(ACTIVE_WALLET_KEY, JSON.stringify({
    address: normalizeWalletAddress(wallet.address),
    network: wallet.network || null,
    isSui,
  }));
  window.dispatchEvent(new CustomEvent(ACTIVE_WALLET_EVENT));
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: value >= 1000 ? 0 : 2,
  }).format(value);
}

function formatCompactCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

function formatBalance(value: string): string {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return value;
  }

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: amount >= 100 ? 2 : 6,
  }).format(amount);
}

function formatChainLabel(chain: string): string {
  return chain
    .split(/[_-\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getTokenKey(token: WalletPortfolioToken): string {
  const chain = String(token.chain || '').trim().toLowerCase();
  const rawAddr = token.token_address || 'native';
  const addrPart = chain === 'solana' && rawAddr !== 'native'
    ? String(rawAddr).trim()
    : String(rawAddr).trim().toLowerCase();

  return [
    chain,
    addrPart,
    String(token.symbol || '').trim().toLowerCase(),
    String(token.name || '').trim().toLowerCase(),
  ].join(':');
}

function cloneTokens(tokens: WalletPortfolioToken[]): WalletPortfolioToken[] {
  return tokens.map((token) => ({ ...token }));
}

function sumProtocolUsd(payload: Awaited<ReturnType<typeof getWalletProtocols>>): number {
  return Object.values(payload).reduce((total, protocol) => {
    const tokenTotal = (protocol.tokens || []).reduce((sum, item) => sum + Math.abs(Number(item.usd_value || 0)), 0);
    const poolTotal = (protocol.pools || []).reduce((sum, item) => sum + Math.abs(Number(item.usd_value || 0)), 0);
    const loanTotal = (protocol.loans || []).reduce((sum, item) => sum + Math.abs(Number(item.usd_value || 0)), 0);

    return total + tokenTotal + poolTotal - loanTotal;
  }, 0);
}

function normalizeWalletAddress(address: string | null | undefined): string {
  const trimmed = String(address || '').trim();
  if (trimmed === '') {
    return '';
  }
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(trimmed)) {
    return trimmed;
  }
  return trimmed.toLowerCase();
}

function fallbackHeroLinkedWalletNetwork(
  headerNetwork: HeaderNetwork,
  currentSuiAddress: string | undefined,
  connectedWalletAddress: string,
  externalSession: ExternalWalletSession | null,
): string {
  const connectedNorm = normalizeWalletAddress(connectedWalletAddress);
  if (currentSuiAddress && connectedNorm === normalizeWalletAddress(currentSuiAddress)) {
    return 'sui';
  }
  if (externalSession?.type === 'google') {
    return externalSession.walletNetwork || 'sui';
  }
  if (getHeaderNetworkFamily(headerNetwork) === 'evm') {
    return headerNetwork;
  }
  if (externalSession?.type === 'evm') {
    return externalSession.provider;
  }
  if (externalSession?.type === 'solana') {
    return 'solana';
  }
  return 'eth';
}

function walletLooksLikeSui(address: string): boolean {
  const trimmed = String(address || '').trim();
  if (trimmed === '') {
    return false;
  }
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(trimmed)) {
    return false;
  }
  return isValidSuiAddress(trimmed);
}

function walletIsSui(wallet: ResolvedUserWallet | null, currentSuiAddress: string): boolean {
  const walletAddress = normalizeWalletAddress(wallet?.address);
  const network = String(wallet?.network || '').trim().toLowerCase();

  if (network.includes('sui')) {
    return true;
  }

  if (walletAddress !== '' && currentSuiAddress !== '' && walletAddress === currentSuiAddress) {
    return true;
  }

  return walletLooksLikeSui(walletAddress);
}

function resolveSuiOwnerForRpc(
  activeWalletAddress: string,
  linkedWallets: ResolvedUserWallet[],
  currentAccount: { address?: string } | null | undefined,
  externalSession: ExternalWalletSession | null,
): string {
  const normalized = normalizeWalletAddress(activeWalletAddress);
  const fromLinked = linkedWallets.find((wallet) => normalizeWalletAddress(wallet.address) === normalized);
  if (fromLinked?.address) {
    return String(fromLinked.address).trim();
  }

  if (currentAccount?.address && normalizeWalletAddress(currentAccount.address) === normalized) {
    return String(currentAccount.address).trim();
  }

  const sessionAddress = getExternalSessionAddress(externalSession);
  if (sessionAddress && normalizeWalletAddress(sessionAddress) === normalized) {
    return String(sessionAddress).trim();
  }

  return activeWalletAddress.trim();
}

export function Hero({ project }: HeroProps) {
  const currentAccount = useCurrentAccount();
  const { connectionStatus } = useCurrentWallet();
  const suiClient = useSuiClient();
  const { messages } = useI18n();

  const [walletAddress, setWalletAddress] = React.useState('');
  const [portfolio, setPortfolio] = React.useState<WalletPortfolioResponse | null>(null);
  const [defiTotalUsd, setDefiTotalUsd] = React.useState(0);
  const [assetsError, setAssetsError] = React.useState<string | null>(null);
  const [isAssetsLoading, setIsAssetsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
  const [settingsTokens, setSettingsTokens] = React.useState<WalletPortfolioToken[]>([]);
  const [settingsError, setSettingsError] = React.useState<string | null>(null);
  const [settingsNotice, setSettingsNotice] = React.useState<string | null>(null);
  const [isSettingsLoading, setIsSettingsLoading] = React.useState(false);
  const [isSavingSettings, setIsSavingSettings] = React.useState(false);
  const [hasExternalWalletSession, setHasExternalWalletSession] = React.useState(false);
  const [externalSession, setExternalSession] = React.useState<ExternalWalletSession | null>(null);
  const [identitySession, setIdentitySession] = React.useState<IdentitySession | null>(null);
  const [resolvedUser, setResolvedUser] = React.useState<ResolvedWalletUser | null>(null);
  const [linkedWallets, setLinkedWallets] = React.useState<ResolvedUserWallet[]>([]);
  const [selectedWalletAddress, setSelectedWalletAddress] = React.useState('');
  const [walletLookupError, setWalletLookupError] = React.useState<string | null>(null);
  const [suiUsdcBalance, setSuiUsdcBalance] = React.useState<bigint>(0n);
  const [suiNativeBalance, setSuiNativeBalance] = React.useState<bigint>(0n);
  const [suiBalancesLoading, setSuiBalancesLoading] = React.useState(false);
  const hasWalletConnection = Boolean(currentAccount?.address) || connectionStatus === 'connected' || hasExternalWalletSession;
  const hasIdentityAccess = Boolean(identitySession?.token && identitySession?.user);
  const hasPortfolioAccess = hasWalletConnection || hasIdentityAccess;
  const currentSuiAddress = normalizeWalletAddress(currentAccount?.address);
  const connectedWalletAddress = currentSuiAddress
    || normalizeWalletAddress(getExternalSessionAddress(externalSession));

  const [headerNetwork, setHeaderNetwork] = React.useState<HeaderNetwork>(() =>
    typeof window !== 'undefined' ? readStoredHeaderNetwork() : 'sui',
  );

  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    function onHeaderNetwork(event: Event) {
      const next = (event as CustomEvent<{ network: HeaderNetwork }>).detail?.network;
      if (next && HEADER_NETWORK_IDS.includes(next)) {
        setHeaderNetwork(next);
      }
    }

    function onStorage(ev: StorageEvent) {
      if (ev.key !== SELECTED_HEADER_NETWORK_STORAGE_KEY || !ev.newValue) {
        return;
      }
      const next = ev.newValue as HeaderNetwork;
      if (HEADER_NETWORK_IDS.includes(next)) {
        setHeaderNetwork(next);
      }
    }

    window.addEventListener(HEADER_NETWORK_CHANGE_EVENT, onHeaderNetwork);
    window.addEventListener('storage', onStorage);

    return () => {
      window.removeEventListener(HEADER_NETWORK_CHANGE_EVENT, onHeaderNetwork);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  React.useEffect(() => {
    setHasExternalWalletSession(hasStoredExternalWalletSession());
    setExternalSession(readExternalWalletSession());
    setIdentitySession(readIdentitySession());

    if (typeof window === 'undefined') {
      return;
    }

    function syncExternalSession() {
      setHasExternalWalletSession(hasStoredExternalWalletSession());
      setExternalSession(readExternalWalletSession());
    }

    function syncIdentitySession() {
      setIdentitySession(readIdentitySession());
    }

    window.addEventListener(EXTERNAL_WALLET_SESSION_EVENT, syncExternalSession as EventListener);
    window.addEventListener(IDENTITY_SESSION_EVENT, syncIdentitySession as EventListener);
    window.addEventListener('storage', syncExternalSession);
    window.addEventListener('storage', syncIdentitySession);

    return () => {
      window.removeEventListener(EXTERNAL_WALLET_SESSION_EVENT, syncExternalSession as EventListener);
      window.removeEventListener(IDENTITY_SESSION_EVENT, syncIdentitySession as EventListener);
      window.removeEventListener('storage', syncExternalSession);
      window.removeEventListener('storage', syncIdentitySession);
    };
  }, []);

  React.useEffect(() => {
    if (!hasWalletConnection && hasIdentityAccess && identitySession?.user) {
      const wallets = Array.isArray(identitySession.user.wallets) && identitySession.user.wallets.length > 0
        ? identitySession.user.wallets
        : identitySession.user.wallet_address
          ? [{
              address: identitySession.user.wallet_address,
              network: identitySession.user.wallet_network,
              connected_at: identitySession.user.wallet_connected_at,
              web3auth: inferWeb3authForLinkedAddress(identitySession.user.wallet_address, externalSession),
            }]
          : [];

      const merged = mergeLinkedWalletsForUser(identitySession.user, wallets);
      setResolvedUser(identitySession.user);
      setLinkedWallets(merged);
      setSelectedWalletAddress(normalizeWalletAddress(merged[0]?.address));
      setWalletLookupError(null);
      return;
    }

    if (!hasWalletConnection || !connectedWalletAddress) {
      setResolvedUser(null);
      setLinkedWallets([]);
      setSelectedWalletAddress('');
      setWalletLookupError(null);
      return;
    }

    let isActive = true;

    async function resolveWalletOwner() {
      setWalletLookupError(null);

      try {
        const payload = await resolveUserByWallet(connectedWalletAddress);

        if (!isActive) {
          return;
        }

        if (payload.found && payload.user) {
          const wallets = Array.isArray(payload.user.wallets) && payload.user.wallets.length > 0
            ? payload.user.wallets
            : payload.user.wallet_address
              ? [{
                  address: payload.user.wallet_address,
                  network: payload.user.wallet_network,
                  connected_at: payload.user.wallet_connected_at,
                  web3auth: inferWeb3authForLinkedAddress(payload.user.wallet_address, externalSession),
                }]
              : [];

          const merged = mergeLinkedWalletsForUser(payload.user, wallets);
          const normalizedConnected = normalizeWalletAddress(connectedWalletAddress);
          const matchingWallet = merged.find((wallet) => normalizeWalletAddress(wallet.address) === normalizedConnected);
          const fallbackWallet = matchingWallet || merged[0] || null;

          setResolvedUser(payload.user);
          setLinkedWallets(merged);
          setSelectedWalletAddress(normalizeWalletAddress(fallbackWallet?.address));
          return;
        }

        const fallbackWallet: ResolvedUserWallet = {
          address: connectedWalletAddress,
          network: fallbackHeroLinkedWalletNetwork(
            headerNetwork,
            currentSuiAddress,
            connectedWalletAddress,
            externalSession,
          ),
          connected_at: null,
          web3auth: inferWeb3authForLinkedAddress(connectedWalletAddress, externalSession),
        };

        setResolvedUser(null);
        setLinkedWallets([fallbackWallet]);
        setSelectedWalletAddress(normalizeWalletAddress(fallbackWallet.address));
      } catch (error) {
        if (!isActive) {
          return;
        }

        const fallbackWallet: ResolvedUserWallet = {
          address: connectedWalletAddress,
          network: fallbackHeroLinkedWalletNetwork(
            headerNetwork,
            currentSuiAddress,
            connectedWalletAddress,
            externalSession,
          ),
          connected_at: null,
          web3auth: inferWeb3authForLinkedAddress(connectedWalletAddress, externalSession),
        };

      setResolvedUser(null);
      setLinkedWallets([fallbackWallet]);
      setSelectedWalletAddress(normalizeWalletAddress(fallbackWallet.address));
      setWalletLookupError(error instanceof Error ? error.message : messages.hero.resolveWalletOwnerError);
      }
    }

    void resolveWalletOwner();

    return () => {
      isActive = false;
    };
  }, [connectedWalletAddress, currentSuiAddress, externalSession, hasIdentityAccess, hasWalletConnection, headerNetwork, identitySession?.user, messages.hero.resolveWalletOwnerError]);

  const displayedLinkedWallets = React.useMemo(
    () => linkedWallets.filter((wallet) => walletMatchesHeaderNetwork(wallet, headerNetwork)),
    [linkedWallets, headerNetwork],
  );

  const headerNetworkFamily = React.useMemo(() => getHeaderNetworkFamily(headerNetwork), [headerNetwork]);
  const heroDisplaySui = headerNetworkFamily === 'sui';
  const heroDisplaySolana = headerNetworkFamily === 'solana';
  const heroWebPortfolio = headerNetworkFamily === 'evm' || heroDisplaySolana;

  React.useEffect(() => {
    if (displayedLinkedWallets.length === 0) {
      return;
    }
    const norm = normalizeWalletAddress(selectedWalletAddress);
    const ok = displayedLinkedWallets.some((w) => normalizeWalletAddress(w.address) === norm);
    if (!ok) {
      setSelectedWalletAddress(normalizeWalletAddress(displayedLinkedWallets[0].address));
    }
  }, [displayedLinkedWallets, selectedWalletAddress]);

  const activeWalletAddress = React.useMemo(() => {
    const selectedNorm = normalizeWalletAddress(selectedWalletAddress);
    if (selectedNorm && displayedLinkedWallets.some((w) => normalizeWalletAddress(w.address) === selectedNorm)) {
      return selectedNorm;
    }
    const ext = normalizeWalletAddress(connectedWalletAddress);
    if (ext && displayedLinkedWallets.some((w) => normalizeWalletAddress(w.address) === ext)) {
      return ext;
    }
    const first = displayedLinkedWallets[0]?.address;
    if (first) {
      return normalizeWalletAddress(first);
    }

    if (hasPortfolioAccess && displayedLinkedWallets.length === 0) {
      return '';
    }

    return normalizeWalletAddress(selectedWalletAddress || connectedWalletAddress || walletAddress);
  }, [
    connectedWalletAddress,
    displayedLinkedWallets,
    hasPortfolioAccess,
    selectedWalletAddress,
    walletAddress,
  ]);

  const activeWallet = React.useMemo(() => {
    const addr = activeWalletAddress;
    return (
      displayedLinkedWallets.find((w) => normalizeWalletAddress(w.address) === addr)
      || linkedWallets.find((w) => normalizeWalletAddress(w.address) === addr)
      || null
    );
  }, [activeWalletAddress, displayedLinkedWallets, linkedWallets]);

  const activeWalletIsSui = React.useMemo(() => {
    return walletIsSui(activeWallet, currentSuiAddress);
  }, [activeWallet, currentSuiAddress]);

  const shouldFetchPublicFund = (heroDisplaySui && (!hasPortfolioAccess || activeWalletIsSui)) && Boolean(AV8_BASKET_ID);

  const basketQuery = useSuiClientQuery(
    'getObject',
    {
      id: AV8_BASKET_ID,
      options: {
        showContent: true,
        showOwner: true,
        showDisplay: true,
      },
    },
    {
      enabled: shouldFetchPublicFund,
      refetchInterval: 15_000,
    },
  );

  const mappedBasketFund = React.useMemo(
    () => mapBasketObjectToSnapshot(basketQuery.data),
    [basketQuery.data],
  );

  const publicFundSnapshot = React.useMemo(
    () => mappedBasketFund ?? FALLBACK_FUND_SNAPSHOT,
    [mappedBasketFund],
  );

  React.useEffect(() => {
    if (!heroDisplaySui || !activeWalletIsSui || !activeWalletAddress || !hasPortfolioAccess) {
      setSuiUsdcBalance(0n);
      setSuiNativeBalance(0n);
      setSuiBalancesLoading(false);
      return;
    }

    let cancelled = false;
    const owner = resolveSuiOwnerForRpc(activeWalletAddress, linkedWallets, currentAccount, externalSession);

    async function loadSuiBalances() {
      setSuiBalancesLoading(true);
      try {
        const [usdcCoins, suiCoins] = await Promise.all([
          fetchAllCoinsForOwner(suiClient, owner, USDC_COIN_TYPE),
          fetchAllCoinsForOwner(suiClient, owner, NATIVE_SUI_COIN_TYPE),
        ]);

        if (cancelled) {
          return;
        }

        setSuiUsdcBalance(usdcCoins.reduce((sum, coin) => sum + BigInt(coin.balance), 0n));
        setSuiNativeBalance(suiCoins.reduce((sum, coin) => sum + BigInt(coin.balance), 0n));
      } catch {
        if (!cancelled) {
          setSuiUsdcBalance(0n);
          setSuiNativeBalance(0n);
        }
      } finally {
        if (!cancelled) {
          setSuiBalancesLoading(false);
        }
      }
    }

    void loadSuiBalances();

    function onWalletRefresh(event: Event) {
      const detail = (event as CustomEvent<{ address?: string }>).detail;
      if (!detail?.address) {
        return;
      }

      if (normalizeWalletAddress(detail.address) !== normalizeWalletAddress(owner)) {
        return;
      }

      void loadSuiBalances();
    }

    if (typeof window !== 'undefined') {
      window.addEventListener(ACTIVE_WALLET_REFRESH_EVENT, onWalletRefresh as EventListener);
    }

    return () => {
      cancelled = true;
      if (typeof window !== 'undefined') {
        window.removeEventListener(ACTIVE_WALLET_REFRESH_EVENT, onWalletRefresh as EventListener);
      }
    };
  }, [
    activeWalletAddress,
    activeWalletIsSui,
    currentAccount,
    externalSession,
    hasPortfolioAccess,
    heroDisplaySui,
    linkedWallets,
    suiClient,
  ]);

  React.useEffect(() => {
    if (!hasPortfolioAccess) {
      persistActiveWallet(null, false);
      return;
    }

    persistActiveWallet(activeWallet, activeWalletIsSui);
  }, [activeWallet, activeWalletIsSui, hasPortfolioAccess]);

  const loadPortfolio = React.useCallback(async (refresh = false) => {
    if (!activeWalletAddress) {
      setWalletAddress('');
      setPortfolio(null);
      setDefiTotalUsd(0);
      setAssetsError(hasPortfolioAccess ? messages.hero.noConnectedAddress : null);
      setIsAssetsLoading(false);
      setIsRefreshing(false);
      return;
    }

    if (heroDisplaySui) {
      setWalletAddress(activeWalletAddress);
      setPortfolio(null);
      setDefiTotalUsd(0);
      setAssetsError(null);
      setIsAssetsLoading(false);
      setIsRefreshing(false);
      return;
    }

    if (!heroWebPortfolio) {
      setWalletAddress(activeWalletAddress);
      setPortfolio(null);
      setDefiTotalUsd(0);
      setAssetsError(null);
      setIsAssetsLoading(false);
      setIsRefreshing(false);
      return;
    }

    if (refresh) {
      setIsRefreshing(true);
    } else {
      setIsAssetsLoading(true);
    }

    setAssetsError(null);

    try {
      const protocolOpts = heroDisplaySolana
        ? { refresh, chainId: 'solana' as const }
        : { refresh };

      const [nextPortfolio, nextProtocols] = await Promise.all([
        getWalletPortfolioTokens(activeWalletAddress, { refresh }),
        getWalletProtocols(activeWalletAddress, protocolOpts),
      ]);

      setWalletAddress(activeWalletAddress);
      setPortfolio(nextPortfolio);
      setDefiTotalUsd(sumProtocolUsd(nextProtocols));
    } catch (error) {
      setDefiTotalUsd(0);
      setAssetsError(error instanceof Error ? error.message : messages.hero.loadAssetsError);
    } finally {
      setIsAssetsLoading(false);
      setIsRefreshing(false);
    }
  }, [activeWalletAddress, hasPortfolioAccess, heroDisplaySolana, heroWebPortfolio, heroDisplaySui, messages.hero.loadAssetsError, messages.hero.noConnectedAddress]);

  React.useEffect(() => {
    if (!hasPortfolioAccess) {
      setWalletAddress('');
      setPortfolio(null);
      setDefiTotalUsd(0);
      setAssetsError(null);
      setIsAssetsLoading(false);
      setIsRefreshing(false);
      return;
    }

    void loadPortfolio(false);
  }, [activeWalletAddress, hasPortfolioAccess, heroWebPortfolio, heroDisplaySui, loadPortfolio]);

  const handleOpenSettings = React.useCallback(async () => {
    setSettingsError(null);
    setSettingsNotice(null);
    setIsSettingsLoading(true);
    setIsSettingsOpen(true);

    try {
      const address = activeWalletAddress || walletAddress;

      if (!address) {
        throw new Error(messages.hero.noConnectedAddress);
      }

      if (activeWalletIsSui) {
        throw new Error(messages.hero.suiSettingsUnavailable);
      }

      const payload = await getWalletTokenSettings(address);
      setWalletAddress(address);
      setSettingsTokens(cloneTokens(payload.result));
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : messages.hero.loadSettingsError);
    } finally {
      setIsSettingsLoading(false);
    }
  }, [activeWalletAddress, activeWalletIsSui, messages.hero.loadSettingsError, messages.hero.noConnectedAddress, messages.hero.suiSettingsUnavailable, walletAddress]);

  const handleToggleToken = React.useCallback((tokenKey: string, checked: boolean) => {
    setSettingsTokens((current) =>
      current.map((token) => (getTokenKey(token) === tokenKey ? { ...token, is_selected: checked } : token)),
    );
  }, []);

  const handleCommissionChange = React.useCallback((tokenKey: string, commission: string) => {
    setSettingsTokens((current) =>
      current.map((token) => (getTokenKey(token) === tokenKey ? { ...token, commission } : token)),
    );
  }, []);

  const handleSaveSettings = React.useCallback(async () => {
    const address = activeWalletAddress || walletAddress;

    if (!address) {
      setSettingsError(messages.hero.noConnectedAddress);
      return;
    }

    if (activeWalletIsSui) {
      setSettingsError(messages.hero.suiSettingsUnavailable);
      return;
    }

    setIsSavingSettings(true);
    setSettingsError(null);
    setSettingsNotice(null);

    try {
      const chainGroups = settingsTokens.reduce<Record<string, WalletPortfolioToken[]>>((accumulator, token) => {
        accumulator[token.chain] = accumulator[token.chain] || [];
        accumulator[token.chain].push(token);
        return accumulator;
      }, {});

      let latestResponse: WalletPortfolioResponse | null = null;

      for (const [chain, tokens] of Object.entries(chainGroups)) {
        const selectedKeys = tokens.filter((token) => token.is_selected).map((token) => getTokenKey(token));
        const commissions = tokens.reduce<Record<string, number>>((accumulator, token) => {
          const value = Number(token.commission);
          accumulator[getTokenKey(token)] = Number.isFinite(value) ? Math.max(0, Math.min(3, value)) : 0;
          return accumulator;
        }, {});

        latestResponse = await saveWalletTokenSettings(address, {
          chain,
          selected_keys: selectedKeys,
          commissions,
        });
      }

      if (latestResponse) {
        setSettingsTokens(cloneTokens(latestResponse.result));
      }

      setSettingsNotice(messages.hero.settingsSaved);
      await loadPortfolio(false);
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : messages.hero.saveSettingsError);
    } finally {
      setIsSavingSettings(false);
    }
  }, [activeWalletAddress, activeWalletIsSui, loadPortfolio, messages.hero.noConnectedAddress, messages.hero.saveSettingsError, messages.hero.settingsSaved, messages.hero.suiSettingsUnavailable, settingsTokens, walletAddress]);

  const selectedAssets = React.useMemo(
    () =>
      (portfolio?.result || [])
        .slice()
        .sort((left, right) => Number(right.value_usd || 0) - Number(left.value_usd || 0))
        .slice(0, 3),
    [portfolio],
  );

  const combinedPortfolioTotal = React.useMemo(() => {
    return Number(portfolio?.total_usd_value || 0) + defiTotalUsd;
  }, [defiTotalUsd, portfolio?.total_usd_value]);

  const assetCards = React.useMemo(() => {
    const tones = [
      {
        icon: <ShieldCheck className="h-4 w-4" />,
        tone: 'text-emerald-300',
        ring: 'border-emerald-400/20 bg-emerald-400/10',
      },
      {
        icon: <Radar className="h-4 w-4" />,
        tone: 'text-amber-300',
        ring: 'border-amber-400/20 bg-amber-400/10',
      },
      {
        icon: <Waves className="h-4 w-4" />,
        tone: 'text-sky-300',
        ring: 'border-sky-400/20 bg-sky-400/10',
      },
    ];

    if (heroDisplaySui) {
      const tier = formatSuiNetworkTier(SUI_NETWORK);
      const showBalances = Boolean(activeWalletAddress && hasPortfolioAccess && activeWalletIsSui);
      const fundLoading = Boolean(AV8_BASKET_ID) && basketQuery.isPending && !basketQuery.data;

      const usdcDisplay = suiBalancesLoading
        ? messages.hero.emptyCard.loading
        : `${formatBigIntBalance(suiUsdcBalance, USDC_DECIMALS)} USDC`;
      const gasDisplay = suiBalancesLoading
        ? messages.hero.emptyCard.loading
        : `${formatBigIntBalance(suiNativeBalance, SUI_DECIMALS)} SUI`;

      const secondCard = showBalances
        ? {
            label: 'USDC',
            value: usdcDisplay,
            note: messages.hero.suiAvailableUsdc,
            ...tones[1],
          }
        : {
            label: messages.hero.suiHeroNavLabel,
            value: fundLoading ? messages.hero.emptyCard.loading : formatCurrency(publicFundSnapshot.totalNavUsd),
            note: messages.hero.suiHeroNavNote,
            ...tones[1],
          };

      const thirdCard = showBalances
        ? {
            label: messages.hero.suiGasLabel,
            value: gasDisplay,
            note: 'SUI',
            ...tones[2],
          }
        : {
            label: messages.hero.suiHeroAv8ShareLabel,
            value: fundLoading
              ? messages.hero.emptyCard.loading
              : (mappedBasketFund
                ? formatHeroAv8SharesFromChainTotal(publicFundSnapshot.totalShares)
                : formatHeroAv8SharesPlain(publicFundSnapshot.totalShares)),
            note: messages.hero.suiConnectWalletBalances,
            ...tones[2],
          };

      return [
        {
          label: messages.hero.suiHeroNetworkCaption,
          value: messages.hero.suiHeroNetworkHeadline,
          note: tier,
          ...tones[0],
        },
        secondCard,
        thirdCard,
      ];
    }

    if (!heroWebPortfolio) {
      return tones.map((tone, index) => ({
        label: index === 0 ? messages.hero.cardLabels.assets : index === 1 ? messages.hero.cardLabels.status : messages.hero.cardLabels.source,
        value: messages.hero.emptyCard.waiting,
        note:
          index === 0
            ? messages.hero.emptyCard.heroPortfolioUnsupportedNetwork
            : index === 1
              ? messages.hero.emptyCard.hiddenState
              : messages.hero.emptyCard.walletSessionRequired,
        ...tone,
      }));
    }

    if (selectedAssets.length === 0) {
      return tones.map((tone, index) => ({
        label: index === 0 ? messages.hero.cardLabels.assets : index === 1 ? messages.hero.cardLabels.status : messages.hero.cardLabels.source,
        value: !hasPortfolioAccess ? messages.hero.emptyCard.waiting : isAssetsLoading ? messages.hero.emptyCard.loading : messages.hero.emptyCard.noData,
        note: !hasPortfolioAccess
          ? index === 0
            ? messages.hero.emptyCard.connectWallet
            : index === 1
              ? messages.hero.emptyCard.hiddenState
              : messages.hero.emptyCard.walletSessionRequired
          : index === 0
            ? messages.hero.emptyCard.source
            : index === 1
              ? (assetsError || messages.hero.emptyCard.pendingSync)
              : messages.hero.emptyCard.configureWallet,
        ...tone,
      }));
    }

    return selectedAssets.map((asset, index) => ({
      label: formatChainLabel(asset.chain),
      value: asset.symbol || asset.name,
      note: `${formatCompactCurrency(Number(asset.value_usd || 0))} • ${formatBalance(asset.balance)} ${asset.symbol || ''}`.trim(),
      ...tones[index % tones.length],
    }));
  }, [
    activeWalletIsSui,
    activeWalletAddress,
    assetsError,
    basketQuery.data,
    basketQuery.isPending,
    hasPortfolioAccess,
    heroWebPortfolio,
    heroDisplaySui,
    isAssetsLoading,
    mappedBasketFund,
    messages.hero.cardLabels.assets,
    messages.hero.cardLabels.source,
    messages.hero.cardLabels.status,
    messages.hero.emptyCard.configureWallet,
    messages.hero.emptyCard.connectWallet,
    messages.hero.emptyCard.hiddenState,
    messages.hero.emptyCard.heroPortfolioUnsupportedNetwork,
    messages.hero.emptyCard.loading,
    messages.hero.emptyCard.noData,
    messages.hero.emptyCard.pendingSync,
    messages.hero.emptyCard.source,
    messages.hero.emptyCard.waiting,
    messages.hero.emptyCard.walletSessionRequired,
    messages.hero.suiAvailableUsdc,
    messages.hero.suiConnectWalletBalances,
    messages.hero.suiGasLabel,
    messages.hero.suiHeroAv8ShareLabel,
    messages.hero.suiHeroNavLabel,
    messages.hero.suiHeroNavNote,
    messages.hero.suiHeroNetworkCaption,
    messages.hero.suiHeroNetworkHeadline,
    publicFundSnapshot.totalNavUsd,
    publicFundSnapshot.totalShares,
    selectedAssets,
    suiBalancesLoading,
    suiNativeBalance,
    suiUsdcBalance,
  ]);

  const resolvedUserLabel = React.useMemo(() => {
    if (!resolvedUser) {
      return '';
    }

    const fullName = [resolvedUser.secondname, resolvedUser.name, resolvedUser.fathername]
      .filter(Boolean)
      .join(' ')
      .trim();

    return fullName || resolvedUser.email || resolvedUser.login || `${messages.hero.userPrefix} #${resolvedUser.id}`;
  }, [messages.hero.userPrefix, resolvedUser]);

  const handleRefresh = React.useCallback(async () => {
    await loadPortfolio(true);

    if (typeof window !== 'undefined' && activeWalletAddress) {
      window.dispatchEvent(new CustomEvent(ACTIVE_WALLET_REFRESH_EVENT, {
        detail: {
          address: activeWalletAddress,
        },
      }));
    }
  }, [activeWalletAddress, loadPortfolio]);

  const settingsByChain = React.useMemo(() => {
    return settingsTokens.reduce<Record<string, WalletPortfolioToken[]>>((accumulator, token) => {
      accumulator[token.chain] = accumulator[token.chain] || [];
      accumulator[token.chain].push(token);
      return accumulator;
    }, {});
  }, [settingsTokens]);

  return (
    <section className="relative overflow-hidden border-b border-white/[0.06] bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.09),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(139,92,246,0.07),transparent_38%),linear-gradient(180deg,rgba(6,9,16,0.92)_0%,rgba(7,11,20,0.88)_50%,rgba(5,7,14,0.95)_100%)] pt-10">
      <div className="absolute inset-0">
        <div className="absolute left-[10%] top-24 h-72 w-72 rounded-full bg-teal-400/[0.07] blur-3xl" />
        <div className="absolute right-[8%] top-16 h-80 w-80 rounded-full bg-violet-500/[0.06] blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-cyan-400/[0.05] blur-3xl" />
      </div>

      <div className="relative mx-auto grid max-w-7xl gap-8 px-6 pb-12 pt-4 lg:items-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
          className="space-y-6"
        >
          <div className="space-y-3">
            <h1 className="font-display max-w-4xl text-4xl font-medium leading-[1.05] tracking-tight text-white md:text-6xl md:leading-[1.02]">
              {project.name}
            </h1>

            <div
              className="h-px max-w-4xl bg-gradient-to-r from-transparent via-teal-300/25 to-transparent"
              aria-hidden
            />

            <p className="max-w-2xl text-base leading-[1.75] tracking-wide text-slate-400">{messages.hero.highlight}</p>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {assetCards.map((item, cardIndex) => (
              <motion.div
                key={`hero-card-${cardIndex}-${item.label}`}
                whileHover={{ y: -3 }}
                transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                className="ce-glass-slab ce-glass-slab--interactive rounded-[1.5rem] p-4"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div className={`rounded-2xl border p-2.5 ${item.ring}`}>{item.icon}</div>
                  <Activity className="h-4 w-4 text-slate-500" />
                </div>
                <div className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">{item.label}</div>
                <div
                  className={`mt-2 font-semibold ${item.tone} ${
                    item.label === messages.hero.suiHeroNetworkCaption ? 'text-3xl md:text-4xl lg:text-5xl leading-tight' : 'text-2xl'
                  }`}
                >
                  {item.value}
                </div>
                <div className="mt-2 text-sm text-slate-400">{item.note}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>

      </div>

      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-h-[85vh] overflow-hidden border-white/10 bg-slate-950 p-0 text-white sm:max-w-3xl">
          <DialogHeader className="border-b border-white/10 px-6 py-5">
            <DialogTitle>{messages.hero.settingsTitle}</DialogTitle>
            <DialogDescription className="text-slate-400">
              {messages.hero.settingsDescription}
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-y-auto px-6 py-5">
            {isSettingsLoading ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">
                {messages.hero.settingsLoading}
              </div>
            ) : null}

            {!isSettingsLoading && Object.keys(settingsByChain).length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">
                {messages.hero.settingsEmpty}
              </div>
            ) : null}

            {!isSettingsLoading
              ? Object.entries(settingsByChain).map(([chain, tokens]) => (
                  <div key={chain} className="mb-5 rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs uppercase tracking-[0.18em] text-slate-400">{formatChainLabel(chain)}</div>
                        <div className="mt-1 text-sm text-slate-300">{tokens.length} {messages.hero.tokens}</div>
                      </div>
                      <div className="text-xs text-slate-500">
                        {messages.hero.selected}: {tokens.filter((token) => token.is_selected).length}
                      </div>
                    </div>

                    <div className="space-y-3">
                      {tokens.map((token) => {
                        const tokenKey = getTokenKey(token);

                        return (
                          <div
                            key={tokenKey}
                            className="grid gap-3 rounded-2xl border border-white/8 bg-slate-900/70 p-4 md:grid-cols-[1.4fr_0.8fr_0.7fr]"
                          >
                            <label className="flex items-start gap-3">
                              <Checkbox
                                checked={token.is_selected}
                                onCheckedChange={(checked) => handleToggleToken(tokenKey, Boolean(checked))}
                                className="mt-1 border-white/20"
                              />
                              <div>
                                <div className="font-semibold text-white">{token.symbol || token.name}</div>
                                <div className="text-sm text-slate-400">{token.name}</div>
                                <div className="mt-1 text-xs text-slate-500">
                                  {formatBalance(token.balance)} {token.symbol || ''}
                                </div>
                              </div>
                            </label>

                            <div className="text-sm text-slate-300">
                              <div>{formatCurrency(Number(token.value_usd || 0))}</div>
                              <div className="mt-1 text-xs text-slate-500">
                                {messages.hero.price}: {token.price_usd ? formatCurrency(Number(token.price_usd)) : messages.hero.notAvailable}
                              </div>
                            </div>

                            <div>
                              <div className="mb-1 text-xs uppercase tracking-[0.16em] text-slate-500">{messages.hero.commission}</div>
                              <Input
                                type="number"
                                min="0"
                                max="3"
                                step="0.0001"
                                value={token.commission}
                                onChange={(event) => handleCommissionChange(tokenKey, event.target.value)}
                                className="border-white/10 bg-slate-950/80 text-white"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              : null}

            {settingsError ? (
              <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                {settingsError}
              </div>
            ) : null}

            {settingsNotice ? (
              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                {settingsNotice}
              </div>
            ) : null}
          </div>

          <DialogFooter className="border-t border-white/10 px-6 py-4 sm:justify-between">
            <button
              type="button"
              onClick={() => setIsSettingsOpen(false)}
              className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
            >
              {messages.hero.close}
            </button>
            <button
              type="button"
              onClick={() => void handleSaveSettings()}
              disabled={isSettingsLoading || isSavingSettings}
              className="rounded-xl bg-gradient-to-r from-sky-400 to-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSavingSettings ? messages.hero.saving : messages.hero.save}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
