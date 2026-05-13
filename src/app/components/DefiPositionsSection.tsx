import React from 'react';
import { useCurrentAccount, useCurrentWallet, useSuiClient } from '@mysten/dapp-kit';
import { isValidSuiAddress } from '@mysten/sui/utils';
import { ExternalLink, Info, MoreVertical, ScanSearch, Star } from 'lucide-react';

import { useI18n } from '../i18n';
import {
  EXTERNAL_WALLET_SESSION_EVENT,
  getExternalSessionAddress,
  hasStoredExternalWalletSession,
  readExternalWalletSession,
  type ExternalWalletSession,
} from '../lib/externalWalletSession';
import {
  getFundPools,
  getWalletProtocols,
  type FundPoolRecord,
  type TransparencyHolding,
  type WalletProtocolsResponse,
} from '../lib/api';
import { SUI_NETWORK } from '../config';
import type { HeaderNetwork } from '../lib/headerNetwork';
import {
  safeLocalStorageGetItem,
  safeLocalStorageRemoveItem,
} from '../lib/safeLocalStorage';
import { getInvestPath } from '../lib/routes';
import { SUI_FUND_CONFIG } from '../lib/suiFund';
import { TransparencyHoldingsList } from './TransparencyHoldingsList';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

const ACTIVE_WALLET_KEY = 'av8fund.active-wallet';
const ACTIVE_WALLET_EVENT = 'av8fund:active-wallet';
const ACTIVE_WALLET_REFRESH_EVENT = 'av8fund:active-wallet-refresh';
const ARBITRUM_RPC_URL = 'https://arb1.arbitrum.io/rpc';
const GMX_API_BASE = 'https://arbitrum-api.gmxinfra.io';
const AAVE_GRAPHQL_URL = 'https://api.v3.aave.com/graphql';
const MORPHO_GRAPHQL_URL = 'https://api.morpho.org/graphql';
const ERC20_BALANCE_OF_SELECTOR = '0x70a08231';
const ERC20_DECIMALS_SELECTOR = '0x313ce567';
const FUND_POSITION_TYPE = `${SUI_FUND_CONFIG.packageId}::fund_core::FundPosition`;

type ActiveWalletState = {
  address: string;
  network?: string | null;
  isSui?: boolean;
};

type GmxMarketInfo = {
  name?: string;
  marketToken?: string;
  longToken?: string;
  shortToken?: string;
  fundingRateLong?: string;
  fundingRateShort?: string;
  borrowingRateLong?: string;
  borrowingRateShort?: string;
  netRateLong?: string;
  netRateShort?: string;
};

type GmxGlvInfo = {
  name?: string;
  glvToken?: string;
  longToken?: string;
  shortToken?: string;
  markets?: Array<{
    address?: string;
    balance?: string;
    balanceUsd?: string;
    share?: string;
  }>;
};

type GmxTicker = {
  tokenAddress?: string;
  tokenSymbol?: string;
  minPrice?: string;
  maxPrice?: string;
};

type GmxDetails = {
  tokenKind: 'GM' | 'GLV';
  tokenAddress: string | null;
  tokenBalance: number | null;
  tokenPriceUsd: number | null;
  positionValueUsd: number | null;
  priceSource: string;
  marketName: string | null;
  longToken: string | null;
  shortToken: string | null;
  fundingRate: string | null;
  borrowingRate: string | null;
  glvMarkets: Array<{
    address: string;
    balance: number | null;
    balanceUsd: number | null;
    share: number | null;
  }>;
};

type AaveApyValue = {
  formatted?: string | null;
  value?: string | number | null;
};

type AaveReserveInfo = {
  underlyingToken?: {
    symbol?: string | null;
    name?: string | null;
  } | null;
  supplyInfo?: {
    apy?: AaveApyValue | null;
    canBeCollateral?: boolean | null;
  } | null;
  borrowInfo?: {
    apy?: AaveApyValue | null;
  } | null;
  userState?: {
    balance?: {
      amount?: {
        value?: string | number | null;
      } | null;
    } | null;
    debt?: {
      amount?: {
        value?: string | number | null;
      } | null;
    } | null;
    usingAsCollateral?: boolean | null;
  } | null;
};

type AaveMarketInfo = {
  name?: string | null;
  address?: string | null;
  chain?: {
    name?: string | null;
    chainId?: number | null;
  } | null;
  totalMarketSize?: string | number | null;
  totalAvailableLiquidity?: string | number | null;
  userState?: {
    netWorth?: string | number | null;
    netAPY?: AaveApyValue | null;
    healthFactor?: string | number | null;
    eModeEnabled?: boolean | null;
    totalCollateralBase?: string | number | null;
    totalDebtBase?: string | number | null;
    availableBorrowsBase?: string | number | null;
  } | null;
  reserves?: AaveReserveInfo[];
};

type AaveDetails = {
  marketName: string | null;
  chainName: string | null;
  positionName: string;
  positionKind: string;
  amount: number | null;
  usdValue: number;
  supplyApy: string | null;
  borrowApy: string | null;
  netApy: string | null;
  healthFactor: string | null;
  netWorth: number | null;
  totalCollateral: number | null;
  totalDebt: number | null;
  availableBorrows: number | null;
  eModeEnabled: boolean | null;
  canBeCollateral: boolean | null;
  usingAsCollateral: boolean | null;
  totalMarketSize: number | null;
  totalAvailableLiquidity: number | null;
  dataSource: string;
};

type MorphoAssetInfo = {
  symbol?: string | null;
  address?: string | null;
};

type MorphoPositionState = {
  supplyAssets?: string | number | null;
  supplyAssetsUsd?: string | number | null;
  borrowAssets?: string | number | null;
  borrowAssetsUsd?: string | number | null;
  collateral?: string | number | null;
  collateralUsd?: string | number | null;
  assets?: string | number | null;
  assetsUsd?: string | number | null;
  shares?: string | number | null;
};

type MorphoMarketPosition = {
  market?: {
    marketId?: string | null;
    lltv?: string | number | null;
    loanAsset?: MorphoAssetInfo | null;
    collateralAsset?: MorphoAssetInfo | null;
    state?: {
      borrowApy?: string | number | null;
      supplyApy?: string | number | null;
      utilization?: string | number | null;
      liquidityAssetsUsd?: string | number | null;
      supplyAssetsUsd?: string | number | null;
      borrowAssetsUsd?: string | number | null;
      collateralAssetsUsd?: string | number | null;
    } | null;
  } | null;
  state?: MorphoPositionState | null;
};

type MorphoVaultPosition = {
  vault?: {
    address?: string | null;
    name?: string | null;
    symbol?: string | null;
    asset?: MorphoAssetInfo | null;
    state?: {
      apy?: string | number | null;
      netApy?: string | number | null;
      totalAssetsUsd?: string | number | null;
      liquidity?: string | number | null;
    } | null;
  } | null;
  state?: MorphoPositionState | null;
};

type MorphoDetails = {
  positionName: string;
  positionKind: string;
  chainName: string | null;
  amount: number | null;
  usdValue: number;
  supplyApy: string | null;
  borrowApy: string | null;
  netApy: string | null;
  healthFactor: string | null;
  collateralUsd: number | null;
  borrowUsd: number | null;
  supplyUsd: number | null;
  lltv: string | null;
  utilization: string | null;
  liquidityUsd: number | null;
  marketSizeUsd: number | null;
  loanAsset: string | null;
  collateralAsset: string | null;
  marketId: string | null;
  dataSource: string;
};

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

function walletLooksLikeSolana(address: string): boolean {
  const trimmed = String(address || '').trim();
  return trimmed !== '' && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(trimmed);
}

function walletLooksLikeSui(address: string): boolean {
  const trimmed = String(address || '').trim();
  if (trimmed === '') {
    return false;
  }
  if (walletLooksLikeSolana(trimmed)) {
    return false;
  }
  return isValidSuiAddress(trimmed);
}

function readActiveWallet(): ActiveWalletState | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = safeLocalStorageGetItem(ACTIVE_WALLET_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as ActiveWalletState;
  } catch {
    safeLocalStorageRemoveItem(ACTIVE_WALLET_KEY);
    return null;
  }
}

function flattenProtocolHoldings(protocols: WalletProtocolsResponse): TransparencyHolding[] {
  return Object.entries(protocols)
    .flatMap(([protocolKey, protocol]) => {
      const protocolName = protocol.name || protocolKey || 'Protocol';

      const tokenItems = protocol.tokens.map((item, index) => ({
        type: 'defi' as const,
        id: `${protocolKey}:token:${index}`,
        name: `${protocolName} · ${item.name}`,
        symbol: item.symbol || null,
        chain: item.chain || 'defi',
        usd_value: Math.abs(Number(item.usd_value || 0)),
        amount: item.balance ?? null,
        price: item.price ?? null,
        apy: item.apy ?? null,
        collateral: item.collateral ?? null,
        logo_url: protocol.icon || null,
        link: item.link || protocol.url || null,
        protocol_key: protocolKey,
        protocol_name: protocolName,
        position_kind: 'token' as const,
        position_type: item.position_type || null,
        protocol_module: item.protocol_module || null,
      }));

      const poolItems = protocol.pools.map((item, index) => ({
        type: 'defi' as const,
        id: `${protocolKey}:pool:${index}`,
        name: `${protocolName} · ${item.name}`,
        symbol: item.symbol || null,
        chain: item.chain || 'defi',
        usd_value: Math.abs(Number(item.usd_value || 0)),
        amount: item.total_liquidity ?? null,
        price: null,
        apy: item.apy ?? null,
        logo_url: protocol.icon || null,
        link: item.link || protocol.url || null,
        protocol_key: protocolKey,
        protocol_name: protocolName,
        position_kind: 'pool' as const,
        position_type: item.position_type || null,
        protocol_module: item.protocol_module || null,
      }));

      const loanItems = protocol.loans.map((item, index) => ({
        type: 'defi' as const,
        id: `${protocolKey}:loan:${index}`,
        name: `${protocolName} · ${item.name}`,
        symbol: item.symbol || null,
        chain: item.chain || 'defi',
        usd_value: Math.abs(Number(item.usd_value || 0)),
        amount: item.balance ?? null,
        price: null,
        apy: item.apy ?? null,
        side: item.side ?? null,
        logo_url: protocol.icon || null,
        link: item.link || protocol.url || null,
        protocol_key: protocolKey,
        protocol_name: protocolName,
        position_kind: 'loan' as const,
        position_type: item.position_type || null,
        protocol_module: item.protocol_module || null,
      }));

      return [...tokenItems, ...poolItems, ...loanItems];
    })
    .filter((item) => item.usd_value > 0)
    .sort((left, right) => right.usd_value - left.usd_value);
}

async function fetchGmxJson<T>(path: string): Promise<T> {
  const response = await fetch(`${GMX_API_BASE}${path}`, {
    method: 'GET',
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`GMX API request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

async function ethCall(to: string, data: string): Promise<string> {
  const response = await fetch(ARBITRUM_RPC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_call',
      params: [{ to, data }, 'latest'],
    }),
  });
  const payload = (await response.json()) as { result?: string; error?: { message?: string } };

  if (!response.ok || payload.error || !payload.result) {
    throw new Error(payload.error?.message || 'Arbitrum RPC request failed.');
  }

  return payload.result;
}

async function readErc20Balance(tokenAddress: string, walletAddress: string): Promise<number | null> {
  try {
    const normalizedWallet = normalizeWalletAddress(walletAddress).replace(/^0x/, '');
    if (!/^([0-9a-f]{40})$/.test(normalizedWallet)) {
      return null;
    }

    const [balanceHex, decimalsHex] = await Promise.all([
      ethCall(tokenAddress, `${ERC20_BALANCE_OF_SELECTOR}${normalizedWallet.padStart(64, '0')}`),
      ethCall(tokenAddress, ERC20_DECIMALS_SELECTOR),
    ]);
    const balance = BigInt(balanceHex);
    const decimals = Number(BigInt(decimalsHex));

    return formatUnitsToNumber(balance, Number.isFinite(decimals) ? decimals : 18);
  } catch {
    return null;
  }
}

function formatUnitsToNumber(value: bigint, decimals: number): number {
  const divisor = 10n ** BigInt(Math.max(0, decimals));
  const whole = value / divisor;
  const fraction = value % divisor;
  const paddedFraction = fraction.toString().padStart(Math.max(0, decimals), '0').slice(0, 8);

  return Number(`${whole.toString()}.${paddedFraction || '0'}`);
}

function parseGmxUsd(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return null;
  }

  return numeric / 1e30;
}

function parseGmxTokenAmount(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return null;
  }

  return numeric / 1e18;
}

function parseGmxShare(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return null;
  }

  return numeric / 1e28;
}

function normalizeSearchText(value: string | null | undefined): string {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function isGlvAsset(asset: TransparencyHolding): boolean {
  const text = normalizeSearchText(`${asset.name} ${asset.symbol || ''}`);
  return text.includes('glv');
}

function findMatchingMarket(asset: TransparencyHolding, markets: GmxMarketInfo[]): GmxMarketInfo | null {
  const assetText = normalizeSearchText(`${asset.name} ${asset.symbol || ''}`);

  return markets.find((market) => {
    const marketText = normalizeSearchText(market.name);
    const token = normalizeWalletAddress(market.marketToken);

    return (marketText !== '' && (assetText.includes(marketText) || marketText.includes(assetText)))
      || (token !== '' && assetText.includes(token));
  }) || markets.find((market) => {
    const marketText = normalizeSearchText(market.name);
    return marketText !== '' && marketText.split(' ').some((part) => part.length > 2 && assetText.includes(part));
  }) || null;
}

function findMatchingGlv(asset: TransparencyHolding, glvs: GmxGlvInfo[]): GmxGlvInfo | null {
  const assetText = normalizeSearchText(`${asset.name} ${asset.symbol || ''}`);

  return glvs.find((glv) => {
    const glvText = normalizeSearchText(glv.name);
    const token = normalizeWalletAddress(glv.glvToken);

    return (glvText !== '' && (assetText.includes(glvText) || glvText.includes(assetText)))
      || (token !== '' && assetText.includes(token));
  }) || null;
}

function resolveTickerPrice(tokenAddress: string | null, tickers: GmxTicker[]): number | null {
  if (!tokenAddress) {
    return null;
  }

  const normalizedAddress = normalizeWalletAddress(tokenAddress);
  const ticker = tickers.find((item) => normalizeWalletAddress(item.tokenAddress) === normalizedAddress);
  if (!ticker) {
    return null;
  }

  const minPrice = parseGmxUsd(ticker.minPrice);
  const maxPrice = parseGmxUsd(ticker.maxPrice);
  if (minPrice === null && maxPrice === null) {
    return null;
  }

  return ((minPrice || 0) + (maxPrice || minPrice || 0)) / (minPrice !== null && maxPrice !== null ? 2 : 1);
}

function formatRate(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return null;
  }

  return `${(numeric / 1e28).toFixed(4)}%`;
}

async function loadGmxDetails(asset: TransparencyHolding, walletAddress: string): Promise<GmxDetails> {
  const [{ markets }, { glvs }, tickers] = await Promise.all([
    fetchGmxJson<{ markets: GmxMarketInfo[] }>('/markets/info'),
    fetchGmxJson<{ glvs: GmxGlvInfo[] }>('/glvs/info'),
    fetchGmxJson<GmxTicker[]>('/prices/tickers'),
  ]);
  const isGlv = isGlvAsset(asset);
  const glv = isGlv ? findMatchingGlv(asset, glvs || []) : null;
  const market = isGlv ? null : findMatchingMarket(asset, markets || []);
  const tokenAddress = glv?.glvToken || market?.marketToken || null;
  const tokenBalance = tokenAddress ? await readErc20Balance(tokenAddress, walletAddress) : null;
  const tickerPrice = resolveTickerPrice(tokenAddress, tickers || []);
  const fallbackPositionPrice = asset.amount && asset.amount > 0
    ? asset.usd_value / asset.amount
    : asset.price ?? null;
  const tokenPriceUsd = tickerPrice ?? fallbackPositionPrice;
  const positionValueUsd = tokenBalance !== null && tokenPriceUsd !== null
    ? tokenBalance * tokenPriceUsd
    : asset.usd_value;

  return {
    tokenKind: isGlv ? 'GLV' : 'GM',
    tokenAddress,
    tokenBalance,
    tokenPriceUsd,
    positionValueUsd,
    priceSource: tickerPrice !== null
      ? 'GMX /prices/tickers'
      : fallbackPositionPrice !== null
        ? 'Portfolio position estimate'
        : 'Reader.getMarketTokenPrice / GlvReader.getGlvTokenPrice required',
    marketName: glv?.name || market?.name || asset.name,
    longToken: glv?.longToken || market?.longToken || null,
    shortToken: glv?.shortToken || market?.shortToken || null,
    fundingRate: formatRate(market?.fundingRateLong || market?.fundingRateShort || market?.netRateLong || market?.netRateShort),
    borrowingRate: formatRate(market?.borrowingRateLong || market?.borrowingRateShort),
    glvMarkets: (glv?.markets || []).map((item) => ({
      address: item.address || '',
      balance: parseGmxTokenAmount(item.balance),
      balanceUsd: parseGmxUsd(item.balanceUsd),
      share: parseGmxShare(item.share),
    })).filter((item) => item.address !== ''),
  };
}

function resolveAaveChainIds(chain: string | null | undefined): number[] {
  const normalized = String(chain || '').trim().toLowerCase();
  const chainMap: Record<string, number> = {
    ethereum: 1,
    eth: 1,
    polygon: 137,
    optimism: 10,
    arbitrum: 42161,
    avalanche: 43114,
    base: 8453,
    'binance-smart-chain': 56,
    bsc: 56,
    gnosis: 100,
    scroll: 534352,
    metis: 1088,
  };

  return chainMap[normalized] ? [chainMap[normalized]] : [1, 42161, 137, 10, 8453, 43114];
}

function resolveChainIds(chain: string | null | undefined): number[] {
  const normalized = String(chain || '').trim().toLowerCase();
  const chainMap: Record<string, number> = {
    ethereum: 1,
    eth: 1,
    polygon: 137,
    optimism: 10,
    arbitrum: 42161,
    avalanche: 43114,
    base: 8453,
    'binance-smart-chain': 56,
    bsc: 56,
    gnosis: 100,
    scroll: 534352,
    metis: 1088,
    unichain: 130,
    world: 480,
  };

  return chainMap[normalized] ? [chainMap[normalized]] : [1, 8453, 42161, 137, 10];
}

async function fetchAaveMarkets(walletAddress: string, chainIds: number[]): Promise<AaveMarketInfo[]> {
  const query = `
    query AaveMarkets($chainIds: [ChainId!], $user: EvmAddress) {
      markets(request: { chainIds: $chainIds, user: $user }) {
        name
        address
        chain {
          name
          chainId
        }
        totalMarketSize
        totalAvailableLiquidity
        userState {
          netWorth
          netAPY {
            value
            formatted
          }
          healthFactor
          eModeEnabled
          totalCollateralBase
          totalDebtBase
          availableBorrowsBase
        }
        reserves {
          underlyingToken {
            symbol
            name
          }
          supplyInfo {
            apy {
              value
              formatted
            }
            canBeCollateral
          }
          borrowInfo {
            apy {
              value
              formatted
            }
          }
          userState {
            balance {
              amount {
                value
              }
            }
            canBeCollateral
          }
        }
      }
    }
  `;
  const response = await fetch(AAVE_GRAPHQL_URL, {
    method: 'POST',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      query,
      variables: {
        chainIds,
        user: walletAddress,
      },
    }),
  });
  const payload = (await response.json()) as {
    data?: { markets?: AaveMarketInfo[] };
    errors?: Array<{ message?: string }>;
  };

  if (!response.ok || payload.errors?.length) {
    throw new Error(payload.errors?.[0]?.message || `Aave GraphQL request failed: ${response.status}`);
  }

  return payload.data?.markets || [];
}

function parseNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function formatApy(value: AaveApyValue | number | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'number') {
    return `${value.toFixed(2)}%`;
  }

  if (value.formatted) {
    return `${value.formatted}%`;
  }

  const numeric = parseNumber(value.value);
  if (numeric === null) {
    return null;
  }

  return `${(numeric * 100).toFixed(2)}%`;
}

function findAaveMarket(asset: TransparencyHolding, markets: AaveMarketInfo[]): AaveMarketInfo | null {
  const activeMarkets = markets.filter((market) => market.userState || (market.reserves || []).some((reserve) => reserve.userState?.balance));
  const preferred = activeMarkets.length > 0 ? activeMarkets : markets;
  const assetText = normalizeSearchText(`${asset.name} ${asset.symbol || ''}`);

  return preferred.find((market) => normalizeSearchText(market.name).includes('aave')
    && (asset.chain === '' || String(market.chain?.chainId || '') !== '')) || preferred.find((market) => {
    const marketText = normalizeSearchText(market.name);
    return marketText !== '' && assetText.includes(marketText);
  }) || preferred[0] || null;
}

function findAaveReserve(asset: TransparencyHolding, market: AaveMarketInfo | null): AaveReserveInfo | null {
  const symbol = normalizeSearchText(asset.symbol);
  const assetName = normalizeSearchText(asset.name);

  return (market?.reserves || []).find((reserve) => {
    const reserveSymbol = normalizeSearchText(reserve.underlyingToken?.symbol);
    const reserveName = normalizeSearchText(reserve.underlyingToken?.name);

    return (symbol !== '' && reserveSymbol === symbol)
      || (reserveSymbol !== '' && assetName.includes(reserveSymbol))
      || (reserveName !== '' && assetName.includes(reserveName));
  }) || null;
}

async function loadAaveDetails(asset: TransparencyHolding, walletAddress: string): Promise<AaveDetails> {
  const fallback: AaveDetails = {
    marketName: asset.protocol_name || 'Aave',
    chainName: asset.chain ? asset.chain.toUpperCase() : null,
    positionName: asset.name,
    positionKind: asset.side || asset.position_type || asset.position_kind || 'position',
    amount: asset.amount ?? null,
    usdValue: asset.usd_value,
    supplyApy: asset.position_kind === 'loan' ? null : formatApy(asset.apy ?? null),
    borrowApy: asset.position_kind === 'loan' ? formatApy(asset.apy ?? null) : null,
    netApy: null,
    healthFactor: null,
    netWorth: null,
    totalCollateral: null,
    totalDebt: null,
    availableBorrows: null,
    eModeEnabled: null,
    canBeCollateral: asset.collateral ?? null,
    usingAsCollateral: asset.collateral ?? null,
    totalMarketSize: null,
    totalAvailableLiquidity: null,
    dataSource: 'Portfolio position snapshot',
  };

  try {
    const markets = await fetchAaveMarkets(walletAddress, resolveAaveChainIds(asset.chain));
    const market = findAaveMarket(asset, markets);
    const reserve = findAaveReserve(asset, market);
    const userState = market?.userState;

    return {
      ...fallback,
      marketName: market?.name || fallback.marketName,
      chainName: market?.chain?.name || fallback.chainName,
      supplyApy: formatApy(reserve?.supplyInfo?.apy) || fallback.supplyApy,
      borrowApy: formatApy(reserve?.borrowInfo?.apy) || fallback.borrowApy,
      netApy: formatApy(userState?.netAPY) || null,
      healthFactor: userState?.healthFactor !== null && userState?.healthFactor !== undefined
        ? String(userState.healthFactor)
        : null,
      netWorth: parseNumber(userState?.netWorth),
      totalCollateral: parseNumber(userState?.totalCollateralBase),
      totalDebt: parseNumber(userState?.totalDebtBase),
      availableBorrows: parseNumber(userState?.availableBorrowsBase),
      eModeEnabled: userState?.eModeEnabled ?? null,
      canBeCollateral: reserve?.supplyInfo?.canBeCollateral ?? reserve?.userState?.canBeCollateral ?? fallback.canBeCollateral,
      usingAsCollateral: reserve?.userState?.canBeCollateral ?? fallback.usingAsCollateral,
      totalMarketSize: parseNumber(market?.totalMarketSize),
      totalAvailableLiquidity: parseNumber(market?.totalAvailableLiquidity),
      dataSource: 'Aave GraphQL + portfolio snapshot',
    };
  } catch {
    return fallback;
  }
}

async function fetchMorphoUser(walletAddress: string, chainId: number): Promise<{
  marketPositions?: MorphoMarketPosition[];
  vaultPositions?: MorphoVaultPosition[];
} | null> {
  const query = `
    query MorphoUser($chainId: Int!, $address: String!) {
      userByAddress(chainId: $chainId, address: $address) {
        marketPositions {
          market {
            marketId
            lltv
            loanAsset {
              symbol
              address
            }
            collateralAsset {
              symbol
              address
            }
            state {
              borrowApy
              supplyApy
              utilization
              liquidityAssetsUsd
              supplyAssetsUsd
              borrowAssetsUsd
              collateralAssetsUsd
            }
          }
          state {
            supplyAssets
            supplyAssetsUsd
            borrowAssets
            borrowAssetsUsd
            collateral
            collateralUsd
          }
        }
        vaultPositions {
          vault {
            address
            name
            symbol
            asset {
              symbol
              address
            }
            state {
              apy
              netApy
              totalAssetsUsd
              liquidity
            }
          }
          state {
            assets
            assetsUsd
            shares
          }
        }
      }
    }
  `;
  const response = await fetch(MORPHO_GRAPHQL_URL, {
    method: 'POST',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      query,
      variables: {
        chainId,
        address: walletAddress,
      },
    }),
  });
  const payload = (await response.json()) as {
    data?: {
      userByAddress?: {
        marketPositions?: MorphoMarketPosition[];
        vaultPositions?: MorphoVaultPosition[];
      } | null;
    };
    errors?: Array<{ message?: string }>;
  };

  if (!response.ok || payload.errors?.length) {
    throw new Error(payload.errors?.[0]?.message || `Morpho GraphQL request failed: ${response.status}`);
  }

  return payload.data?.userByAddress || null;
}

function formatPercentDecimal(value: string | number | null | undefined): string | null {
  const numeric = parseNumber(value);
  if (numeric === null) {
    return null;
  }

  return `${(numeric * 100).toFixed(2)}%`;
}

function findMorphoMarketPosition(asset: TransparencyHolding, positions: MorphoMarketPosition[]): MorphoMarketPosition | null {
  const assetText = normalizeSearchText(`${asset.name} ${asset.symbol || ''}`);

  return positions.find((position) => {
    const loanSymbol = normalizeSearchText(position.market?.loanAsset?.symbol);
    const collateralSymbol = normalizeSearchText(position.market?.collateralAsset?.symbol);
    const marketId = normalizeSearchText(position.market?.marketId);

    return (loanSymbol !== '' && assetText.includes(loanSymbol))
      || (collateralSymbol !== '' && assetText.includes(collateralSymbol))
      || (marketId !== '' && assetText.includes(marketId));
  }) || positions.find((position) => {
    const state = position.state;
    return Number(state?.supplyAssetsUsd || 0) > 0
      || Number(state?.borrowAssetsUsd || 0) > 0
      || Number(state?.collateralUsd || 0) > 0;
  }) || null;
}

function findMorphoVaultPosition(asset: TransparencyHolding, positions: MorphoVaultPosition[]): MorphoVaultPosition | null {
  const assetText = normalizeSearchText(`${asset.name} ${asset.symbol || ''}`);

  return positions.find((position) => {
    const vaultName = normalizeSearchText(position.vault?.name);
    const vaultSymbol = normalizeSearchText(position.vault?.symbol);
    const assetSymbol = normalizeSearchText(position.vault?.asset?.symbol);

    return (vaultSymbol !== '' && assetText.includes(vaultSymbol))
      || (assetSymbol !== '' && assetText.includes(assetSymbol))
      || (vaultName !== '' && assetText.includes(vaultName));
  }) || positions.find((position) => Number(position.state?.assetsUsd || 0) > 0) || null;
}

function estimateMorphoHealthFactor(collateralUsd: number | null, borrowUsd: number | null, lltv: string | null): string | null {
  const lltvNumber = parseNumber(lltv);
  if (!collateralUsd || !borrowUsd || !lltvNumber || borrowUsd <= 0) {
    return null;
  }

  return ((collateralUsd * lltvNumber) / borrowUsd).toFixed(2);
}

async function loadMorphoDetails(asset: TransparencyHolding, walletAddress: string): Promise<MorphoDetails> {
  const fallback: MorphoDetails = {
    positionName: asset.name,
    positionKind: asset.side || asset.position_type || asset.position_kind || 'position',
    chainName: asset.chain ? asset.chain.toUpperCase() : null,
    amount: asset.amount ?? null,
    usdValue: asset.usd_value,
    supplyApy: asset.position_kind === 'loan' ? null : formatApy(asset.apy ?? null),
    borrowApy: asset.position_kind === 'loan' ? formatApy(asset.apy ?? null) : null,
    netApy: null,
    healthFactor: null,
    collateralUsd: asset.collateral ? asset.usd_value : null,
    borrowUsd: asset.position_kind === 'loan' ? asset.usd_value : null,
    supplyUsd: asset.position_kind !== 'loan' ? asset.usd_value : null,
    lltv: null,
    utilization: null,
    liquidityUsd: null,
    marketSizeUsd: null,
    loanAsset: asset.symbol || null,
    collateralAsset: null,
    marketId: null,
    dataSource: 'Portfolio position snapshot',
  };

  for (const chainId of resolveChainIds(asset.chain)) {
    try {
      const user = await fetchMorphoUser(walletAddress, chainId);
      const marketPosition = findMorphoMarketPosition(asset, user?.marketPositions || []);
      const vaultPosition = findMorphoVaultPosition(asset, user?.vaultPositions || []);

      if (!marketPosition && !vaultPosition) {
        continue;
      }

      if (vaultPosition) {
        const vaultState = vaultPosition.vault?.state;
        const positionState = vaultPosition.state;

        return {
          ...fallback,
          positionName: vaultPosition.vault?.name || fallback.positionName,
          positionKind: 'vault',
          chainName: `Chain ${chainId}`,
          amount: parseNumber(positionState?.assets) ?? fallback.amount,
          usdValue: parseNumber(positionState?.assetsUsd) ?? fallback.usdValue,
          supplyApy: formatPercentDecimal(vaultState?.apy) || fallback.supplyApy,
          netApy: formatPercentDecimal(vaultState?.netApy) || null,
          supplyUsd: parseNumber(positionState?.assetsUsd) ?? fallback.supplyUsd,
          liquidityUsd: parseNumber(vaultState?.liquidity),
          marketSizeUsd: parseNumber(vaultState?.totalAssetsUsd),
          loanAsset: vaultPosition.vault?.asset?.symbol || vaultPosition.vault?.symbol || fallback.loanAsset,
          marketId: vaultPosition.vault?.address || null,
          dataSource: 'Morpho GraphQL + portfolio snapshot',
        };
      }

      const state = marketPosition?.state;
      const marketState = marketPosition?.market?.state;
      const collateralUsd = parseNumber(state?.collateralUsd);
      const borrowUsd = parseNumber(state?.borrowAssetsUsd);
      const lltv = marketPosition?.market?.lltv !== null && marketPosition?.market?.lltv !== undefined
        ? String(marketPosition.market.lltv)
        : null;

      return {
        ...fallback,
        positionName: `${marketPosition?.market?.loanAsset?.symbol || 'Loan'} / ${marketPosition?.market?.collateralAsset?.symbol || 'Collateral'}`,
        positionKind: borrowUsd && borrowUsd > 0 ? 'borrow market' : 'supply market',
        chainName: `Chain ${chainId}`,
        amount: parseNumber(state?.supplyAssets) ?? parseNumber(state?.borrowAssets) ?? parseNumber(state?.collateral) ?? fallback.amount,
        usdValue: parseNumber(state?.supplyAssetsUsd) ?? parseNumber(state?.borrowAssetsUsd) ?? collateralUsd ?? fallback.usdValue,
        supplyApy: formatPercentDecimal(marketState?.supplyApy) || fallback.supplyApy,
        borrowApy: formatPercentDecimal(marketState?.borrowApy) || fallback.borrowApy,
        healthFactor: estimateMorphoHealthFactor(collateralUsd, borrowUsd, lltv),
        collateralUsd,
        borrowUsd,
        supplyUsd: parseNumber(state?.supplyAssetsUsd),
        lltv: formatPercentDecimal(lltv),
        utilization: formatPercentDecimal(marketState?.utilization),
        liquidityUsd: parseNumber(marketState?.liquidityAssetsUsd),
        marketSizeUsd: parseNumber(marketState?.supplyAssetsUsd),
        loanAsset: marketPosition?.market?.loanAsset?.symbol || fallback.loanAsset,
        collateralAsset: marketPosition?.market?.collateralAsset?.symbol || null,
        marketId: marketPosition?.market?.marketId || null,
        dataSource: 'Morpho GraphQL + portfolio snapshot',
      };
    } catch {
      // Try the next likely chain before falling back to Zerion snapshot fields.
    }
  }

  return fallback;
}

function formatUsd(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return 'N/A';
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value);
}

function formatNumber(value: number | null | undefined, suffix = ''): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return 'N/A';
  }

  return `${new Intl.NumberFormat('en-US', {
    maximumFractionDigits: value >= 1 ? 4 : 8,
  }).format(value)}${suffix}`;
}

function formatCompactUsd(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return 'N/A';
  }

  const abs = Math.abs(value);
  const suffix = abs >= 1_000_000_000 ? 'b' : abs >= 1_000_000 ? 'm' : abs >= 1_000 ? 'k' : '';
  const divisor = suffix === 'b' ? 1_000_000_000 : suffix === 'm' ? 1_000_000 : suffix === 'k' ? 1_000 : 1;
  const compact = value / divisor;

  return `$${new Intl.NumberFormat('en-US', {
    maximumFractionDigits: suffix ? 2 : 2,
    minimumFractionDigits: suffix ? 2 : 0,
  }).format(compact)}${suffix}`;
}

function formatPoolShares(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '0 AV8';
  }

  return `${new Intl.NumberFormat('en-US', {
    maximumFractionDigits: value >= 1000 ? 2 : value >= 1 ? 4 : 6,
  }).format(value)} AV8`;
}

function formatPercentValue(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return 'N/A';
  }

  return `${value.toFixed(2)}%`;
}

function buildSnapshotPoints(seedInput: string, trend: number | null | undefined): string {
  const seed = Array.from(seedInput).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const positiveTrend = Number.isFinite(trend) ? Number(trend) >= 0 : true;
  const points = Array.from({ length: 28 }, (_, index) => {
    const wave = Math.sin((index + seed) * 0.55) * 4;
    const jitter = ((seed + index * 17) % 9) - 4;
    const drift = positiveTrend ? index * 0.9 : -index * 0.55;
    const y = 34 - drift - wave - jitter;
    return {
      x: index * 5,
      y: Math.max(7, Math.min(45, y)),
    };
  });

  return points.map((point) => `${point.x},${point.y}`).join(' ');
}

function shortAddress(address: string | null | undefined): string {
  const normalized = String(address || '').trim();
  if (normalized.length <= 16) {
    return normalized || 'N/A';
  }

  return `${normalized.slice(0, 8)}...${normalized.slice(-6)}`;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function readBigInt(value: unknown): bigint {
  if (typeof value === 'bigint') {
    return value;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return BigInt(Math.trunc(value));
  }
  if (typeof value === 'string' && /^\d+$/.test(value)) {
    return BigInt(value);
  }

  const fields = asRecord(value).fields;
  if (fields) {
    return readBigInt(asRecord(fields).value);
  }

  return 0n;
}

function readObjectId(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  const record = asRecord(value);
  const id = record.id ?? record.bytes ?? record.objectId;
  if (typeof id === 'string') {
    return id;
  }

  const fields = asRecord(record.fields);
  const nested = fields.id ?? fields.bytes ?? fields.value;
  return typeof nested === 'string' ? nested : '';
}

function readMoveFields(objectData: unknown): Record<string, unknown> {
  return asRecord(asRecord(asRecord(objectData).content).fields);
}

function readVecMapEntries(value: unknown): Array<{ key: unknown; value: unknown }> {
  const fields = asRecord(value).fields ? asRecord(asRecord(value).fields) : asRecord(value);
  const contents = fields.contents;
  if (!Array.isArray(contents)) {
    return [];
  }

  return contents.map((entry) => {
    const entryFields = asRecord(asRecord(entry).fields || entry);
    return {
      key: entryFields.key,
      value: entryFields.value,
    };
  });
}

function bigintToUnits(value: bigint, decimals: number): number {
  const sign = value < 0n ? -1 : 1;
  const abs = value < 0n ? -value : value;
  const base = 10n ** BigInt(decimals);
  const whole = Number(abs / base);
  const fraction = Number(abs % base) / Number(base);
  return sign * (whole + fraction);
}

function getInvestPoolHref(pool: FundPoolRecord): string {
  return `${getInvestPath()}/${encodeURIComponent(pool.pool_object_id || String(pool.id))}`;
}

async function loadSuiFundPoolHoldings(
  client: ReturnType<typeof useSuiClient>,
  owner: string,
): Promise<TransparencyHolding[]> {
  const positions: Array<{ id: string; sharesByPool: Map<string, bigint> }> = [];
  let cursor: string | null | undefined = null;

  do {
    const page = await client.getOwnedObjects({
      owner,
      cursor,
      limit: 50,
      filter: { StructType: FUND_POSITION_TYPE },
      options: { showContent: true, showType: true },
    });

    for (const item of page.data) {
      const objectId = item.data?.objectId || '';
      const fields = readMoveFields(item.data);
      const sharesByPool = new Map<string, bigint>();
      for (const entry of readVecMapEntries(fields.pool_shares)) {
        const poolId = readObjectId(entry.key);
        const shares = readBigInt(entry.value);
        if (poolId && shares > 0n) {
          sharesByPool.set(poolId.toLowerCase(), shares);
        }
      }
      if (objectId && sharesByPool.size > 0) {
        positions.push({ id: objectId, sharesByPool });
      }
    }

    cursor = page.hasNextPage ? page.nextCursor : null;
  } while (cursor);

  if (positions.length === 0) {
    return [];
  }

  const pools = await getFundPools({
    network: SUI_NETWORK,
    packageId: SUI_FUND_CONFIG.packageId,
    includeInactive: true,
  });

  const holdings: TransparencyHolding[] = [];
  await Promise.all(pools.map(async (pool) => {
    const poolObjectId = String(pool.pool_object_id || '').trim();
    if (!poolObjectId) {
      return;
    }

    const poolKey = poolObjectId.toLowerCase();
    const shares = positions.reduce((sum, position) => sum + (position.sharesByPool.get(poolKey) ?? 0n), 0n);
    if (shares <= 0n) {
      return;
    }

    const poolObject = await client.getObject({ id: poolObjectId, options: { showContent: true } });
    const fields = readMoveFields(poolObject.data);
    const balance = readBigInt(fields.balance);
    const totalShares = readBigInt(fields.total_pool_shares);
    const valueUsdc = totalShares > 0n ? shares * balance / totalShares : 0n;
    const valueUsd = bigintToUnits(valueUsdc, 6);
    const amount = bigintToUnits(shares, 6);

    holdings.push({
      type: 'defi',
      id: `fund-pool-${poolObjectId}`,
      name: pool.name || `${pool.symbol || 'USDC'} Fund Pool`,
      symbol: pool.symbol || 'USDC',
      chain: 'sui',
      usd_value: valueUsd,
      share: 0,
      asset_usd_value: bigintToUnits(balance, 6),
      amount,
      price: totalShares > 0n ? bigintToUnits(balance * 1_000_000n / totalShares, 6) : null,
      apy: Number(pool.realized_apy_bps || pool.target_apy_bps || 0) / 100,
      side: 'Fund pool',
      logo_url: pool.logo_url || null,
      link: getInvestPoolHref(pool),
      protocol_key: 'av8-fund-pool',
      protocol_name: 'AV8 Fund Pools',
      position_kind: 'pool',
      position_type: `${amount.toLocaleString('en-US', { maximumFractionDigits: 6 })} pool shares`,
      protocol_module: 'fund_core',
    });
  }));

  const totalUsd = holdings.reduce((sum, item) => sum + item.usd_value, 0);
  holdings.forEach((item) => {
    item.share = totalUsd > 0 ? Math.round((item.usd_value / totalUsd) * 1000) / 10 : 0;
  });

  return holdings.sort((a, b) => b.usd_value - a.usd_value);
}

type DefiPositionsSectionProps = {
  portfolioNetwork: HeaderNetwork;
};

function FundPoolPositionsTable({ holdings }: { holdings: TransparencyHolding[] }) {
  return (
    <div className="overflow-x-auto rounded-[1.25rem] border border-white/[0.07] bg-[rgba(4,8,16,0.34)]">
      <div className="min-w-[980px]">
        <div className="grid grid-cols-[2.1fr_1.25fr_1.15fr_1fr_1.45fr_1.55fr_130px] gap-4 px-5 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          <div>Pool</div>
          <div className="flex items-center gap-1">TVL (Supply) <Info className="h-3.5 w-3.5" /></div>
          <div className="flex items-center gap-1">Balance <Info className="h-3.5 w-3.5" /></div>
          <div className="flex items-center gap-1">Fee APY <Info className="h-3.5 w-3.5" /></div>
          <div className="flex items-center gap-1">Annualized performance <Info className="h-3.5 w-3.5" /></div>
          <div className="flex items-center gap-1">Snapshot <Info className="h-3.5 w-3.5" /></div>
          <div />
        </div>

        <div className="space-y-2 pb-2">
          {holdings.map((holding) => {
            const tvl = holding.asset_usd_value ?? holding.usd_value;
            const apy = holding.apy ?? null;
            const performance = apy === null ? null : apy * 0.92;
            const snapshotPoints = buildSnapshotPoints(holding.id, performance);

            return (
              <div
                key={holding.id}
                className="grid min-h-[94px] grid-cols-[2.1fr_1.25fr_1.15fr_1fr_1.45fr_1.55fr_130px] items-center gap-4 rounded-2xl bg-[rgba(13,17,32,0.96)] px-5 py-4 text-slate-200 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.035)]"
              >
                <div className="flex min-w-0 items-center gap-4">
                  <button
                    type="button"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-white/[0.04] hover:text-slate-200"
                    aria-label="Watch pool"
                  >
                    <Star className="h-5 w-5" />
                  </button>

                  {holding.logo_url ? (
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full bg-white/5 ring-1 ring-white/10">
                      <img src={holding.logo_url} alt={holding.name} className="h-full w-full object-cover" />
                    </div>
                  ) : (
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-cyan-300 text-lg font-black text-slate-950 ring-1 ring-white/10">
                      {(holding.symbol || 'AV8').slice(0, 3).toUpperCase()}
                    </div>
                  )}

                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-2">
                      <div className="truncate text-xl font-semibold text-white">{holding.name}</div>
                      <MoreVertical className="h-4 w-4 shrink-0 text-slate-500" />
                    </div>
                    <div className="mt-1 truncate text-sm text-slate-500">[{holding.symbol || 'USDC'}-AV8]</div>
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="text-lg font-medium text-white">{formatCompactUsd(tvl)}</div>
                  <div className="mt-1 text-sm text-slate-500">USDC liquidity</div>
                </div>

                <div className="min-w-0">
                  <div className="text-lg font-medium text-white">{formatUsd(holding.usd_value)}</div>
                  <div className="mt-1 text-sm text-slate-500 underline decoration-dotted underline-offset-4">
                    {formatPoolShares(holding.amount)}
                  </div>
                </div>

                <div className="text-lg font-medium text-white">{formatPercentValue(apy)}</div>
                <div className="text-lg font-medium text-white">{formatPercentValue(performance)}</div>

                <div className="h-14">
                  <svg viewBox="0 0 135 54" className="h-full w-full overflow-visible" role="img" aria-label="Pool performance snapshot">
                    <defs>
                      <linearGradient id={`pool-spark-${holding.id.replace(/[^a-zA-Z0-9]/g, '')}`} x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="rgba(74,222,128,0.42)" />
                        <stop offset="100%" stopColor="rgba(74,222,128,0)" />
                      </linearGradient>
                    </defs>
                    <polyline
                      points={`0,54 ${snapshotPoints} 135,54`}
                      fill={`url(#pool-spark-${holding.id.replace(/[^a-zA-Z0-9]/g, '')})`}
                      stroke="none"
                    />
                    <polyline
                      points={snapshotPoints}
                      fill="none"
                      stroke="#4ade80"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>

                <div className="flex items-center justify-end gap-3">
                  {holding.link ? (
                    <a
                      href={holding.link}
                      className="inline-flex items-center gap-2 text-base font-medium text-slate-300 transition hover:text-white"
                    >
                      Details
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  ) : (
                    <span className="text-base font-medium text-slate-500">Details</span>
                  )}
                  <MoreVertical className="h-5 w-5 text-slate-500" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function DefiPositionsSection({ portfolioNetwork }: DefiPositionsSectionProps) {
  const currentAccount = useCurrentAccount();
  const { connectionStatus } = useCurrentWallet();
  const suiClient = useSuiClient();
  const { messages } = useI18n();
  const [hasExternalWalletSession, setHasExternalWalletSession] = React.useState(false);
  const [externalSession, setExternalSession] = React.useState<ExternalWalletSession | null>(null);
  const [activeWallet, setActiveWallet] = React.useState<ActiveWalletState | null>(null);
  const [defiHoldings, setDefiHoldings] = React.useState<TransparencyHolding[]>([]);
  const [defiLoading, setDefiLoading] = React.useState(false);
  const [defiError, setDefiError] = React.useState<string | null>(null);
  const [selectedGmxAsset, setSelectedGmxAsset] = React.useState<TransparencyHolding | null>(null);
  const [gmxDetails, setGmxDetails] = React.useState<GmxDetails | null>(null);
  const [gmxDetailsLoading, setGmxDetailsLoading] = React.useState(false);
  const [gmxDetailsError, setGmxDetailsError] = React.useState<string | null>(null);
  const [selectedAaveAsset, setSelectedAaveAsset] = React.useState<TransparencyHolding | null>(null);
  const [aaveDetails, setAaveDetails] = React.useState<AaveDetails | null>(null);
  const [aaveDetailsLoading, setAaveDetailsLoading] = React.useState(false);
  const [aaveDetailsError, setAaveDetailsError] = React.useState<string | null>(null);
  const [selectedMorphoAsset, setSelectedMorphoAsset] = React.useState<TransparencyHolding | null>(null);
  const [morphoDetails, setMorphoDetails] = React.useState<MorphoDetails | null>(null);
  const [morphoDetailsLoading, setMorphoDetailsLoading] = React.useState(false);
  const [morphoDetailsError, setMorphoDetailsError] = React.useState<string | null>(null);
  const currentSuiAddress = normalizeWalletAddress(currentAccount?.address);
  const hasWalletConnection = Boolean(currentAccount?.address)
    || connectionStatus === 'connected'
    || hasExternalWalletSession
    || Boolean(activeWallet?.address);
  const connectedWalletAddress = currentSuiAddress
    || normalizeWalletAddress(getExternalSessionAddress(externalSession));
  const activeWalletAddress = normalizeWalletAddress(activeWallet?.address) || connectedWalletAddress;
  const activeWalletIsSolana = walletLooksLikeSolana(activeWalletAddress)
    || String(activeWallet?.network || '').trim().toLowerCase().includes('solana');
  const activeWalletIsSui = !activeWalletIsSolana && (
    Boolean(activeWallet?.isSui)
    || String(activeWallet?.network || '').trim().toLowerCase().includes('sui')
    || (activeWalletAddress !== '' && activeWalletAddress === currentSuiAddress)
    || walletLooksLikeSui(activeWalletAddress)
  );

  React.useEffect(() => {
    setHasExternalWalletSession(hasStoredExternalWalletSession());
    setExternalSession(readExternalWalletSession());

    if (typeof window === 'undefined') {
      return;
    }

    function syncExternalSession() {
      setHasExternalWalletSession(hasStoredExternalWalletSession());
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
    setActiveWallet(readActiveWallet());

    if (typeof window === 'undefined') {
      return;
    }

    function syncActiveWallet() {
      setActiveWallet(readActiveWallet());
    }

    window.addEventListener(ACTIVE_WALLET_EVENT, syncActiveWallet as EventListener);
    window.addEventListener('storage', syncActiveWallet);

    return () => {
      window.removeEventListener(ACTIVE_WALLET_EVENT, syncActiveWallet as EventListener);
      window.removeEventListener('storage', syncActiveWallet);
    };
  }, []);

  const loadDefiHoldings = React.useCallback(async (refresh = false) => {
    if (!hasWalletConnection || !activeWalletAddress) {
      setDefiHoldings([]);
      setDefiError(null);
      setDefiLoading(false);
      return;
    }

    if (portfolioNetwork === 'sui') {
      if (!activeWalletIsSui) {
        setDefiHoldings([]);
        setDefiError(null);
        setDefiLoading(false);
        return;
      }

      setDefiLoading(true);
      setDefiError(null);

      try {
        const fundPoolHoldings = await loadSuiFundPoolHoldings(suiClient, activeWalletAddress);
        setDefiHoldings(fundPoolHoldings);
      } catch (error) {
        setDefiHoldings([]);
        setDefiError(error instanceof Error ? error.message : messages.transparency.liveDataUnavailable);
      } finally {
        setDefiLoading(false);
      }
      return;
    }

    if (activeWalletIsSui) {
      setDefiHoldings([]);
      setDefiError(null);
      setDefiLoading(false);
      return;
    }

    setDefiLoading(true);
    setDefiError(null);

    try {
      const protocolOpts = activeWalletIsSolana
        ? { refresh, chainId: 'solana' as const }
        : { refresh };
      const protocols = await getWalletProtocols(activeWalletAddress, protocolOpts);
      setDefiHoldings(flattenProtocolHoldings(protocols));
    } catch (error) {
      setDefiHoldings([]);
      setDefiError(error instanceof Error ? error.message : messages.transparency.liveDataUnavailable);
    } finally {
      setDefiLoading(false);
    }
  }, [activeWalletAddress, activeWalletIsSolana, activeWalletIsSui, hasWalletConnection, messages.transparency.liveDataUnavailable, portfolioNetwork, suiClient]);

  React.useEffect(() => {
    void loadDefiHoldings(false);
  }, [loadDefiHoldings]);

  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    function handleRefresh(event: Event) {
      const detail = (event as CustomEvent<{ address?: string }>).detail;
      const normalizedDetailAddress = normalizeWalletAddress(detail?.address);

      if (normalizedDetailAddress !== '' && normalizedDetailAddress !== activeWalletAddress) {
        return;
      }

      void loadDefiHoldings(true);
    }

    window.addEventListener(ACTIVE_WALLET_REFRESH_EVENT, handleRefresh as EventListener);

    return () => {
      window.removeEventListener(ACTIVE_WALLET_REFRESH_EVENT, handleRefresh as EventListener);
    };
  }, [activeWalletAddress, loadDefiHoldings]);

  const handleShowGmxDetails = React.useCallback((asset: TransparencyHolding) => {
    setSelectedGmxAsset(asset);
    setGmxDetails(null);
    setGmxDetailsError(null);
    setGmxDetailsLoading(true);

    void loadGmxDetails(asset, activeWalletAddress)
      .then((details) => {
        setGmxDetails(details);
      })
      .catch((error) => {
        setGmxDetailsError(error instanceof Error ? error.message : 'Unable to load GMX details.');
      })
      .finally(() => {
        setGmxDetailsLoading(false);
      });
  }, [activeWalletAddress]);

  const handleShowAaveDetails = React.useCallback((asset: TransparencyHolding) => {
    setSelectedAaveAsset(asset);
    setAaveDetails(null);
    setAaveDetailsError(null);
    setAaveDetailsLoading(true);

    void loadAaveDetails(asset, activeWalletAddress)
      .then((details) => {
        setAaveDetails(details);
      })
      .catch((error) => {
        setAaveDetailsError(error instanceof Error ? error.message : 'Unable to load Aave details.');
      })
      .finally(() => {
        setAaveDetailsLoading(false);
      });
  }, [activeWalletAddress]);

  const handleShowMorphoDetails = React.useCallback((asset: TransparencyHolding) => {
    setSelectedMorphoAsset(asset);
    setMorphoDetails(null);
    setMorphoDetailsError(null);
    setMorphoDetailsLoading(true);

    void loadMorphoDetails(asset, activeWalletAddress)
      .then((details) => {
        setMorphoDetails(details);
      })
      .catch((error) => {
        setMorphoDetailsError(error instanceof Error ? error.message : 'Unable to load Morpho details.');
      })
      .finally(() => {
        setMorphoDetailsLoading(false);
      });
  }, [activeWalletAddress]);

  return (
    <>
      <div className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-2xl">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-2xl border border-sky-400/20 bg-sky-400/10 p-3 text-sky-300">
            <ScanSearch className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xl font-semibold text-white">{messages.portfolio.defiTitle}</div>
          </div>
        </div>

        <div className="space-y-3">
          {defiLoading ? (
            <div className="rounded-[1.5rem] border border-white/8 bg-[rgba(5,9,18,0.72)] px-4 py-4 text-sm text-slate-300">
              {messages.transparency.liveDataLoading}
            </div>
          ) : !hasWalletConnection ? (
            <div className="rounded-[1.5rem] border border-sky-400/20 bg-sky-400/5 px-4 py-4 text-sm text-sky-100">
              {messages.portfolio.defiConnectWallet}
            </div>
          ) : portfolioNetwork === 'sui' && !activeWalletIsSui ? (
            <div className="rounded-[1.5rem] border border-sky-400/20 bg-sky-400/5 px-4 py-4 text-sm text-sky-100">
              {messages.portfolio.defiSuiNeedWallet}
            </div>
          ) : portfolioNetwork !== 'sui' && activeWalletIsSui ? (
            <div className="rounded-[1.5rem] border border-sky-400/20 bg-sky-400/5 px-4 py-4 text-sm text-sky-100">
              {messages.portfolio.defiSuiOtherTabHint}
            </div>
          ) : defiHoldings.length > 0 ? (
            portfolioNetwork === 'sui' ? (
              <FundPoolPositionsTable holdings={defiHoldings} />
            ) : (
              <div className="rounded-[1.5rem] border border-white/8 bg-[rgba(4,8,16,0.52)] p-4">
                <TransparencyHoldingsList
                  holdings={defiHoldings}
                  portfolioShareLabel={messages.transparency.portfolioShare}
                  tokenLabel={messages.transparency.tokenLabel}
                  defiLabel={messages.transparency.defiLabel}
                  className="space-y-3"
                  onShowGmxDetails={handleShowGmxDetails}
                  onShowAaveDetails={handleShowAaveDetails}
                  onShowMorphoDetails={handleShowMorphoDetails}
                />
              </div>
            )
          ) : defiError ? (
            <div className="rounded-[1.5rem] border border-amber-500/20 bg-amber-500/5 px-4 py-4 text-sm text-amber-100">
              {defiError}
            </div>
          ) : portfolioNetwork === 'sui' && activeWalletIsSui ? (
            <div className="rounded-[1.5rem] border border-white/8 bg-[rgba(5,9,18,0.72)] px-4 py-4 text-sm text-slate-300">
              {messages.portfolio.defiSuiOnChainEmpty}
            </div>
          ) : (
            <div className="rounded-[1.5rem] border border-amber-500/20 bg-amber-500/5 px-4 py-4 text-sm text-amber-100">
              {messages.transparency.liveDataUnavailable}
            </div>
          )}
        </div>
      </div>

      <Dialog open={Boolean(selectedGmxAsset)} onOpenChange={(open) => {
        if (!open) {
          setSelectedGmxAsset(null);
          setGmxDetails(null);
          setGmxDetailsError(null);
        }
      }}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto border-white/[0.1] bg-[rgba(5,9,18,0.97)] p-0 text-slate-100 shadow-[0_30px_120px_rgba(2,6,23,0.7)] backdrop-blur-xl">
          <div className="overflow-hidden rounded-lg bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.14),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(245,158,11,0.12),_transparent_30%),linear-gradient(180deg,_#020617_0%,_#08111f_100%)]">
            <DialogHeader className="border-b border-white/8 px-6 py-6 text-left">
              <div className="inline-flex w-fit rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-sky-200">
                GMX Details
              </div>
              <DialogTitle className="mt-4 text-2xl font-semibold text-white">
                {selectedGmxAsset?.name || 'GMX position'}
              </DialogTitle>
              <DialogDescription className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
                Balance is read through ERC20.balanceOf on Arbitrum. Pool composition and rates are loaded from GMX /markets/info and /glvs/info.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 px-6 py-6">
              {gmxDetailsLoading ? (
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 text-sm text-slate-300">
                  Loading GMX details...
                </div>
              ) : gmxDetailsError ? (
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-100">
                  {gmxDetailsError}
                </div>
              ) : gmxDetails ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <DetailTile label={`${gmxDetails.tokenKind} token`} value={shortAddress(gmxDetails.tokenAddress)} />
                    <DetailTile label={`${gmxDetails.tokenKind} balance`} value={formatNumber(gmxDetails.tokenBalance, ` ${gmxDetails.tokenKind}`)} />
                    <DetailTile label={`${gmxDetails.tokenKind} price`} value={formatUsd(gmxDetails.tokenPriceUsd)} />
                    <DetailTile label="Position value" value={formatUsd(gmxDetails.positionValueUsd)} />
                    <DetailTile label="Pool / vault" value={gmxDetails.marketName || 'N/A'} />
                    <DetailTile label="Price source" value={gmxDetails.priceSource} />
                  </div>

                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                    <div className="mb-3 text-xs uppercase tracking-[0.18em] text-slate-400">Pool composition</div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <DetailTile label="Long token" value={shortAddress(gmxDetails.longToken)} />
                      <DetailTile label="Short token" value={shortAddress(gmxDetails.shortToken)} />
                      <DetailTile label="Funding / yield" value={gmxDetails.fundingRate || 'N/A'} />
                      <DetailTile label="Borrowing factor" value={gmxDetails.borrowingRate || 'N/A'} />
                    </div>
                  </div>

                  {gmxDetails.glvMarkets.length > 0 ? (
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                      <div className="mb-3 text-xs uppercase tracking-[0.18em] text-slate-400">GLV market balances</div>
                      <div className="space-y-2">
                        {gmxDetails.glvMarkets.map((market) => (
                          <div key={market.address} className="grid gap-2 rounded-xl border border-white/6 bg-[rgba(4,8,16,0.52)] p-3 text-xs text-slate-300 sm:grid-cols-[1fr_auto_auto]">
                            <span className="font-mono text-slate-400">{shortAddress(market.address)}</span>
                            <span>{formatNumber(market.balance, ' GM')}</span>
                            <span>{formatUsd(market.balanceUsd)} · {formatNumber(market.share, '%')}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </>
              ) : null}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selectedAaveAsset)} onOpenChange={(open) => {
        if (!open) {
          setSelectedAaveAsset(null);
          setAaveDetails(null);
          setAaveDetailsError(null);
        }
      }}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto border-white/[0.1] bg-[rgba(5,9,18,0.97)] p-0 text-slate-100 shadow-[0_30px_120px_rgba(2,6,23,0.7)] backdrop-blur-xl">
          <div className="overflow-hidden rounded-lg bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.14),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(34,197,94,0.12),_transparent_30%),linear-gradient(180deg,_#020617_0%,_#08111f_100%)]">
            <DialogHeader className="border-b border-white/8 px-6 py-6 text-left">
              <div className="inline-flex w-fit rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">
                Aave Details
              </div>
              <DialogTitle className="mt-4 text-2xl font-semibold text-white">
                {selectedAaveAsset?.name || 'Aave position'}
              </DialogTitle>
              <DialogDescription className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
                Position value comes from the portfolio snapshot. Market APY, health factor and account totals are loaded from Aave GraphQL when available.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 px-6 py-6">
              {aaveDetailsLoading ? (
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 text-sm text-slate-300">
                  Loading Aave details...
                </div>
              ) : aaveDetailsError ? (
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-100">
                  {aaveDetailsError}
                </div>
              ) : aaveDetails ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <DetailTile label="Position" value={aaveDetails.positionName} />
                    <DetailTile label="Type" value={aaveDetails.positionKind} />
                    <DetailTile label="Amount" value={formatNumber(aaveDetails.amount, selectedAaveAsset?.symbol ? ` ${selectedAaveAsset.symbol}` : '')} />
                    <DetailTile label="Position value" value={formatUsd(aaveDetails.usdValue)} />
                    <DetailTile label="Market" value={aaveDetails.marketName || 'N/A'} />
                    <DetailTile label="Chain" value={aaveDetails.chainName || 'N/A'} />
                  </div>

                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                    <div className="mb-3 text-xs uppercase tracking-[0.18em] text-slate-400">Yield and risk</div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <DetailTile label="Supply APY" value={aaveDetails.supplyApy || 'N/A'} />
                      <DetailTile label="Borrow APY" value={aaveDetails.borrowApy || 'N/A'} />
                      <DetailTile label="Net APY" value={aaveDetails.netApy || 'N/A'} />
                      <DetailTile label="Health factor" value={aaveDetails.healthFactor || 'N/A'} />
                      <DetailTile label="Collateral enabled" value={formatBoolean(aaveDetails.usingAsCollateral ?? aaveDetails.canBeCollateral)} />
                      <DetailTile label="E-mode" value={formatBoolean(aaveDetails.eModeEnabled)} />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                    <div className="mb-3 text-xs uppercase tracking-[0.18em] text-slate-400">Account and market totals</div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <DetailTile label="Net worth" value={formatUsd(aaveDetails.netWorth)} />
                      <DetailTile label="Total collateral" value={formatUsd(aaveDetails.totalCollateral)} />
                      <DetailTile label="Total debt" value={formatUsd(aaveDetails.totalDebt)} />
                      <DetailTile label="Available borrows" value={formatUsd(aaveDetails.availableBorrows)} />
                      <DetailTile label="Market size" value={formatUsd(aaveDetails.totalMarketSize)} />
                      <DetailTile label="Available liquidity" value={formatUsd(aaveDetails.totalAvailableLiquidity)} />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/8 bg-[rgba(4,8,16,0.52)] p-3 text-xs text-slate-400">
                    Data source: {aaveDetails.dataSource}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selectedMorphoAsset)} onOpenChange={(open) => {
        if (!open) {
          setSelectedMorphoAsset(null);
          setMorphoDetails(null);
          setMorphoDetailsError(null);
        }
      }}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto border-white/[0.1] bg-[rgba(5,9,18,0.97)] p-0 text-slate-100 shadow-[0_30px_120px_rgba(2,6,23,0.7)] backdrop-blur-xl">
          <div className="overflow-hidden rounded-lg bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.14),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(168,85,247,0.12),_transparent_30%),linear-gradient(180deg,_#020617_0%,_#08111f_100%)]">
            <DialogHeader className="border-b border-white/8 px-6 py-6 text-left">
              <div className="inline-flex w-fit rounded-full border border-violet-400/20 bg-violet-400/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-violet-200">
                Morpho Details
              </div>
              <DialogTitle className="mt-4 text-2xl font-semibold text-white">
                {selectedMorphoAsset?.name || 'Morpho position'}
              </DialogTitle>
              <DialogDescription className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
                Position value comes from the portfolio snapshot. Market and vault APY, collateral, borrow and utilization are loaded from Morpho GraphQL when available.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 px-6 py-6">
              {morphoDetailsLoading ? (
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 text-sm text-slate-300">
                  Loading Morpho details...
                </div>
              ) : morphoDetailsError ? (
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-100">
                  {morphoDetailsError}
                </div>
              ) : morphoDetails ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <DetailTile label="Position" value={morphoDetails.positionName} />
                    <DetailTile label="Type" value={morphoDetails.positionKind} />
                    <DetailTile label="Amount" value={formatNumber(morphoDetails.amount, selectedMorphoAsset?.symbol ? ` ${selectedMorphoAsset.symbol}` : '')} />
                    <DetailTile label="Position value" value={formatUsd(morphoDetails.usdValue)} />
                    <DetailTile label="Loan asset" value={morphoDetails.loanAsset || 'N/A'} />
                    <DetailTile label="Collateral asset" value={morphoDetails.collateralAsset || 'N/A'} />
                  </div>

                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                    <div className="mb-3 text-xs uppercase tracking-[0.18em] text-slate-400">Yield and risk</div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <DetailTile label="Supply APY" value={morphoDetails.supplyApy || 'N/A'} />
                      <DetailTile label="Borrow APY" value={morphoDetails.borrowApy || 'N/A'} />
                      <DetailTile label="Net APY" value={morphoDetails.netApy || 'N/A'} />
                      <DetailTile label="Health estimate" value={morphoDetails.healthFactor || 'N/A'} />
                      <DetailTile label="LLTV" value={morphoDetails.lltv || 'N/A'} />
                      <DetailTile label="Utilization" value={morphoDetails.utilization || 'N/A'} />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                    <div className="mb-3 text-xs uppercase tracking-[0.18em] text-slate-400">Position and market totals</div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <DetailTile label="Supplied" value={formatUsd(morphoDetails.supplyUsd)} />
                      <DetailTile label="Borrowed" value={formatUsd(morphoDetails.borrowUsd)} />
                      <DetailTile label="Collateral" value={formatUsd(morphoDetails.collateralUsd)} />
                      <DetailTile label="Liquidity" value={formatUsd(morphoDetails.liquidityUsd)} />
                      <DetailTile label="Market size" value={formatUsd(morphoDetails.marketSizeUsd)} />
                      <DetailTile label="Chain" value={morphoDetails.chainName || 'N/A'} />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/8 bg-[rgba(4,8,16,0.52)] p-3 text-xs text-slate-400">
                    <div>Market / vault: {shortAddress(morphoDetails.marketId)}</div>
                    <div className="mt-1">Data source: {morphoDetails.dataSource}</div>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function DetailTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-[rgba(4,8,16,0.52)] p-3">
      <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">{label}</div>
      <div className="mt-1 break-words font-mono text-sm text-slate-100">{value}</div>
    </div>
  );
}

function formatBoolean(value: boolean | null | undefined): string {
  if (value === null || value === undefined) {
    return 'N/A';
  }

  return value ? 'Yes' : 'No';
}
