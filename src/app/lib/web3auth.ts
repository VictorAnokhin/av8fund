import {
  CHAIN_NAMESPACES,
  WALLET_ADAPTERS,
  type CustomChainConfig,
  type IProvider,
} from '@web3auth/base';
import { LOGIN_PROVIDER, WEB3AUTH_NETWORK as WEB3AUTH_NETWORKS } from '@web3auth/auth-adapter';
import { EthereumPrivateKeyProvider } from '@web3auth/ethereum-provider';
import { Web3Auth } from '@web3auth/modal';

import {
  EVM_CHAIN_ID,
  EVM_CHAIN_NAME,
  EVM_RPC_URL,
  WEB3AUTH_CLIENT_ID,
  WEB3AUTH_NETWORK,
} from '../config';

type Eip1193LikeProvider = IProvider & {
  request: (args: { method: string; params?: unknown[] | object }) => Promise<unknown>;
};

export type GoogleEvmSession = {
  address: string;
  chainId: string | null;
  email: string;
  name: string;
  picture?: string;
  sub: string;
};

const chainConfig: CustomChainConfig = {
  chainNamespace: CHAIN_NAMESPACES.EIP155,
  chainId: EVM_CHAIN_ID,
  rpcTarget: EVM_RPC_URL,
  displayName: EVM_CHAIN_NAME,
  ticker: 'ETH',
  tickerName: 'Ethereum',
};

let web3AuthPromise: Promise<Web3Auth> | null = null;

function getWeb3AuthNetwork() {
  const candidate = WEB3AUTH_NETWORKS[WEB3AUTH_NETWORK as keyof typeof WEB3AUTH_NETWORKS];
  return candidate ?? WEB3AUTH_NETWORKS.SAPPHIRE_MAINNET;
}

function asEip1193Provider(provider: IProvider | null): Eip1193LikeProvider | null {
  if (!provider || typeof provider !== 'object' || typeof (provider as { request?: unknown }).request !== 'function') {
    return null;
  }

  return provider as Eip1193LikeProvider;
}

async function getWeb3AuthInstance(): Promise<Web3Auth> {
  if (!WEB3AUTH_CLIENT_ID) {
    throw new Error('Web3Auth client ID is missing.');
  }

  if (!web3AuthPromise) {
    web3AuthPromise = (async () => {
      const privateKeyProvider = new EthereumPrivateKeyProvider({
        config: { chainConfig },
      });

      const web3auth = new Web3Auth({
        clientId: WEB3AUTH_CLIENT_ID,
        web3AuthNetwork: getWeb3AuthNetwork(),
        chainConfig,
        privateKeyProvider,
      });

      await web3auth.initModal();
      return web3auth;
    })();
  }

  return web3AuthPromise;
}

async function readGoogleEvmSessionFromWeb3Auth(web3auth: Web3Auth, eip1193Provider: Eip1193LikeProvider): Promise<GoogleEvmSession> {
  const accounts = await eip1193Provider.request({
    method: 'eth_accounts',
  });
  const address = Array.isArray(accounts) && typeof accounts[0] === 'string' ? accounts[0] : '';

  if (!address) {
    throw new Error('Web3Auth did not return an EVM account.');
  }

  const chainIdResponse = await eip1193Provider.request({
    method: 'eth_chainId',
  }).catch(() => null);
  const chainId = typeof chainIdResponse === 'string' ? chainIdResponse : null;
  const userInfo = await web3auth.getUserInfo();

  return {
    address,
    chainId,
    email: String(userInfo.email || ''),
    name: String(userInfo.name || userInfo.email || 'Google'),
    picture: typeof userInfo.profileImage === 'string' ? userInfo.profileImage : undefined,
    sub: String(userInfo.verifierId || address),
  };
}

export async function connectGoogleEvmSession(): Promise<GoogleEvmSession> {
  const web3auth = await getWeb3AuthInstance();
  const provider = await web3auth.connectTo(WALLET_ADAPTERS.AUTH, {
    loginProvider: LOGIN_PROVIDER.GOOGLE,
    mfaLevel: 'none',
    extraLoginOptions: {
      prompt: 'select_account',
    },
  });
  const eip1193Provider = asEip1193Provider(provider);

  if (!eip1193Provider) {
    throw new Error('Web3Auth did not return an EVM provider.');
  }

  return readGoogleEvmSessionFromWeb3Auth(web3auth, eip1193Provider);
}

export async function getGoogleEvmProvider(): Promise<Eip1193LikeProvider | null> {
  const web3auth = await getWeb3AuthInstance();
  return asEip1193Provider(web3auth.provider);
}

export async function disconnectGoogleEvmSession(): Promise<void> {
  try {
    const web3auth = await getWeb3AuthInstance();
    await web3auth.logout({ cleanup: true });
  } finally {
    web3AuthPromise = null;
  }
}
