import React from 'react';
import { ArrowRight, Calendar, HelpCircle, Newspaper, Search } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { PageBreadcrumbsBar, PageHeroBadge, PageHeroShell } from './PageChrome';
import { API_FID } from '../config';
import { useI18n } from '../i18n';
import { getNewsArticles, type NewsArticle, type ProjectSettings } from '../lib/api';
import { getArticlePath, getBasePath } from '../lib/routes';

type BlogPageProps = {
  project: ProjectSettings;
};

const PAGE_SIZE = 6;

type FaqItem = {
  question: string;
  answer: string;
};

const BLOG_FAQ_ITEMS: Record<'en' | 'ua' | 'ru', FaqItem[]> = {
  en: [
    {
      question: 'What can I find in AV8 articles?',
      answer: 'Articles collect market notes, product updates, token and DeFi observations, and practical explanations of how AV8 portfolio tools work.',
    },
    {
      question: 'How often are new materials published?',
      answer: 'The section is designed for regular updates. New publications can be added from laravel-api and will appear here automatically after publication.',
    },
    {
      question: 'Can articles be filtered or searched?',
      answer: 'Yes. Use the search field to find text inside titles, excerpts, and article bodies. If top articles exist, the Top filter appears automatically.',
    },
    {
      question: 'Where do article images and text come from?',
      answer: 'The page loads articles from laravel-api for the current project FID. Images, excerpts, body text, view counters, and dates come from the API response.',
    },
    {
      question: 'How do I add a new FAQ item?',
      answer: 'Edit BLOG_FAQ_ITEMS in BlogPage.tsx and add a new { question, answer } object for each language.',
    },
  ],
  ua: [
    {
      question: 'Що можна знайти у статтях AV8?',
      answer: 'У розділі зібрані ринкові нотатки, оновлення продукту, спостереження про токени й DeFi та практичні пояснення роботи портфельних інструментів AV8.',
    },
    {
      question: 'Як часто публікуються нові матеріали?',
      answer: 'Розділ розрахований на регулярні оновлення. Нові публікації можна додавати з laravel-api, після публікації вони автоматично з’являться тут.',
    },
    {
      question: 'Чи можна фільтрувати або шукати статті?',
      answer: 'Так. Поле пошуку працює за заголовками, короткими описами та текстом статей. Якщо є топові матеріали, фільтр Top з’являється автоматично.',
    },
    {
      question: 'Звідки беруться зображення і текст статей?',
      answer: 'Сторінка завантажує статті з laravel-api для поточного FID проєкту. Зображення, короткий опис, тіло статті, перегляди й дата приходять з API.',
    },
    {
      question: 'Як додати новий пункт FAQ?',
      answer: 'Відредагуйте BLOG_FAQ_ITEMS у BlogPage.tsx і додайте новий об’єкт { question, answer } для кожної мови.',
    },
  ],
  ru: [
    {
      question: 'Что можно найти в статьях AV8?',
      answer: 'В разделе собраны рыночные заметки, обновления продукта, наблюдения по токенам и DeFi, а также практические объяснения работы портфельных инструментов AV8.',
    },
    {
      question: 'Как часто публикуются новые материалы?',
      answer: 'Раздел рассчитан на регулярные обновления. Новые публикации можно добавлять из laravel-api, после публикации они автоматически появятся здесь.',
    },
    {
      question: 'Можно ли фильтровать или искать статьи?',
      answer: 'Да. Поле поиска работает по заголовкам, коротким описаниям и тексту статей. Если есть топовые материалы, фильтр Top появляется автоматически.',
    },
    {
      question: 'Откуда берутся изображения и текст статей?',
      answer: 'Страница загружает статьи из laravel-api для текущего FID проекта. Изображения, описание, тело статьи, просмотры и дата приходят из API.',
    },
    {
      question: 'Как добавить новый пункт FAQ?',
      answer: 'Отредактируйте BLOG_FAQ_ITEMS в BlogPage.tsx и добавьте новый объект { question, answer } для каждого языка.',
    },
  ],
};

export function BlogPage(_: BlogPageProps) {
  const { language, messages } = useI18n();
  const homeHref = getBasePath();
  const faqItems = BLOG_FAQ_ITEMS[language] || BLOG_FAQ_ITEMS.en;
  const [selectedFilter, setSelectedFilter] = React.useState<'all' | 'top'>('all');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [articles, setArticles] = React.useState<NewsArticle[]>([]);
  const [visibleCount, setVisibleCount] = React.useState(PAGE_SIZE);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const items = await getNewsArticles({ fid: API_FID, limit: 24, language });

        if (!cancelled) {
          setArticles(items);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : messages.blog.error);
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
  }, [language, messages.blog.error]);

  const filters = React.useMemo(() => {
    const nextFilters: Array<{ id: 'all' | 'top'; label: string }> = [{ id: 'all', label: messages.blog.filterAll }];

    if (articles.some((article) => (article.hot || 0) > 0)) {
      nextFilters.push({ id: 'top', label: messages.blog.filterTop });
    }

    return nextFilters;
  }, [articles, messages.blog.filterAll, messages.blog.filterTop]);

  const filteredArticles = React.useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return articles.filter((article) => {
      const matchesFilter = selectedFilter !== 'top' || (article.hot || 0) > 0;
      const haystack = [article.title, article.excerpt, article.body.replace(/<[^>]+>/g, ' ')]
        .join(' ')
        .toLowerCase();

      return matchesFilter && (normalizedQuery === '' || haystack.includes(normalizedQuery));
    });
  }, [articles, searchQuery, selectedFilter]);

  React.useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [language, searchQuery, selectedFilter]);

  const visibleArticles = React.useMemo(
    () => filteredArticles.slice(0, visibleCount),
    [filteredArticles, visibleCount],
  );

  const canLoadMore = visibleCount < filteredArticles.length;

  return (
    <main className="relative min-h-[calc(100vh-160px)] pb-20 pt-14">
      <PageBreadcrumbsBar
        items={[
          { label: messages.breadcrumbs.home, href: homeHref },
          { label: messages.blog.pageTitle },
        ]}
      />
      <PageHeroShell
        badge={
          <PageHeroBadge label={messages.blog.heroBadge} icon={<Newspaper className="h-3.5 w-3.5" />} variant="blue" />
        }
        title={messages.blog.pageTitle}
        subtitle={messages.blog.subtitle}
        afterSubtitle={
          <div className="relative mx-auto max-w-xl">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder={messages.blog.searchPlaceholder}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-full rounded-xl border border-white/[0.1] bg-[rgba(4,8,16,0.6)] py-4 pl-12 pr-4 text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] backdrop-blur-md transition-[border-color,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] placeholder:text-slate-500 focus:outline-none focus:border-teal-400/35 focus:ring-2 focus:ring-teal-400/25"
            />
          </div>
        }
      />

      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-12 flex flex-wrap justify-center gap-3">
          {filters.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setSelectedFilter(filter.id)}
              className={`rounded-xl px-6 py-3 transition-[background-color,border-color,box-shadow,color,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                selectedFilter === filter.id
                  ? 'border border-teal-400/30 bg-gradient-to-r from-teal-500/90 to-cyan-500/85 text-[#05060a] shadow-[0_12px_40px_-12px_rgba(45,212,191,0.45)]'
                  : 'border border-white/10 bg-[rgba(4,8,16,0.55)] text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] backdrop-blur-sm hover:border-teal-400/25'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="overflow-hidden rounded-3xl border border-white/[0.08] bg-[rgba(4,8,16,0.55)] backdrop-blur-sm">
                <div className="aspect-video animate-pulse bg-white/5" />
                <div className="space-y-3 p-6">
                  <div className="h-5 w-24 animate-pulse rounded bg-white/5" />
                  <div className="h-7 animate-pulse rounded bg-white/5" />
                  <div className="h-16 animate-pulse rounded bg-white/5" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-red-500/20 bg-red-500/10 px-6 py-5 text-center text-red-200">
            {error}
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {visibleArticles.map((article) => (
              <a
                key={article.id}
                href={getArticlePath(article.id)}
                className="group overflow-hidden rounded-3xl border border-white/[0.09] bg-[rgba(4,8,16,0.52)] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] backdrop-blur-md transition-[transform,border-color,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.02] hover:border-teal-400/28 hover:shadow-[0_20px_48px_-20px_rgba(45,212,191,0.22)]"
              >
                <div className="relative aspect-video overflow-hidden bg-black/20">
                  {article.imageUrl ? (
                    <ImageWithFallback
                      src={article.imageUrl}
                      alt={article.title}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-slate-500">
                      <Newspaper size={40} />
                    </div>
                  )}
                  {(article.hot || 0) > 0 ? (
                    <div className="absolute left-4 top-4">
                      <span className="rounded-full bg-gradient-to-r from-teal-400 to-cyan-400 px-3 py-1 text-xs font-medium text-[#05060a]">
                        {messages.blog.filterTop}
                      </span>
                    </div>
                  ) : null}
                </div>

                <div className="p-6">
                  <h2 className="mb-3 line-clamp-2 text-xl text-white transition-colors duration-300 group-hover:text-teal-200/95">
                    {article.title}
                  </h2>
                  <p className="mb-4 line-clamp-3 text-slate-400">{article.excerpt}</p>

                  <div className="flex items-center justify-between border-t border-white/10 pt-4">
                    <div className="flex items-center gap-1 text-sm text-slate-500">
                      <Calendar size={14} />
                      <span>{article.date || messages.blog.noDate}</span>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-sm text-slate-500">
                      {(article.view || 0) > 0 ? messages.blog.viewsLabel.replace('{count}', String(article.view || 0)) : messages.blog.openLabel}
                    </span>
                    <div className="flex items-center gap-2 text-teal-300/90 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                      <span className="text-sm">{messages.blog.readMore}</span>
                      <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}

        {!loading && !error && canLoadMore ? (
          <div className="mt-10 flex justify-center">
            <button
              type="button"
              onClick={() => setVisibleCount((current) => current + PAGE_SIZE)}
              className="rounded-xl border border-white/[0.1] bg-[rgba(4,8,16,0.55)] px-6 py-3 text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] backdrop-blur-sm transition-[border-color,color,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-teal-400/30 hover:text-teal-100"
            >
              {messages.blog.loadMore}
            </button>
          </div>
        ) : null}

        {!loading && !error && filteredArticles.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-2xl text-slate-400">{messages.blog.emptyTitle}</p>
            <p className="mt-2 text-slate-500">{messages.blog.emptyHint}</p>
          </div>
        ) : null}

        <section className="mt-16 rounded-[2rem] border border-white/[0.09] bg-[rgba(5,9,18,0.45)] p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] backdrop-blur-xl md:p-8">
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-teal-400/22 bg-teal-400/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-teal-200/90">
                <HelpCircle className="h-4 w-4" />
                FAQ
              </div>
              <h2 className="mt-4 text-3xl font-semibold text-white md:text-4xl">
                {language === 'ru' ? 'Частые вопросы' : language === 'ua' ? 'Поширені питання' : 'Frequently asked questions'}
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
                {language === 'ru'
                  ? 'Короткие ответы о разделе статей, источниках данных и редактировании FAQ.'
                  : language === 'ua'
                    ? 'Короткі відповіді про розділ статей, джерела даних і редагування FAQ.'
                    : 'Short answers about articles, data sources, and how to edit this FAQ.'}
              </p>
            </div>
          </div>

          <div className="grid gap-3">
            {faqItems.map((item, index) => (
              <details
                key={`${item.question}-${index}`}
                className="group rounded-2xl border border-white/[0.08] bg-[rgba(4,8,16,0.52)] px-4 py-3 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] transition-[border-color,background-color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-teal-400/25 hover:bg-[rgba(6,12,22,0.62)]"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left text-base font-semibold text-white">
                  <span>{item.question}</span>
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 text-teal-300/90 transition-[transform,color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
