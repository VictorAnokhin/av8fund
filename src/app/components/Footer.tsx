import React from 'react';
import { Shield, Twitter, Linkedin, Github } from 'lucide-react';
import { useI18n } from '../i18n';
import { type ProjectSettings } from '../lib/api';
import { getAboutPath, getArticlesPath, getBasePath, getFundAccountsPath, getFundBasketPath, getInvestPath, getKycAmlPath, getMintPath, getPoolsPath, getPortfolioPath, getPrivacyPolicyPath, getSettingsPath, getSwapPath, getTermsOfServicePath, getTokensPath, getWhitepaperPath } from '../lib/routes';

type FooterProps = {
  project: ProjectSettings;
  currentPage?: 'home' | 'articles' | 'article' | 'swap' | 'mint' | 'invest' | 'portfolio' | 'fund-accounts' | 'fund-basket' | 'about' | 'whitepaper' | 'privacy-policy' | 'terms-of-service' | 'kyc-aml' | 'token-admin' | 'pool-admin' | 'admin-settings';
};

export function Footer({ project, currentPage = 'home' }: FooterProps) {
  const [logoError, setLogoError] = React.useState(false);
  const logoUrl = project.foto_footer_preview || project.foto_preview;
  const brandName = project.name.trim() || 'AV8Capital';
  const projectDescription = (project.description || '').replace(/<[^>]+>/g, ' ').trim() || 'High-end hybrid wealth management. Secure, transparent, and globally accessible investment ecosystem.';
  const basePath = getBasePath();
  const articlesHref = getArticlesPath();
  const investHref = getInvestPath();
  const portfolioHref = getPortfolioPath();
  const fundAccountsHref = getFundAccountsPath();
  const fundBasketHref = getFundBasketPath();
  const aboutHref = getAboutPath();
  const kycAmlHref = getKycAmlPath();
  const privacyPolicyHref = getPrivacyPolicyPath();
  const swapHref = getSwapPath();
  const mintHref = getMintPath();
  const termsOfServiceHref = getTermsOfServicePath();
  const whitepaperHref = getWhitepaperPath();
  const tokensHref = getTokensPath();
  const poolsHref = getPoolsPath();
  const settingsHref = getSettingsPath();
  const homeSectionHref = (section: string) => (currentPage === 'home' ? section : `${basePath}${section}`);
  const { messages } = useI18n();
  const shouldShowLogo = Boolean(logoUrl) && !logoError;
  const socialLinks = [
    {
      href: project.twitter ? `https://x.com/${project.twitter.replace(/^@/, '')}` : '',
      label: messages.footer.socialLabels.twitter,
      icon: Twitter,
    },
    {
      href: project.telegram
        ? project.telegram.startsWith('http')
          ? project.telegram
          : `https://t.me/${project.telegram.replace(/^@/, '')}`
        : '',
      label: messages.footer.socialLabels.telegram,
      icon: Linkedin,
    },
    {
      href: project.url || '',
      label: messages.footer.socialLabels.website,
      icon: Github,
    },
  ].filter((item) => item.href);

  React.useEffect(() => {
    setLogoError(false);
  }, [logoUrl]);

  return (
    <footer className="relative border-t border-white/[0.06] bg-[linear-gradient(180deg,rgba(5,7,14,0.95)_0%,#03050c_100%)] pb-10 pt-20">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 bottom-0 h-64 w-64 rounded-full bg-violet-600/[0.04] blur-3xl" />
        <div className="absolute -right-16 top-10 h-56 w-56 rounded-full bg-teal-500/[0.05] blur-3xl" />
      </div>
      <div className="relative mx-auto mb-12 grid max-w-7xl gap-12 px-6 md:grid-cols-5">
        <div className="col-span-2 space-y-6">
          <div className="flex items-center gap-3">
            {shouldShowLogo ? (
              <div className="h-12 max-w-[200px] rounded-xl border border-white/[0.08] bg-white px-4 py-2 shadow-[0_0_24px_-8px_rgba(45,212,191,0.12)] ring-1 ring-white/10">
                <img
                  src={logoUrl}
                  alt={brandName}
                  className="w-full h-full object-contain"
                  loading="lazy"
                  decoding="async"
                  onError={() => setLogoError(true)}
                />
              </div>
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-teal-400/90 via-cyan-500/80 to-violet-600/70 shadow-[0_0_16px_-4px_rgba(45,212,191,0.45)]">
                <Shield className="h-5 w-5 text-slate-950" />
              </div>
            )}
            <span className="font-display bg-gradient-to-r from-white via-slate-100 to-slate-500 bg-clip-text text-lg font-semibold tracking-tight text-transparent">
              {brandName}
            </span>
          </div>
          <p className="max-w-sm text-sm leading-relaxed tracking-wide text-slate-500">
            {projectDescription}
          </p>
          <div className="flex gap-4 pt-4">
            {socialLinks.map(({ href, label, icon: Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noreferrer"
                aria-label={label}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.03] text-slate-500 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] transition-[color,background,border-color,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-teal-400/25 hover:bg-white/[0.06] hover:text-teal-100"
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>
        
        <div className="space-y-4">
          <h4 className="mb-6 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            {messages.footer.platform}
          </h4>
          <a href={portfolioHref} className="block text-sm tracking-wide text-slate-500 transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-teal-100/95">
            {messages.footer.portfolio}
          </a>
          <a href={investHref} className="block text-sm tracking-wide text-slate-500 transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-teal-100/95">
            {messages.footer.fund}
          </a>
          <a href={homeSectionHref('#analytics')} className="block text-sm tracking-wide text-slate-500 transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-teal-100/95">
            {messages.footer.analytics}
          </a>
          <a href={swapHref} className="block text-sm tracking-wide text-slate-500 transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-teal-100/95">
            {messages.footer.swap}
          </a>
          <a href={aboutHref} className="block text-sm tracking-wide text-slate-500 transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-teal-100/95">
            {messages.navbar.aboutProject}
          </a>
          <a href={whitepaperHref} className="block text-sm tracking-wide text-slate-500 transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-teal-100/95">
            {messages.footer.whitepaper}
          </a>
          <a href={articlesHref} className="block text-sm tracking-wide text-slate-500 transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-teal-100/95">
            {messages.footer.articles}
          </a>
        </div>

        <div className="space-y-4">
          <h4 className="mb-6 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            {messages.footer.adminPanel}
          </h4>
          <a href={tokensHref} className="block text-sm tracking-wide text-slate-500 transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-teal-100/95">
            {messages.navbar.tokens}
          </a>
          <a href={poolsHref} className="block text-sm tracking-wide text-slate-500 transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-teal-100/95">
            Пулы
          </a>
          <a href={settingsHref} className="block text-sm tracking-wide text-slate-500 transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-teal-100/95">
            Настройки
          </a>
          <a href={mintHref} className="block text-sm tracking-wide text-slate-500 transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-teal-100/95">
            {messages.footer.rwaMint}
          </a>
          <a href={fundAccountsHref} className="block text-sm tracking-wide text-slate-500 transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-teal-100/95">
            Счета фонда
          </a>
          <a href={fundBasketHref} className="block text-sm tracking-wide text-slate-500 transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-teal-100/95">
            Корзина фонда
          </a>
        </div>

        <div className="space-y-4">
          <h4 className="mb-6 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            {messages.footer.legal}
          </h4>
          <a href={privacyPolicyHref} className="block text-sm tracking-wide text-slate-500 transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-teal-100/95">
            {messages.footer.privacyPolicy}
          </a>
          <a href={termsOfServiceHref} className="block text-sm tracking-wide text-slate-500 transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-teal-100/95">
            {messages.footer.termsOfService}
          </a>
          <a href={project.url || '#'} className="block text-sm tracking-wide text-slate-500 transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-teal-100/95">
            {messages.footer.audits}
          </a>
          <a href={kycAmlHref} className="block text-sm tracking-wide text-slate-500 transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-teal-100/95">
            {messages.footer.kycAml}
          </a>
        </div>
      </div>
      
      <div className="relative mx-auto flex max-w-7xl flex-col items-center justify-between border-t border-white/[0.05] px-6 pt-8 text-center text-sm text-slate-600 md:flex-row md:text-left">
        <p>&copy; {new Date().getFullYear()} {brandName}. {messages.footer.rightsReserved}</p>
        <p className="mt-4 md:mt-0">{project.phone || messages.footer.operatedByFallback}</p>
      </div>
    </footer>
  );
}
