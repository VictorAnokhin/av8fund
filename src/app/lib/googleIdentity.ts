type GoogleCredentialResponse = {
  credential?: string
}

type GoogleAccountsId = {
  initialize: (options: {
    client_id: string
    nonce?: string
    callback: (response: GoogleCredentialResponse) => void
    use_fedcm_for_prompt?: boolean
    ux_mode?: 'popup' | 'redirect'
    cancel_on_tap_outside?: boolean
  }) => void
  prompt: (listener?: (notification: {
    isNotDisplayed?: () => boolean
    isSkippedMoment?: () => boolean
    isDismissedMoment?: () => boolean
    getNotDisplayedReason?: () => string
    getSkippedReason?: () => string
    getDismissedReason?: () => string
  }) => void) => void
  renderButton: (parent: HTMLElement, options: {
    theme?: 'outline' | 'filled_blue' | 'filled_black'
    size?: 'large' | 'medium' | 'small'
    type?: 'standard' | 'icon'
    text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin'
    shape?: 'rectangular' | 'pill' | 'circle' | 'square'
    logo_alignment?: 'left' | 'center'
    width?: number
  }) => void
  cancel: () => void
}

let lastInitializeKey: string | null = null

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: GoogleAccountsId
      }
    }
  }
}

export async function loadGoogleIdentityScript(): Promise<GoogleAccountsId> {
  if (typeof window === 'undefined') {
    throw new Error('Google Identity Services can only run in the browser.')
  }

  const existingApi = window.google?.accounts?.id
  if (existingApi) {
    return existingApi
  }

  await new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>('script[data-google-identity="true"]')
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true })
      existingScript.addEventListener('error', () => reject(new Error('Failed to load Google Identity Services.')), { once: true })
      return
    }

    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.dataset.googleIdentity = 'true'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Google Identity Services.'))
    document.head.appendChild(script)
  })

  const api = window.google?.accounts?.id
  if (!api) {
    throw new Error('Google Identity Services did not initialize.')
  }

  return api
}

export function getGoogleIdentityInitializeKey(): string | null {
  return lastInitializeKey
}

export function setGoogleIdentityInitializeKey(key: string | null): void {
  lastInitializeKey = key
}

export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const [, payload] = token.split('.')
  if (!payload) {
    return null
  }

  try {
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=')
    return JSON.parse(window.atob(padded)) as Record<string, unknown>
  } catch {
    return null
  }
}
