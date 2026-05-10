import type { ResolvedWalletUser } from './api'
import {
  safeLocalStorageGetItem,
  safeLocalStorageRemoveItem,
  safeLocalStorageSetItem,
} from './safeLocalStorage'

export const IDENTITY_SESSION_KEY = 'av8fund.identity-session'
export const IDENTITY_SESSION_EVENT = 'av8fund:identity-session'

export type IdentitySession = {
  token: string
  user: ResolvedWalletUser
  provider: 'google'
  credential?: string
  createdAt: string
}

export function readIdentitySession(): IdentitySession | null {
  if (typeof window === 'undefined') {
    return null
  }

  const raw = safeLocalStorageGetItem(IDENTITY_SESSION_KEY)
  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw) as IdentitySession
  } catch {
    safeLocalStorageRemoveItem(IDENTITY_SESSION_KEY)
    return null
  }
}

export function persistIdentitySession(session: IdentitySession | null): void {
  if (typeof window === 'undefined') {
    return
  }

  if (!session) {
    safeLocalStorageRemoveItem(IDENTITY_SESSION_KEY)
    window.dispatchEvent(new CustomEvent(IDENTITY_SESSION_EVENT, { detail: null }))
    return
  }

  safeLocalStorageSetItem(IDENTITY_SESSION_KEY, JSON.stringify(session))
  window.dispatchEvent(new CustomEvent(IDENTITY_SESSION_EVENT, { detail: session }))
}

export function clearIdentitySession(): void {
  persistIdentitySession(null)
}
