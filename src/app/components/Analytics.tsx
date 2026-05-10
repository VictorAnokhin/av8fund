import React from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ArrowRight, BrainCircuit, ChevronRight, LineChart } from 'lucide-react';

import { useI18n } from '../i18n';
import { API_FID } from '../config';
import {
  getNewsArticles,
  type ProjectSettings,
  type NewsArticle,
} from '../lib/api';
import { getArticlePath, getWhitepaperPath } from '../lib/routes';

type AnalyticsProps = {
  project: ProjectSettings;
};

type MarketToken = {
  symbol: string;
  name: string;
  price: string;
  change: number;
  sparkline: number[];
  imageUrl?: string;
};

type CoinGeckoMarketCoin = {
  id: string;
  symbol?: string;
  name?: string;
  image?: string;
  current_price?: number;
  price_change_percentage_24h?: number;
  sparkline_in_7d?: {
    price?: number[];
  };
};

const MARKET_TOKEN_IDS = ['bitcoin', 'ethereum', 'solana', 'sui', 'arbitrum'] as const;

/** Fallback thumbs when API is unavailable (same IDs as CoinGecko). */
const TOKEN_THUMB_BY_ID: Record<(typeof MARKET_TOKEN_IDS)[number], string> = {
  bitcoin: 'https://assets.coingecko.com/coins/images/1/thumb/bitcoin.png',
  ethereum: 'https://assets.coingecko.com/coins/images/279/thumb/ethereum.png',
  solana: 'https://assets.coingecko.com/coins/images/4128/thumb/solana.png',
  sui: 'https://assets.coingecko.com/coins/images/26375/thumb/sui_asset.jpeg',
  arbitrum: 'https://assets.coingecko.com/coins/images/16547/thumb/arb.jpg',
};

const FALLBACK_MARKET_TOKENS: MarketToken[] = [
  { symbol: 'BTC', name: 'Bitcoin', price: '$64,280', change: 2.34, sparkline: [42, 44, 43, 47, 49, 48, 52, 55], imageUrl: TOKEN_THUMB_BY_ID.bitcoin },
  { symbol: 'ETH', name: 'Ethereum', price: '$3,180', change: 1.18, sparkline: [31, 30, 32, 34, 36, 35, 37, 39], imageUrl: TOKEN_THUMB_BY_ID.ethereum },
  { symbol: 'SOL', name: 'Solana', price: '$142.80', change: -0.72, sparkline: [26, 29, 28, 27, 25, 24, 23, 22], imageUrl: TOKEN_THUMB_BY_ID.solana },
  { symbol: 'SUI', name: 'Sui', price: '$1.84', change: 4.12, sparkline: [10, 11, 12, 12, 14, 15, 16, 18], imageUrl: TOKEN_THUMB_BY_ID.sui },
  { symbol: 'ARB', name: 'Arbitrum', price: '$0.92', change: -1.45, sparkline: [18, 17, 18, 16, 15, 15, 14, 13], imageUrl: TOKEN_THUMB_BY_ID.arbitrum },
];

function hasDeskNoteHtmlkey(article: NewsArticle): boolean {
  const value = (article.htmlkeys || '').toLowerCase();
  return value.includes('desk-note') || value.includes('desk note') || value.includes('desknote');
}

function formatMarketPrice(value: number | undefined): string {
  if (!Number.isFinite(value)) {
    return '$0.00';
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: Number(value) >= 100 ? 0 : 2,
  }).format(Number(value));
}

function Sparkline({ values, positive }: { values: number[]; positive: boolean }) {
  const width = 56;
  const height = 18;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-5 w-14 shrink-0 overflow-visible sm:h-[22px] sm:w-16" aria-hidden="true">
      <polyline
        points={points}
        fill="none"
        stroke={positive ? '#34d399' : '#fb7185'}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TokenLogo({
  imageUrl,
  symbol,
}: {
  imageUrl?: string;
  symbol: string;
}) {
  const [failed, setFailed] = React.useState(!imageUrl);

  if (failed || !imageUrl) {
    return (
      <div
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/8 text-[10px] font-bold text-white ring-1 ring-white/10"
        aria-hidden
      >
        {symbol.slice(0, 1)}
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt=""
      width={28}
      height={28}
      className="h-7 w-7 shrink-0 rounded-full object-cover ring-1 ring-white/10"
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}

export function Analytics({ project }: AnalyticsProps) {
  const { language, messages } = useI18n();
  const [deskNotes, setDeskNotes] = React.useState<NewsArticle[]>([]);
  const [deskNotesLoading, setDeskNotesLoading] = React.useState(true);
  const [marketTokens, setMarketTokens] = React.useState<MarketToken[]>(FALLBACK_MARKET_TOKENS);
  const [marketTokensLoading, setMarketTokensLoading] = React.useState(true);
  const [marketTokensError, setMarketTokensError] = React.useState(false);
  const websiteUrl = project.url || '#about';
  const whitepaperUrl = getWhitepaperPath();
  const telegramUrl = project.telegram
    ? project.telegram.startsWith('http')
      ? project.telegram
      : `https://t.me/${project.telegram.replace(/^@/, '')}`
    : websiteUrl;
  const twitterUrl = project.twitter
    ? project.twitter.startsWith('http')
      ? project.twitter
      : `https://x.com/${project.twitter.replace(/^@/, '')}`
    : '';
  const data = messages.analytics.chartMonths.map((name, index) => ({
    name,
    value: [4000, 4500, 4200, 5800, 6200, 5900, 7500, 8200, 7800, 9500, 10200, 12500][index],
    baseline: [3900, 4100, 4300, 4700, 5200, 5600, 6100, 6700, 7300, 8100, 9100, 9800][index],
  }));

  React.useEffect(() => {
    let active = true;

    async function loadDeskNotes() {
      try {
        setDeskNotesLoading(true);

        const news = await getNewsArticles({ fid: API_FID, limit: 12, language });
        const preferred = news.filter(hasDeskNoteHtmlkey);
        const fallback = news.filter((item) => !preferred.some((preferredItem) => preferredItem.id === item.id));
        const nextItems = [...preferred, ...fallback].slice(0, 2);

        if (active) {
          setDeskNotes(nextItems);
        }
      } catch {
        if (active) {
          setDeskNotes([]);
        }
      } finally {
        if (active) {
          setDeskNotesLoading(false);
        }
      }
    }

    void loadDeskNotes();

    return () => {
      active = false;
    };
  }, [language]);

  React.useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function loadMarketTokens() {
      setMarketTokensLoading(true);
      setMarketTokensError(false);

      try {
        const params = new URLSearchParams({
          vs_currency: 'usd',
          ids: MARKET_TOKEN_IDS.join(','),
          order: 'market_cap_desc',
          per_page: String(MARKET_TOKEN_IDS.length),
          page: '1',
          sparkline: 'true',
          price_change_percentage: '24h',
        });
        const response = await fetch(`https://api.coingecko.com/api/v3/coins/markets?${params.toString()}`, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`CoinGecko market request failed: ${response.status}`);
        }

        const payload = (await response.json()) as CoinGeckoMarketCoin[];
        const byId = new Map(payload.map((coin) => [coin.id, coin]));
        const nextTokens = MARKET_TOKEN_IDS.map((id) => {
          const coin = byId.get(id);
          const fallback = FALLBACK_MARKET_TOKENS[MARKET_TOKEN_IDS.indexOf(id)];
          const sparkline = coin?.sparkline_in_7d?.price?.filter((value) => Number.isFinite(value)).slice(-24);

          return {
            symbol: (coin?.symbol || fallback.symbol).toUpperCase(),
            name: coin?.name || fallback.name,
            price: formatMarketPrice(coin?.current_price),
            change: Number(coin?.price_change_percentage_24h ?? fallback.change),
            sparkline: sparkline && sparkline.length > 1 ? sparkline : fallback.sparkline,
            imageUrl: typeof coin?.image === 'string' && coin.image ? coin.image : TOKEN_THUMB_BY_ID[id],
          };
        });

        if (active) {
          setMarketTokens(nextTokens);
        }
      } catch (error) {
        if (active && !(error instanceof DOMException && error.name === 'AbortError')) {
          setMarketTokens(FALLBACK_MARKET_TOKENS);
          setMarketTokensError(true);
        }
      } finally {
        if (active) {
          setMarketTokensLoading(false);
        }
      }
    }

    void loadMarketTokens();

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  return (
    <section id="analytics" className="relative overflow-hidden border-t border-white/[0.06] bg-[linear-gradient(180deg,rgba(6,9,16,0.55)_0%,rgba(7,11,22,0.85)_100%)] py-16">
      <div className="absolute inset-0">
        <div className="absolute left-1/4 top-10 h-64 w-64 rounded-full bg-teal-400/[0.06] blur-3xl" />
        <div className="absolute right-[12%] bottom-10 h-72 w-72 rounded-full bg-violet-500/[0.055] blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-6">
        <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
          <div className="ce-glass-slab flex flex-col gap-3 rounded-[2rem] p-5">
            <div className="rounded-[1.5rem] border border-white/[0.07] bg-[rgba(4,8,18,0.45)] p-3 backdrop-blur-md">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Market watch</div>
                <div className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${marketTokensError ? 'text-amber-300' : 'text-sky-300'}`}>
                  {marketTokensLoading ? 'Loading' : marketTokensError ? 'Fallback' : 'CoinGecko'}
                </div>
              </div>
              <div className="space-y-1.5">
                {marketTokens.map((token) => {
                  const positive = token.change >= 0;

                  return (
                    <div
                      key={token.symbol}
                      className="flex min-w-0 items-center gap-2 rounded-xl border border-white/6 bg-white/[0.03] px-2 py-2 text-sm sm:gap-3 sm:px-3"
                    >
                      <TokenLogo imageUrl={token.imageUrl} symbol={token.symbol} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-semibold text-white">{token.symbol}</div>
                        <div className="truncate text-[11px] text-slate-500">{token.name}</div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-0.5 text-right tabular-nums">
                        <div className="font-mono text-xs text-slate-200">{token.price}</div>
                        <div className={`font-mono text-[11px] leading-none sm:text-xs ${positive ? 'text-emerald-300' : 'text-rose-300'}`}>
                          {positive ? '+' : ''}{token.change.toFixed(2)}%
                        </div>
                      </div>
                      <div className="flex shrink-0 justify-end">
                        <Sparkline values={token.sparkline} positive={positive} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="mb-2">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Navigation</div>
              <div className="mt-2 text-2xl font-semibold text-white">Command routes</div>
            </div>
            <a
              href={twitterUrl || '#'}
              target={twitterUrl ? '_blank' : undefined}
              rel={twitterUrl ? 'noreferrer' : undefined}
              className="flex items-center justify-between gap-2 rounded-2xl bg-gradient-to-r from-sky-400 to-cyan-300 px-8 py-4 font-bold text-slate-950 shadow-[0_20px_50px_rgba(56,189,248,0.28)] transition hover:brightness-110"
            >
              {messages.hero.twitterLabel}
              <ArrowRight className="h-5 w-5" />
            </a>
            <a
              href={whitepaperUrl}
              className="flex items-center justify-between gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-8 py-4 font-semibold tracking-wide text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] transition-[background,border-color,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-teal-400/20 hover:bg-white/[0.07]"
            >
              {messages.footer.whitepaper}
              <ChevronRight className="h-5 w-5" />
            </a>
            <a
              href={telegramUrl}
              target={telegramUrl.startsWith('http') ? '_blank' : undefined}
              rel={telegramUrl.startsWith('http') ? 'noreferrer' : undefined}
              className="flex items-center justify-between gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-8 py-4 font-semibold tracking-wide text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] transition-[background,border-color,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-teal-400/20 hover:bg-white/[0.07]"
            >
              {messages.hero.openTelegram}
              <ChevronRight className="h-5 w-5" />
            </a>
          </div>
          <div className="ce-glass-slab rounded-[2rem] p-5">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Horizon Analytics</div>
                <div className="mt-2 text-2xl font-semibold text-white">{messages.analytics.indexName}</div>
              </div>
              <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-sm font-semibold text-emerald-300">
                {messages.analytics.ytd}
              </div>
            </div>

            <div className="mb-5 grid gap-3 md:grid-cols-3">
              <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/65 p-3.5">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Current Reading</div>
                <div className="mt-2 text-3xl font-semibold text-white">
                  12,500
                  <span className="ml-2 text-sm font-normal text-slate-500">{messages.analytics.points}</span>
                </div>
              </div>
              <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/65 p-3.5">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Signal Bias</div>
                <div className="mt-2 text-3xl font-semibold text-sky-300">Bullish</div>
              </div>
              <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/65 p-3.5">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Volatility Posture</div>
                <div className="mt-2 text-3xl font-semibold text-amber-300">Controlled</div>
              </div>
            </div>

            <div className="h-[190px] sm:h-[220px] md:h-[250px] lg:h-[280px] rounded-[1.75rem] border border-white/8 bg-[linear-gradient(180deg,rgba(15,23,42,0.86)_0%,rgba(3,7,18,0.96)_100%)] p-2 sm:p-3">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                  <defs>
                    <linearGradient id="analyticsMain" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.38} />
                      <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="analyticsBase" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.14} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748b" tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#08111f',
                      borderColor: 'rgba(148,163,184,0.15)',
                      borderRadius: '18px',
                      color: '#e2e8f0',
                    }}
                  />
                  <Area type="monotone" dataKey="baseline" stroke="#f59e0b" strokeWidth={1.5} fill="url(#analyticsBase)" />
                  <Area type="monotone" dataKey="value" stroke="#38bdf8" strokeWidth={3} fill="url(#analyticsMain)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-5 rounded-[1.75rem] border border-white/[0.08] bg-[linear-gradient(135deg,rgba(8,14,26,0.92)_0%,rgba(12,20,38,0.88)_100%)] p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] backdrop-blur-xl">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-3 text-amber-300">
                  <BrainCircuit className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xl font-semibold text-white">Interpretation layer</div>
                  <div className="text-sm text-slate-400">Pair the chart with a point of view.</div>
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-[0.18em] text-slate-400">Desk Note</span>
                  <LineChart className="h-4 w-4 text-emerald-300" />
                </div>
                {deskNotesLoading ? (
                  <p className="mt-3 text-sm leading-6 text-slate-300">
                    Loading desk notes...
                  </p>
                ) : deskNotes.length > 0 ? (
                  <div className="mt-3 space-y-3">
                    {deskNotes.map((item) => (
                      <a
                        key={item.id}
                        href={getArticlePath(item.id)}
                        className="block rounded-xl border border-white/8 bg-slate-950/55 px-4 py-3 text-sm leading-6 text-slate-200 transition hover:border-sky-400/30 hover:text-white"
                      >
                        {item.title}
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm leading-6 text-slate-300">
                    Capital is climbing above baseline while the volatility posture stays controlled.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
