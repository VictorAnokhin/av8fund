import React from 'react';
import {
  useCurrentAccount,
  useCurrentWallet,
  useSignAndExecuteTransaction,
  useSuiClient,
  useSuiClientQuery,
} from '@mysten/dapp-kit';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { getZkLoginSignature } from '@mysten/sui/zklogin';

import {
  AV8_BASKET_ID,
  DEPOSIT_EVENT,
  FALLBACK_FUND_SNAPSHOT,
  mapBasketObjectToSnapshot,
  REBALANCE_EVENT,
  shortAddress,
  PYTH_OBJECT_ID,
  SUI_FUND_CONFIG,
  type AiLogEntry,
  type FundSnapshot,
} from '../lib/suiFund';
import {
  EXTERNAL_WALLET_SESSION_EVENT,
  getExternalSessionAddress,
  isExternalSessionSui,
  hasStoredExternalWalletSession,
  readExternalWalletSession,
} from '../lib/externalWalletSession';
import { readZkLoginSession, ZKLOGIN_SESSION_EVENT } from '../lib/zkloginSession';
import { normalizeZkLoginSessionProofForSigning } from '../lib/zkloginProof';

type DashboardActionState = {
  busy: boolean;
  error: string | null;
  lastDigest: string | null;
};

type SuiFundDashboardState = {
  snapshot: FundSnapshot;
  isLoading: boolean;
  error: string | null;
  isUsingFallbackData: boolean;
  walletLabel: string;
  walletName: string;
  zkLoginReady: boolean;
  hasWalletConnection: boolean;
  investAmount: string;
  redeemAmount: string;
  investBalanceLabel: string;
  redeemBalanceLabel: string;
  balancesLoading: boolean;
  setInvestAmount: React.Dispatch<React.SetStateAction<string>>;
  setRedeemAmount: React.Dispatch<React.SetStateAction<string>>;
  actionState: DashboardActionState;
  executeInvest: () => Promise<void>;
  executeRedeem: () => Promise<void>;
  refresh: () => void;
};

const FUND_MODULE = 'portfolio';
const SHARE_TYPE = `${SUI_FUND_CONFIG.packageId}::${FUND_MODULE}::SHARE`;
const USDC_COIN_TYPE = '0x5dcdb5cda286590bc93d74546377d4a367e91d573041d8e137f7119041a79851::usdc::USDC';
const USDC_DECIMALS = 6;
const SHARE_DECIMALS = 6;

type CoinLike = {
  coinObjectId: string;
  balance: string;
};

function ensure0x(value: string): string {
  return value.startsWith('0x') ? value : `0x${value}`;
}

function parseDecimalAmount(value: string, decimals: number): bigint | null {
  const normalized = value.trim().replace(',', '.');
  if (!normalized) {
    return null;
  }

  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    return null;
  }

  const [whole, fraction = ''] = normalized.split('.');
  const paddedFraction = fraction.slice(0, decimals).padEnd(decimals, '0');
  const serialized = `${whole}${paddedFraction}`.replace(/^0+(?=\d)/, '');

  return BigInt(serialized || '0');
}

function formatTokenBalance(balance: bigint, decimals: number, suffix: string): string {
  const divisor = 10 ** decimals;
  const formatted = (Number(balance) / divisor).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });

  return `${formatted} ${suffix}`;
}

async function fetchAllCoins(
  client: ReturnType<typeof useSuiClient>,
  owner: string,
  coinType: string,
): Promise<CoinLike[]> {
  const coins: CoinLike[] = [];
  let cursor: string | null | undefined = null;

  do {
    const page = await client.getCoins({
      owner,
      coinType,
      cursor,
      limit: 50,
    });

    coins.push(...page.data.map((coin) => ({
      coinObjectId: coin.coinObjectId,
      balance: coin.balance,
    })));

    cursor = page.hasNextPage ? page.nextCursor : null;
  } while (cursor);

  return coins;
}

function buildCoinArgument(
  tx: Transaction,
  coins: CoinLike[],
  amount: bigint,
) {
  const primaryCoin = tx.object(coins[0].coinObjectId);

  if (coins.length > 1) {
    tx.mergeCoins(
      primaryCoin,
      coins.slice(1).map((coin) => tx.object(coin.coinObjectId)),
    );
  }

  const totalBalance = coins.reduce((sum, coin) => sum + BigInt(coin.balance), 0n);
  if (amount === totalBalance) {
    return primaryCoin;
  }

  const [splitCoin] = tx.splitCoins(primaryCoin, [tx.pure.u64(amount)]);
  return splitCoin;
}

function transactionDigestToLog(digest: string, index: number): AiLogEntry {
  return {
    id: digest,
    title: index === 0 ? 'PortfolioRebalanced observed' : 'Basket activity observed',
    summary: `Indexed transaction ${digest.slice(0, 10)} was detected on the basket path.`,
    status: index === 0 ? 'verified' : 'pending',
    timestampLabel: `${(index + 1) * 3}m ago`,
    txDigest: digest,
  };
}

/** Transport-layer RPC failures in the browser — dashboard already shows FALLBACK_FUND_SNAPSHOT. */
function isLikelyUnreachableRpcMessage(message: string): boolean {
  const m = message.trim().toLowerCase();
  return (
    m.includes('failed to fetch')
    || m.includes('load failed')
    || m.includes('networkerror')
    || m.includes('network request failed')
    || m.includes('fetch failed')
  );
}

export function useSuiFundDashboard(): SuiFundDashboardState {
  const client = useSuiClient();
  const account = useCurrentAccount();
  const { currentWallet, connectionStatus } = useCurrentWallet();
  const [hasExternalWalletSession, setHasExternalWalletSession] = React.useState(false);
  const [externalWalletAddress, setExternalWalletAddress] = React.useState('');
  const [hasZkLoginSession, setHasZkLoginSession] = React.useState(false);
  const [investAmount, setInvestAmount] = React.useState('1');
  const [redeemAmount, setRedeemAmount] = React.useState('1');
  const [investBalance, setInvestBalance] = React.useState<bigint>(0n);
  const [redeemBalance, setRedeemBalance] = React.useState<bigint>(0n);
  const [balancesLoading, setBalancesLoading] = React.useState(false);
  const [actionState, setActionState] = React.useState<DashboardActionState>({
    busy: false,
    error: null,
    lastDigest: null,
  });
  const [liveLogs, setLiveLogs] = React.useState<AiLogEntry[]>([]);
  const signAndExecuteTransaction = useSignAndExecuteTransaction();

  React.useEffect(() => {
    function syncExternalSession() {
      const session = readExternalWalletSession();
      setHasExternalWalletSession(hasStoredExternalWalletSession());
      setExternalWalletAddress(isExternalSessionSui(session) ? String(getExternalSessionAddress(session) || '') : '');
      setHasZkLoginSession(Boolean(readZkLoginSession()));
    }

    syncExternalSession();

    if (typeof window === 'undefined') {
      return;
    }

    window.addEventListener(EXTERNAL_WALLET_SESSION_EVENT, syncExternalSession as EventListener);
    window.addEventListener(ZKLOGIN_SESSION_EVENT, syncExternalSession as EventListener);
    window.addEventListener('storage', syncExternalSession);

    return () => {
      window.removeEventListener(EXTERNAL_WALLET_SESSION_EVENT, syncExternalSession as EventListener);
      window.removeEventListener(ZKLOGIN_SESSION_EVENT, syncExternalSession as EventListener);
      window.removeEventListener('storage', syncExternalSession);
    };
  }, []);

  const basketQuery = useSuiClientQuery(
    'getObject',
    {
      id: AV8_BASKET_ID,
      options: {
        showContent: true,
        showOwner: true,
        showDisplay: true,
      },
    },
    {
      enabled: Boolean(AV8_BASKET_ID),
      refetchInterval: 15_000,
    },
  );

  const activityQuery = useSuiClientQuery(
    'queryTransactionBlocks',
    {
      filter: AV8_BASKET_ID ? { InputObject: AV8_BASKET_ID } : undefined,
      options: {
        showEvents: true,
      },
      limit: 8,
      order: 'descending',
    },
    {
      enabled: Boolean(AV8_BASKET_ID),
      refetchInterval: 20_000,
    },
  );

  React.useEffect(() => {
    const subscribeEvent = (client as { subscribeEvent?: (params: unknown) => Promise<() => void> }).subscribeEvent;
    if (!subscribeEvent || !SUI_FUND_CONFIG.packageId) {
      return;
    }

    let disposed = false;
    let unsubscribe: (() => void) | null = null;

    subscribeEvent({
      filter: { Package: SUI_FUND_CONFIG.packageId },
      onMessage: (event: { id?: { txDigest?: string }; type?: string }) => {
        if (disposed) {
          return;
        }

        if (event.type && event.type !== REBALANCE_EVENT && event.type !== DEPOSIT_EVENT) {
          return;
        }

        const digest = event.id?.txDigest;
        if (!digest) {
          return;
        }

        setLiveLogs((previous) => {
          if (previous.some((entry) => entry.txDigest === digest)) {
            return previous;
          }

          return [
            {
              id: `live-${digest}`,
              title: 'Live contract event',
              summary: `Contract emitted an event for transaction ${digest.slice(0, 10)}.`,
              status: 'verified',
              timestampLabel: 'just now',
              txDigest: digest,
            },
            ...previous,
          ].slice(0, 6);
        });
      },
    })
      .then((cleanup) => {
        if (disposed) {
          cleanup();
          return;
        }
        unsubscribe = cleanup;
      })
      .catch((error) => {
        console.warn('Sui event subscription unavailable, falling back to polling.', error);
      });

    return () => {
      disposed = true;
      unsubscribe?.();
    };
  }, [client]);

  const polledLogs = React.useMemo(() => {
    const digestSource = activityQuery.data?.data ?? [];
    return digestSource
      .map((item, index) => {
        const digest = typeof item.digest === 'string' ? item.digest : '';
        return digest ? transactionDigestToLog(digest, index) : null;
      })
      .filter((entry): entry is AiLogEntry => entry !== null);
  }, [activityQuery.data]);

  const snapshot = React.useMemo(() => {
    const mapped = mapBasketObjectToSnapshot(basketQuery.data);
    const base = mapped ?? FALLBACK_FUND_SNAPSHOT;
    const aiLogs = liveLogs.length ? liveLogs : polledLogs.length ? polledLogs : base.aiLogs;

    return {
      ...base,
      aiLogs,
    };
  }, [basketQuery.data, liveLogs, polledLogs]);

  const isUsingFallbackData = !mapBasketObjectToSnapshot(basketQuery.data);

  const rpcQueryError =
    (basketQuery.error instanceof Error ? basketQuery.error.message : null)
    ?? (activityQuery.error instanceof Error ? activityQuery.error.message : null);

  const dashboardRpcError =
    rpcQueryError && !(isUsingFallbackData && isLikelyUnreachableRpcMessage(rpcQueryError))
      ? rpcQueryError
      : null;

  const currentOwnerAddress = account?.address || externalWalletAddress;

  React.useEffect(() => {
    if (!currentOwnerAddress) {
      setInvestBalance(0n);
      setRedeemBalance(0n);
      setBalancesLoading(false);
      return;
    }

    let cancelled = false;

    async function loadBalances() {
      try {
        setBalancesLoading(true);

        const [usdcCoins, shareCoins] = await Promise.all([
          fetchAllCoins(client, currentOwnerAddress, USDC_COIN_TYPE),
          fetchAllCoins(client, currentOwnerAddress, ensure0x(SHARE_TYPE)),
        ]);

        if (cancelled) {
          return;
        }

        setInvestBalance(usdcCoins.reduce((sum, coin) => sum + BigInt(coin.balance), 0n));
        setRedeemBalance(shareCoins.reduce((sum, coin) => sum + BigInt(coin.balance), 0n));
      } catch {
        if (cancelled) {
          return;
        }

        setInvestBalance(0n);
        setRedeemBalance(0n);
      } finally {
        if (!cancelled) {
          setBalancesLoading(false);
        }
      }
    }

    void loadBalances();

    return () => {
      cancelled = true;
    };
  }, [client, currentOwnerAddress]);

  const executeSignedTransaction = React.useCallback(async (transaction: Transaction) => {
    if (account?.address) {
      const result = await signAndExecuteTransaction.mutateAsync({ transaction });
      if ('digest' in result && typeof result.digest === 'string') {
        return result.digest;
      }

      throw new Error('Connected wallet did not return a transaction digest.');
    }

    const zkSession = readZkLoginSession();
    if (!zkSession) {
      throw new Error('zkLogin session is missing. Sign in with Google again.');
    }

    const signer = Ed25519Keypair.fromSecretKey(zkSession.ephemeralPrivateKey);
    const { bytes, signature: userSignature } = await transaction.sign({
      client,
      signer,
    });
    const zkSignature = getZkLoginSignature({
      inputs: normalizeZkLoginSessionProofForSigning(zkSession),
      maxEpoch: zkSession.maxEpoch,
      userSignature,
    });
    const result = await client.executeTransactionBlock({
      transactionBlock: bytes,
      signature: zkSignature,
      options: {
        showEffects: true,
      },
    });

    if (!result.digest) {
      throw new Error('zkLogin transaction finished without a digest.');
    }

    return result.digest;
  }, [account?.address, client, signAndExecuteTransaction]);

  const executeInvest = React.useCallback(async () => {
    if (!currentOwnerAddress) {
      setActionState({
        busy: false,
        error: 'Connect a Sui wallet or zkLogin session first.',
        lastDigest: null,
      });
      return;
    }

    if (!SUI_FUND_CONFIG.packageId || !SUI_FUND_CONFIG.registryId || !SUI_FUND_CONFIG.basketId) {
      setActionState({
        busy: false,
        error: 'Fund package, registry, and basket IDs are required before deposit can execute.',
        lastDigest: null,
      });
      return;
    }

    const amount = parseDecimalAmount(investAmount, USDC_DECIMALS);
    if (amount === null || amount <= 0n) {
      setActionState({
        busy: false,
        error: 'Enter a valid USDC amount greater than zero.',
        lastDigest: null,
      });
      return;
    }

    setActionState({ busy: true, error: null, lastDigest: null });

    try {
      const ownerCoins = await fetchAllCoins(client, currentOwnerAddress, USDC_COIN_TYPE);
      if (!ownerCoins.length) {
        throw new Error(`No ${USDC_COIN_TYPE} coins were found in the connected wallet.`);
      }

      const totalBalance = ownerCoins.reduce((sum, coin) => sum + BigInt(coin.balance), 0n);
      if (totalBalance < amount) {
        throw new Error(`Insufficient USDC balance. Requested ${investAmount}, available ${(Number(totalBalance) / 10 ** USDC_DECIMALS).toFixed(6)}.`);
      }

      const transaction = new Transaction();
      transaction.setSender(currentOwnerAddress);

      const depositCoin = buildCoinArgument(transaction, ownerCoins, amount);
      transaction.moveCall({
        target: `${ensure0x(SUI_FUND_CONFIG.packageId)}::${FUND_MODULE}::deposit`,
        arguments: [
          transaction.object(ensure0x(SUI_FUND_CONFIG.registryId)),
          transaction.object(ensure0x(SUI_FUND_CONFIG.basketId)),
          depositCoin,
        ],
      });

      const digest = await executeSignedTransaction(transaction);
      basketQuery.refetch();
      activityQuery.refetch();
      setInvestBalance((previous) => previous - amount);
      setActionState({
        busy: false,
        error: null,
        lastDigest: digest,
      });
    } catch (error) {
      setActionState({
        busy: false,
        error: error instanceof Error ? error.message : 'Invest transaction failed.',
        lastDigest: null,
      });
    }
  }, [client, currentOwnerAddress, executeSignedTransaction, investAmount]);

  const executeRedeem = React.useCallback(async () => {
    if (!currentOwnerAddress) {
      setActionState({
        busy: false,
        error: 'Connect a Sui wallet or zkLogin session first.',
        lastDigest: null,
      });
      return;
    }

    if (!SUI_FUND_CONFIG.packageId || !SUI_FUND_CONFIG.basketId) {
      setActionState({
        busy: false,
        error: 'Fund package and basket IDs are required before withdraw can execute.',
        lastDigest: null,
      });
      return;
    }

    const amount = parseDecimalAmount(redeemAmount, SHARE_DECIMALS);
    if (amount === null || amount <= 0n) {
      setActionState({
        busy: false,
        error: 'Enter a valid share amount greater than zero.',
        lastDigest: null,
      });
      return;
    }

    setActionState({ busy: true, error: null, lastDigest: null });

    try {
      const shareCoins = await fetchAllCoins(client, currentOwnerAddress, ensure0x(SHARE_TYPE));
      if (!shareCoins.length) {
        throw new Error('No AV8 share coins were found in the connected wallet.');
      }

      const totalBalance = shareCoins.reduce((sum, coin) => sum + BigInt(coin.balance), 0n);
      if (totalBalance < amount) {
        throw new Error(`Insufficient AV8 share balance. Requested ${redeemAmount}, available ${(Number(totalBalance) / 10 ** SHARE_DECIMALS).toFixed(6)}.`);
      }

      const transaction = new Transaction();
      transaction.setSender(currentOwnerAddress);

      const shareCoin = buildCoinArgument(transaction, shareCoins, amount);
      transaction.moveCall({
        target: `${ensure0x(SUI_FUND_CONFIG.packageId)}::${FUND_MODULE}::withdraw`,
        arguments: [
          transaction.object(ensure0x(SUI_FUND_CONFIG.basketId)),
          shareCoin,
        ],
      });

      const digest = await executeSignedTransaction(transaction);
      basketQuery.refetch();
      activityQuery.refetch();
      setRedeemBalance((previous) => previous - amount);
      setActionState({
        busy: false,
        error: null,
        lastDigest: digest,
      });
    } catch (error) {
      setActionState({
        busy: false,
        error: error instanceof Error ? error.message : 'Redeem transaction failed.',
        lastDigest: null,
      });
    }
  }, [client, currentOwnerAddress, executeSignedTransaction, redeemAmount]);

  return {
    snapshot,
    isLoading: basketQuery.isPending || activityQuery.isPending,
    error: dashboardRpcError,
    isUsingFallbackData,
    walletLabel: shortAddress(account?.address || externalWalletAddress),
    walletName: currentWallet?.name ?? 'Sui Wallet / zkLogin',
    zkLoginReady: Boolean(SUI_FUND_CONFIG.googleClientId && hasZkLoginSession),
    hasWalletConnection: connectionStatus === 'connected' || hasExternalWalletSession,
    investAmount,
    redeemAmount,
    investBalanceLabel: formatTokenBalance(investBalance, USDC_DECIMALS, 'USDC'),
    redeemBalanceLabel: formatTokenBalance(redeemBalance, SHARE_DECIMALS, 'AV8'),
    balancesLoading,
    setInvestAmount,
    setRedeemAmount,
    actionState,
    executeInvest,
    executeRedeem,
    refresh: () => {
      basketQuery.refetch();
      activityQuery.refetch();
    },
  };
}
