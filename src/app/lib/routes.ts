export function getBasePath(pathname?: string): string {
  const rawPath = pathname ?? (typeof window !== 'undefined' ? window.location.pathname : '/')
  return (
    rawPath.replace(
      /\/(?:articles(?:\/[^/]+)?|swap|mint|invest|portfolio|fund-accounts|fund-basket|about|whitepaper|privacy-policy|terms-of-service|kyc-aml|admin\/tokens|tokens)\/?$/,
      '',
    ) || '/'
  )
}

export function getArticlesPath(basePath?: string): string {
  const root = getBasePath(basePath)
  return root === '/' ? '/articles' : `${root}/articles`
}

export function getArticlePath(articleId: number | string, basePath?: string): string {
  return `${getArticlesPath(basePath)}/${articleId}`
}

export function getSwapPath(basePath?: string): string {
  const root = getBasePath(basePath)
  return root === '/' ? '/swap' : `${root}/swap`
}

export function getMintPath(basePath?: string): string {
  const root = getBasePath(basePath)
  return root === '/' ? '/mint' : `${root}/mint`
}

export function getInvestPath(basePath?: string): string {
  const root = getBasePath(basePath)
  return root === '/' ? '/invest' : `${root}/invest`
}

export function getPortfolioPath(basePath?: string): string {
  const root = getBasePath(basePath)
  return root === '/' ? '/portfolio' : `${root}/portfolio`
}

export function getFundAccountsPath(basePath?: string): string {
  const root = getBasePath(basePath)
  return root === '/' ? '/fund-accounts' : `${root}/fund-accounts`
}

export function getFundBasketPath(basePath?: string): string {
  const root = getBasePath(basePath)
  return root === '/' ? '/fund-basket' : `${root}/fund-basket`
}

export function getAboutPath(basePath?: string): string {
  const root = getBasePath(basePath)
  return root === '/' ? '/about' : `${root}/about`
}

export function getWhitepaperPath(basePath?: string): string {
  const root = getBasePath(basePath)
  return root === '/' ? '/whitepaper' : `${root}/whitepaper`
}

export function getPrivacyPolicyPath(basePath?: string): string {
  const root = getBasePath(basePath)
  return root === '/' ? '/privacy-policy' : `${root}/privacy-policy`
}

export function getTermsOfServicePath(basePath?: string): string {
  const root = getBasePath(basePath)
  return root === '/' ? '/terms-of-service' : `${root}/terms-of-service`
}

export function getKycAmlPath(basePath?: string): string {
  const root = getBasePath(basePath)
  return root === '/' ? '/kyc-aml' : `${root}/kyc-aml`
}

export function getTokenAdminPath(basePath?: string): string {
  const root = getBasePath(basePath)
  return root === '/' ? '/admin/tokens' : `${root}/admin/tokens`
}

/** Short URL for the token admin screen (`/tokens`). */
export function getTokensPath(basePath?: string): string {
  const root = getBasePath(basePath)
  return root === '/' ? '/tokens' : `${root}/tokens`
}
