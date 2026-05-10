import React from 'react';
import { useConnectWallet, useCurrentAccount, useDisconnectWallet, useSignPersonalMessage, useWallets } from '@mysten/dapp-kit';
import { isValidSuiAddress } from '@mysten/sui/utils';
import { ArrowUpRight, ChevronDown, LoaderCircle, LogOut, Shield, Menu, Wallet, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useI18n } from '../i18n';
import { SUI_GOOGLE_CLIENT_ID } from '../config';
import {
  getAuthConfig,
  loginWithGoogleCredential,
  logoutAuthenticatedUser,
  createWalletLinkChallenge,
  linkAuthenticatedWallet,
  walletLinkTypeFromPortfolioNetwork,
  type ProjectSettings,
} from '../lib/api';
import {
  getExternalSessionAddress,
  persistExternalWalletSession,
  readExternalWalletSession,
  type ExternalWalletSession,
} from '../lib/externalWalletSession';
import {
  clearPendingZkLoginSetup,
  clearZkLoginSession,
} from '../lib/zkloginSession';
import {
  clearIdentitySession,
  IDENTITY_SESSION_EVENT,
  persistIdentitySession,
  readIdentitySession,
  type IdentitySession,
} from '../lib/identitySession';
import { getGoogleIdentityInitializeKey, loadGoogleIdentityScript, setGoogleIdentityInitializeKey } from '../lib/googleIdentity';
import {
  HEADER_NETWORK_CHANGE_EVENT,
  HEADER_NETWORK_IDS,
  readStoredHeaderNetwork,
  getHeaderNetworkFamily,
  walletMatchesHeaderNetwork,
  SELECTED_HEADER_NETWORK_STORAGE_KEY,
  persistHeaderNetwork,
  headerNetworkAbbrev,
  headerNetworkFullLabel,
  type HeaderNetwork,
} from '../lib/headerNetwork';
import {
  getPhantomSolanaProvider,
  getSolflareSolanaProvider,
  signSolanaLinkMessage,
  type InjectedSolanaProvider,
} from '../lib/solanaWallet';
import { getAboutPath, getBasePath, getInvestPath, getPortfolioPath, getSwapPath } from '../lib/routes';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
} from './ui/dialog';

type Eip1193Provider = {
  isMetaMask?: boolean;
  isRabby?: boolean;
  providers?: Eip1193Provider[];
  request: (args: { method: string; params?: unknown[] | object }) => Promise<unknown>;
};

function shortAddress(value?: string | null) {
  if (!value) {
    return 'Connect Wallet';
  }

  if (value.length <= 12) {
    return value;
  }

  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function getEthereumProvider(kind: 'metamask' | 'rabby'): Eip1193Provider | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const ethereum = (window as Window & { ethereum?: Eip1193Provider }).ethereum;
  if (!ethereum) {
    return null;
  }

  const candidates = Array.isArray(ethereum.providers) && ethereum.providers.length > 0
    ? ethereum.providers
    : [ethereum];

  return candidates.find((provider) => (kind === 'rabby' ? provider.isRabby : provider.isMetaMask && !provider.isRabby)) ?? null;
}

type NavbarProps = {
  project: ProjectSettings;
  currentPage?: 'home' | 'articles' | 'article' | 'swap' | 'mint' | 'invest' | 'portfolio' | 'about' | 'whitepaper' | 'privacy-policy' | 'terms-of-service' | 'kyc-aml';
};

export function Navbar({ project, currentPage = 'home' }: NavbarProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isLanguageOpen, setIsLanguageOpen] = React.useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = React.useState(false);
  const [logoError, setLogoError] = React.useState(false);
  const [activeWalletName, setActiveWalletName] = React.useState<string | null>(null);
  const [externalSession, setExternalSession] = React.useState<ExternalWalletSession | null>(null);
  const [identitySession, setIdentitySession] = React.useState<IdentitySession | null>(null);
  const [externalPending, setExternalPending] = React.useState<
    'google-identity' | 'metamask' | 'rabby' | 'phantom' | 'solflare' | null
  >(null);
  const [externalError, setExternalError] = React.useState<string | null>(null);
  const [selectedNetwork, setSelectedNetwork] = React.useState<HeaderNetwork>(readStoredHeaderNetwork);
  const [suiLinkAfterConnectPending, setSuiLinkAfterConnectPending] = React.useState(false);
  const [isChainMenuOpen, setIsChainMenuOpen] = React.useState(false);
  const languageMenuRef = React.useRef<HTMLDivElement | null>(null);
  const chainMenuRefDesktop = React.useRef<HTMLDivElement | null>(null);
  const chainMenuRefMobile = React.useRef<HTMLDivElement | null>(null);
  const googleIdentityButtonRef = React.useRef<HTMLDivElement | null>(null);
  const [isGoogleIdentityButtonLoading, setIsGoogleIdentityButtonLoading] = React.useState(false);
  const [googleIdentityButtonVersion, setGoogleIdentityButtonVersion] = React.useState(0);
  const logoUrl = project.foto_header_preview || project.foto_preview;
  const brandName = project.name.trim() || 'AV8Capital';
  const basePath = getBasePath();
  const aboutHref = getAboutPath();
  const portfolioHref = getPortfolioPath();
  const investHref = getInvestPath();
  const swapHref = getSwapPath();
  const { language, setLanguage, messages } = useI18n();
  const wallets = useWallets();
  const currentAccount = useCurrentAccount();
  const { mutate: connectWallet, isPending: isWalletPending, error: walletError } = useConnectWallet({
    onSuccess: () => {
      setIsWalletModalOpen(false);
      setActiveWalletName(null);
      setExternalError(null);
      const session = readIdentitySession();
      if (session?.token && session.user) {
        setSuiLinkAfterConnectPending(true);
      }
    },
    onError: () => {
      setActiveWalletName(null);
    },
  });
  const { mutateAsync: disconnectWallet, isPending: isDisconnectPending } = useDisconnectWallet();
  const { mutateAsync: signPersonalMessage } = useSignPersonalMessage();
  const shouldShowLogo = Boolean(logoUrl) && !logoError;
  const hasIdentitySession = Boolean(identitySession?.token && identitySession?.user);
  const hasAnyWalletConnection = Boolean(currentAccount?.address) || Boolean(externalSession) || hasIdentitySession;
  const externalSessionAddress = getExternalSessionAddress(externalSession);
  const identityWallets = React.useMemo(() => {
    const user = identitySession?.user;

    if (!user) {
      return [];
    }

    if (Array.isArray(user.wallets) && user.wallets.length > 0) {
      return user.wallets;
    }

    if (user.wallet_address) {
      return [{
        address: user.wallet_address,
        network: user.wallet_network,
        connected_at: user.wallet_connected_at,
      }];
    }

    return [];
  }, [identitySession?.user]);
  const filteredIdentityWallets = React.useMemo(
    () => identityWallets.filter((wallet) => walletMatchesHeaderNetwork(wallet, selectedNetwork)),
    [identityWallets, selectedNetwork],
  );
  const walletLabel = currentAccount
    ? shortAddress(currentAccount.address)
    : externalSessionAddress
      ? shortAddress(externalSessionAddress)
      : identitySession?.user?.name || identitySession?.user?.email
        ? String(identitySession?.user?.name || identitySession?.user?.email)
      : externalSession?.type === 'google'
        ? externalSession.name || externalSession.email || 'Google'
        : 'Connect Wallet';
  const networkFamily = getHeaderNetworkFamily(selectedNetwork);
  const selectedNetworkLabel = headerNetworkFullLabel(selectedNetwork, messages.navbar.chainNames);
  const languageOptions = [
    { code: 'en' as const, label: 'English', short: 'EN' },
    { code: 'ua' as const, label: 'Українська', short: 'UA' },
    { code: 'ru' as const, label: 'Русский', short: 'RU' },
  ];

  React.useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (!languageMenuRef.current?.contains(target)) {
        setIsLanguageOpen(false);
      }
      if (!chainMenuRefDesktop.current?.contains(target) && !chainMenuRefMobile.current?.contains(target)) {
        setIsChainMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, []);

  React.useEffect(() => {
    setLogoError(false);
  }, [logoUrl]);

  React.useEffect(() => {
    setExternalSession(readExternalWalletSession());
    setIdentitySession(readIdentitySession());
  }, []);

  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    function syncIdentitySession() {
      setIdentitySession(readIdentitySession());
    }

    window.addEventListener(IDENTITY_SESSION_EVENT, syncIdentitySession as EventListener);
    window.addEventListener('storage', syncIdentitySession);

    return () => {
      window.removeEventListener(IDENTITY_SESSION_EVENT, syncIdentitySession as EventListener);
      window.removeEventListener('storage', syncIdentitySession);
    };
  }, []);

  const renderGoogleIdentityButton = React.useCallback(async () => {
    const container = googleIdentityButtonRef.current;
    if (!container || !isWalletModalOpen) {
      return;
    }

    container.innerHTML = '';
    setIsGoogleIdentityButtonLoading(true);

    try {
      const authConfig = await getAuthConfig().catch(() => ({ googleClientId: '', phoneAuthEnabled: false }));
      const googleClientId = authConfig.googleClientId || SUI_GOOGLE_CLIENT_ID;

      if (!googleClientId) {
        setExternalError('Google client ID is missing.');
        return;
      }

      const googleIdentity = await loadGoogleIdentityScript();
      const initializeKey = `identity:${googleClientId}`;
      if (getGoogleIdentityInitializeKey() !== initializeKey) {
        googleIdentity.cancel();
        googleIdentity.initialize({
          client_id: googleClientId,
          ux_mode: 'popup',
          use_fedcm_for_prompt: false,
          cancel_on_tap_outside: false,
          callback: ({ credential }) => {
            if (!credential) {
              setExternalPending(null);
              setExternalError('Google did not return an ID token.');
              setGoogleIdentityButtonVersion((version) => version + 1);
              return;
            }

            setExternalPending('google-identity');
            setExternalError(null);
            void loginWithGoogleCredential(credential)
              .then(({ user, token }) => {
                persistIdentitySession({
                  provider: 'google',
                  token,
                  user,
                  credential,
                  createdAt: new Date().toISOString(),
                });
                setIdentitySession(readIdentitySession());
              })
              .catch((error) => {
                setExternalError(error instanceof Error ? error.message : 'Google login failed.');
                setGoogleIdentityButtonVersion((version) => version + 1);
              })
              .finally(() => {
                setExternalPending(null);
              });
          },
        });
        setGoogleIdentityInitializeKey(initializeKey);
      }
      googleIdentity.renderButton(container, {
        theme: 'filled_black',
        size: 'large',
        type: 'standard',
        text: 'continue_with',
        shape: 'pill',
        logo_alignment: 'left',
        width: Math.min(360, container.clientWidth || 320),
      });
    } catch (error) {
      setExternalError(error instanceof Error ? error.message : 'Failed to prepare Google login.');
    } finally {
      setIsGoogleIdentityButtonLoading(false);
    }
  }, [isWalletModalOpen]);

  React.useEffect(() => {
    if (!isWalletModalOpen) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      void renderGoogleIdentityButton();
    });

    return () => {
      window.cancelAnimationFrame(frameId);
      googleIdentityButtonRef.current?.replaceChildren();
    };
  }, [googleIdentityButtonVersion, isWalletModalOpen, renderGoogleIdentityButton]);

  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    function onHeaderNetwork(event: Event) {
      const next = (event as CustomEvent<{ network: HeaderNetwork }>).detail?.network;
      if (next && HEADER_NETWORK_IDS.includes(next)) {
        setSelectedNetwork(next);
      }
    }

    function onStorage(ev: StorageEvent) {
      if (ev.key !== SELECTED_HEADER_NETWORK_STORAGE_KEY || !ev.newValue) {
        return;
      }
      const next = ev.newValue as HeaderNetwork;
      if (HEADER_NETWORK_IDS.includes(next)) {
        setSelectedNetwork(next);
      }
    }

    setSelectedNetwork(readStoredHeaderNetwork());
    window.addEventListener(HEADER_NETWORK_CHANGE_EVENT, onHeaderNetwork);
    window.addEventListener('storage', onStorage);

    return () => {
      window.removeEventListener(HEADER_NETWORK_CHANGE_EVENT, onHeaderNetwork);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const linkEvmWalletToAccount = React.useCallback(async (provider: Eip1193Provider, address: string) => {
    if (!identitySession?.token) {
      return;
    }

    const chainWalletType = walletLinkTypeFromPortfolioNetwork(selectedNetwork);

    const challenge = await createWalletLinkChallenge(identitySession.token, {
      address,
      walletType: chainWalletType,
    });
    const signature = await provider.request({
      method: 'personal_sign',
      params: [challenge.message, address],
    });

    if (typeof signature !== 'string' || signature.trim() === '') {
      throw new Error('Wallet did not return a signature.');
    }

    const user = await linkAuthenticatedWallet(identitySession.token, {
      address,
      signature,
      network: selectedNetwork,
      walletType: chainWalletType,
    });

    persistIdentitySession({
      ...identitySession,
      user,
    });
    setIdentitySession(readIdentitySession());
  }, [identitySession, selectedNetwork]);

  const linkSolanaWalletToAccount = React.useCallback(async (
    provider: InjectedSolanaProvider,
    address: string,
  ) => {
    const session = readIdentitySession();
    if (!session?.token) {
      return;
    }

    const challenge = await createWalletLinkChallenge(session.token, {
      address,
      walletType: 'solana',
    });
    const signature = await signSolanaLinkMessage(provider, challenge.message);

    const user = await linkAuthenticatedWallet(session.token, {
      address,
      signature,
      network: 'solana',
      walletType: 'solana',
    });

    persistIdentitySession({
      ...session,
      user,
    });
    setIdentitySession(readIdentitySession());
  }, []);

  const linkSuiWalletToAccount = React.useCallback(async (address: string) => {
    const session = readIdentitySession();
    if (!session?.token) {
      return;
    }

    const trimmed = address.trim();
    if (!isValidSuiAddress(trimmed)) {
      throw new Error('Invalid Sui wallet address.');
    }

    const challenge = await createWalletLinkChallenge(session.token, {
      address: trimmed,
      walletType: 'sui',
    });
    const messageBytes = new TextEncoder().encode(challenge.message);
    const signed = await signPersonalMessage({ message: messageBytes });

    const user = await linkAuthenticatedWallet(session.token, {
      address: trimmed,
      signature: signed.signature,
      network: 'sui',
      walletType: 'sui',
    });

    persistIdentitySession({
      ...session,
      user,
    });
    setIdentitySession(readIdentitySession());
  }, [signPersonalMessage]);

  React.useEffect(() => {
    if (!suiLinkAfterConnectPending || !currentAccount?.address) {
      return;
    }

    const session = readIdentitySession();
    if (!session?.token) {
      setSuiLinkAfterConnectPending(false);
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        await linkSuiWalletToAccount(currentAccount.address);
      } catch (error) {
        if (!cancelled) {
          setExternalError(error instanceof Error ? error.message : 'Sui wallet link failed.');
        }
      } finally {
        if (!cancelled) {
          setSuiLinkAfterConnectPending(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentAccount?.address, linkSuiWalletToAccount, suiLinkAfterConnectPending]);

  function handleWalletConnect(wallet: (typeof wallets)[number]) {
    setActiveWalletName(wallet.name);
    setExternalError(null);
    connectWallet({ wallet });
  }

  async function handleEvmConnect(providerName: 'metamask' | 'rabby') {
    const provider = getEthereumProvider(providerName);
    if (!provider) {
      setExternalError(`${providerName === 'metamask' ? 'MetaMask' : 'Rabby Wallet'} was not detected in this browser.`);
      return;
    }

    setExternalPending(providerName);
    setExternalError(null);

    try {
      const accounts = await provider.request({ method: 'eth_requestAccounts' });
      const address = Array.isArray(accounts) && typeof accounts[0] === 'string' ? accounts[0] : '';

      if (!address) {
        throw new Error('Wallet did not return an account.');
      }

      if (identitySession?.token) {
        await linkEvmWalletToAccount(provider, address);
      }

      const session: ExternalWalletSession = {
        type: 'evm',
        provider: providerName,
        address,
      };

      persistExternalWalletSession(session);
      setExternalSession(session);
      setIsWalletModalOpen(false);
    } catch (error) {
      setExternalError(error instanceof Error ? error.message : 'Wallet connection failed.');
    } finally {
      setExternalPending(null);
    }
  }

  async function handleSolanaConnect(providerName: 'phantom' | 'solflare') {
    const provider = providerName === 'phantom' ? getPhantomSolanaProvider() : getSolflareSolanaProvider();
    if (!provider) {
      setExternalError(
        providerName === 'phantom'
          ? 'Phantom was not detected in this browser.'
          : 'Solflare was not detected in this browser.',
      );
      return;
    }

    setExternalPending(providerName);
    setExternalError(null);

    try {
      await provider.connect();
      const rawPk = provider.publicKey?.toBase58?.() ?? provider.publicKey?.toString?.() ?? '';
      const address = rawPk.trim();

      if (!address) {
        throw new Error('Wallet did not return a public key.');
      }

      if (readIdentitySession()?.token) {
        await linkSolanaWalletToAccount(provider, address);
      }

      const session: ExternalWalletSession = {
        type: 'solana',
        provider: providerName,
        address,
      };

      persistExternalWalletSession(session);
      setExternalSession(session);
      setIsWalletModalOpen(false);
    } catch (error) {
      setExternalError(error instanceof Error ? error.message : 'Solana wallet connection failed.');
    } finally {
      setExternalPending(null);
    }
  }

  async function handleWalletDisconnect() {
    const currentExternalSession = externalSession;
    const currentIdentitySession = identitySession;
    setExternalError(null);
    setExternalPending(null);
    setActiveWalletName(null);

    if (currentExternalSession?.type === 'google' && currentExternalSession.provider === 'web3auth') {
      try {
        const { disconnectGoogleEvmSession } = await import('../lib/web3auth');
        await disconnectGoogleEvmSession();
      } catch (error) {
        setExternalError(error instanceof Error ? error.message : 'Embedded wallet logout failed.');
        return;
      }
    }

    if (currentExternalSession?.type === 'solana') {
      try {
        const injected =
          currentExternalSession.provider === 'phantom'
            ? getPhantomSolanaProvider()
            : getSolflareSolanaProvider();
        await injected?.disconnect?.();
      } catch {
        // ignore
      }
    }

    clearPendingZkLoginSetup();
    clearZkLoginSession();
    persistExternalWalletSession(null);
    setExternalSession(null);
    clearIdentitySession();
    setIdentitySession(null);

    if (currentIdentitySession?.token) {
      try {
        await logoutAuthenticatedUser(currentIdentitySession.token);
      } catch (error) {
        setExternalError(error instanceof Error ? error.message : 'Identity logout failed.');
      }
    }

    if (currentAccount?.address) {
      try {
        await disconnectWallet();
      } catch (error) {
        setExternalError(error instanceof Error ? error.message : 'Wallet disconnect failed.');
        return;
      }
    }

    setIsWalletModalOpen(false);
  }

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06] bg-[rgba(6,10,20,0.58)] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] backdrop-blur-2xl backdrop-saturate-150 transition-[background,box-shadow,border-color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {shouldShowLogo ? (
            <div className="h-11 max-w-[180px] rounded-xl border border-white/[0.08] bg-white/95 px-3 py-2 shadow-[0_0_24px_-8px_rgba(45,212,191,0.15)] ring-1 ring-white/10 transition-[box-shadow,border-color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-teal-300/20 hover:shadow-[0_0_32px_-6px_rgba(45,212,191,0.22)]">
              <img
                src={logoUrl}
                alt={brandName}
                className="w-full h-full object-contain"
                loading="eager"
                decoding="async"
                onError={() => setLogoError(true)}
              />
            </div>
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-400/90 via-cyan-500/80 to-violet-600/70 shadow-[0_0_20px_-6px_rgba(45,212,191,0.55)] ring-1 ring-white/10">
              <Shield className="text-slate-950 w-6 h-6" />
            </div>
          )}
          <a
            href={basePath}
            className="font-display text-xl font-semibold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-500 transition-[opacity,filter] hover:opacity-90"
          >
            {brandName}
          </a>
        </div>

        <div className="hidden md:flex items-center gap-8">
          <a href={portfolioHref} className="text-sm font-medium tracking-[0.05em] text-slate-400 transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-cyan-100">{messages.footer.portfolio}</a>
          <a href={investHref} className="text-sm font-medium tracking-[0.05em] text-slate-400 transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-cyan-100">{messages.navbar.fund}</a>
          <a href={swapHref} className="text-sm font-medium tracking-[0.05em] text-slate-400 transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-cyan-100">{messages.navbar.swap}</a>
          <a href={aboutHref} className="text-sm font-medium tracking-[0.05em] text-slate-400 transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-cyan-100">{messages.navbar.about}</a>
          <div className="relative" ref={languageMenuRef}>
            <button
              type="button"
              aria-label={messages.navbar.language}
              onClick={() => {
                setIsLanguageOpen((current) => !current);
                setIsChainMenuOpen(false);
              }}
              className="flex h-9 min-w-[2.75rem] items-center justify-center rounded-lg border border-white/[0.09] bg-white/[0.04] px-2.5 text-xs font-semibold tracking-wider text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] transition-[background,border-color,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-teal-400/25 hover:bg-white/[0.07]"
            >
              {language.toUpperCase()}
            </button>
            <AnimatePresence>
              {isLanguageOpen ? (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute left-0 top-full z-[60] mt-2 w-40 overflow-hidden rounded-2xl border border-white/[0.08] bg-[rgba(8,12,22,0.85)] shadow-[0_24px_48px_-12px_rgba(0,0,0,0.55),inset_0_1px_0_0_rgba(255,255,255,0.05)] backdrop-blur-2xl"
                >
                  {languageOptions.map((option) => (
                    <button
                      key={option.code}
                      type="button"
                      onClick={() => {
                        setLanguage(option.code);
                        setIsLanguageOpen(false);
                      }}
                      className={`flex w-full items-center justify-between px-4 py-3 text-sm tracking-wide transition-[background,color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                        language === option.code ? 'bg-white/[0.08] text-cyan-100' : 'text-slate-400 hover:bg-white/[0.04] hover:text-white'
                      }`}
                    >
                      <span>{option.label}</span>
                      <span className="text-xs font-semibold">{option.short}</span>
                    </button>
                  ))}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-2">
          <div className="relative" ref={chainMenuRefDesktop}>
            <button
              type="button"
              aria-label={`${messages.navbar.networkScopeHint}: ${selectedNetworkLabel}`}
              aria-expanded={isChainMenuOpen}
              aria-haspopup="listbox"
              onClick={() => {
                setIsChainMenuOpen((v) => !v);
                setIsLanguageOpen(false);
              }}
              className="inline-flex h-11 items-center gap-1 rounded-xl border border-white/[0.09] bg-white/[0.04] px-3 text-sm font-bold tracking-wider text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] transition-[background,border-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-teal-400/25 hover:bg-white/[0.07]"
            >
              {headerNetworkAbbrev(selectedNetwork)}
              <ChevronDown
                className={`h-3.5 w-3.5 opacity-70 transition-transform duration-200 ${isChainMenuOpen ? 'rotate-180' : ''}`}
                aria-hidden
              />
            </button>
            <AnimatePresence>
              {isChainMenuOpen ? (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-0 top-full z-[60] mt-2 min-w-[240px] overflow-hidden rounded-xl border border-white/10 bg-[rgba(8,12,24,0.97)] py-1 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.65)] backdrop-blur-xl"
                  role="listbox"
                  aria-label={messages.navbar.networkScopeHint}
                >
                  {HEADER_NETWORK_IDS.map((id) => (
                    <button
                      key={id}
                      type="button"
                      role="option"
                      aria-selected={id === selectedNetwork}
                      onClick={() => {
                        persistHeaderNetwork(id);
                        setIsChainMenuOpen(false);
                      }}
                      className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm transition hover:bg-white/[0.06] ${
                        id === selectedNetwork ? 'bg-teal-500/15 text-teal-100' : 'text-slate-200'
                      }`}
                    >
                      <span className="font-medium">{headerNetworkFullLabel(id, messages.navbar.chainNames)}</span>
                      <span className="shrink-0 text-xs font-bold tracking-wider text-slate-500">{headerNetworkAbbrev(id)}</span>
                    </button>
                  ))}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
          <button
            type="button"
            onClick={() => setIsWalletModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-teal-400/20 bg-gradient-to-r from-teal-400 to-cyan-500 px-5 py-2.5 text-sm font-semibold tracking-wide text-slate-950 shadow-[0_0_28px_-10px_rgba(45,212,191,0.65)] transition-[filter,box-shadow,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:shadow-[0_0_40px_-8px_rgba(45,212,191,0.75)] hover:brightness-[1.03] active:scale-[0.98]"
          >
            <Wallet className="h-4 w-4" />
            {hasAnyWalletConnection ? walletLabel : messages.navbar.connectWalletShort}
          </button>
          {hasAnyWalletConnection ? (
            <button
              type="button"
              onClick={() => void handleWalletDisconnect()}
              disabled={isDisconnectPending}
              className="inline-flex items-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2.5 text-sm font-semibold tracking-wide text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] transition-[background,border-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-white/15 hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isDisconnectPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
              Logout
            </button>
          ) : null}
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <div className="relative" ref={chainMenuRefMobile}>
            <button
              type="button"
              aria-label={`${messages.navbar.networkScopeHint}: ${selectedNetworkLabel}`}
              aria-expanded={isChainMenuOpen}
              aria-haspopup="listbox"
              onClick={() => {
                setIsChainMenuOpen((v) => !v);
                setIsLanguageOpen(false);
              }}
              className="inline-flex h-11 min-w-[3rem] items-center justify-center gap-0.5 rounded-xl border border-white/[0.09] bg-white/[0.04] px-2.5 text-sm font-bold tracking-wider text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] transition-[background,border-color] duration-300 hover:border-teal-400/25 hover:bg-white/[0.07]"
            >
              {headerNetworkAbbrev(selectedNetwork)}
              <ChevronDown
                className={`h-3 w-3 opacity-70 transition-transform duration-200 ${isChainMenuOpen ? 'rotate-180' : ''}`}
                aria-hidden
              />
            </button>
            <AnimatePresence>
              {isChainMenuOpen ? (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-0 top-full z-[60] mt-2 min-w-[min(92vw,240px)] overflow-hidden rounded-xl border border-white/10 bg-[rgba(8,12,24,0.97)] py-1 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.65)] backdrop-blur-xl"
                  role="listbox"
                  aria-label={messages.navbar.networkScopeHint}
                >
                  {HEADER_NETWORK_IDS.map((id) => (
                    <button
                      key={id}
                      type="button"
                      role="option"
                      aria-selected={id === selectedNetwork}
                      onClick={() => {
                        persistHeaderNetwork(id);
                        setIsChainMenuOpen(false);
                      }}
                      className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm transition hover:bg-white/[0.06] ${
                        id === selectedNetwork ? 'bg-teal-500/15 text-teal-100' : 'text-slate-200'
                      }`}
                    >
                      <span className="font-medium">{headerNetworkFullLabel(id, messages.navbar.chainNames)}</span>
                      <span className="shrink-0 text-xs font-bold tracking-wider text-slate-500">{headerNetworkAbbrev(id)}</span>
                    </button>
                  ))}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
          <button
            type="button"
            onClick={() => setIsWalletModalOpen(true)}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-teal-400/25 bg-gradient-to-r from-teal-400 to-cyan-500 px-3 text-sm font-semibold tracking-wide text-slate-950 shadow-[0_0_24px_-10px_rgba(45,212,191,0.55)] transition-[filter,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:shadow-[0_0_36px_-8px_rgba(126,87,255,0.35)] hover:brightness-[1.03]"
          >
            <Wallet className="h-4 w-4" />
            <span className="max-w-[96px] truncate">
              {hasAnyWalletConnection ? walletLabel : messages.navbar.connectWalletShort}
            </span>
          </button>
          <button 
            type="button"
            aria-label={isOpen ? 'Close menu' : 'Open menu'}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.09] bg-white/[0.04] text-slate-400 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] transition-[background,color,border-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-teal-400/20 hover:bg-white/[0.07] hover:text-white"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="md:hidden absolute top-20 left-0 right-0 max-h-[calc(100vh-5rem)] overflow-y-auto border-b border-white/[0.06] bg-[rgba(5,8,16,0.88)] p-6 shadow-[0_28px_64px_-20px_rgba(0,0,0,0.6)] backdrop-blur-2xl backdrop-saturate-150"
          >
            <div className="space-y-5">
              <div className="ce-glass-slab ce-glass-slab--interactive rounded-[1.75rem] p-4">
                <div className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Navigation
                </div>
                <div className="grid gap-2">
                  {[
                    { href: portfolioHref, label: messages.footer.portfolio },
                    { href: investHref, label: messages.navbar.fund },
                    { href: swapHref, label: messages.navbar.swap },
                    { href: aboutHref, label: messages.navbar.about },
                  ].map((item) => (
                    <a
                      key={`${item.href}-${item.label}`}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-sky-400/25 hover:bg-slate-900 hover:text-white"
                    >
                      {item.label}
                    </a>
                  ))}
                </div>
              </div>

              <div className="ce-glass-slab ce-glass-slab--interactive rounded-[1.75rem] p-4">
                <div className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  {messages.navbar.language}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {languageOptions.map((option) => (
                    <button
                      key={option.code}
                      type="button"
                      onClick={() => {
                        setLanguage(option.code);
                        setIsOpen(false);
                      }}
                      className={`rounded-2xl border px-3 py-3 text-sm font-bold transition ${
                        language === option.code
                          ? 'border-sky-300 bg-sky-300/15 text-white'
                          : 'border-white/10 bg-slate-950/70 text-slate-300 hover:bg-slate-900 hover:text-white'
                      }`}
                    >
                      {option.short}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 border-t border-white/5 pt-5">
              {hasAnyWalletConnection ? (
                <button
                  type="button"
                  onClick={() => void handleWalletDisconnect()}
                  disabled={isDisconnectPending}
                  className="rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm font-medium text-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isDisconnectPending ? 'Выход...' : 'Выйти'}
                </button>
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>

    <Dialog open={isWalletModalOpen} onOpenChange={setIsWalletModalOpen}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto border-white/10 bg-slate-950 p-0 text-slate-100 shadow-[0_30px_120px_rgba(2,6,23,0.7)]">
        <div className="overflow-hidden rounded-lg bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.14),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(245,158,11,0.12),_transparent_30%),linear-gradient(180deg,_#020617_0%,_#08111f_100%)]">
          <DialogHeader className="border-b border-white/8 px-6 py-6 text-left">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-sky-200">
              <Wallet className="h-4 w-4" />
              Wallet Access
            </div>
            <DialogDescription className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
              Войдите через Google или подключите кошелёк для сети {selectedNetworkLabel}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 px-6 py-6">
            <div className="rounded-[1.75rem] border border-white/10 bg-[linear-gradient(135deg,rgba(8,15,29,0.96)_0%,rgba(10,26,45,0.88)_100%)] p-5 backdrop-blur-xl">
              <div className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Google
              </div>

              <div className="w-full max-w-[392px] rounded-[1.25rem] border border-sky-300/20 bg-[linear-gradient(135deg,rgba(14,165,233,0.18),rgba(15,23,42,0.9)_42%,rgba(16,185,129,0.12))] p-[1px] shadow-[0_18px_50px_rgba(14,165,233,0.12)]">
                <div className="flex min-h-[58px] w-full items-center gap-3 rounded-[1.2rem] bg-slate-950/90 px-3 py-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-sky-100">
                    <Shield className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 text-[11px] font-semibold uppercase text-sky-100/60">
                      Secure Google sign-in
                    </div>
                    <div className="flex min-h-10 w-full items-center">
                      {externalPending === 'google-identity' || isGoogleIdentityButtonLoading ? (
                        <LoaderCircle className="mr-3 h-4 w-4 shrink-0 animate-spin text-sky-200" />
                      ) : null}
                      <div
                        ref={googleIdentityButtonRef}
                        className={`min-h-10 w-full ${externalPending !== null ? 'pointer-events-none opacity-60' : ''}`}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {hasIdentitySession ? (
                <div className="mt-4 rounded-2xl border border-sky-400/15 bg-sky-400/10 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-100/70">
                    Пользователь
                  </div>
                  <div className="mt-1 text-sm font-semibold text-white">
                    {identitySession?.user?.name || identitySession?.user?.email || 'Google'}
                  </div>
                  <div className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-sky-100/70">
                    {messages.navbar.walletsForNetworkHint} · {selectedNetworkLabel}
                  </div>
                  {identityWallets.length > 0 ? (
                    <div className="mt-1 text-[11px] text-sky-100/60">
                      {filteredIdentityWallets.length} / {identityWallets.length}
                    </div>
                  ) : null}
                  {filteredIdentityWallets.length > 0 ? (
                    <div className="mt-2 space-y-2">
                      {filteredIdentityWallets.map((wallet) => (
                        <div
                          key={`${wallet.network || 'wallet'}-${wallet.address}`}
                          className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm"
                        >
                          <span className="text-slate-400">{wallet.network || 'wallet'}</span>
                          <span className="font-mono text-slate-100">{shortAddress(wallet.address)}</span>
                        </div>
                      ))}
                    </div>
                  ) : identityWallets.length > 0 ? (
                    <div className="mt-2 rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
                      Нет привязанных кошельков для {selectedNetworkLabel}. Смените сеть в переключателе или привяжите кошелёк через «{messages.navbar.connectWalletShort}».
                    </div>
                  ) : (
                    <div className="mt-2 rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
                      У пользователя нет прикрепленных кошельков.
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            {externalError ? (
              <div className="rounded-[1.25rem] border border-rose-500/20 bg-rose-500/10 px-4 py-4 text-sm text-rose-100">
                {externalError}
              </div>
            ) : null}

            <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl">
              <div className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Wallet Methods
              </div>

              <div className="space-y-3">
                {networkFamily === 'evm' ? (
                  [
                    {
                      key: 'metamask' as const,
                      label: 'MetaMask',
                      description: `${selectedNetworkLabel} wallet`,
                    },
                    {
                      key: 'rabby' as const,
                      label: 'Rabby Wallet',
                      description: `${selectedNetworkLabel} wallet`,
                    },
                  ].map((walletOption) => {
                    const isActive = externalPending === walletOption.key;
                    const isDetected = Boolean(getEthereumProvider(walletOption.key));

                    return (
                      <button
                        key={walletOption.key}
                        type="button"
                        onClick={() => void handleEvmConnect(walletOption.key)}
                        disabled={isWalletPending || externalPending !== null}
                        className="flex w-full items-center justify-between rounded-[1.25rem] border border-white/8 bg-slate-950/70 px-4 py-3 text-left transition hover:border-sky-400/25 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10">
                            <Wallet className="h-4 w-4 text-slate-300" />
                          </div>
                          <div>
                            <div className="font-semibold text-white">{walletOption.label}</div>
                            <div className="text-xs uppercase tracking-[0.14em] text-slate-500">
                              {isDetected ? walletOption.description : 'Not detected'}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-slate-400">
                          {isActive ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ArrowUpRight className="h-4 w-4" />}
                        </div>
                      </button>
                    );
                  })
                ) : null}

                {networkFamily === 'solana' ? (
                  [
                    {
                      key: 'phantom' as const,
                      label: 'Phantom',
                      description: `${selectedNetworkLabel} wallet`,
                    },
                    {
                      key: 'solflare' as const,
                      label: 'Solflare',
                      description: `${selectedNetworkLabel} wallet`,
                    },
                  ].map((walletOption) => {
                    const isActive = externalPending === walletOption.key;
                    const isDetected = Boolean(
                      walletOption.key === 'phantom' ? getPhantomSolanaProvider() : getSolflareSolanaProvider(),
                    );

                    return (
                      <button
                        key={walletOption.key}
                        type="button"
                        onClick={() => void handleSolanaConnect(walletOption.key)}
                        disabled={isWalletPending || externalPending !== null}
                        className="flex w-full items-center justify-between rounded-[1.25rem] border border-white/8 bg-slate-950/70 px-4 py-3 text-left transition hover:border-violet-400/25 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10">
                            <Wallet className="h-4 w-4 text-slate-300" />
                          </div>
                          <div>
                            <div className="font-semibold text-white">{walletOption.label}</div>
                            <div className="text-xs uppercase tracking-[0.14em] text-slate-500">
                              {isDetected ? walletOption.description : 'Not detected'}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-slate-400">
                          {isActive ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ArrowUpRight className="h-4 w-4" />}
                        </div>
                      </button>
                    );
                  })
                ) : null}

                {networkFamily === 'sui' ? (
                  wallets.length > 0 ? wallets.map((wallet) => {
                    const isActive = activeWalletName === wallet.name && isWalletPending;

                    return (
                      <button
                        key={wallet.id ?? wallet.name}
                        type="button"
                        onClick={() => handleWalletConnect(wallet)}
                        disabled={isWalletPending}
                        className="flex w-full items-center justify-between rounded-[1.25rem] border border-white/8 bg-slate-950/70 px-4 py-3 text-left transition hover:border-sky-400/25 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <div className="flex items-center gap-3">
                          {wallet.icon ? (
                            <img src={wallet.icon} alt={wallet.name} className="h-10 w-10 rounded-xl object-cover ring-1 ring-white/10" />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10">
                              <Wallet className="h-4 w-4 text-slate-300" />
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-white">{wallet.name}</div>
                            <div className="text-xs uppercase tracking-[0.14em] text-slate-500">Sui wallet</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-slate-400">
                          {isActive ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ArrowUpRight className="h-4 w-4" />}
                        </div>
                      </button>
                    );
                  }) : (
                    <div className="rounded-[1.25rem] border border-amber-500/20 bg-amber-500/10 px-4 py-4 text-sm text-amber-100">
                      No Sui wallet was detected in this browser.
                    </div>
                  )
                ) : null}

                {networkFamily === 'unsupported' ? (
                  <div className="rounded-[1.25rem] border border-amber-500/20 bg-amber-500/10 px-4 py-4 text-sm text-amber-100">
                    Для сети {selectedNetworkLabel} подключение кошелька здесь пока не реализовано.
                  </div>
                ) : null}
              </div>

              {walletError ? (
                <div className="mt-4 rounded-[1.25rem] border border-rose-500/20 bg-rose-500/10 px-4 py-4 text-sm text-rose-100">
                  {walletError.message}
                </div>
              ) : null}

              {hasAnyWalletConnection ? (
                <button
                  type="button"
                  onClick={() => void handleWalletDisconnect()}
                  disabled={isDisconnectPending}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-[1.25rem] border border-white/10 bg-white/[0.03] px-4 py-3 font-semibold text-white transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isDisconnectPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                  Logout
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    </>
  );
}
