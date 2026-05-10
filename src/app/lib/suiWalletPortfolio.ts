import type { SuiClient } from '@mysten/sui/client';

import type { TransparencyHolding, WalletPortfolioToken, Web3SwapToken } from './api';

function formatBalanceString(amount: bigint, decimals: number): string {
  if (decimals <= 0) {
    return amount.toString();
  }

  const negative = amount < 0n;
  const value = negative ? -amount : amount;
  const base = 10n ** BigInt(decimals);
  const whole = value / base;
  const fraction = value % base;
  const fractionStr = fraction
    .toString()
    .padStart(decimals, '0')
    .replace(/0+$/, '');

  const wholeNumber = Number(whole);
  const formattedWhole = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(wholeNumber);

  const core = fractionStr ? `${formattedWhole}.${fractionStr}` : formattedWhole;

  return `${negative ? '-' : ''}${core}`;
}

function symbolFromCoinType(coinType: string, metadataSymbol: string | null | undefined): string {
  const fromMeta = String(metadataSymbol || '').trim();
  if (fromMeta) {
    return fromMeta.slice(0, 16);
  }

  const parts = coinType.split('::');
  const tail = parts[parts.length - 1] || coinType;

  return tail.slice(0, 16) || 'COIN';
}

export type SuiWalletPortfolioSnapshot = {
  walletTokens: WalletPortfolioToken[];
  catalogTokens: Web3SwapToken[];
  holdings: TransparencyHolding[];
  totalUsd: number;
};

export async function loadSuiOwnerCoinPortfolio(client: SuiClient, owner: string): Promise<SuiWalletPortfolioSnapshot> {
  const trimmed = String(owner || '').trim();
  if (!trimmed) {
    return { walletTokens: [], catalogTokens: [], holdings: [], totalUsd: 0 };
  }

  const byType = new Map<string, bigint>();
  let cursor: string | null | undefined = undefined;

  for (;;) {
    const page = await client.getAllCoins({ owner: trimmed, cursor });
    for (const coin of page.data) {
      byType.set(coin.coinType, (byType.get(coin.coinType) ?? 0n) + BigInt(coin.balance));
    }
    if (!page.hasNextPage) {
      break;
    }
    cursor = page.nextCursor ?? undefined;
  }

  const coinTypes = [...byType.keys()];

  const metas = await Promise.all(
    coinTypes.map(async (coinType) => {
      try {
        return await client.getCoinMetadata({ coinType });
      } catch {
        return null;
      }
    }),
  );

  const walletTokens: WalletPortfolioToken[] = [];
  const holdings: TransparencyHolding[] = [];
  const catalogTokens: Web3SwapToken[] = [];

  let index = 0;
  for (let i = 0; i < coinTypes.length; i += 1) {
    const coinType = coinTypes[i];
    const raw = byType.get(coinType) ?? 0n;
    if (raw === 0n) {
      continue;
    }

    const meta = metas[i];
    const decimals = typeof meta?.decimals === 'number' ? meta.decimals : 9;
    const symbol = symbolFromCoinType(coinType, meta?.symbol);
    const name = String(meta?.name || symbol || 'Coin').trim() || symbol;
    const balanceStr = formatBalanceString(raw, decimals);
    const amount = Number(balanceStr);
    const nowIso = new Date().toISOString();

    const w: WalletPortfolioToken = {
      chain: 'sui',
      token_address: coinType,
      symbol,
      name,
      decimals,
      balance: balanceStr,
      price_usd: null,
      value_usd: null,
      logo: typeof meta?.iconUrl === 'string' ? meta.iconUrl : null,
      is_spam: false,
      is_selected: true,
      commission: '0',
      synced_at: nowIso,
    };
    walletTokens.push(w);

    catalogTokens.push({
      id: index + 1,
      symbol,
      name,
      address: coinType,
      decimals,
      chain_id: 'sui',
      chain_id_decimal: '',
      coingecko_id: '',
      commission: 0,
    });

    holdings.push({
      type: 'token',
      id: `sui-${index}-${coinType}`,
      name,
      symbol,
      chain: 'sui',
      usd_value: 0,
      share: 0,
      amount: Number.isFinite(amount) ? amount : null,
      price: null,
      logo_url: typeof meta?.iconUrl === 'string' ? meta.iconUrl : null,
      link: null,
    });

    index += 1;
  }

  walletTokens.sort((a, b) => Number(b.balance || 0) - Number(a.balance || 0));
  holdings.sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0));
  catalogTokens.sort((a, b) => a.symbol.localeCompare(b.symbol));

  const totalAmount = holdings.reduce((sum, row) => sum + (row.amount ?? 0), 0);
  holdings.forEach((row) => {
    row.share = totalAmount > 0 && row.amount !== null
      ? Math.round((row.amount / totalAmount) * 1000) / 10
      : 0;
  });

  return {
    walletTokens,
    catalogTokens,
    holdings,
    totalUsd: 0,
  };
}
