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
import { getFundTokens, type FundTokenRecord } from '../lib/api';
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
  depositToken: DepositTokenOption;
  depositTokenOptions: DepositTokenOption[];
  setDepositTokenSymbol: (symbol: string) => void;
  expectedAv8Label: string;
  formatDepositTokenBalance: (token: DepositTokenOption) => string;
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
const SHARE_TYPE = `${SUI_FUND_CONFIG.packageId}::fund_share::FUND_SHARE`;
const SUI_COIN_TYPE = '0x2::sui::SUI';
const SUI_DECIMALS = 9;
const SHARE_DECIMALS = 9;
const ACTIVE_WALLET_KEY = 'av8fund.active-wallet';
const ACTIVE_WALLET_EVENT = 'av8fund:active-wallet';

type DepositTokenOption = {
  symbol: string;
  name: string;
  coinType: string;
  decimals: number;
  balance: bigint;
  enabled: boolean;
  executable: boolean;
  whitelisted: boolean;
};

type CoinLike = {
  coinObjectId: string;
  balance: string;
};

type WalletCoinBalance = {
  coinType: string;
  balance: bigint;
};

function ensure0x(value: string): string {
  return value.startsWith('0x') ? value : `0x${value}`;
}

function sameSuiAddress(a?: string | null, b?: string | null): boolean {
  const left = String(a || '').trim().toLowerCase();
  const right = String(b || '').trim().toLowerCase();
  return Boolean(left && right && left === right);
}

function readActiveSuiWalletAddress(): string {
  if (typeof window === 'undefined') {
    return '';
  }

  try {
    const raw = window.localStorage.getItem(ACTIVE_WALLET_KEY);
    if (!raw) {
      return '';
    }

    const payload = JSON.parse(raw) as { address?: unknown; isSui?: unknown; network?: unknown };
    const address = typeof payload.address === 'string' ? payload.address.trim() : '';
    const network = typeof payload.network === 'string' ? payload.network.trim().toLowerCase() : '';
    if (!address || (payload.isSui !== true && network !== 'sui')) {
      return '';
    }

    return address;
  } catch {
    return '';
  }
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

function defaultDepositToken(): DepositTokenOption {
  return {
    symbol: 'SUI',
    name: 'Sui',
    coinType: SUI_COIN_TYPE,
    decimals: SUI_DECIMALS,
    balance: 0n,
    enabled: true,
    executable: true,
    whitelisted: true,
  };
}

function tokenFromFundRecord(record: FundTokenRecord, balance = 0n): DepositTokenOption {
  const normalizedCoinType = record.coin_type.trim();
  const isSui = normalizedCoinType.toLowerCase() === SUI_COIN_TYPE.toLowerCase();
  return {
    symbol: record.symbol || normalizedCoinType,
    name: record.name || record.symbol || normalizedCoinType,
    coinType: normalizedCoinType,
    decimals: Number.isFinite(record.decimals) ? record.decimals : SUI_DECIMALS,
    balance,
    enabled: Boolean(record.enabled),
    executable: isSui,
    whitelisted: true,
  };
}

async function fetchAllCoinBalances(
  client: ReturnType<typeof useSuiClient>,
  owner: string,
): Promise<WalletCoinBalance[]> {
  const balances = await client.getAllBalances({ owner });

  return balances.map((item) => ({
    coinType: item.coinType,
    balance: BigInt(item.totalBalance),
  }));
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

async function findOwnedPositionId(
  client: ReturnType<typeof useSuiClient>,
  owner: string,
): Promise<string | null> {
  if (!SUI_FUND_CONFIG.packageId) {
    return null;
  }

  const positionType = `${ensure0x(SUI_FUND_CONFIG.packageId)}::${FUND_MODULE}::Position`;
  let cursor: string | null | undefined = null;

  do {
    const page = await client.getOwnedObjects({
      owner,
      cursor,
      limit: 50,
      filter: {
        StructType: positionType,
      },
      options: {
        showType: true,
      },
    });

    const match = page.data.find((item) => item.data?.objectId);
    if (match?.data?.objectId) {
      return match.data.objectId;
    }

    cursor = page.hasNextPage ? page.nextCursor : null;
  } while (cursor);

  return null;
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
  const [activeSuiWalletAddress, setActiveSuiWalletAddress] = React.useState(() => readActiveSuiWalletAddress());
  const [hasZkLoginSession, setHasZkLoginSession] = React.useState(false);
  const [investAmount, setInvestAmount] = React.useState('1');
  const [depositTokenSymbol, setDepositTokenSymbol] = React.useState(SUI_COIN_TYPE);
  const [depositTokenOptions, setDepositTokenOptions] = React.useState<DepositTokenOption[]>([defaultDepositToken()]);
  const [fundTokenRecords, setFundTokenRecords] = React.useState<FundTokenRecord[]>([]);
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
  const currentOwnerAddress = activeSuiWalletAddress || account?.address || externalWalletAddress;

  React.useEffect(() => {
    function syncActiveWallet() {
      setActiveSuiWalletAddress(readActiveSuiWalletAddress());
    }

    syncActiveWallet();

    if (typeof window === 'undefined') {
      return;
    }

    window.addEventListener(ACTIVE_WALLET_EVENT, syncActiveWallet as EventListener);
    window.addEventListener('storage', syncActiveWallet);

    return () => {
      window.removeEventListener(ACTIVE_WALLET_EVENT, syncActiveWallet as EventListener);
      window.removeEventListener('storage', syncActiveWallet);
    };
  }, []);

  React.useEffect(() => {
    let cancelled = false;

    async function loadDepositTokens() {
      try {
        const records = await getFundTokens({
          network: SUI_FUND_CONFIG.network,
          packageId: SUI_FUND_CONFIG.packageId || undefined,
          includeDisabled: false,
        });
        if (cancelled) {
          return;
        }

        setFundTokenRecords(records.filter((record) => record.enabled));
      } catch {
        if (!cancelled) {
          setFundTokenRecords([]);
        }
      }
    }

    void loadDepositTokens();

    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (!currentOwnerAddress) {
      setDepositTokenOptions([defaultDepositToken()]);
      setDepositTokenSymbol(SUI_COIN_TYPE);
      return;
    }

    let cancelled = false;

    async function loadWalletTokens() {
      try {
        setBalancesLoading(true);
        const walletBalances = await fetchAllCoinBalances(client, currentOwnerAddress);
        const whitelistByType = new Map(
          fundTokenRecords.map((record) => [record.coin_type.trim().toLowerCase(), record]),
        );

        const tokens = await Promise.all(walletBalances.map(async ({ coinType, balance }) => {
          const whitelistRecord = whitelistByType.get(coinType.toLowerCase());
          if (whitelistRecord) {
            return tokenFromFundRecord(whitelistRecord, balance);
          }

          if (coinType.toLowerCase() === SUI_COIN_TYPE.toLowerCase()) {
            return { ...defaultDepositToken(), balance };
          }

          const metadata = await client.getCoinMetadata({ coinType }).catch(() => null);
          return {
            symbol: metadata?.symbol || coinType.split('::').pop() || coinType,
            name: metadata?.name || metadata?.symbol || coinType,
            coinType,
            decimals: Number.isFinite(metadata?.decimals) ? Number(metadata?.decimals) : 0,
            balance,
            enabled: false,
            executable: false,
            whitelisted: false,
          };
        }));

        const hasSui = tokens.some((token) => token.coinType.toLowerCase() === SUI_COIN_TYPE.toLowerCase());
        if (!hasSui) {
          tokens.unshift(defaultDepositToken());
        }

        tokens.sort((a, b) => {
          const aSui = a.coinType.toLowerCase() === SUI_COIN_TYPE.toLowerCase();
          const bSui = b.coinType.toLowerCase() === SUI_COIN_TYPE.toLowerCase();
          if (aSui !== bSui) {
            return aSui ? -1 : 1;
          }
          if (a.whitelisted !== b.whitelisted) {
            return a.whitelisted ? -1 : 1;
          }
          return a.symbol.localeCompare(b.symbol);
        });

        if (cancelled) {
          return;
        }

        setDepositTokenOptions(tokens);
        setDepositTokenSymbol((current) => (
          tokens.some((token) => token.coinType === current)
            ? current
            : tokens[0]?.coinType ?? SUI_COIN_TYPE
        ));
      } catch {
        if (!cancelled) {
          setDepositTokenOptions([defaultDepositToken()]);
          setDepositTokenSymbol(SUI_COIN_TYPE);
        }
      } finally {
        if (!cancelled) {
          setBalancesLoading(false);
        }
      }
    }

    void loadWalletTokens();

    return () => {
      cancelled = true;
    };
  }, [client, currentOwnerAddress, fundTokenRecords]);

  const depositToken = React.useMemo(
    () => depositTokenOptions.find((token) => token.coinType === depositTokenSymbol) ?? depositTokenOptions[0] ?? defaultDepositToken(),
    [depositTokenOptions, depositTokenSymbol],
  );

  const expectedAv8Label = React.useMemo(() => {
    const parsed = parseDecimalAmount(investAmount, depositToken.decimals);
    if (parsed === null || parsed <= 0n) {
      return '0 AV8';
    }

    if (depositToken.symbol === 'SUI') {
      return formatTokenBalance(parsed, SUI_DECIMALS, 'AV8');
    }

    return 'Calculated after oracle quote';
  }, [depositToken.decimals, depositToken.symbol, investAmount]);

  const formatDepositTokenBalance = React.useCallback(
    (token: DepositTokenOption) => formatTokenBalance(token.balance, token.decimals, token.symbol),
    [],
  );

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

        const [depositCoins, shareCoins] = await Promise.all([
          fetchAllCoins(client, currentOwnerAddress, depositToken.coinType),
          fetchAllCoins(client, currentOwnerAddress, ensure0x(SHARE_TYPE)),
        ]);

        if (cancelled) {
          return;
        }

        const nextInvestBalance = depositCoins.reduce((sum, coin) => sum + BigInt(coin.balance), 0n);
        setInvestBalance(nextInvestBalance);
        setDepositTokenOptions((current) => current.map((token) => (
          token.coinType === depositToken.coinType
            ? { ...token, balance: nextInvestBalance }
            : token
        )));
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
  }, [client, currentOwnerAddress, depositToken.coinType]);

  const executeSignedTransaction = React.useCallback(async (transaction: Transaction) => {
    if (sameSuiAddress(account?.address, currentOwnerAddress)) {
      const result = await signAndExecuteTransaction.mutateAsync({ transaction });
      if ('digest' in result && typeof result.digest === 'string') {
        return result.digest;
      }

      throw new Error('Connected wallet did not return a transaction digest.');
    }

    const zkSession = readZkLoginSession();
    if (!sameSuiAddress(zkSession?.walletAddress, currentOwnerAddress)) {
      if (account?.address && !sameSuiAddress(account.address, currentOwnerAddress)) {
        throw new Error('The connected Sui wallet does not match the selected active wallet. Switch wallet or select the connected address.');
      }
      throw new Error('No signing method is available for the selected wallet. Connect the Sui wallet or sign in with Google zkLogin again.');
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
  }, [account?.address, client, currentOwnerAddress, signAndExecuteTransaction]);

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

    if (!depositToken.executable) {
      setActionState({
        busy: false,
        error: depositToken.whitelisted
          ? `${depositToken.symbol} is whitelisted for the fund, but client deposits for this asset require portfolio.deposit_asset<T> integration and an oracle value.`
          : `${depositToken.symbol} is in the active wallet, but it is not whitelisted for fund deposits.`,
        lastDigest: null,
      });
      return;
    }

    const amount = parseDecimalAmount(investAmount, depositToken.decimals);
    if (amount === null || amount <= 0n) {
      setActionState({
        busy: false,
        error: `Enter a valid ${depositToken.symbol} amount greater than zero.`,
        lastDigest: null,
      });
      return;
    }

    setActionState({ busy: true, error: null, lastDigest: null });

    try {
      if (!SUI_FUND_CONFIG.shareConfigId) {
        throw new Error('ShareConfig object ID is required before SUI deposit can mint AV8.');
      }

      const ownerCoins = await fetchAllCoins(client, currentOwnerAddress, depositToken.coinType);
      if (!ownerCoins.length) {
        throw new Error(`No ${depositToken.symbol} coins were found in the connected wallet.`);
      }

      const totalBalance = ownerCoins.reduce((sum, coin) => sum + BigInt(coin.balance), 0n);
      if (totalBalance < amount) {
        throw new Error(`Insufficient ${depositToken.symbol} balance. Requested ${investAmount}, available ${(Number(totalBalance) / 10 ** depositToken.decimals).toFixed(Math.min(depositToken.decimals, 9))}.`);
      }

      const transaction = new Transaction();
      transaction.setSender(currentOwnerAddress);

      const [suiDepositCoin] = transaction.splitCoins(transaction.gas, [transaction.pure.u64(amount)]);
      const depositCoin = depositToken.coinType.toLowerCase() === SUI_COIN_TYPE.toLowerCase()
        ? suiDepositCoin
        : buildCoinArgument(transaction, ownerCoins, amount);
      transaction.moveCall({
        target: `${ensure0x(SUI_FUND_CONFIG.packageId)}::${FUND_MODULE}::deposit_sui_for_av8`,
        arguments: [
          transaction.object(ensure0x(SUI_FUND_CONFIG.registryId)),
          transaction.object(ensure0x(SUI_FUND_CONFIG.basketId)),
          transaction.object(ensure0x(SUI_FUND_CONFIG.shareConfigId)),
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
  }, [client, currentOwnerAddress, depositToken, executeSignedTransaction, investAmount]);

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
      if (!SUI_FUND_CONFIG.shareConfigId) {
        throw new Error('ShareConfig object ID is required before AV8 redeem can execute.');
      }

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

      transaction.moveCall({
        target: `${ensure0x(SUI_FUND_CONFIG.packageId)}::${FUND_MODULE}::redeem_sui_with_av8`,
        arguments: [
          transaction.object(ensure0x(SUI_FUND_CONFIG.basketId)),
          transaction.object(ensure0x(SUI_FUND_CONFIG.shareConfigId)),
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
    hasWalletConnection: Boolean(currentOwnerAddress) || connectionStatus === 'connected' || hasExternalWalletSession,
    investAmount,
    depositToken,
    depositTokenOptions,
    setDepositTokenSymbol,
    expectedAv8Label,
    formatDepositTokenBalance,
    redeemAmount,
    investBalanceLabel: formatTokenBalance(investBalance, depositToken.decimals, depositToken.symbol),
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
