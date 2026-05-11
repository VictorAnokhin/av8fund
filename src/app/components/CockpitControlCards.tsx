import React from 'react';
import {
  useConnectWallet,
  useCurrentAccount,
  useCurrentWallet,
  useDisconnectWallet,
  useSignAndExecuteTransaction,
  useSignPersonalMessage,
  useSignTransaction,
  useSuiClient,
  useWallets,
} from '@mysten/dapp-kit';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import {
  generateNonce,
  generateRandomness,
  genAddressSeed,
  getExtendedEphemeralPublicKey,
  getZkLoginSignature,
  jwtToAddress,
  type ZkLoginSignatureInputs,
} from '@mysten/sui/zklogin';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { parseSerializedSignature } from '@mysten/sui/cryptography';
import { isValidSuiAddress, normalizeSuiAddress, fromBase64, toBase64 } from '@mysten/sui/utils';
import { verifyPersonalMessageSignature } from '@mysten/sui/verify';
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Check, Copy, LoaderCircle, LogOut, RefreshCcw, Wallet, X } from 'lucide-react';

import { SUI_GOOGLE_CLIENT_ID, SUI_NETWORK, WEB3AUTH_CLIENT_ID } from '../config';
import {
  completeGoogleZkLogin,
  createWalletLinkChallenge,
  createGoogleZkLoginProof,
  createGoogleZkLoginSalt,
  getAuthenticatedUser,
  logFrontendDiagnostic,
  getZkLoginConfig,
  getZkLoginConfigCached,
  sponsorShinamiGasTransaction,
  getWeb3SwapTokens,
  getWalletPortfolioTokens,
  getWalletProtocols,
  linkAuthenticatedWallet,
  logoutAuthenticatedUser,
  resolveUserByWallet,
  unlinkAuthenticatedWallet,
  type ResolvedWalletUser,
  type ResolvedUserWallet,
  type WalletPortfolioToken,
  type WalletType,
  type Web3SwapToken,
  type WalletProtocolsResponse,
  walletLinkTypeFromPortfolioNetwork,
} from '../lib/api';
import {
  EXTERNAL_WALLET_SESSION_EVENT,
  getExternalSessionAddress,
  persistExternalWalletSession,
  readExternalWalletSession,
  type ExternalWalletSession,
} from '../lib/externalWalletSession';
import {
  clearPendingZkLoginSetup,
  clearZkLoginSession,
  persistPendingZkLoginSetup,
  persistZkLoginSession,
  readPendingZkLoginSetup,
  readZkLoginSession,
  type PendingZkLoginSetup,
} from '../lib/zkloginSession';
import {
  clearIdentitySession,
  IDENTITY_SESSION_EVENT,
  persistIdentitySession,
  readIdentitySession,
  type IdentitySession,
} from '../lib/identitySession';
import { persistHeaderNetwork, walletMatchesHeaderNetwork } from '../lib/headerNetwork';
import {
  getGoogleIdentityInitializeKey,
  setGoogleIdentityInitializeKey,
} from '../lib/googleIdentity';
import {
  getPhantomSolanaProvider,
  getSolflareSolanaProvider,
  signSolanaLinkMessage,
  type InjectedSolanaProvider,
} from '../lib/solanaWallet';
import { useSuiFundDashboard } from '../hooks/useSuiFundDashboard';
import { SUI_FUND_CONFIG } from '../lib/suiFund';
import { cn } from '../utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { useI18n } from '../i18n';
import { getSwapPath } from '../lib/routes';
import { resolveSuiSigningRoute } from '../lib/swapLinkedWallets';
import { loadSuiOwnerCoinPortfolio } from '../lib/suiWalletPortfolio';
import { buildGaslessSuiTransferTransactionKind } from '../lib/suiGaslessTransfer';
import { normalizeZkLoginProofForSigning, normalizeZkLoginSessionProofForSigning } from '../lib/zkloginProof';

type SupportedNetwork = 'eth' | 'arbitrum' | 'base' | 'polygon' | 'bnb' | 'solana' | 'sui';

type CockpitControlCardsProps = {
  selectedNetwork: SupportedNetwork;
  selectedNetworkLabel: string;
};

const ACTIVE_WALLET_KEY = 'av8fund.active-wallet';
const ACTIVE_WALLET_EVENT = 'av8fund:active-wallet';
const ACTIVE_WALLET_REFRESH_EVENT = 'av8fund:active-wallet-refresh';

type Eip1193Provider = {
  isMetaMask?: boolean;
  isRabby?: boolean;
  providers?: Eip1193Provider[];
  request: (args: { method: string; params?: unknown[] | object }) => Promise<unknown>;
};

type GoogleCredentialResponse = {
  credential?: string;
};

type GoogleAccountsId = {
  initialize: (options: {
    client_id: string;
    nonce: string;
    callback: (response: GoogleCredentialResponse) => void;
    use_fedcm_for_prompt?: boolean;
    ux_mode?: 'popup' | 'redirect';
    cancel_on_tap_outside?: boolean;
  }) => void;
  prompt: (listener?: (notification: {
    isNotDisplayed?: () => boolean;
    isSkippedMoment?: () => boolean;
    isDismissedMoment?: () => boolean;
    getNotDisplayedReason?: () => string;
    getSkippedReason?: () => string;
    getDismissedReason?: () => string;
  }) => void) => void;
  renderButton: (parent: HTMLElement, options: {
    theme?: 'outline' | 'filled_blue' | 'filled_black';
    size?: 'large' | 'medium' | 'small';
    type?: 'standard' | 'icon';
    text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
    shape?: 'rectangular' | 'pill' | 'circle' | 'square';
    logo_alignment?: 'left' | 'center';
    width?: number;
  }) => void;
  cancel: () => void;
};

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: GoogleAccountsId;
      };
    };
  }
}

function getNetworkFamily(network: SupportedNetwork): 'sui' | 'evm' | 'solana' | 'unsupported' {
  if (network === 'sui') {
    return 'sui';
  }

  if (network === 'solana') {
    return 'solana';
  }

  if (['eth', 'arbitrum', 'base', 'polygon', 'bnb'].includes(network)) {
    return 'evm';
  }

  return 'unsupported';
}

function fallbackNetworkFromExternalSession(session: ExternalWalletSession | null): string {
  if (!session) {
    return 'evm';
  }
  if (session.type === 'evm') {
    return session.provider;
  }
  if (session.type === 'solana') {
    return 'solana';
  }
  return session.walletNetwork || 'sui';
}

async function readZkLoginMaxEpoch(primaryClient: { getLatestSuiSystemState: () => Promise<{ epoch: string | number | bigint }> }): Promise<number> {
  try {
    const systemState = await primaryClient.getLatestSuiSystemState();
    return Number(systemState.epoch) + 2;
  } catch (primaryError) {
    const net = SUI_NETWORK.trim().toLowerCase();
    if (net === 'mainnet' || net === 'testnet' || net === 'devnet' || net === 'localnet') {
      try {
        const fallback = new SuiClient({ url: getFullnodeUrl(net) });
        const systemState = await fallback.getLatestSuiSystemState();
        return Number(systemState.epoch) + 2;
      } catch {
        // fall through
      }
    }
    throw primaryError instanceof Error
      ? primaryError
      : new Error('Could not read Sui network epoch (RPC). Check connection or VITE_SUI_RPC_URL.');
  }
}

async function ensurePendingZkLoginSetup(
  suiClient: { getLatestSuiSystemState: () => Promise<{ epoch: string | number | bigint }> },
): Promise<PendingZkLoginSetup> {
  const maxEpoch = await readZkLoginMaxEpoch(suiClient);
  const existing = readPendingZkLoginSetup();
  if (existing) {
    const createdAtMs = Date.parse(existing.createdAt);
    const ageMs = Number.isFinite(createdAtMs) ? Date.now() - createdAtMs : Number.POSITIVE_INFINITY;
    const setupStillUsable = existing.maxEpoch > maxEpoch - 2 && ageMs >= 0 && ageMs < 15 * 60 * 1000;
    if (setupStillUsable) {
      return existing;
    }
    clearPendingZkLoginSetup();
  }

  const ephemeralKeypair = Ed25519Keypair.generate();
  const randomness = generateRandomness();
  const nonce = generateNonce(ephemeralKeypair.getPublicKey(), maxEpoch, randomness);
  const extendedEphemeralPublicKey = getExtendedEphemeralPublicKey(ephemeralKeypair.getPublicKey());

  const pending: PendingZkLoginSetup = {
    provider: 'google',
    maxEpoch,
    randomness,
    nonce,
    ephemeralPrivateKey: ephemeralKeypair.getSecretKey(),
    extendedEphemeralPublicKey,
    createdAt: new Date().toISOString(),
  };

  persistPendingZkLoginSetup(pending);
  return pending;
}

function redactTokenForDiagnostics(token: string): string {
  return token ? `${token.slice(0, 8)}...${token.slice(-8)}` : '';
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const [, payload] = token.split('.');
  if (!payload) {
    return null;
  }

  try {
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
    return JSON.parse(window.atob(padded)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function getJwtHeaderBase64(token: string): string | undefined {
  const [header] = token.split('.');
  return header || undefined;
}

function getJwtAudience(payload: Record<string, unknown>): string | null {
  const aud = payload.aud;
  if (typeof aud === 'string' && aud.trim()) {
    return aud;
  }

  if (Array.isArray(aud)) {
    const firstAudience = aud.find((value): value is string => typeof value === 'string' && value.trim().length > 0);
    return firstAudience ?? null;
  }

  return null;
}

function enrichZkLoginProofForSigning(
  proof: unknown,
  idToken: string,
  salt: string,
  payload: Record<string, unknown>,
): ZkLoginSignatureInputs {
  const proofObject = proof !== null && typeof proof === 'object' ? proof as Record<string, unknown> : {};
  const headerBase64 = typeof proofObject.headerBase64 === 'string'
    ? proofObject.headerBase64
    : typeof proofObject.header_base64 === 'string'
      ? proofObject.header_base64
      : getJwtHeaderBase64(idToken);
  const aud = getJwtAudience(payload);
  const sub = typeof payload.sub === 'string' ? payload.sub : null;
  const addressSeed = typeof proofObject.addressSeed === 'string'
    ? proofObject.addressSeed
    : typeof proofObject.address_seed === 'string'
      ? proofObject.address_seed
      : sub && aud
        ? genAddressSeed(salt, 'sub', sub, aud).toString()
        : undefined;

  return normalizeZkLoginProofForSigning({
    ...proofObject,
    headerBase64,
    addressSeed,
  });
}

function isZkLoginProofVerificationError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error || '');
  return /Groth16 proof verify failed|Invalid user signature|zkLogin/i.test(message)
    && /proof|signature|cryptographic/i.test(message);
}

function isSuiSenderGasError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error || '');
  return /No valid gas coins|No gas coins|insufficient gas|GasBalanceTooLow|gas budget|not enough gas|could not select gas|No coins/i.test(message);
}

function isDevZkLoginProver(proverUrl: string): boolean {
  return proverUrl.trim().toLowerCase().includes('prover-dev.mystenlabs.com');
}

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

async function resolveEvmProviderForSession(session: ExternalWalletSession | null): Promise<Eip1193Provider | null> {
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

function isValidEvmAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address.trim());
}

function parseDecimalToBigInt(value: string, decimals: number): bigint | null {
  const normalized = value.trim().replace(',', '.');
  if (!normalized) {
    return null;
  }

  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    return null;
  }

  const [whole, fraction = ''] = normalized.split('.');
  const paddedFraction = fraction.slice(0, decimals).padEnd(decimals, '0');
  const serialized = `${whole}${paddedFraction}`.replace(/^0+(?=\d)/, '');

  return BigInt(serialized || '0');
}

async function loadGoogleIdentityScript(): Promise<GoogleAccountsId> {
  if (typeof window === 'undefined') {
    throw new Error('Google Identity Services can only run in the browser.');
  }

  const existingApi = window.google?.accounts?.id;
  if (existingApi) {
    return existingApi;
  }

  await new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>('script[data-google-identity="true"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener('error', () => reject(new Error('Failed to load Google Identity Services.')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.dataset.googleIdentity = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Identity Services.'));
    document.head.appendChild(script);
  });

  const api = window.google?.accounts?.id;
  if (!api) {
    throw new Error('Google Identity Services did not initialize.');
  }

  return api;
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

/** True when both strings are the same Sui address (0x / case / formatting from API vs wallet). */
function suiAddressesEqual(left: string | null | undefined, right: string | null | undefined): boolean {
  const a = String(left || '').trim();
  const b = String(right || '').trim();
  if (!a || !b) {
    return false;
  }
  if (!isValidSuiAddress(a) || !isValidSuiAddress(b)) {
    return normalizeWalletAddress(a) === normalizeWalletAddress(b);
  }
  return normalizeSuiAddress(a) === normalizeSuiAddress(b);
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

function resolvedWalletIsSuiNetwork(wallet: ResolvedUserWallet): boolean {
  const network = String(wallet.network || '').trim().toLowerCase();
  if (network.includes('sui')) {
    return true;
  }
  if (network.includes('solana') || network === 'solana') {
    return false;
  }
  if (
    network === 'evm'
    || network === 'metamask'
    || network === 'rabby'
    || network.includes('eth')
    || network.includes('arbitrum')
    || network.includes('base')
    || network.includes('polygon')
    || network.includes('bnb')
    || network.includes('bsc')
  ) {
    return false;
  }

  const addr = String(wallet.address || '').trim();
  return isValidSuiAddress(addr);
}

function linkedWalletRowKey(wallet: ResolvedUserWallet): string {
  const a = normalizeWalletAddress(wallet.address);
  const n = String(wallet.network || '').trim().toLowerCase();
  return `${a}:${n}`;
}

function inferUnlinkWalletType(wallet: ResolvedUserWallet): WalletType {
  const net = String(wallet.network || '').trim().toLowerCase();
  if (net.includes('solana') || net === 'sol') {
    return 'solana';
  }
  if (resolvedWalletIsSuiNetwork(wallet)) {
    return 'sui';
  }
  const mapped = walletLinkTypeFromPortfolioNetwork(net);
  if (net !== '' && mapped !== 'eth') {
    return mapped;
  }
  if (net === 'evm' || net === 'ethereum' || net === 'mainnet') {
    return 'eth';
  }
  return 'eth';
}

function walletsFromResolvedUser(user: ResolvedWalletUser | null | undefined): ResolvedUserWallet[] {
  if (!user) {
    return [];
  }

  if (Array.isArray(user.wallets) && user.wallets.length > 0) {
    return user.wallets;
  }

  if (user.wallet_address) {
    return [{
      address: user.wallet_address,
      network: user.wallet_network,
      connected_at: user.wallet_connected_at,
    }];
  }

  return [];
}

function mergeZkWalletIntoLinkedList(user: ResolvedWalletUser, zkAddress: string): ResolvedUserWallet[] {
  const base = walletsFromResolvedUser(user);
  const norm = normalizeWalletAddress(zkAddress);
  if (norm === '') {
    return base;
  }
  if (base.some((w) => normalizeWalletAddress(w.address) === norm)) {
    return base;
  }
  return [...base, { address: zkAddress.trim(), network: 'sui', connected_at: null, web3auth: 1 }];
}

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

function sumProtocolUsd(payload: WalletProtocolsResponse): number {
  return Object.values(payload).reduce((total, protocol) => {
    const tokenTotal = (protocol.tokens || []).reduce((sum, item) => sum + Math.abs(Number(item.usd_value || 0)), 0);
    const poolTotal = (protocol.pools || []).reduce((sum, item) => sum + Math.abs(Number(item.usd_value || 0)), 0);
    const loanTotal = (protocol.loans || []).reduce((sum, item) => sum + Math.abs(Number(item.usd_value || 0)), 0);
    return total + tokenTotal + poolTotal - loanTotal;
  }, 0);
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: value >= 1000 ? 0 : 2,
  }).format(value);
}

function formatCurrencyFixedTwo(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatTokenBalanceFour(value: string): string {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return value;
  }

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  }).format(parsed);
}

function formatChainLabel(chain: string): string {
  return chain
    .split(/[_-\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
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
  return Number.isFinite(parsed) ? `0x${parsed.toString(16)}` : raw;
}

function getNetworkAliases(network: SupportedNetwork): string[] {
  const aliases: Record<SupportedNetwork, string[]> = {
    eth: ['eth', 'ethereum', 'mainnet', '0x1', '1'],
    arbitrum: ['arbitrum', 'arbitrum one', '0xa4b1', '42161'],
    base: ['base', '0x2105', '8453'],
    polygon: ['polygon', 'matic', '0x89', '137'],
    bnb: ['bnb', 'bsc', 'binance', '0x38', '56'],
    solana: ['solana'],
    sui: ['sui'],
  };
  return aliases[network] || [];
}

function includesNormalized(value: string | null | undefined, aliases: string[]): boolean {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized !== '' && aliases.includes(normalized);
}

function investInterpolate(template: string, symbol: string): string {
  return template.replace(/\{symbol\}/g, symbol);
}

export function CockpitControlCards({ selectedNetwork, selectedNetworkLabel }: CockpitControlCardsProps) {
  const { messages } = useI18n();
  const inv = messages.invest;
  const suiClient = useSuiClient();
  const wallets = useWallets();
  const currentAccount = useCurrentAccount();
  const { connectionStatus, currentWallet } = useCurrentWallet();
  const {
    isLoading,
    error,
    walletLabel,
    walletName,
    investAmount,
    depositToken,
    depositTokenOptions,
    formatDepositTokenBalance,
    redeemAmount,
    investBalanceLabel,
    redeemBalanceLabel,
    balancesLoading,
    setInvestAmount,
    setDepositTokenSymbol,
    setRedeemAmount,
    actionState,
    executeInvest,
    executeRedeem,
    refresh,
  } = useSuiFundDashboard();
  const networkFamily = getNetworkFamily(selectedNetwork);
  const isSuiNetworkActive = selectedNetwork === 'sui';
  const [isWalletModalOpen, setIsWalletModalOpen] = React.useState(false);
  const [isZkLoginAssistDialogOpen, setIsZkLoginAssistDialogOpen] = React.useState(false);
  const [activeWalletName, setActiveWalletName] = React.useState<string | null>(null);
  const [externalSession, setExternalSession] = React.useState<ExternalWalletSession | null>(() =>
    typeof window === 'undefined' ? null : readExternalWalletSession(),
  );
  const [identitySession, setIdentitySession] = React.useState<IdentitySession | null>(() =>
    typeof window === 'undefined' ? null : readIdentitySession(),
  );
  const [externalPending, setExternalPending] = React.useState<
    'google-sui' | 'google-evm' | 'metamask' | 'rabby' | 'phantom' | 'solflare' | null
  >(null);
  const [externalError, setExternalError] = React.useState<string | null>(null);
  const googleSuiButtonRef = React.useRef<HTMLDivElement | null>(null);
  const zkLoginAssistGoogleRef = React.useRef<HTMLDivElement | null>(null);
  const [isGoogleSuiButtonLoading, setIsGoogleSuiButtonLoading] = React.useState(false);
  const [googleSuiButtonVersion, setGoogleSuiButtonVersion] = React.useState(0);
  const [linkedWallets, setLinkedWallets] = React.useState<ResolvedUserWallet[]>([]);
  const [zkLoginConnectBusy, setZkLoginConnectBusy] = React.useState(false);
  const [selectedWalletAddress, setSelectedWalletAddress] = React.useState('');
  const [portfolioTotalLabel, setPortfolioTotalLabel] = React.useState('');
  const [isPortfolioTotalLoading, setIsPortfolioTotalLoading] = React.useState(false);
  const [portfolioTotalError, setPortfolioTotalError] = React.useState<string | null>(null);
  const [networkTokens, setNetworkTokens] = React.useState<Web3SwapToken[]>([]);
  const [walletNetworkTokens, setWalletNetworkTokens] = React.useState<WalletPortfolioToken[]>([]);
  const [isNetworkTokensLoading, setIsNetworkTokensLoading] = React.useState(false);
  const [networkTokensError, setNetworkTokensError] = React.useState<string | null>(null);
  const [tokenAmountsByKey, setTokenAmountsByKey] = React.useState<Record<string, { balance: string; valueUsd: number }>>({});
  const [tokenAmountsByAddress, setTokenAmountsByAddress] = React.useState<Record<string, { balance: string; valueUsd: number }>>({});
  const [isRefreshingWalletData, setIsRefreshingWalletData] = React.useState(false);
  const [isReceiveOpen, setIsReceiveOpen] = React.useState(false);
  const [isSendOpen, setIsSendOpen] = React.useState(false);
  const [sendTo, setSendTo] = React.useState('');
  const [sendAmount, setSendAmount] = React.useState('');
  const [sendError, setSendError] = React.useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = React.useState<string | null>(null);
  const [sendBusy, setSendBusy] = React.useState(false);
  const [investRouteNotice, setInvestRouteNotice] = React.useState<string | null>(null);
  const pendingSendAfterZkLoginRef = React.useRef(false);
  const handleSendAssetsRef = React.useRef<(() => Promise<void>) | null>(null);
  const [addressCopied, setAddressCopied] = React.useState(false);
  const [unlinkingAddress, setUnlinkingAddress] = React.useState<string | null>(null);
  const [suiLinkAfterConnectPending, setSuiLinkAfterConnectPending] = React.useState(false);
  /** Sui addresses already returned from Laravel `wallets` (excludes extension-only merge fallbacks). Null until profile is loaded. */
  const profileLinkedSuiNormsRef = React.useRef<Set<string> | null>(null);
  const suiWalletLinkChainRef = React.useRef(Promise.resolve());
  /** Bumped when `profileLinkedSuiNormsRef` is updated so auto-link effect can run. */
  const [suiProfileHydrationEpoch, setSuiProfileHydrationEpoch] = React.useState(0);
  const [suiLinkSaveBusy, setSuiLinkSaveBusy] = React.useState(false);
  const [suiWalletLinkError, setSuiWalletLinkError] = React.useState<string | null>(null);
  const { mutate: connectWallet, isPending: isWalletPending, error: walletError } = useConnectWallet({
    onSuccess: () => {
      setIsWalletModalOpen(false);
      setActiveWalletName(null);
      setExternalError(null);
      const session = readIdentitySession();
      // dapp-kit connects Sui only: bind to the Laravel Google user whenever a Sanctum session exists,
      // independent of cockpit network tab (EVM vs Sui).
      if (session?.token && session.user) {
        setSuiLinkAfterConnectPending(true);
      }
    },
    onError: () => {
      setActiveWalletName(null);
    },
  });
  const { mutateAsync: disconnectWallet, isPending: isDisconnectPending } = useDisconnectWallet();
  const { mutateAsync: signPersonalMessage } = useSignPersonalMessage();
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const { mutateAsync: signTransactionWallet } = useSignTransaction();
  const hasDirectWalletConnection = Boolean(currentAccount?.address) || Boolean(externalSession);
  const hasAnyWalletConnection = hasDirectWalletConnection || Boolean(identitySession);
  const isZkLoginGoogleSession = Boolean(
    externalSession?.type === 'google' && externalSession.provider === 'zklogin',
  );
  const isSolanaNetworkActive = selectedNetwork === 'solana';
  /** On Sui tab, show only Sui-linked rows (same idea as EVM/Solana: not the whole multi-chain profile list). */
  const filterLinkedWalletsForPortfolio = isSuiNetworkActive;
  /** Filter saved wallets to the header chain whenever that family is selected (not only when signed in with Google). */
  const filterLinkedWalletsForSolana = isSolanaNetworkActive;
  const filterLinkedWalletsForEvm = networkFamily === 'evm';
  const currentSuiAddress = normalizeWalletAddress(currentAccount?.address);
  const connectedWalletAddress = currentSuiAddress || normalizeWalletAddress(getExternalSessionAddress(externalSession));
  const displayedLinkedWalletsBase = React.useMemo(() => {
    if (filterLinkedWalletsForPortfolio) {
      return linkedWallets.filter(resolvedWalletIsSuiNetwork);
    }
    if (filterLinkedWalletsForSolana) {
      return linkedWallets.filter((wallet) => walletMatchesHeaderNetwork(wallet, 'solana'));
    }
    if (filterLinkedWalletsForEvm) {
      return linkedWallets.filter((wallet) => walletMatchesHeaderNetwork(wallet, selectedNetwork));
    }
    return linkedWallets;
  }, [filterLinkedWalletsForEvm, filterLinkedWalletsForPortfolio, filterLinkedWalletsForSolana, linkedWallets, selectedNetwork]);
  /** After connecting Sui in the header, show only that address in the cockpit switcher (not every wallet saved on the Google profile). */
  const restrictPortfolioSwitcherToHeaderWallet =
    filterLinkedWalletsForPortfolio
    && hasDirectWalletConnection
    && Boolean(connectedWalletAddress)
    && isValidSuiAddress(connectedWalletAddress);
  const restrictSolanaSwitcherToHeaderWallet =
    filterLinkedWalletsForSolana
    && hasDirectWalletConnection
    && externalSession?.type === 'solana'
    && Boolean(connectedWalletAddress);
  const restrictEvmSwitcherToHeaderWallet =
    filterLinkedWalletsForEvm
    && hasDirectWalletConnection
    && externalSession?.type === 'evm'
    && Boolean(connectedWalletAddress);
  const displayedLinkedWallets = React.useMemo(() => {
    let pool = displayedLinkedWalletsBase;
    if (restrictPortfolioSwitcherToHeaderWallet) {
      const norm = normalizeWalletAddress(connectedWalletAddress);
      pool = pool.filter((w) => normalizeWalletAddress(w.address) === norm);
    } else if (restrictSolanaSwitcherToHeaderWallet || restrictEvmSwitcherToHeaderWallet) {
      const norm = normalizeWalletAddress(connectedWalletAddress);
      pool = pool.filter((w) => normalizeWalletAddress(w.address) === norm);
    }
    return pool;
  }, [
    connectedWalletAddress,
    displayedLinkedWalletsBase,
    restrictEvmSwitcherToHeaderWallet,
    restrictPortfolioSwitcherToHeaderWallet,
    restrictSolanaSwitcherToHeaderWallet,
  ]);
  const walletPoolForActive =
    filterLinkedWalletsForPortfolio || filterLinkedWalletsForSolana || filterLinkedWalletsForEvm
      ? displayedLinkedWallets
      : linkedWallets;

  const connectedSuiNotInDatabase = React.useMemo(() => {
    if (!identitySession?.token || !isSuiNetworkActive) {
      return false;
    }

    const raw = currentAccount?.address?.trim();
    if (!raw || !isValidSuiAddress(raw)) {
      return false;
    }

    const norm = normalizeWalletAddress(raw);
    return !linkedWallets.some(
      (w) => resolvedWalletIsSuiNetwork(w) && normalizeWalletAddress(w.address) === norm,
    );
  }, [currentAccount?.address, identitySession?.token, isSuiNetworkActive, linkedWallets]);

  const linkSuiWalletToGoogleAccount = React.useCallback((address: string) => {
    const session = readIdentitySession();
    if (!session?.token) {
      return Promise.resolve();
    }

    const trimmed = String(address).trim();
    const normalized = normalizeWalletAddress(trimmed);
    const token = session.token;

    const run = async (): Promise<void> => {
      setExternalError(null);
      setSuiWalletLinkError(null);
      setSuiLinkSaveBusy(true);
      try {
        const challenge = await createWalletLinkChallenge(token, {
          address: trimmed,
          walletType: 'sui',
        });
        const messageBytes = new TextEncoder().encode(challenge.message);
        const signed = await signPersonalMessage({ message: messageBytes });

        let skipLocalVerify = false;
        try {
          const parsed = parseSerializedSignature(signed.signature);
          if (parsed.signatureScheme === 'ZkLogin' || parsed.signatureScheme === 'MultiSig' || parsed.signatureScheme === 'Passkey') {
            skipLocalVerify = true;
          }
        } catch {
          skipLocalVerify = true;
        }

        if (!skipLocalVerify) {
          try {
            await verifyPersonalMessageSignature(
              messageBytes,
              signed.signature,
              { address: normalizeSuiAddress(trimmed) },
            );
          } catch (preVerifyErr) {
            const msg = preVerifyErr instanceof Error ? preVerifyErr.message : 'Local signature check failed.';
            setSuiWalletLinkError(msg);
            setExternalError(msg);
            return;
          }
        }

        const user = await linkAuthenticatedWallet(token, {
          address: trimmed,
          signature: signed.signature,
          network: 'sui',
          walletType: 'sui',
        });

        persistIdentitySession({
          ...session,
          user,
        });
        setIdentitySession(readIdentitySession());

        const nextWallets = walletsFromResolvedUser(user);
        profileLinkedSuiNormsRef.current = new Set(
          nextWallets
            .filter(resolvedWalletIsSuiNetwork)
            .map((w) => normalizeWalletAddress(w.address))
            .filter((a) => a !== ''),
        );
        setSuiProfileHydrationEpoch((n) => n + 1);
        setLinkedWallets(nextWallets);
        setSelectedWalletAddress(normalized);
      } catch (linkErr) {
        const msg = linkErr instanceof Error ? linkErr.message : 'Failed to link Sui wallet.';
        setExternalError(msg);
        setSuiWalletLinkError(msg);
      } finally {
        setSuiLinkSaveBusy(false);
      }
    };

    suiWalletLinkChainRef.current = suiWalletLinkChainRef.current.then(run, run);
    return suiWalletLinkChainRef.current;
  }, [signPersonalMessage]);

  /** When the extension account changes, bind the new Sui address if it exists locally in the UI but not in Laravel `wallets`. */
  React.useEffect(() => {
    const profileSui = profileLinkedSuiNormsRef.current;
    if (profileSui === null) {
      return;
    }

    const session = readIdentitySession();
    const raw = currentAccount?.address?.trim();
    if (!session?.token || !raw || !isValidSuiAddress(raw)) {
      return;
    }

    const norm = normalizeWalletAddress(raw);
    if (norm === '' || profileSui.has(norm)) {
      return;
    }

    void linkSuiWalletToGoogleAccount(raw);
  }, [currentAccount?.address, identitySession?.token, linkSuiWalletToGoogleAccount, suiProfileHydrationEpoch]);

  React.useEffect(() => {
    if (!suiLinkAfterConnectPending || !currentAccount?.address) {
      return;
    }

    const session = readIdentitySession();
    if (!session?.token) {
      setSuiLinkAfterConnectPending(false);
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        await linkSuiWalletToGoogleAccount(String(currentAccount.address).trim());
      } finally {
        if (!cancelled) {
          setSuiLinkAfterConnectPending(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [suiLinkAfterConnectPending, currentAccount?.address, linkSuiWalletToGoogleAccount]);

  const activeWalletAddress = React.useMemo(() => {
    if (filterLinkedWalletsForPortfolio) {
      const headerConnectedNorm =
        hasDirectWalletConnection && connectedWalletAddress && isValidSuiAddress(connectedWalletAddress)
          ? normalizeWalletAddress(connectedWalletAddress)
          : '';
      const normalizedSelected = normalizeWalletAddress(selectedWalletAddress);
      const inList = Boolean(
        normalizedSelected
        && displayedLinkedWallets.some((wallet) => normalizeWalletAddress(wallet.address) === normalizedSelected),
      );
      if (inList) {
        return normalizedSelected;
      }
      if (headerConnectedNorm) {
        return headerConnectedNorm;
      }

      return normalizeWalletAddress(displayedLinkedWallets[0]?.address || '');
    }

    return normalizeWalletAddress(selectedWalletAddress || connectedWalletAddress);
  }, [
    connectedWalletAddress,
    displayedLinkedWallets,
    filterLinkedWalletsForPortfolio,
    hasDirectWalletConnection,
    selectedWalletAddress,
  ]);
  const activeWallet = React.useMemo(
    () => walletPoolForActive.find((wallet) => normalizeWalletAddress(wallet.address) === activeWalletAddress) || null,
    [activeWalletAddress, walletPoolForActive],
  );
  const activeWalletIsSui = React.useMemo(() => {
    if (walletIsSui(activeWallet, currentSuiAddress)) {
      return true;
    }
    return isValidSuiAddress(activeWalletAddress);
  }, [activeWallet, activeWalletAddress, currentSuiAddress]);
  const normActiveWalletAddress = normalizeWalletAddress(activeWalletAddress);
  const extensionAddressForSend = React.useMemo(() => {
    const fromAccount = currentAccount?.address?.trim();
    if (fromAccount) {
      return fromAccount;
    }
    if (connectionStatus === 'connected' && currentWallet?.accounts?.[0]) {
      return String(currentWallet.accounts[0].address || '').trim();
    }
    return '';
  }, [connectionStatus, currentAccount?.address, currentWallet]);
  const suiSendUsesExtension = activeWalletIsSui && Boolean(
    extensionAddressForSend && suiAddressesEqual(extensionAddressForSend, activeWalletAddress),
  );
  const zkLoginSessionForSend = readZkLoginSession();
  const suiSendZkSessionMatches = activeWalletIsSui && Boolean(
    zkLoginSessionForSend?.walletAddress
      && suiAddressesEqual(zkLoginSessionForSend.walletAddress, activeWalletAddress),
  );
  const displayWalletAddress = React.useMemo(() => {
    const fromLinked = walletPoolForActive.find((wallet) => normalizeWalletAddress(wallet.address) === activeWalletAddress);
    if (fromLinked?.address) {
      return String(fromLinked.address).trim();
    }

    if (currentAccount?.address && normalizeWalletAddress(currentAccount.address) === activeWalletAddress) {
      return String(currentAccount.address).trim();
    }

    if (externalSession?.type === 'evm' && normalizeWalletAddress(externalSession.address) === activeWalletAddress) {
      return String(externalSession.address).trim();
    }

    if (externalSession?.type === 'solana' && normalizeWalletAddress(externalSession.address) === activeWalletAddress) {
      return String(externalSession.address).trim();
    }

    if (externalSession?.type === 'google' && normalizeWalletAddress(getExternalSessionAddress(externalSession)) === activeWalletAddress) {
      return String(getExternalSessionAddress(externalSession)).trim();
    }

    return activeWalletAddress;
  }, [activeWalletAddress, currentAccount?.address, externalSession, walletPoolForActive]);
  const activeWalletForBroadcast = React.useMemo<ResolvedUserWallet | null>(() => {
    if (activeWallet) {
      return activeWallet;
    }

    if (!activeWalletAddress) {
      return null;
    }

    return {
      address: activeWalletAddress,
      network: currentSuiAddress && activeWalletAddress === currentSuiAddress
        ? 'sui'
        : externalSession?.type === 'google'
          ? externalSession.walletNetwork || 'sui'
          : externalSession?.type === 'evm'
            ? externalSession.provider
            : externalSession?.type === 'solana'
              ? 'solana'
              : null,
      connected_at: null,
      web3auth: isZkLoginGoogleSession && normalizeWalletAddress(getExternalSessionAddress(externalSession)) === activeWalletAddress
        ? 1
        : 0,
    };
  }, [activeWallet, activeWalletAddress, currentSuiAddress, externalSession?.provider, externalSession?.type, externalSession?.walletNetwork, isZkLoginGoogleSession]);
  const hasLinkedZkLoginWallet = React.useMemo(
    () => linkedWallets.some((wallet) => resolvedWalletIsSuiNetwork(wallet) && Number(wallet.web3auth || 0) === 1),
    [linkedWallets],
  );
  const suiSendSigningRoute = React.useMemo(
    () => resolveSuiSigningRoute({
      activeWalletIsSui,
      web3auth: activeWalletForBroadcast?.web3auth,
      extensionAddressMatchesActive: suiSendUsesExtension,
      zkSessionMatchesActive: suiSendZkSessionMatches,
    }),
    [
      activeWalletForBroadcast?.web3auth,
      activeWalletIsSui,
      suiSendUsesExtension,
      suiSendZkSessionMatches,
    ],
  );
  const networkAliases = React.useMemo(() => getNetworkAliases(selectedNetwork), [selectedNetwork]);
  const filteredNetworkTokens = React.useMemo(() => {
    if (!activeWalletAddress) {
      return [];
    }

    if (selectedNetwork === 'solana') {
      return [];
    }

    if (selectedNetwork === 'sui') {
      return networkTokens;
    }

    const byAddress = new Map<string, WalletPortfolioToken>();
    walletNetworkTokens.forEach((token) => {
      const address = String(token.token_address || '').trim().toLowerCase();
      if (address) {
        byAddress.set(address, token);
      }
    });

    return networkTokens
      .filter((token) => byAddress.has(String(token.address || '').trim().toLowerCase()))
      .map((token) => {
        return {
          ...token,
        };
      });
  }, [activeWalletAddress, networkTokens, selectedNetwork, walletNetworkTokens]);
  const ownerAccessLabel = hasDirectWalletConnection
    ? walletLabel
    : identitySession?.user?.email || identitySession?.user?.login || walletLabel;
  const ownerAccessSubLabel = hasDirectWalletConnection
    ? walletName
    : identitySession
      ? 'Google account'
      : walletName;
  const tokenLogoByAddress = React.useMemo(() => {
    return walletNetworkTokens.reduce<Record<string, string>>((acc, token) => {
      const address = String(token.token_address || '').trim().toLowerCase();
      const logo = String(token.logo || '').trim();
      if (address && logo) {
        acc[address] = logo;
      }
      return acc;
    }, {});
  }, [walletNetworkTokens]);

  React.useEffect(() => {
    setExternalSession(readExternalWalletSession());

    if (typeof window === 'undefined') {
      return;
    }

    function syncExternalSession() {
      setExternalSession(readExternalWalletSession());
    }

    window.addEventListener(EXTERNAL_WALLET_SESSION_EVENT, syncExternalSession as EventListener);
    window.addEventListener('storage', syncExternalSession);

    return () => {
      window.removeEventListener(EXTERNAL_WALLET_SESSION_EVENT, syncExternalSession as EventListener);
      window.removeEventListener('storage', syncExternalSession);
    };
  }, []);

  React.useEffect(() => {
    setIdentitySession(readIdentitySession());

    if (typeof window === 'undefined') {
      return;
    }

    function syncIdentitySession() {
      setIdentitySession(readIdentitySession());
    }

    window.addEventListener(IDENTITY_SESSION_EVENT, syncIdentitySession as EventListener);
    window.addEventListener('storage', syncIdentitySession);

    return () => {
      window.removeEventListener(IDENTITY_SESSION_EVENT, syncIdentitySession as EventListener);
      window.removeEventListener('storage', syncIdentitySession);
    };
  }, []);

  React.useEffect(() => {
    const storedIdentity = readIdentitySession();
    const hasIdentityToken = Boolean(identitySession?.token ?? storedIdentity?.token);

    if (!hasDirectWalletConnection && !hasIdentityToken) {
      profileLinkedSuiNormsRef.current = null;
      setLinkedWallets([]);
      setSelectedWalletAddress('');
      return;
    }

    let isActive = true;

    async function resolveWallets() {
      let suiProfileSource: ResolvedUserWallet[] | null = null;

      try {
        let nextWallets: ResolvedUserWallet[] = [];
        const identityForApi = readIdentitySession();

        if (hasDirectWalletConnection && connectedWalletAddress) {
          const payload = await resolveUserByWallet(connectedWalletAddress);
          const walletsFromResolve = payload.found ? walletsFromResolvedUser(payload.user) : [];

          if (identityForApi?.token) {
            const user = await getAuthenticatedUser(identityForApi.token);
            const fromProfile = walletsFromResolvedUser(user);
            suiProfileSource = fromProfile;
            persistIdentitySession({
              ...identityForApi,
              user,
            });
            setIdentitySession(readIdentitySession());
            /** Only Laravel `user.wallets` — never merge the extension address unless it was saved via `/wallet/link`. */
            nextWallets = fromProfile;
          } else {
            nextWallets = walletsFromResolve;
          }
        } else if (identityForApi?.token) {
          const user = await getAuthenticatedUser(identityForApi.token);
          nextWallets = walletsFromResolvedUser(user);
          suiProfileSource = nextWallets;
          persistIdentitySession({
            ...identityForApi,
            user,
          });
          setIdentitySession(readIdentitySession());
        }

        if (!isActive) {
          return;
        }

        if (suiProfileSource !== null) {
          profileLinkedSuiNormsRef.current = new Set(
            suiProfileSource
              .filter(resolvedWalletIsSuiNetwork)
              .map((w) => normalizeWalletAddress(w.address))
              .filter((a) => a !== ''),
          );
          setSuiProfileHydrationEpoch((n) => n + 1);
        } else {
          profileLinkedSuiNormsRef.current = null;
        }

        setLinkedWallets(nextWallets);
        setSelectedWalletAddress((current) => {
          const normalizedCurrent = normalizeWalletAddress(current);
          const hasCurrent = nextWallets.some((wallet) => normalizeWalletAddress(wallet.address) === normalizedCurrent);
          return hasCurrent ? normalizedCurrent : normalizeWalletAddress(nextWallets[0]?.address || '');
        });
      } catch {
        if (!isActive) {
          return;
        }

        profileLinkedSuiNormsRef.current = null;

        if (!hasDirectWalletConnection || !connectedWalletAddress) {
          setLinkedWallets([]);
          setSelectedWalletAddress('');
          return;
        }

        setLinkedWallets([]);
        setSelectedWalletAddress('');
      }
    }

    void resolveWallets();

    return () => {
      isActive = false;
    };
  }, [
    connectedWalletAddress,
    currentSuiAddress,
    externalSession?.provider,
    externalSession?.type,
    externalSession?.walletNetwork,
    hasDirectWalletConnection,
    identitySession?.createdAt,
    identitySession?.token,
  ]);

  React.useEffect(() => {
    if (!filterLinkedWalletsForPortfolio && !filterLinkedWalletsForSolana && !filterLinkedWalletsForEvm) {
      return;
    }

    const normalized = normalizeWalletAddress(selectedWalletAddress);
    const hasMatch = displayedLinkedWallets.some((wallet) => normalizeWalletAddress(wallet.address) === normalized);

    if (!hasMatch) {
      setSelectedWalletAddress(normalizeWalletAddress(displayedLinkedWallets[0]?.address || ''));
    }
  }, [displayedLinkedWallets, filterLinkedWalletsForEvm, filterLinkedWalletsForPortfolio, filterLinkedWalletsForSolana, selectedWalletAddress]);

  React.useEffect(() => {
    if (!hasAnyWalletConnection || !activeWalletForBroadcast) {
      persistActiveWallet(null, false);
      return;
    }

    persistActiveWallet(activeWalletForBroadcast, activeWalletIsSui);
  }, [activeWalletForBroadcast, activeWalletIsSui, hasAnyWalletConnection]);

  React.useEffect(() => {
    if (!hasAnyWalletConnection || !activeWalletAddress) {
      setPortfolioTotalLabel('');
      setPortfolioTotalError(null);
      setIsPortfolioTotalLoading(false);
      return;
    }

    if (activeWalletIsSui && isSuiNetworkActive && displayWalletAddress) {
      let isActive = true;
      setIsPortfolioTotalLoading(true);
      setPortfolioTotalError(null);
      void loadSuiOwnerCoinPortfolio(suiClient, displayWalletAddress)
        .then((snap) => {
          if (!isActive) {
            return;
          }
          const count = snap.walletTokens.length;
          setPortfolioTotalLabel(
            count === 0
              ? messages.hero.suiOnChainCoinsEmpty
              : `${count} ${messages.hero.suiOnChainCoinsSuffix}`,
          );
          setPortfolioTotalError(null);
        })
        .catch((loadError) => {
          if (!isActive) {
            return;
          }
          setPortfolioTotalLabel(messages.hero.suiCard.wallet);
          setPortfolioTotalError(loadError instanceof Error ? loadError.message : messages.hero.loadAssetsError);
        })
        .finally(() => {
          if (isActive) {
            setIsPortfolioTotalLoading(false);
          }
        });
      return () => {
        isActive = false;
      };
    }

    if (activeWalletIsSui) {
      setPortfolioTotalLabel(messages.hero.suiCard.wallet);
      setPortfolioTotalError(null);
      setIsPortfolioTotalLoading(false);
      return;
    }

    let isActive = true;
    setIsPortfolioTotalLoading(true);
    setPortfolioTotalError(null);

    async function loadPortfolioTotal() {
      try {
        const [portfolio, protocols] = await Promise.all([
          getWalletPortfolioTokens(activeWalletAddress, { refresh: false }),
          getWalletProtocols(activeWalletAddress, isSolanaNetworkActive ? { refresh: false, chainId: 'solana' } : { refresh: false }),
        ]);

        if (!isActive) {
          return;
        }

        const combinedTotal = Number(portfolio.total_usd_value || 0) + sumProtocolUsd(protocols);
        setPortfolioTotalLabel(formatCurrency(combinedTotal));
      } catch (loadError) {
        if (!isActive) {
          return;
        }
        setPortfolioTotalLabel(messages.hero.portfolioLabel);
        setPortfolioTotalError(loadError instanceof Error ? loadError.message : messages.hero.loadAssetsError);
      } finally {
        if (isActive) {
          setIsPortfolioTotalLoading(false);
        }
      }
    }

    void loadPortfolioTotal();

    return () => {
      isActive = false;
    };
  }, [activeWalletAddress, activeWalletIsSui, displayWalletAddress, hasAnyWalletConnection, isSolanaNetworkActive, isSuiNetworkActive, messages.hero.loadAssetsError, messages.hero.portfolioLabel, messages.hero.suiCard.wallet, messages.hero.suiOnChainCoinsEmpty, messages.hero.suiOnChainCoinsSuffix, suiClient]);

  React.useEffect(() => {
    if (!activeWalletAddress) {
      setNetworkTokens([]);
      setWalletNetworkTokens([]);
      setNetworkTokensError(null);
      setIsNetworkTokensLoading(false);
      setTokenAmountsByKey({});
      setTokenAmountsByAddress({});
      return;
    }

    if (isSuiNetworkActive) {
      if (!activeWalletIsSui || !displayWalletAddress) {
        setNetworkTokens([]);
        setWalletNetworkTokens([]);
        setNetworkTokensError(null);
        setIsNetworkTokensLoading(false);
        setTokenAmountsByKey({});
        setTokenAmountsByAddress({});
        return;
      }

      let isActive = true;
      setIsNetworkTokensLoading(true);
      setNetworkTokensError(null);

      void loadSuiOwnerCoinPortfolio(suiClient, displayWalletAddress)
        .then((snap) => {
          if (!isActive) {
            return;
          }
          setNetworkTokens(snap.catalogTokens);
          setWalletNetworkTokens(snap.walletTokens);
          const nextByKey: Record<string, { balance: string; valueUsd: number }> = {};
          const nextByAddress: Record<string, { balance: string; valueUsd: number }> = {};
          for (const token of snap.walletTokens) {
            const addr = String(token.token_address || '').trim().toLowerCase();
            if (!addr) {
              continue;
            }
            const entry = {
              balance: token.balance,
              valueUsd: Number(token.value_usd || 0),
            };
            nextByAddress[addr] = entry;
            nextByKey[`sui:${addr}`] = entry;
          }
          setTokenAmountsByKey(nextByKey);
          setTokenAmountsByAddress(nextByAddress);
        })
        .catch((loadError) => {
          if (!isActive) {
            return;
          }
          setNetworkTokens([]);
          setWalletNetworkTokens([]);
          setTokenAmountsByKey({});
          setTokenAmountsByAddress({});
          setNetworkTokensError(loadError instanceof Error ? loadError.message : 'Failed to load token list.');
        })
        .finally(() => {
          if (isActive) {
            setIsNetworkTokensLoading(false);
          }
        });

      return () => {
        isActive = false;
      };
    }

    let isActive = true;
    setIsNetworkTokensLoading(true);
    setNetworkTokensError(null);

    Promise.all([
      getWeb3SwapTokens(),
      getWalletPortfolioTokens(activeWalletAddress, { refresh: false }),
    ])
      .then(([items, portfolio]) => {
        if (!isActive) {
          return;
        }

        const filteredWalletTokens = (portfolio.result || []).filter((token) => {
          const normalizedChain = String(token.chain || '').trim().toLowerCase();
          const normalizedHex = normalizeHexChainId(token.chain);
          return includesNormalized(normalizedChain, networkAliases) || includesNormalized(normalizedHex, networkAliases);
        });

        setNetworkTokens(items.filter((token) => {
          const normalizedChain = String(token.chain_id || '').trim().toLowerCase();
          const normalizedHex = normalizeHexChainId(token.chain_id);
          return includesNormalized(normalizedChain, networkAliases) || includesNormalized(normalizedHex, networkAliases);
        }));
        setWalletNetworkTokens(filteredWalletTokens);
      })
      .catch((loadError) => {
        if (!isActive) {
          return;
        }
        setNetworkTokens([]);
        setWalletNetworkTokens([]);
        setNetworkTokensError(loadError instanceof Error ? loadError.message : 'Failed to load token list.');
      })
      .finally(() => {
        if (isActive) {
          setIsNetworkTokensLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [activeWalletAddress, activeWalletIsSui, displayWalletAddress, isSuiNetworkActive, networkAliases, suiClient]);

  React.useEffect(() => {
    if (!activeWalletAddress) {
      setTokenAmountsByKey({});
      setTokenAmountsByAddress({});
      return;
    }

    if (isSuiNetworkActive && activeWalletIsSui) {
      return;
    }

    if (isSuiNetworkActive || activeWalletIsSui) {
      setTokenAmountsByKey({});
      setTokenAmountsByAddress({});
      return;
    }

    let isActive = true;

    getWalletPortfolioTokens(activeWalletAddress, { refresh: false })
      .then((portfolio) => {
        if (!isActive) {
          return;
        }

        const nextMap = (portfolio.result || []).reduce<Record<string, { balance: string; valueUsd: number }>>((acc, token) => {
          const tokenAddress = String(token.token_address || '').toLowerCase();
          if (!tokenAddress) {
            return acc;
          }
          const chain = normalizeHexChainId(token.chain) || String(token.chain || '').toLowerCase();
          const key = `${chain}:${tokenAddress}`;
          acc[key] = {
            balance: token.balance,
            valueUsd: Number(token.value_usd || 0),
          };
          return acc;
        }, {});
        const nextByAddress = (portfolio.result || []).reduce<Record<string, { balance: string; valueUsd: number }>>((acc, token) => {
          const tokenAddress = String(token.token_address || '').toLowerCase();
          if (!tokenAddress) {
            return acc;
          }
          acc[tokenAddress] = {
            balance: token.balance,
            valueUsd: Number(token.value_usd || 0),
          };
          return acc;
        }, {});

        setTokenAmountsByKey(nextMap);
        setTokenAmountsByAddress(nextByAddress);
      })
      .catch(() => {
        if (isActive) {
          setTokenAmountsByKey({});
          setTokenAmountsByAddress({});
        }
      });

    return () => {
      isActive = false;
    };
  }, [activeWalletAddress, activeWalletIsSui, isSuiNetworkActive]);

  const finalizeGoogleZkLogin = React.useCallback(async (idToken: string) => {
    logFrontendDiagnostic('zklogin-finalize-start', {
      tokenHint: redactTokenForDiagnostics(idToken),
    }, 'zklogin');

    const pendingSetup = readPendingZkLoginSetup();
    if (!pendingSetup) {
      logFrontendDiagnostic('zklogin-finalize-missing-pending', {}, 'zklogin');
      throw new Error('zkLogin setup is missing. Start Google sign-in again.');
    }

    const payload = decodeJwtPayload(idToken);
    if (!payload || typeof payload.email !== 'string' || typeof payload.sub !== 'string') {
      logFrontendDiagnostic('zklogin-finalize-invalid-jwt', {}, 'zklogin');
      throw new Error('Google sign-in returned an invalid session payload.');
    }

    logFrontendDiagnostic('zklogin-finalize-config-start', {
      email: payload.email,
      subLen: payload.sub.length,
      maxEpoch: pendingSetup.maxEpoch,
    }, 'zklogin');
    const zkLoginConfig = await getZkLoginConfig();
    const suiNetwork = SUI_NETWORK.trim().toLowerCase();
    if (suiNetwork !== 'devnet' && zkLoginConfig.proverProvider !== 'shinami' && isDevZkLoginProver(zkLoginConfig.proverUrl)) {
      logFrontendDiagnostic('zklogin-finalize-dev-prover-blocked', {
        suiNetwork,
        proverProvider: zkLoginConfig.proverProvider,
        proverUrl: zkLoginConfig.proverUrl,
      }, 'zklogin');
      throw new Error(
        'zkLogin prover-dev cannot be used for the current Sui network. Use devnet, or configure a whitelisted/self-hosted prover for testnet/mainnet.',
      );
    }

    logFrontendDiagnostic('zklogin-finalize-salt-start', {}, 'zklogin');
    const saltResponse = await createGoogleZkLoginSalt(idToken);
    const walletAddress = jwtToAddress(idToken, saltResponse.salt, false);
    logFrontendDiagnostic('zklogin-finalize-proof-start', {
      walletAddress,
      proverProvider: zkLoginConfig.proverProvider,
    }, 'zklogin');
    const proof = await createGoogleZkLoginProof({
      jwt: idToken,
      extendedEphemeralPublicKey: pendingSetup.extendedEphemeralPublicKey,
      maxEpoch: pendingSetup.maxEpoch,
      jwtRandomness: pendingSetup.randomness,
      salt: saltResponse.salt,
      keyClaimName: 'sub',
    });
    const normalizedProof = enrichZkLoginProofForSigning(proof, idToken, saltResponse.salt, payload);
    logFrontendDiagnostic('zklogin-finalize-login-start', {
      walletAddress,
    }, 'zklogin');
    const loginResponse = await completeGoogleZkLogin(idToken, walletAddress);

    persistZkLoginSession({
      provider: 'google',
      network: SUI_NETWORK,
      proverUrl: zkLoginConfig.proverUrl,
      jwt: idToken,
      salt: saltResponse.salt,
      walletAddress,
      maxEpoch: pendingSetup.maxEpoch,
      randomness: pendingSetup.randomness,
      ephemeralPrivateKey: pendingSetup.ephemeralPrivateKey,
      extendedEphemeralPublicKey: pendingSetup.extendedEphemeralPublicKey,
      proof: normalizedProof,
      token: loginResponse.token,
      createdAt: pendingSetup.createdAt,
    });

    const session: ExternalWalletSession = {
      type: 'google',
      provider: 'zklogin',
      email: payload.email,
      name: typeof payload.name === 'string' ? payload.name : payload.email,
      picture: typeof payload.picture === 'string' ? payload.picture : undefined,
      sub: payload.sub,
      walletAddress,
      walletNetwork: 'sui',
      authToken: loginResponse.token,
    };

    persistExternalWalletSession(session);
    setExternalSession(session);
    logFrontendDiagnostic('zklogin-finalize-user-start', {
      walletAddress,
      hasLoginToken: Boolean(loginResponse.token),
    }, 'zklogin');
    const freshUser = await getAuthenticatedUser(loginResponse.token);
    const serverWallets = walletsFromResolvedUser(freshUser);
    const normalizedZkAddress = normalizeWalletAddress(walletAddress);
    const serverZkAddress = normalizeWalletAddress(freshUser.zklogin_wallet_address);
    const hasServerZkWalletInList = serverWallets.some(
      (wallet) =>
        resolvedWalletIsSuiNetwork(wallet)
        && normalizeWalletAddress(wallet.address) === normalizedZkAddress,
    );
    const hasServerZkWallet = hasServerZkWalletInList || serverZkAddress === normalizedZkAddress;

    if (!hasServerZkWallet) {
      logFrontendDiagnostic('zklogin-finalize-wallet-missing-server', {
        walletAddress,
        serverZkAddress,
        serverWalletCount: serverWallets.length,
      }, 'zklogin');
      throw new Error('zkLogin wallet was created, but the API did not return it in the saved profile. Refresh the profile and check server persistence.');
    }

    const visibleWallets = hasServerZkWalletInList
      ? serverWallets
      : mergeZkWalletIntoLinkedList(freshUser, walletAddress);

    if (identitySession?.token) {
      persistIdentitySession({
        ...identitySession,
        user: { ...freshUser, wallets: visibleWallets },
      });
      setIdentitySession(readIdentitySession());
    } else {
      persistIdentitySession({
        provider: 'google',
        token: loginResponse.token,
        user: { ...freshUser, wallets: visibleWallets },
        credential: idToken,
        createdAt: new Date().toISOString(),
      });
      setIdentitySession(readIdentitySession());
    }
    setLinkedWallets(visibleWallets);
    setSelectedWalletAddress(normalizedZkAddress);
    setExternalPending(null);
    setExternalError(null);
    setIsWalletModalOpen(false);
    setIsZkLoginAssistDialogOpen(false);
    clearPendingZkLoginSetup();
    logFrontendDiagnostic('zklogin-finalize-success', {
      walletAddress,
      serverWalletCount: serverWallets.length,
    }, 'zklogin');
  }, [identitySession]);

  const finalizeGoogleZkLoginRef = React.useRef(finalizeGoogleZkLogin);
  React.useEffect(() => {
    finalizeGoogleZkLoginRef.current = finalizeGoogleZkLogin;
  }, [finalizeGoogleZkLogin]);

  const handleConnectZkLoginClick = React.useCallback(async () => {
    if (!identitySession?.token || networkFamily !== 'sui') {
      return;
    }

    setZkLoginConnectBusy(true);
    setExternalError(null);

    try {
      const user = await getAuthenticatedUser(identitySession.token);
      const zkRaw = String(user.zklogin_wallet_address || '').trim();
      const zkBrowser = readZkLoginSession();
      const zkSessionMatchesProfile =
        Boolean(zkRaw && isValidSuiAddress(zkRaw) && zkBrowser)
        && normalizeWalletAddress(zkBrowser.walletAddress) === normalizeWalletAddress(zkRaw);

      if (zkSessionMatchesProfile) {
        const merged = mergeZkWalletIntoLinkedList(user, zkRaw);
        persistIdentitySession({
          ...identitySession,
          user: { ...user, wallets: merged },
        });
        setIdentitySession(readIdentitySession());
        setLinkedWallets(merged);
        setSelectedWalletAddress(normalizeWalletAddress(zkRaw));
        return;
      }

      persistIdentitySession({
        ...identitySession,
        user,
      });
      setIdentitySession(readIdentitySession());

      if (!SUI_GOOGLE_CLIENT_ID) {
        setExternalError('Google client ID is missing.');
        return;
      }

      setExternalPending('google-sui');
      setIsZkLoginAssistDialogOpen(true);
      setGoogleSuiButtonVersion((version) => version + 1);
    } catch (connectZkError) {
      clearPendingZkLoginSetup();
      setExternalPending(null);
      setIsZkLoginAssistDialogOpen(false);
      setExternalError(connectZkError instanceof Error ? connectZkError.message : 'ZK Login failed.');
    } finally {
      setZkLoginConnectBusy(false);
    }
  }, [identitySession, networkFamily]);

  const shouldMountGoogleZkLogin
    = networkFamily === 'sui' && (isZkLoginAssistDialogOpen || (isWalletModalOpen && !isZkLoginAssistDialogOpen));

  const googleZkButtonHostBlocked = isWalletPending
    || (externalPending !== null && externalPending !== 'google-sui');

  const renderGoogleSuiButtonInto = React.useCallback(async (container: HTMLElement) => {
    container.innerHTML = '';

    if (!SUI_GOOGLE_CLIENT_ID || typeof window === 'undefined') {
      logFrontendDiagnostic('zklogin-google-button-skip-missing-client', {}, 'zklogin');
      return;
    }

    logFrontendDiagnostic('zklogin-google-button-prepare-start', {
      containerWidth: container.clientWidth || 0,
    }, 'zklogin');
    const pending = await ensurePendingZkLoginSetup(suiClient);
    logFrontendDiagnostic('zklogin-google-button-pending-ready', {
      maxEpoch: pending.maxEpoch,
      nonceLen: pending.nonce.length,
      createdAt: pending.createdAt,
    }, 'zklogin');
    const googleIdentity = await loadGoogleIdentityScript();
    const initializeKey = `zklogin:${SUI_GOOGLE_CLIENT_ID}:${pending.nonce}`;
    if (getGoogleIdentityInitializeKey() !== initializeKey) {
      googleIdentity.cancel();
      logFrontendDiagnostic('zklogin-google-initialize', {
        initializeKeyLen: initializeKey.length,
      }, 'zklogin');
      googleIdentity.initialize({
        client_id: SUI_GOOGLE_CLIENT_ID,
        nonce: pending.nonce,
        ux_mode: 'popup',
        use_fedcm_for_prompt: false,
        cancel_on_tap_outside: false,
        callback: ({ credential }) => {
          logFrontendDiagnostic('zklogin-google-callback', {
            hasCredential: Boolean(credential),
            credentialHint: credential ? redactTokenForDiagnostics(credential) : '',
          }, 'zklogin');
          if (!credential) {
            clearPendingZkLoginSetup();
            clearZkLoginSession();
            setGoogleIdentityInitializeKey(null);
            setExternalPending(null);
            setExternalError('Google did not return an ID token.');
            setGoogleSuiButtonVersion((version) => version + 1);
            return;
          }

          setExternalPending('google-sui');
          setExternalError(null);
          void finalizeGoogleZkLoginRef.current(credential).catch((loginError) => {
            logFrontendDiagnostic('zklogin-finalize-error', {
              message: loginError instanceof Error ? loginError.message : String(loginError),
            }, 'zklogin');
            clearPendingZkLoginSetup();
            clearZkLoginSession();
            setGoogleIdentityInitializeKey(null);
            setExternalPending(null);
            setExternalError(loginError instanceof Error ? loginError.message : 'Google zkLogin failed.');
            setGoogleSuiButtonVersion((version) => version + 1);
          });
        },
      });
      setGoogleIdentityInitializeKey(initializeKey);
    }
    googleIdentity.renderButton(container, {
      theme: 'filled_black',
      size: 'large',
      type: 'standard',
      text: 'continue_with',
      shape: 'pill',
      logo_alignment: 'left',
      width: Math.min(400, Math.max(280, container.clientWidth || 320)),
    });
    logFrontendDiagnostic('zklogin-google-button-rendered', {
      width: Math.min(400, Math.max(280, container.clientWidth || 320)),
    }, 'zklogin');
  }, [suiClient]);

  React.useEffect(() => {
    if (!shouldMountGoogleZkLogin) {
      return;
    }

    let isCancelled = false;
    let mountedContainer: HTMLElement | null = null;

    const tryMount = (attempt: number) => {
      const el = isZkLoginAssistDialogOpen
        ? zkLoginAssistGoogleRef.current
        : isWalletModalOpen
          ? googleSuiButtonRef.current
          : null;

      if (!el) {
        const maxAttempts = isZkLoginAssistDialogOpen ? 48 : 12;
        const delayMs = isZkLoginAssistDialogOpen ? 42 : 24;
        if (attempt < maxAttempts && !isCancelled) {
          window.setTimeout(() => {
            tryMount(attempt + 1);
          }, delayMs);
        }
        return;
      }

      mountedContainer = el;
      setIsGoogleSuiButtonLoading(true);
      void (async () => {
        try {
          await renderGoogleSuiButtonInto(el);
          if (!isCancelled) {
            setExternalError(null);
          }
        } catch (googleError) {
          if (!isCancelled) {
            clearPendingZkLoginSetup();
            clearZkLoginSession();
            setExternalError(googleError instanceof Error ? googleError.message : 'Failed to prepare Google sign-in.');
          }
        } finally {
          if (!isCancelled) {
            setIsGoogleSuiButtonLoading(false);
          }
        }
      })();
    };

    tryMount(0);

    return () => {
      isCancelled = true;
      mountedContainer?.replaceChildren();
    };
  }, [
    googleSuiButtonVersion,
    isWalletModalOpen,
    isZkLoginAssistDialogOpen,
    networkFamily,
    renderGoogleSuiButtonInto,
    shouldMountGoogleZkLogin,
  ]);

  const handleGoogleEvmConnect = React.useCallback(async () => {
    if (!WEB3AUTH_CLIENT_ID) {
      setExternalError('Web3Auth client ID is missing.');
      return;
    }

    setExternalPending('google-evm');
    setExternalError(null);

    try {
      const { connectGoogleEvmSession } = await import('../lib/web3auth');
      const sessionData = await connectGoogleEvmSession();
      const session: ExternalWalletSession = {
        type: 'google',
        provider: 'web3auth',
        email: sessionData.email,
        name: sessionData.name,
        picture: sessionData.picture,
        sub: sessionData.sub,
        address: sessionData.address,
        walletNetwork: 'evm',
        chainId: sessionData.chainId ?? undefined,
      };

      persistExternalWalletSession(session);
      setExternalSession(session);
      setIsWalletModalOpen(false);
    } catch (connectError) {
      setExternalError(connectError instanceof Error ? connectError.message : 'Google EVM login failed.');
    } finally {
      setExternalPending(null);
    }
  }, []);

  function handleWalletConnect(wallet: (typeof wallets)[number]) {
    setActiveWalletName(wallet.name);
    setExternalError(null);
    connectWallet({ wallet });
  }

  const linkEvmWalletToGoogleAccount = React.useCallback(async (
    provider: Eip1193Provider,
    address: string,
  ): Promise<void> => {
    const session = readIdentitySession();
    if (!session?.token) {
      throw new Error('Sign in with Google to link this wallet.');
    }

    const chainWalletType = walletLinkTypeFromPortfolioNetwork(selectedNetwork);

    const challenge = await createWalletLinkChallenge(session.token, {
      address,
      walletType: chainWalletType,
    });
    const signature = await provider.request({
      method: 'personal_sign',
      params: [challenge.message, address],
    });

    if (typeof signature !== 'string' || signature.trim() === '') {
      throw new Error('Wallet did not return a signature.');
    }

    const user = await linkAuthenticatedWallet(session.token, {
      address,
      signature,
      network: selectedNetwork,
      walletType: chainWalletType,
    });

    persistIdentitySession({
      ...session,
      user,
    });
    setIdentitySession(readIdentitySession());

    const nextWallets = walletsFromResolvedUser(user);
    setLinkedWallets(nextWallets);
    setSelectedWalletAddress(normalizeWalletAddress(address));
  }, [selectedNetwork]);

  const linkSolanaWalletToGoogleAccount = React.useCallback(async (
    provider: InjectedSolanaProvider,
    address: string,
  ): Promise<void> => {
    const session = readIdentitySession();
    if (!session?.token) {
      throw new Error('Sign in with Google to link this wallet.');
    }

    const trimmed = String(address).trim();
    const challenge = await createWalletLinkChallenge(session.token, {
      address: trimmed,
      walletType: 'solana',
    });
    const signature = await signSolanaLinkMessage(provider, challenge.message);
    const user = await linkAuthenticatedWallet(session.token, {
      address: trimmed,
      signature,
      network: 'solana',
      walletType: 'solana',
    });

    persistIdentitySession({
      ...session,
      user,
    });
    setIdentitySession(readIdentitySession());

    const nextWallets = walletsFromResolvedUser(user);
    setLinkedWallets(nextWallets);
    setSelectedWalletAddress(normalizeWalletAddress(trimmed));
  }, []);

  const handleUnlinkLinkedWallet = React.useCallback(async (wallet: ResolvedUserWallet) => {
    if (!identitySession?.token) {
      return;
    }

    const rowKey = linkedWalletRowKey(wallet);
    setUnlinkingAddress(rowKey);
    setExternalError(null);

    try {
      const user = await unlinkAuthenticatedWallet(identitySession.token, {
        address: String(wallet.address).trim(),
        walletType: inferUnlinkWalletType(wallet),
      });

      persistIdentitySession({
        ...identitySession,
        user,
      });
      setIdentitySession(readIdentitySession());

      const nextWallets = walletsFromResolvedUser(user);
      setLinkedWallets(nextWallets);
      setSelectedWalletAddress((current) => {
        const normalizedCurrent = normalizeWalletAddress(current);
        const hasCurrent = nextWallets.some((row) => normalizeWalletAddress(row.address) === normalizedCurrent);
        return hasCurrent
          ? normalizedCurrent
          : normalizeWalletAddress(nextWallets[0]?.address || connectedWalletAddress || '');
      });
    } catch (unlinkErr) {
      setExternalError(unlinkErr instanceof Error ? unlinkErr.message : 'Failed to unlink wallet.');
    } finally {
      setUnlinkingAddress(null);
    }
  }, [connectedWalletAddress, identitySession]);

  async function handleEvmConnect(providerName: 'metamask' | 'rabby') {
    const provider = getEthereumProvider(providerName);
    if (!provider) {
      setExternalError(`${providerName === 'metamask' ? 'MetaMask' : 'Rabby Wallet'} was not detected in this browser.`);
      return;
    }

    setExternalPending(providerName);
    setExternalError(null);

    try {
      const accounts = await provider.request({ method: 'eth_requestAccounts' });
      const address = Array.isArray(accounts) && typeof accounts[0] === 'string' ? accounts[0] : '';

      if (!address) {
        throw new Error('Wallet did not return an account.');
      }

      const session: ExternalWalletSession = {
        type: 'evm',
        provider: providerName,
        address,
      };

      await linkEvmWalletToGoogleAccount(provider, address);
      persistExternalWalletSession(session);
      setExternalSession(session);
      setIsWalletModalOpen(false);
    } catch (connectError) {
      setExternalError(connectError instanceof Error ? connectError.message : 'Wallet connection failed.');
    } finally {
      setExternalPending(null);
    }
  }

  async function handleSolanaConnect(providerName: 'phantom' | 'solflare') {
    const provider = providerName === 'phantom' ? getPhantomSolanaProvider() : getSolflareSolanaProvider();
    if (!provider) {
      setExternalError(
        providerName === 'phantom'
          ? 'Phantom was not detected in this browser.'
          : 'Solflare was not detected in this browser.',
      );
      return;
    }

    setExternalPending(providerName);
    setExternalError(null);

    try {
      await provider.connect();
      const rawPk = provider.publicKey?.toBase58?.() ?? provider.publicKey?.toString?.() ?? '';
      const address = rawPk.trim();

      if (!address) {
        throw new Error('Wallet did not return a public key.');
      }

      const session: ExternalWalletSession = {
        type: 'solana',
        provider: providerName,
        address,
      };

      const idSession = readIdentitySession();
      if (idSession?.token) {
        await linkSolanaWalletToGoogleAccount(provider, address);
      }

      persistExternalWalletSession(session);
      setExternalSession(session);
      setIsWalletModalOpen(false);
    } catch (connectError) {
      setExternalError(connectError instanceof Error ? connectError.message : 'Solana wallet connection failed.');
    } finally {
      setExternalPending(null);
    }
  }

  async function handleWalletDisconnect() {
    const currentExternalSession = externalSession;
    const currentIdentitySession = identitySession;
    setExternalError(null);
    setExternalPending(null);
    setActiveWalletName(null);
    setIsZkLoginAssistDialogOpen(false);

    if (currentExternalSession?.type === 'google' && currentExternalSession.provider === 'web3auth') {
      try {
        const { disconnectGoogleEvmSession } = await import('../lib/web3auth');
        await disconnectGoogleEvmSession();
      } catch (disconnectError) {
        setExternalError(disconnectError instanceof Error ? disconnectError.message : 'Embedded wallet logout failed.');
        return;
      }
    }

    if (currentExternalSession?.type === 'solana') {
      try {
        const injected =
          currentExternalSession.provider === 'phantom'
            ? getPhantomSolanaProvider()
            : getSolflareSolanaProvider();
        await injected?.disconnect?.();
      } catch {
        // ignore disconnect errors
      }
    }

    clearPendingZkLoginSetup();
    clearZkLoginSession();
    persistExternalWalletSession(null);
    setExternalSession(null);
    persistActiveWallet(null, false);

    if (currentIdentitySession?.token) {
      try {
        await logoutAuthenticatedUser(currentIdentitySession.token);
      } catch {
        // Local logout should still clear the cockpit session if the API token is already expired.
      }

      clearIdentitySession();
      setIdentitySession(null);
    }

    if (currentAccount?.address) {
      try {
        await disconnectWallet();
      } catch (disconnectError) {
        setExternalError(disconnectError instanceof Error ? disconnectError.message : 'Wallet disconnect failed.');
        return;
      }
    }
  }

  const handleRefreshWalletData = React.useCallback(async () => {
    if (isRefreshingWalletData) {
      return;
    }

    setIsRefreshingWalletData(true);
    setPortfolioTotalError(null);
    setNetworkTokensError(null);

    try {
      if (isSuiNetworkActive) {
        await refresh();

        if (activeWalletIsSui && displayWalletAddress) {
          try {
            const snap = await loadSuiOwnerCoinPortfolio(suiClient, displayWalletAddress);
            setNetworkTokens(snap.catalogTokens);
            setWalletNetworkTokens(snap.walletTokens);
            const nextByKey: Record<string, { balance: string; valueUsd: number }> = {};
            const nextByAddress: Record<string, { balance: string; valueUsd: number }> = {};
            for (const token of snap.walletTokens) {
              const addr = String(token.token_address || '').trim().toLowerCase();
              if (!addr) {
                continue;
              }
              const entry = {
                balance: token.balance,
                valueUsd: Number(token.value_usd || 0),
              };
              nextByAddress[addr] = entry;
              nextByKey[`sui:${addr}`] = entry;
            }
            setTokenAmountsByKey(nextByKey);
            setTokenAmountsByAddress(nextByAddress);
            const count = snap.walletTokens.length;
            setPortfolioTotalLabel(
              count === 0
                ? messages.hero.suiOnChainCoinsEmpty
                : `${count} ${messages.hero.suiOnChainCoinsSuffix}`,
            );
            setPortfolioTotalError(null);
          } catch (suiRefreshError) {
            setPortfolioTotalError(suiRefreshError instanceof Error ? suiRefreshError.message : messages.hero.loadAssetsError);
            setNetworkTokensError(suiRefreshError instanceof Error ? suiRefreshError.message : 'Failed to load token list.');
          }
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent(ACTIVE_WALLET_REFRESH_EVENT, {
              detail: {
                address: displayWalletAddress,
              },
            }));
          }
        }
      }

      if (activeWalletAddress && !activeWalletIsSui) {
        const [portfolio, protocols, dbTokens] = await Promise.all([
          getWalletPortfolioTokens(activeWalletAddress, { refresh: true }),
          getWalletProtocols(activeWalletAddress, isSolanaNetworkActive ? { refresh: true, chainId: 'solana' } : { refresh: true }),
          getWeb3SwapTokens(),
        ]);

        const combinedTotal = Number(portfolio.total_usd_value || 0) + sumProtocolUsd(protocols);
        setPortfolioTotalLabel(formatCurrency(combinedTotal));

        const nextMap = (portfolio.result || []).reduce<Record<string, { balance: string; valueUsd: number }>>((acc, token) => {
          const tokenAddress = String(token.token_address || '').toLowerCase();
          if (!tokenAddress) {
            return acc;
          }
          const chain = normalizeHexChainId(token.chain) || String(token.chain || '').toLowerCase();
          const key = `${chain}:${tokenAddress}`;
          acc[key] = {
            balance: token.balance,
            valueUsd: Number(token.value_usd || 0),
          };
          return acc;
        }, {});
        const nextByAddress = (portfolio.result || []).reduce<Record<string, { balance: string; valueUsd: number }>>((acc, token) => {
          const tokenAddress = String(token.token_address || '').toLowerCase();
          if (!tokenAddress) {
            return acc;
          }
          acc[tokenAddress] = {
            balance: token.balance,
            valueUsd: Number(token.value_usd || 0),
          };
          return acc;
        }, {});
        setTokenAmountsByKey(nextMap);
        setTokenAmountsByAddress(nextByAddress);

        const filteredWalletTokens = (portfolio.result || []).filter((token) => {
          const normalizedChain = String(token.chain || '').trim().toLowerCase();
          const normalizedHex = normalizeHexChainId(token.chain);
          return includesNormalized(normalizedChain, networkAliases) || includesNormalized(normalizedHex, networkAliases);
        });

        setWalletNetworkTokens(filteredWalletTokens);
        setNetworkTokens(dbTokens.filter((token) => {
          const normalizedChain = String(token.chain_id || '').trim().toLowerCase();
          const normalizedHex = normalizeHexChainId(token.chain_id);
          return includesNormalized(normalizedChain, networkAliases) || includesNormalized(normalizedHex, networkAliases);
        }));

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent(ACTIVE_WALLET_REFRESH_EVENT, {
            detail: {
              address: activeWalletAddress,
            },
          }));
        }
      }
    } catch (refreshError) {
      const message = refreshError instanceof Error ? refreshError.message : 'Failed to refresh wallet data.';
      setPortfolioTotalError(message);
      setNetworkTokensError(message);
    } finally {
      setIsRefreshingWalletData(false);
    }
  }, [activeWalletAddress, activeWalletIsSui, displayWalletAddress, isRefreshingWalletData, isSuiNetworkActive, messages.hero.loadAssetsError, messages.hero.suiOnChainCoinsEmpty, messages.hero.suiOnChainCoinsSuffix, networkAliases, refresh, suiClient]);

  const copyDisplayAddress = React.useCallback(async () => {
    if (!displayWalletAddress || typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
      return;
    }

    try {
      await navigator.clipboard.writeText(displayWalletAddress);
      setAddressCopied(true);
    } catch {
      setAddressCopied(false);
    }
  }, [displayWalletAddress]);

  React.useEffect(() => {
    if (!addressCopied) {
      return;
    }

    const timer = window.setTimeout(() => setAddressCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [addressCopied]);

  const navigateToSwap = React.useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.location.assign(getSwapPath());
  }, []);

  const openSendDialog = React.useCallback(() => {
    setSendTo('');
    setSendAmount('');
    setSendError(null);
    setSendSuccess(null);
    setIsSendOpen(true);
  }, []);

  const handleInvestDeposit = React.useCallback(async () => {
    setInvestRouteNotice(null);

    if (!activeWalletAddress || !activeWalletIsSui) {
      persistHeaderNetwork('sui');
      setIsWalletModalOpen(true);
      setInvestRouteNotice('Подключите Sui кошелек или выберите Sui zkLogin-адрес, чтобы подписать депозит.');
      return;
    }

    if (!suiSendSigningRoute.useExtension && !suiSendSigningRoute.useZkLogin) {
      const w3a = activeWalletForBroadcast?.web3auth;
      if (w3a === 0) {
        persistHeaderNetwork('sui');
        setIsWalletModalOpen(true);
        setInvestRouteNotice('Баланс виден, но кошелек не подключен как подписант. Подключите этот Sui wallet для депозита.');
        return;
      }

      if (w3a === 1 || isZkLoginGoogleSession || Boolean(identitySession?.token)) {
        setIsZkLoginAssistDialogOpen(true);
        setGoogleSuiButtonVersion((version) => version + 1);
        setInvestRouteNotice('Баланс виден, но zkLogin-сессия для подписи не активна. Войдите через Google zkLogin.');
        return;
      }

      persistHeaderNetwork('sui');
      setIsWalletModalOpen(true);
      setInvestRouteNotice('Для депозита нужна подпись. Подключите Sui wallet или войдите через Google zkLogin.');
      return;
    }

    await executeInvest();
  }, [
    activeWalletAddress,
    activeWalletForBroadcast?.web3auth,
    activeWalletIsSui,
    executeInvest,
    identitySession?.token,
    isZkLoginGoogleSession,
    suiSendSigningRoute.useExtension,
    suiSendSigningRoute.useZkLogin,
  ]);

  const handleSendAssets = React.useCallback(async () => {
    setSendError(null);
    setSendSuccess(null);

    logFrontendDiagnostic('send-click-start', {
      selectedNetwork,
      activeWalletIsSui,
      hasActiveWalletAddress: Boolean(activeWalletAddress),
      activeWalletAddress,
      displayWalletAddress,
      hasIdentityToken: Boolean(identitySession?.token),
      isZkLoginGoogleSession,
      hasZkLoginSession: Boolean(zkLoginSessionForSend),
      hasZkLoginToken: Boolean(zkLoginSessionForSend?.token),
      routeExtension: suiSendSigningRoute.useExtension,
      routeZkLogin: suiSendSigningRoute.useZkLogin,
      connectionStatus,
      hasExtensionAddress: Boolean(extensionAddressForSend),
      activeWalletWeb3auth: activeWalletForBroadcast?.web3auth,
      sendAmountLen: sendAmount.trim().length,
      sendToLen: sendTo.trim().length,
    }, 'send');

    if (!activeWalletAddress) {
      logFrontendDiagnostic('send-early-no-active-wallet', {}, 'send');
      return;
    }

    if (activeWalletIsSui) {
      const mist = parseDecimalToBigInt(sendAmount, 9);
      if (!mist || mist <= 0n) {
        logFrontendDiagnostic('send-early-invalid-sui-amount', {
          sendAmount,
        }, 'send');
        setSendError(messages.hero.sendInvalidAmount);
        return;
      }

      if (!isValidSuiAddress(sendTo.trim())) {
        logFrontendDiagnostic('send-early-invalid-sui-recipient', {
          sendToLen: sendTo.trim().length,
        }, 'send');
        setSendError(messages.hero.sendInvalidRecipient);
        return;
      }

      if (!suiSendSigningRoute.useExtension && !suiSendSigningRoute.useZkLogin) {
        if (
          connectionStatus === 'connected'
          && extensionAddressForSend
          && activeWalletAddress
          && !suiAddressesEqual(extensionAddressForSend, activeWalletAddress)
        ) {
          logFrontendDiagnostic('send-early-sui-extension-mismatch', {
            extensionAddressForSend,
            activeWalletAddress,
          }, 'send');
          setSendError(messages.hero.sendSuiExtensionWalletMismatch);
          return;
        }
        const w3a = activeWalletForBroadcast?.web3auth;
        if (w3a === 0) {
          logFrontendDiagnostic('send-early-open-sui-wallet-modal', {
            web3auth: w3a,
          }, 'send');
          persistHeaderNetwork('sui');
          setIsWalletModalOpen(true);
          setSendBusy(false);
          setSendError(messages.hero.sendSuiWalletConnectOpened);
          return;
        }
        if (w3a === 1) {
          if (isZkLoginGoogleSession || Boolean(identitySession?.token)) {
            logFrontendDiagnostic('send-early-open-zklogin-dialog', {
              web3auth: w3a,
              isZkLoginGoogleSession,
              hasIdentityToken: Boolean(identitySession?.token),
            }, 'send');
            pendingSendAfterZkLoginRef.current = true;
            setSendError(messages.hero.sendZkLoginSignInFirst);
            setIsZkLoginAssistDialogOpen(true);
            setGoogleSuiButtonVersion((version) => version + 1);
          } else {
            logFrontendDiagnostic('send-early-zklogin-need-session', {
              web3auth: w3a,
            }, 'send');
            setSendError(messages.hero.sendZkLoginNeedSessionHint);
          }
          return;
        }
        if (isZkLoginGoogleSession || Boolean(identitySession?.token)) {
          logFrontendDiagnostic('send-early-open-zklogin-dialog-no-route', {
            isZkLoginGoogleSession,
            hasIdentityToken: Boolean(identitySession?.token),
          }, 'send');
          pendingSendAfterZkLoginRef.current = true;
          setSendError(messages.hero.sendZkLoginSignInFirst);
          setIsZkLoginAssistDialogOpen(true);
          setGoogleSuiButtonVersion((version) => version + 1);
        } else {
          logFrontendDiagnostic('send-early-open-wallet-modal-no-route', {}, 'send');
          persistHeaderNetwork('sui');
          setIsWalletModalOpen(true);
          setSendBusy(false);
          setSendError(messages.hero.sendSuiWalletConnectOpened);
        }
        return;
      }

      setSendBusy(true);
      pendingSendAfterZkLoginRef.current = false;
      try {
        let resolvedSender: string;
        if (suiSendSigningRoute.useZkLogin) {
          const zkForSender = zkLoginSessionForSend;
          if (!zkForSender) {
            throw new Error('zkLogin session is missing. Sign in with Google again.');
          }
          const senderFromSession = String(zkForSender.walletAddress || '').trim();
          const senderFallback = String(displayWalletAddress || activeWalletAddress || '').trim();
          const senderAddr = senderFromSession || senderFallback;
          if (!senderAddr) {
            throw new Error('zkLogin wallet address is missing. Sign in with Google again.');
          }
          resolvedSender = normalizeSuiAddress(senderAddr);
        } else if (suiSendSigningRoute.useExtension) {
          const extSender = extensionAddressForSend || currentAccount?.address?.trim();
          if (!extSender) {
            throw new Error('Connect a Sui wallet to send.');
          }
          resolvedSender = normalizeSuiAddress(extSender);
        } else {
          throw new Error('No signing method available for this wallet.');
        }

        logFrontendDiagnostic('sui-send-before-config', {
          routeExtension: suiSendSigningRoute.useExtension,
          routeZkLogin: suiSendSigningRoute.useZkLogin,
          hasIdentityToken: Boolean(identitySession?.token),
          hasZkLoginSession: Boolean(zkLoginSessionForSend),
          hasZkLoginToken: Boolean(zkLoginSessionForSend?.token),
          sender: resolvedSender,
        }, 'sui-send');

        const zkLoginRuntimeConfig = await getZkLoginConfigCached();
        const authToken = identitySession?.token ?? (suiSendSigningRoute.useZkLogin ? zkLoginSessionForSend?.token : undefined);
        const useGasSponsorFallback = Boolean(zkLoginRuntimeConfig.gasSponsorshipEnabled && authToken);

        logFrontendDiagnostic('sui-send-after-config', {
          gasSponsorshipEnabled: zkLoginRuntimeConfig.gasSponsorshipEnabled,
          gasSponsorshipProvider: zkLoginRuntimeConfig.gasSponsorshipProvider,
          hasAuthToken: Boolean(authToken),
          useSponsor: useGasSponsorFallback,
        }, 'sui-send');

        const executeSenderFundedSuiTransfer = async () => {
          logFrontendDiagnostic('sui-send-sender-gas-start', {
            sender: resolvedSender,
            routeExtension: suiSendSigningRoute.useExtension,
            routeZkLogin: suiSendSigningRoute.useZkLogin,
          }, 'sui-send');

          const tx = new Transaction();
          tx.setSender(resolvedSender);

          const [coin] = tx.splitCoins(tx.gas, [mist]);
          tx.transferObjects([coin], normalizeSuiAddress(sendTo.trim()));

          if (suiSendSigningRoute.useExtension) {
            const result = await signAndExecuteTransaction({ transaction: tx });
            if (!('digest' in result) || typeof result.digest !== 'string') {
              throw new Error('Connected wallet did not return a transaction digest.');
            }
            return;
          }

          if (suiSendSigningRoute.useZkLogin) {
            const zkSession = zkLoginSessionForSend;
            if (!zkSession) {
              throw new Error('zkLogin session is missing. Sign in with Google again.');
            }

            const signer = Ed25519Keypair.fromSecretKey(zkSession.ephemeralPrivateKey);
            const { bytes, signature: userSignature } = await tx.sign({
              client: suiClient,
              signer,
            });
            const zkSignature = getZkLoginSignature({
              inputs: normalizeZkLoginSessionProofForSigning(zkSession),
              maxEpoch: zkSession.maxEpoch,
              userSignature,
            });
            const executed = await suiClient.executeTransactionBlock({
              transactionBlock: bytes,
              signature: zkSignature,
              options: {
                showEffects: true,
              },
            });

            if (!executed.digest) {
              throw new Error('zkLogin transaction finished without a digest.');
            }
          }
        };

        const executeSponsoredSuiTransfer = async () => {
          if (!authToken) {
            throw new Error('Gas sponsorship requires an authenticated session.');
          }

          logFrontendDiagnostic('sui-send-build-kind-start', {
            sender: resolvedSender,
            recipient: sendTo.trim(),
          }, 'sui-send');
          const kindBytes = await buildGaslessSuiTransferTransactionKind({
            client: suiClient,
            sender: resolvedSender,
            recipient: sendTo.trim(),
            amountMist: mist,
          });
          logFrontendDiagnostic('sui-send-sponsor-start', {
            sender: resolvedSender,
            transactionKindBytes: kindBytes.length,
          }, 'sui-send');
          const sponsored = await sponsorShinamiGasTransaction({
            token: authToken,
            transactionKindBase64: toBase64(kindBytes),
            sender: resolvedSender,
          });
          logFrontendDiagnostic('sui-send-sponsor-ok', {
            sender: resolvedSender,
            txDigest: sponsored.txDigest,
          }, 'sui-send');
          const { txBytes, signature: sponsorSig } = sponsored;

          if (suiSendSigningRoute.useExtension) {
            const signed = await signTransactionWallet({ transaction: txBytes });
            const executed = await suiClient.executeTransactionBlock({
              transactionBlock: txBytes,
              signature: [signed.signature, sponsorSig],
              options: {
                showEffects: true,
              },
            });
            if (!executed.digest) {
              throw new Error('Connected wallet did not return a transaction digest.');
            }
          } else if (suiSendSigningRoute.useZkLogin) {
            const zkSession = zkLoginSessionForSend;
            if (!zkSession) {
              throw new Error('zkLogin session is missing. Sign in with Google again.');
            }

            const signer = Ed25519Keypair.fromSecretKey(zkSession.ephemeralPrivateKey);
            const { signature: userSig } = await signer.signTransaction(fromBase64(txBytes));
            const zkSignature = getZkLoginSignature({
              inputs: normalizeZkLoginSessionProofForSigning(zkSession),
              maxEpoch: zkSession.maxEpoch,
              userSignature: userSig,
            });
            const executed = await suiClient.executeTransactionBlock({
              transactionBlock: txBytes,
              signature: [zkSignature, sponsorSig],
              options: {
                showEffects: true,
              },
            });

            if (!executed.digest) {
              throw new Error('zkLogin transaction finished without a digest.');
            }
          }
        };

        try {
          await executeSenderFundedSuiTransfer();
          logFrontendDiagnostic('sui-send-sender-gas-ok', {
            sender: resolvedSender,
          }, 'sui-send');
        } catch (senderGasError) {
          logFrontendDiagnostic('sui-send-sender-gas-error', {
            message: senderGasError instanceof Error ? senderGasError.message : String(senderGasError),
            canFallbackToSponsor: useGasSponsorFallback,
            isGasError: isSuiSenderGasError(senderGasError),
          }, 'sui-send');

          if (!useGasSponsorFallback || !isSuiSenderGasError(senderGasError)) {
            throw senderGasError;
          }

          await executeSponsoredSuiTransfer();
        }

        setSendSuccess(messages.hero.sendSuccess);
        void handleRefreshWalletData();
      } catch (sendErr) {
        logFrontendDiagnostic('sui-send-error', {
          message: sendErr instanceof Error ? sendErr.message : String(sendErr),
          routeExtension: suiSendSigningRoute.useExtension,
          routeZkLogin: suiSendSigningRoute.useZkLogin,
          hasIdentityToken: Boolean(identitySession?.token),
          hasZkLoginSession: Boolean(zkLoginSessionForSend),
          hasZkLoginToken: Boolean(zkLoginSessionForSend?.token),
        }, 'sui-send');

        if (suiSendSigningRoute.useZkLogin && isZkLoginProofVerificationError(sendErr)) {
          clearZkLoginSession();
          clearPendingZkLoginSetup();
          pendingSendAfterZkLoginRef.current = true;
          setIsZkLoginAssistDialogOpen(true);
          setGoogleSuiButtonVersion((version) => version + 1);
          setSendError('zkLogin proof is invalid for the current Sui network. Sign in with Google again.');
        } else {
          setSendError(sendErr instanceof Error ? sendErr.message : 'Send failed.');
        }
      } finally {
        setSendBusy(false);
      }

      return;
    }

    if (!isValidEvmAddress(sendTo)) {
      setSendError(messages.hero.sendInvalidRecipient);
      return;
    }

    const wei = parseDecimalToBigInt(sendAmount, 18);
    if (!wei || wei <= 0n) {
      setSendError(messages.hero.sendInvalidAmount);
      return;
    }

    setSendBusy(true);
    try {
      let provider = await resolveEvmProviderForSession(externalSession);
      if (!provider) {
        provider = getEthereumProvider('metamask') ?? getEthereumProvider('rabby');
      }

      if (!provider) {
        setSendError(messages.hero.sendEvmWalletRequired);
        return;
      }

      await provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: displayWalletAddress,
          to: sendTo.trim(),
          value: `0x${wei.toString(16)}`,
        }],
      });
      setSendSuccess(messages.hero.sendSuccess);
      void handleRefreshWalletData();
    } catch (sendErr) {
      setSendError(sendErr instanceof Error ? sendErr.message : 'Send failed.');
    } finally {
      setSendBusy(false);
    }
  }, [
    activeWalletAddress,
    activeWalletIsSui,
    connectionStatus,
    currentAccount?.address,
    displayWalletAddress,
    extensionAddressForSend,
    externalSession,
    activeWalletForBroadcast?.web3auth,
    handleRefreshWalletData,
    identitySession?.token,
    isZkLoginGoogleSession,
    messages.hero.sendEvmWalletRequired,
    messages.hero.sendInvalidAmount,
    messages.hero.sendInvalidRecipient,
    messages.hero.sendSuccess,
    messages.hero.sendSuiExtensionWalletMismatch,
    messages.hero.sendSuiWalletConnectOpened,
    messages.hero.sendSuiWalletRequired,
    messages.hero.sendZkLoginNeedSessionHint,
    messages.hero.sendZkLoginSignInFirst,
    sendAmount,
    sendTo,
    signAndExecuteTransaction,
    signTransactionWallet,
    suiClient,
    suiSendSigningRoute.useExtension,
    suiSendSigningRoute.useZkLogin,
    zkLoginSessionForSend,
  ]);

  React.useEffect(() => {
    handleSendAssetsRef.current = handleSendAssets;
  }, [handleSendAssets]);

  React.useEffect(() => {
    if (!pendingSendAfterZkLoginRef.current || !isSendOpen || !activeWalletIsSui) {
      return;
    }

    const zkSession = readZkLoginSession();
    if (!zkSession?.walletAddress || !suiAddressesEqual(zkSession.walletAddress, activeWalletAddress)) {
      return;
    }

    pendingSendAfterZkLoginRef.current = false;
    setSendError(null);
    const retryTimer = window.setTimeout(() => {
      void handleSendAssetsRef.current?.();
    }, 0);

    return () => {
      window.clearTimeout(retryTimer);
    };
  }, [activeWalletAddress, activeWalletIsSui, externalSession, handleSendAssets, isSendOpen]);

  return (
    <>
      <div className="grid gap-4 sm:gap-8 xl:grid-cols-[0.7fr_0.7fr]">
        <div className="min-w-0 rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4 shadow-[0_30px_120px_rgba(2,6,23,0.45)] backdrop-blur-2xl sm:rounded-[2rem] sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-slate-400">{messages.hero.ownerAccess}</div>
            <div className="mt-2 text-3xl font-semibold text-white">{messages.hero.privateBankingEntry}</div>
            <div className="mt-2 text-sm text-slate-400">{ownerAccessLabel}</div>
            <div className="mt-1 text-xs text-slate-500">{ownerAccessSubLabel}</div>
          </div>
          <div
            className={cn(
              'rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]',
              hasAnyWalletConnection ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300',
            )}
          >
            {hasAnyWalletConnection ? 'session live' : 'awaiting auth'}
          </div>
        </div>

        <div className="grid gap-3">
          <div className="rounded-[1.25rem] border border-sky-400/20 bg-sky-400/10 p-4">
            <div className="text-xs uppercase tracking-[0.18em] text-sky-100/80">{messages.hero.totalValue}</div>
            <div className="mt-2 text-2xl font-semibold text-white">
              {!hasAnyWalletConnection
                ? messages.hero.connectWallet
                : !activeWalletAddress
                  ? 'Кошельки не привязаны'
                  : isPortfolioTotalLoading
                    ? messages.hero.emptyCard.loading
                    : portfolioTotalLabel || messages.hero.portfolioLabel}
            </div>
            {activeWalletAddress ? (
              <div className="mt-2 text-xs text-sky-100/75">
                {messages.hero.selectedWalletLabel}: {activeWalletAddress.slice(0, 8)}...{activeWalletAddress.slice(-6)}
              </div>
            ) : null}
            {portfolioTotalError ? (
              <div className="mt-2 text-xs text-amber-100">{portfolioTotalError}</div>
            ) : null}
          </div>
          {(filterLinkedWalletsForPortfolio || filterLinkedWalletsForSolana || filterLinkedWalletsForEvm) && linkedWallets.length > 0 ? (
            <div className="mt-2 text-[11px] text-sky-100/60">
              {filterLinkedWalletsForPortfolio
                ? messages.hero.suiGoogleWalletsFilteredHint
                : filterLinkedWalletsForSolana
                  ? messages.hero.solanaLinkedWalletsFilteredHint
                  : messages.hero.evmLinkedWalletsFilteredHint}
            </div>
          ) : null}
          {isSuiNetworkActive && identitySession?.token && connectedSuiNotInDatabase ? (
            <div className="mt-2 rounded-[1rem] border border-amber-400/30 bg-amber-500/[0.08] p-3 text-xs text-amber-100/90">
              <p className="leading-relaxed">{messages.hero.suiConnectNotInProfileHint}</p>
              <button
                type="button"
                disabled={suiLinkSaveBusy || !currentAccount?.address}
                onClick={() => {
                  const addr = currentAccount?.address?.trim();
                  if (addr) {
                    void linkSuiWalletToGoogleAccount(addr);
                  }
                }}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500/90 px-4 py-2.5 font-semibold text-slate-950 shadow-[0_0_16px_-4px_rgba(251,191,36,0.45)] transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {suiLinkSaveBusy ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : null}
                {messages.hero.linkCurrentSuiWallet}
              </button>
              {suiWalletLinkError ? (
                <div className="mt-2 rounded-lg border border-rose-500/35 bg-rose-500/10 px-2 py-2 text-[11px] leading-snug text-rose-100">
                  {suiWalletLinkError}
                </div>
              ) : null}
            </div>
          ) : null}
          {displayedLinkedWallets.length > 0 ? (
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-sky-100/65">{messages.hero.availableWallet}</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {displayedLinkedWallets.map((wallet) => {
                  const normalizedAddress = normalizeWalletAddress(wallet.address);
                  const isActive = normalizedAddress === activeWalletAddress;
                  const isSuiWallet = walletIsSui(wallet, currentSuiAddress);
                  const rowKey = linkedWalletRowKey(wallet);

                  return (
                    <div
                      key={rowKey}
                      className={`inline-flex max-w-full items-stretch overflow-hidden rounded-full border text-xs transition ${
                        isActive
                          ? 'border-sky-200 bg-sky-100/20 text-white'
                          : 'border-white/15 bg-[rgba(5,9,18,0.38)] text-teal-100/80'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedWalletAddress(normalizedAddress)}
                        className="min-w-0 flex-1 px-3 py-1.5 text-left transition hover:bg-white/[0.04]"
                      >
                        <span className="font-semibold uppercase tracking-[0.12em]">
                          {isSuiWallet ? 'SUI' : formatChainLabel(String(wallet.network || 'evm'))}
                        </span>
                        <span className="ml-2">
                          {normalizedAddress.slice(0, 8)}...{normalizedAddress.slice(-6)}
                        </span>
                      </button>
                      {identitySession?.token ? (
                        <button
                          type="button"
                          aria-label={messages.hero.removeLinkedWallet}
                          disabled={unlinkingAddress !== null}
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleUnlinkLinkedWallet(wallet);
                          }}
                          className="flex shrink-0 items-center justify-center border-l border-white/10 px-2 text-slate-400 transition hover:bg-rose-500/15 hover:text-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {unlinkingAddress === rowKey ? (
                            <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <X className="h-3.5 w-3.5" />
                          )}
                        </button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
          <div className="flex flex-wrap gap-3">
            {identitySession?.token ? (
              <button
                type="button"
                onClick={() => setIsWalletModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all hover:bg-emerald-400"
              >
                <Wallet className="h-4 w-4" />
                {messages.hero.connectWalletCta}
              </button>
            ) : null}
            {isSuiNetworkActive && identitySession?.token && !isZkLoginGoogleSession && !hasLinkedZkLoginWallet ? (
              <button
                type="button"
                onClick={() => void handleConnectZkLoginClick()}
                disabled={zkLoginConnectBusy || isWalletPending || externalPending !== null}
                className="inline-flex items-center gap-2 rounded-lg border border-teal-400/35 bg-teal-500/10 px-5 py-2.5 text-sm font-semibold text-teal-100 shadow-[0_0_20px_-4px_rgba(45,212,191,0.22)] transition-[border-color,background-color,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-teal-300/50 hover:bg-teal-500/18 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {zkLoginConnectBusy || externalPending === 'google-sui' ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Wallet className="h-4 w-4" />
                )}
                {messages.hero.connectZkLogin}
              </button>
            ) : null}
            {hasAnyWalletConnection ? (
              <button
                type="button"
                onClick={() => void handleRefreshWalletData()}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-slate-900/80 text-slate-200 transition-[border-color,color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-teal-400/30 hover:text-white"
              >
                <RefreshCcw className={cn('h-4 w-4', (isLoading || isRefreshingWalletData) && 'animate-spin')} />
              </button>
            ) : null}
            {hasAnyWalletConnection ? (
              <button
                type="button"
                onClick={() => void handleWalletDisconnect()}
                disabled={isDisconnectPending}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDisconnectPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                Logout
              </button>
            ) : null}
          </div>
          {activeWalletAddress && hasAnyWalletConnection ? (
            <div className="mt-1 grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setIsReceiveOpen(true)}
                className="inline-flex flex-col items-center justify-center gap-1 rounded-xl border border-white/10 bg-slate-900/80 px-2 py-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-teal-100/90 transition-[border-color,background-color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-teal-400/35 hover:bg-slate-900 sm:flex-row sm:gap-2 sm:text-xs"
              >
                <ArrowDownLeft className="h-4 w-4 shrink-0" />
                <span className="text-center leading-tight">{messages.hero.quickReceive}</span>
              </button>
              <button
                type="button"
                onClick={openSendDialog}
                className="inline-flex flex-col items-center justify-center gap-1 rounded-xl border border-white/10 bg-slate-900/80 px-2 py-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-teal-100/90 transition-[border-color,background-color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-teal-400/35 hover:bg-slate-900 sm:flex-row sm:gap-2 sm:text-xs"
              >
                <ArrowUpRight className="h-4 w-4 shrink-0" />
                <span className="text-center leading-tight">{messages.hero.quickSend}</span>
              </button>
              <button
                type="button"
                onClick={navigateToSwap}
                className="inline-flex flex-col items-center justify-center gap-1 rounded-xl border border-white/10 bg-slate-900/80 px-2 py-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-teal-100/90 transition-[border-color,background-color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-teal-400/35 hover:bg-slate-900 sm:flex-row sm:gap-2 sm:text-xs"
              >
                <ArrowLeftRight className="h-4 w-4 shrink-0" />
                <span className="text-center leading-tight">{messages.hero.quickSwap}</span>
              </button>
            </div>
          ) : null}
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">
            {messages.invest.rpcNoticePrefix}: {error}
          </div>
        ) : null}

      </div>

      <div className="min-w-0 rounded-[1.5rem] border border-white/10 bg-white/[0.045] p-4 backdrop-blur-2xl sm:rounded-[2rem] sm:p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="text-sm uppercase tracking-[0.18em] text-slate-400">Control Stack</div>
            <div className="mt-2 text-2xl font-semibold text-white">{messages.portfolio.cockpitInvestHeading}</div>
          </div>
          <div className="rounded-full bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.14em] text-slate-300">
            {SUI_FUND_CONFIG.network}
          </div>
        </div>

        {isSuiNetworkActive ? (
          <>
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="relative overflow-hidden rounded-[1.4rem] border border-sky-400/25 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.22),_transparent_55%),rgba(8,47,73,0.75)] p-4 shadow-[0_0_35px_rgba(56,189,248,0.12)]">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-200/80">
                    {investInterpolate(inv.depositAvailableTokenCard, depositToken.symbol)}
                  </div>
                  <div className="mt-2 text-xl font-semibold text-white">
                    {balancesLoading ? inv.depositLoading : investBalanceLabel}
                  </div>
                  <div className="mt-1 text-xs text-sky-100/70">{inv.depositWalletDetectionHint}</div>
                </div>
                <div className="relative overflow-hidden rounded-[1.4rem] border border-emerald-400/25 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.2),_transparent_55%),rgba(6,46,30,0.76)] p-4 shadow-[0_0_35px_rgba(16,185,129,0.12)]">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-200/80">{inv.depositAv8ShareCard}</div>
                  <div className="mt-2 text-xl font-semibold text-white">
                    {balancesLoading ? inv.depositLoading : redeemBalanceLabel}
                  </div>
                  <div className="mt-1 text-xs text-emerald-100/70">{inv.depositAv8WithdrawHint}</div>
                </div>
              </div>
              <div className="grid gap-3">
                <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {inv.depositAssetFromWalletLabel}
                  <select
                    value={depositToken.coinType}
                    onChange={(event) => setDepositTokenSymbol(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-white/[0.1] bg-[rgba(5,9,18,0.82)] px-4 py-3 text-base font-medium text-white outline-none shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] backdrop-blur-sm transition-[border-color,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] focus:border-teal-400/40"
                  >
                    {depositTokenOptions.map((token) => (
                      <option key={token.coinType} value={token.coinType}>
                        {token.symbol} - {formatDepositTokenBalance(token)} -{' '}
                        {token.whitelisted ? inv.depositTokenWhitelisted : inv.depositTokenNotWhitelisted}
                      </option>
                    ))}
                  </select>
                  <div className="mt-2 text-xs font-semibold normal-case tracking-normal text-slate-500">
                    {inv.depositAvailableInWalletPrefix} {formatDepositTokenBalance(depositToken)}
                  </div>
                </label>
                <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {inv.depositAmountFieldLabel}
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={investAmount}
                    onChange={(event) => setInvestAmount(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-white/[0.1] bg-[rgba(5,9,18,0.82)] px-4 py-3 text-base font-medium text-white outline-none shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] backdrop-blur-sm transition-[border-color,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] focus:border-teal-400/40"
                    placeholder={`1 ${depositToken.symbol}`}
                  />
                </label>
                <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {inv.redeemAv8ShareLabel}
                  <input
                    type="number"
                    min="0"
                    step="0.000001"
                    value={redeemAmount}
                    onChange={(event) => setRedeemAmount(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-white/[0.1] bg-[rgba(5,9,18,0.82)] px-4 py-3 text-base font-medium text-white outline-none shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] backdrop-blur-sm transition-[border-color,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] focus:border-teal-400/40"
                    placeholder="1.000000"
                  />
                </label>
              </div>
              <button
                type="button"
                onClick={() => void handleInvestDeposit()}
                disabled={actionState.busy || !depositToken.executable}
                className="flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-sky-400 to-cyan-300 px-4 py-3 font-semibold text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionState.busy ? messages.portfolio.cockpitSubmittingPtb : messages.portfolio.cockpitDeployCapital}
              </button>
              <button
                type="button"
                onClick={() => void executeRedeem()}
                className="flex w-full items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-semibold text-white transition hover:bg-white/10"
              >
                {messages.portfolio.cockpitRecallLiquidity}
              </button>
              {investRouteNotice ? (
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">
                  {investRouteNotice}
                </div>
              ) : null}
            </div>

            <div className="mt-5 rounded-2xl border border-white/[0.1] bg-[rgba(5,9,18,0.72)] p-4 text-sm leading-6 text-slate-400 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] backdrop-blur-sm">
              {inv.depositPtbRouteLabel}
              <div className="mt-2 font-medium text-slate-200">
                <code>deposit(registry, basket, position, Coin&lt;SUI&gt;) / withdraw(basket, Coin&lt;AV8&gt;)</code>
              </div>
              {!depositToken.executable ? (
                <div className="mt-3 text-amber-100">
                  {depositToken.whitelisted
                    ? investInterpolate(inv.depositRouteBlockedWhitelisted, depositToken.symbol)
                    : investInterpolate(inv.depositRouteBlockedNotWhitelisted, depositToken.symbol)}
                </div>
              ) : null}
            </div>

            {actionState.error ? (
              <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">
                {actionState.error}
              </div>
            ) : null}

            {actionState.lastDigest ? (
              <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-100">
                Executed transaction: {actionState.lastDigest}
              </div>
            ) : null}

            <div className="min-w-0 rounded-2xl border border-white/[0.1] bg-[rgba(5,9,18,0.72)] p-3 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] backdrop-blur-sm sm:mt-5 sm:p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Network tokens</div>
              <div className="mt-2 text-sm text-slate-300">{selectedNetworkLabel}</div>

              {isNetworkTokensLoading ? (
                <div className="mt-3 text-sm text-slate-400">Loading token list...</div>
              ) : null}

              {networkTokensError ? (
                <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                  {networkTokensError}
                </div>
              ) : null}

              {!activeWalletIsSui ? (
                <div className="mt-3 text-sm text-slate-400">{messages.hero.suiConnectWalletBalances}</div>
              ) : null}

              {activeWalletIsSui && !isNetworkTokensLoading && !networkTokensError && filteredNetworkTokens.length === 0 ? (
                <div className="mt-3 text-sm text-slate-400">{messages.hero.suiOnChainCoinsEmpty}</div>
              ) : null}

              {activeWalletIsSui && !isNetworkTokensLoading && !networkTokensError && filteredNetworkTokens.length > 0 ? (
                <div className="mt-2 space-y-1 sm:mt-3 sm:space-y-2">
                  {filteredNetworkTokens.slice(0, 24).map((token) => (
                    <div
                      key={`${token.chain_id}:${token.address}`}
                      className="group flex min-w-0 items-center justify-between gap-1.5 rounded-xl border border-white/6 bg-white/[0.03] px-1.5 py-1.5 transition hover:bg-white/[0.05] sm:gap-4 sm:rounded-[1.25rem] sm:p-3"
                    >
                      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                        {tokenLogoByAddress[String(token.address || '').toLowerCase()] ? (
                          <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-white/5 ring-1 ring-white/10 sm:h-10 sm:w-10">
                            <img
                              src={tokenLogoByAddress[String(token.address || '').toLowerCase()]}
                              alt={token.symbol}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/5 text-[10px] font-semibold text-slate-300 ring-1 ring-white/10 sm:h-10 sm:w-10 sm:text-xs">
                            {String(token.symbol || '?').charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-white sm:text-base">{token.name || token.symbol}</div>
                          <div className="truncate text-[11px] text-slate-400 sm:text-sm">
                            Token • {formatChainLabel(String(token.chain_id || selectedNetworkLabel))} • {token.symbol}
                          </div>
                        </div>
                      </div>
                      <div className="flex min-w-0 items-center gap-2 sm:gap-4">
                        {(() => {
                          const tokenKey = `${normalizeHexChainId(token.chain_id) || token.chain_id}:${String(token.address || '').toLowerCase()}`;
                          const amount = tokenAmountsByAddress[String(token.address || '').toLowerCase()] || tokenAmountsByKey[tokenKey];
                          return amount ? (
                            <span className="min-w-0 text-right font-mono text-xs text-slate-300 sm:text-base">
                              <span className="block truncate">
                                {formatCurrencyFixedTwo(amount.valueUsd)}
                              </span>
                              <span className="block truncate text-[10px] text-slate-500 sm:text-xs">
                                {formatTokenBalanceFour(amount.balance)} {token.symbol}
                              </span>
                            </span>
                          ) : (
                            <span className="min-w-0 text-right font-mono text-xs text-slate-300 sm:text-base">
                              <span className="block truncate">{formatCurrencyFixedTwo(0)}</span>
                              <span className="block truncate text-[10px] text-slate-500 sm:text-xs">{token.symbol}</span>
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </>
        ) : (
          <div className="space-y-3">
            <div className="rounded-2xl border border-sky-400/20 bg-sky-400/10 p-4 text-sm leading-6 text-sky-100/85">
              Full control stack is available when the active network is <span className="font-semibold">SUI</span>.
              For <span className="font-semibold">{selectedNetworkLabel}</span>, token list is loaded from Laravel API.
            </div>
            <div className="min-w-0 rounded-2xl border border-white/[0.1] bg-[rgba(5,9,18,0.72)] p-3 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] backdrop-blur-sm sm:p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Network tokens</div>
              <div className="mt-2 text-sm text-slate-300">{selectedNetworkLabel}</div>

              {isNetworkTokensLoading ? (
                <div className="mt-3 text-sm text-slate-400">Loading token list...</div>
              ) : null}

              {networkTokensError ? (
                <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                  {networkTokensError}
                </div>
              ) : null}

              {!isNetworkTokensLoading && !networkTokensError && filteredNetworkTokens.length === 0 ? (
                <div className="mt-3 text-sm text-slate-400">No tokens found for this network in API response.</div>
              ) : null}

              {!isNetworkTokensLoading && !networkTokensError && filteredNetworkTokens.length > 0 ? (
                <div className="mt-2 space-y-1 sm:mt-3 sm:space-y-2">
                  {filteredNetworkTokens.slice(0, 24).map((token) => (
                    <div
                      key={`${token.chain_id}:${token.address}`}
                      className="group flex min-w-0 items-center justify-between gap-1.5 rounded-xl border border-white/6 bg-white/[0.03] px-1.5 py-1.5 transition hover:bg-white/[0.05] sm:gap-4 sm:rounded-[1.25rem] sm:p-3"
                    >
                      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                        {tokenLogoByAddress[String(token.address || '').toLowerCase()] ? (
                          <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-white/5 ring-1 ring-white/10 sm:h-10 sm:w-10">
                            <img
                              src={tokenLogoByAddress[String(token.address || '').toLowerCase()]}
                              alt={token.symbol}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/5 text-[10px] font-semibold text-slate-300 ring-1 ring-white/10 sm:h-10 sm:w-10 sm:text-xs">
                            {String(token.symbol || '?').charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-white sm:text-base">{token.name || token.symbol}</div>
                          <div className="truncate text-[11px] text-slate-400 sm:text-sm">
                            Token • {formatChainLabel(String(token.chain_id || selectedNetworkLabel))} • {token.symbol}
                          </div>
                        </div>
                      </div>
                      <div className="flex min-w-0 items-center gap-2 sm:gap-4">
                        {(() => {
                          const tokenKey = `${normalizeHexChainId(token.chain_id) || token.chain_id}:${String(token.address || '').toLowerCase()}`;
                          const amount = tokenAmountsByAddress[String(token.address || '').toLowerCase()] || tokenAmountsByKey[tokenKey];
                          return amount ? (
                            <span className="min-w-0 text-right font-mono text-xs text-slate-300 sm:text-base">
                              <span className="block truncate">
                                {formatCurrencyFixedTwo(amount.valueUsd)}
                              </span>
                              <span className="block truncate text-[10px] text-slate-500 sm:text-xs">
                                {formatTokenBalanceFour(amount.balance)} {token.symbol}
                              </span>
                            </span>
                          ) : (
                            <span className="min-w-0 text-right font-mono text-xs text-slate-300 sm:text-base">
                              <span className="block truncate">{formatCurrencyFixedTwo(0)}</span>
                              <span className="block truncate text-[10px] text-slate-500 sm:text-xs">{token.symbol}</span>
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
      </div>

      <Dialog
        open={isReceiveOpen}
        onOpenChange={(open) => {
          setIsReceiveOpen(open);
          if (!open) {
            setAddressCopied(false);
          }
        }}
      >
        <DialogContent className="max-w-lg border-white/[0.1] bg-[rgba(5,9,18,0.97)] text-slate-100 shadow-[0_30px_120px_rgba(2,6,23,0.7)] backdrop-blur-xl">
          <DialogHeader className="text-left">
            <DialogTitle className="text-xl font-semibold text-white">{messages.hero.receiveTitle}</DialogTitle>
            <DialogDescription className="text-sm text-slate-400">{messages.hero.receiveHint}</DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-3">
            <div className="break-all rounded-xl border border-white/10 bg-slate-900/80 px-4 py-3 font-mono text-sm text-sky-100">
              {displayWalletAddress || activeWalletAddress}
            </div>
            <button
              type="button"
              onClick={() => void copyDisplayAddress()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-sky-400/30 bg-sky-400/10 py-2.5 text-sm font-semibold text-sky-100 transition hover:bg-sky-400/20"
            >
              {addressCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {addressCopied ? messages.hero.addressCopied : messages.hero.copyAddress}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isSendOpen}
        onOpenChange={(open) => {
          setIsSendOpen(open);
          if (!open) {
            setSendError(null);
            setSendSuccess(null);
            setSendBusy(false);
            pendingSendAfterZkLoginRef.current = false;
          }
        }}
      >
        <DialogContent className="max-w-lg border-white/[0.1] bg-[rgba(5,9,18,0.97)] text-slate-100 shadow-[0_30px_120px_rgba(2,6,23,0.7)] backdrop-blur-xl">
          <DialogHeader className="text-left">
            <DialogTitle className="text-xl font-semibold text-white">{messages.hero.sendTitle}</DialogTitle>
            <DialogDescription className="text-sm text-slate-400">
              {activeWalletIsSui
                ? suiSendSigningRoute.useExtension
                  ? messages.hero.sendSignHintExtension
                  : suiSendSigningRoute.useZkLogin
                    ? messages.hero.sendSignHintZkLogin
                    : activeWalletForBroadcast?.web3auth === 0
                      ? messages.hero.sendSuiWalletRequired
                      : messages.hero.sendZkLoginNeedSessionHint
                : messages.hero.sendNativeHint}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              {messages.hero.sendRecipientLabel}
              <input
                value={sendTo}
                onChange={(event) => setSendTo(event.target.value)}
                className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900/80 px-4 py-2.5 text-sm text-white outline-none focus:border-sky-400/40"
                autoComplete="off"
              />
            </label>
            <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              {messages.hero.sendAmountLabel}
              <input
                value={sendAmount}
                onChange={(event) => setSendAmount(event.target.value)}
                type="text"
                inputMode="decimal"
                className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900/80 px-4 py-2.5 text-sm text-white outline-none focus:border-sky-400/40"
                placeholder={activeWalletIsSui ? '0.1' : '0.01'}
              />
            </label>
            {sendError ? (
              <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">{sendError}</div>
            ) : null}
            {sendSuccess ? (
              <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">{sendSuccess}</div>
            ) : null}
            <button
              type="button"
              disabled={!sendSuccess && sendBusy}
              onClick={() => {
                if (sendSuccess) {
                  setIsSendOpen(false);
                  return;
                }
                void handleSendAssets();
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {sendBusy && !sendSuccess ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
              {sendSuccess ? messages.hero.close : messages.hero.sendSignButton}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isZkLoginAssistDialogOpen}
        onOpenChange={(open) => {
          setIsZkLoginAssistDialogOpen(open);
          if (!open) {
            pendingSendAfterZkLoginRef.current = false;
            setExternalPending(null);
            setGoogleSuiButtonVersion((version) => version + 1);
            clearPendingZkLoginSetup();
          }
        }}
      >
        <DialogContent
          className="max-w-md border-white/[0.1] bg-[rgba(5,9,18,0.97)] p-0 text-slate-100 shadow-[0_30px_120px_rgba(2,6,23,0.7)] backdrop-blur-xl"
          onPointerDownOutside={(event) => event.preventDefault()}
          onInteractOutside={(event) => event.preventDefault()}
          onEscapeKeyDown={(event) => event.preventDefault()}
        >
          <div className="rounded-lg bg-[linear-gradient(180deg,_#020617_0%,_#08111f_100%)] px-6 py-6">
            <DialogHeader className="p-0 text-left">
              <DialogTitle className="text-xl font-semibold text-white">{messages.hero.connectZkLogin}</DialogTitle>
              <DialogDescription className="mt-2 text-sm leading-6 text-slate-400">
                {messages.hero.zkLoginWriteHint}
              </DialogDescription>
            </DialogHeader>
            <div className="mt-6 w-full rounded-[1.25rem] border border-sky-300/20 bg-[linear-gradient(135deg,rgba(14,165,233,0.18),rgba(15,23,42,0.94)_42%,rgba(16,185,129,0.12))] p-[1px] shadow-[0_18px_50px_rgba(14,165,233,0.12)]">
              <div className="flex min-h-[64px] w-full items-center gap-3 rounded-[1.2rem] bg-slate-950/90 px-3 py-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-sky-100">
                  <Wallet className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-2 text-[11px] font-semibold uppercase text-sky-100/60">
                    Google zkLogin
                  </div>
                  <div className="flex min-h-[42px] w-full items-center gap-3">
              {SUI_GOOGLE_CLIENT_ID ? (
                <div
                  ref={zkLoginAssistGoogleRef}
                  className={cn(
                    'flex min-h-10 min-w-[240px] w-full flex-1 flex-col items-stretch justify-center',
                    googleZkButtonHostBlocked && 'pointer-events-none opacity-60',
                  )}
                />
              ) : (
                <div className="text-sm text-amber-200">Google client ID missing</div>
              )}
              {externalPending === 'google-sui' || isGoogleSuiButtonLoading ? (
                <LoaderCircle className="h-5 w-5 shrink-0 animate-spin text-sky-200" />
              ) : null}
                  </div>
                </div>
              </div>
            </div>
            {externalError ? (
              <div className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                {externalError}
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isWalletModalOpen}
        onOpenChange={(open) => {
          setIsWalletModalOpen(open);
          if (open && networkFamily === 'sui') {
            setGoogleSuiButtonVersion((version) => version + 1);
          }
        }}
      >
        <DialogContent className="max-w-2xl border-white/[0.1] bg-[rgba(5,9,18,0.97)] p-0 text-slate-100 shadow-[0_30px_120px_rgba(2,6,23,0.7)] backdrop-blur-xl">
          <div className="overflow-hidden rounded-lg bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.14),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(245,158,11,0.12),_transparent_30%),linear-gradient(180deg,_#020617_0%,_#08111f_100%)]">
            <DialogHeader className="border-b border-white/8 px-6 py-6 text-left">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-sky-200">
                <Wallet className="h-4 w-4" />
                Wallet Access
              </div>
              <DialogTitle className="mt-4 text-3xl font-semibold text-white">
                {selectedNetworkLabel} wallet options
              </DialogTitle>
              <DialogDescription className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
                {networkFamily === 'sui'
                  ? 'Choose a Sui wallet or Google zkLogin owner session for this route.'
                  : networkFamily === 'evm'
                    ? `Choose an EVM wallet for ${selectedNetworkLabel} execution.`
                    : networkFamily === 'solana'
                      ? `Connect Phantom or Solflare to use ${selectedNetworkLabel}. Sign the server message to link the address to your account when signed in with Google.`
                      : `${selectedNetworkLabel} wallet connection is not wired in this cockpit yet.`}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-6 px-6 py-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl">
                <div className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Wallet Methods
                </div>

                {networkFamily === 'unsupported' ? (
                  <div className="rounded-[1.25rem] border border-amber-500/20 bg-amber-500/10 px-4 py-4 text-sm text-amber-100">
                    Native {selectedNetworkLabel} wallet support is not available yet in this panel.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {networkFamily === 'evm' ? (
                      <>
                        {[
                          {
                            key: 'metamask' as const,
                            label: 'MetaMask',
                            description: `${selectedNetworkLabel} EVM wallet`,
                          },
                          {
                            key: 'rabby' as const,
                            label: 'Rabby Wallet',
                            description: `${selectedNetworkLabel} EVM wallet`,
                          },
                        ].map((walletOption) => {
                          const isActive = externalPending === walletOption.key;
                          const isDetected = Boolean(getEthereumProvider(walletOption.key));

                          return (
                            <button
                              key={walletOption.key}
                              type="button"
                              onClick={() => void handleEvmConnect(walletOption.key)}
                              disabled={isWalletPending || externalPending !== null}
                              className="flex w-full items-center justify-between rounded-[1.25rem] border border-white/8 bg-[rgba(5,9,18,0.72)] px-4 py-3 text-left shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] backdrop-blur-sm transition-[border-color,background-color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-teal-400/25 hover:bg-[rgba(6,12,22,0.85)] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10">
                                  <Wallet className="h-4 w-4 text-slate-300" />
                                </div>
                                <div>
                                  <div className="font-semibold text-white">{walletOption.label}</div>
                                  <div className="text-xs uppercase tracking-[0.14em] text-slate-500">
                                    {isDetected ? walletOption.description : 'Not detected'}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 text-slate-400">
                                {isActive ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ArrowUpRight className="h-4 w-4" />}
                              </div>
                            </button>
                          );
                        })}
                      </>
                    ) : null}

                    {networkFamily === 'solana' ? (
                      <>
                        {[
                          {
                            key: 'phantom' as const,
                            label: 'Phantom',
                            description: 'Solana browser wallet',
                          },
                          {
                            key: 'solflare' as const,
                            label: 'Solflare',
                            description: 'Solana browser wallet',
                          },
                        ].map((walletOption) => {
                          const isActive = externalPending === walletOption.key;
                          const isDetected = Boolean(
                            walletOption.key === 'phantom' ? getPhantomSolanaProvider() : getSolflareSolanaProvider(),
                          );

                          return (
                            <button
                              key={walletOption.key}
                              type="button"
                              onClick={() => void handleSolanaConnect(walletOption.key)}
                              disabled={isWalletPending || externalPending !== null}
                              className="flex w-full items-center justify-between rounded-[1.25rem] border border-white/8 bg-[rgba(5,9,18,0.72)] px-4 py-3 text-left shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] backdrop-blur-sm transition-[border-color,background-color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-violet-400/25 hover:bg-[rgba(6,12,22,0.85)] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10">
                                  <Wallet className="h-4 w-4 text-slate-300" />
                                </div>
                                <div>
                                  <div className="font-semibold text-white">{walletOption.label}</div>
                                  <div className="text-xs uppercase tracking-[0.14em] text-slate-500">
                                    {isDetected ? walletOption.description : 'Not detected'}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 text-slate-400">
                                {isActive ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ArrowUpRight className="h-4 w-4" />}
                              </div>
                            </button>
                          );
                        })}
                      </>
                    ) : null}

                    {networkFamily === 'sui' ? (
                      wallets.length > 0 ? wallets.map((wallet) => {
                        const isActive = activeWalletName === wallet.name && isWalletPending;

                        return (
                          <button
                            key={wallet.id ?? wallet.name}
                            type="button"
                            onClick={() => handleWalletConnect(wallet)}
                            disabled={isWalletPending}
                            className="flex w-full items-center justify-between rounded-[1.25rem] border border-white/8 bg-[rgba(5,9,18,0.72)] px-4 py-3 text-left shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] backdrop-blur-sm transition-[border-color,background-color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-teal-400/25 hover:bg-[rgba(6,12,22,0.85)] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <div className="flex items-center gap-3">
                              {wallet.icon ? (
                                <img src={wallet.icon} alt={wallet.name} className="h-10 w-10 rounded-xl object-cover ring-1 ring-white/10" />
                              ) : (
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10">
                                  <Wallet className="h-4 w-4 text-slate-300" />
                                </div>
                              )}
                              <div>
                                <div className="font-semibold text-white">{wallet.name}</div>
                                <div className="text-xs uppercase tracking-[0.14em] text-slate-500">Sui wallet</div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 text-slate-400">
                              {isActive ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ArrowUpRight className="h-4 w-4" />}
                            </div>
                          </button>
                        );
                      }) : (
                        <div className="rounded-[1.25rem] border border-amber-500/20 bg-amber-500/10 px-4 py-4 text-sm text-amber-100">
                          No Sui wallet was detected in this browser.
                        </div>
                      )
                    ) : null}
                  </div>
                )}

                {walletError ? (
                  <div className="mt-4 rounded-[1.25rem] border border-rose-500/20 bg-rose-500/10 px-4 py-4 text-sm text-rose-100">
                    {walletError.message}
                  </div>
                ) : null}

                {externalError ? (
                  <div className="mt-4 rounded-[1.25rem] border border-rose-500/20 bg-rose-500/10 px-4 py-4 text-sm text-rose-100">
                    {externalError}
                  </div>
                ) : null}
              </div>

              <div className="rounded-[1.75rem] border border-white/10 bg-[linear-gradient(135deg,rgba(8,15,29,0.96)_0%,rgba(10,26,45,0.88)_100%)] p-5 backdrop-blur-xl">
                <div className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Google Access
                </div>

                <div className="space-y-3">
                  {networkFamily === 'sui' ? (
                    <div className="rounded-[1.5rem] border border-sky-400/20 bg-[linear-gradient(135deg,rgba(14,165,233,0.16),rgba(15,23,42,0.72)_52%,rgba(16,185,129,0.12))] px-4 py-4 text-white shadow-[0_18px_45px_rgba(14,165,233,0.1)]">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <span>
                          <span className="block text-xs uppercase tracking-[0.16em] text-sky-100/70">{messages.hero.connectZkLogin}</span>
                          <span className="mt-2 block text-lg font-semibold">
                            {SUI_GOOGLE_CLIENT_ID ? messages.hero.zkLoginWriteHint : 'Google client ID missing'}
                          </span>
                        </span>
                        {externalPending === 'google-sui' || isGoogleSuiButtonLoading ? (
                          <LoaderCircle className="h-4 w-4 animate-spin text-sky-200" />
                        ) : null}
                      </div>
                      {SUI_GOOGLE_CLIENT_ID ? (
                        <div className="rounded-[1.25rem] border border-sky-300/20 bg-slate-950/75 p-3">
                          <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase text-sky-100/60">
                            <Wallet className="h-3.5 w-3.5" />
                            Google zkLogin
                          </div>
                          <div
                            ref={googleSuiButtonRef}
                            className={cn(
                              'min-h-10 min-w-[240px] w-full',
                              googleZkButtonHostBlocked && 'pointer-events-none opacity-60',
                            )}
                          />
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {networkFamily === 'evm' ? (
                    <button
                      type="button"
                      onClick={() => void handleGoogleEvmConnect()}
                      disabled={!WEB3AUTH_CLIENT_ID || isWalletPending || externalPending !== null}
                      className="flex w-full items-center justify-between rounded-[1.5rem] border border-emerald-400/20 bg-emerald-400/10 px-4 py-4 text-left text-white disabled:cursor-not-allowed disabled:opacity-90"
                    >
                      <span>
                        <span className="block text-xs uppercase tracking-[0.16em] text-emerald-100/70">Continue with Google</span>
                        <span className="mt-2 block text-lg font-semibold">
                          {WEB3AUTH_CLIENT_ID ? `${selectedNetworkLabel} embedded wallet access` : 'Web3Auth client ID missing'}
                        </span>
                      </span>
                      {externalPending === 'google-evm' ? (
                        <LoaderCircle className="h-4 w-4 animate-spin text-emerald-200" />
                      ) : (
                        <ArrowUpRight className="h-4 w-4 text-emerald-200" />
                      )}
                    </button>
                  ) : null}
                </div>

                <div className="mt-4 rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4 text-sm leading-6 text-slate-400">
                  {networkFamily === 'sui'
                    ? messages.hero.zkLoginWriteHint
                    : networkFamily === 'evm'
                      ? 'Google access uses Web3Auth for embedded EVM execution.'
                      : networkFamily === 'solana'
                        ? 'With Google sign-in, approving the signature attaches this Solana address to your Laravel profile (same as EVM / Sui link).'
                        : 'This network is visible in portfolio routing, but wallet access is not connected here yet.'}
                </div>

                {hasAnyWalletConnection ? (
                  <button
                    type="button"
                    onClick={() => void handleWalletDisconnect()}
                    disabled={isDisconnectPending}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-[1.25rem] border border-white/10 bg-white/[0.03] px-4 py-3 font-semibold text-white transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isDisconnectPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                    Logout
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
