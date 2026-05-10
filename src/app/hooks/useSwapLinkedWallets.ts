import React from 'react';
import { useCurrentAccount, useCurrentWallet } from '@mysten/dapp-kit';

import {
  resolveUserByWallet,
  type ResolvedUserWallet,
  type ResolvedWalletUser,
} from '../lib/api';
import {
  EXTERNAL_WALLET_SESSION_EVENT,
  getExternalSessionAddress,
  hasStoredExternalWalletSession,
  readExternalWalletSession,
  type ExternalWalletSession,
} from '../lib/externalWalletSession';
import { IDENTITY_SESSION_EVENT, readIdentitySession, type IdentitySession } from '../lib/identitySession';
import { ZKLOGIN_SESSION_EVENT, readZkLoginSession } from '../lib/zkloginSession';
import {
  inferWeb3authForLinkedAddress,
  mergeLinkedWalletsForUser,
  normalizeSwapWalletAddress,
  resolvedWalletIsSuiNetwork,
} from '../lib/swapLinkedWallets';

export type SwapLinkedWalletsState = {
  mergedLinkedWallets: ResolvedUserWallet[];
  evmLinked: ResolvedUserWallet[];
  suiLinked: ResolvedUserWallet[];
  selectedEvmAddress: string;
  setSelectedEvmAddress: React.Dispatch<React.SetStateAction<string>>;
  selectedSuiAddress: string;
  setSelectedSuiAddress: React.Dispatch<React.SetStateAction<string>>;
  lookupError: string | null;
  hasGoogleIdentity: boolean;
  resolvedUser: ResolvedWalletUser | null;
};

export function useSwapLinkedWallets(): SwapLinkedWalletsState {
  const currentAccount = useCurrentAccount();
  const { connectionStatus } = useCurrentWallet();

  const [externalSession, setExternalSession] = React.useState<ExternalWalletSession | null>(() => readExternalWalletSession());
  const [identitySession, setIdentitySession] = React.useState<IdentitySession | null>(() => readIdentitySession());
  const [zkSessionEpoch, setZkSessionEpoch] = React.useState(0);

  const [resolvedUser, setResolvedUser] = React.useState<ResolvedWalletUser | null>(null);
  const [linkedWalletsRaw, setLinkedWalletsRaw] = React.useState<ResolvedUserWallet[]>([]);
  const [lookupError, setLookupError] = React.useState<string | null>(null);
  const [selectedEvmAddress, setSelectedEvmAddress] = React.useState('');
  const [selectedSuiAddress, setSelectedSuiAddress] = React.useState('');

  React.useEffect(() => {
    function syncSessions() {
      setExternalSession(readExternalWalletSession());
      setIdentitySession(readIdentitySession());
    }

    function syncZk() {
      setZkSessionEpoch((n) => n + 1);
    }

    syncSessions();

    if (typeof window === 'undefined') {
      return;
    }

    window.addEventListener(EXTERNAL_WALLET_SESSION_EVENT, syncSessions as EventListener);
    window.addEventListener(IDENTITY_SESSION_EVENT, syncSessions as EventListener);
    window.addEventListener(ZKLOGIN_SESSION_EVENT, syncZk as EventListener);
    window.addEventListener('storage', syncSessions);

    return () => {
      window.removeEventListener(EXTERNAL_WALLET_SESSION_EVENT, syncSessions as EventListener);
      window.removeEventListener(IDENTITY_SESSION_EVENT, syncSessions as EventListener);
      window.removeEventListener(ZKLOGIN_SESSION_EVENT, syncZk as EventListener);
      window.removeEventListener('storage', syncSessions);
    };
  }, []);

  const hasWalletConnection =
    Boolean(currentAccount?.address) || connectionStatus === 'connected' || hasStoredExternalWalletSession();
  const hasIdentityAccess = Boolean(identitySession?.token && identitySession?.user);
  const currentSuiAddress = normalizeSwapWalletAddress(currentAccount?.address);
  const connectedWalletAddress =
    currentSuiAddress || normalizeSwapWalletAddress(getExternalSessionAddress(externalSession));

  React.useEffect(() => {
    if (!hasWalletConnection && hasIdentityAccess && identitySession?.user) {
      const wallets =
        Array.isArray(identitySession.user.wallets) && identitySession.user.wallets.length > 0
          ? identitySession.user.wallets
          : identitySession.user.wallet_address
            ? [{
                address: identitySession.user.wallet_address,
                network: identitySession.user.wallet_network,
                connected_at: identitySession.user.wallet_connected_at,
                web3auth: inferWeb3authForLinkedAddress(identitySession.user.wallet_address, externalSession),
              }]
            : [];

      setResolvedUser(identitySession.user);
      setLinkedWalletsRaw(wallets);
      setLookupError(null);
      return;
    }

    if (!hasWalletConnection || !connectedWalletAddress) {
      setResolvedUser(null);
      setLinkedWalletsRaw([]);
      setLookupError(null);
      return;
    }

    let cancelled = false;

    async function resolveWalletOwner() {
      setLookupError(null);

      try {
        const payload = await resolveUserByWallet(connectedWalletAddress);

        if (cancelled) {
          return;
        }

        if (payload.found && payload.user) {
          const wallets =
            Array.isArray(payload.user.wallets) && payload.user.wallets.length > 0
              ? payload.user.wallets
              : payload.user.wallet_address
                ? [{
                    address: payload.user.wallet_address,
                    network: payload.user.wallet_network,
                    connected_at: payload.user.wallet_connected_at,
                  }]
                : [];

          setResolvedUser(payload.user);
          setLinkedWalletsRaw(wallets);
          return;
        }

        const fallbackWallet: ResolvedUserWallet = {
          address: connectedWalletAddress,
          network:
            currentSuiAddress && connectedWalletAddress === currentSuiAddress
              ? 'sui'
              : externalSession?.type === 'google'
                ? externalSession.walletNetwork || 'sui'
                : externalSession?.type === 'evm'
                  ? externalSession.provider
                  : 'evm',
          connected_at: null,
          web3auth: inferWeb3authForLinkedAddress(connectedWalletAddress, externalSession),
        };

        setResolvedUser(null);
        setLinkedWalletsRaw([fallbackWallet]);
      } catch (error) {
        if (cancelled) {
          return;
        }

        const fallbackWallet: ResolvedUserWallet = {
          address: connectedWalletAddress,
          network:
            currentSuiAddress && connectedWalletAddress === currentSuiAddress
              ? 'sui'
              : externalSession?.type === 'google'
                ? externalSession.walletNetwork || 'sui'
                : externalSession?.type === 'evm'
                  ? externalSession.provider
                  : 'evm',
          connected_at: null,
          web3auth: inferWeb3authForLinkedAddress(connectedWalletAddress, externalSession),
        };

        setResolvedUser(null);
        setLinkedWalletsRaw([fallbackWallet]);
        setLookupError(error instanceof Error ? error.message : 'Failed to resolve linked wallets.');
      }
    }

    void resolveWalletOwner();

    return () => {
      cancelled = true;
    };
  }, [
    connectedWalletAddress,
    currentSuiAddress,
    externalSession?.type,
    externalSession?.provider,
    hasIdentityAccess,
    hasWalletConnection,
    identitySession?.user,
    zkSessionEpoch,
  ]);

  const mergedLinkedWallets = React.useMemo(
    () => mergeLinkedWalletsForUser(resolvedUser, linkedWalletsRaw),
    [resolvedUser, linkedWalletsRaw],
  );

  const evmLinked = React.useMemo(
    () => mergedLinkedWallets.filter((w) => !resolvedWalletIsSuiNetwork(w)),
    [mergedLinkedWallets],
  );

  const suiLinked = React.useMemo(
    () => mergedLinkedWallets.filter((w) => resolvedWalletIsSuiNetwork(w)),
    [mergedLinkedWallets],
  );

  React.useEffect(() => {
    if (evmLinked.length === 0) {
      setSelectedEvmAddress('');
      return;
    }

    const norm = normalizeSwapWalletAddress;
    const sessionAddr = norm(getExternalSessionAddress(externalSession));
    const inList = (addr: string) => addr && evmLinked.some((w) => norm(w.address) === norm(addr));
    const next = inList(sessionAddr) ? sessionAddr : norm(evmLinked[0].address);

    setSelectedEvmAddress((prev) => {
      if (prev && evmLinked.some((w) => norm(w.address) === norm(prev))) {
        return prev;
      }
      return next;
    });
  }, [evmLinked, externalSession]);

  React.useEffect(() => {
    if (suiLinked.length === 0) {
      setSelectedSuiAddress('');
      return;
    }

    const norm = normalizeSwapWalletAddress;
    const zk = readZkLoginSession();
    const zkAddr = zk ? norm(zk.walletAddress) : '';
    const acc = norm(currentAccount?.address || '');
    const prefer = (addr: string) => (addr && suiLinked.some((w) => norm(w.address) === norm(addr)) ? addr : '');
    const next = prefer(zkAddr) || prefer(acc) || norm(suiLinked[0].address);

    setSelectedSuiAddress((prev) => {
      if (prev && suiLinked.some((w) => norm(w.address) === norm(prev))) {
        return prev;
      }
      return next;
    });
  }, [suiLinked, currentAccount?.address, zkSessionEpoch]);

  return {
    mergedLinkedWallets,
    evmLinked,
    suiLinked,
    selectedEvmAddress,
    setSelectedEvmAddress,
    selectedSuiAddress,
    setSelectedSuiAddress,
    lookupError,
    hasGoogleIdentity: hasIdentityAccess,
    resolvedUser,
  };
}
