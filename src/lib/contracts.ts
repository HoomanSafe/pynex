import {
  createPublicClient,
  http,
  encodeFunctionData,
  parseAbi,
  formatUnits,
  keccak256,
  toBytes,
  type Address,
  type Hex,
} from 'viem';

export interface ChainNetwork {
  chainId: number;
  key: 'robinhood' | 'elysium';
  name: string;
  short: string;
  nativeSymbol: string;
  quote: string;
  explorer: string;
  rpc: string;
  icon: string;
  contracts: {
    registry: Address;
    executor: Address;
    adapter: Address;
    orders: Address;
    tokenPaymaster: Address;
    recovery: Address;
  };
}

export const PYNEX_TOKEN_CA: Address = 'TBD';
export const ENTRYPOINT_V07: Address = '0x0000000071727De22E5E9d8BAf0edAc6f37da032';
export const PYNEX_X_URL = 'https://x.com/PynexAgent';
export const HOLDER_MIN_PYNEX = 5_000_000;

export const NETWORKS: Record<number, ChainNetwork> = {
  4663: {
    chainId: 4663,
    key: 'robinhood',
    name: 'Robinhood Chain',
    short: 'Robinhood',
    nativeSymbol: 'ETH',
    quote: 'USDG',
    explorer: 'https://robinhoodchain.blockscout.com',
    rpc: 'https://rpc.mainnet.chain.robinhood.com',
    icon: '/networks/robinhood.png',
    contracts: {
      registry: '0x52078DE0B7F2372747EE5ae1d0C1f0d51460f287',
      executor: '0xC7bdCc9106019487488855A0379C1E3Cd82C51f4',
      adapter: '0x9BFC73c011480764F20cf49D23d17B91826dB04b',
      orders: '0x0447fE5a4EDe634d3446aA09985bAFc07dBf886e',
      tokenPaymaster: '0x6Cf0aDA96CeD142AAD39509301E0bC407078F737',
      recovery: '0xF420ffD824cb623182BC57af79CB5d9f7e13ec94',
    },
  },
  99901: {
    chainId: 99901,
    key: 'elysium',
    name: 'Elysium',
    short: 'Elysium',
    nativeSymbol: 'HYPE',
    quote: 'USDC',
    explorer: 'https://elysium.kinetiq.xyz/explorer',
    rpc: 'https://rpc.elysium.kinetiq.xyz',
    icon: '/networks/elysium.png',
    contracts: {
      registry: '0x9BFC73c011480764F20cf49D23d17B91826dB04b',
      executor: '0x52Cc7fe246a4861f0A6BEBdF629b47ab2C553d34',
      adapter: '0xFD005C2Ff6FE33A1bDe04Ae9734b84dfAA6FBE16',
      orders: '0x41240191F36F9C58Cf9cB1E6A4B7B6356783024A',
      tokenPaymaster: '0x1E457Bc69955A5E6E990C1C104e07986934cC6d8',
      recovery: '0xF420ffD824cb623182BC57af79CB5d9f7e13ec94',
    },
  },
};

export const ERC20_ABI = parseAbi([
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function transfer(address to, uint256 value) returns (bool)',
]);

export const EXECUTOR_ABI = [
  {
    type: 'function',
    name: 'swap',
    stateMutability: 'nonpayable',
    inputs: [
      {
        name: 's',
        type: 'tuple',
        components: [
          { name: 'actionId', type: 'bytes32' },
          { name: 'venueId', type: 'bytes32' },
          { name: 'tokenIn', type: 'address' },
          { name: 'tokenOut', type: 'address' },
          { name: 'amountIn', type: 'uint256' },
          { name: 'minAmountOut', type: 'uint256' },
          { name: 'deadline', type: 'uint256' },
          { name: 'adapterData', type: 'bytes' },
        ],
      },
    ],
    outputs: [{ name: 'amountOut', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'used',
    stateMutability: 'view',
    inputs: [
      { name: 'account', type: 'address' },
      { name: 'actionId', type: 'bytes32' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;

export const ORDERS_ABI = parseAbi([
  'function cancelOrder(bytes32 orderId) external',
  'function setTpSl(bytes32 orderId, uint256 tpPriceE8, uint256 slPriceE8) external',
]);

export function getPublicClient(chainId: number) {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  return createPublicClient({
    transport: http(`${origin}/api/v1/rpc?chain=${chainId}`, { timeout: 8000, retryCount: 1 }),
  });
}

export async function readTokenBalance(
  chainId: number,
  tokenAddress: Address,
  ownerAddress: Address,
  decimals = 18,
): Promise<number> {
  try {
    const client = getPublicClient(chainId);
    const bal = await client.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [ownerAddress],
    });
    return Number(formatUnits(bal, decimals));
  } catch {
    return 0;
  }
}

export async function readLiveBlockNumber(chainId: number): Promise<number | null> {
  try {
    const client = getPublicClient(chainId);
    const block = await client.getBlockNumber();
    return Number(block);
  } catch {
    return null;
  }
}

export function encodeCancelOrderCalldata(orderIdSeed: string): Hex {
  const orderId = keccak256(toBytes(orderIdSeed));
  return encodeFunctionData({
    abi: ORDERS_ABI,
    functionName: 'cancelOrder',
    args: [orderId],
  });
}

export function encodeErc20TransferCalldata(to: Address, amountRaw: bigint): Hex {
  return encodeFunctionData({
    abi: ERC20_ABI,
    functionName: 'transfer',
    args: [to, amountRaw],
  });
}

export interface EthereumProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
}

export function getInjectedEthereum(): EthereumProvider | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { ethereum?: EthereumProvider };
  return w.ethereum ?? null;
}

export async function connectExternalWallet(): Promise<Address> {
  const eth = getInjectedEthereum();
  if (!eth) {
    throw new Error('No browser wallet detected. Install MetaMask or Rabby, or use your PYNEX Passkey.');
  }
  const accounts = (await eth.request({ method: 'eth_requestAccounts' })) as string[];
  if (!accounts || accounts.length === 0) {
    throw new Error('No account returned by wallet.');
  }
  return accounts[0] as Address;
}

export async function switchOrAddChain(chainId: number) {
  const eth = getInjectedEthereum();
  const net = NETWORKS[chainId];
  if (!eth || !net) return;
  const hexChainId = `0x${chainId.toString(16)}`;
  try {
    await eth.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: hexChainId }] });
  } catch (err) {
    const code = (err as { code?: number })?.code;
    if (code === 4902) {
      await eth.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: hexChainId,
            chainName: net.name,
            nativeCurrency: { name: net.nativeSymbol, symbol: net.nativeSymbol, decimals: 18 },
            rpcUrls: [net.rpc],
            blockExplorerUrls: [net.explorer],
          },
        ],
      });
    } else {
      throw err;
    }
  }
}

export async function signHolderVerificationMessage(address: Address): Promise<Hex> {
  const eth = getInjectedEthereum();
  if (!eth) throw new Error('Browser wallet unavailable');
  const message = `PYNEX Holder Verification\nAddress: ${address}\nChain: Robinhood Chain (4663)\nTimestamp: ${new Date().toISOString()}\n\nThis signature is free and only proves address ownership.`;
  const sig = (await eth.request({
    method: 'personal_sign',
    params: [message, address],
  })) as Hex;
  return sig;
}

export async function sendExternalContractTx(params: {
  chainId: number;
  from: Address;
  to: Address;
  data: Hex;
}): Promise<Hex> {
  const eth = getInjectedEthereum();
  if (!eth) throw new Error('Browser wallet unavailable');
  await switchOrAddChain(params.chainId);
  const txHash = (await eth.request({
    method: 'eth_sendTransaction',
    params: [
      {
        from: params.from,
        to: params.to,
        data: params.data,
        value: '0x0',
      },
    ],
  })) as Hex;
  return txHash;
}

export function shortAddr(addr: string, left = 6, right = 4): string {
  if (!addr || addr.length < left + right + 2) return addr;
  return `${addr.slice(0, left)}…${addr.slice(-right)}`;
}

export function formatUsd(n: number): string {
  if (!Number.isFinite(n)) return '$0.00';
  if (n > 0 && n < 0.01) return `$${n.toPrecision(4)}`;
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 10_000) return `$${(n / 1_000).toFixed(1)}K`;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export function formatPrice(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '$0.00';
  if (n < 0.0001) return `$${n.toFixed(7)}`;
  if (n < 0.01) return `$${n.toFixed(5)}`;
  if (n < 1) return `$${n.toFixed(4)}`;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}
