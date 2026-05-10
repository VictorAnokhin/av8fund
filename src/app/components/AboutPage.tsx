import React from 'react';
import type { ProjectSettings } from '../lib/api';
import { useI18n } from '../i18n';
import { getBasePath } from '../lib/routes';
import { PageBreadcrumbsBar, PageHeroBadge, PageHeroShell } from './PageChrome';

type AboutPageProps = {
  project: ProjectSettings;
};

const TOC_ITEMS = [
  { id: 'chapter-i', label: 'Глава I: Смерть «Ручного» Капитала' },
  { id: 'chapter-ii', label: 'Глава II: Философия «Цифрового Кочевника»' },
  { id: 'chapter-iii', label: 'Глава III: Тандем Разумов (Модель 3/5)' },
  { id: 'chapter-iv', label: 'Глава IV: Меритократия Наследия' },
  { id: 'chapter-v', label: 'Глава V: Прозрачность как Броня' },
  { id: 'epilogue', label: 'Итог: «Цифровой След»' },
] as const;

export function AboutPage({ project: _project }: AboutPageProps) {
  const { messages } = useI18n();
  const homeHref = getBasePath();

  return (
    <main className="relative min-h-[calc(100vh-160px)] pb-24 pt-14 text-slate-200">
      <PageBreadcrumbsBar
        items={[
          { label: messages.breadcrumbs.home, href: homeHref },
          { label: messages.navbar.aboutProject },
        ]}
      />
      <PageHeroShell
        badge={
          <PageHeroBadge label={messages.aboutPage.heroBadge} variant="violet" />
        }
        title={messages.navbar.aboutProject}
        subtitle={messages.aboutPage.heroSubtitle}
        subtitleClassName="max-w-3xl text-lg leading-relaxed text-slate-400"
      />

      <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-6">
        <div className="lg:grid lg:grid-cols-[minmax(0,240px)_minmax(0,1fr)] lg:gap-14 xl:grid-cols-[minmax(0,260px)_minmax(0,1fr)] xl:gap-16">
          <aside className="mb-12 lg:mb-0">
            <nav
              aria-label="Оглавление Whitepaper"
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm lg:sticky lg:top-28"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-300/90">
                Оглавление
              </p>
              <p className="mt-1 text-[11px] leading-snug text-slate-500">
                Философско-технический манифест AV8 Capital
              </p>
              <ol className="mt-5 space-y-2.5 border-t border-white/10 pt-5 text-sm">
                <li>
                  <a
                    href="#whitepaper-title"
                    className="text-slate-400 transition-[color,outline-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-teal-200/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400/70"
                  >
                    Титул
                  </a>
                </li>
                {TOC_ITEMS.map((item, idx) => (
                  <li key={item.id}>
                    <a
                      href={`#${item.id}`}
                      className="block text-left leading-snug text-slate-400 transition-[color,outline-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-teal-200/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400/70"
                    >
                      <span className="text-slate-600 tabular-nums">{idx + 1}.</span>{' '}
                      {item.label.replace(/^Глава [IVX]+:\s*/, '')}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          </aside>

          <article
            id="whitepaper"
            className="min-w-0 max-w-3xl rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900/50 to-slate-950/80 px-5 py-8 shadow-[0_0_80px_-20px_rgba(56,189,248,0.15)] sm:px-8 sm:py-10"
          >
            <header id="whitepaper-title" className="scroll-mt-28 border-b border-white/10 pb-10">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-400/80">
                Whitepaper
              </p>
              <h2 className="mt-4 text-2xl font-semibold leading-tight tracking-tight text-white sm:text-3xl md:text-[1.75rem] md:leading-snug">
                AV8 Capital: Архитектура Автономного Наследия
              </h2>
            </header>

            <div className="space-y-14 pt-12 text-[17px] leading-[1.75] text-slate-300/95 sm:text-lg sm:leading-[1.8]">
              <section id="chapter-i" className="scroll-mt-28">
                <h3 className="text-xl font-semibold text-white sm:text-2xl">
                  Глава I: Смерть «Ручного» Капитала
                </h3>
                <p className="mt-6">
                  <strong className="font-semibold text-slate-100">Проблема:</strong>{' '}
                  Классическое управление активами страдает от «биологических ограничений». Доверие к
                  фонду всегда завязано на личности управляющего (Key Person Risk). Если он ошибается,
                  стареет или меняет приоритеты — ваш капитал под угрозой.
                </p>
                <p className="mt-5">
                  <strong className="font-semibold text-slate-100">Наше решение:</strong>{' '}
                  Мы заменяем личность <strong className="text-white">Протоколом</strong>. В AV8
                  стратегия не является предметом обсуждения — она является кодом. Мы переходим от
                  «управления на доверии» к «управлению на доказательствах» (Proof-of-Governance).
                </p>
                <ul className="mt-6 list-disc space-y-3 pl-6 marker:text-teal-400/75">
                  <li>
                    Капитал перестает быть заложником человеческих эмоций: страха на обвале рынка или
                    жадности на его пике.
                  </li>
                  <li>
                    Фонд функционирует как математическая константа, где правила игры зафиксированы в
                    блокчейне Sui раз и навсегда.
                  </li>
                </ul>
              </section>

              <section id="chapter-ii" className="scroll-mt-28">
                <h3 className="text-xl font-semibold text-white sm:text-2xl">
                  Глава II: Философия «Цифрового Кочевника»
                </h3>
                <p className="mt-6">
                  <strong className="font-semibold text-slate-100">Концепция:</strong> В XXI веке
                  владение физическим активом в одной стране — это риск. Мы предлагаем{' '}
                  <strong className="text-white">абстракцию владения</strong>. Через токенизацию
                  реальных активов (RWA) — от автопарков до объектов недвижимости — мы превращаем
                  локализованный бизнес в глобальную ликвидность.
                </p>
                <p className="mt-6 font-semibold text-slate-100">Механизм устойчивости:</p>
                <p className="mt-2">
                  Фонд спроектирован как «облачная юрисдикция».
                </p>
                <ul className="mt-5 list-disc space-y-3 pl-6 marker:text-teal-400/75">
                  <li>
                    <strong className="text-slate-200">Динамическая прописка:</strong> Если правовая
                    среда в одной стране становится токсичной (коррупция, экспроприация, регуляторный
                    хаос), ИИ-аналитики инициируют протокол миграции.
                  </li>
                  <li>
                    <strong className="text-slate-200">Цифровая тень:</strong> Физический бизнес
                    продолжает работать на местах, но его финансовое сердце (центр прибыли и
                    управления) мгновенно перемещается в юрисдикцию с «солнечной» погодой для
                    капитала. Мы не боимся границ, потому что капитал течет там, где его уважают.
                  </li>
                </ul>
              </section>

              <section id="chapter-iii" className="scroll-mt-28">
                <h3 className="text-xl font-semibold text-white sm:text-2xl">
                  Глава III: Тандем Разумов (Модель 3/5)
                </h3>
                <p className="mt-6">
                  <strong className="font-semibold text-slate-100">Суть:</strong> Мы решаем главную
                  дилемму ИИ — отсутствие морального компаса, и главную дилемму человека — предвзятость.
                </p>
                <ul className="mt-6 list-disc space-y-4 pl-6 marker:text-teal-400/75">
                  <li>
                    <strong className="text-slate-200">Алгоритмическая совесть (2 ИИ):</strong> Эти
                    узлы управления настроены на жесткий комплаенс и математическую выгоду. Они
                    анализируют миллионы транзакций в секунду, выявляя аномалии, которые пропустит
                    любой аудитор. ИИ голосуют только за те решения, которые соответствуют
                    «Генеральному коду ценностей» основателя.
                  </li>
                  <li>
                    <strong className="text-slate-200">Человеческий горизонт (3 Человека):</strong>{' '}
                    Люди обеспечивают связь с реальностью. Они нужны там, где требуется эмпатия,
                    переговоры или реакция на события, не поддающиеся оцифровке (например, мировая
                    пандемия или смена технологической парадигмы).
                  </li>
                </ul>
                <p className="mt-6">
                  <strong className="font-semibold text-slate-100">Безопасность:</strong> Голос 3 из 5
                  исключает «восстание машин» и «сговор людей». Это система сдержек и противовесов,
                  которая делает фонд самым стабильным субъектом в мировой экономике.
                </p>
              </section>

              <section id="chapter-iv" className="scroll-mt-28">
                <h3 className="text-xl font-semibold text-white sm:text-2xl">
                  Глава IV: Меритократия Наследия
                </h3>
                <p className="mt-6">
                  <strong className="font-semibold text-slate-100">Проблема:</strong> «Синдром третьего
                  поколения» — когда наследники растрачивают капитал, не понимая его ценности.
                </p>
                <p className="mt-5">
                  <strong className="font-semibold text-slate-100">Наша инновация:</strong> AV8 вводит
                  понятие <strong className="text-white">«Активного Наследования»</strong>. Фонд — это
                  не бесплатный банкомат, а тренажер для развития личности.
                </p>
                <ul className="mt-6 list-disc space-y-3 pl-6 marker:text-teal-400/75">
                  <li>
                    <strong className="text-slate-200">ИИ-Тьютор:</strong> Каждый преемник получает
                    доступ к закрытой экосистеме обучения. Система отслеживает его успехи в управлении
                    малыми портфелями, его этические выборы и когнитивные способности.
                  </li>
                  <li>
                    <strong className="text-slate-200">Доступ к штурвалу:</strong> Чтобы войти в
                    Наблюдательный совет, наследник должен сдать «экзамен реальности» своему
                    ИИ-регенту. Это гарантирует, что к управлению приходят не «дети основателя», а{' '}
                    <strong className="text-white">подготовленные лидеры</strong>, разделяющие философию
                    фонда. Ресурсы выдаются под ответственность, а не под фамилию.
                  </li>
                </ul>
              </section>

              <section id="chapter-v" className="scroll-mt-28">
                <h3 className="text-xl font-semibold text-white sm:text-2xl">
                  Глава V: Прозрачность как Броня
                </h3>
                <p className="mt-6">
                  <strong className="font-semibold text-slate-100">Принцип:</strong> В мире тотальной
                  лжи честность — самая дорогая валюта. В традиционных фондах отчеты приходят раз в
                  квартал и могут быть «подрисованы». В AV8 отчетность происходит в{' '}
                  <strong className="text-white">реальном времени</strong> прямо в блокчейне.
                </p>
                <ul className="mt-6 list-disc space-y-3 pl-6 marker:text-teal-400/75">
                  <li>
                    <strong className="text-slate-200">Прозрачность для инвесторов:</strong> Вы видите
                    каждую копейку, заработанную на сервисной станции или в DeFi-пуле, через
                    «стеклянный» интерфейс Cyber-Elegance.
                  </li>
                  <li>
                    <strong className="text-slate-200">ИИ-Комплаенс:</strong> ИИ не просто считает
                    деньги — он следит за тем, чтобы каждая транзакция соответствовала международным
                    нормам (AML/KYC), предотвращая любые попытки использовать фонд в сомнительных
                    схемах. Мы строим «чистый» капитал, который не боится никаких проверок, потому что
                    сам является эталоном проверки.
                  </li>
                </ul>
              </section>

              <section
                id="epilogue"
                className="scroll-mt-28 border-t border-white/10 pt-12"
              >
                <h3 className="text-xl font-semibold text-white sm:text-2xl">
                  Итог: AV8 — Это Ваш «Цифровой След»
                </h3>
                <p className="mt-6">
                  Мы построим не просто фонд. Мы построим{' '}
                  <strong className="text-white">Цивилизацию на блокчейне</strong>. Систему, которая
                  способна пережить государства и правительства, сохраняя и преумножая то, что вы
                  создали своим трудом.
                </p>
                <p className="mt-8 text-lg font-semibold tracking-tight text-transparent bg-gradient-to-r from-teal-200 via-cyan-200 to-violet-200/90 bg-clip-text sm:text-xl">
                  AV8 Capital: Капитал, который станет бессмертным.
                </p>
              </section>
            </div>
          </article>
        </div>
      </div>
    </main>
  );
}
