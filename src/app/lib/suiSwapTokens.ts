import { SUI_NETWORK, SUI_UTILITY_PACKAGE_ID } from '../config';

export type SuiSwapToken = {
  symbol: string;
  name: string;
  coinType: string;
  decimals: number;
};

/** Native SUI coin type (full address form used by wallets and aggregators). */
export const NATIVE_SUI_COIN_TYPE = '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI';

const TESTNET_USDC: SuiSwapToken = {
  symbol: 'USDC',
  name: 'USDC',
  coinType: '0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC',
  decimals: 6,
};

/** Circle USDC on Sui mainnet. */
const MAINNET_USDC: SuiSwapToken = {
  symbol: 'USDC',
  name: 'USDC',
  coinType: '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC',
  decimals: 6,
};

const SUI_TOKEN: SuiSwapToken = {
  symbol: 'SUI',
  name: 'Sui',
  coinType: NATIVE_SUI_COIN_TYPE,
  decimals: 9,
};

function getUtilityToken(): SuiSwapToken | null {
  const packageId = SUI_UTILITY_PACKAGE_ID.trim();
  if (!packageId) {
    return null;
  }

  return {
    symbol: 'AV8U',
    name: 'AV8 Utility Token',
    coinType: `${packageId}::utility_token::UTILITY_TOKEN`,
    decimals: 6,
  };
}

export function getDefaultSuiSwapTokens(): SuiSwapToken[] {
  const net = SUI_NETWORK.trim().toLowerCase();
  const utilityToken = getUtilityToken();
  const extraTokens = utilityToken ? [utilityToken] : [];

  if (net === 'mainnet') {
    return [SUI_TOKEN, MAINNET_USDC, ...extraTokens];
  }

  return [SUI_TOKEN, TESTNET_USDC, ...extraTokens];
}

export function cetusAggregatorEnv(): 'mainnet' | 'testnet' {
  return SUI_NETWORK.trim().toLowerCase() === 'mainnet' ? 'mainnet' : 'testnet';
}

/** Official Cetus dApp (swap, pools); user picks chain inside the UI. */
export const CETUS_WEB_APP_HREF = 'https://app.cetus.zone/'

export function isSuiSwapSupportedNetwork(): boolean {
  const net = SUI_NETWORK.trim().toLowerCase();
  return net === 'mainnet' || net === 'testnet';
}
