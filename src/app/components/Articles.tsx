import React from 'react';
import { ArrowRight, Clock, FileText } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { API_FID } from '../config';
import { useI18n } from '../i18n';
import { getNewsArticleDetail, getNewsArticles, type NewsArticle, type NewsArticleDetail } from '../lib/api';

function ArticleBody({ body, fallback }: { body: string; fallback: string }) {
  if (!body.trim()) {
    return <p className="text-slate-400">{fallback}</p>;
  }

  return (
    <div
      className="prose prose-invert prose-slate max-w-none prose-p:text-slate-300 prose-headings:text-white prose-a:text-blue-400"
      dangerouslySetInnerHTML={{ __html: body }}
    />
  );
}

export function Articles() {
  const { language, messages } = useI18n();
  const [articles, setArticles] = React.useState<NewsArticle[]>([]);
  const [selectedId, setSelectedId] = React.useState<number | null>(null);
  const [selectedArticle, setSelectedArticle] = React.useState<NewsArticleDetail | null>(null);
  const [isListLoading, setIsListLoading] = React.useState(true);
  const [isArticleLoading, setIsArticleLoading] = React.useState(false);

  React.useEffect(() => {
    let active = true;

    setIsListLoading(true);
    setSelectedId(null);
    setSelectedArticle(null);

    getNewsArticles({ fid: API_FID, limit: 12, language })
      .then((items) => {
        if (!active) {
          return;
        }

        setArticles(items);
        const nextSelectedId = items[0]?.id ?? null;
        setSelectedId(nextSelectedId);
        setIsListLoading(false);
      })
      .catch((error) => {
        console.error('Failed to load article list', error);
        if (active) {
          setArticles([]);
          setIsListLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [language]);

  React.useEffect(() => {
    if (!selectedId) {
      setSelectedArticle(null);
      return;
    }

    let active = true;
    setIsArticleLoading(true);

    getNewsArticleDetail(selectedId, { fid: API_FID, language })
      .then((item) => {
        if (active) {
          setSelectedArticle(item);
          setIsArticleLoading(false);
        }
      })
      .catch((error) => {
        console.error('Failed to load article detail', error);
        if (active) {
          setSelectedArticle(null);
          setIsArticleLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [language, selectedId]);

  return (
    <div className="mt-16">
      <div className="mb-8">
        <h3 className="text-2xl font-bold text-white flex items-center gap-2">
          <FileText className="w-6 h-6 text-blue-400" />
          {messages.analytics.insightsTitle}
        </h3>
        <p className="mt-3 max-w-2xl text-slate-400">{messages.analytics.articlesSubtitle}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <div className="rounded-3xl border border-white/5 bg-slate-900/70 p-4">
          <div className="mb-4 px-2">
            <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
              {messages.analytics.articleList}
            </h4>
          </div>

          {isListLoading ? (
            <div className="px-2 py-8 text-sm text-slate-400">{messages.analytics.loading}</div>
          ) : articles.length === 0 ? (
            <div className="px-2 py-8 text-sm text-slate-400">{messages.analytics.empty}</div>
          ) : (
            <div className="space-y-3">
              {articles.map((article) => {
                const isSelected = selectedId === article.id;

                return (
                  <button
                    key={article.id}
                    type="button"
                    onClick={() => setSelectedId(article.id)}
                    className={`w-full rounded-2xl border p-4 text-left transition-all ${
                      isSelected
                        ? 'border-blue-500/40 bg-blue-500/10'
                        : 'border-white/5 bg-slate-950/40 hover:border-white/10 hover:bg-slate-950/70'
                    }`}
                  >
                    {article.imageUrl ? (
                      <div className="mb-3 overflow-hidden rounded-xl border border-white/5 bg-slate-950/60">
                        <ImageWithFallback src={article.imageUrl} alt={article.title} className="h-32 w-full object-cover" />
                      </div>
                    ) : null}

                    <div className="mb-2 flex items-center justify-between gap-3 text-xs text-slate-500">
                      <span>#{article.id}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {article.date || '...'}
                      </span>
                    </div>
                    <h5 className="mb-2 line-clamp-2 text-base font-semibold text-white">{article.title}</h5>
                    <p className="line-clamp-3 text-sm text-slate-400">{article.excerpt || messages.analytics.articleDescription}</p>
                    <div className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-blue-400">
                      {messages.analytics.openArticle}
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-white/5 bg-slate-900/50 p-6 lg:p-8">
          <div className="mb-6">
            <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
              {messages.analytics.articleView}
            </h4>
          </div>

          {isArticleLoading ? (
            <div className="py-12 text-sm text-slate-400">{messages.analytics.loading}</div>
          ) : !selectedArticle ? (
            <div className="py-12 text-sm text-slate-400">{messages.analytics.empty}</div>
          ) : (
            <article>
              {selectedArticle.imageUrl ? (
                <div className="mb-6 overflow-hidden rounded-2xl border border-white/5 bg-slate-950/60">
                  <ImageWithFallback src={selectedArticle.imageUrl} alt={selectedArticle.title} className="max-h-[360px] w-full object-cover" />
                </div>
              ) : null}

              <div className="mb-4 flex items-center gap-3 text-sm text-slate-500">
                <span>#{selectedArticle.id}</span>
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {selectedArticle.date || '...'}
                </span>
              </div>

              <h3 className="mb-4 text-3xl font-bold leading-tight text-white">{selectedArticle.title}</h3>

              {selectedArticle.excerpt ? (
                <p className="mb-6 text-lg leading-relaxed text-slate-300">{selectedArticle.excerpt}</p>
              ) : null}

              <ArticleBody body={selectedArticle.body} fallback={messages.analytics.noContent} />
            </article>
          )}
        </div>
      </div>
    </div>
  );
}
