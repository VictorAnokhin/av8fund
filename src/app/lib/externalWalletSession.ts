import {
  safeLocalStorageGetItem,
  safeLocalStorageRemoveItem,
  safeLocalStorageSetItem,
} from './safeLocalStorage';

export const EXTERNAL_WALLET_SESSION_KEY = 'av8fund.external-wallet-session';
export const EXTERNAL_WALLET_SESSION_EVENT = 'av8fund:external-wallet-session';

export type ExternalWalletSession =
  | {
      type: 'google';
      provider: 'zklogin' | 'web3auth';
      email: string;
      name: string;
      picture?: string;
      sub: string;
      walletAddress?: string;
      address?: string;
      walletNetwork?: 'sui' | 'evm';
      chainId?: string;
      authToken?: string;
      expiresAt?: string;
    }
  | {
      type: 'evm';
      provider: 'metamask' | 'rabby' | 'web3auth';
      address: string;
      chainId?: string;
    }
  | {
      type: 'solana';
      provider: 'phantom' | 'solflare';
      address: string;
    };

export function readExternalWalletSession(): ExternalWalletSession | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = safeLocalStorageGetItem(EXTERNAL_WALLET_SESSION_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as ExternalWalletSession;
    if (parsed.type === 'google' && (parsed as { provider?: string }).provider === 'web3auth_aa') {
      safeLocalStorageRemoveItem(EXTERNAL_WALLET_SESSION_KEY);
      return null;
    }
    return parsed;
  } catch {
    safeLocalStorageRemoveItem(EXTERNAL_WALLET_SESSION_KEY);
    return null;
  }
}

export function persistExternalWalletSession(session: ExternalWalletSession | null): void {
  if (typeof window === 'undefined') {
    return;
  }

  if (!session) {
    safeLocalStorageRemoveItem(EXTERNAL_WALLET_SESSION_KEY);
    window.dispatchEvent(new CustomEvent(EXTERNAL_WALLET_SESSION_EVENT, { detail: null }));
    return;
  }

  safeLocalStorageSetItem(EXTERNAL_WALLET_SESSION_KEY, JSON.stringify(session));
  window.dispatchEvent(new CustomEvent(EXTERNAL_WALLET_SESSION_EVENT, { detail: session }));
}

export function hasStoredExternalWalletSession(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return Boolean(safeLocalStorageGetItem(EXTERNAL_WALLET_SESSION_KEY));
}

export function getExternalSessionAddress(session: ExternalWalletSession | null): string {
  if (!session) {
    return '';
  }

  if (session.type === 'evm' || session.type === 'solana') {
    return String(session.address || '');
  }

  return session.walletNetwork === 'evm'
    ? String(session.address || '')
    : String(session.walletAddress || '');
}

export function getExternalSessionNetwork(session: ExternalWalletSession | null): 'sui' | 'evm' | 'solana' | null {
  if (!session) {
    return null;
  }

  if (session.type === 'evm') {
    return 'evm';
  }

  if (session.type === 'solana') {
    return 'solana';
  }

  return session.walletNetwork || null;
}

export function isExternalSessionSui(session: ExternalWalletSession | null): boolean {
  return getExternalSessionNetwork(session) === 'sui';
}

export function isExternalSessionEvm(session: ExternalWalletSession | null): boolean {
  return getExternalSessionNetwork(session) === 'evm';
}
