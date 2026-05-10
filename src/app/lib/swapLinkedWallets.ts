import { isValidSuiAddress } from '@mysten/sui/utils';

import type { ResolvedUserWallet, ResolvedWalletUser } from './api';
import { getExternalSessionAddress, type ExternalWalletSession } from './externalWalletSession';
import { readZkLoginSession } from './zkloginSession';

export function normalizeSwapWalletAddress(address: string | null | undefined): string {
  const trimmed = String(address || '').trim();
  if (trimmed === '') {
    return '';
  }
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(trimmed)) {
    return trimmed;
  }
  return trimmed.toLowerCase();
}

/** 1 for zkLogin / Google-derived address in session, 0 for wallet-linked. */
export function inferWeb3authForLinkedAddress(
  address: string | null | undefined,
  externalSession: ExternalWalletSession | null,
): 0 | 1 {
  if (!address) {
    return 0;
  }
  const norm = normalizeSwapWalletAddress(address);
  const zk = readZkLoginSession();
  if (zk && normalizeSwapWalletAddress(zk.walletAddress) === norm) {
    return 1;
  }
  if (
    externalSession?.type === 'google'
    && externalSession.provider === 'zklogin'
    && normalizeSwapWalletAddress(getExternalSessionAddress(externalSession)) === norm
  ) {
    return 1;
  }
  return 0;
}

/**
 * Chooses extension vs zkLogin signing from `web3auth` on the active linked wallet.
 * When `web3auth` is unset, keeps legacy behavior: extension if it matches, else zk if it matches
 * (callers should prefer `useExtension` over `useZkLogin` when both are true).
 */
export function resolveSuiSigningRoute(options: {
  activeWalletIsSui: boolean;
  web3auth?: number;
  extensionAddressMatchesActive: boolean;
  zkSessionMatchesActive: boolean;
}): { useExtension: boolean; useZkLogin: boolean } {
  const { activeWalletIsSui, web3auth: w3a, extensionAddressMatchesActive, zkSessionMatchesActive } = options;
  if (!activeWalletIsSui) {
    return { useExtension: false, useZkLogin: false };
  }
  if (w3a === 1) {
    return { useExtension: false, useZkLogin: zkSessionMatchesActive };
  }
  if (w3a === 0) {
    return { useExtension: extensionAddressMatchesActive, useZkLogin: false };
  }
  return {
    useExtension: extensionAddressMatchesActive,
    useZkLogin: zkSessionMatchesActive,
  };
}

/** Same rules as Cockpit portfolio: classify linked wallet rows for Sui vs EVM. */
export function resolvedWalletIsSuiNetwork(wallet: ResolvedUserWallet): boolean {
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

export function walletsFromResolvedUser(user: ResolvedWalletUser | null | undefined): ResolvedUserWallet[] {
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
      web3auth: inferWeb3authForLinkedAddress(user.wallet_address, null),
    }];
  }

  return [];
}

export function mergeZkWalletIntoLinkedList(user: ResolvedWalletUser, zkAddress: string): ResolvedUserWallet[] {
  const base = walletsFromResolvedUser(user);
  const norm = normalizeSwapWalletAddress(zkAddress);
  if (norm === '') {
    return base;
  }
  if (base.some((w) => normalizeSwapWalletAddress(w.address) === norm)) {
    return base;
  }
  return [...base, { address: zkAddress.trim(), network: 'sui', connected_at: null, web3auth: 1 }];
}

export function mergeLinkedWalletsForUser(
  resolvedUser: ResolvedWalletUser | null,
  rawWallets: ResolvedUserWallet[],
): ResolvedUserWallet[] {
  if (!resolvedUser) {
    return rawWallets;
  }

  const base = rawWallets.length > 0 ? rawWallets : walletsFromResolvedUser(resolvedUser);
  const zk = String(resolvedUser.zklogin_wallet_address || '').trim();
  if (zk && isValidSuiAddress(zk)) {
    return mergeZkWalletIntoLinkedList({ ...resolvedUser, wallets: base }, zk);
  }

  return base.length > 0 ? base : walletsFromResolvedUser(resolvedUser);
}
