import { createNetworkConfig } from '@mysten/dapp-kit';

import {
  SUI_BASKET_ID,
  SUI_GOOGLE_CLIENT_ID,
  SUI_ADMIN_CAP_ID,
  SUI_RWA_ADMIN_CAP_ID,
  SUI_RWA_PACKAGE_ID,
  SUI_MANAGER_CAP_ID,
  SUI_NETWORK,
  SUI_MODULE_PACKAGE_ID,
  SUI_PACKAGE_ID,
  SUI_POSITION_ID,
  SUI_REGISTRY_ID,
  SUI_SHARE_ADMIN_CAP_ID,
  SUI_SHARE_CONFIG_ID,
  SUI_SHARE_FEE_CONFIG_ID,
  SUI_SHARE_TREASURY_CAP_ID,
  SUI_NAV_STATE_ID,
  SUI_NAV_ADMIN_CAP_ID,
  SUI_POOL_REGISTRY_ID,
  SUI_POOL_ADMIN_CAP_ID,
  SUI_POOL_ACCOUNTING_ID,
  SUI_USDC_TYPE,
  SUI_PYTH_OBJECT_ID,
  SUI_STRATEGY_ID,
  resolveSuiSwapRpcUrl,
} from '../config';

export type FundAsset = {
  id: string;
  symbol: string;
  name: string;
  amount: number;
  valueUsd: number;
  targetWeightBps: number;
  actualWeightBps: number;
  logoUri?: string;
  type: 'stable' | 'crypto' | 'rwa';
};

export type PerformancePoint = {
  label: string;
  navUsd: number;
  investedUsd: number;
};

export type AiLogEntry = {
  id: string;
  title: string;
  summary: string;
  status: 'verified' | 'pending' | 'failed';
  timestampLabel: string;
  txDigest?: string;
};

export type FundSnapshot = {
  totalNavUsd: number;
  availableUsdcUsd: number;
  sharePriceUsd: number;
  totalShares: number;
  investedUsd: number;
  monthlyChangePct: number;
  assets: FundAsset[];
  performance: PerformancePoint[];
  aiLogs: AiLogEntry[];
};

export const AV8_PACKAGE_ID =
  SUI_PACKAGE_ID || '0x089a7d139888b214a55037c1dd2ee662a2a9cd4c0d004c520a1628a4d99cb9d7';
export const AV8_BASKET_ID =
  SUI_BASKET_ID || '0xab53a774b06d743c5e5e33bfca67210dbf1fea59de6d79a278ace75697269a7b';
export const AV8_REGISTRY_ID =
  SUI_REGISTRY_ID || '0xa52b7e4cd5fa8e563ba6af10217b73d704a1d72c7146c967a4c4b93886c6936e';
export const AV8_MANAGER_CAP_ID =
  SUI_MANAGER_CAP_ID || '0xf7f363f67f8a5d7e4d04b25cdffd1f37ce290f823ed50ba136b1c2c76cf6cd47';
export const AV8_OWNER_CAP_ID =
  '0xe6aa1f6988de4eff9593e350864a4f4b9ae3bd51ece69997126b466bfd278374';
export const AV8_STRATEGY_MANAGER_CAP_ID =
  SUI_MANAGER_CAP_ID || '0xf7f363f67f8a5d7e4d04b25cdffd1f37ce290f823ed50ba136b1c2c76cf6cd47';
export const AV8_UPGRADE_CAP_ID =
  '0x4513daf596194e34e3c2a156749565ebb01c21bdca7c1eab5b5b5d7e04aa0ba6';
export const AV8_STRATEGY_ID =
  SUI_STRATEGY_ID || '0x3a2536393bf6e41e2c23d4f3f5dd398922c15bb0c0bc2f1fa8c7d064cc9df2a7';
export const AV8_POSITION_ID =
  SUI_POSITION_ID || '0x7a6f05e87dc366c82e1e0439e187e8e4c59235f07c4618a666ad536311af7552';

export const EVENT_MODULE = 'events';
export const DEPOSIT_EVENT = AV8_PACKAGE_ID
  ? `${AV8_PACKAGE_ID}::${EVENT_MODULE}::DepositEvent` // Corrected event name
  : '';
export const WITHDRAW_EVENT = AV8_PACKAGE_ID
  ? `${AV8_PACKAGE_ID}::${EVENT_MODULE}::WithdrawEvent`
  : '';
export const REBALANCE_EVENT = AV8_PACKAGE_ID
  ? `${AV8_PACKAGE_ID}::${EVENT_MODULE}::PortfolioRebalancedEvent`
  : '';
export const PYTH_OBJECT_ID =
  SUI_PYTH_OBJECT_ID || '0x0000000000000000000000000000000000000000000000000000000000000000'; // Placeholder

export const { networkConfig } = createNetworkConfig({
  [SUI_NETWORK]: {
    url: resolveSuiSwapRpcUrl(),
    variables: {
      packageId: SUI_PACKAGE_ID,
      modulePackageId: SUI_MODULE_PACKAGE_ID,
      basketId: SUI_BASKET_ID,
      strategyId: SUI_STRATEGY_ID,
      positionId: SUI_POSITION_ID,
      googleClientId: SUI_GOOGLE_CLIENT_ID,
      pythObjectId: SUI_PYTH_OBJECT_ID,
    },
  },
});

export const SUI_FUND_CONFIG = {
  network: SUI_NETWORK,
  rpcUrl: resolveSuiSwapRpcUrl(),
  packageId: AV8_PACKAGE_ID,
  modulePackageId: SUI_MODULE_PACKAGE_ID,
  basketId: AV8_BASKET_ID,
  registryId: AV8_REGISTRY_ID,
  adminCapId: SUI_ADMIN_CAP_ID || AV8_OWNER_CAP_ID,
  rwaPackageId: SUI_RWA_PACKAGE_ID,
  rwaAdminCapId: SUI_RWA_ADMIN_CAP_ID,
  managerCapId: AV8_MANAGER_CAP_ID,
  strategyManagerCapId: AV8_STRATEGY_MANAGER_CAP_ID, // New field
  strategyId: AV8_STRATEGY_ID,
  positionId: AV8_POSITION_ID,
  shareConfigId: SUI_SHARE_CONFIG_ID,
  shareFeeConfigId: SUI_SHARE_FEE_CONFIG_ID,
  shareAdminCapId: SUI_SHARE_ADMIN_CAP_ID,
  shareTreasuryCapId: SUI_SHARE_TREASURY_CAP_ID,
  navStateId: SUI_NAV_STATE_ID,
  navAdminCapId: SUI_NAV_ADMIN_CAP_ID,
  poolRegistryId: SUI_POOL_REGISTRY_ID,
  poolAdminCapId: SUI_POOL_ADMIN_CAP_ID,
  poolAccountingId: SUI_POOL_ACCOUNTING_ID,
  usdcType: SUI_USDC_TYPE,
  googleClientId: SUI_GOOGLE_CLIENT_ID,
  pythObjectId: PYTH_OBJECT_ID, // New field
};

const DEFAULT_ASSET_LOGOS: Record<string, string> = {
  USDC: 'https://assets.coingecko.com/coins/images/6319/large/usdc.png',
  SUI: 'https://assets.coingecko.com/coins/images/26375/large/sui-ocean-square.png',
  AAPLX: 'https://logo.clearbit.com/apple.com',
  BONDX: 'https://logo.clearbit.com/blackrock.com',
};

export const FALLBACK_FUND_SNAPSHOT: FundSnapshot = {
  totalNavUsd: 1_248_500,
  availableUsdcUsd: 228_400,
  sharePriceUsd: 104.2,
  totalShares: 11_982,
  investedUsd: 1_050_000,
  monthlyChangePct: 3.8,
  assets: [
    {
      id: 'usdc',
      symbol: 'USDC',
      name: 'Cash Reserve',
      amount: 228_400,
      valueUsd: 228_400,
      targetWeightBps: 1800,
      actualWeightBps: 1830,
      logoUri: DEFAULT_ASSET_LOGOS.USDC,
      type: 'stable',
    },
    {
      id: 'sui',
      symbol: 'SUI',
      name: 'Sui Core Allocation',
      amount: 108_500,
      valueUsd: 379_750,
      targetWeightBps: 3000,
      actualWeightBps: 3042,
      logoUri: DEFAULT_ASSET_LOGOS.SUI,
      type: 'crypto',
    },
    {
      id: 'aaplx',
      symbol: 'AAPLX',
      name: 'Wrapped Apple Equity',
      amount: 1_250,
      valueUsd: 405_000,
      targetWeightBps: 3250,
      actualWeightBps: 3244,
      logoUri: DEFAULT_ASSET_LOGOS.AAPLX,
      type: 'rwa',
    },
    {
      id: 'bondx',
      symbol: 'BONDX',
      name: 'Wrapped Treasury Basket',
      amount: 2_150,
      valueUsd: 235_350,
      targetWeightBps: 1950,
      actualWeightBps: 1884,
      logoUri: DEFAULT_ASSET_LOGOS.BONDX,
      type: 'rwa',
    },
  ],
  performance: [
    { label: 'Jan', navUsd: 920_000, investedUsd: 880_000 },
    { label: 'Feb', navUsd: 955_000, investedUsd: 900_000 },
    { label: 'Mar', navUsd: 996_000, investedUsd: 930_000 },
    { label: 'Apr', navUsd: 1_018_000, investedUsd: 965_000 },
    { label: 'May', navUsd: 1_042_000, investedUsd: 980_000 },
    { label: 'Jun', navUsd: 1_071_000, investedUsd: 1_000_000 },
    { label: 'Jul', navUsd: 1_109_000, investedUsd: 1_012_000 },
    { label: 'Aug', navUsd: 1_136_500, investedUsd: 1_018_000 },
    { label: 'Sep', navUsd: 1_164_000, investedUsd: 1_026_000 },
    { label: 'Oct', navUsd: 1_193_000, investedUsd: 1_038_000 },
    { label: 'Nov', navUsd: 1_219_200, investedUsd: 1_044_000 },
    { label: 'Dec', navUsd: 1_248_500, investedUsd: 1_050_000 },
  ],
  aiLogs: [
    {
      id: 'fallback-1',
      title: 'AI rotation into RWA sleeve',
      summary: 'Bought 5% AAPLX and trimmed 5% SUI after positive verification.',
      status: 'verified',
      timestampLabel: '2m ago',
      txDigest: 'mock-digest-1',
    },
    {
      id: 'fallback-2',
      title: 'Stablecoin reserve top-up',
      summary: 'Shifted 2% from BONDX into USDC to improve redemption liquidity.',
      status: 'pending',
      timestampLabel: '12m ago',
      txDigest: 'mock-digest-2',
    },
  ],
};

function numeric(value: unknown): number {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  if (value && typeof value === 'object') {
    const maybeValue = value as Record<string, unknown>;
    if ('value' in maybeValue) {
      return numeric(maybeValue.value);
    }
    if ('fields' in maybeValue) {
      return numeric(maybeValue.fields);
    }
  }

  return 0;
}

function stringKey(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  if (value && typeof value === 'object') {
    const maybeValue = value as Record<string, unknown>;
    if ('name' in maybeValue && typeof maybeValue.name === 'string') {
      return maybeValue.name;
    }
    if ('fields' in maybeValue) {
      return stringKey(maybeValue.fields);
    }
  }

  return '';
}

function parseTargetWeights(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== 'object') {
    return {};
  }

  const maybeRaw = raw as Record<string, unknown>;
  const contents = Array.isArray(maybeRaw.contents)
    ? maybeRaw.contents
    : Array.isArray(maybeRaw.data)
      ? maybeRaw.data
      : [];

  return contents.reduce<Record<string, number>>((acc, entry) => {
    if (!entry || typeof entry !== 'object') {
      return acc;
    }

    const item = entry as Record<string, unknown>;
    const key = stringKey(item.key ?? item.name);
    const value = numeric(item.value);
    if (key) {
      acc[key.toUpperCase()] = value;
    }
    return acc;
  }, {});
}

function actualWeightBps(valueUsd: number, totalNavUsd: number): number {
  if (!totalNavUsd) {
    return 0;
  }
  return Math.round((valueUsd / totalNavUsd) * 10_000);
}

export function mapBasketObjectToSnapshot(rawObject: unknown): FundSnapshot | null {
  const root = rawObject as {
    data?: {
      content?: {
        fields?: Record<string, unknown>;
      };
    };
  } | null;

  const fields = root?.data?.content?.fields;
  if (!fields) {
    return null;
  }

  const totalNavUsd = numeric(fields.nav_usdc) || numeric(fields.nav_sui);
  const totalShares = numeric(fields.total_shares);
  const usdcVault = numeric(fields.usdc_vault);
  const suiVault = numeric(fields.sui_vault);
  const aaplVault = numeric(fields.rwa_aapl_vault);
  const bondVault = numeric(fields.rwa_bond_vault);
  const weights = parseTargetWeights(fields.target_weights_bps);

  const availableStableUsd = usdcVault || 0;
  const effectiveInvestedUsd = totalNavUsd || suiVault;

  const assets: FundAsset[] = [
    {
      id: 'usdc',
      symbol: 'USDC',
      name: 'Cash Reserve',
      amount: usdcVault,
      valueUsd: usdcVault,
      targetWeightBps: weights.USDC ?? 0,
      actualWeightBps: actualWeightBps(usdcVault, totalNavUsd),
      logoUri: DEFAULT_ASSET_LOGOS.USDC,
      type: 'stable',
    },
    {
      id: 'sui',
      symbol: 'SUI',
      name: 'Sui Core Allocation',
      amount: suiVault,
      valueUsd: suiVault,
      targetWeightBps: weights.SUI ?? 0,
      actualWeightBps: actualWeightBps(suiVault, totalNavUsd),
      logoUri: DEFAULT_ASSET_LOGOS.SUI,
      type: 'crypto',
    },
    {
      id: 'aaplx',
      symbol: 'AAPLX',
      name: 'Wrapped Apple Equity',
      amount: aaplVault,
      valueUsd: aaplVault,
      targetWeightBps: weights.AAPLX ?? weights.RWA_AAPL ?? 0,
      actualWeightBps: actualWeightBps(aaplVault, totalNavUsd),
      logoUri: DEFAULT_ASSET_LOGOS.AAPLX,
      type: 'rwa',
    },
    {
      id: 'bondx',
      symbol: 'BONDX',
      name: 'Wrapped Treasury Basket',
      amount: bondVault,
      valueUsd: bondVault,
      targetWeightBps: weights.BONDX ?? weights.RWA_BOND ?? 0,
      actualWeightBps: actualWeightBps(bondVault, totalNavUsd),
      logoUri: DEFAULT_ASSET_LOGOS.BONDX,
      type: 'rwa',
    },
  ].filter((asset) => asset.valueUsd > 0 || asset.targetWeightBps > 0);

  return {
    totalNavUsd: totalNavUsd || FALLBACK_FUND_SNAPSHOT.totalNavUsd,
    availableUsdcUsd: availableStableUsd || FALLBACK_FUND_SNAPSHOT.availableUsdcUsd,
    sharePriceUsd: totalShares > 0 ? totalNavUsd / totalShares : FALLBACK_FUND_SNAPSHOT.sharePriceUsd,
    totalShares: totalShares || FALLBACK_FUND_SNAPSHOT.totalShares,
    investedUsd: effectiveInvestedUsd || FALLBACK_FUND_SNAPSHOT.investedUsd,
    monthlyChangePct: FALLBACK_FUND_SNAPSHOT.monthlyChangePct,
    assets: assets.length ? assets : FALLBACK_FUND_SNAPSHOT.assets,
    performance: FALLBACK_FUND_SNAPSHOT.performance,
    aiLogs: FALLBACK_FUND_SNAPSHOT.aiLogs,
  };
}

export function shortAddress(address?: string | null): string {
  if (!address) {
    return 'Not connected';
  }

  if (address.length < 12) {
    return address;
  }

  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
