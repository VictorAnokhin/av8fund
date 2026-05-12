import React from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { Analytics } from './components/Analytics';
import { AiAssistantWidget } from './components/AiAssistantWidget';
import { Footer } from './components/Footer';
import { Breadcrumbs } from './components/Breadcrumbs';
import { LandingLinksDeck } from './components/LandingLinksDeck';
import { useI18n } from './i18n';
import { getProjectSettings, type ProjectSettings } from './lib/api';

const BlogPage = React.lazy(() => import('./components/BlogPage').then((module) => ({ default: module.BlogPage })));
const ArticlePage = React.lazy(() => import('./components/ArticlePage').then((module) => ({ default: module.ArticlePage })));
const SwapPage = React.lazy(() => import('./components/SwapPage').then((module) => ({ default: module.SwapPage })));
const MintPage = React.lazy(() => import('./components/MintPage').then((module) => ({ default: module.MintPage })));
const InvestPage = React.lazy(() => import('./components/InvestPage').then((module) => ({ default: module.InvestPage })));
const PortfolioPage = React.lazy(() => import('./components/PortfolioPage').then((module) => ({ default: module.PortfolioPage })));
const FundAccountsPage = React.lazy(() => import('./components/FundAccountsPage').then((module) => ({ default: module.FundAccountsPage })));
const FundBasketPage = React.lazy(() => import('./components/FundBasketPage').then((module) => ({ default: module.FundBasketPage })));
const WhitepaperPage = React.lazy(() => import('./components/WhitepaperPage').then((module) => ({ default: module.WhitepaperPage })));
const PrivacyPolicyPage = React.lazy(() => import('./components/PrivacyPolicyPage').then((module) => ({ default: module.PrivacyPolicyPage })));
const KycAmlPage = React.lazy(() => import('./components/KycAmlPage').then((module) => ({ default: module.KycAmlPage })));
const TermsOfServicePage = React.lazy(() => import('./components/TermsOfServicePage').then((module) => ({ default: module.TermsOfServicePage })));
const AboutPage = React.lazy(() => import('./components/AboutPage').then((module) => ({ default: module.AboutPage })));
const TokenAdminPage = React.lazy(() => import('./components/TokenAdminPage').then((module) => ({ default: module.TokenAdminPage })));
const PoolAdminPage = React.lazy(() => import('./components/PoolAdminPage').then((module) => ({ default: module.PoolAdminPage })));

type AppRoute =
  | { page: 'home' }
  | { page: 'articles' }
  | { page: 'article'; articleId: number }
  | { page: 'swap' }
  | { page: 'mint' }
  | { page: 'invest'; poolObjectId?: string }
  | { page: 'portfolio' }
  | { page: 'fund-accounts' }
  | { page: 'fund-basket' }
  | { page: 'about' }
  | { page: 'whitepaper' }
  | { page: 'privacy-policy' }
  | { page: 'terms-of-service' }
  | { page: 'kyc-aml' }
  | { page: 'token-admin' }
  | { page: 'pool-admin' };

function resolveRoute(): AppRoute {
  if (typeof window === 'undefined') {
    return { page: 'home' };
  }

  const pathname = window.location.pathname.replace(/\/+$/, '') || '/';
  const normalizedPathname = pathname.toLowerCase();
  const articleMatch = normalizedPathname.match(/\/articles\/(\d+)$/);
  if (articleMatch) {
    return { page: 'article', articleId: Number(articleMatch[1]) };
  }

  if (normalizedPathname.endsWith('/articles')) {
    return { page: 'articles' };
  }

  if (normalizedPathname.endsWith('/swap')) {
    return { page: 'swap' };
  }

  if (normalizedPathname.endsWith('/mint')) {
    return { page: 'mint' };
  }

  const investPoolMatch = normalizedPathname.match(/\/invest\/([^/]+)$/);
  if (investPoolMatch) {
    return { page: 'invest', poolObjectId: decodeURIComponent(investPoolMatch[1]) };
  }

  if (normalizedPathname.endsWith('/invest')) {
    return { page: 'invest' };
  }

  if (normalizedPathname.endsWith('/portfolio')) {
    return { page: 'portfolio' };
  }

  if (normalizedPathname.endsWith('/fund-accounts')) {
    return { page: 'fund-accounts' };
  }

  if (normalizedPathname.endsWith('/fund-basket')) {
    return { page: 'fund-basket' };
  }

  if (normalizedPathname.endsWith('/about')) {
    return { page: 'about' };
  }

  if (normalizedPathname.endsWith('/whitepaper')) {
    return { page: 'whitepaper' };
  }

  if (normalizedPathname.endsWith('/privacy-policy')) {
    return { page: 'privacy-policy' };
  }

  if (normalizedPathname.endsWith('/terms-of-service')) {
    return { page: 'terms-of-service' };
  }

  if (normalizedPathname.endsWith('/kyc-aml')) {
    return { page: 'kyc-aml' };
  }

  if (/(?:\/admin\/tokens|\/tokens)$/.test(normalizedPathname)) {
    return { page: 'token-admin' };
  }

  if (/(?:\/admin\/pools|\/pools)$/.test(normalizedPathname)) {
    return { page: 'pool-admin' };
  }

  return { page: 'home' };
}

const DEFAULT_PROJECT: ProjectSettings = {
  id: 12,
  name: 'AV8Capital',
  phone: '+380937034499',
  url: 'https://av8capital.space',
  telegram: 'av8capital',
  instagram: '',
  twitter: 'av8.fund',
  facebook: '',
  description: '',
  description_ua: '',
  description_en: '',
  foto_preview: undefined,
  foto_header_preview: undefined,
  foto_footer_preview: undefined,
};

type SectionBoundaryProps = {
  children: React.ReactNode;
  title: string;
  sectionUnavailableLabel: string;
  runtimeErrorLabel: string;
};

type SectionBoundaryState = {
  hasError: boolean;
};

class SectionBoundary extends React.Component<SectionBoundaryProps, SectionBoundaryState> {
  state: SectionBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): SectionBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error(`Section render failed: ${this.props.title}`, error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <section className="border-t border-white/[0.06] px-6 py-16">
          <div className="mx-auto max-w-7xl rounded-[2rem] border border-amber-500/15 bg-amber-500/[0.07] p-6 text-amber-100 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] backdrop-blur-md">
            <div className="text-sm uppercase tracking-[0.18em] text-amber-300">{this.props.sectionUnavailableLabel}</div>
            <div className="mt-2 text-2xl font-semibold text-white">{this.props.title}</div>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-amber-100/80">
              {this.props.runtimeErrorLabel}
            </p>
          </div>
        </section>
      );
    }

    return this.props.children;
  }
}

function PageLoadingFallback() {
  return (
    <main className="min-h-[calc(100vh-160px)] px-6 py-28">
      <div className="ce-glass-slab ce-glass-slab--interactive mx-auto max-w-7xl rounded-[2rem] p-8 text-slate-300">
        Loading...
      </div>
    </main>
  );
}

export default function App() {
  const [project, setProject] = React.useState<ProjectSettings>(DEFAULT_PROJECT);
  const [route, setRoute] = React.useState<AppRoute>(resolveRoute);
  const { language, messages } = useI18n();

  React.useEffect(() => {
    let active = true;

    getProjectSettings()
      .then((nextProject) => {
        if (active) {
          setProject(nextProject);
        }
      })
      .catch((error) => {
        console.error('Failed to load project settings', error);
      });

    return () => {
      active = false;
    };
  }, []);

  React.useEffect(() => {
    const sectionTitle =
      route.page === 'home'
        ? messages.meta.titleSuffix
        : route.page === 'articles'
          ? messages.blog.pageTitle
          : route.page === 'swap'
            ? messages.swap.pageTitle
            : route.page === 'mint'
              ? messages.mint.pageTitle
            : route.page === 'invest'
              ? messages.invest.pageTitle
              : route.page === 'portfolio'
                ? messages.portfolio.pageTitle
              : route.page === 'fund-accounts'
                ? 'Fund accounts'
              : route.page === 'fund-basket'
                ? 'Fund basket'
              : route.page === 'about'
                ? messages.navbar.aboutProject
              : route.page === 'whitepaper'
                ? messages.whitepaper.pageTitle
                : route.page === 'privacy-policy'
                  ? messages.privacyPolicy.pageTitle
                  : route.page === 'terms-of-service'
                    ? messages.termsOfService.pageTitle
                  : route.page === 'kyc-aml'
                    ? messages.kycAml.pageTitle
                  : route.page === 'token-admin'
                    ? 'Token administration'
                    : route.page === 'pool-admin'
                      ? 'Pool administration'
          : messages.article.pageTitle;
    document.title = `${project.name} | ${sectionTitle}`;
  }, [messages.article.pageTitle, messages.blog.pageTitle, messages.invest.pageTitle, messages.kycAml.pageTitle, messages.meta.titleSuffix, messages.mint.pageTitle, messages.navbar.aboutProject, messages.portfolio.pageTitle, messages.privacyPolicy.pageTitle, messages.swap.pageTitle, messages.termsOfService.pageTitle, messages.whitepaper.pageTitle, project.name, route.page]);

  React.useEffect(() => {
    function handleLocationChange() {
      setRoute(resolveRoute());
    }

    window.addEventListener('popstate', handleLocationChange);

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, []);

  const localizedProject = React.useMemo<ProjectSettings>(
    () => ({
      ...project,
      description:
        (language === 'ua' ? project.description_ua : language === 'en' ? project.description_en : project.description) ||
        project.description ||
        project.description_ua ||
        project.description_en ||
        messages.project.description,
    }),
    [language, messages.project.description, project],
  );

  return (
    <div className="relative min-h-screen font-sans text-slate-50 selection:bg-teal-500/22 selection:text-teal-50">
      <div className="ce-cosmic-fixed" aria-hidden />
      <Navbar project={localizedProject} currentPage={route.page} />
      {route.page === 'home' ? (
        <main className="relative min-h-[calc(100vh-160px)] pb-14 pt-14">
          <section className="border-b border-white/[0.06] px-6 pb-4 pt-10">
            <div className="mx-auto max-w-7xl">
              <Breadcrumbs centered items={[{ label: messages.breadcrumbs.home }]} />
            </div>
          </section>
          <SectionBoundary
            title={messages.app.sections.hero}
            sectionUnavailableLabel={messages.app.sectionUnavailable}
            runtimeErrorLabel={messages.app.runtimeError}
          >
            <Hero project={localizedProject} />
          </SectionBoundary>
          <SectionBoundary
            title={messages.app.sections.analytics}
            sectionUnavailableLabel={messages.app.sectionUnavailable}
            runtimeErrorLabel={messages.app.runtimeError}
          >
            <Analytics project={localizedProject} />
          </SectionBoundary>
          <SectionBoundary
            title={messages.app.sections.navigationDeck}
            sectionUnavailableLabel={messages.app.sectionUnavailable}
            runtimeErrorLabel={messages.app.runtimeError}
          >
            <LandingLinksDeck />
          </SectionBoundary>
        </main>
      ) : (
        <React.Suspense fallback={<PageLoadingFallback />}>
          {route.page === 'articles' ? (
            <BlogPage project={localizedProject} />
          ) : route.page === 'swap' ? (
            <SwapPage />
          ) : route.page === 'mint' ? (
            <MintPage />
          ) : route.page === 'invest' ? (
            <InvestPage poolObjectId={route.poolObjectId} />
          ) : route.page === 'portfolio' ? (
            <SectionBoundary
              title={messages.portfolio.pageTitle}
              sectionUnavailableLabel={messages.app.sectionUnavailable}
              runtimeErrorLabel={messages.app.runtimeError}
            >
              <PortfolioPage />
            </SectionBoundary>
          ) : route.page === 'fund-accounts' ? (
            <FundAccountsPage />
          ) : route.page === 'fund-basket' ? (
            <FundBasketPage />
          ) : route.page === 'about' ? (
            <AboutPage project={localizedProject} />
          ) : route.page === 'whitepaper' ? (
            <WhitepaperPage />
          ) : route.page === 'privacy-policy' ? (
            <PrivacyPolicyPage />
          ) : route.page === 'terms-of-service' ? (
            <TermsOfServicePage />
          ) : route.page === 'kyc-aml' ? (
            <KycAmlPage />
          ) : route.page === 'token-admin' ? (
            <TokenAdminPage />
          ) : route.page === 'pool-admin' ? (
            <PoolAdminPage />
          ) : (
            <ArticlePage project={localizedProject} articleId={route.articleId} />
          )}
        </React.Suspense>
      )}
      <Footer project={localizedProject} currentPage={route.page} />
      <AiAssistantWidget currentPage={route.page} />
    </div>
  );
}
