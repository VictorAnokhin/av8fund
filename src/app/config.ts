export const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '0.0.0.0'])

declare global {
  interface Window {
    /** Injected in index.html; highest priority over import.meta.env and meta-tag fallbacks. */
    __ENV__?: Record<string, string | number | boolean | undefined>
  }
}

const RUNTIME_API_META = 'av8fund-api-base-url'

type EnvKey =
  | 'VITE_API_BASE_URL'
  | 'VITE_API_URL'
  | 'VITE_IMAGE_BASE_URL'
  | 'VITE_API_FID'
  | 'VITE_SUI_NETWORK'
  | 'VITE_SUI_RPC_URL'
  /** Optional: RPC only for swap aggregator reads (7K/Cetus quotes). Overrides swap RPC resolution. */
  | 'VITE_SUI_SWAP_RPC_URL'
  /** If true/1, Cetus swap always uses the public fullnode for `VITE_SUI_NETWORK` (ignores local `VITE_SUI_RPC_URL`). */
  | 'VITE_SUI_SWAP_USE_PUBLIC_RPC'
  | 'VITE_SUI_PACKAGE_ID'
  | 'VITE_SUI_ADMIN_CAP_ID'
  | 'VITE_SUI_RWA_PACKAGE_ID'
  | 'VITE_SUI_RWA_ADMIN_CAP_ID'
  | 'VITE_SUI_UTILITY_PACKAGE_ID'
  | 'VITE_SUI_UTILITY_TREASURY_CAP_ID'
  | 'VITE_SUI_BASKET_ID'
  | 'VITE_SUI_REGISTRY_ID'
  | 'VITE_SUI_MANAGER_CAP_ID'
  | 'VITE_SUI_STRATEGY_ID'
  | 'VITE_SUI_POSITION_ID'
  | 'VITE_SUI_PYTH_OBJECT_ID'
  | 'VITE_SUI_GOOGLE_CLIENT_ID'
  | 'VITE_GOOGLE_CLIENT_ID'
  | 'VITE_WEB3AUTH_CLIENT_ID'
  | 'VITE_WEB3AUTH_NETWORK'
  | 'VITE_EVM_CHAIN_ID'
  | 'VITE_EVM_RPC_URL'
  | 'VITE_EVM_CHAIN_NAME'
  | 'VITE_WALRUS_PUBLISHER_URL'
  | 'VITE_WALRUS_AGGREGATOR_URL'
  | 'VITE_WALRUS_STORAGE_EPOCHS'
  | 'VITE_WALRUS_DELETABLE'

/** Highest priority: window.__ENV__ from index.html (before Vite env and meta tag). */
function readWindowEnv(key: EnvKey): string | undefined {
  if (typeof window === 'undefined') {
    return undefined
  }

  const bag = window.__ENV__
  if (!bag || !(key in bag)) {
    return undefined
  }

  const raw = bag[key]
  if (raw === undefined || raw === null) {
    return undefined
  }

  const s = String(raw).trim()
  return s !== '' ? s : undefined
}

/** Set in index.html at deploy time when the production build omitted VITE_API_BASE_URL. */
function readRuntimeApiBaseUrl(): string {
  if (typeof document === 'undefined') {
    return ''
  }

  const raw = document.querySelector(`meta[name="${RUNTIME_API_META}"]`)?.getAttribute('content')?.trim()
  if (!raw) {
    return ''
  }

  return raw.replace(/\/+$/, '')
}

function getEnv(key: EnvKey): string | undefined {
  const fromWindow = readWindowEnv(key)
  if (fromWindow !== undefined) {
    return fromWindow
  }

  return readViteEnv(key)
}

function readViteEnv(key: EnvKey): string | undefined {
  const value = import.meta.env[key]
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined
}

function getGoogleClientId(): string {
  return getEnv('VITE_SUI_GOOGLE_CLIENT_ID') ?? getEnv('VITE_GOOGLE_CLIENT_ID') ?? ''
}

function readUrlHostname(url: string): string {
  try {
    return new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost').hostname
      .trim()
      .toLowerCase()
  } catch {
    return ''
  }
}

const fidFromEnv = Number(getEnv('VITE_API_FID'))

export const API_FID = Number.isNaN(fidFromEnv) ? 12 : fidFromEnv

function getApiBaseUrl(): string {
  const hostname = typeof window !== 'undefined' ? window.location.hostname.trim().toLowerCase() : ''

  if (LOCAL_HOSTNAMES.has(hostname)) {
    const localBase = readViteEnv('VITE_API_BASE_URL') ?? readViteEnv('VITE_API_URL') ?? readRuntimeApiBaseUrl()
    if (localBase && LOCAL_HOSTNAMES.has(readUrlHostname(localBase))) {
      return localBase.replace(/\/+$/, '')
    }

    return ''
  }

  const base = getEnv('VITE_API_BASE_URL') ?? getEnv('VITE_API_URL') ?? ''
  if (base) {
    return base.replace(/\/+$/, '')
  }

  const fromMeta = readRuntimeApiBaseUrl()
  if (fromMeta) {
    return fromMeta
  }

  return ''
}

export const API_BASE_URL = getApiBaseUrl()

const imageBaseOnly = (getEnv('VITE_IMAGE_BASE_URL') ?? '').replace(/\/+$/, '')
export const IMAGE_BASE_URL = imageBaseOnly || API_BASE_URL

// Gnosis Safe configuration
export const GNOSIS_SAFE_CHAIN_ID = 1 // Ethereum mainnet
export const GNOSIS_SAFE_ADDRESS = '0x...' // Replace with actual safe address

const DEFAULT_SUI_RPC_URLS = {
  mainnet: 'https://fullnode.mainnet.sui.io:443',
  testnet: 'https://fullnode.testnet.sui.io:443',
  devnet: 'https://fullnode.devnet.sui.io:443',
} as const

export const SUI_NETWORK = getEnv('VITE_SUI_NETWORK') ?? 'testnet'
export const SUI_RPC_URL = getEnv('VITE_SUI_RPC_URL') ?? DEFAULT_SUI_RPC_URLS[SUI_NETWORK as keyof typeof DEFAULT_SUI_RPC_URLS] ?? DEFAULT_SUI_RPC_URLS.testnet

function normalizeRpcUrl(url: string): string {
  return url.trim().replace(/\/+$/, '')
}

function parseTruthyEnv(raw: string | undefined): boolean {
  if (!raw) {
    return false
  }

  const v = raw.trim().toLowerCase()
  return v === '1' || v === 'true' || v === 'yes'
}

function isLikelyLocalSuiRpcUrl(url: string): boolean {
  const trimmed = url.trim()
  if (!trimmed) {
    return false
  }

  try {
    const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`
    const u = new URL(withScheme)
    const h = u.hostname.toLowerCase()
    return h === 'localhost' || h === '127.0.0.1' || h === '0.0.0.0'
  } catch {
    return /\b(localhost|127\.0\.0\.1)\b/i.test(trimmed)
  }
}

function isIpv4PrivateOrLoopback(hostname: string): boolean {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(hostname)
  if (!m) {
    return false
  }

  const o = [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4])]
  if (o.some((x) => !Number.isInteger(x) || x < 0 || x > 255)) {
    return false
  }

  const [a, b] = o
  if (a === 10) {
    return true
  }

  if (a === 172 && b >= 16 && b <= 31) {
    return true
  }

  if (a === 192 && b === 168) {
    return true
  }

  if (a === 127 || a === 0) {
    return true
  }

  return false
}

/**
 * True when the RPC host is almost certainly unreachable from a normal user browser
 * (local loopback, RFC1918, or single-label Docker/Kubernetes service names).
 * Used to fall back to the public Mysten fullnode for remote users while keeping local dev on a validator.
 */
function isBrowserUnreachableSuiRpc(url: string): boolean {
  if (isLikelyLocalSuiRpcUrl(url)) {
    return true
  }

  try {
    const trimmed = url.trim()
    const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`
    const u = new URL(withScheme)
    const h = u.hostname.toLowerCase()
    if (isIpv4PrivateOrLoopback(h)) {
      return true
    }

    if (h && !h.includes('.') && h !== 'localhost') {
      return true
    }

    return false
  } catch {
    return false
  }
}

/**
 * Browser-safe Sui JSON-RPC URL: same resolution for dapp-kit `SuiClientProvider`, swap aggregators, and on-chain reads.
 * When the app is opened outside localhost and `VITE_SUI_RPC_URL` points at infra-only hosts, falls back to the public fullnode for `VITE_SUI_NETWORK`.
 */
export function resolveSuiSwapRpcUrl(): string {
  const net = SUI_NETWORK.trim().toLowerCase() as keyof typeof DEFAULT_SUI_RPC_URLS
  const publicForNetwork = normalizeRpcUrl(
    String(DEFAULT_SUI_RPC_URLS[net] ?? DEFAULT_SUI_RPC_URLS.testnet),
  )

  if (parseTruthyEnv(getEnv('VITE_SUI_SWAP_USE_PUBLIC_RPC'))) {
    return publicForNetwork
  }

  const swapOnly = getEnv('VITE_SUI_SWAP_RPC_URL')
  if (swapOnly?.trim()) {
    return normalizeRpcUrl(swapOnly)
  }

  const configuredRaw = getEnv('VITE_SUI_RPC_URL')
  if (!configuredRaw?.trim()) {
    return publicForNetwork
  }

  const configured = normalizeRpcUrl(configuredRaw)

  if (typeof window !== 'undefined') {
    const host = window.location.hostname.trim().toLowerCase()
    if (!LOCAL_HOSTNAMES.has(host) && isBrowserUnreachableSuiRpc(configured)) {
      return publicForNetwork
    }
  }

  return configured
}

export const SUI_PACKAGE_ID = getEnv('VITE_SUI_PACKAGE_ID') ?? ''
export const SUI_ADMIN_CAP_ID = getEnv('VITE_SUI_ADMIN_CAP_ID') ?? ''
export const SUI_RWA_PACKAGE_ID = getEnv('VITE_SUI_RWA_PACKAGE_ID') ?? SUI_PACKAGE_ID
export const SUI_RWA_ADMIN_CAP_ID = getEnv('VITE_SUI_RWA_ADMIN_CAP_ID') ?? SUI_ADMIN_CAP_ID
export const SUI_UTILITY_PACKAGE_ID = getEnv('VITE_SUI_UTILITY_PACKAGE_ID') ?? SUI_RWA_PACKAGE_ID
export const SUI_UTILITY_TREASURY_CAP_ID = getEnv('VITE_SUI_UTILITY_TREASURY_CAP_ID') ?? ''
export const SUI_BASKET_ID = getEnv('VITE_SUI_BASKET_ID') ?? ''
export const SUI_REGISTRY_ID = getEnv('VITE_SUI_REGISTRY_ID') ?? ''
export const SUI_MANAGER_CAP_ID = getEnv('VITE_SUI_MANAGER_CAP_ID') ?? ''
export const SUI_STRATEGY_ID = getEnv('VITE_SUI_STRATEGY_ID') ?? ''
export const SUI_POSITION_ID = getEnv('VITE_SUI_POSITION_ID') ?? ''
export const SUI_PYTH_OBJECT_ID = getEnv('VITE_SUI_PYTH_OBJECT_ID') ?? ''
export const SUI_GOOGLE_CLIENT_ID = getGoogleClientId()
export const WEB3AUTH_CLIENT_ID = getEnv('VITE_WEB3AUTH_CLIENT_ID') ?? ''
export const WEB3AUTH_NETWORK = getEnv('VITE_WEB3AUTH_NETWORK') ?? 'sapphire_mainnet'
export const EVM_CHAIN_ID = getEnv('VITE_EVM_CHAIN_ID') ?? '0x1'
export const EVM_RPC_URL = getEnv('VITE_EVM_RPC_URL') ?? 'https://rpc.ankr.com/eth'
export const EVM_CHAIN_NAME = getEnv('VITE_EVM_CHAIN_NAME') ?? 'Ethereum Mainnet'

const DEFAULT_WALRUS_TESTNET_PUBLISHER_URL = 'https://publisher.walrus-testnet.walrus.space'
const DEFAULT_WALRUS_TESTNET_AGGREGATOR_URL = 'https://aggregator.walrus-testnet.walrus.space'
const DEFAULT_WALRUS_MAINNET_AGGREGATOR_URL = 'https://aggregator.walrus-mainnet.walrus.space'

const walrusEpochs = Number(getEnv('VITE_WALRUS_STORAGE_EPOCHS'))

export const WALRUS_PUBLISHER_URL =
  (getEnv('VITE_WALRUS_PUBLISHER_URL') ?? (SUI_NETWORK === 'testnet' ? DEFAULT_WALRUS_TESTNET_PUBLISHER_URL : '')).replace(/\/+$/, '')
export const WALRUS_AGGREGATOR_URL =
  (getEnv('VITE_WALRUS_AGGREGATOR_URL') ??
    (SUI_NETWORK === 'mainnet' ? DEFAULT_WALRUS_MAINNET_AGGREGATOR_URL : DEFAULT_WALRUS_TESTNET_AGGREGATOR_URL)).replace(/\/+$/, '')
export const WALRUS_STORAGE_EPOCHS = Number.isFinite(walrusEpochs) && walrusEpochs > 0 ? Math.floor(walrusEpochs) : 5
export const WALRUS_DELETABLE = (getEnv('VITE_WALRUS_DELETABLE') ?? 'false').toLowerCase() === 'true'
