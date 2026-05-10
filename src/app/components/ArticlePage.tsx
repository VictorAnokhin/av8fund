import React from 'react';
import { ArrowLeft, Facebook, Newspaper, Share2, Twitter } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { PageBreadcrumbsBar, PageHeroBadge, PageHeroShell } from './PageChrome';
import { API_FID } from '../config';
import { useI18n } from '../i18n';
import { getNewsArticleDetail, getNewsArticles, type NewsArticle, type NewsArticleDetail, type ProjectSettings } from '../lib/api';
import { getArticlePath, getArticlesPath, getBasePath } from '../lib/routes';

type ArticlePageProps = {
  project: ProjectSettings;
  articleId: number;
};

export function ArticlePage({ project, articleId }: ArticlePageProps) {
  const { language, messages } = useI18n();
  const homeHref = getBasePath();
  const [item, setItem] = React.useState<NewsArticleDetail | null>(null);
  const [related, setRelated] = React.useState<NewsArticle[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!articleId || articleId <= 0) {
        setError(messages.article.invalid);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const [article, relatedItems] = await Promise.all([
          getNewsArticleDetail(articleId, { fid: API_FID, language }),
          getNewsArticles({ fid: API_FID, limit: 4, language }),
        ]);

        if (cancelled) {
          return;
        }

        setItem(article);
        setRelated(relatedItems.filter((candidate) => candidate.id !== articleId).slice(0, 3));
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : messages.article.error);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [articleId, language, messages.article.error, messages.article.invalid]);

  const pageUrl = typeof window !== 'undefined' ? window.location.href : '';

  const heroTitle =
    !loading && error ? messages.article.pageTitle : item?.title ?? messages.article.pageTitle;
  const heroSubtitle = item && !error ? item.date || messages.article.noDate : null;

  return (
    <main className="relative min-h-[calc(100vh-160px)] bg-slate-950 pb-20 pt-14">
      <PageBreadcrumbsBar
        items={[
          { label: messages.breadcrumbs.home, href: homeHref },
          { label: messages.blog.pageTitle, href: getArticlesPath() },
          { label: item?.title || messages.article.pageTitle },
        ]}
      />
      <PageHeroShell
        badge={
          <PageHeroBadge label={messages.article.heroBadge} icon={<Newspaper className="h-3.5 w-3.5" />} variant="blue" />
        }
        title={heroTitle}
        subtitle={heroSubtitle}
        subtitleClassName="max-w-3xl text-lg text-slate-400"
        afterSubtitle={
          item && !loading && !error ? (
            <div className="flex max-w-4xl flex-col gap-6 pt-2 sm:flex-row sm:items-center sm:justify-between">
              <a
                href={getArticlesPath()}
                className="inline-flex items-center gap-2 text-slate-400 transition-colors hover:text-teal-300/90"
              >
                <ArrowLeft size={20} />
                <span>{messages.article.back}</span>
              </a>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-slate-500">{messages.article.share}</span>
                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-white/10 bg-slate-900/70 p-2 transition-colors hover:bg-blue-400/10"
                >
                  <Facebook size={18} className="text-white" />
                </a>
                <a
                  href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(pageUrl)}&text=${encodeURIComponent(item.title)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-white/10 bg-slate-900/70 p-2 transition-colors hover:bg-blue-400/10"
                >
                  <Twitter size={18} className="text-white" />
                </a>
                <button
                  type="button"
                  onClick={() => {
                    if (typeof navigator !== 'undefined' && navigator.clipboard && pageUrl) {
                      void navigator.clipboard.writeText(pageUrl);
                    }
                  }}
                  className="rounded-lg border border-white/10 bg-slate-900/70 p-2 transition-colors hover:bg-blue-400/10"
                >
                  <Share2 size={18} className="text-white" />
                </button>
              </div>
            </div>
          ) : null
        }
      />

      <div className="mx-auto max-w-4xl px-6 py-10">
        {loading ? (
          <div className="space-y-6">
            <div className="aspect-video animate-pulse rounded-3xl bg-white/5" />
            <div className="h-80 animate-pulse rounded-3xl bg-white/5" />
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-red-500/20 bg-red-500/10 px-6 py-5 text-red-200">
            {error}
          </div>
        ) : item ? (
          <>
            {item.imageUrl ? (
              <div className="mb-12 aspect-video overflow-hidden rounded-3xl">
                <ImageWithFallback src={item.imageUrl} alt={item.title} className="h-full w-full object-cover" />
              </div>
            ) : null}

            <article className="mb-8 rounded-3xl border border-white/10 bg-slate-900/70 p-8 backdrop-blur-md">
              {item.excerpt ? (
                <p className="mb-8 text-xl leading-relaxed text-slate-300">
                  {item.excerpt}
                </p>
              ) : null}
              <div
                className="article-content text-white"
                dangerouslySetInnerHTML={{ __html: item.body || `<p>${messages.article.emptyBody}</p>` }}
              />
            </article>

            {related.length > 0 ? (
              <div className="mt-16 border-t border-white/10 pt-12">
                <h3 className="mb-8 text-2xl text-white">{messages.article.related}</h3>
                <div className="grid gap-6 md:grid-cols-3">
                  {related.map((relatedItem) => (
                    <a
                      key={relatedItem.id}
                      href={getArticlePath(relatedItem.id)}
                      className="group overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70 transition-all duration-300 hover:scale-[1.02]"
                    >
                      <div className="aspect-video overflow-hidden bg-black/20">
                        {relatedItem.imageUrl ? (
                          <ImageWithFallback
                            src={relatedItem.imageUrl}
                            alt={relatedItem.title}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-slate-500">
                            <Newspaper size={32} />
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <h4 className="line-clamp-2 text-white transition-colors group-hover:text-blue-400">
                          {relatedItem.title}
                        </h4>
                        <p className="mt-2 text-sm text-slate-500">{relatedItem.date || messages.article.noDate}</p>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            ) : null}
          </>
        ) : null}
      </div>

      <style>{`
        .article-content {
          line-height: 1.8;
        }

        .article-content h1,
        .article-content h2,
        .article-content h3,
        .article-content h4 {
          color: #ffffff;
          margin: 1.5rem 0 0.75rem;
        }

        .article-content p,
        .article-content ul,
        .article-content ol,
        .article-content blockquote {
          margin: 0 0 1rem;
        }

        .article-content a {
          color: #60a5fa;
        }

        .article-content img {
          max-width: 100%;
          height: auto;
          border-radius: 1rem;
        }
      `}</style>
    </main>
  );
}
