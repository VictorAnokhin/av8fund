import React from 'react';
import { useCurrentAccount, useCurrentWallet } from '@mysten/dapp-kit';

import { getTransparencyOverview, type TransparencyOverview } from '../lib/api';

const EXTERNAL_WALLET_SESSION_KEY = 'av8fund.external-wallet-session';
const EXTERNAL_WALLET_SESSION_EVENT = 'av8fund:external-wallet-session';

function hasStoredExternalWalletSession(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return Boolean(window.localStorage.getItem(EXTERNAL_WALLET_SESSION_KEY));
}

type UseTransparencyOverviewResult = {
  hasWalletConnection: boolean;
  overview: TransparencyOverview | null;
  isLoading: boolean;
  loadError: string | null;
};

export function useTransparencyOverview(liveDataUnavailableMessage: string): UseTransparencyOverviewResult {
  const currentAccount = useCurrentAccount();
  const { connectionStatus } = useCurrentWallet();
  const [overview, setOverview] = React.useState<TransparencyOverview | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [hasExternalWalletSession, setHasExternalWalletSession] = React.useState(false);
  const hasWalletConnection = Boolean(currentAccount?.address) || connectionStatus === 'connected' || hasExternalWalletSession;

  React.useEffect(() => {
    setHasExternalWalletSession(hasStoredExternalWalletSession());

    if (typeof window === 'undefined') {
      return;
    }

    function syncExternalSession() {
      setHasExternalWalletSession(hasStoredExternalWalletSession());
    }

    window.addEventListener(EXTERNAL_WALLET_SESSION_EVENT, syncExternalSession as EventListener);
    window.addEventListener('storage', syncExternalSession);

    return () => {
      window.removeEventListener(EXTERNAL_WALLET_SESSION_EVENT, syncExternalSession as EventListener);
      window.removeEventListener('storage', syncExternalSession);
    };
  }, []);

  React.useEffect(() => {
    if (!hasWalletConnection) {
      setOverview(null);
      setLoadError(null);
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    async function loadOverview() {
      try {
        setIsLoading(true);
        const payload = await getTransparencyOverview();

        if (!isMounted) {
          return;
        }

        setOverview(payload);
        setLoadError(payload.error);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setLoadError(error instanceof Error ? error.message : liveDataUnavailableMessage);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadOverview();

    return () => {
      isMounted = false;
    };
  }, [hasWalletConnection, liveDataUnavailableMessage]);

  return {
    hasWalletConnection,
    overview,
    isLoading,
    loadError,
  };
}
