const HERMES_PRICE_URL = 'https://hermes.pyth.network/v2/updates/price/latest';
const USD_SCALE = 100_000_000n;
const USDC_DECIMALS = 6;
const SUI_USD_PRICE_ID = '23d7315113f5b1d3ba7a83604c44b94d79f4fd69af77f804fc7f920a6dc65744';
const STABLE_USD_SYMBOLS = new Set(['USDC', 'USDT', 'USD']);

type PythParsedPrice = {
  id?: string;
  price?: {
    price?: string;
    expo?: number;
    publish_time?: number;
  };
};

type PythResponse = {
  parsed?: PythParsedPrice[];
};

export type OracleValueQuote = {
  valueUsdc: string;
  valueUsdcUnits: bigint;
  tokenUsdPrice: number;
  suiUsdPrice: number;
  publishTime?: number;
};

function normalizeFeedId(value: string): string {
  return value.trim().replace(/^0x/i, '').toLowerCase();
}

function tenPow(exponent: number): bigint {
  return 10n ** BigInt(Math.max(0, exponent));
}

function priceToUsdScaled(price: string, expo: number): bigint {
  const raw = BigInt(price);
  const scaleShift = expo + 8;
  return scaleShift >= 0 ? raw * tenPow(scaleShift) : raw / tenPow(Math.abs(scaleShift));
}

function formatUnits(value: bigint, decimals: number): string {
  const divisor = 10n ** BigInt(decimals);
  const whole = value / divisor;
  const fraction = (value % divisor).toString().padStart(decimals, '0').replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

async function fetchUsdPrices(feedIds: string[]): Promise<Map<string, { priceUsd8: bigint; publishTime?: number }>> {
  const uniqueIds = [...new Set(feedIds.map(normalizeFeedId).filter(Boolean))];
  const url = new URL(HERMES_PRICE_URL);
  uniqueIds.forEach((id) => url.searchParams.append('ids[]', id));

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Pyth price request failed: ${response.status}`);
  }

  const payload = (await response.json()) as PythResponse;
  const prices = new Map<string, { priceUsd8: bigint; publishTime?: number }>();
  for (const item of payload.parsed || []) {
    const id = normalizeFeedId(item.id || '');
    const price = item.price;
    if (!id || !price?.price || typeof price.expo !== 'number') {
      continue;
    }
    prices.set(id, {
      priceUsd8: priceToUsdScaled(price.price, price.expo),
      publishTime: price.publish_time,
    });
  }

  return prices;
}

export async function calculateOracleValueUsdc(input: {
  amountBaseUnits: bigint;
  tokenDecimals: number;
  tokenPriceFeedId?: string | null;
  tokenSymbol?: string | null;
}): Promise<OracleValueQuote> {
  if (input.amountBaseUnits <= 0n) {
    throw new Error('Amount must be greater than zero.');
  }

  const tokenFeedId = normalizeFeedId(input.tokenPriceFeedId || '');
  const tokenSymbol = String(input.tokenSymbol || '').trim().toUpperCase();
  const isNativeSui = tokenSymbol === 'SUI';
  const isStableUsd = STABLE_USD_SYMBOLS.has(tokenSymbol);
  const feedIds = tokenFeedId ? [tokenFeedId, SUI_USD_PRICE_ID] : [SUI_USD_PRICE_ID];
  const prices = await fetchUsdPrices(feedIds);
  const suiPrice = prices.get(SUI_USD_PRICE_ID);
  if (!suiPrice || suiPrice.priceUsd8 <= 0n) {
    throw new Error('SUI/USD oracle price is unavailable.');
  }

  const tokenPriceUsd8 = tokenFeedId
    ? prices.get(tokenFeedId)?.priceUsd8
    : isNativeSui
      ? suiPrice.priceUsd8
    : isStableUsd
      ? USD_SCALE
      : null;
  if (!tokenPriceUsd8 || tokenPriceUsd8 <= 0n) {
    throw new Error('Token oracle price is unavailable. Add a Pyth price feed ID in /tokens.');
  }

  const tokenUnits = 10n ** BigInt(input.tokenDecimals);
  const valueUsdcUnits = input.amountBaseUnits * tokenPriceUsd8 * 1_000_000n / tokenUnits / USD_SCALE;

  return {
    valueUsdc: formatUnits(valueUsdcUnits, USDC_DECIMALS),
    valueUsdcUnits,
    tokenUsdPrice: Number(tokenPriceUsd8) / Number(USD_SCALE),
    suiUsdPrice: Number(suiPrice.priceUsd8) / Number(USD_SCALE),
    publishTime: tokenFeedId ? prices.get(tokenFeedId)?.publishTime : suiPrice.publishTime,
  };
}
