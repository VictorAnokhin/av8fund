import type { ZkLoginSignatureInputs } from '@mysten/sui/zklogin';

export const ZKLOGIN_PENDING_SETUP_KEY = 'av8fund.zklogin.pending-setup';
export const ZKLOGIN_SESSION_KEY = 'av8fund.zklogin.session';
export const ZKLOGIN_SESSION_EVENT = 'av8fund:zklogin-session';

export type PendingZkLoginSetup = {
  provider: 'google';
  maxEpoch: number;
  randomness: string;
  nonce: string;
  ephemeralPrivateKey: string;
  extendedEphemeralPublicKey: string;
  createdAt: string;
};

export type ZkLoginSession = {
  provider: 'google';
  network?: string;
  proverUrl?: string;
  jwt: string;
  salt: string;
  walletAddress: string;
  maxEpoch: number;
  randomness: string;
  ephemeralPrivateKey: string;
  extendedEphemeralPublicKey: string;
  proof: ZkLoginSignatureInputs;
  token?: string;
  expiresAt?: string;
  createdAt: string;
};

function readJson<T>(key: string): T | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.localStorage.getItem(key);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    window.localStorage.removeItem(key);
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

export function readPendingZkLoginSetup(): PendingZkLoginSetup | null {
  return readJson<PendingZkLoginSetup>(ZKLOGIN_PENDING_SETUP_KEY);
}

export function persistPendingZkLoginSetup(setup: PendingZkLoginSetup | null): void {
  if (typeof window === 'undefined') {
    return;
  }

  if (!setup) {
    window.localStorage.removeItem(ZKLOGIN_PENDING_SETUP_KEY);
    return;
  }

  writeJson(ZKLOGIN_PENDING_SETUP_KEY, setup);
}

export function clearPendingZkLoginSetup(): void {
  persistPendingZkLoginSetup(null);
}

export function readZkLoginSession(): ZkLoginSession | null {
  return readJson<ZkLoginSession>(ZKLOGIN_SESSION_KEY);
}

export function persistZkLoginSession(session: ZkLoginSession | null): void {
  if (typeof window === 'undefined') {
    return;
  }

  if (!session) {
    window.localStorage.removeItem(ZKLOGIN_SESSION_KEY);
    window.dispatchEvent(new CustomEvent(ZKLOGIN_SESSION_EVENT, { detail: null }));
    return;
  }

  writeJson(ZKLOGIN_SESSION_KEY, session);
  window.dispatchEvent(new CustomEvent(ZKLOGIN_SESSION_EVENT, { detail: session }));
}

export function clearZkLoginSession(): void {
  persistZkLoginSession(null);
}
