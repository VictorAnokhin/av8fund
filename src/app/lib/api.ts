import { API_BASE_URL, API_FID, IMAGE_BASE_URL, LOCAL_HOSTNAMES } from '../config'

const ABSOLUTE_URL_RE = /^https?:\/\//i

function toApiUrl(path: string): string {
  if (ABSOLUTE_URL_RE.test(path)) {
    return path
  }

  if (path.startsWith('/')) {
    return API_BASE_URL ? `${API_BASE_URL}${path}` : path
  }

  return API_BASE_URL ? `${API_BASE_URL}/${path}` : `/${path}`
}

function appendCacheKey(url: string, cacheKey?: string): string {
  if (!cacheKey) {
    return url
  }

  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}v=${encodeURIComponent(cacheKey)}`
}

function toAbsoluteMediaUrl(url: string | null | undefined, cacheKey?: string): string | undefined {
  if (!url) {
    return undefined
  }

  const normalizedUrl = url.trim().replace(/\\/g, '/')

  if (normalizedUrl === '') {
    return undefined
  }

  if (ABSOLUTE_URL_RE.test(normalizedUrl)) {
    return appendCacheKey(normalizedUrl, cacheKey)
  }

  if (normalizedUrl.startsWith('../')) {
    return appendCacheKey(`${IMAGE_BASE_URL}/${normalizedUrl.replace(/^\.\.\//, '')}`, cacheKey)
  }

  if (normalizedUrl.startsWith('/')) {
    return appendCacheKey(IMAGE_BASE_URL ? `${IMAGE_BASE_URL}${normalizedUrl}` : normalizedUrl, cacheKey)
  }

  return appendCacheKey(IMAGE_BASE_URL ? `${IMAGE_BASE_URL}/${normalizedUrl}` : `/${normalizedUrl}`, cacheKey)
}

export function logFrontendDiagnostic(stage: string, data: Record<string, unknown> = {}, area = 'frontend'): void {
  fetch(toApiUrl('/api/debug/frontend'), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ area, stage, data }),
  }).catch(() => {
    // Diagnostics must never affect the user flow.
  })
}

export type AiChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type AiChatResponse = {
  answer: string
  provider: string
  model: string
  billing?: {
    paid_by?: string
    sui_gas_sponsor_available?: boolean
  }
}

export async function sendAiChatMessage(input: {
  message: string
  language: 'ru' | 'ua' | 'en'
  page?: string
  wallet?: string
  history?: AiChatMessage[]
}): Promise<AiChatResponse> {
  const response = await fetch(toApiUrl('/api/ai/chat'), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })

  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    const message = typeof payload.message === 'string'
      ? payload.message
      : `AI request failed: ${response.status}`
    const detail = typeof payload.error === 'string' && payload.error ? ` ${payload.error}` : ''
    throw new Error(`${message}${detail}`)
  }

  return {
    answer: String(payload.answer || ''),
    provider: String(payload.provider || 'atoma'),
    model: String(payload.model || ''),
    billing: typeof payload.billing === 'object' && payload.billing !== null ? payload.billing : undefined,
  }
}

export type ProjectSettings = {
  id: number
  name: string
  phone: string
  url: string
  telegram: string
  instagram: string
  twitter: string
  facebook: string
  description: string
  description_ua?: string
  description_en?: string
  foto_preview?: string
  foto_header_preview?: string
  foto_footer_preview?: string
}

export type NewsArticle = {
  id: number
  title: string
  excerpt: string
  body: string
  date: string
  imageUrl?: string
  hot?: number
  view?: number
  htmlkeys?: string
}

export type NewsArticleDetail = NewsArticle & {
  body: string
}

export type TransparencyHolding = {
  type: 'token' | 'defi'
  id: string
  name: string
  symbol?: string | null
  chain: string
  usd_value: number
  share?: number
  amount?: number | null
  price?: number | null
  apy?: number | null
  side?: string | null
  collateral?: boolean | null
  asset_usd_value?: number | null
  debt_usd_value?: number | null
  logo_url?: string | null
  link?: string | null
  protocol_key?: string | null
  protocol_name?: string | null
  position_kind?: 'token' | 'pool' | 'loan' | null
  position_type?: string | null
  protocol_module?: string | null
}

export type TransparencyOverview = {
  available: boolean
  wallet: {
    address: string
    chain_ids: string[]
  }
  total_usd_value: number
  tokens: TransparencyHolding[]
  protocols: TransparencyHolding[]
  holdings: TransparencyHolding[]
  error: string | null
  updated_at: string
}

export type Web3SwapToken = {
  id: number
  symbol: string
  name: string
  address: string
  decimals: number
  chain_id: string
  chain_id_decimal: string
  coingecko_id: string
  commission: number
}

export type WalletPortfolioToken = {
  chain: string
  token_address: string | null
  symbol: string
  name: string
  decimals: number
  balance: string
  price_usd: string | null
  value_usd: string | null
  logo: string | null
  is_spam: boolean
  is_selected: boolean
  commission: string
  synced_at: string | null
}

export type WalletPortfolioChain = {
  chain: string
  token_count: number
  value_usd: number
}

export type WalletPortfolioResponse = {
  address: string
  total_usd_value: number
  chains: WalletPortfolioChain[]
  result: WalletPortfolioToken[]
  meta: {
    cached: boolean
    include_spam: boolean
    include_unselected: boolean
    supported_chains: string[]
    synced_at: string | null
  }
}

export type WalletProtocolTokenPosition = {
  name: string
  symbol?: string | null
  balance?: number | null
  usd_value?: number | null
  price?: number | null
  chain?: string | null
  link?: string | null
  apy?: number | null
  collateral?: boolean | null
  position_type?: string | null
  protocol_module?: string | null
}

export type WalletProtocolLoanPosition = {
  name: string
  symbol?: string | null
  balance?: number | null
  usd_value?: number | null
  chain?: string | null
  side?: string | null
  link?: string | null
  apy?: number | null
  position_type?: string | null
  protocol_module?: string | null
}

export type WalletProtocolPoolPosition = {
  name: string
  symbol?: string | null
  usd_value?: number | null
  apy?: number | null
  tvl_usd?: number | null
  total_liquidity?: number | null
  long_token?: string | null
  short_token?: string | null
  chain?: string | null
  link?: string | null
  position_type?: string | null
  protocol_module?: string | null
}

export type WalletProtocolGroup = {
  name: string
  url?: string | null
  icon?: string | null
  available?: boolean
  error?: string | null
  tokens: WalletProtocolTokenPosition[]
  loans: WalletProtocolLoanPosition[]
  pools: WalletProtocolPoolPosition[]
}

export type WalletProtocolsResponse = Record<string, WalletProtocolGroup>

export type ResolvedUserWallet = {
  address: string
  network?: string | null
  chain_id?: string | null
  connected_at?: string | null
  /** 1 = привязка через Google (zkLogin) / сгенерированный адрес; 0 = кошелёк (подпись расширения). */
  web3auth?: number
}

export type ResolvedWalletUser = {
  id: number
  login?: string
  phone?: string
  name?: string
  secondname?: string
  fathername?: string
  email?: string
  fid?: number | string | null
  idstatus?: number | string | null
  wallet_address?: string | null
  wallet_network?: string | null
  wallet_connected_at?: string | null
  wallets: ResolvedUserWallet[]
  zklogin_wallet_address?: string | null
}

export type AuthConfigResponse = {
  googleClientId: string
  phoneAuthEnabled: boolean
}

export type AuthLoginResponse = {
  user: ResolvedWalletUser
  token: string
}

export type WalletLinkChallengeResponse = {
  nonce: string
  message: string
}

export const EVM_WALLET_TYPE_IDS = ['eth', 'arbitrum', 'base', 'polygon', 'bnb'] as const

export type EvmWalletTypeId = (typeof EVM_WALLET_TYPE_IDS)[number]

export type WalletType = EvmWalletTypeId | 'solana' | 'sui'

export function walletLinkTypeFromPortfolioNetwork(network: string): WalletType {
  const n = String(network || '').trim().toLowerCase()
  if (n === 'solana') {
    return 'solana'
  }
  if (n === 'sui') {
    return 'sui'
  }
  if ((EVM_WALLET_TYPE_IDS as readonly string[]).includes(n)) {
    return n as EvmWalletTypeId
  }
  return 'eth'
}

export type ZkLoginConfigResponse = {
  googleClientId: string
  proverUrl: string
  /** `shinami` when SHINAMI_WALLET_ACCESS_KEY is set on Laravel */
  proverProvider?: 'mysten' | 'shinami'
  gasSponsorshipEnabled?: boolean
  gasSponsorshipProvider?: 'local' | 'shinami' | null
  enabled: boolean
}

export type ZkLoginSaltResponse = {
  salt: string
  provider: 'google'
  iss: string
  aud: string
  sub: string
  user: ResolvedWalletUser
}

export type ZkLoginProofResponse = {
  proofPoints: {
    a: string[]
    b: string[][]
    c: string[]
  }
  issBase64Details: {
    value: string
    indexMod4: number
  }
  headerBase64: string
  addressSeed: string
}

export type ZkLoginLoginResponse = {
  user: ResolvedWalletUser
  token: string
  wallet_address: string
  salt: string
}

export type WalletSwapPriceResponse = {
  dstAmount?: string
  toTokenAmount?: string
  meta?: {
    provider?: string
    commission_percent?: number
  }
}

export type WalletSwapQuoteResponse = {
  dstAmount?: string
  tx?: {
    from?: string
    to?: string
    data?: string
    value?: string
    gas?: number | string
    gasPrice?: string
  }
  meta?: {
    provider?: string
    commission_percent?: number
    slippage_percent?: number
  }
  approval_required?: boolean
  approve_tx?: {
    to?: string
    data?: string
    value?: string
    gasPrice?: string
  } | null
}

type ProjectResponse = {
  item: {
    id: number
    name: string
    phone?: string
    url?: string
    telegram?: string
    instagram?: string
    twitter?: string
    facebook?: string
    description?: string
    description_ua?: string
    descriptionua?: string
    description_en?: string
    descriptionen?: string
    foto_preview?: string | null
    foto_header_preview?: string | null
    foto_footer_preview?: string | null
  }
}

export async function getProjectSettings(projectId: number = API_FID): Promise<ProjectSettings> {
  const response = await fetch(toApiUrl(`/api/projects/${projectId}`), {
    method: 'GET',
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to load project settings: ${response.status}`)
  }

  const payload = (await response.json()) as ProjectResponse
  const item = payload.item
  const cacheKey = String(Date.now())

  return {
    id: item.id,
    name: item.name || 'AV8Capital',
    phone: item.phone || '',
    url: item.url || '',
    telegram: item.telegram || '',
    instagram: item.instagram || '',
    twitter: item.twitter || '',
    facebook: item.facebook || '',
    description: item.description || '',
    description_ua: item.description_ua || item.descriptionua || '',
    description_en: item.description_en || item.descriptionen || '',
    foto_preview: toAbsoluteMediaUrl(item.foto_preview, cacheKey),
    foto_header_preview: toAbsoluteMediaUrl(item.foto_header_preview, cacheKey),
    foto_footer_preview: toAbsoluteMediaUrl(item.foto_footer_preview, cacheKey),
  }
}

type NewsResponse = {
  items?: Array<{
    id: number
    title_view?: string
    excerpt_view?: string
    body_view?: string
    dt?: string
    photo_view?: string | null
    hot?: number
    view?: number
    htmlkeys?: string
  }>
}

type NewsDetailResponse = {
  item?: {
    id: number
    title_view?: string
    excerpt_view?: string
    body_view?: string
    dt?: string
    photo_view?: string | null
  }
}

function stripHtml(value: string | null | undefined): string {
  if (!value) {
    return ''
  }

  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export async function getNewsArticles(
  options: {
    fid?: number
    limit?: number
    language?: 'en' | 'ua' | 'ru'
    htmlkeys?: string
  } = {},
): Promise<NewsArticle[]> {
  const { fid = API_FID, limit = 3, language = 'ru', htmlkeys } = options
  const params = new URLSearchParams({
    fid: String(fid),
    limit: String(limit),
    lang: language,
  })

  if (htmlkeys) {
    params.set('htmlkeys', htmlkeys)
  }

  const response = await fetch(toApiUrl(`/api/news?${params.toString()}`), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to load news articles: ${response.status}`)
  }

  const payload = (await response.json()) as NewsResponse
  const items = Array.isArray(payload.items) ? payload.items : []

  return items.slice(0, limit).map((item) => ({
    id: item.id,
    title: stripHtml(item.title_view) || 'Article',
    excerpt: stripHtml(item.excerpt_view),
    body: item.body_view || '',
    date: item.dt || '',
    imageUrl: toAbsoluteMediaUrl(item.photo_view),
    hot: item.hot || 0,
    view: item.view || 0,
    htmlkeys: item.htmlkeys || '',
  }))
}

export async function getNewsArticleDetail(
  articleId: number,
  options: {
    fid?: number
    language?: 'en' | 'ua' | 'ru'
  } = {},
): Promise<NewsArticleDetail> {
  const { fid = API_FID, language = 'ru' } = options
  const params = new URLSearchParams({
    fid: String(fid),
    lang: language,
  })

  const response = await fetch(toApiUrl(`/api/news/${articleId}?${params.toString()}`), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to load news article: ${response.status}`)
  }

  const payload = (await response.json()) as NewsDetailResponse
  const item = payload.item

  if (!item) {
    throw new Error('Article payload is empty')
  }

  return {
    id: item.id,
    title: stripHtml(item.title_view) || 'Article',
    excerpt: stripHtml(item.excerpt_view),
    body: item.body_view || '',
    date: item.dt || '',
    imageUrl: toAbsoluteMediaUrl(item.photo_view),
    hot: 0,
    view: 0,
  }
}

export async function getTransparencyOverview(address?: string): Promise<TransparencyOverview> {
  const params = new URLSearchParams()

  if (address) {
    params.set('address', address)
  }

  const url = params.toString()
    ? toApiUrl(`/api/transparency/overview?${params.toString()}`)
    : toApiUrl('/api/transparency/overview')

  const response = await fetch(url, {
    method: 'GET',
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
    },
  })

  let payload: TransparencyOverview | null = null

  try {
    payload = (await response.json()) as TransparencyOverview
  } catch {
    payload = null
  }

  if (!response.ok && !payload) {
    throw new Error(`Failed to load transparency overview: ${response.status}`)
  }

  const normalizedPayload = payload ?? {
    available: false,
    wallet: {
      address: '',
      chain_ids: [],
    },
    total_usd_value: 0,
    tokens: [],
    protocols: [],
    holdings: [],
    error: `Failed to load transparency overview: ${response.status}`,
    updated_at: '',
  }

  return {
    available: Boolean(normalizedPayload.available),
    wallet: {
      address: normalizedPayload.wallet?.address || '',
      chain_ids: Array.isArray(normalizedPayload.wallet?.chain_ids) ? normalizedPayload.wallet.chain_ids : [],
    },
    total_usd_value: Number(normalizedPayload.total_usd_value || 0),
    tokens: Array.isArray(normalizedPayload.tokens) ? normalizedPayload.tokens : [],
    protocols: Array.isArray(normalizedPayload.protocols) ? normalizedPayload.protocols : [],
    holdings: Array.isArray(normalizedPayload.holdings) ? normalizedPayload.holdings : [],
    error: normalizedPayload.error || null,
    updated_at: normalizedPayload.updated_at || '',
  }
}

export async function getWalletProtocols(
  address: string,
  options: { refresh?: boolean; chainId?: string } = {},
): Promise<WalletProtocolsResponse> {
  const params = new URLSearchParams({
    address,
  })

  if (options.refresh) {
    params.set('refresh', '1')
  }

  if (options.chainId) {
    params.set('chain_id', options.chainId)
  }

  const response = await fetch(toApiUrl(`/api/wallet/protocols?${params.toString()}`), {
    method: 'GET',
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
    },
  })

  const payload = (await response.json()) as WalletProtocolsResponse | { message?: string }

  if (!response.ok) {
    throw new Error(('message' in payload && payload.message) || `Failed to load wallet protocols: ${response.status}`)
  }

  return Object.fromEntries(
    Object.entries(payload as WalletProtocolsResponse).map(([key, value]) => [
      key,
      {
        name: value?.name || 'Protocol',
        url: value?.url || null,
        icon: value?.icon || null,
        available: Boolean(value?.available),
        error: value?.error || null,
        tokens: Array.isArray(value?.tokens) ? value.tokens : [],
        loans: Array.isArray(value?.loans) ? value.loans : [],
        pools: Array.isArray(value?.pools) ? value.pools : [],
      },
    ]),
  )
}

export async function getWeb3SwapTokens(chainId?: string): Promise<Web3SwapToken[]> {
  const params = new URLSearchParams()
  if (chainId) {
    params.set('chain_id', chainId)
  }

  const response = await fetch(toApiUrl(`/api/wallet/tokens${params.toString() ? `?${params.toString()}` : ''}`), {
    method: 'GET',
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to load wallet tokens: ${response.status}`)
  }

  const payload = (await response.json()) as { items?: Web3SwapToken[] }

  return Array.isArray(payload.items) ? payload.items : []
}

export async function getZkLoginConfig(): Promise<ZkLoginConfigResponse> {
  const response = await fetch(toApiUrl('/api/auth/zklogin/config'), {
    method: 'GET',
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to load zkLogin config: ${response.status}`)
  }

  const payload = (await response.json()) as Partial<ZkLoginConfigResponse>

  return {
    googleClientId: payload.googleClientId || '',
    proverUrl: payload.proverUrl || '',
    proverProvider: payload.proverProvider === 'shinami' ? 'shinami' : 'mysten',
    gasSponsorshipEnabled: Boolean(payload.gasSponsorshipEnabled),
    gasSponsorshipProvider:
      payload.gasSponsorshipProvider === 'local' || payload.gasSponsorshipProvider === 'shinami'
        ? payload.gasSponsorshipProvider
        : null,
    enabled: Boolean(payload.enabled),
  }
}

let zkLoginConfigCache: { value: ZkLoginConfigResponse; at: number } | null = null

/** Short-lived cache to avoid extra round-trips during send / zkLogin flows. */
export async function getZkLoginConfigCached(ttlMs = 60_000): Promise<ZkLoginConfigResponse> {
  if (zkLoginConfigCache && Date.now() - zkLoginConfigCache.at < ttlMs) {
    return zkLoginConfigCache.value
  }
  const value = await getZkLoginConfig()
  zkLoginConfigCache = { value, at: Date.now() }
  return value
}

export type ShinamiSponsorTransactionResponse = {
  txBytes: string
  signature: string
  txDigest: string
  expireAtTime?: number
}

export async function sponsorShinamiGasTransaction(input: {
  token: string
  transactionKindBase64: string
  sender: string
}): Promise<ShinamiSponsorTransactionResponse> {
  const response = await fetch(toApiUrl('/api/sui/shinami/sponsor-transaction'), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${input.token}`,
    },
    body: JSON.stringify({
      transactionKindBase64: input.transactionKindBase64,
      sender: input.sender,
    }),
  })

  const payload = (await response.json()) as ShinamiSponsorTransactionResponse & { message?: string }

  if (!response.ok) {
    throw new Error(payload.message || `Gas sponsorship failed: ${response.status}`)
  }

  if (!payload.txBytes || !payload.signature) {
    throw new Error('Gas sponsorship returned an invalid payload')
  }

  return payload
}

export async function getAuthConfig(): Promise<AuthConfigResponse> {
  const response = await fetch(toApiUrl('/api/auth/config'), {
    method: 'GET',
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to load auth config: ${response.status}`)
  }

  const payload = (await response.json()) as Partial<AuthConfigResponse>

  return {
    googleClientId: payload.googleClientId || '',
    phoneAuthEnabled: Boolean(payload.phoneAuthEnabled),
  }
}

export async function loginWithGoogleCredential(credential: string): Promise<AuthLoginResponse> {
  const url = toApiUrl('/api/auth/google')
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ credential }),
  })

  const rawPayload = await response.text()
  let payload: (Partial<AuthLoginResponse> & { message?: string }) | null = null

  try {
    payload = rawPayload ? JSON.parse(rawPayload) as Partial<AuthLoginResponse> & { message?: string } : null
  } catch {
    payload = null
  }

  if (!response.ok) {
    throw new Error(payload?.message || `Failed to login with Google: ${response.status}`)
  }

  if (!payload?.user || !payload?.token) {
    const ct = response.headers.get('content-type') || ''
    const preview = rawPayload.replace(/\s+/g, ' ').trim().slice(0, 280)
    const isLikelyHtml =
      ct.includes('text/html') || rawPayload.trim().startsWith('<!') || rawPayload.includes('<html')
    const missingApiBase =
      !API_BASE_URL &&
      typeof window !== 'undefined' &&
      !LOCAL_HOSTNAMES.has(window.location.hostname.trim().toLowerCase())

    const hints: string[] = []
    if (isLikelyHtml || (rawPayload && preview && !rawPayload.trim().startsWith('{'))) {
      hints.push(
        'Ответ не JSON (часто HTML с фронта или прокси). Для продакшена задайте VITE_API_BASE_URL на origin Laravel при сборке; POST /api/auth/google должен попадать в PHP.',
      )
    }
    if (missingApiBase) {
      hints.push(
        `Сейчас API_BASE_URL пустой — запрос шёл на ${window.location.origin}. Задайте VITE_API_BASE_URL в window.__ENV__ (index.html), при сборке, в <meta name="av8fund-api-base-url" />, либо nginx: location /api → Laravel.`,
      )
    }
    hints.push(
      'GOOGLE_CLIENT_ID на Laravel должен совпадать с VITE_SUI_GOOGLE_CLIENT_ID. В Google Cloud: Authorized JavaScript origins = ваш фронт.',
    )

    throw new Error(
      [
        payload?.message,
        'Google login returned an invalid response.',
        `Request URL: ${url}`,
        preview && `Body: ${preview}…`,
        ...hints,
      ]
        .filter(Boolean)
        .join(' '),
    )
  }

  return {
    user: payload.user,
    token: payload.token,
  }
}

export async function getAuthenticatedUser(token: string): Promise<ResolvedWalletUser> {
  const response = await fetch(toApiUrl('/api/auth/user'), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })

  const payload = (await response.json()) as { user?: ResolvedWalletUser; message?: string }

  if (!response.ok || !payload.user) {
    throw new Error(payload.message || `Failed to load authenticated user: ${response.status}`)
  }

  return payload.user
}

export async function logoutAuthenticatedUser(token: string): Promise<void> {
  const response = await fetch(toApiUrl('/api/auth/logout'), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to logout authenticated user: ${response.status}`)
  }
}

export async function createWalletLinkChallenge(
  token: string,
  input: {
    address: string
    walletType?: WalletType
  },
): Promise<WalletLinkChallengeResponse> {
  const response = await fetch(toApiUrl('/api/auth/wallet/challenge'), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      address: input.address,
      wallet_type: input.walletType || 'eth',
    }),
  })

  const payload = (await response.json()) as Partial<WalletLinkChallengeResponse> & { message?: string }

  if (!response.ok || !payload.message || !payload.nonce) {
    throw new Error(payload.message || `Failed to create wallet link challenge: ${response.status}`)
  }

  return {
    nonce: payload.nonce,
    message: payload.message,
  }
}

export async function linkAuthenticatedWallet(
  token: string,
  input: {
    address: string
    signature: string
    network?: string | null
    walletType?: WalletType
  },
): Promise<ResolvedWalletUser> {
  const response = await fetch(toApiUrl('/api/auth/wallet/link'), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      address: input.address,
      signature: input.signature,
      network: input.network || null,
      wallet_type: input.walletType || 'eth',
    }),
  })

  const raw = await response.text()
  let payload: { user?: ResolvedWalletUser; message?: string } = {}
  try {
    payload = raw.trim() ? (JSON.parse(raw) as { user?: ResolvedWalletUser; message?: string }) : {}
  } catch {
    throw new Error(
      raw.trim().slice(0, 280) || `Failed to link wallet: ${response.status}`,
    )
  }

  if (!response.ok || !payload.user) {
    throw new Error(payload.message || `Failed to link wallet: ${response.status}`)
  }

  return payload.user
}

export async function unlinkAuthenticatedWallet(
  token: string,
  input: {
    address: string
    walletType?: WalletType
  },
): Promise<ResolvedWalletUser> {
  const response = await fetch(toApiUrl('/api/auth/wallet/unlink'), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      address: input.address,
      wallet_type: input.walletType || 'eth',
    }),
  })

  const payload = (await response.json()) as { user?: ResolvedWalletUser; message?: string }

  if (!response.ok || !payload.user) {
    throw new Error(payload.message || `Failed to unlink wallet: ${response.status}`)
  }

  return payload.user
}

export async function createGoogleZkLoginSalt(jwt: string): Promise<ZkLoginSaltResponse> {
  const response = await fetch(toApiUrl('/api/auth/zklogin/google/salt'), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ jwt }),
  })

  const payload = (await response.json()) as ZkLoginSaltResponse & { message?: string }

  if (!response.ok) {
    throw new Error(payload.message || `Failed to create zkLogin salt: ${response.status}`)
  }

  return payload
}

export async function createGoogleZkLoginProof(input: {
  jwt: string
  extendedEphemeralPublicKey: string
  maxEpoch: number
  jwtRandomness: string
  salt: string
  keyClaimName?: string
}): Promise<ZkLoginProofResponse> {
  const response = await fetch(toApiUrl('/api/auth/zklogin/google/proof'), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })

  const payload = (await response.json()) as ZkLoginProofResponse & { message?: string; error?: string }

  if (!response.ok) {
    throw new Error(payload.message || payload.error || `Failed to create zkLogin proof: ${response.status}`)
  }

  return payload
}

export async function completeGoogleZkLogin(jwt: string, address: string): Promise<ZkLoginLoginResponse> {
  const response = await fetch(toApiUrl('/api/auth/zklogin/google/login'), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ jwt, address }),
  })

  const payload = (await response.json()) as ZkLoginLoginResponse & { message?: string }

  if (!response.ok) {
    throw new Error(payload.message || `Failed to complete zkLogin session: ${response.status}`)
  }

  return payload
}

export async function getWalletPortfolioTokens(
  address: string,
  options: {
    includeSpam?: boolean
    includeUnselected?: boolean
    refresh?: boolean
  } = {},
): Promise<WalletPortfolioResponse> {
  const params = new URLSearchParams()

  if (options.includeSpam) {
    params.set('include_spam', '1')
  }

  if (options.includeUnselected) {
    params.set('include_unselected', '1')
  }

  if (options.refresh) {
    params.set('refresh', '1')
  }

  const response = await fetch(
    toApiUrl(`/api/wallet/${encodeURIComponent(address)}/tokens${params.toString() ? `?${params.toString()}` : ''}`),
    {
      method: 'GET',
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
      },
    },
  )

  const payload = (await response.json()) as WalletPortfolioResponse & { message?: string }

  if (!response.ok) {
    throw new Error(payload.message || `Failed to load wallet portfolio: ${response.status}`)
  }

  return {
    address: payload.address || address,
    total_usd_value: Number(payload.total_usd_value || 0),
    chains: Array.isArray(payload.chains) ? payload.chains : [],
    result: Array.isArray(payload.result) ? payload.result : [],
    meta: {
      cached: Boolean(payload.meta?.cached),
      include_spam: Boolean(payload.meta?.include_spam),
      include_unselected: Boolean(payload.meta?.include_unselected),
      supported_chains: Array.isArray(payload.meta?.supported_chains) ? payload.meta.supported_chains : [],
      synced_at: payload.meta?.synced_at || null,
    },
  }
}

export async function getWalletTokenSettings(
  address: string,
  options: {
    refresh?: boolean
  } = {},
): Promise<WalletPortfolioResponse> {
  const params = new URLSearchParams()

  if (options.refresh) {
    params.set('refresh', '1')
  }

  const response = await fetch(
    toApiUrl(`/api/wallet/${encodeURIComponent(address)}/tokens/settings${params.toString() ? `?${params.toString()}` : ''}`),
    {
      method: 'GET',
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
      },
    },
  )

  const payload = (await response.json()) as WalletPortfolioResponse & { message?: string }

  if (!response.ok) {
    throw new Error(payload.message || `Failed to load wallet token settings: ${response.status}`)
  }

  return {
    address: payload.address || address,
    total_usd_value: Number(payload.total_usd_value || 0),
    chains: Array.isArray(payload.chains) ? payload.chains : [],
    result: Array.isArray(payload.result) ? payload.result : [],
    meta: {
      cached: Boolean(payload.meta?.cached),
      include_spam: Boolean(payload.meta?.include_spam),
      include_unselected: Boolean(payload.meta?.include_unselected),
      supported_chains: Array.isArray(payload.meta?.supported_chains) ? payload.meta.supported_chains : [],
      synced_at: payload.meta?.synced_at || null,
    },
  }
}

export async function saveWalletTokenSettings(
  address: string,
  payload: {
    chain: string
    selected_keys: string[]
    commissions?: Record<string, number>
  },
): Promise<WalletPortfolioResponse> {
  const response = await fetch(toApiUrl(`/api/wallet/${encodeURIComponent(address)}/tokens/settings`), {
    method: 'PUT',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const data = (await response.json()) as WalletPortfolioResponse & { message?: string }

  if (!response.ok) {
    throw new Error(data.message || `Failed to save wallet token settings: ${response.status}`)
  }

  return {
    address: data.address || address,
    total_usd_value: Number(data.total_usd_value || 0),
    chains: Array.isArray(data.chains) ? data.chains : [],
    result: Array.isArray(data.result) ? data.result : [],
    meta: {
      cached: Boolean(data.meta?.cached),
      include_spam: Boolean(data.meta?.include_spam),
      include_unselected: Boolean(data.meta?.include_unselected),
      supported_chains: Array.isArray(data.meta?.supported_chains) ? data.meta.supported_chains : [],
      synced_at: data.meta?.synced_at || null,
    },
  }
}

export async function resolveUserByWallet(address: string): Promise<{
  found: boolean
  user: ResolvedWalletUser | null
}> {
  const params = new URLSearchParams({
    address,
  })

  const response = await fetch(toApiUrl(`/api/auth/wallet/resolve?${params.toString()}`), {
    method: 'GET',
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to resolve user by wallet: ${response.status}`)
  }

  const payload = (await response.json()) as {
    found?: boolean
    user?: ResolvedWalletUser | null
  }

  return {
    found: Boolean(payload.found),
    user: payload.user ?? null,
  }
}

export async function getWalletSwapPrice(payload: {
  chain_id: string
  sell_token: string
  buy_token: string
  sell_amount: string
  address?: string
}): Promise<WalletSwapPriceResponse> {
  const response = await fetch(toApiUrl('/api/wallet/swap/price'), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const data = (await response.json()) as WalletSwapPriceResponse & { message?: string }
  if (!response.ok) {
    throw new Error(data.message || `Failed to fetch swap price: ${response.status}`)
  }

  return data
}

export async function getWalletSwapQuote(payload: {
  chain_id: string
  sell_token: string
  buy_token: string
  sell_amount: string
  taker: string
  slippage_bps?: number
}): Promise<WalletSwapQuoteResponse> {
  const response = await fetch(toApiUrl('/api/wallet/swap/quote'), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const data = (await response.json()) as WalletSwapQuoteResponse & { message?: string }
  if (!response.ok) {
    throw new Error(data.message || `Failed to fetch swap quote: ${response.status}`)
  }

  return data
}

export type RwaAdminCapRecord = {
  id: number
  network: string
  package_id: string
  admin_cap_id: string
  owner_address: string
  label: string
  tx_digest: string
  created_at: string | null
}

export async function getRwaAdminCaps(input: {
  network?: string
  packageId?: string
} = {}): Promise<RwaAdminCapRecord[]> {
  const params = new URLSearchParams()
  if (input.network) {
    params.set('network', input.network)
  }
  if (input.packageId) {
    params.set('package_id', input.packageId)
  }

  const response = await fetch(toApiUrl(`/api/rwa/admin-caps${params.toString() ? `?${params.toString()}` : ''}`), {
    method: 'GET',
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
    },
  })

  const payload = (await response.json()) as { data?: RwaAdminCapRecord[]; message?: string }
  if (!response.ok) {
    throw new Error(payload.message || `Failed to load RWA admin caps: ${response.status}`)
  }

  return Array.isArray(payload.data) ? payload.data : []
}

export async function saveRwaAdminCap(input: {
  network: string
  packageId: string
  adminCapId: string
  ownerAddress: string
  label?: string
  txDigest?: string
}): Promise<RwaAdminCapRecord> {
  const response = await fetch(toApiUrl('/api/rwa/admin-caps'), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      network: input.network,
      package_id: input.packageId,
      admin_cap_id: input.adminCapId,
      owner_address: input.ownerAddress,
      label: input.label || '',
      tx_digest: input.txDigest || '',
    }),
  })

  const payload = (await response.json()) as { data?: RwaAdminCapRecord; message?: string }
  if (!response.ok || !payload.data) {
    throw new Error(payload.message || `Failed to save RWA admin cap: ${response.status}`)
  }

  return payload.data
}

export async function deleteRwaAdminCap(id: number): Promise<void> {
  const response = await fetch(toApiUrl(`/api/rwa/admin-caps/${encodeURIComponent(String(id))}`), {
    method: 'DELETE',
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    let message = `Failed to delete RWA admin cap: ${response.status}`
    try {
      const payload = (await response.json()) as { message?: string }
      message = payload.message || message
    } catch {
      // Keep the HTTP status fallback.
    }
    throw new Error(message)
  }
}

export type FundTokenRecord = {
  id: number
  network: string
  package_id: string
  coin_type: string
  symbol: string
  name: string
  decimals: number
  target_weight_bps: number
  min_weight_bps: number
  max_weight_bps: number
  price_feed_id: string
  logo_url: string
  enabled: boolean
  notes: string
  created_at: string | null
  updated_at: string | null
}

export type FundTokenInput = {
  network: string
  packageId?: string
  coinType: string
  symbol: string
  name: string
  decimals: number
  targetWeightBps: number
  minWeightBps: number
  maxWeightBps: number
  priceFeedId?: string
  logoUrl?: string
  enabled: boolean
  notes?: string
}

function toFundTokenPayload(input: FundTokenInput): Record<string, unknown> {
  return {
    network: input.network,
    package_id: input.packageId || '',
    coin_type: input.coinType,
    symbol: input.symbol,
    name: input.name,
    decimals: input.decimals,
    target_weight_bps: input.targetWeightBps,
    min_weight_bps: input.minWeightBps,
    max_weight_bps: input.maxWeightBps,
    price_feed_id: input.priceFeedId || '',
    logo_url: input.logoUrl || '',
    enabled: input.enabled,
    notes: input.notes || '',
  }
}

async function parseApiError(response: Response, fallback: string): Promise<string> {
  try {
    const payload = (await response.json()) as { message?: string; errors?: Record<string, string[]> }
    const firstFieldError = payload.errors ? Object.values(payload.errors).flat()[0] : ''
    return firstFieldError || payload.message || fallback
  } catch {
    return fallback
  }
}

export async function getFundTokens(input: {
  network?: string
  packageId?: string
  includeDisabled?: boolean
} = {}): Promise<FundTokenRecord[]> {
  const params = new URLSearchParams()
  if (input.network) {
    params.set('network', input.network)
  }
  if (input.packageId) {
    params.set('package_id', input.packageId)
  }
  if (input.includeDisabled !== undefined) {
    params.set('include_disabled', input.includeDisabled ? '1' : '0')
  }

  const response = await fetch(toApiUrl(`/api/fund/tokens${params.toString() ? `?${params.toString()}` : ''}`), {
    method: 'GET',
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(await parseApiError(response, `Failed to load fund tokens: ${response.status}`))
  }

  const payload = (await response.json()) as { data?: FundTokenRecord[] }
  return Array.isArray(payload.data) ? payload.data : []
}

export async function saveFundToken(input: FundTokenInput, id?: number, options: { adminAddress?: string } = {}): Promise<FundTokenRecord> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  }
  if (options.adminAddress) {
    headers['X-Sui-Admin-Address'] = options.adminAddress
  }

  const response = await fetch(toApiUrl(id ? `/api/fund/tokens/${encodeURIComponent(String(id))}` : '/api/fund/tokens'), {
    method: id ? 'PUT' : 'POST',
    headers,
    body: JSON.stringify(toFundTokenPayload(input)),
  })

  if (!response.ok) {
    throw new Error(await parseApiError(response, `Failed to save fund token: ${response.status}`))
  }

  const payload = (await response.json()) as { data?: FundTokenRecord }
  if (!payload.data) {
    throw new Error('Fund token response is empty')
  }

  return payload.data
}

export async function deleteFundToken(id: number, options: { adminAddress?: string } = {}): Promise<void> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  }
  if (options.adminAddress) {
    headers['X-Sui-Admin-Address'] = options.adminAddress
  }

  const response = await fetch(toApiUrl(`/api/fund/tokens/${encodeURIComponent(String(id))}`), {
    method: 'DELETE',
    headers,
  })

  if (!response.ok) {
    throw new Error(await parseApiError(response, `Failed to delete fund token: ${response.status}`))
  }
}

export type FundPoolRecord = {
  id: number
  network: string
  package_id: string
  pool_registry_id: string
  pool_admin_cap_id: string
  pool_object_id: string
  pool_accounting_id: string
  basket_vault_id: string
  liquidity_wallet_address: string
  coin_type: string
  symbol: string
  name: string
  description: string
  risk_level: number
  target_apy_bps: number
  realized_apy_bps: number
  min_deposit_usdc: string
  min_av8_balance: string
  max_weight_bps: number
  active: boolean
  logo_url: string
  notes: string
  created_at: string | null
  updated_at: string | null
}

export type FundPoolInput = {
  network: string
  packageId?: string
  poolRegistryId?: string
  poolAdminCapId?: string
  poolObjectId: string
  poolAccountingId?: string
  basketVaultId?: string
  liquidityWalletAddress?: string
  coinType: string
  symbol: string
  name: string
  description?: string
  riskLevel: number
  targetApyBps: number
  realizedApyBps: number
  minDepositUsdc: string
  minAv8Balance: string
  maxWeightBps: number
  active: boolean
  logoUrl?: string
  notes?: string
}

function toFundPoolPayload(input: FundPoolInput): Record<string, unknown> {
  return {
    network: input.network,
    package_id: input.packageId || '',
    pool_registry_id: input.poolRegistryId || '',
    pool_admin_cap_id: input.poolAdminCapId || '',
    pool_object_id: input.poolObjectId,
    pool_accounting_id: input.poolAccountingId || '',
    basket_vault_id: input.basketVaultId || '',
    liquidity_wallet_address: input.liquidityWalletAddress || '',
    coin_type: input.coinType,
    symbol: input.symbol || 'USDC',
    name: input.name,
    description: input.description || '',
    risk_level: input.riskLevel,
    target_apy_bps: input.targetApyBps,
    realized_apy_bps: input.realizedApyBps,
    min_deposit_usdc: input.minDepositUsdc || '0',
    min_av8_balance: input.minAv8Balance || '0',
    max_weight_bps: input.maxWeightBps,
    active: input.active,
    logo_url: input.logoUrl || '',
    notes: input.notes || '',
  }
}

export async function getFundPools(input: {
  network?: string
  packageId?: string
  coinType?: string
  includeInactive?: boolean
} = {}): Promise<FundPoolRecord[]> {
  const params = new URLSearchParams()
  if (input.network) {
    params.set('network', input.network)
  }
  if (input.packageId) {
    params.set('package_id', input.packageId)
  }
  if (input.coinType) {
    params.set('coin_type', input.coinType)
  }
  if (input.includeInactive !== undefined) {
    params.set('include_inactive', input.includeInactive ? '1' : '0')
  }

  const response = await fetch(toApiUrl(`/api/fund/pools${params.toString() ? `?${params.toString()}` : ''}`), {
    method: 'GET',
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(await parseApiError(response, `Failed to load fund pools: ${response.status}`))
  }

  const payload = (await response.json()) as { data?: FundPoolRecord[] }
  return Array.isArray(payload.data) ? payload.data : []
}

export async function saveFundPool(input: FundPoolInput, id?: number, options: { adminAddress?: string } = {}): Promise<FundPoolRecord> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  }
  if (options.adminAddress) {
    headers['X-Sui-Admin-Address'] = options.adminAddress
  }

  const response = await fetch(toApiUrl(id ? `/api/fund/pools/${encodeURIComponent(String(id))}` : '/api/fund/pools'), {
    method: id ? 'PUT' : 'POST',
    headers,
    body: JSON.stringify(toFundPoolPayload(input)),
  })

  if (!response.ok) {
    throw new Error(await parseApiError(response, `Failed to save fund pool: ${response.status}`))
  }

  const payload = (await response.json()) as { data?: FundPoolRecord }
  if (!payload.data) {
    throw new Error('Fund pool response is empty')
  }

  return payload.data
}

export async function deleteFundPool(id: number, options: { adminAddress?: string } = {}): Promise<void> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  }
  if (options.adminAddress) {
    headers['X-Sui-Admin-Address'] = options.adminAddress
  }

  const response = await fetch(toApiUrl(`/api/fund/pools/${encodeURIComponent(String(id))}`), {
    method: 'DELETE',
    headers,
  })

  if (!response.ok) {
    throw new Error(await parseApiError(response, `Failed to delete fund pool: ${response.status}`))
  }
}

export type FundPoolEventRecord = {
  id: number
  network: string
  package_id: string
  event_type: 'deposit' | 'withdraw' | 'update' | string
  move_event_type: string
  tx_digest: string
  event_seq: number
  checkpoint: number | null
  pool_object_id: string
  owner_address: string
  amount_usdc: string
  pool_shares: string
  burned_pool_shares: string
  balance_usdc: string
  active: boolean | null
  target_apy_bps: number | null
  realized_apy_bps: number | null
  min_deposit_usdc: string | null
  max_weight_bps: number | null
  event_at: string | null
}

export type FundPoolChartPoint = {
  label: string
  event_at: string | null
  event_type: string
  tvl_usdc: string
  target_apy_bps: number | null
  realized_apy_bps: number | null
}

export async function getFundPoolEvents(idOrObjectId: number | string, input: { limit?: number } = {}): Promise<{
  pool: FundPoolRecord | null
  data: FundPoolEventRecord[]
  chart: FundPoolChartPoint[]
}> {
  const params = new URLSearchParams()
  if (input.limit !== undefined) {
    params.set('limit', String(input.limit))
  }

  const response = await fetch(toApiUrl(`/api/fund/pools/${encodeURIComponent(String(idOrObjectId))}/events${params.toString() ? `?${params.toString()}` : ''}`), {
    method: 'GET',
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(await parseApiError(response, `Failed to load fund pool events: ${response.status}`))
  }

  const payload = (await response.json()) as {
    pool?: FundPoolRecord
    data?: FundPoolEventRecord[]
    chart?: FundPoolChartPoint[]
  }

  return {
    pool: payload.pool || null,
    data: Array.isArray(payload.data) ? payload.data : [],
    chart: Array.isArray(payload.chart) ? payload.chart : [],
  }
}

export type FundShareSettingsRecord = {
  id: number | null
  network: string
  package_id: string
  share_config_id: string
  share_admin_cap_id: string
  share_treasury_cap_id: string
  pricing_model: 'nav_per_share' | 'manual_floor' | 'bonding_curve'
  mint_fee_bps: number
  redeem_fee_bps: number
  redeem_burn_bps: number
  price_impact_bps: number
  min_price_sui: string
  base_price_sui: string
  max_supply: string
  max_daily_mint: string
  mint_paused: boolean
  redeem_paused: boolean
  notes: string
  created_at: string | null
  updated_at: string | null
}

export type FundShareSettingsInput = {
  network: string
  packageId?: string
  shareConfigId?: string
  shareAdminCapId?: string
  shareTreasuryCapId?: string
  pricingModel: 'nav_per_share' | 'manual_floor' | 'bonding_curve'
  mintFeeBps: number
  redeemFeeBps: number
  redeemBurnBps: number
  priceImpactBps: number
  minPriceSui: string
  basePriceSui: string
  maxSupply: string
  maxDailyMint: string
  mintPaused: boolean
  redeemPaused: boolean
  notes?: string
}

function toFundShareSettingsPayload(input: FundShareSettingsInput): Record<string, unknown> {
  return {
    network: input.network,
    package_id: input.packageId || '',
    share_config_id: input.shareConfigId || '',
    share_admin_cap_id: input.shareAdminCapId || '',
    share_treasury_cap_id: input.shareTreasuryCapId || '',
    pricing_model: input.pricingModel,
    mint_fee_bps: input.mintFeeBps,
    redeem_fee_bps: input.redeemFeeBps,
    redeem_burn_bps: input.redeemBurnBps,
    price_impact_bps: input.priceImpactBps,
    min_price_sui: input.minPriceSui || '0',
    base_price_sui: input.basePriceSui || '0',
    max_supply: input.maxSupply || '0',
    max_daily_mint: input.maxDailyMint || '0',
    mint_paused: input.mintPaused,
    redeem_paused: input.redeemPaused,
    notes: input.notes || '',
  }
}

export async function getFundShareSettings(input: {
  network?: string
  packageId?: string
} = {}): Promise<FundShareSettingsRecord> {
  const params = new URLSearchParams()
  if (input.network) {
    params.set('network', input.network)
  }
  if (input.packageId) {
    params.set('package_id', input.packageId)
  }

  const response = await fetch(toApiUrl(`/api/fund/share-settings${params.toString() ? `?${params.toString()}` : ''}`), {
    method: 'GET',
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(await parseApiError(response, `Failed to load fund share settings: ${response.status}`))
  }

  const payload = (await response.json()) as { data?: FundShareSettingsRecord }
  if (!payload.data) {
    throw new Error('Fund share settings response is empty')
  }

  return payload.data
}

export async function saveFundShareSettings(input: FundShareSettingsInput, options: { adminAddress?: string } = {}): Promise<FundShareSettingsRecord> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  }
  if (options.adminAddress) {
    headers['X-Sui-Admin-Address'] = options.adminAddress
  }

  const response = await fetch(toApiUrl('/api/fund/share-settings'), {
    method: 'PUT',
    headers,
    body: JSON.stringify(toFundShareSettingsPayload(input)),
  })

  if (!response.ok) {
    throw new Error(await parseApiError(response, `Failed to save fund share settings: ${response.status}`))
  }

  const payload = (await response.json()) as { data?: FundShareSettingsRecord }
  if (!payload.data) {
    throw new Error('Fund share settings response is empty')
  }

  return payload.data
}
