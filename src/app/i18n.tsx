import React from 'react';

import type { TokenAdminCopy } from './lib/tokenAdminI18n';
import { tokenAdminEn, tokenAdminRu, tokenAdminUa } from './lib/tokenAdminI18n';
import type { FundAccountsCopy, FundBasketCopy } from './lib/fundPagesI18n';
import { fundAccountsEn, fundAccountsRu, fundAccountsUa, fundBasketEn, fundBasketRu, fundBasketUa } from './lib/fundPagesI18n';

export type Language = 'en' | 'ua' | 'ru';

type Translation = {
  breadcrumbs: {
    home: string;
  };
  app: {
    sectionUnavailable: string;
    runtimeError: string;
    sections: {
      hero: string;
      analytics: string;
      navigationDeck: string;
    };
  };
  aboutPage: {
    heroBadge: string;
    heroSubtitle: string;
  };
  meta: {
    titleSuffix: string;
  };
  project: {
    description: string;
  };
  navbar: {
    platform: string;
    swap: string;
    fund: string;
    analytics: string;
    articles: string;
    transparency: string;
    about: string;
    aboutProject: string;
    openWebsite: string;
    language: string;
    connectGoogle: string;
    connectWalletShort: string;
    /** Admin / token registry link in main nav. */
    tokens: string;
    networkScopeHint: string;
    /** Shown when the chain menu is disabled because a wallet session is active. */
    networkLockedHint: string;
    walletsForNetworkHint: string;
    /** Full chain names for the header network menu. */
    chainNames: {
      eth: string;
      arbitrum: string;
      base: string;
      polygon: string;
      bnb: string;
      solana: string;
      sui: string;
    };
  };
  hero: {
    badge: string;
    highlight: string;
    title: string;
    assetsHeading: string;
    visitWebsite: string;
    openTelegram: string;
    twitterLabel: string;
    projectContact: string;
    contactFallback: string;
    live: string;
    projectId: string;
    website: string;
    socialChannels: string;
    websiteConfigured: string;
    websiteMissing: string;
    socialConnected: string;
      socialPending: string;
      backendSource: string;
      laravelSettings: string;
      backendDescription: string;
      ownerAccess: string;
      privateBankingEntry: string;
      totalValue: string;
      connectWallet: string;
      portfolioLabel: string;
      assetsAvailableAfterConnect: string;
      connectedSessionNoAddress: string;
      noActiveWalletSession: string;
      suiAssetsHidden: string;
      lastSync: string;
      syncPending: string;
      refresh: string;
      settings: string;
      userWallets: string;
      availableWallet: string;
      removeLinkedWallet: string;
      connectWalletCta: string;
      linkCurrentSuiWallet: string;
      suiConnectNotInProfileHint: string;
      suiGoogleWalletsFilteredHint: string;
      solanaLinkedWalletsFilteredHint: string;
      evmLinkedWalletsFilteredHint: string;
      connectZkLogin: string;
      zkLoginWriteHint: string;
      activeSuiNotice: string;
      settingsTitle: string;
      settingsDescription: string;
      settingsLoading: string;
      settingsEmpty: string;
      selected: string;
      tokens: string;
      price: string;
      notAvailable: string;
      commission: string;
      close: string;
      save: string;
      saving: string;
      resolveWalletOwnerError: string;
      loadAssetsError: string;
      loadSettingsError: string;
      saveSettingsError: string;
      noConnectedAddress: string;
      suiSettingsUnavailable: string;
      settingsSaved: string;
      userPrefix: string;
      selectedWalletLabel: string;
      walletLabel: string;
      quickReceive: string;
      quickSend: string;
      quickSwap: string;
      receiveTitle: string;
      receiveHint: string;
      copyAddress: string;
      addressCopied: string;
      sendTitle: string;
      sendRecipientLabel: string;
      sendAmountLabel: string;
      sendSubmit: string;
      sendNativeHint: string;
      sendSuiWalletRequired: string;
      /** After «Подписать!» opened the wallet connect dialog (web3auth wallet row). */
      sendSuiWalletConnectOpened: string;
      sendSuiExtensionWalletMismatch: string;
      sendEvmWalletRequired: string;
      sendInvalidRecipient: string;
      sendInvalidAmount: string;
      sendSuccess: string;
      sendSuiNativeHint: string;
      sendSignButton: string;
      sendSignHintExtension: string;
      sendSignHintZkLogin: string;
      sendZkLoginNeedSessionHint: string;
      sendZkLoginSignInFirst: string;
      suiHeroNetworkCaption: string;
      suiHeroNetworkHeadline: string;
      suiAvailableUsdc: string;
      suiGasLabel: string;
      suiConnectWalletBalances: string;
      suiHeroNavLabel: string;
      suiHeroNavNote: string;
      suiHeroAv8ShareLabel: string;
      suiHeroAv8ShareNote: string;
      cardLabels: {
        assets: string;
        status: string;
        source: string;
      };
      suiCard: {
        wallet: string;
        hidden: string;
        source: string;
        assetsNote: string;
        statusNote: string;
        sourceNote: string;
      };
      suiOnChainCoinsEmpty: string;
      suiOnChainCoinsSuffix: string;
      emptyCard: {
        waiting: string;
        loading: string;
        noData: string;
        connectWallet: string;
        hiddenState: string;
        walletSessionRequired: string;
        source: string;
        pendingSync: string;
        configureWallet: string;
        heroPortfolioUnsupportedNetwork: string;
      };
  };
  dashboard: {
    title: string;
    description: string;
    totalInvested: string;
    availableCredit: string;
    availableCreditBadge: string;
    instantApproval: string;
    noSellingRequired: string;
    drawCreditNow: string;
    availableToWithdraw: string;
    onChainVerified: string;
    withdraw: string;
    deposit: string;
    thisMonth: string;
  };
  features: {
    title: string;
    highlight: string;
    description: string;
    readWhitepaper: string;
    secureGateway: string;
    frictionlessExchange: string;
    exchangeDescription: string;
    checklist: string[];
    swap: string;
    youPay: string;
    balance: string;
    youReceive: string;
    confirmExchange: string;
    cards: Array<{
      title: string;
      description: string;
    }>;
  };
  analytics: {
    badge: string;
    title: string;
    description: string;
    indexName: string;
    points: string;
    ytd: string;
    insightsTitle: string;
    articleDescription: string;
    readMin: string;
    articlesTitle: string;
    articlesSubtitle: string;
    articleList: string;
    articleView: string;
    loading: string;
    empty: string;
    openArticle: string;
    noContent: string;
    chartMonths: string[];
    articles: Array<{
      tag: string;
      title: string;
      time: number;
    }>;
  };
  blog: {
    pageTitle: string;
    heroBadge: string;
    titleAccent: string;
    subtitle: string;
    searchPlaceholder: string;
    filterAll: string;
    filterTop: string;
    loadMore: string;
    readMore: string;
    openLabel: string;
    viewsLabel: string;
    emptyTitle: string;
    emptyHint: string;
    error: string;
    noDate: string;
  };
  whitepaper: {
    pageTitle: string;
    badge: string;
    intro: string;
    sections: Array<{
      title: string;
      body: string;
      points: string[];
    }>;
  };
  privacyPolicy: {
    pageTitle: string;
    badge: string;
    intro: string;
    sections: Array<{
      title: string;
      body: string;
      points: string[];
    }>;
  };
  termsOfService: {
    pageTitle: string;
    badge: string;
    intro: string;
    sections: Array<{
      title: string;
      body: string;
      points: string[];
    }>;
  };
  kycAml: {
    pageTitle: string;
    badge: string;
    intro: string;
    sections: Array<{
      title: string;
      body: string;
      points: string[];
    }>;
  };
  article: {
    pageTitle: string;
    heroBadge: string;
    back: string;
    share: string;
    related: string;
    news: string;
    noDate: string;
    invalid: string;
    error: string;
    emptyBody: string;
  };
  invest: {
    pageTitle: string;
    pageHeroSubtitle: string;
    heroBadge: string;
    cockpitBadge: string;
    cockpitTitle: string;
    cockpitSubtitle: string;
    fundCoreLabel: string;
    av8ObjectTitle: string;
    navPrefix: string;
    av8Abbrev: string;
    fundWord: string;
    assetCryptoLabel: string;
    assetRwaLabel: string;
    assetYieldLabel: string;
    awaitingAssets: string;
    reserveLayer: string;
    aiLogTitle: string;
    aiLogSubtitle: string;
    trustLayerBadge: string;
    digestPending: string;
    digestPrefix: string;
    aiPilotTrace: string;
    basketIdLabel: string;
    packageIdLabel: string;
    notConfigured: string;
    rpcNoticePrefix: string;
    refreshingSui: string;
    aiStatusVerified: string;
    aiStatusPending: string;
    aiStatusFailed: string;
    /** Deposit panel (wallet token → AV8) */
    depositSectionKicker: string;
    depositSectionTitle: string;
    depositBadgeReady: string;
    depositBadgeConfigured: string;
    depositBadgeWalletAsset: string;
    depositTokenInWalletLabel: string;
    depositAssetFromWalletLabel: string;
    depositTokenWhitelisted: string;
    depositTokenNotWhitelisted: string;
    depositAvailablePrefix: string;
    depositAmountLabel: string;
    depositAmountFieldLabel: string;
    depositWalletBalanceLabel: string;
    depositLoading: string;
    depositExpectedIssueLabel: string;
    depositPathLabel: string;
    depositPathSui: string;
    depositPathOracle: string;
    /** Leading sentence before `<code>portfolio.deposit_asset&lt;T&gt;</code>`; use `{symbol}` placeholder. */
    depositNoticeWhitelistedLead: string;
    depositNoticeNotWhitelistedLead: string;
    depositNoticeTrail: string;
    depositSigning: string;
    /** CTA; use `{symbol}` placeholder. */
    depositButton: string;
    depositConnectedWallet: string;
    depositWalletAsideBlurb: string;
    /** Card title; `{symbol}` placeholder. */
    depositAvailableTokenCard: string;
    depositWalletDetectionHint: string;
    depositAv8ShareCard: string;
    depositAv8WithdrawHint: string;
    depositAvailableInWalletPrefix: string;
    redeemAv8ShareLabel: string;
    depositPtbRouteLabel: string;
    /** Cockpit deposit route notice; `{symbol}` placeholder. */
    depositRouteBlockedWhitelisted: string;
    depositRouteBlockedNotWhitelisted: string;
  };
  portfolio: {
    pageTitle: string;
    breadcrumbCurrent: string;
    networkSelectorLabel: string;
    networkSelectorHint: string;
    badge: string;
    title: string;
    titleHighlight: string;
    titleSecondary: string;
    subtitle: string;
    ownerAccess: string;
    notConnected: string;
    walletModes: string;
    awaitingAuth: string;
    connectWallet: string;
    walletNote: string;
    privateBankingEntry: string;
    commandRoutesDescription: string;
    fuelLevel: string;
    fuelDescriptionInline: string;
    sectionTitle: string;
    sectionBadgeScenario: string;
    sectionBadgeLive: string;
    health: string;
    maxDrift: string;
    altitude: string;
    annualizedClimb: string;
    fuelHeld: string;
    fuelHeldDescription: string;
    manifestTitle: string;
    manifestSubtitle: string;
    sleeves: string;
    category: string;
    asset: string;
    share: string;
    role: string;
    healthStatus: {
      stable: string;
      monitoring: string;
      rebalancing: string;
    };
    manifest: {
      liquidYield: string;
      liquidYieldRole: string;
      cryptoBase: string;
      cryptoBaseRole: string;
      fixedIncome: string;
      fixedIncomeRole: string;
      equity: string;
      equityRole: string;
    };
    defiTitle: string;
    defiConnectWallet: string;
    defiSuiUnavailable: string;
    defiActiveWallet: string;
    defiSuiOnChainDisclaimer: string;
    defiSuiNeedWallet: string;
    defiSuiOtherTabHint: string;
    defiSuiOnChainEmpty: string;
    defiSuiCetusTitle: string;
    defiSuiCetusBlurb: string;
    defiSuiCetusOpenApp: string;
    /** Main heading for wallet token list panel (control stack). */
    cockpitWalletTokensTitle: string;
    /** Subheading inside the token list card. */
    cockpitWalletTokensListHeading: string;
    cockpitInvestHeading: string;
    cockpitDeployCapital: string;
    cockpitRecallLiquidity: string;
    cockpitSubmittingPtb: string;
  };
  swap: {
    back: string;
    subtitle: string;
    openPage: string;
    pageTitle: string;
    heroBadge: string;
  };
  mint: {
    pageTitle: string;
    heroBadge: string;
    subtitle: string;
    step1Label: string;
    step2Label: string;
    step3Label: string;
    assetVehicle: string;
    assetBusiness: string;
    assetUniversal: string;
    makeModel: string;
    vin: string;
    year: string;
    mileage: string;
    docsLabel: string;
    docsDrop: string;
    estimatedUsd: string;
    companyName: string;
    regNumber: string;
    businessType: string;
    bizService: string;
    bizShop: string;
    bizRent: string;
    revenueMonthly: string;
    legalAddress: string;
    universalTitle: string;
    coverLabel: string;
    coverHint: string;
    descriptionLabel: string;
    descriptionPlaceholder: string;
    blockchainSection: string;
    blockchainHint: string;
    connectWalletHint: string;
    cta: string;
    ctaLoading: string;
    packageMissing: string;
    phaseEncrypt: string;
    phaseWalrus: string;
    phaseMove: string;
    success: string;
    digestLabel: string;
    openExplorer: string;
    metadataNote: string;
    errorPrefix: string;
    validationRequired: string;
    nonVehicleNote: string;
    governanceTitle: string;
    governanceBlurb: string;
    newAdminAddressLabel: string;
    authorizeNewAdmin: string;
    authorizeNewAdminBusy: string;
    adminCapMissing: string;
    invalidAdminAddress: string;
    adminAuthorized: string;
    governanceWalletHint: string;
    deployRunbookTitle: string;
    deployRunbookBlurb: string;
    deployRunbookWarning: string;
    deployRunbookChecklist: string[];
    deployRunbookCommandsLabel: string;
    deployRunbookCommands: string[];
    deployRunbookEnvLabel: string;
    deployRunbookEnvVars: string[];
    utilityTab: string;
    utilityTitle: string;
    utilityBlurb: string;
    utilityConstants: string;
    utilityCreationNote: string;
    utilityTokenName: string;
    utilityTokenSymbol: string;
    utilityTokenDecimals: string;
    utilityTokenLogo: string;
    utilityChooseLogo: string;
    utilityUploadLogo: string;
    utilityLogoBusy: string;
    utilityLogoReady: string;
    utilityLogoHint: string;
    utilityCoinType: string;
    utilityTreasuryCap: string;
    utilityRecipient: string;
    utilityAmount: string;
    utilityCoinObject: string;
    utilityMint: string;
    utilityBurn: string;
    utilityBusy: string;
    utilityConfigMissing: string;
    utilitySuccess: string;
  };
  transparency: {
    title: string;
    subtitle: string;
    intro: string;
    tvl: string;
    currentHoldings: string;
    portfolioShare: string;
    auditsTitle: string;
    auditsDescription: string;
    auditsStatus: string;
    endpointTitle: string;
    endpointDescription: string;
    endpointStatus: string;
    openProjectSite: string;
    aboutFallback: string;
    contact: string;
    liveDataLoading: string;
    liveDataUnavailable: string;
    tokenLabel: string;
    defiLabel: string;
    holdings: Array<{
      name: string;
      amount: string;
      share: string;
    }>;
  };
  footer: {
    platform: string;
    swap: string;
    portfolio: string;
    articles: string;
    fund: string;
    whitepaper: string;
    trade: string;
    analytics: string;
    ltvLoans: string;
    rwaMint: string;
    adminPanel: string;
    legal: string;
    privacyPolicy: string;
    termsOfService: string;
    audits: string;
    kycAml: string;
    rightsReserved: string;
    operatedByFallback: string;
    socialLabels: {
      twitter: string;
      telegram: string;
      website: string;
    };
  };
  tokenAdmin: TokenAdminCopy;
  fundBasket: FundBasketCopy;
  fundAccounts: FundAccountsCopy;
};

const translations: Record<Language, Translation> = {
  en: {
    breadcrumbs: {
      home: 'Home',
    },
    app: {
      sectionUnavailable: 'Section unavailable',
      runtimeError: 'A runtime error prevented this section from rendering. The rest of the page is still available.',
      sections: {
        hero: 'Hero',
        analytics: 'Analytics',
        navigationDeck: 'Navigation Deck',
      },
    },
    aboutPage: {
      heroBadge: 'Manifesto',
      heroSubtitle:
        'Protocol-first capital, digital legacy, and transparent governance — the narrative behind AV8 on Sui.',
    },
    meta: {
      titleSuffix: 'Investment Platform',
    },
    project: {
      description: 'A project that lets users mine HOT tokens with a NEAR wallet directly inside Telegram.',
    },
    navbar: {
      platform: 'Platform',
      swap: 'Swap',
      fund: 'Fund',
      analytics: 'Analytics',
      articles: 'Articles',
      transparency: 'Transparency',
      about: 'About',
      aboutProject: 'About Project',
      openWebsite: 'Open Website',
      language: 'Language',
      connectGoogle: 'Google',
      connectWalletShort: 'Wallet',
      tokens: 'Tokens',
      networkScopeHint: 'Network',
      networkLockedHint: 'Disconnect your wallet to change the network.',
      walletsForNetworkHint: 'Wallets for this chain',
      chainNames: {
        eth: 'Ethereum',
        arbitrum: 'Arbitrum',
        base: 'Base',
        polygon: 'Polygon',
        bnb: 'BNB Smart Chain',
        solana: 'Solana',
        sui: 'Sui',
      },
    },
    hero: {
      badge: 'Project FID 12',
      highlight: 'Token Mining, NEAR Wallet, Telegram.',
      title: 'Investor cockpit for capital control',
      assetsHeading: 'Assets',
      visitWebsite: 'Visit Website',
      openTelegram: 'Open Telegram',
      twitterLabel: 'X / Twitter',
      projectContact: 'Project Contact',
      contactFallback: 'Contact available on request',
      live: 'Live',
      projectId: 'Project ID',
      website: 'Website',
      socialChannels: 'Social Channels',
      websiteConfigured: 'Configured',
      websiteMissing: 'Not set',
      socialConnected: 'Connected',
      socialPending: 'Pending',
      backendSource: 'Backend Source',
      laravelSettings: 'Laravel Settings',
      backendDescription: 'Branding and contact data are loaded from Settings - Projects using the public endpoint for fid=12.',
      ownerAccess: 'Owner Access',
      privateBankingEntry: 'Private banking entry',
      totalValue: 'Total value',
      connectWallet: 'Connect wallet',
      portfolioLabel: 'Portfolio',
      assetsAvailableAfterConnect: 'Asset status becomes available only after wallet connection.',
      connectedSessionNoAddress: 'Connected session does not include a wallet address.',
      noActiveWalletSession: 'No active wallet session',
      suiAssetsHidden: 'SUI wallet assets are not shown on this panel',
      lastSync: 'Last sync',
      syncPending: 'Sync has not run yet',
      refresh: 'Refresh',
      settings: 'Settings',
      userWallets: 'User wallets',
      availableWallet: 'Available wallet',
      removeLinkedWallet: 'Unlink wallet from account',
      connectWalletCta: 'Connect wallet',
      linkCurrentSuiWallet: 'Save connected wallet to account',
      suiConnectNotInProfileHint:
        'Your extension is on an address that is not linked in the database yet. Confirm the signature to store it on the server.',
      suiGoogleWalletsFilteredHint: 'On Sui, only linked Sui addresses are shown.',
      solanaLinkedWalletsFilteredHint: 'On Solana, only linked Solana addresses are shown.',
      evmLinkedWalletsFilteredHint: 'On this chain, only addresses linked for the selected network are shown.',
      connectZkLogin: 'Connect ZK Login',
      zkLoginWriteHint: 'ZK Login derives a Sui address from your Google account. Use it to sign transactions from that address only.',
      activeSuiNotice: 'Assets are hidden for the selected SUI wallet. Switch to another linked wallet.',
      settingsTitle: 'Asset settings',
      settingsDescription: 'Choose which tokens appear on the first screen and optionally set commission percentages.',
      settingsLoading: 'Loading settings...',
      settingsEmpty: 'No tokens available for configuration.',
      selected: 'Selected',
      tokens: 'tokens',
      price: 'Price',
      notAvailable: 'n/a',
      commission: 'Commission %',
      close: 'Close',
      save: 'Save',
      saving: 'Saving...',
      resolveWalletOwnerError: 'Failed to resolve wallet owner.',
      loadAssetsError: 'Failed to load assets from laravel-api.',
      loadSettingsError: 'Failed to load token settings.',
      saveSettingsError: 'Failed to save token settings.',
      noConnectedAddress: 'Connected wallet address is not available.',
      suiSettingsUnavailable: 'Asset settings are unavailable for SUI wallets.',
      settingsSaved: 'Settings saved.',
      userPrefix: 'User',
      selectedWalletLabel: 'Selected wallet',
      walletLabel: 'Wallet',
      quickReceive: 'Receive',
      quickSend: 'Send',
      quickSwap: 'Swap',
      receiveTitle: 'Receive funds',
      receiveHint: 'Share this address to receive assets on the active wallet.',
      copyAddress: 'Copy address',
      addressCopied: 'Copied',
      sendTitle: 'Send',
      sendRecipientLabel: 'Recipient address',
      sendAmountLabel: 'Amount (native coin)',
      sendSubmit: 'Send transaction',
      sendNativeHint: 'Sends the native coin of the network your wallet is on (e.g. ETH on Ethereum). Confirm in your wallet.',
      sendSuiWalletRequired: 'Connect a Sui wallet (button above or tap Sign to open the connection dialog), then send.',
      sendSuiWalletConnectOpened: 'Wallet connection is open — pick your Sui extension, then tap Sign again.',
      sendSuiExtensionWalletMismatch: 'Your browser wallet address does not match the selected linked wallet. Select the matching chip or connect the correct wallet.',
      sendEvmWalletRequired: 'Connect MetaMask, Rabby, or the embedded EVM wallet to send.',
      sendInvalidRecipient: 'Enter a valid recipient address.',
      sendInvalidAmount: 'Enter a valid amount.',
      sendSuccess: 'Transaction submitted. Check your wallet or explorer for status.',
      sendSuiNativeHint: 'Sends SUI from the connected Sui wallet using gas coin split. Confirm in your wallet.',
      sendSignButton: 'Sign!',
      sendSignHintExtension: 'Tap Sign to open your Sui wallet and approve the transfer.',
      sendSignHintZkLogin: 'Tap Sign to send with your Google zkLogin session (no browser extension). If signing fails, sign in with Google again.',
      sendZkLoginNeedSessionHint: 'Connect a Sui wallet extension, or complete Google zkLogin for this address (use Connect zkLogin on the portfolio). Then tap Sign.',
      sendZkLoginSignInFirst: 'Complete Google sign-in in the window that opens, then tap Sign again to send SUI.',
      suiHeroNetworkCaption: 'Network',
      suiHeroNetworkHeadline: 'Sui network',
      suiAvailableUsdc: 'Available USDC',
      suiGasLabel: 'Gas',
      suiConnectWalletBalances: 'Connect a Sui wallet to see balances.',
      suiHeroNavLabel: 'Fund assets',
      suiHeroNavNote: 'Fund basket value (on-chain)',
      suiHeroAv8ShareLabel: 'Available AV8 Share',
      suiHeroAv8ShareNote: 'Total AV8 shares outstanding',
      cardLabels: {
        assets: 'Assets',
        status: 'Status',
        source: 'Source',
      },
      suiCard: {
        wallet: 'SUI wallet',
        hidden: 'Hidden',
        source: 'Laravel lookup',
        assetsNote: 'Assets are not shown for SUI wallets',
        statusNote: 'Choose another linked wallet',
        sourceNote: 'Preview is available only for non-SUI wallets',
      },
      suiOnChainCoinsEmpty: 'No on-chain coins',
      suiOnChainCoinsSuffix: 'on-chain coin types',
      emptyCard: {
        waiting: 'Waiting',
        loading: 'Loading...',
        noData: 'No data',
        connectWallet: 'Connect wallet',
        hiddenState: 'Asset state is hidden',
        walletSessionRequired: 'Wallet session required',
        source: 'laravel-api / wallet tokens',
        pendingSync: 'Sync pending',
        configureWallet: 'Configure wallet in API',
        heroPortfolioUnsupportedNetwork: 'Portfolio cards here work with Ethereum, Solana, or Sui. Pick a network above.',
      },
    },
    dashboard: {
      title: 'Institutional-Grade Liquidity',
      description: 'Experience complete control over your assets. Clearly monitor invested capital, available credit lines, and liquid funds ready for withdrawal.',
      totalInvested: 'Total Invested',
      availableCredit: 'Available Credit (80%)',
      availableCreditBadge: 'LTV LOAN',
      instantApproval: 'Instant approval.',
      noSellingRequired: 'No selling required.',
      drawCreditNow: 'Draw Credit Now',
      availableToWithdraw: 'Available to Withdraw',
      onChainVerified: 'On-chain verified',
      withdraw: 'Withdraw',
      deposit: 'Deposit',
      thisMonth: 'this month',
    },
    features: {
      title: 'Institutional Strategy.',
      highlight: 'Web3 Execution.',
      description: 'We bridge the gap between traditional finance and decentralized protocols, delivering a comprehensive ecosystem for high-net-worth individuals and corporate treasuries.',
      readWhitepaper: 'Read Whitepaper',
      secureGateway: 'Secure Gateway',
      frictionlessExchange: 'Frictionless Exchange',
      exchangeDescription: 'Swap assets effortlessly with institutional-grade liquidity directly from your dashboard. Our smart router finds the best rates across CEXs and DEXs.',
      checklist: [
        'Zero slippage on major pairs',
        'Instant settlement via stablecoins',
        'Bank-grade security protocols',
      ],
      swap: 'Swap',
      youPay: 'You Pay',
      balance: 'Balance',
      youReceive: 'You Receive',
      confirmExchange: 'Confirm Exchange',
      cards: [
        {
          title: 'Blockchain Transparency',
          description: 'Real-time on-chain auditing of all fund operations. Track your assets down to the transaction block.',
        },
        {
          title: 'Hybrid Assets Management',
          description: 'Seamlessly balance TradFi portfolios alongside DeFi yield farming and token investments.',
        },
        {
          title: 'Crypto-Fiat Gateway',
          description: 'Integrated fiat on-and-off ramps for effortless deposits and instant wire withdrawals globally.',
        },
      ],
    },
    analytics: {
      badge: 'Real-Time Performance',
      title: 'Data-Driven Growth.',
      description: 'Monitor your asset growth with pinpoint accuracy. Our proprietary algorithms ensure maximum yield generation across diversified vectors.',
      indexName: 'AV8Capital Composite Index',
      points: 'pts',
      ytd: '+212.5% YTD',
      insightsTitle: 'Financial Analysis & Insights',
      articlesTitle: 'Articles',
      articlesSubtitle: 'Browse the latest publications and open the full article without leaving the page.',
      articleList: 'Article List',
      articleView: 'Article View',
      loading: 'Loading articles...',
      empty: 'No articles found for this project.',
      openArticle: 'Open Article',
      noContent: 'Article content is not available yet.',
      articleDescription: 'Discover key insights from our quantitative analysis team on navigating the hybrid market landscape.',
      readMin: 'min read',
      chartMonths: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      articles: [
        { tag: 'Macro', title: 'The Impact of Global Interest Rates on DeFi Yields', time: 5 },
        { tag: 'Strategy', title: 'Balancing Equities and Crypto for Lower Volatility', time: 8 },
        { tag: 'On-Chain', title: 'Q3 Transparency Report: Smart Contract Audits', time: 12 },
      ],
    },
    blog: {
      pageTitle: 'Articles',
      heroBadge: 'Publications',
      titleAccent: 'Blog',
      subtitle: 'Explore the latest publications, market notes, and project updates.',
      searchPlaceholder: 'Search articles...',
      filterAll: 'All',
      filterTop: 'Top',
      loadMore: 'Load more',
      readMore: 'Read more',
      openLabel: 'Open article',
      viewsLabel: 'Views: {count}',
      emptyTitle: 'No articles found',
      emptyHint: 'Try changing the search or filter.',
      error: 'Failed to load blog posts.',
      noDate: 'No date',
    },
    whitepaper: {
      pageTitle: 'Whitepaper',
      badge: 'Protocol Overview',
      intro: 'This document outlines the AV8 operating model for institutional liquidity, secured credit, transparent treasury management, and controlled execution across fiat and digital asset rails.',
      sections: [
        {
          title: 'Executive Summary',
          body: 'AV8 is designed as a hybrid capital layer that gives clients visibility over deployed capital, access to collateral-backed credit, and a controlled path between traditional and digital markets.',
          points: [
            'Unified view of invested capital, available credit, and liquid reserves.',
            'Structured access to credit without forced sale of core positions.',
            'Execution framework that prioritizes transparency, security, and operational discipline.',
          ],
        },
        {
          title: 'System Architecture',
          body: 'The platform combines portfolio monitoring, routing, and risk controls into a single operator interface. Public-facing metadata and content are delivered through Laravel-backed configuration and API endpoints.',
          points: [
            'Dedicated frontend surfaces for investment, swap, analytics, and article flows.',
            'Centralized project branding and public content distribution.',
            'Composable architecture that supports modular product pages and future integrations.',
          ],
        },
        {
          title: 'Liquidity and Credit',
          body: 'The liquidity engine is structured around collateral visibility and predictable credit access. Credit lines are intended to extend capital efficiency while preserving long-term strategic holdings.',
          points: [
            'Institutional-style borrowing against tracked asset positions.',
            'Credit access framed around transparent limits and available liquidity.',
            'Operational emphasis on rapid approval and controlled withdrawal capacity.',
          ],
        },
        {
          title: 'Risk and Governance',
          body: 'Risk management is implemented through visibility, allocation discipline, and layered control over operational flows. Governance assumptions prioritize auditable decisions and configurable system behavior.',
          points: [
            'Public transparency as a first-order trust mechanism.',
            'Separation between user-facing experiences and administrative configuration.',
            'Expandable controls for treasury policy, asset routing, and project-level settings.',
          ],
        },
        {
          title: 'Growth Strategy',
          body: 'AV8 is positioned for expansion through product-specific funnels: investment onboarding, asset exchange, analytics content, and branded public communication. Each surface can operate independently while reinforcing a common ecosystem.',
          points: [
            'Invest page for capital overview and credit products.',
            'Swap page for crypto-fiat execution pathways.',
            'Whitepaper and article flows for investor education and narrative control.',
          ],
        },
      ],
    },
    privacyPolicy: {
      pageTitle: 'Privacy Policy',
      badge: 'Privacy & data',
      intro: 'This policy explains what personal data AV8 collects, how that data is used, how it is protected, and what rights users retain when interacting with the platform.',
      sections: [
        {
          title: 'Information Collection',
          body: 'We collect only the information necessary to provide services, process requests, and maintain secure access to platform functionality.',
          points: [
            'Name and contact details such as email, phone number, and address.',
            'Payment-related details required for service delivery.',
            'Technical and usage information related to website visits and platform activity.',
          ],
        },
        {
          title: 'How Information Is Used',
          body: 'Collected data is used to operate the platform responsibly and to improve service quality.',
          points: [
            'Processing requests, orders, and payments.',
            'Providing products, support, and service updates.',
            'Improving the website, user flows, and operational reliability.',
            'Sending news or special offers only when the user has subscribed.',
          ],
        },
        {
          title: 'Storage and Disclosure',
          body: 'Personal data is stored only for the period required by business, legal, and security needs. Data is not sold or rented to third parties.',
          points: [
            'Retention is limited to the period necessary for service and compliance purposes.',
            'Disclosure may occur only where needed to process requests or where agreed by the user.',
            'Operational partners receive only the minimum required information.',
          ],
        },
        {
          title: 'Security Measures',
          body: 'We apply technical and organizational controls to protect user data against unauthorized access, modification, disclosure, or destruction.',
          points: [
            'Use of protected communication channels.',
            'Controlled access to sensitive information.',
            'Secure storage methods and ongoing security discipline.',
          ],
        },
        {
          title: 'Policy Changes',
          body: 'The privacy policy may be updated from time to time. Material changes are published on this page and may also be communicated through the platform.',
          points: [
            'Updated terms become effective once published.',
            'Users are encouraged to review the policy periodically.',
          ],
        },
      ],
    },
    termsOfService: {
      pageTitle: 'Terms of Service',
      badge: 'Legal terms',
      intro: 'These terms govern access to the AV8 platform, public materials, and related financial or informational services. By using the platform, the user agrees to operate within these conditions.',
      sections: [
        {
          title: 'Scope of Use',
          body: 'The platform and its materials are provided for lawful access to product information, investment interfaces, exchange tools, and related support flows.',
          points: [
            'Use is permitted only in compliance with applicable law and regulation.',
            'Certain products or features may be unavailable in specific jurisdictions.',
            'Access may be limited, suspended, or conditioned on additional checks.',
          ],
        },
        {
          title: 'User Obligations',
          body: 'Users are responsible for the accuracy of submitted information and for maintaining the security of any credentials, wallets, or access channels used with the platform.',
          points: [
            'Information provided to AV8 must be complete, current, and not misleading.',
            'Users must not interfere with platform operations or attempt unauthorized access.',
            'Any activity performed through a user-controlled account or wallet is treated as initiated by that user.',
          ],
        },
        {
          title: 'Risk Disclosure',
          body: 'Financial, digital asset, and cross-border settlement activity involves market, liquidity, operational, legal, and technological risk. Users are expected to evaluate these risks independently.',
          points: [
            'Past performance or public analytics do not guarantee future results.',
            'Asset values, routing conditions, and execution availability may change without notice.',
            'Users remain responsible for tax, regulatory, and legal obligations in their jurisdiction.',
          ],
        },
        {
          title: 'Intellectual Property',
          body: 'All platform branding, interface materials, documents, and published content remain the property of AV8 or its licensors unless stated otherwise.',
          points: [
            'Materials may not be copied, redistributed, or modified without permission.',
            'Project branding and content may be used only for legitimate reference to the platform.',
            'Unauthorized commercial use of platform assets is prohibited.',
          ],
        },
        {
          title: 'Service Changes and Termination',
          body: 'AV8 may update, restrict, or discontinue parts of the platform where required by product evolution, compliance needs, security events, or operational decisions.',
          points: [
            'Terms may be updated and become effective once published on the website.',
            'Continued use after publication constitutes acceptance of the revised terms.',
            'AV8 may suspend access where misuse, compliance issues, or security risks are detected.',
          ],
        },
      ],
    },
    kycAml: {
      pageTitle: 'KYC / AML',
      badge: 'Compliance',
      intro: 'AV8 applies Know Your Customer and Anti-Money Laundering controls to protect the platform, support compliance, and maintain transparent access to financial services.',
      sections: [
        {
          title: 'Identity Verification',
          body: 'Users may be asked to confirm identity before accessing regulated functionality, financial products, or elevated transaction limits.',
          points: [
            'Verification may include personal details, contact information, and supporting documentation.',
            'Additional review may be requested for higher-risk or higher-volume activity.',
            'Access to some features may remain limited until verification is completed.',
          ],
        },
        {
          title: 'Risk Assessment',
          body: 'Each account and transaction flow can be evaluated under a risk-based model to detect unusual behavior and enforce internal controls.',
          points: [
            'Monitoring may include geography, transaction size, behavioral anomalies, and source-of-funds indicators.',
            'Enhanced due diligence can apply where risk signals require deeper review.',
            'The platform may pause or restrict activity while compliance checks are completed.',
          ],
        },
        {
          title: 'AML Monitoring',
          body: 'AV8 maintains procedures intended to identify, prevent, and respond to potential money laundering, sanctions exposure, or illicit financial activity.',
          points: [
            'Transactions may be reviewed for suspicious patterns or prohibited counterparties.',
            'Activity may be escalated for manual review where automated controls detect risk.',
            'Records can be retained as required for regulatory, legal, and operational purposes.',
          ],
        },
        {
          title: 'User Responsibilities',
          body: 'Users are expected to provide accurate information and to use the platform only for lawful purposes consistent with applicable regulation.',
          points: [
            'Submitted information must be current, complete, and not misleading.',
            'Use of third-party identities, falsified documents, or hidden beneficial ownership is prohibited.',
            'Failure to cooperate with compliance checks may result in restricted access or account suspension.',
          ],
        },
        {
          title: 'Policy Updates',
          body: 'KYC / AML requirements may change as AV8 updates internal policy or responds to legal and regulatory developments.',
          points: [
            'Updated requirements become effective when published.',
            'Users may be asked to complete renewed verification over time.',
          ],
        },
      ],
    },
    article: {
      pageTitle: 'Article',
      heroBadge: 'Article',
      back: 'Back to blog',
      share: 'Share',
      related: 'Related articles',
      news: 'News',
      noDate: 'No date',
      invalid: 'Invalid article identifier.',
      error: 'Failed to load article.',
      emptyBody: 'Article content is not available yet.',
    },
    invest: {
      pageTitle: 'Fund',
      pageHeroSubtitle: 'Sui fund telemetry, NAV context, and cockpit controls in one place.',
      heroBadge: 'On-chain fund',
      cockpitBadge: 'The Cockpit',
      cockpitTitle: 'Fund',
      cockpitSubtitle:
        'Key figures on capital movement, plus clear AI summaries of the trades and reallocations that have already taken place.',
      fundCoreLabel: 'Fund Core',
      av8ObjectTitle: 'AV8 object',
      navPrefix: 'NAV',
      av8Abbrev: 'AV8',
      fundWord: 'Fund',
      assetCryptoLabel: 'Blue-Chip Crypto',
      assetRwaLabel: 'Real World Assets',
      assetYieldLabel: 'Yield Vaults',
      awaitingAssets: 'Awaiting assets',
      reserveLayer: 'Reserve layer',
      aiLogTitle: 'AI Flight Log',
      aiLogSubtitle: 'Latest system maneuvers',
      trustLayerBadge: 'trust layer',
      digestPending: 'Digest pending',
      digestPrefix: 'Digest',
      aiPilotTrace: 'AI pilot trace',
      basketIdLabel: 'Basket ID',
      packageIdLabel: 'Package ID',
      notConfigured: 'not configured',
      rpcNoticePrefix: 'RPC notice',
      refreshingSui: 'Refreshing Sui data…',
      aiStatusVerified: 'Verified',
      aiStatusPending: 'Pending',
      aiStatusFailed: 'Failed',
      depositSectionKicker: 'Invest',
      depositSectionTitle: 'Choose wallet asset and receive AV8',
      depositBadgeReady: 'Ready',
      depositBadgeConfigured: 'Configured',
      depositBadgeWalletAsset: 'Wallet asset',
      depositTokenInWalletLabel: 'Token in active wallet',
      depositAssetFromWalletLabel: 'Asset from active wallet',
      depositTokenWhitelisted: 'whitelisted',
      depositTokenNotWhitelisted: 'not whitelisted',
      depositAvailablePrefix: 'Available',
      depositAmountLabel: 'Amount',
      depositAmountFieldLabel: 'Deposit amount',
      depositWalletBalanceLabel: 'Wallet balance',
      depositLoading: 'Loading...',
      depositExpectedIssueLabel: 'Expected issue',
      depositPathLabel: 'Deposit path',
      depositPathSui: 'SUI deposit',
      depositPathOracle: 'Oracle quote required',
      depositNoticeWhitelistedLead:
        '{symbol} is whitelisted, but direct client deposits need ',
      depositNoticeNotWhitelistedLead:
        '{symbol} exists in the active wallet, but it is not whitelisted for the fund yet. Whitelist it first, then add ',
      depositNoticeTrail: ' and oracle valuation before signing can be enabled.',
      depositSigning: 'Signing...',
      depositButton: 'Deposit {symbol}',
      depositConnectedWallet: 'Connected wallet',
      depositWalletAsideBlurb:
        'AV8 issuance is displayed before signing. The current executable path deposits SUI into the portfolio; full atomic AV8 minting requires the deployed fund_share TreasuryCap to be wired into the portfolio deposit flow.',
      depositAvailableTokenCard: 'Available {symbol}',
      depositWalletDetectionHint: 'Detected in active Sui wallet or zkLogin session',
      depositAv8ShareCard: 'You have',
      depositAv8WithdrawHint: 'Ready to withdraw',
      depositAvailableInWalletPrefix: 'Available in wallet:',
      redeemAv8ShareLabel: 'Redeem AV8 share',
      depositPtbRouteLabel: 'PTB route:',
      depositRouteBlockedWhitelisted:
        '{symbol} requires portfolio.deposit_asset<T> and oracle valuation before deposit signing.',
      depositRouteBlockedNotWhitelisted:
        '{symbol} is in the wallet but is not whitelisted for fund deposits.',
    },
    portfolio: {
      pageTitle: 'Portfolio',
      breadcrumbCurrent: 'Portfolio',
      networkSelectorLabel: 'Network',
      networkSelectorHint: 'Choose the route context for this portfolio view.',
      badge: 'Horizon Line',
      title: 'Investor cockpit for',
      titleHighlight: 'Sui-native capital control',
      titleSecondary: 'Portfolio flight path',
      subtitle: 'NAV trajectory, annualized altitude, liquidity reserve, and portfolio health in a dedicated portfolio view.',
      ownerAccess: 'Owner Access',
      notConnected: 'Not connected',
      walletModes: 'Sui Wallet / zkLogin',
      awaitingAuth: 'awaiting auth',
      connectWallet: 'Connect Wallet',
      walletNote: 'Wallet and zkLogin sit behind the same owner console. PTB execution remains connected to the current Sui object IDs and upgrades cleanly once the OIDC flow is wired.',
      privateBankingEntry: 'Private banking entry',
      commandRoutesDescription: 'Wallet access, zkLogin handoff, and portfolio command routes belong in one premium control surface.',
      fuelLevel: 'Available',
      fuelDescriptionInline: 'USDC held for redemptions and maneuvers inside the same portfolio route.',
      sectionTitle: 'Portfolio flight path',
      sectionBadgeScenario: 'scenario overlay',
      sectionBadgeLive: 'live basket state',
      health: 'Portfolio Health',
      maxDrift: 'Max drift from target',
      altitude: 'Dynamics',
      annualizedClimb: 'Annualized from current monthly climb',
      fuelHeld: 'Available',
      fuelHeldDescription: 'USDC held for redemptions and maneuvers',
      manifestTitle: 'The Manifest',
      manifestSubtitle: 'Main asset categories and their portfolio weights',
      sleeves: 'sleeves',
      category: 'Category',
      asset: 'Asset',
      share: 'Share',
      role: 'Role',
      healthStatus: {
        stable: 'Stable',
        monitoring: 'Monitoring',
        rebalancing: 'Rebalancing',
      },
      manifest: {
        liquidYield: 'Liquid Yield',
        liquidYieldRole: 'Cash generation and maneuver reserve',
        cryptoBase: 'Crypto Base',
        cryptoBaseRole: 'Technology upside and network exposure',
        fixedIncome: 'Fixed Income',
        fixedIncomeRole: 'Foundation and balance-sheet stability',
        equity: 'Equity',
        equityRole: 'Global market growth sleeve',
      },
      defiTitle: 'Current DeFi positions',
      defiConnectWallet: 'Connect a wallet to load live holdings from Zerion.',
      defiSuiUnavailable: 'DeFi positions are not shown for the active SUI wallet.',
      defiActiveWallet: 'Active wallet',
      defiSuiOnChainDisclaimer: 'Balances below are read directly from Sui. Aggregated protocol positions (Zerion-style) are not wired for this chain in this view yet.',
      defiSuiNeedWallet: 'Select a Sui-linked wallet in the cockpit to load on-chain holdings.',
      defiSuiOtherTabHint: 'The active wallet is a Sui address. Switch the portfolio network to SUI for on-chain balances, or choose an Ethereum or Solana wallet for this DeFi feed.',
      defiSuiOnChainEmpty: 'No coin balances found for this address on Sui.',
      defiSuiCetusTitle: 'Swap on Sui (Cetus)',
      defiSuiCetusBlurb: 'Quotes and swaps use the Cetus aggregator on your selected Sui network (same engine as the dedicated swap rail).',
      defiSuiCetusOpenApp: 'Open Cetus app',
      cockpitWalletTokensTitle: 'Wallet tokens',
      cockpitWalletTokensListHeading: 'Wallet tokens',
      cockpitInvestHeading: 'Invest',
      cockpitDeployCapital: 'Deposit',
      cockpitRecallLiquidity: 'Withdraw from deposit',
      cockpitSubmittingPtb: 'Submitting PTB…',
    },
    swap: {
      back: 'Back to home',
      subtitle: 'Swap on EVM via 1inch or on Sui via Cetus — you confirm each trade in your wallet.',
      openPage: 'Open swap page',
      pageTitle: 'Swap',
      heroBadge: 'Execution',
    },
    mint: {
      pageTitle: 'Mint RWA',
      heroBadge: 'Tokenization',
      subtitle: 'Cyber-Elegance minting cockpit: choose an asset class, seal your metadata, initialise on Sui.',
      step1Label: 'Asset class',
      step2Label: 'Intake fields',
      step3Label: 'Blockchain initialisation',
      assetVehicle: 'Vehicle',
      assetBusiness: 'Business',
      assetUniversal: 'Universal asset',
      makeModel: 'Make & model',
      vin: 'VIN',
      year: 'Year',
      mileage: 'Mileage (km)',
      docsLabel: 'Title & inspection',
      docsDrop: 'Drag & drop PDFs (title, inspection). Files are hashed for Walrus/IPFS bundle.',
      estimatedUsd: 'Appraised value (USD)',
      companyName: 'Company / location name',
      regNumber: 'Registration ID (BIN / TIN / AutoAgent)',
      businessType: 'Business type',
      bizService: 'Service',
      bizShop: 'Retail',
      bizRent: 'Rental',
      revenueMonthly: 'Avg. monthly revenue (USD)',
      legalAddress: 'Legal address or Google Maps link',
      universalTitle: 'Asset title',
      coverLabel: 'Cover image',
      coverHint: 'Marketplace + wallet thumbnail',
      descriptionLabel: 'Marketing description',
      descriptionPlaceholder: 'Describe the collateral story, cash flows, or vehicle condition.',
      blockchainSection: 'Sign with your Sui wallet',
      blockchainHint: 'zkLogin / wallet modal submits the Move call after media upload.',
      connectWalletHint: 'Connect a Sui wallet to submit the mint transaction.',
      cta: 'Initialize RWA digitization',
      ctaLoading: 'Initialising…',
      packageMissing: 'Set VITE_SUI_PACKAGE_ID to enable on-chain mint. Metadata is still packaged off-chain.',
      phaseEncrypt: 'Encrypting physical data…',
      phaseWalrus: 'Uploading to Walrus / IPFS…',
      phaseMove: 'Generating Move object…',
      success: 'Asset digitised',
      digestLabel: 'Transaction digest',
      openExplorer: 'Open in explorer',
      metadataNote: 'Metadata JSON is oracle-ready (USD appraisal, identifiers, doc CIDs).',
      errorPrefix: 'Minting failed',
      validationRequired: 'Fill every required field and attach documents where asked.',
      nonVehicleNote: 'On-chain entry points for business / universal classes must match your Move package. Metadata CID is ready for later mint.',
      governanceTitle: 'Governance & Security',
      governanceBlurb:
        'Delegate AdminCap to a multi-sig or a second administrator so minting and upgrades require multiple approvals—no single Google session is a single point of failure.',
      newAdminAddressLabel: 'Enter the address of the New Administrator or Multi-sig Vault',
      authorizeNewAdmin: 'Authorize New Admin',
      authorizeNewAdminBusy: 'Authorizing…',
      adminCapMissing: 'Set VITE_SUI_ADMIN_CAP_ID to the AdminCap object your wallet owns, and VITE_SUI_PACKAGE_ID to the deployed package.',
      invalidAdminAddress: 'Enter a valid 32-byte Sui address (0x + 64 hex characters).',
      adminAuthorized: 'New administrator authorized.',
      governanceWalletHint: 'Connect the wallet that currently holds this AdminCap to submit the transaction.',
      deployRunbookTitle: 'Contract Deploy Runbook',
      deployRunbookBlurb:
        'Use this checklist when the Move contract changes. Minting does not run deploy scripts; it calls the package already configured below.',
      deployRunbookWarning:
        'Do not expose deploy execution in the browser. Run it from the server, terminal, or CI with an explicit approval step.',
      deployRunbookChecklist: [
        'Change the Move sources and review entry point signatures.',
        'Build and deploy the RWA package from the project workspace.',
        'Copy the new package and AdminCap object IDs from the deploy output.',
        'Update .env.local and .env.production, then restart Vite or rebuild production.',
        'Verify minting with the wallet that owns the active AdminCap.',
      ],
      deployRunbookCommandsLabel: 'Manual commands',
      deployRunbookCommands: ['npm run sui:build:rwa', 'npm run sui:deploy:rwa'],
      deployRunbookEnvLabel: 'Update these values after deploy',
      deployRunbookEnvVars: ['VITE_SUI_RWA_PACKAGE_ID', 'VITE_SUI_RWA_ADMIN_CAP_ID', 'VITE_SUI_UTILITY_PACKAGE_ID', 'VITE_SUI_UTILITY_TREASURY_CAP_ID'],
      utilityTab: 'Utility Token',
      utilityTitle: 'AV8 Utility Token',
      utilityBlurb:
        'Connect any existing Sui coin type and its TreasuryCap, then mint or burn through the generic token admin entry points.',
      utilityConstants: 'Token constants',
      utilityCreationNote:
        'A brand-new coin type still requires publishing a Move module. Use these fields as the token spec, deploy the package, then paste the resulting coin type and TreasuryCap here.',
      utilityTokenName: 'Token name',
      utilityTokenSymbol: 'Symbol',
      utilityTokenDecimals: 'Decimals',
      utilityTokenLogo: 'Logo image',
      utilityChooseLogo: 'Choose logo',
      utilityUploadLogo: 'Upload logo',
      utilityLogoBusy: 'Uploading…',
      utilityLogoReady: 'Logo uploaded. Use this icon URL in the token Move module before publishing.',
      utilityLogoHint: 'Optional. If you publish a new coin type with this URL, Sui CoinMetadata will show the logo; leave it empty to publish without logo.',
      utilityCoinType: 'Coin type',
      utilityTreasuryCap: 'TreasuryCap object ID',
      utilityRecipient: 'Recipient address',
      utilityAmount: 'Amount (AV8U)',
      utilityCoinObject: 'Coin object ID to burn',
      utilityMint: 'Mint Utility Tokens',
      utilityBurn: 'Burn Coin Object',
      utilityBusy: 'Submitting…',
      utilityConfigMissing: 'Set VITE_SUI_UTILITY_PACKAGE_ID and VITE_SUI_UTILITY_TREASURY_CAP_ID after deploying av8_rwa.',
      utilitySuccess: 'Utility token transaction submitted.',
    },
    transparency: {
      title: '100% Verifiable.',
      subtitle: 'Zero Compromise.',
      intro: 'Every transaction, every holding, and every protocol interaction is verifiable on-chain. We believe trust is built on transparency.',
      tvl: 'Total Value Locked (TVL)',
      currentHoldings: 'Current Holdings',
      portfolioShare: 'of portfolio',
      auditsTitle: 'Smart Contract Audits',
      auditsDescription: 'Audited by Tier-1 security firms with continuous bug bounties.',
      auditsStatus: 'CertiK Verified',
      endpointTitle: 'Project Endpoint Connected',
      endpointDescription: 'The landing now reads public metadata from Laravel API for Settings - Projects with fid=12.',
      endpointStatus: 'API /api/projects/12',
      openProjectSite: 'Open Project Site',
      aboutFallback: 'Project description is available from Laravel settings.',
      contact: 'Contact',
      liveDataLoading: 'Loading live portfolio data...',
      liveDataUnavailable: 'Live portfolio data is unavailable right now.',
      tokenLabel: 'Token',
      defiLabel: 'DeFi',
      holdings: [
        { name: 'USDC (Ethereum)', amount: '$150M', share: '36.3%' },
        { name: 'Wrapped BTC', amount: '$120M', share: '29.1%' },
        { name: 'Lido Staked ETH', amount: '$90M', share: '21.8%' },
        { name: 'US Treasuries (Tokenized)', amount: '$52.5M', share: '12.8%' },
      ],
    },
    footer: {
      platform: 'Platform',
      swap: 'Swap',
      portfolio: 'Portfolio',
      articles: 'Articles',
      fund: 'Fund',
      whitepaper: 'Whitepaper',
      trade: 'Trade',
      analytics: 'Analytics',
      ltvLoans: 'LTV Loans',
      rwaMint: 'RWA mint',
      adminPanel: 'Admin panel',
      legal: 'Legal',
      privacyPolicy: 'Privacy Policy',
      termsOfService: 'Terms of Service',
      audits: 'Audits',
      kycAml: 'KYC / AML',
      rightsReserved: 'All rights reserved.',
      operatedByFallback: 'Operated by project team.',
      socialLabels: {
        twitter: 'Twitter',
        telegram: 'Telegram',
        website: 'Website',
      },
    },
    tokenAdmin: tokenAdminEn,
    fundBasket: fundBasketEn,
    fundAccounts: fundAccountsEn,
  },
  ua: {
    breadcrumbs: {
      home: 'Головна',
    },
    app: {
      sectionUnavailable: 'Секція недоступна',
      runtimeError: 'Під час рендерингу цієї секції сталася помилка. Решта сторінки залишається доступною.',
      sections: {
        hero: 'Hero',
        analytics: 'Аналітика',
        navigationDeck: 'Навігаційна панель',
      },
    },
    aboutPage: {
      heroBadge: 'Маніфест',
      heroSubtitle:
        'Капітал на протоколі, цифрова спадщина та прозоре управління — оповідь AV8 у мережі Sui.',
    },
    meta: {
      titleSuffix: 'Інвестиційна платформа',
    },
    project: {
      description: 'Проєкт, який дозволяє добувати HOT токени через гаманець NEAR безпосередньо в Telegram.',
    },
    navbar: {
      platform: 'Платформа',
      swap: 'Обмін',
      fund: 'Фонд',
      analytics: 'Аналітика',
      articles: 'Статті',
      transparency: 'Прозорість',
      about: 'Про проєкт',
      aboutProject: 'Про проєкт',
      openWebsite: 'Відкрити сайт',
      language: 'Мова',
      connectGoogle: 'Google',
      connectWalletShort: 'Гаманець',
      tokens: 'Токени',
      networkScopeHint: 'Мережа',
      networkLockedHint: 'Щоб змінити мережу, відключіть гаманець.',
      walletsForNetworkHint: 'Гаманці для цієї мережі',
      chainNames: {
        eth: 'Ethereum',
        arbitrum: 'Arbitrum',
        base: 'Base',
        polygon: 'Polygon',
        bnb: 'BNB Smart Chain',
        solana: 'Solana',
        sui: 'Sui',
      },
    },
    hero: {
      badge: 'платформа майбутнього',
      highlight: 'Майнінг токенів, NEAR Wallet, Telegram.',
      title: 'Кабіна інвестора для контролю капіталу',
      assetsHeading: 'Активи',
      visitWebsite: 'Перейти на сайт',
      openTelegram: 'Відкрити Telegram',
      twitterLabel: 'X / Twitter',
      projectContact: 'Контакт проєкту',
      contactFallback: 'Контакт доступний за запитом',
      live: 'Активний',
      projectId: 'ID проєкту',
      website: 'Сайт',
      socialChannels: 'Соцмережі',
      websiteConfigured: 'Налаштовано',
      websiteMissing: 'Не вказано',
      socialConnected: 'Підключено',
      socialPending: 'Очікує',
      backendSource: 'Джерело даних',
      laravelSettings: 'Laravel Settings',
      backendDescription: 'Брендинг і контактні дані завантажуються з Settings - Projects через публічний endpoint для fid=12.',
      ownerAccess: 'Доступ власника',
      privateBankingEntry: 'Вхід private banking',
      totalValue: 'Загальна сума',
      connectWallet: 'Підключіть гаманець',
      portfolioLabel: 'Портфель',
      assetsAvailableAfterConnect: 'Стан активів доступний лише після підключення гаманця.',
      connectedSessionNoAddress: 'Підключена сесія не містить адреси гаманця.',
      noActiveWalletSession: 'Немає активної wallet session',
      suiAssetsHidden: 'Для SUI-гаманців активи на цій панелі не показуються',
      lastSync: 'Остання синхронізація',
      syncPending: 'Синхронізацію ще не виконано',
      refresh: 'Оновити',
      settings: 'Налаштування',
      userWallets: 'Гаманці користувача',
      availableWallet: 'Доступний гаманець',
      removeLinkedWallet: 'Відвʼязати гаманець від акаунта',
      connectWalletCta: 'Підключити гаманець',
      linkCurrentSuiWallet: 'Зберегти підключений гаманець у профілі',
      suiConnectNotInProfileHint:
        'Активна адреса в гаманці ще не збережена на сервері. Підтвердіть підпис, щоб додати її до прив’язаних.',
      suiGoogleWalletsFilteredHint: 'У мережі Sui показуються лише прив’язані Sui-адреси.',
      solanaLinkedWalletsFilteredHint: 'У мережі Solana показуються лише прив’язані Solana-адреси.',
      evmLinkedWalletsFilteredHint: 'У цій мережі показуються лише адреси, прив’язані для обраної мережі.',
      connectZkLogin: 'Підключити ZK Login',
      zkLoginWriteHint: 'ZK Login формує Sui-адресу з вашого Google-акаунта. Підписувати транзакції можна лише з цієї адреси.',
      activeSuiNotice: 'Для вибраного SUI-гаманця активи не відображаються. Перемкніться на інший прив’язаний гаманець.',
      settingsTitle: 'Налаштування активів',
      settingsDescription: 'Оберіть токени для виводу на першому екрані та за потреби задайте комісію у відсотках.',
      settingsLoading: 'Завантаження налаштувань...',
      settingsEmpty: 'Немає токенів для налаштування.',
      selected: 'Вибрано',
      tokens: 'токенів',
      price: 'Ціна',
      notAvailable: 'н/д',
      commission: 'Комісія %',
      close: 'Закрити',
      save: 'Зберегти',
      saving: 'Збереження...',
      resolveWalletOwnerError: 'Не вдалося визначити власника гаманця.',
      loadAssetsError: 'Не вдалося завантажити активи з laravel-api.',
      loadSettingsError: 'Не вдалося завантажити налаштування токенів.',
      saveSettingsError: 'Не вдалося зберегти налаштування токенів.',
      noConnectedAddress: 'Адреса підключеного гаманця недоступна.',
      suiSettingsUnavailable: 'Налаштування активів недоступні для SUI-гаманців.',
      settingsSaved: 'Налаштування збережено.',
      userPrefix: 'Користувач',
      selectedWalletLabel: 'Вибраний гаманець',
      walletLabel: 'Гаманець',
      quickReceive: 'Отримати',
      quickSend: 'Надіслати',
      quickSwap: 'Обмін',
      receiveTitle: 'Отримати кошти',
      receiveHint: 'Надайте цю адресу, щоб отримати активи на поточний гаманець.',
      copyAddress: 'Копіювати адресу',
      addressCopied: 'Скопійовано',
      sendTitle: 'Відправити',
      sendRecipientLabel: 'Адреса отримувача',
      sendAmountLabel: 'Сума (нативна монета)',
      sendSubmit: 'Надіслати транзакцію',
      sendNativeHint: 'Відправляє нативну монету мережі, у якій зараз гаманець (наприклад ETH у Ethereum). Підтвердіть у гаманці.',
      sendSuiWalletRequired: 'Підключіть Sui-гаманець (кнопка вище або «Підписати!» відкриє вікно підключення), потім надішліть.',
      sendSuiWalletConnectOpened: 'Відкрито вікно підключення — оберіть Sui-розширення, потім знову натисніть «Підписати!».',
      sendSuiExtensionWalletMismatch: 'Адреса гаманця в браузері не збігається з вибраним прив\'язаним гаманцем. Оберіть відповідний чіп або підключіть потрібний гаманець.',
      sendEvmWalletRequired: 'Підключіть MetaMask, Rabby або вбудований EVM-гаманець для відправки.',
      sendInvalidRecipient: 'Введіть коректну адресу отримувача.',
      sendInvalidAmount: 'Введіть коректну суму.',
      sendSuccess: 'Транзакцію надіслано. Статус дивіться у гаманці або в експлорері.',
      sendSuiNativeHint: 'Переказ SUI з підключеного Sui-гаманця через split газової монети. Підтвердіть у гаманці.',
      sendSignButton: 'Підписати!',
      sendSignHintExtension: 'Натисніть «Підписати!», щоб відкрити Sui-гаманець і підтвердити переказ.',
      sendSignHintZkLogin: 'Натисніть «Підписати!», щоб надіслати через zkLogin і Google (без розширення). Якщо не вийде — увійдіть через Google знову.',
      sendZkLoginNeedSessionHint: 'Підключіть Sui-гаманець або завершіть Google zkLogin для цієї адреси (кнопка zkLogin на портфелі), потім натисніть «Підписати!».',
      sendZkLoginSignInFirst: 'Увійдіть через Google у вікні, що відкриється, потім знову натисніть «Підписати!», щоб надіслати SUI.',
      suiHeroNetworkCaption: 'Мережа',
      suiHeroNetworkHeadline: 'Мережа SUI',
      suiAvailableUsdc: 'Доступно USDC',
      suiGasLabel: 'Газ',
      suiConnectWalletBalances: 'Підключіть гаманець Sui, щоб побачити баланси.',
      suiHeroNavLabel: 'Активи фонда',
      suiHeroNavNote: 'Вартість кошика фонду (у блокчейні)',
      suiHeroAv8ShareLabel: 'Доступна частка AV8',
      suiHeroAv8ShareNote: 'Усього емітовано часток AV8',
      cardLabels: {
        assets: 'Активи',
        status: 'Статус',
        source: 'Джерело',
      },
      suiCard: {
        wallet: 'SUI wallet',
        hidden: 'Приховано',
        source: 'Laravel lookup',
        assetsNote: 'Для SUI активи не показуються',
        statusNote: 'Виберіть інший прив’язаний гаманець',
        sourceNote: 'Перегляд доступний лише для не-SUI гаманців',
      },
      suiOnChainCoinsEmpty: 'Немає монет у блокчейні',
      suiOnChainCoinsSuffix: 'типів монет у блокчейні',
      emptyCard: {
        waiting: 'Очікування',
        loading: 'Завантаження...',
        noData: 'Немає даних',
        connectWallet: 'Підключіть гаманець',
        hiddenState: 'Стан активів приховано',
        walletSessionRequired: 'Потрібна wallet session',
        source: 'laravel-api / wallet tokens',
        pendingSync: 'Очікується синхронізація',
        configureWallet: 'Налаштуйте гаманець в API',
        heroPortfolioUnsupportedNetwork: 'Картки портфеля тут доступні для Ethereum, Solana або Sui. Оберіть мережу перемикачем вище.',
      },
    },
    dashboard: {
      title: 'Ліквідність інституційного рівня',
      description: 'Повний контроль над активами. Відстежуйте інвестований капітал, доступні кредитні лінії та ліквідні кошти для виведення.',
      totalInvested: 'Усього інвестовано',
      availableCredit: 'Доступний кредит (80%)',
      availableCreditBadge: 'LTV КРЕДИТ',
      instantApproval: 'Миттєве схвалення.',
      noSellingRequired: 'Без продажу активів.',
      drawCreditNow: 'Отримати кредит',
      availableToWithdraw: 'Доступно до виведення',
      onChainVerified: 'Підтверджено on-chain',
      withdraw: 'Вивести',
      deposit: 'Поповнити',
      thisMonth: 'цього місяця',
    },
    features: {
      title: 'Інституційна стратегія.',
      highlight: 'Виконання у Web3.',
      description: 'Ми поєднуємо традиційні фінанси та децентралізовані протоколи, створюючи цілісну екосистему для приватного й корпоративного капіталу.',
      readWhitepaper: 'Читати Whitepaper',
      secureGateway: 'Захищений шлюз',
      frictionlessExchange: 'Плавний обмін',
      exchangeDescription: 'Обмінюйте активи прямо з дашборду з інституційною ліквідністю. Розумний маршрутизатор знаходить найкращі курси між CEX і DEX.',
      checklist: [
        'Нульове прослизання на основних парах',
        'Миттєве зарахування через стейблкоїни',
        'Протоколи безпеки банківського рівня',
      ],
      swap: 'Обмін',
      youPay: 'Ви сплачуєте',
      balance: 'Баланс',
      youReceive: 'Ви отримуєте',
      confirmExchange: 'Підтвердити обмін',
      cards: [
        {
          title: 'Прозорість блокчейну',
          description: 'Аудит усіх операцій фонду в реальному часі. Відстежуйте активи до конкретної транзакції.',
        },
        {
          title: 'Гібридне управління активами',
          description: 'Поєднуйте TradFi-портфелі з DeFi-стратегіями прибутковості та токенізованими інвестиціями.',
        },
        {
          title: 'Крипто-фіатний обмін',
          description: 'Інтегровані шлюзи входу та виходу для зручних депозитів і швидких міжнародних переказів.',
        },
      ],
    },
    analytics: {
      badge: 'Показники в реальному часі',
      title: 'Зростання на основі даних.',
      description: 'Відстежуйте динаміку активів з високою точністю. Наші алгоритми допомагають досягати максимальної ефективності у різних напрямах.',
      indexName: 'Композитний індекс AV8Capital',
      points: 'пт',
      ytd: '+212.5% з початку року',
      insightsTitle: 'Фінансовий аналіз та інсайти',
      articlesTitle: 'Статті',
      articlesSubtitle: 'Переглядайте останні публікації та відкривайте повний текст статті прямо на сторінці.',
      articleList: 'Список статей',
      articleView: 'Перегляд статті',
      loading: 'Завантаження статей...',
      empty: 'Для цього проєкту статті не знайдено.',
      openArticle: 'Відкрити статтю',
      noContent: 'Вміст статті поки недоступний.',
      articleDescription: 'Ключові висновки від нашої аналітичної команди щодо навігації в гібридному ринку.',
      readMin: 'хв читання',
      chartMonths: ['Січ', 'Лют', 'Бер', 'Кві', 'Тра', 'Чер', 'Лип', 'Сер', 'Вер', 'Жов', 'Лис', 'Гру'],
      articles: [
        { tag: 'Макро', title: 'Вплив глобальних ставок на дохідність DeFi', time: 5 },
        { tag: 'Стратегія', title: 'Баланс акцій і крипто для нижчої волатильності', time: 8 },
        { tag: 'On-Chain', title: 'Звіт прозорості за Q3: аудит смартконтрактів', time: 12 },
      ],
    },
    blog: {
      pageTitle: 'Статті',
      heroBadge: 'Публікації',
      titleAccent: 'Блог',
      subtitle: 'Останні публікації, ринкові нотатки та оновлення проєкту.',
      searchPlaceholder: 'Пошук статей...',
      filterAll: 'Усі',
      filterTop: 'Топ',
      loadMore: 'Завантажити ще',
      readMore: 'Читати',
      openLabel: 'Відкрити статтю',
      viewsLabel: 'Переглядів: {count}',
      emptyTitle: 'Статті не знайдено',
      emptyHint: 'Спробуйте змінити пошук або фільтр.',
      error: 'Не вдалося завантажити блог.',
      noDate: 'Без дати',
    },
    whitepaper: {
      pageTitle: 'Whitepaper',
      badge: 'Огляд протоколу',
      intro: 'Цей документ описує операційну модель AV8 для інституційної ліквідності, забезпеченого кредитування, прозорого treasury-менеджменту та контрольованого виконання між фіатними й цифровими рейками.',
      sections: [
        {
          title: 'Короткий огляд',
          body: 'AV8 задуманий як гібридний капітальний шар, що дає клієнтам видимість вкладеного капіталу, доступ до кредиту під забезпечення та контрольований перехід між традиційними й цифровими ринками.',
          points: [
            'Єдина картина інвестованого капіталу, доступного кредиту та ліквідних резервів.',
            'Структурований доступ до кредитування без примусового продажу базових позицій.',
            'Контур виконання, який пріоритезує прозорість, безпеку та операційну дисципліну.',
          ],
        },
        {
          title: 'Архітектура системи',
          body: 'Платформа поєднує моніторинг портфеля, маршрутизацію та ризик-контроль в одному операторському інтерфейсі. Публічні метадані та контент доставляються через конфігурацію й API на базі Laravel.',
          points: [
            'Окремі фронтенд-поверхні для інвестування, обміну, аналітики та статей.',
            'Централізоване керування брендингом і публічним контентом проєкту.',
            'Компонована архітектура для продуктових сторінок і майбутніх інтеграцій.',
          ],
        },
        {
          title: 'Ліквідність і кредит',
          body: 'Ядро ліквідності побудоване навколо видимості застави та передбачуваного доступу до кредиту. Кредитні лінії мають підвищувати ефективність капіталу, не руйнуючи довгострокові стратегічні позиції.',
          points: [
            'Кредитування інституційного типу під відстежувані активні позиції.',
            'Доступ до кредитних ліній із прозорими лімітами та ліквідністю.',
            'Операційний акцент на швидкому погодженні та контрольованому виведенні коштів.',
          ],
        },
        {
          title: 'Ризики та governance',
          body: 'Керування ризиком реалізується через видимість, дисципліну алокацій та багатошаровий контроль операційних потоків. Governance-підхід пріоритезує аудовані рішення й конфігуровану поведінку системи.',
          points: [
            'Публічна прозорість як базовий механізм довіри.',
            'Розділення між користувацькими сценаріями та адміністративною конфігурацією.',
            'Можливість розширення політик treasury, маршрутизації активів і проєктних налаштувань.',
          ],
        },
        {
          title: 'Стратегія зростання',
          body: 'AV8 масштабується через окремі продуктові воронки: інвестування, обмін активів, аналітичний контент і брендовану публічну комунікацію. Кожна поверхня може працювати окремо, підсилюючи спільну екосистему.',
          points: [
            'Сторінка Invest для огляду капіталу та кредитних продуктів.',
            'Сторінка Swap для сценаріїв крипто-фіатного виконання.',
            'Whitepaper та статті для навчання інвесторів і керування наративом.',
          ],
        },
      ],
    },
    privacyPolicy: {
      pageTitle: 'Політика конфіденційності',
      badge: 'Приватність і дані',
      intro: 'Ця політика пояснює, які персональні дані AV8 збирає, як вони використовуються, як захищаються та які права зберігає користувач під час взаємодії з платформою.',
      sections: [
        {
          title: 'Збір інформації',
          body: 'Ми збираємо лише ті дані, які необхідні для надання сервісів, обробки запитів і підтримки безпечного доступу до функціональності платформи.',
          points: [
            'Ім’я та контактні дані, зокрема email, телефон і адреса.',
            'Платіжні дані, необхідні для надання послуг.',
            'Технічна й поведінкова інформація про відвідування сайту та активність на платформі.',
          ],
        },
        {
          title: 'Використання інформації',
          body: 'Зібрані дані використовуються для належної роботи платформи та покращення якості сервісу.',
          points: [
            'Обробка заявок, замовлень і платежів.',
            'Надання продуктів, підтримки та сервісних оновлень.',
            'Покращення сайту, користувацьких сценаріїв і операційної надійності.',
            'Надсилання новин або спеціальних пропозицій лише за наявності підписки користувача.',
          ],
        },
        {
          title: 'Зберігання та розкриття',
          body: 'Персональні дані зберігаються лише протягом строку, необхідного для бізнесових, юридичних і безпекових потреб. Дані не продаються і не передаються в оренду третім особам.',
          points: [
            'Термін зберігання обмежений потребами сервісу та комплаєнсу.',
            'Розкриття можливе лише коли це потрібно для обробки запитів або погоджено користувачем.',
            'Операційні партнери отримують тільки мінімально необхідний обсяг інформації.',
          ],
        },
        {
          title: 'Заходи безпеки',
          body: 'Ми застосовуємо технічні й організаційні засоби захисту від несанкціонованого доступу, зміни, розкриття або знищення даних.',
          points: [
            'Використання захищених каналів зв’язку.',
            'Контрольований доступ до чутливої інформації.',
            'Надійні способи зберігання та постійна безпекова дисципліна.',
          ],
        },
        {
          title: 'Зміни політики',
          body: 'Політика конфіденційності може періодично оновлюватися. Суттєві зміни публікуються на цій сторінці та, за потреби, додатково комунікуються через платформу.',
          points: [
            'Оновлені умови набирають чинності після публікації.',
            'Користувачам рекомендовано періодично переглядати політику.',
          ],
        },
      ],
    },
    termsOfService: {
      pageTitle: 'Умови користування',
      badge: 'Юридичні умови',
      intro: 'Ці умови регулюють доступ до платформи AV8, публічних матеріалів і пов’язаних фінансових або інформаційних сервісів. Використовуючи платформу, користувач погоджується діяти в межах цих правил.',
      sections: [
        {
          title: 'Сфера використання',
          body: 'Платформа та її матеріали надаються для законного доступу до інформації про продукти, інвестиційних інтерфейсів, інструментів обміну та супровідних сервісних сценаріїв.',
          points: [
            'Використання дозволене лише відповідно до чинного законодавства та регулювання.',
            'Окремі продукти або функції можуть бути недоступні в певних юрисдикціях.',
            'Доступ може бути обмежений, призупинений або залежати від додаткових перевірок.',
          ],
        },
        {
          title: 'Обов’язки користувача',
          body: 'Користувач відповідає за точність наданої інформації та за безпеку своїх облікових даних, гаманців і каналів доступу, які використовуються разом із платформою.',
          points: [
            'Інформація, надана AV8, має бути повною, актуальною та правдивою.',
            'Заборонено втручатися в роботу платформи або намагатися отримати несанкціонований доступ.',
            'Будь-яка активність через акаунт або гаманець користувача вважається ініційованою самим користувачем.',
          ],
        },
        {
          title: 'Розкриття ризиків',
          body: 'Фінансова діяльність, операції з цифровими активами та транскордонні розрахунки пов’язані з ринковими, ліквідними, операційними, правовими та технологічними ризиками. Користувач повинен самостійно оцінювати ці ризики.',
          points: [
            'Попередні результати чи публічна аналітика не гарантують майбутньої дохідності.',
            'Вартість активів, умови маршрутизації та доступність виконання можуть змінюватися без попередження.',
            'Користувач самостійно несе податкові, регуляторні та юридичні зобов’язання у своїй юрисдикції.',
          ],
        },
        {
          title: 'Інтелектуальна власність',
          body: 'Увесь брендинг, інтерфейсні матеріали, документи та опублікований контент платформи належать AV8 або його ліцензіарам, якщо інше прямо не зазначено.',
          points: [
            'Матеріали не можна копіювати, поширювати чи змінювати без дозволу.',
            'Брендинг і контент проєкту можна використовувати лише для правомірного посилання на платформу.',
            'Несанкціоноване комерційне використання активів платформи заборонене.',
          ],
        },
        {
          title: 'Зміни сервісу та припинення доступу',
          body: 'AV8 може оновлювати, обмежувати або припиняти окремі частини платформи з огляду на розвиток продукту, вимоги комплаєнсу, безпекові події або операційні рішення.',
          points: [
            'Умови можуть оновлюватися і набирають чинності після публікації на сайті.',
            'Подальше використання після публікації означає прийняття оновлених умов.',
            'AV8 може призупинити доступ у разі зловживань, комплаєнс-ризиків або безпекових інцидентів.',
          ],
        },
      ],
    },
    kycAml: {
      pageTitle: 'KYC / AML',
      badge: 'Комплаєнс',
      intro: 'AV8 застосовує процедури Know Your Customer та Anti-Money Laundering для захисту платформи, підтримки комплаєнсу й прозорого доступу до фінансових сервісів.',
      sections: [
        {
          title: 'Верифікація особи',
          body: 'Користувачів можуть попросити підтвердити особу перед доступом до регульованого функціоналу, фінансових продуктів або підвищених лімітів.',
          points: [
            'Верифікація може включати персональні дані, контакти та підтвердні документи.',
            'Для активності з підвищеним ризиком або обсягом може знадобитися додаткова перевірка.',
            'Частина функцій може залишатися обмеженою до завершення верифікації.',
          ],
        },
        {
          title: 'Оцінка ризику',
          body: 'Кожен акаунт і транзакційний сценарій може оцінюватися за ризик-орієнтованою моделлю для виявлення нетипової поведінки та застосування внутрішніх контролів.',
          points: [
            'Моніторинг може враховувати географію, розмір транзакцій, поведінкові аномалії та ознаки джерела коштів.',
            'За потреби може застосовуватися поглиблена перевірка.',
            'Платформа може призупинити або обмежити активність на час комплаєнс-перевірок.',
          ],
        },
        {
          title: 'AML-моніторинг',
          body: 'AV8 підтримує процедури для виявлення, запобігання та реагування на потенційне відмивання коштів, санкційні ризики чи іншу незаконну фінансову активність.',
          points: [
            'Транзакції можуть перевірятися на підозрілі патерни або заборонених контрагентів.',
            'Активність може передаватися на ручну перевірку, якщо автоматичні контроли фіксують ризик.',
            'Записи можуть зберігатися відповідно до регуляторних, юридичних та операційних вимог.',
          ],
        },
        {
          title: 'Обов’язки користувача',
          body: 'Користувач зобов’язаний надавати точну інформацію та використовувати платформу лише для законних цілей відповідно до чинного регулювання.',
          points: [
            'Подана інформація має бути актуальною, повною та правдивою.',
            'Заборонено використовувати чужі дані, підроблені документи чи приховувати бенефіціарну власність.',
            'Відмова від проходження перевірок може призвести до обмеження доступу або блокування акаунта.',
          ],
        },
        {
          title: 'Оновлення політики',
          body: 'Вимоги KYC / AML можуть змінюватися в міру оновлення внутрішньої політики AV8 або у відповідь на правові та регуляторні зміни.',
          points: [
            'Оновлені вимоги набирають чинності після публікації.',
            'З часом користувачам може знадобитися повторна верифікація.',
          ],
        },
      ],
    },
    article: {
      pageTitle: 'Стаття',
      heroBadge: 'Стаття',
      back: 'Назад до блогу',
      share: 'Поділитися',
      related: 'Схожі статті',
      news: 'Новина',
      noDate: 'Без дати',
      invalid: 'Некоректний ідентифікатор статті.',
      error: 'Не вдалося завантажити статтю.',
      emptyBody: 'Вміст статті поки недоступний.',
    },
    invest: {
      pageTitle: 'Фонд',
      pageHeroSubtitle: 'Телеметрія фонду в Sui, контекст NAV і елементи кокпіту на одному маршруті.',
      heroBadge: 'Ончейн-фонд',
      cockpitBadge: 'Кокпіт',
      cockpitTitle: 'Фонд',
      cockpitSubtitle:
        'Тут зібрані основні дані про рух капіталу та зрозумілі пояснення від ШІ щодо операцій і перерозподілів, які вже відбулися.',
      fundCoreLabel: 'Ядро фонду',
      av8ObjectTitle: "Об'єкт AV8",
      navPrefix: 'NAV',
      av8Abbrev: 'AV8',
      fundWord: 'Фонд',
      assetCryptoLabel: 'Крипто blue-chip',
      assetRwaLabel: 'Реальні активи (RWA)',
      assetYieldLabel: 'Дохідні сховища',
      awaitingAssets: 'Очікування активів',
      reserveLayer: 'Резервний шар',
      aiLogTitle: 'Журнал польоту AI',
      aiLogSubtitle: 'Останні системні маневри',
      trustLayerBadge: 'рівень довіри',
      digestPending: 'Дайджест очікується',
      digestPrefix: 'Дайджест',
      aiPilotTrace: 'Трасування AI-пілота',
      basketIdLabel: 'ID кошика',
      packageIdLabel: 'ID пакета',
      notConfigured: 'не налаштовано',
      rpcNoticePrefix: 'Повідомлення RPC',
      refreshingSui: 'Оновлення даних Sui…',
      aiStatusVerified: 'Підтверджено',
      aiStatusPending: 'В очікуванні',
      aiStatusFailed: 'Помилка',
      depositSectionKicker: 'Інвестиції',
      depositSectionTitle: 'Оберіть актив з гаманця та отримайте AV8',
      depositBadgeReady: 'Готово',
      depositBadgeConfigured: 'Налаштовано',
      depositBadgeWalletAsset: 'Актив гаманця',
      depositTokenInWalletLabel: 'Токен у активному гаманці',
      depositAssetFromWalletLabel: 'Актив із активного гаманця',
      depositTokenWhitelisted: 'у whitelist фонду',
      depositTokenNotWhitelisted: 'не у whitelist фонду',
      depositAvailablePrefix: 'Доступно',
      depositAmountLabel: 'Сума',
      depositAmountFieldLabel: 'Сума депозиту',
      depositWalletBalanceLabel: 'Баланс гаманця',
      depositLoading: 'Завантаження…',
      depositExpectedIssueLabel: 'Очікуваний випуск',
      depositPathLabel: 'Шлях депозиту',
      depositPathSui: 'депозит SUI',
      depositPathOracle: 'потрібна оракул-котирування',
      depositNoticeWhitelistedLead:
        '{symbol} у whitelist фонду, але прямі клієнтські депозити потребують ',
      depositNoticeNotWhitelistedLead:
        '{symbol} є в активному гаманці, але ще не у whitelist фонду. Спочатку додайте в whitelist, потім ',
      depositNoticeTrail: ' та оцінку Oracle, перш ніж можна буде підписати транзакцію.',
      depositSigning: 'Підпис…',
      depositButton: 'Депозит {symbol}',
      depositConnectedWallet: 'Підключений гаманець',
      depositWalletAsideBlurb:
        'Випуск AV8 показується перед підписом. Поточний робочий шлях вносить SUI в портфель; повне атомарне карбування AV8 потребує підключення TreasuryCap fund_share до потоку депозиту портфеля.',
      depositAvailableTokenCard: 'Доступно {symbol}',
      depositWalletDetectionHint: 'Виявлено в активному гаманці Sui або сесії zkLogin',
      depositAv8ShareCard: 'У вас',
      depositAv8WithdrawHint: 'Готово для виведення',
      depositAvailableInWalletPrefix: 'Доступно в гаманці:',
      redeemAv8ShareLabel: 'Повернення частки AV8',
      depositPtbRouteLabel: 'Маршрут PTB:',
      depositRouteBlockedWhitelisted:
        '{symbol}: потрібні portfolio.deposit_asset<T> та оцінка Oracle перед підписом депозиту.',
      depositRouteBlockedNotWhitelisted:
        '{symbol} у гаманці, але не у whitelist для депозитів фонду.',
    },
    portfolio: {
      pageTitle: 'Портфель',
      breadcrumbCurrent: 'Портфель',
      networkSelectorLabel: 'Мережа',
      networkSelectorHint: 'Оберіть мережевий контекст для цього перегляду портфеля.',
      badge: 'Horizon Line',
      title: 'Кабіна інвестора для',
      titleHighlight: 'контролю капіталу в Sui',
      titleSecondary: 'Траєкторія портфеля',
      subtitle: 'Траєкторія NAV, річний темп зростання, резерв ліквідності та здоров’я портфеля в окремому режимі портфеля.',
      ownerAccess: 'Доступ власника',
      notConnected: 'Не підключено',
      walletModes: 'Sui Wallet / zkLogin',
      awaitingAuth: 'очікує авторизації',
      connectWallet: 'Підключити гаманець',
      walletNote: 'Гаманець і zkLogin знаходяться за спільною панеллю власника. Виконання PTB залишається прив’язаним до поточних Sui object IDs і оновиться безболісно після підключення OIDC flow.',
      privateBankingEntry: 'Вхід private banking',
      commandRoutesDescription: 'Доступ до гаманця, передача через zkLogin і маршрути команд портфеля мають бути зібрані в одній преміальній панелі.',
      fuelLevel: 'Доступно',
      fuelDescriptionInline: 'USDC, що утримується для викупів і маневрів у межах цього ж портфельного маршруту.',
      sectionTitle: 'Траєкторія портфеля',
      sectionBadgeScenario: 'сценарний оверлей',
      sectionBadgeLive: 'живий стан кошика',
      health: 'Стан портфеля',
      maxDrift: 'Максимальне відхилення від цілі',
      altitude: 'Динаміка',
      annualizedClimb: 'Річний темп із поточного місячного підйому',
      fuelHeld: 'Доступно',
      fuelHeldDescription: 'USDC для викупів і маневрів',
      manifestTitle: 'The Manifest',
      manifestSubtitle: 'Основні категорії активів та частки в портфелі',
      sleeves: 'сегментів',
      category: 'Категорія',
      asset: 'Актив',
      share: 'Частка',
      role: 'Роль',
      healthStatus: {
        stable: 'Стабільно',
        monitoring: 'Під наглядом',
        rebalancing: 'Ребалансування',
      },
      manifest: {
        liquidYield: 'Ліквідна дохідність',
        liquidYieldRole: 'Генерація готівки та резерв для маневру',
        cryptoBase: 'Крипто-база',
        cryptoBaseRole: 'Технологічний апсайд і мережевий експозер',
        fixedIncome: 'Фіксований дохід',
        fixedIncomeRole: 'Фундамент і стабільність балансу',
        equity: 'Акції',
        equityRole: 'Сегмент глобального зростання',
      },
      defiTitle: 'Поточні позиції в DeFi',
      defiConnectWallet: 'Підключіть гаманець, щоб завантажити актуальні позиції з Zerion.',
      defiSuiUnavailable: 'Для активного SUI-гаманця позиції в Zerion-стилі тут недоступні.',
      defiActiveWallet: 'Активний гаманець',
      defiSuiOnChainDisclaimer: 'Нижче — баланси безпосередньо з Sui. Агреговані позиції протоколів (як у Zerion) для цієї мережі в цьому перегляді ще не підключені.',
      defiSuiNeedWallet: 'Оберіть прив’язаний Sui-гаманець у кабіні, щоб завантажити on-chain утримання.',
      defiSuiOtherTabHint: 'Активний гаманець — адреса Sui. Перемкніть мережу портфеля на SUI для on-chain балансів або оберіть Ethereum / Solana для цієї стрічки DeFi.',
      defiSuiOnChainEmpty: 'Для цієї адреси в Sui монет не знайдено.',
      defiSuiCetusTitle: 'Своп у Sui (Cetus)',
      defiSuiCetusBlurb: 'Котирування та обмін йдуть через агрегатор Cetus у вашій обраній мережі Sui (той самий рушій, що на окремій сторінці свопу).',
      defiSuiCetusOpenApp: 'Відкрити Cetus',
      cockpitWalletTokensTitle: 'Токени гаманця',
      cockpitWalletTokensListHeading: 'Токени гаманця',
      cockpitInvestHeading: 'Інвестувати',
      cockpitDeployCapital: 'Внести в депозит',
      cockpitRecallLiquidity: 'Забрати з депозиту',
      cockpitSubmittingPtb: 'Надсилання PTB…',
    },
    swap: {
      back: 'Назад на головну',
      subtitle: 'Обмін на EVM через 1inch або на Sui через Cetus — кожну угоду підтверджуєте у гаманці.',
      openPage: 'Відкрити сторінку обміну',
      pageTitle: 'Обмін',
      heroBadge: 'Виконання',
    },
    mint: {
      pageTitle: 'Мінт RWA',
      heroBadge: 'Токенізація',
      subtitle: 'Кокпіт мінтингу в стилі Cyber-Elegance: клас активу, метадані та ініціалізація в Sui.',
      step1Label: 'Клас активу',
      step2Label: 'Поля даних',
      step3Label: 'Блокчейн-ініціалізація',
      assetVehicle: 'Автомобіль',
      assetBusiness: 'Бізнес',
      assetUniversal: 'Універсальний актив',
      makeModel: 'Марка й модель',
      vin: 'VIN',
      year: 'Рік',
      mileage: 'Пробіг (км)',
      docsLabel: 'Техпаспорт і акт',
      docsDrop: 'Перетягніть PDF (техпаспорт, акт огляду). Файли хешуються для пакунка Walrus/IPFS.',
      estimatedUsd: 'Оціночна вартість (USD)',
      companyName: 'Назва компанії / точки',
      regNumber: 'Реєстраційний номер (ЄДРПОУ / ІПН / AutoAgent)',
      businessType: 'Тип бізнесу',
      bizService: 'Сервіс',
      bizShop: 'Магазин',
      bizRent: 'Оренда',
      revenueMonthly: 'Сер. місячна виручка (USD)',
      legalAddress: 'Юридична адреса або посилання на Google Maps',
      universalTitle: 'Назва активу',
      coverLabel: 'Обкладинка (cover)',
      coverHint: 'Мініатюра в гаманці та на маркетплейсі',
      descriptionLabel: 'Опис',
      descriptionPlaceholder: 'Маркетинговий опис об’єкта, грошові потоки чи стан авто.',
      blockchainSection: 'Підпис гаманцем Sui',
      blockchainHint: 'Після завантаження медіа викликається Move-транзакція (у т. ч. zkLogin).',
      connectWalletHint: 'Підключіть гаманець Sui для відправки мінт-транзакції.',
      cta: 'Ініціалізувати оцифровку RWA',
      ctaLoading: 'Ініціалізація…',
      packageMissing: 'Задайте VITE_SUI_PACKAGE_ID для on-chain мінту. Метадані все одно збираються off-chain.',
      phaseEncrypt: 'Шифрування фізичних даних…',
      phaseWalrus: 'Завантаження в Walrus / IPFS…',
      phaseMove: 'Генерація Move-об’єкта…',
      success: 'Актив оцифровано',
      digestLabel: 'Digest транзакції',
      openExplorer: 'Відкрити в експлорері',
      metadataNote: 'JSON метаданих готовий для оракулів (USD, ідентифікатори, CID документів).',
      errorPrefix: 'Помилка мінтингу',
      validationRequired: 'Заповніть усі обов’язкові поля та додайте документи за потреби.',
      nonVehicleNote: 'Для бізнесу / універсального класу потрібні відповідні entry points у Move. CID метаданих вже готовий.',
      governanceTitle: 'Управління та безпека',
      governanceBlurb:
        'Створіть новий AdminCap для іншої адреси — зазвичай мультисиг-сховища Sui — щоб привілейовані дії вимагали кількох підписів, а не одного zkLogin.',
      newAdminAddressLabel: 'Введіть адресу нового адміністратора або мультисиг-сховища',
      authorizeNewAdmin: 'Авторизувати нового адміна',
      authorizeNewAdminBusy: 'Авторизація…',
      adminCapMissing: 'Задайте VITE_SUI_ADMIN_CAP_ID (об’єкт AdminCap у вашому гаманці) і переконайтеся, що VITE_SUI_PACKAGE_ID відповідає rwa_core.',
      invalidAdminAddress: 'Вкажіть коректну 32-байтову адресу Sui (0x + 64 hex-символи).',
      adminAuthorized: 'Нового адміна авторизовано; AdminCap передано в мережі.',
      governanceWalletHint: 'Підключіть гаманець, який зараз тримає AdminCap із VITE_SUI_ADMIN_CAP_ID.',
      deployRunbookTitle: 'Пам’ятка деплою контракту',
      deployRunbookBlurb:
        'Використовуйте цей список після змін у Move-контракті. Мінтинг не запускає deploy-скрипти; він викликає вже налаштований package.',
      deployRunbookWarning:
        'Не відкривайте запуск деплою напряму в браузері. Запускайте його із сервера, термінала або CI з явним підтвердженням.',
      deployRunbookChecklist: [
        'Змініть Move sources і перевірте сигнатури entry points.',
        'Зберіть і задеплойте RWA package з workspace проєкту.',
        'Скопіюйте нові package та AdminCap object ID з результату деплою.',
        'Оновіть .env.local і .env.production, потім перезапустіть Vite або перезберіть production.',
        'Перевірте мінтинг гаманцем, який володіє активним AdminCap.',
      ],
      deployRunbookCommandsLabel: 'Ручні команди',
      deployRunbookCommands: ['npm run sui:build:rwa', 'npm run sui:deploy:rwa'],
      deployRunbookEnvLabel: 'Оновіть ці значення після деплою',
      deployRunbookEnvVars: ['VITE_SUI_RWA_PACKAGE_ID', 'VITE_SUI_RWA_ADMIN_CAP_ID', 'VITE_SUI_UTILITY_PACKAGE_ID', 'VITE_SUI_UTILITY_TREASURY_CAP_ID'],
      utilityTab: 'Utility Token',
      utilityTitle: 'AV8 Utility Token',
      utilityBlurb:
        'Підключіть будь-який існуючий Sui coin type і його TreasuryCap, потім мінтіть або спалюйте через generic token admin entry points.',
      utilityConstants: 'Константи токена',
      utilityCreationNote:
        'Новий coin type усе одно потребує publish Move-модуля. Використовуйте ці поля як специфікацію токена, задеплойте package, потім вставте coin type і TreasuryCap сюди.',
      utilityTokenName: 'Назва токена',
      utilityTokenSymbol: 'Символ',
      utilityTokenDecimals: 'Decimals',
      utilityTokenLogo: 'Лого токена',
      utilityChooseLogo: 'Обрати лого',
      utilityUploadLogo: 'Завантажити лого',
      utilityLogoBusy: 'Завантаження…',
      utilityLogoReady: 'Лого завантажено. Використайте цей icon URL у Move-модулі токена перед publish.',
      utilityLogoHint: 'Опційно. Якщо publish нового coin type відбувається з цим URL, Sui CoinMetadata покаже лого; залиште порожнім для токена без лого.',
      utilityCoinType: 'Coin type',
      utilityTreasuryCap: 'TreasuryCap object ID',
      utilityRecipient: 'Адреса отримувача',
      utilityAmount: 'Кількість (AV8U)',
      utilityCoinObject: 'Coin object ID для спалювання',
      utilityMint: 'Мінтити utility токени',
      utilityBurn: 'Спалити coin object',
      utilityBusy: 'Відправка…',
      utilityConfigMissing: 'Задайте VITE_SUI_UTILITY_PACKAGE_ID і VITE_SUI_UTILITY_TREASURY_CAP_ID після деплою av8_rwa.',
      utilitySuccess: 'Utility token транзакцію відправлено.',
    },
    transparency: {
      title: '100% верифікація.',
      subtitle: 'Без компромісів.',
      intro: 'Кожна транзакція, кожен актив і кожна взаємодія з протоколами перевіряються on-chain. Довіра будується на прозорості.',
      tvl: 'Загальний обсяг заблокованої вартості (TVL)',
      currentHoldings: 'Поточні активи',
      portfolioShare: 'портфеля',
      auditsTitle: 'Аудит смартконтрактів',
      auditsDescription: 'Перевірено провідними security-командами з безперервними bug bounty програмами.',
      auditsStatus: 'CertiK Verified',
      endpointTitle: 'Підключено endpoint проєкту',
      endpointDescription: 'Лендінг читає публічні метадані з Laravel API для Settings - Projects з fid=12.',
      endpointStatus: 'API /api/projects/12',
      openProjectSite: 'Відкрити сайт проєкту',
      aboutFallback: 'Опис проєкту доступний у налаштуваннях Laravel.',
      contact: 'Контакт',
      liveDataLoading: 'Завантаження актуальних даних портфеля...',
      liveDataUnavailable: 'Актуальні дані портфеля зараз недоступні.',
      tokenLabel: 'Токен',
      defiLabel: 'DeFi',
      holdings: [
        { name: 'USDC (Ethereum)', amount: '$150M', share: '36.3%' },
        { name: 'Wrapped BTC', amount: '$120M', share: '29.1%' },
        { name: 'Lido Staked ETH', amount: '$90M', share: '21.8%' },
        { name: 'Токенізовані US Treasuries', amount: '$52.5M', share: '12.8%' },
      ],
    },
    footer: {
      platform: 'Платформа',
      swap: 'Обмін',
      portfolio: 'Портфель',
      articles: 'Статті',
      fund: 'Фонд',
      whitepaper: 'Whitepaper',
      trade: 'Торгівля',
      analytics: 'Аналітика',
      ltvLoans: 'LTV кредити',
      rwaMint: 'Мінт RWA',
      adminPanel: 'Адмінпанель',
      legal: 'Правова інформація',
      privacyPolicy: 'Політика конфіденційності',
      termsOfService: 'Умови користування',
      audits: 'Аудити',
      kycAml: 'KYC / AML',
      rightsReserved: 'Усі права захищено.',
      operatedByFallback: 'Керується командою проєкту.',
      socialLabels: {
        twitter: 'Twitter',
        telegram: 'Telegram',
        website: 'Сайт',
      },
    },
    tokenAdmin: tokenAdminUa,
    fundBasket: fundBasketUa,
    fundAccounts: fundAccountsUa,
  },
  ru: {
    breadcrumbs: {
      home: 'Главная',
    },
    app: {
      sectionUnavailable: 'Секция недоступна',
      runtimeError: 'Во время рендеринга этой секции произошла ошибка. Остальная часть страницы остаётся доступной.',
      sections: {
        hero: 'Hero',
        analytics: 'Аналитика',
        navigationDeck: 'Навигационная панель',
      },
    },
    aboutPage: {
      heroBadge: 'Манифест',
      heroSubtitle:
        'Протокольный капитал, цифровое наследие и прозрачное управление — повествование AV8 в сети Sui.',
    },
    meta: {
      titleSuffix: 'Инвестиционная платформа',
    },
    project: {
      description: 'Это проект, который позволяет добывать HOT токены, используя кошелек NEAR прямо в Telegram.',
    },
    navbar: {
      platform: 'Платформа',
      swap: 'Обмен',
      fund: 'Фонд',
      analytics: 'Аналитика',
      articles: 'Статьи',
      transparency: 'Прозрачность',
      about: 'О проекте',
      aboutProject: 'О проекте',
      openWebsite: 'Открыть сайт',
      language: 'Язык',
      connectGoogle: 'Google',
      connectWalletShort: 'Кошелёк',
      tokens: 'Токены',
      networkScopeHint: 'Сеть',
      networkLockedHint: 'Чтобы сменить сеть, отключите кошелёк.',
      walletsForNetworkHint: 'Кошельки для этой сети',
      chainNames: {
        eth: 'Ethereum',
        arbitrum: 'Arbitrum',
        base: 'Base',
        polygon: 'Polygon',
        bnb: 'BNB Smart Chain',
        solana: 'Solana',
        sui: 'Sui',
      },
    },
    hero: {
      badge: 'Проект FID 12',
      highlight: 'Майнинг токенов, NEAR Wallet, Telegram.',
      title: 'Кабина инвестора для контроля капитала',
      assetsHeading: 'Активы',
      visitWebsite: 'Перейти на сайт',
      openTelegram: 'Открыть Telegram',
      twitterLabel: 'X / Twitter',
      projectContact: 'Контакт проекта',
      contactFallback: 'Контакт доступен по запросу',
      live: 'Активен',
      projectId: 'ID проекта',
      website: 'Сайт',
      socialChannels: 'Соцсети',
      websiteConfigured: 'Настроен',
      websiteMissing: 'Не задан',
      socialConnected: 'Подключены',
      socialPending: 'Ожидаются',
      backendSource: 'Источник данных',
      laravelSettings: 'Laravel Settings',
      backendDescription: 'Брендинг и контактные данные загружаются из Settings - Projects через публичный endpoint для fid=12.',
      ownerAccess: 'Доступ владельца',
      privateBankingEntry: 'Вход private banking',
      totalValue: 'Общая сумма',
      connectWallet: 'Подключите кошелек',
      portfolioLabel: 'Портфель',
      assetsAvailableAfterConnect: 'Состояние активов доступно только после подключения кошелька.',
      connectedSessionNoAddress: 'Подключенная сессия не содержит адрес кошелька.',
      noActiveWalletSession: 'Нет активной wallet session',
      suiAssetsHidden: 'Для SUI-кошельков активы на этой панели не выводятся',
      lastSync: 'Последняя синхронизация',
      syncPending: 'Синхронизация еще не выполнена',
      refresh: 'Обновить',
      settings: 'Настройка',
      userWallets: 'Кошельки пользователя',
      availableWallet: 'Доступный кошелек',
      removeLinkedWallet: 'Отвязать кошелёк от аккаунта',
      connectWalletCta: 'Подключить кошелёк',
      linkCurrentSuiWallet: 'Сохранить подключённый кошелёк в аккаунте',
      suiConnectNotInProfileHint:
        'Активный адрес в расширении ещё не записан в базе. Подтвердите подпись, чтобы сохранить привязку на сервере.',
      suiGoogleWalletsFilteredHint: 'В сети Sui отображаются только привязанные Sui-адреса.',
      solanaLinkedWalletsFilteredHint: 'В сети Solana отображаются только привязанные Solana-адреса.',
      evmLinkedWalletsFilteredHint: 'В этой сети отображаются только адреса, привязанные к выбранной сети.',
      connectZkLogin: 'Подключить ZK Login',
      zkLoginWriteHint: 'ZK Login создаёт Sui-адрес из вашего Google-аккаунта. Подписывать транзакции можно только с этого адреса.',
      activeSuiNotice: 'Для выбранного SUI-кошелька активы не отображаются. Переключитесь на другой привязанный кошелек.',
      settingsTitle: 'Настройка активов',
      settingsDescription: 'Выберите токены для вывода на первом экране и при необходимости задайте комиссию в процентах.',
      settingsLoading: 'Загрузка настроек...',
      settingsEmpty: 'Нет токенов для настройки.',
      selected: 'Выбрано',
      tokens: 'токенов',
      price: 'Цена',
      notAvailable: 'н/д',
      commission: 'Комиссия %',
      close: 'Закрыть',
      save: 'Сохранить',
      saving: 'Сохранение...',
      resolveWalletOwnerError: 'Не удалось определить владельца кошелька.',
      loadAssetsError: 'Не удалось загрузить активы из laravel-api.',
      loadSettingsError: 'Не удалось загрузить настройки токенов.',
      saveSettingsError: 'Не удалось сохранить настройки токенов.',
      noConnectedAddress: 'Адрес подключенного кошелька недоступен.',
      suiSettingsUnavailable: 'Настройки активов недоступны для SUI-кошельков.',
      settingsSaved: 'Настройки сохранены.',
      userPrefix: 'Пользователь',
      selectedWalletLabel: 'Выбранный кошелек',
      walletLabel: 'Кошелек',
      quickReceive: 'Получить',
      quickSend: 'Отправить',
      quickSwap: 'Обмен',
      receiveTitle: 'Получение',
      receiveHint: 'Отправьте эту адресную строку, чтобы получить активы на текущий кошелек.',
      copyAddress: 'Копировать адрес',
      addressCopied: 'Скопировано',
      sendTitle: 'Отправка',
      sendRecipientLabel: 'Адрес получателя',
      sendAmountLabel: 'Сумма (нативная монета)',
      sendSubmit: 'Отправить транзакцию',
      sendNativeHint: 'Отправляет нативную монету сети, в которой сейчас кошелек (например ETH в Ethereum). Подтвердите в кошельке.',
      sendSuiWalletRequired: 'Подключите Sui-кошелёк (кнопка выше или «Подписать!» откроет окно подключения), затем отправьте.',
      sendSuiWalletConnectOpened: 'Открыто окно подключения — выберите Sui-кошелёк в списке, затем снова нажмите «Подписать!».',
      sendSuiExtensionWalletMismatch: 'Адрес кошелька в браузере не совпадает с выбранным привязанным кошельком. Выберите нужный чип или подключите правильный кошелёк.',
      sendEvmWalletRequired: 'Подключите MetaMask, Rabby или встроенный EVM-кошелек для отправки.',
      sendInvalidRecipient: 'Введите корректный адрес получателя.',
      sendInvalidAmount: 'Введите корректную сумму.',
      sendSuccess: 'Транзакция отправлена. Статус смотрите в кошельке или эксплорере.',
      sendSuiNativeHint: 'Перевод SUI из подключенного Sui-кошелька через split газовой монеты. Подтвердите в кошельке.',
      sendSignButton: 'Подписать!',
      sendSignHintExtension: 'Нажмите «Подписать!», чтобы открыть Sui-кошелёк и подтвердить перевод.',
      sendSignHintZkLogin: 'Нажмите «Подписать!», чтобы отправить через zkLogin и Google (без расширения). Если не получится — войдите через Google снова.',
      sendZkLoginNeedSessionHint: 'Подключите Sui-кошелёк или завершите Google zkLogin для этого адреса (кнопка zkLogin в портфеле), затем нажмите «Подписать!».',
      sendZkLoginSignInFirst: 'Войдите через Google в открывшемся окне, затем снова нажмите «Подписать!», чтобы отправить SUI.',
      suiHeroNetworkCaption: 'Сеть',
      suiHeroNetworkHeadline: 'Сеть SUI',
      suiAvailableUsdc: 'Доступно USDC',
      suiGasLabel: 'Газ',
      suiConnectWalletBalances: 'Подключите кошелёк Sui, чтобы увидеть балансы.',
      suiHeroNavLabel: 'Активы фонда',
      suiHeroNavNote: 'Стоимость корзины фонда (в блокчейне)',
      suiHeroAv8ShareLabel: 'Доступная доля AV8',
      suiHeroAv8ShareNote: 'Всего выпущено долей AV8',
      cardLabels: {
        assets: 'Активы',
        status: 'Статус',
        source: 'Источник',
      },
      suiCard: {
        wallet: 'SUI wallet',
        hidden: 'Скрыто',
        source: 'Laravel lookup',
        assetsNote: 'Для SUI активы не выводятся',
        statusNote: 'Выберите другой привязанный кошелек',
        sourceNote: 'Просмотр доступен только для не-SUI кошельков',
      },
      suiOnChainCoinsEmpty: 'Нет монет в блокчейне',
      suiOnChainCoinsSuffix: 'типов монет в блокчейне',
      emptyCard: {
        waiting: 'Ожидание',
        loading: 'Загрузка...',
        noData: 'Нет данных',
        connectWallet: 'Подключите кошелек',
        hiddenState: 'Состояние активов скрыто',
        walletSessionRequired: 'Wallet session required',
        source: 'laravel-api / wallet tokens',
        pendingSync: 'Ожидается синхронизация',
        configureWallet: 'Настройте кошелек в API',
        heroPortfolioUnsupportedNetwork: 'Карточки портфеля здесь доступны для Ethereum, Solana или Sui. Выберите сеть переключателем выше.',
      },
    },
    dashboard: {
      title: 'Ликвидность институционального уровня',
      description: 'Полный контроль над активами. Отслеживайте инвестированный капитал, доступные кредитные линии и ликвидные средства для вывода.',
      totalInvested: 'Всего инвестировано',
      availableCredit: 'Доступный кредит (80%)',
      availableCreditBadge: 'LTV КРЕДИТ',
      instantApproval: 'Мгновенное одобрение.',
      noSellingRequired: 'Без продажи активов.',
      drawCreditNow: 'Получить кредит',
      availableToWithdraw: 'Доступно к выводу',
      onChainVerified: 'Подтверждено on-chain',
      withdraw: 'Вывести',
      deposit: 'Пополнить',
      thisMonth: 'в этом месяце',
    },
    features: {
      title: 'Институциональная стратегия.',
      highlight: 'Исполнение в Web3.',
      description: 'Мы объединяем традиционные финансы и децентрализованные протоколы, создавая экосистему для частного и корпоративного капитала.',
      readWhitepaper: 'Читать Whitepaper',
      secureGateway: 'Защищенный шлюз',
      frictionlessExchange: 'Бесшовный обмен',
      exchangeDescription: 'Обменивайте активы прямо из дашборда с институциональной ликвидностью. Умный роутер находит лучшие курсы между CEX и DEX.',
      checklist: [
        'Нулевое проскальзывание на основных парах',
        'Мгновенное зачисление через стейблкоины',
        'Протоколы безопасности банковского уровня',
      ],
      swap: 'Обмен',
      youPay: 'Вы платите',
      balance: 'Баланс',
      youReceive: 'Вы получаете',
      confirmExchange: 'Подтвердить обмен',
      cards: [
        {
          title: 'Прозрачность блокчейна',
          description: 'Аудит всех операций фонда в реальном времени. Отслеживайте активы вплоть до блока транзакции.',
        },
        {
          title: 'Гибридное управление активами',
          description: 'Комбинируйте TradFi-портфели с DeFi-доходностью и токенизированными инвестициями.',
        },
        {
          title: 'Крипто-фиатный обмен',
          description: 'Интегрированные входы и выходы для удобных депозитов и быстрых международных переводов.',
        },
      ],
    },
    analytics: {
      badge: 'Показатели в реальном времени',
      title: 'Рост на основе данных.',
      description: 'Отслеживайте динамику активов с высокой точностью. Наши алгоритмы помогают добиваться максимальной эффективности по разным направлениям.',
      indexName: 'Композитный индекс AV8Capital',
      points: 'пт',
      ytd: '+212.5% YTD',
      insightsTitle: 'Финансовый анализ и инсайты',
      articlesTitle: 'Статьи',
      articlesSubtitle: 'Просматривайте последние публикации и открывайте полный текст статьи прямо на странице.',
      articleList: 'Список статей',
      articleView: 'Просмотр статьи',
      loading: 'Загрузка статей...',
      empty: 'Для этого проекта статьи не найдены.',
      openArticle: 'Открыть статью',
      noContent: 'Содержимое статьи пока недоступно.',
      articleDescription: 'Ключевые выводы от нашей аналитической команды по навигации в гибридном рыночном пространстве.',
      readMin: 'мин чтения',
      chartMonths: ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'],
      articles: [
        { tag: 'Макро', title: 'Влияние глобальных ставок на доходность DeFi', time: 5 },
        { tag: 'Стратегия', title: 'Баланс акций и крипты для снижения волатильности', time: 8 },
        { tag: 'On-Chain', title: 'Отчет по прозрачности за Q3: аудит смартконтрактов', time: 12 },
      ],
    },
    blog: {
      pageTitle: 'Статьи',
      heroBadge: 'Публикации',
      titleAccent: 'Блог',
      subtitle: 'Последние публикации, рыночные заметки и обновления проекта.',
      searchPlaceholder: 'Поиск статей...',
      filterAll: 'Все',
      filterTop: 'Топ',
      loadMore: 'Загрузить ещё',
      readMore: 'Читать',
      openLabel: 'Открыть статью',
      viewsLabel: 'Просмотров: {count}',
      emptyTitle: 'Статьи не найдены',
      emptyHint: 'Попробуйте изменить поиск или фильтр.',
      error: 'Не удалось загрузить блог.',
      noDate: 'Без даты',
    },
    whitepaper: {
      pageTitle: 'Whitepaper',
      badge: 'Обзор протокола',
      intro: 'Этот документ описывает операционную модель AV8 для институциональной ликвидности, обеспеченного кредитования, прозрачного treasury-менеджмента и контролируемого исполнения между фиатными и цифровыми рельсами.',
      sections: [
        {
          title: 'Краткий обзор',
          body: 'AV8 задуман как гибридный капитальный слой, который дает клиентам видимость размещенного капитала, доступ к кредиту под обеспечение и контролируемый переход между традиционными и цифровыми рынками.',
          points: [
            'Единая картина инвестированного капитала, доступного кредита и ликвидных резервов.',
            'Структурированный доступ к кредиту без вынужденной продажи базовых позиций.',
            'Контур исполнения, в котором приоритетны прозрачность, безопасность и операционная дисциплина.',
          ],
        },
        {
          title: 'Архитектура системы',
          body: 'Платформа объединяет мониторинг портфеля, маршрутизацию и риск-контроль в одном операторском интерфейсе. Публичные метаданные и контент доставляются через конфигурацию и API на базе Laravel.',
          points: [
            'Отдельные frontend-поверхности для инвестирования, обмена, аналитики и статей.',
            'Централизованное управление брендингом и публичным контентом проекта.',
            'Компонентная архитектура для продуктовых страниц и будущих интеграций.',
          ],
        },
        {
          title: 'Ликвидность и кредит',
          body: 'Ядро ликвидности построено вокруг видимости залога и предсказуемого доступа к кредиту. Кредитные линии должны повышать эффективность капитала, сохраняя долгосрочные стратегические позиции.',
          points: [
            'Кредитование институционального типа под отслеживаемые активные позиции.',
            'Доступ к кредитным линиям с прозрачными лимитами и ликвидностью.',
            'Операционный акцент на быстром согласовании и контролируемом выводе средств.',
          ],
        },
        {
          title: 'Риски и governance',
          body: 'Управление риском реализуется через видимость, дисциплину аллокаций и многоуровневый контроль операционных потоков. Подход к governance приоритезирует аудируемые решения и конфигурируемое поведение системы.',
          points: [
            'Публичная прозрачность как базовый механизм доверия.',
            'Разделение между пользовательскими сценариями и административной конфигурацией.',
            'Возможность расширения политик treasury, маршрутизации активов и проектных настроек.',
          ],
        },
        {
          title: 'Стратегия роста',
          body: 'AV8 масштабируется через отдельные продуктовые воронки: инвестирование, обмен активов, аналитический контент и брендированную публичную коммуникацию. Каждая поверхность может работать отдельно, усиливая общую экосистему.',
          points: [
            'Страница Invest для обзора капитала и кредитных продуктов.',
            'Страница Swap для крипто-фиатных сценариев исполнения.',
            'Whitepaper и статьи для обучения инвесторов и управления нарративом.',
          ],
        },
      ],
    },
    privacyPolicy: {
      pageTitle: 'Политика конфиденциальности',
      badge: 'Конфиденциальность',
      intro: 'Эта политика объясняет, какие персональные данные AV8 собирает, как они используются, как защищаются и какие права сохраняет пользователь при взаимодействии с платформой.',
      sections: [
        {
          title: 'Сбор информации',
          body: 'Мы собираем только те данные, которые необходимы для предоставления сервисов, обработки запросов и поддержки безопасного доступа к функциональности платформы.',
          points: [
            'Имя и контактные данные, включая email, телефон и адрес.',
            'Платежные данные, необходимые для предоставления услуг.',
            'Техническая и поведенческая информация о посещении сайта и активности на платформе.',
          ],
        },
        {
          title: 'Использование информации',
          body: 'Собранные данные используются для корректной работы платформы и повышения качества сервиса.',
          points: [
            'Обработка заявок, заказов и платежей.',
            'Предоставление продуктов, поддержки и сервисных обновлений.',
            'Улучшение сайта, пользовательских сценариев и операционной надежности.',
            'Отправка новостей или специальных предложений только при наличии подписки пользователя.',
          ],
        },
        {
          title: 'Хранение и раскрытие',
          body: 'Персональные данные хранятся только в течение срока, необходимого для бизнес-, правовых и безопасностных целей. Данные не продаются и не передаются в аренду третьим лицам.',
          points: [
            'Срок хранения ограничен потребностями сервиса и комплаенса.',
            'Раскрытие возможно только когда это требуется для обработки запросов или согласовано пользователем.',
            'Операционные партнеры получают лишь минимально необходимый объем информации.',
          ],
        },
        {
          title: 'Меры безопасности',
          body: 'Мы применяем технические и организационные меры защиты от несанкционированного доступа, изменения, раскрытия или уничтожения данных.',
          points: [
            'Использование защищенных каналов связи.',
            'Контролируемый доступ к чувствительной информации.',
            'Надежные методы хранения и постоянная дисциплина безопасности.',
          ],
        },
        {
          title: 'Изменения политики',
          body: 'Политика конфиденциальности может периодически обновляться. Существенные изменения публикуются на этой странице и при необходимости дополнительно доводятся через платформу.',
          points: [
            'Обновленные условия вступают в силу после публикации.',
            'Пользователям рекомендуется периодически просматривать политику.',
          ],
        },
      ],
    },
    termsOfService: {
      pageTitle: 'Условия использования',
      badge: 'Правовые условия',
      intro: 'Эти условия регулируют доступ к платформе AV8, публичным материалам и связанным финансовым или информационным сервисам. Используя платформу, пользователь соглашается действовать в рамках этих правил.',
      sections: [
        {
          title: 'Сфера использования',
          body: 'Платформа и её материалы предоставляются для законного доступа к информации о продуктах, инвестиционным интерфейсам, инструментам обмена и сопутствующим сервисным сценариям.',
          points: [
            'Использование допускается только в соответствии с применимым законодательством и регулированием.',
            'Некоторые продукты или функции могут быть недоступны в отдельных юрисдикциях.',
            'Доступ может быть ограничен, приостановлен или зависеть от дополнительных проверок.',
          ],
        },
        {
          title: 'Обязанности пользователя',
          body: 'Пользователь отвечает за точность предоставленной информации и за безопасность своих учетных данных, кошельков и каналов доступа, используемых вместе с платформой.',
          points: [
            'Информация, предоставленная AV8, должна быть полной, актуальной и достоверной.',
            'Запрещено вмешиваться в работу платформы или пытаться получить несанкционированный доступ.',
            'Любая активность через аккаунт или кошелек пользователя считается инициированной самим пользователем.',
          ],
        },
        {
          title: 'Раскрытие рисков',
          body: 'Финансовая деятельность, операции с цифровыми активами и трансграничные расчеты связаны с рыночными, ликвидными, операционными, правовыми и технологическими рисками. Пользователь должен самостоятельно оценивать эти риски.',
          points: [
            'Прошлые результаты или публичная аналитика не гарантируют будущую доходность.',
            'Стоимость активов, условия маршрутизации и доступность исполнения могут меняться без уведомления.',
            'Пользователь самостоятельно несет налоговые, регуляторные и юридические обязательства в своей юрисдикции.',
          ],
        },
        {
          title: 'Интеллектуальная собственность',
          body: 'Весь брендинг, интерфейсные материалы, документы и опубликованный контент платформы принадлежат AV8 или его лицензиарам, если иное прямо не указано.',
          points: [
            'Материалы нельзя копировать, распространять или изменять без разрешения.',
            'Брендинг и контент проекта можно использовать только для правомерного упоминания платформы.',
            'Несанкционированное коммерческое использование активов платформы запрещено.',
          ],
        },
        {
          title: 'Изменения сервиса и прекращение доступа',
          body: 'AV8 может обновлять, ограничивать или прекращать отдельные части платформы с учетом развития продукта, требований комплаенса, событий безопасности или операционных решений.',
          points: [
            'Условия могут обновляться и вступают в силу после публикации на сайте.',
            'Дальнейшее использование после публикации означает принятие обновленных условий.',
            'AV8 может приостановить доступ при злоупотреблениях, комплаенс-рисках или инцидентах безопасности.',
          ],
        },
      ],
    },
    kycAml: {
      pageTitle: 'KYC / AML',
      badge: 'Комплаенс',
      intro: 'AV8 применяет процедуры Know Your Customer и Anti-Money Laundering для защиты платформы, поддержки комплаенса и прозрачного доступа к финансовым сервисам.',
      sections: [
        {
          title: 'Верификация личности',
          body: 'Пользователей могут попросить подтвердить личность перед доступом к регулируемому функционалу, финансовым продуктам или повышенным лимитам.',
          points: [
            'Проверка может включать персональные данные, контакты и подтверждающие документы.',
            'Для активности с повышенным риском или объемом может потребоваться дополнительная проверка.',
            'Часть функций может оставаться ограниченной до завершения верификации.',
          ],
        },
        {
          title: 'Оценка риска',
          body: 'Каждый аккаунт и транзакционный сценарий может оцениваться по риск-ориентированной модели для выявления нетипичного поведения и применения внутренних контролей.',
          points: [
            'Мониторинг может учитывать географию, размер транзакций, поведенческие аномалии и признаки источника средств.',
            'При необходимости может применяться углубленная проверка.',
            'Платформа может приостановить или ограничить активность на время комплаенс-проверок.',
          ],
        },
        {
          title: 'AML-мониторинг',
          body: 'AV8 поддерживает процедуры для выявления, предотвращения и реагирования на потенциальное отмывание средств, санкционные риски или иную незаконную финансовую активность.',
          points: [
            'Транзакции могут проверяться на подозрительные паттерны или запрещенных контрагентов.',
            'Активность может передаваться на ручную проверку, если автоматические контроли фиксируют риск.',
            'Записи могут храниться в соответствии с регуляторными, юридическими и операционными требованиями.',
          ],
        },
        {
          title: 'Обязанности пользователя',
          body: 'Пользователь обязан предоставлять точную информацию и использовать платформу только в законных целях в соответствии с применимым регулированием.',
          points: [
            'Переданные данные должны быть актуальными, полными и достоверными.',
            'Запрещено использовать чужие данные, поддельные документы или скрывать бенефициарную собственность.',
            'Отказ от прохождения проверок может привести к ограничению доступа или блокировке аккаунта.',
          ],
        },
        {
          title: 'Обновление политики',
          body: 'Требования KYC / AML могут меняться по мере обновления внутренней политики AV8 или в ответ на правовые и регуляторные изменения.',
          points: [
            'Обновленные требования вступают в силу после публикации.',
            'Со временем пользователям может потребоваться повторная верификация.',
          ],
        },
      ],
    },
    article: {
      pageTitle: 'Статья',
      heroBadge: 'Статья',
      back: 'Назад в блог',
      share: 'Поделиться',
      related: 'Похожие статьи',
      news: 'Новость',
      noDate: 'Без даты',
      invalid: 'Некорректный идентификатор статьи.',
      error: 'Не удалось загрузить статью.',
      emptyBody: 'Содержимое статьи пока недоступно.',
    },
    invest: {
      pageTitle: 'Фонд',
      pageHeroSubtitle: 'Телеметрия фонда в Sui, контекст NAV и элементы кокпита в одном разделе.',
      heroBadge: 'Ончейн-фонд',
      cockpitBadge: 'Кокпит',
      cockpitTitle: 'Фонд',
      cockpitSubtitle:
        'Здесь собраны основные данные о движении капитала и понятные пояснения от ИИ о тех операциях и перераспределениях, которые уже произошли.',
      fundCoreLabel: 'Ядро фонда',
      av8ObjectTitle: 'Объект AV8',
      navPrefix: 'NAV',
      av8Abbrev: 'AV8',
      fundWord: 'Фонд',
      assetCryptoLabel: 'Крипто blue-chip',
      assetRwaLabel: 'Реальные активы (RWA)',
      assetYieldLabel: 'Доходные хранилища',
      awaitingAssets: 'Ожидание активов',
      reserveLayer: 'Резервный слой',
      aiLogTitle: 'Журнал полёта AI',
      aiLogSubtitle: 'Последние системные манёвры',
      trustLayerBadge: 'слой доверия',
      digestPending: 'Дайджест в ожидании',
      digestPrefix: 'Дайджест',
      aiPilotTrace: 'Трассировка AI-пилота',
      basketIdLabel: 'ID корзины',
      packageIdLabel: 'ID пакета',
      notConfigured: 'не настроено',
      rpcNoticePrefix: 'Уведомление RPC',
      refreshingSui: 'Обновление данных Sui…',
      aiStatusVerified: 'Подтверждено',
      aiStatusPending: 'В ожидании',
      aiStatusFailed: 'Сбой',
      depositSectionKicker: 'Инвестиции',
      depositSectionTitle: 'Выберите актив кошелька и получите AV8',
      depositBadgeReady: 'Готово',
      depositBadgeConfigured: 'Настроено',
      depositBadgeWalletAsset: 'Актив кошелька',
      depositTokenInWalletLabel: 'Токен в активном кошельке',
      depositAssetFromWalletLabel: 'Актив из активного кошелька',
      depositTokenWhitelisted: 'в whitelist фонда',
      depositTokenNotWhitelisted: 'не в whitelist фонда',
      depositAvailablePrefix: 'Доступно',
      depositAmountLabel: 'Сумма',
      depositAmountFieldLabel: 'Сумма депозита',
      depositWalletBalanceLabel: 'Баланс кошелька',
      depositLoading: 'Загрузка…',
      depositExpectedIssueLabel: 'Ожидаемый выпуск',
      depositPathLabel: 'Путь депозита',
      depositPathSui: 'депозит SUI',
      depositPathOracle: 'нужна котировка оракула',
      depositNoticeWhitelistedLead:
        '{symbol} в whitelist фонда, но прямые клиентские депозиты требуют ',
      depositNoticeNotWhitelistedLead:
        '{symbol} есть в активном кошельке, но пока не в whitelist фонда. Сначала добавьте в whitelist, затем ',
      depositNoticeTrail: ' и оценку оракула, прежде чем можно будет подписать транзакцию.',
      depositSigning: 'Подпись…',
      depositButton: 'Депозит {symbol}',
      depositConnectedWallet: 'Подключённый кошелёк',
      depositWalletAsideBlurb:
        'Выпуск AV8 показывается до подписи. Текущий рабочий путь вносит SUI в портфель; полное атомарное чеканение AV8 требует подключения TreasuryCap fund_share к потоку депозита портфеля.',
      depositAvailableTokenCard: 'Доступно {symbol}',
      depositWalletDetectionHint: 'Обнаружено в активном кошельке Sui или сессии zkLogin',
      depositAv8ShareCard: 'У вас',
      depositAv8WithdrawHint: 'Готово для вывода',
      depositAvailableInWalletPrefix: 'Доступно в кошельке:',
      redeemAv8ShareLabel: 'Вывод доли AV8',
      depositPtbRouteLabel: 'Маршрут PTB:',
      depositRouteBlockedWhitelisted:
        '{symbol}: нужны portfolio.deposit_asset<T> и оценка оракула до подписи депозита.',
      depositRouteBlockedNotWhitelisted:
        '{symbol} в кошельке, но не в whitelist для депозитов фонда.',
    },
    portfolio: {
      pageTitle: 'Портфель',
      breadcrumbCurrent: 'Портфель',
      networkSelectorLabel: 'Сеть',
      networkSelectorHint: 'Выберите сетевой контекст для этого режима портфеля.',
      badge: 'Horizon Line',
      title: 'Кабина инвестора для',
      titleHighlight: 'контроля капитала в Sui',
      titleSecondary: 'Траектория портфеля',
      subtitle: 'Траектория NAV, годовой темп роста, резерв ликвидности и здоровье портфеля в отдельном режиме портфеля.',
      ownerAccess: 'Доступ владельца',
      notConnected: 'Не подключено',
      walletModes: 'Sui Wallet / zkLogin',
      awaitingAuth: 'ожидает авторизации',
      connectWallet: 'Подключить кошелек',
      walletNote: 'Кошелек и zkLogin находятся за одной панелью владельца. Исполнение PTB остается привязанным к текущим Sui object IDs и спокойно обновится после подключения OIDC flow.',
      privateBankingEntry: 'Вход private banking',
      commandRoutesDescription: 'Доступ к кошельку, передача через zkLogin и маршруты команд портфеля должны находиться на одной премиальной панели управления.',
      fuelLevel: 'Доступно',
      fuelDescriptionInline: 'USDC, удерживаемый для выкупов и маневров внутри этого же портфельного маршрута.',
      sectionTitle: 'Траектория портфеля',
      sectionBadgeScenario: 'сценарный оверлей',
      sectionBadgeLive: 'живое состояние корзины',
      health: 'Состояние портфеля',
      maxDrift: 'Максимальное отклонение от цели',
      altitude: 'Динамика',
      annualizedClimb: 'Годовой темп из текущего месячного роста',
      fuelHeld: 'Доступно',
      fuelHeldDescription: 'USDC для выкупов и маневров',
      manifestTitle: 'The Manifest',
      manifestSubtitle: 'Основные категории активов и доли в портфеле',
      sleeves: 'сегментов',
      category: 'Категория',
      asset: 'Актив',
      share: 'Доля',
      role: 'Роль',
      healthStatus: {
        stable: 'Стабильно',
        monitoring: 'Под наблюдением',
        rebalancing: 'Ребалансировка',
      },
      manifest: {
        liquidYield: 'Ликвидная доходность',
        liquidYieldRole: 'Генерация наличности и резерв для маневра',
        cryptoBase: 'Крипто-база',
        cryptoBaseRole: 'Технологический апсайд и сетевой экспозер',
        fixedIncome: 'Фиксированный доход',
        fixedIncomeRole: 'Основа и стабильность баланса',
        equity: 'Акции',
        equityRole: 'Сегмент глобального роста',
      },
      defiTitle: 'Текущие позиции в DeFi',
      defiConnectWallet: 'Подключите кошелек, чтобы загрузить актуальные позиции из Zerion.',
      defiSuiUnavailable: 'Для активного SUI-кошелька позиции в стиле Zerion здесь недоступны.',
      defiActiveWallet: 'Активный кошелек',
      defiSuiOnChainDisclaimer: 'Ниже — балансы напрямую из Sui. Агрегированные позиции протоколов (как в Zerion) для этой сети в этом виде пока не подключены.',
      defiSuiNeedWallet: 'Выберите привязанный Sui-кошелёк в кабине, чтобы загрузить on-chain остатки.',
      defiSuiOtherTabHint: 'Активный кошелёк — адрес Sui. Переключите сеть портфеля на SUI для on-chain балансов или выберите Ethereum / Solana для этой ленты DeFi.',
      defiSuiOnChainEmpty: 'Для этого адреса в Sui монет не найдено.',
      defiSuiCetusTitle: 'Обмен в Sui (Cetus)',
      defiSuiCetusBlurb: 'Котировки и свап идут через агрегатор Cetus в выбранной сети Sui (тот же движок, что на отдельной странице обмена).',
      defiSuiCetusOpenApp: 'Открыть Cetus',
      cockpitWalletTokensTitle: 'Токены кошелька',
      cockpitWalletTokensListHeading: 'Токены кошелька',
      cockpitInvestHeading: 'Инвестировать',
      cockpitDeployCapital: 'Внести в депозит',
      cockpitRecallLiquidity: 'Забрать из депозита',
      cockpitSubmittingPtb: 'Отправка PTB…',
    },
    swap: {
      back: 'Назад на главную',
      subtitle: 'Обмен на EVM через 1inch или на Sui через Cetus — каждую сделку подтверждаете в кошельке.',
      openPage: 'Открыть страницу обмена',
      pageTitle: 'Обмен',
      heroBadge: 'Исполнение',
    },
    mint: {
      pageTitle: 'Минт RWA',
      heroBadge: 'Токенизация',
      subtitle: 'Кокпит минтинга в стиле Cyber-Elegance: класс актива, метаданные и инициализация в Sui.',
      step1Label: 'Класс актива',
      step2Label: 'Поля данных',
      step3Label: 'Блокчейн-инициализация',
      assetVehicle: 'Автомобиль',
      assetBusiness: 'Бизнес',
      assetUniversal: 'Универсальный актив',
      makeModel: 'Марка и модель',
      vin: 'VIN',
      year: 'Год',
      mileage: 'Пробег (км)',
      docsLabel: 'Техпаспорт и акт',
      docsDrop: 'Перетащите PDF (техпаспорт, акт осмотра). Файлы хешируются для пакета Walrus/IPFS.',
      estimatedUsd: 'Оценочная стоимость (USD)',
      companyName: 'Название компании / точки',
      regNumber: 'Регистрационный номер (ИНН / БИН / AutoAgent)',
      businessType: 'Тип бизнеса',
      bizService: 'Сервис',
      bizShop: 'Магазин',
      bizRent: 'Аренда',
      revenueMonthly: 'Средняя месячная выручка (USD)',
      legalAddress: 'Юридический адрес или ссылка на Google Maps',
      universalTitle: 'Название актива',
      coverLabel: 'Обложка (cover)',
      coverHint: 'Миниатюра в кошельке и на маркетплейсе',
      descriptionLabel: 'Описание',
      descriptionPlaceholder: 'Маркетинговое описание объекта, денежные потоки или состояние авто.',
      blockchainSection: 'Подпись кошельком Sui',
      blockchainHint: 'После загрузки медиа вызывается Move-транзакция (в т. ч. zkLogin).',
      connectWalletHint: 'Подключите кошелёк Sui для отправки минт-транзакции.',
      cta: 'Инициализировать оцифровку RWA',
      ctaLoading: 'Инициализация…',
      packageMissing: 'Укажите VITE_SUI_PACKAGE_ID для on-chain минта. Метаданные всё равно собираются off-chain.',
      phaseEncrypt: 'Шифрование физических данных…',
      phaseWalrus: 'Загрузка в Walrus / IPFS…',
      phaseMove: 'Генерация Move-объекта…',
      success: 'Актив оцифрован',
      digestLabel: 'Digest транзакции',
      openExplorer: 'Открыть в эксплорере',
      metadataNote: 'JSON метаданных готов для оракулов (USD, идентификаторы, CID документов).',
      errorPrefix: 'Ошибка минтинга',
      validationRequired: 'Заполните все обязательные поля и приложите документы, если требуется.',
      nonVehicleNote: 'Для бизнеса / универсального класса нужны соответствующие entry points в Move. CID метаданных уже готов.',
      governanceTitle: 'Управление и безопасность',
      governanceBlurb:
        'Выпустите новый AdminCap на другой адрес — обычно мультисиг-хранилище Sui — чтобы привилегированные действия требовали нескольких подписей, а не одного zkLogin.',
      newAdminAddressLabel: 'Введите адрес нового администратора или мультисиг-хранилища',
      authorizeNewAdmin: 'Авторизовать нового админа',
      authorizeNewAdminBusy: 'Авторизация…',
      adminCapMissing: 'Укажите VITE_SUI_ADMIN_CAP_ID (объект AdminCap в вашем кошельке) и убедитесь, что VITE_SUI_PACKAGE_ID соответствует rwa_core.',
      invalidAdminAddress: 'Укажите корректный 32-байтовый адрес Sui (0x + 64 hex-символа).',
      adminAuthorized: 'Нового админа авторизовали; AdminCap передан в сети.',
      governanceWalletHint: 'Подключите кошелёк, которому принадлежит AdminCap из VITE_SUI_ADMIN_CAP_ID.',
      deployRunbookTitle: 'Памятка деплоя контракта',
      deployRunbookBlurb:
        'Используйте этот список после изменений в Move-контракте. Минтинг не запускает deploy-скрипты; он вызывает уже настроенный package.',
      deployRunbookWarning:
        'Не открывайте запуск деплоя напрямую в браузере. Запускайте его с сервера, из терминала или через CI с явным подтверждением.',
      deployRunbookChecklist: [
        'Измените Move sources и проверьте сигнатуры entry points.',
        'Соберите и задеплойте RWA package из workspace проекта.',
        'Скопируйте новые package и AdminCap object ID из результата деплоя.',
        'Обновите .env.local и .env.production, затем перезапустите Vite или пересоберите production.',
        'Проверьте минтинг кошельком, которому принадлежит активный AdminCap.',
      ],
      deployRunbookCommandsLabel: 'Ручные команды',
      deployRunbookCommands: ['npm run sui:build:rwa', 'npm run sui:deploy:rwa'],
      deployRunbookEnvLabel: 'Обновите эти значения после деплоя',
      deployRunbookEnvVars: ['VITE_SUI_RWA_PACKAGE_ID', 'VITE_SUI_RWA_ADMIN_CAP_ID', 'VITE_SUI_UTILITY_PACKAGE_ID', 'VITE_SUI_UTILITY_TREASURY_CAP_ID'],
      utilityTab: 'Utility Token',
      utilityTitle: 'AV8 Utility Token',
      utilityBlurb:
        'Подключите любой существующий Sui coin type и его TreasuryCap, затем минтите или сжигайте через generic token admin entry points.',
      utilityConstants: 'Константы токена',
      utilityCreationNote:
        'Новый coin type всё равно требует publish Move-модуля. Используйте эти поля как спецификацию токена, задеплойте package, затем вставьте coin type и TreasuryCap сюда.',
      utilityTokenName: 'Название токена',
      utilityTokenSymbol: 'Символ',
      utilityTokenDecimals: 'Decimals',
      utilityTokenLogo: 'Лого токена',
      utilityChooseLogo: 'Выбрать лого',
      utilityUploadLogo: 'Загрузить лого',
      utilityLogoBusy: 'Загрузка…',
      utilityLogoReady: 'Лого загружено. Используйте этот icon URL в Move-модуле токена перед publish.',
      utilityLogoHint: 'Опционально. Если publish нового coin type идет с этим URL, Sui CoinMetadata покажет лого; оставьте пустым для токена без лого.',
      utilityCoinType: 'Coin type',
      utilityTreasuryCap: 'TreasuryCap object ID',
      utilityRecipient: 'Адрес получателя',
      utilityAmount: 'Количество (AV8U)',
      utilityCoinObject: 'Coin object ID для сжигания',
      utilityMint: 'Минтить utility токены',
      utilityBurn: 'Сжечь coin object',
      utilityBusy: 'Отправка…',
      utilityConfigMissing: 'Укажите VITE_SUI_UTILITY_PACKAGE_ID и VITE_SUI_UTILITY_TREASURY_CAP_ID после деплоя av8_rwa.',
      utilitySuccess: 'Utility token транзакция отправлена.',
    },
    transparency: {
      title: '100% проверяемость.',
      subtitle: 'Без компромиссов.',
      intro: 'Каждая транзакция, каждый актив и каждое взаимодействие с протоколами проверяются on-chain. Мы считаем, что доверие строится на прозрачности.',
      tvl: 'Общая заблокированная стоимость (TVL)',
      currentHoldings: 'Текущие активы',
      portfolioShare: 'портфеля',
      auditsTitle: 'Аудит смартконтрактов',
      auditsDescription: 'Проверено ведущими security-командами с постоянными bug bounty программами.',
      auditsStatus: 'CertiK Verified',
      endpointTitle: 'Подключен endpoint проекта',
      endpointDescription: 'Лендинг читает публичные метаданные из Laravel API для Settings - Projects с fid=12.',
      endpointStatus: 'API /api/projects/12',
      openProjectSite: 'Открыть сайт проекта',
      aboutFallback: 'Описание проекта доступно в настройках Laravel.',
      contact: 'Контакт',
      liveDataLoading: 'Загрузка актуальных данных портфеля...',
      liveDataUnavailable: 'Актуальные данные портфеля сейчас недоступны.',
      tokenLabel: 'Токен',
      defiLabel: 'DeFi',
      holdings: [
        { name: 'USDC (Ethereum)', amount: '$150M', share: '36.3%' },
        { name: 'Wrapped BTC', amount: '$120M', share: '29.1%' },
        { name: 'Lido Staked ETH', amount: '$90M', share: '21.8%' },
        { name: 'Токенизированные US Treasuries', amount: '$52.5M', share: '12.8%' },
      ],
    },
    footer: {
      platform: 'Платформа',
      swap: 'Обмен',
      portfolio: 'Портфель',
      articles: 'Статьи',
      fund: 'Фонд',
      whitepaper: 'Whitepaper',
      trade: 'Торговля',
      analytics: 'Аналитика',
      ltvLoans: 'LTV кредиты',
      rwaMint: 'Минт RWA',
      adminPanel: 'Админпанель',
      legal: 'Правовая информация',
      privacyPolicy: 'Политика конфиденциальности',
      termsOfService: 'Условия использования',
      audits: 'Аудиты',
      kycAml: 'KYC / AML',
      rightsReserved: 'Все права защищены.',
      operatedByFallback: 'Управляется командой проекта.',
      socialLabels: {
        twitter: 'Twitter',
        telegram: 'Telegram',
        website: 'Сайт',
      },
    },
    tokenAdmin: tokenAdminRu,
    fundBasket: fundBasketRu,
    fundAccounts: fundAccountsRu,
  },
};

const STORAGE_KEY = 'av8fund-react-language';

function resolveInitialLanguage(): Language {
  if (typeof window === 'undefined') {
    return 'en';
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === 'en' || stored === 'ua' || stored === 'ru') {
    return stored;
  }

  const browserLanguage = window.navigator.language.toLowerCase();
  if (browserLanguage.startsWith('uk')) {
    return 'ua';
  }
  if (browserLanguage.startsWith('ru')) {
    return 'ru';
  }

  return 'en';
}

type I18nContextValue = {
  language: Language;
  setLanguage: React.Dispatch<React.SetStateAction<Language>>;
  messages: Translation;
};

const I18nContext = React.createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = React.useState<Language>(resolveInitialLanguage);

  React.useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = language === 'ua' ? 'uk' : language;
  }, [language]);

  const value = React.useMemo<I18nContextValue>(
    () => ({
      language,
      setLanguage,
      messages: translations[language],
    }),
    [language],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = React.useContext(I18nContext);

  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }

  return context;
}
