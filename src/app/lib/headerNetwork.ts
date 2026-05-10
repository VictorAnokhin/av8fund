import type { ResolvedUserWallet } from './api';
import {
  safeLocalStorageGetItem,
  safeLocalStorageSetItem,
} from './safeLocalStorage';
import { resolvedWalletIsSuiNetwork } from './swapLinkedWallets';

export type HeaderNetwork = 'eth' | 'arbitrum' | 'base' | 'polygon' | 'bnb' | 'solana' | 'sui';

export const HEADER_NETWORK_IDS: HeaderNetwork[] = ['eth', 'arbitrum', 'base', 'polygon', 'bnb', 'solana', 'sui'];

export const SELECTED_HEADER_NETWORK_STORAGE_KEY = 'av8fund.portfolio.selected-network';

export const HEADER_NETWORK_CHANGE_EVENT = 'av8fund:header-network';

const EVM_HEADER_CHAIN_ALIASES: Record<Exclude<HeaderNetwork, 'sui' | 'solana'>, string[]> = {
  eth: ['eth', 'ethereum', 'mainnet', '0x1', '1'],
  arbitrum: ['arbitrum', 'arbitrum one', '0xa4b1', '42161'],
  base: ['base', '0x2105', '8453'],
  polygon: ['polygon', 'matic', '0x89', '137'],
  bnb: ['bnb', 'bsc', 'binance', '0x38', '56'],
};

function isLikelyEvmAddress(address: string): boolean {
  const a = address.trim().toLowerCase();
  return a.startsWith('0x') && a.length === 42;
}

export function readStoredHeaderNetwork(): HeaderNetwork {
  if (typeof window === 'undefined') {
    return 'sui';
  }

  const stored = safeLocalStorageGetItem(SELECTED_HEADER_NETWORK_STORAGE_KEY);
  if (stored && HEADER_NETWORK_IDS.includes(stored as HeaderNetwork)) {
    return stored as HeaderNetwork;
  }

  safeLocalStorageSetItem(SELECTED_HEADER_NETWORK_STORAGE_KEY, 'sui');
  return 'sui';
}

export function getHeaderNetworkFamily(network: HeaderNetwork): 'sui' | 'evm' | 'solana' | 'unsupported' {
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

/** Three-letter label for compact header controls (and legacy chips). */
export function headerNetworkAbbrev(network: HeaderNetwork): string {
  const map: Record<HeaderNetwork, string> = {
    eth: 'ETH',
    arbitrum: 'ARB',
    base: 'BAS',
    polygon: 'POL',
    bnb: 'BNB',
    solana: 'SOL',
    sui: 'SUI',
  };
  return map[network];
}

export function headerNetworkChipLabel(network: HeaderNetwork): string {
  return headerNetworkAbbrev(network);
}

export type HeaderNetworkLocaleLabels = {
  eth: string;
  arbitrum: string;
  base: string;
  polygon: string;
  bnb: string;
  solana: string;
  sui: string;
};

export function headerNetworkFullLabel(network: HeaderNetwork, labels: HeaderNetworkLocaleLabels): string {
  return labels[network];
}

export function persistHeaderNetwork(network: HeaderNetwork): void {
  if (typeof window === 'undefined') {
    return;
  }

  safeLocalStorageSetItem(SELECTED_HEADER_NETWORK_STORAGE_KEY, network);
  window.dispatchEvent(new CustomEvent(HEADER_NETWORK_CHANGE_EVENT, { detail: { network } }));
}

/**
 * Linked wallet rows compatible with the header chain selector (Google loads all wallets; UI filters by this).
 */
export function walletMatchesHeaderNetwork(wallet: ResolvedUserWallet, network: HeaderNetwork): boolean {
  if (network === 'sui') {
    return resolvedWalletIsSuiNetwork(wallet);
  }

  if (network === 'solana') {
    const net = String(wallet.network || '').trim().toLowerCase();
    return net.includes('solana') || net === 'sol';
  }

  if (!isLikelyEvmAddress(String(wallet.address || ''))) {
    return false;
  }

  if (resolvedWalletIsSuiNetwork(wallet)) {
    return false;
  }

  const net = String(wallet.network || '').trim().toLowerCase();
  const aliases = EVM_HEADER_CHAIN_ALIASES[network as Exclude<HeaderNetwork, 'sui' | 'solana'>];
  if (!aliases) {
    return false;
  }

  const matchesChainHint = aliases.some((fragment) => net === fragment || net.includes(fragment));
  const genericMainnetOnly =
    net === '' || net === 'evm' || net === 'metamask' || net === 'rabby' || net === 'web3auth';

  if (network === 'eth') {
    return matchesChainHint || genericMainnetOnly;
  }

  return matchesChainHint;
}
