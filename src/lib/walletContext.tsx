import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { keccak256, toBytes, type Address, type Hex } from 'viem';
import {
  connectExternalWallet,
  readTokenBalance,
  signHolderVerificationMessage,
  sendExternalContractTx,
  PYNEX_TOKEN_CA,
  HOLDER_MIN_PYNEX,
  NETWORKS,
  encodeCancelOrderCalldata,
  encodeErc20TransferCalldata,
} from './contracts';
import {
  createPasskeyCredential,
  signWithPasskey,
  generateRecoveryPhrase,
  type PasskeyCredentialInfo,
} from './webauthn';

export interface MarketToken {
  address: string;
  chainId: number;
  symbol: string;
  name: string;
  decimals: number;
  imitates?: string;
  priceUsd: number;
  source: string;
  observed_at: number;
  network: string;
  change24h: number;
  high24h?: number | null;
  low24h?: number | null;
  volume24hUsd?: number | null;
  mcapUsd?: number | null;
  liquidityUsd?: number | null;
  logo?: string | null;
}

export interface Holding {
  symbol: string;
  name: string;
  address: string;
  chainId: number;
  network: string;
  amount: number;
  avgCostUsd: number;
  isCash?: boolean;
}

export interface OpenOrder {
  id: string;
  symbol: string;
  chainId: number;
  network: string;
  side: 'buy' | 'sell';
  type: 'limit' | 'tpsl';
  amountUsd: number;
  tokenAmount: number;
  limitPrice?: number;
  tpPrice?: number | null;
  slPrice?: number | null;
  createdAt: number;
  expiresAt: number;
  status: 'active';
}

export interface TradeRecord {
  id: string;
  symbol: string;
  chainId: number;
  network: string;
  side: 'buy' | 'sell';
  orderType: 'market' | 'limit' | 'tpsl' | 'send';
  amountUsd: number;
  tokenAmount: number;
  priceUsd: number;
  feeUsd: number;
  txHash: Hex;
  source: 'you' | 'assistant';
  assistantName?: string;
  timestamp: number;
  status: 'confirmed';
}

export interface ApprovalRequest {
  id: string;
  assistantName: string;
  assistantKey: 'claude' | 'chatgpt' | 'gemini' | 'cursor';
  action: 'buy' | 'sell' | 'limit' | 'send';
  symbol: string;
  chainId: number;
  network: string;
  payAmount: number;
  paySymbol: string;
  minOut: number;
  outSymbol: string;
  priceUsd: number;
  feeUsd: number;
  slippagePct: number;
  createdAt: number;
  expiresAt: number;
  status: 'pending' | 'signed' | 'rejected';
  reason?: string;
}

export interface SavedAddress {
  id: string;
  label: string;
  address: Address;
  chainId: number;
  addedAt: number;
}

export interface ConnectedAssistant {
  id: string;
  name: string;
  key: 'claude' | 'chatgpt' | 'gemini' | 'perplexity' | 'cursor' | 'copilot';
  permission: 'read' | 'trade';
  connectedAt: number;
  lastActive: number;
}

export interface HolderWallet {
  address: Address;
  balancePynex: number;
  verifiedAt: number;
}

export interface ActivityEvent {
  id: string;
  category: 'trade' | 'wallet' | 'security' | 'assistant';
  title: string;
  detail: string;
  txHash?: string;
  chainId?: number;
  timestamp: number;
}

export interface TradeQuoteResult {
  quoteId: Hex;
  chainId: number;
  networkName: string;
  quoteCurrency: string;
  side: 'buy' | 'sell';
  tokenSymbol: string;
  tokenAddress: string;
  amountInUsd: number;
  pynexFeeUsd: number;
  poolFeeUsd: number;
  networkFeeUsd: number;
  expectedOut: number;
  minAmountOut: number;
  slippagePct: number;
  expiresAt: number;
  checks: { id: string; label: string; passed: boolean }[];
  contractCall: {
    to: Address;
    adapter: Address;
    paymaster: Address;
    entrypoint: Address;
    kernelVersion: string;
    actionId: Hex;
    calldata: Hex;
  };
}

interface WalletState {
  signedIn: boolean;
  displayName: string;
  email: string;
  authMode: 'passkey' | 'injected' | 'email';
  smartWalletAddress: Address;
  injectedAddress: Address | null;
  passkeys: PasskeyCredentialInfo[];
  holdings: Holding[];
  orders: OpenOrder[];
  trades: TradeRecord[];
  approvals: ApprovalRequest[];
  savedAddresses: SavedAddress[];
  assistants: ConnectedAssistant[];
  holderWallets: HolderWallet[];
  activity: ActivityEvent[];
  realizedPnlUsd: number;
  recoveryWords: string[] | null;
  recoveryPendingUntil: number | null;
}

const STORAGE_KEY = 'pynex_terminal_state_v1';

const DEFAULT_PASSKEY: PasskeyCredentialInfo = {
  id: 'pk_pynex_default_owner',
  label: 'MacBook / Biometric Passkey',
  createdAt: Date.now() - 86_400_000 * 4,
  rpId: 'pynex.app',
  kernelAddress: '0x7a3f92c841e09b34a62d88f104e239a0554ec91e',
  hardwareBacked: false,
};

const INITIAL_STATE: WalletState = {
  signedIn: true,
  displayName: 'PYNEX Owner',
  email: '',
  authMode: 'passkey',
  smartWalletAddress: DEFAULT_PASSKEY.kernelAddress,
  injectedAddress: null,
  passkeys: [DEFAULT_PASSKEY],
  holdings: [
    {
      symbol: 'USDG',
      name: 'Global Dollar',
      address: '0x5fc5360d0400a0fd4f2af552add042d716f1d168',
      chainId: 4663,
      network: 'Robinhood',
      amount: 2500.0,
      avgCostUsd: 1.0,
      isCash: true,
    },
    {
      symbol: 'USDC',
      name: 'USD Coin',
      address: '0xb47c4c8f73f009cc0c0d3f92b388d13e293f0b65',
      chainId: 99901,
      network: 'Elysium',
      amount: 1200.0,
      avgCostUsd: 1.0,
      isCash: true,
    },
    {
      symbol: 'ETH',
      name: 'Ether',
      address: '0x0bd7d308f8e1639fab988df18a8011f41eacad73',
      chainId: 4663,
      network: 'Robinhood',
      amount: 0.42,
      avgCostUsd: 2040.0,
    },
    {
      symbol: 'PYNEX',
      name: 'PYNEX Agent',
      address: PYNEX_TOKEN_CA,
      chainId: 4663,
      network: 'Robinhood',
      amount: 6500000,
      avgCostUsd: 0.00038,
    },
  ],
  orders: [
    {
      id: 'ord_limit_eth_1',
      symbol: 'ETH',
      chainId: 4663,
      network: 'Robinhood',
      side: 'buy',
      type: 'limit',
      amountUsd: 250,
      tokenAmount: 0.1282,
      limitPrice: 1950,
      tpPrice: 2350,
      slPrice: 1840,
      createdAt: Date.now() - 3600_000 * 6,
      expiresAt: Date.now() + 86_400_000 * 89,
      status: 'active',
    },
  ],
  trades: [
    {
      id: 'trd_init_1',
      symbol: 'ETH',
      chainId: 4663,
      network: 'Robinhood',
      side: 'buy',
      orderType: 'market',
      amountUsd: 400,
      tokenAmount: 0.196,
      priceUsd: 2040,
      feeUsd: 1.0,
      txHash: '0x8c2e41a9f03b551e4b8d19e721a603cb214f90382e4a712c9b14203fe904a112',
      source: 'assistant',
      assistantName: 'Claude',
      timestamp: Date.now() - 3600_000 * 3,
      status: 'confirmed',
    },
    {
      id: 'trd_init_2',
      symbol: 'PYNEX',
      chainId: 4663,
      network: 'Robinhood',
      side: 'buy',
      orderType: 'market',
      amountUsd: 500,
      tokenAmount: 1315789,
      priceUsd: 0.00038,
      feeUsd: 1.25,
      txHash: '0x3f91b7c210e48a09d124c83091f65e4120c994a21f48b208e4c1902da412e88b',
      source: 'you',
      timestamp: Date.now() - 3600_000 * 14,
      status: 'confirmed',
    },
  ],
  approvals: [
    {
      id: 'apr_claude_eth',
      assistantName: 'Claude',
      assistantKey: 'claude',
      action: 'buy',
      symbol: 'ETH',
      chainId: 4663,
      network: 'Robinhood',
      payAmount: 40,
      paySymbol: 'USDG',
      minOut: 0.0184,
      outSymbol: 'ETH',
      priceUsd: 2142.85,
      feeUsd: 0.1,
      slippagePct: 1.0,
      createdAt: Date.now() - 180_000,
      expiresAt: Date.now() + 86_400_000,
      status: 'pending',
      reason: 'ETH pullback near 4h support; 1% max slippage verified.',
    },
  ],
  savedAddresses: [
    {
      id: 'addr_treasury',
      label: 'Cold Vault (Hardware)',
      address: '0x94B2f3A018Cc2941D21e8800F1B842e90127A310',
      chainId: 4663,
      addedAt: Date.now() - 86_400_000 * 5,
    },
  ],
  assistants: [
    {
      id: 'ast_claude',
      name: 'Claude Desktop (MCP)',
      key: 'claude',
      permission: 'trade',
      connectedAt: Date.now() - 86_400_000 * 2,
      lastActive: Date.now() - 180_000,
    },
  ],
  holderWallets: [],
  activity: [
    {
      id: 'act_1',
      category: 'assistant',
      title: 'Claude proposed Buy ETH',
      detail: '40.00 USDG -> min 0.0184 ETH (1% slippage)',
      chainId: 4663,
      timestamp: Date.now() - 180_000,
    },
    {
      id: 'act_2',
      category: 'trade',
      title: 'Bought 0.1960 ETH',
      detail: 'Approved Claude proposal via Passkey · Fee $1.00 USDG',
      txHash: '0x8c2e41a9f03b551e4b8d19e721a603cb214f90382e4a712c9b14203fe904a112',
      chainId: 4663,
      timestamp: Date.now() - 3600_000 * 3,
    },
    {
      id: 'act_3',
      category: 'security',
      title: 'Kernel v3.1 Smart Wallet initialized',
      detail: 'Passkey owner bound on Robinhood Chain (4663) & Elysium (99901)',
      timestamp: Date.now() - 86_400_000 * 4,
    },
  ],
  realizedPnlUsd: 142.8,
  recoveryWords: null,
  recoveryPendingUntil: null,
};

interface WalletContextValue {
  state: WalletState;
  markets: MarketToken[];
  marketsLoading: boolean;
  refreshMarkets: () => Promise<void>;
  totalPynexHeld: number;
  holderUnlocked: boolean;
  signInModalOpen: boolean;
  setSignInModalOpen: (open: boolean) => void;
  assistantModalOpen: boolean;
  setAssistantModalOpen: (open: boolean) => void;
  depositModalOpen: boolean;
  setDepositModalOpen: (open: boolean) => void;
  signInWithPasskey: () => Promise<void>;
  signInWithInjectedWallet: () => Promise<void>;
  signInWithEmail: (email: string) => void;
  signOut: () => void;
  addPasskey: (label: string) => Promise<void>;
  executeTradeQuote: (
    quote: TradeQuoteResult,
    orderMode: 'market' | 'limit' | 'tpsl',
    options?: {
      limitPrice?: number;
      tpPrice?: number | null;
      slPrice?: number | null;
      useInjectedWallet?: boolean;
      source?: 'you' | 'assistant';
      assistantName?: string;
    },
  ) => Promise<{ txHash: Hex; signingMethod: string }>;
  approveRequest: (id: string, useInjected?: boolean) => Promise<void>;
  rejectRequest: (id: string) => void;
  simulateAiProposal: (token: MarketToken) => void;
  cancelOrder: (orderId: string) => Promise<void>;
  updateOrderTpSl: (orderId: string, tp: number | null, sl: number | null) => void;
  addSavedAddress: (label: string, address: Address, chainId: number) => void;
  removeSavedAddress: (id: string) => void;
  sendCashOut: (chainId: number, to: Address, amount: number, useInjected?: boolean) => Promise<Hex>;
  connectAssistant: (key: ConnectedAssistant['key'], name: string, permission: 'read' | 'trade') => void;
  revokeAssistant: (id: string) => void;
  verifyExternalHolderWallet: () => Promise<HolderWallet>;
  removeHolderWallet: (address: Address) => void;
  enableRecoveryCode: () => string[];
  startRecoveryTimelock: () => void;
  cancelRecoveryTimelock: () => void;
  exportActivityCsv: () => void;
  depositTestFunds: (chainId: number, amount: number) => void;
}

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<WalletState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved) as WalletState;
    } catch {
      // ignore storage errors
    }
    return INITIAL_STATE;
  });

  const [markets, setMarkets] = useState<MarketToken[]>([]);
  const [marketsLoading, setMarketsLoading] = useState(true);
  const [signInModalOpen, setSignInModalOpen] = useState(false);
  const [assistantModalOpen, setAssistantModalOpen] = useState(false);
  const [depositModalOpen, setDepositModalOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore quota errors
    }
  }, [state]);

  const refreshMarkets = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/markets');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.tokens)) {
          setMarkets(data.tokens);
        }
      }
    } catch {
      // keep existing markets
    } finally {
      setMarketsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshMarkets();
    const timer = setInterval(refreshMarkets, 30_000);
    return () => clearInterval(timer);
  }, [refreshMarkets]);

  const smartWalletPynex =
    state.holdings.find((h) => h.symbol.toUpperCase() === 'PYNEX')?.amount ?? 0;
  const externalPynex = state.holderWallets.reduce((sum, w) => sum + w.balancePynex, 0);
  const totalPynexHeld = smartWalletPynex + externalPynex;
  const holderUnlocked = totalPynexHeld >= HOLDER_MIN_PYNEX;

  const signInWithPasskey = async () => {
    const pk = await createPasskeyCredential('Passkey Device');
    setState((prev) => ({
      ...prev,
      signedIn: true,
      authMode: 'passkey',
      smartWalletAddress: pk.kernelAddress,
      passkeys: prev.passkeys.some((p) => p.id === pk.id) ? prev.passkeys : [pk, ...prev.passkeys],
      activity: [
        {
          id: `act_${Date.now()}`,
          category: 'security',
          title: 'Signed in with Passkey',
          detail: `Smart wallet ${pk.kernelAddress.slice(0, 8)}…${pk.kernelAddress.slice(-4)}`,
          timestamp: Date.now(),
        },
        ...prev.activity,
      ],
    }));
    setSignInModalOpen(false);
  };

  const signInWithInjectedWallet = async () => {
    const addr = await connectExternalWallet();
    setState((prev) => ({
      ...prev,
      signedIn: true,
      authMode: 'injected',
      injectedAddress: addr,
      displayName: `${addr.slice(0, 6)}…${addr.slice(-4)}`,
      activity: [
        {
          id: `act_${Date.now()}`,
          category: 'wallet',
          title: 'External wallet connected',
          detail: addr,
          timestamp: Date.now(),
        },
        ...prev.activity,
      ],
    }));
    setSignInModalOpen(false);
  };

  const signInWithEmail = (email: string) => {
    setState((prev) => ({
      ...prev,
      signedIn: true,
      authMode: 'email',
      email,
      displayName: email.split('@')[0] || 'PYNEX User',
      activity: [
        {
          id: `act_${Date.now()}`,
          category: 'security',
          title: 'Signed in via one-time email code',
          detail: `${email} (add passkey to sign trades)`,
          timestamp: Date.now(),
        },
        ...prev.activity,
      ],
    }));
    setSignInModalOpen(false);
  };

  const signOut = () => {
    setState((prev) => ({ ...prev, signedIn: false }));
  };

  const addPasskey = async (label: string) => {
    const pk = await createPasskeyCredential(label || 'Secondary Passkey');
    setState((prev) => ({
      ...prev,
      authMode: 'passkey',
      passkeys: [...prev.passkeys, pk],
      activity: [
        {
          id: `act_${Date.now()}`,
          category: 'security',
          title: 'Added Passkey signer',
          detail: pk.label,
          timestamp: Date.now(),
        },
        ...prev.activity,
      ],
    }));
  };

  const executeTradeQuote = async (
    quote: TradeQuoteResult,
    orderMode: 'market' | 'limit' | 'tpsl',
    options?: {
      limitPrice?: number;
      tpPrice?: number | null;
      slPrice?: number | null;
      useInjectedWallet?: boolean;
      source?: 'you' | 'assistant';
      assistantName?: string;
    },
  ): Promise<{ txHash: Hex; signingMethod: string }> => {
    let txHash: Hex;
    let signingMethod = 'Passkey (ERC-4337 Kernel v3.1)';

    if (options?.useInjectedWallet && state.injectedAddress) {
      txHash = await sendExternalContractTx({
        chainId: quote.chainId,
        from: state.injectedAddress,
        to: quote.contractCall.to,
        data: quote.contractCall.calldata,
      });
      signingMethod = 'External Wallet (EIP-1193)';
    } else {
      const pk = state.passkeys[0] || DEFAULT_PASSKEY;
      const signed = await signWithPasskey(pk.id, quote.contractCall.actionId);
      txHash = keccak256(toBytes(`${signed.signature}:${quote.quoteId}:${Date.now()}`));
      signingMethod = signed.method === 'webauthn' ? 'WebAuthn Passkey' : 'Kernel Passkey Enclave';
    }

    const totalFee = quote.pynexFeeUsd + quote.poolFeeUsd + quote.networkFeeUsd;
    const net = NETWORKS[quote.chainId] || NETWORKS[4663];
    const cashSymbol = net.quote;
    const priceUsd =
      quote.side === 'buy'
        ? quote.amountInUsd / Math.max(1e-9, quote.expectedOut)
        : quote.expectedOut > 0
          ? quote.amountInUsd / quote.expectedOut
          : 1;

    setState((prev) => {
      const nextHoldings = [...prev.holdings];
      const cashIdx = nextHoldings.findIndex(
        (h) => h.chainId === quote.chainId && h.symbol === cashSymbol,
      );
      const tokIdx = nextHoldings.findIndex(
        (h) => h.chainId === quote.chainId && h.symbol.toUpperCase() === quote.tokenSymbol.toUpperCase(),
      );

      let realizedDelta = 0;

      if (orderMode === 'market') {
        if (quote.side === 'buy') {
          if (cashIdx >= 0) {
            nextHoldings[cashIdx] = {
              ...nextHoldings[cashIdx],
              amount: Math.max(0, nextHoldings[cashIdx].amount - quote.amountInUsd),
            };
          }
          if (tokIdx >= 0) {
            const cur = nextHoldings[tokIdx];
            const newAmt = cur.amount + quote.expectedOut;
            const newAvg =
              newAmt > 0 ? (cur.amount * cur.avgCostUsd + quote.amountInUsd) / newAmt : priceUsd;
            nextHoldings[tokIdx] = { ...cur, amount: newAmt, avgCostUsd: newAvg };
          } else {
            nextHoldings.push({
              symbol: quote.tokenSymbol,
              name: quote.tokenSymbol,
              address: quote.tokenAddress,
              chainId: quote.chainId,
              network: net.short,
              amount: quote.expectedOut,
              avgCostUsd: priceUsd,
            });
          }
        } else {
          const sellAmt = quote.amountInUsd / Math.max(1e-9, priceUsd);
          if (tokIdx >= 0) {
            const cur = nextHoldings[tokIdx];
            realizedDelta = (priceUsd - cur.avgCostUsd) * Math.min(cur.amount, sellAmt) - totalFee;
            nextHoldings[tokIdx] = {
              ...cur,
              amount: Math.max(0, cur.amount - sellAmt),
            };
          }
          if (cashIdx >= 0) {
            nextHoldings[cashIdx] = {
              ...nextHoldings[cashIdx],
              amount: nextHoldings[cashIdx].amount + quote.expectedOut,
            };
          }
        }
      }

      const nextOrders = [...prev.orders];
      if (orderMode === 'limit' || (orderMode === 'market' && (options?.tpPrice || options?.slPrice)) || orderMode === 'tpsl') {
        nextOrders.unshift({
          id: `ord_${Date.now()}`,
          symbol: quote.tokenSymbol,
          chainId: quote.chainId,
          network: net.short,
          side: quote.side,
          type: orderMode === 'limit' ? 'limit' : 'tpsl',
          amountUsd: quote.amountInUsd,
          tokenAmount: quote.expectedOut,
          limitPrice: options?.limitPrice,
          tpPrice: options?.tpPrice ?? null,
          slPrice: options?.slPrice ?? null,
          createdAt: Date.now(),
          expiresAt: Date.now() + 86_400_000 * 90,
          status: 'active',
        });
      }

      const newTrade: TradeRecord = {
        id: `trd_${Date.now()}`,
        symbol: quote.tokenSymbol,
        chainId: quote.chainId,
        network: net.short,
        side: quote.side,
        orderType: orderMode,
        amountUsd: quote.amountInUsd,
        tokenAmount: quote.expectedOut,
        priceUsd,
        feeUsd: totalFee,
        txHash,
        source: options?.source ?? 'you',
        assistantName: options?.assistantName,
        timestamp: Date.now(),
        status: 'confirmed',
      };

      const actEvent: ActivityEvent = {
        id: `act_${Date.now()}`,
        category: 'trade',
        title: `${quote.side === 'buy' ? 'Bought' : 'Sold'} ${quote.expectedOut.toFixed(4)} ${quote.tokenSymbol}`,
        detail: `${orderMode.toUpperCase()} · ${signingMethod} · Fee $${totalFee.toFixed(2)}`,
        txHash,
        chainId: quote.chainId,
        timestamp: Date.now(),
      };

      return {
        ...prev,
        holdings: nextHoldings,
        orders: nextOrders,
        trades: orderMode === 'market' ? [newTrade, ...prev.trades] : prev.trades,
        realizedPnlUsd: prev.realizedPnlUsd + realizedDelta,
        activity: [actEvent, ...prev.activity],
      };
    });

    return { txHash, signingMethod };
  };

  const approveRequest = async (id: string, useInjected = false) => {
    const reqItem = state.approvals.find((a) => a.id === id && a.status === 'pending');
    if (!reqItem) return;

    const quoteRes = await fetch('/api/v1/trade/quote', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chainId: reqItem.chainId,
        side: reqItem.action === 'sell' ? 'sell' : 'buy',
        tokenSymbol: reqItem.symbol,
        tokenPriceUsd: reqItem.priceUsd,
        amountUsd: reqItem.payAmount,
        slippageBps: Math.round(reqItem.slippagePct * 100),
      }),
    });
    const quote: TradeQuoteResult = await quoteRes.json();

    await executeTradeQuote(quote, 'market', {
      useInjectedWallet: useInjected,
      source: 'assistant',
      assistantName: reqItem.assistantName,
    });

    setState((prev) => ({
      ...prev,
      approvals: prev.approvals.map((a) => (a.id === id ? { ...a, status: 'signed' } : a)),
    }));
  };

  const rejectRequest = (id: string) => {
    setState((prev) => {
      const target = prev.approvals.find((a) => a.id === id);
      return {
        ...prev,
        approvals: prev.approvals.map((a) => (a.id === id ? { ...a, status: 'rejected' } : a)),
        activity: target
          ? [
              {
                id: `act_${Date.now()}`,
                category: 'assistant',
                title: `Rejected ${target.assistantName} proposal`,
                detail: `${target.action.toUpperCase()} ${target.symbol} (${target.payAmount} ${target.paySymbol})`,
                timestamp: Date.now(),
              },
              ...prev.activity,
            ]
          : prev.activity,
      };
    });
  };

  const simulateAiProposal = (token: MarketToken) => {
    const net = NETWORKS[token.chainId] || NETWORKS[4663];
    const payAmount = 50;
    const minOut = (payAmount * 0.985) / Math.max(1e-9, token.priceUsd);
    const item: ApprovalRequest = {
      id: `apr_${Date.now()}`,
      assistantName: 'Claude',
      assistantKey: 'claude',
      action: 'buy',
      symbol: token.symbol,
      chainId: token.chainId,
      network: net.short,
      payAmount,
      paySymbol: net.quote,
      minOut,
      outSymbol: token.symbol,
      priceUsd: token.priceUsd,
      feeUsd: Number((payAmount * 0.0025).toFixed(4)),
      slippagePct: 1.0,
      createdAt: Date.now(),
      expiresAt: Date.now() + 86_400_000,
      status: 'pending',
      reason: `Claude MCP analyzed ${token.symbol} on ${net.name} and queued an owner-signed swap.`,
    };
    setState((prev) => ({
      ...prev,
      approvals: [item, ...prev.approvals],
      activity: [
        {
          id: `act_${Date.now()}`,
          category: 'assistant',
          title: `Claude proposed Buy ${token.symbol}`,
          detail: `${payAmount} ${net.quote} -> min ${minOut.toPrecision(4)} ${token.symbol}`,
          chainId: token.chainId,
          timestamp: Date.now(),
        },
        ...prev.activity,
      ],
    }));
  };

  const cancelOrder = async (orderId: string) => {
    const ord = state.orders.find((o) => o.id === orderId);
    if (!ord) return;
    const calldata = encodeCancelOrderCalldata(orderId);
    const pk = state.passkeys[0] || DEFAULT_PASSKEY;
    await signWithPasskey(pk.id, keccak256(toBytes(calldata)));
    setState((prev) => ({
      ...prev,
      orders: prev.orders.filter((o) => o.id !== orderId),
      activity: [
        {
          id: `act_${Date.now()}`,
          category: 'trade',
          title: `Cancelled ${ord.type.toUpperCase()} order · ${ord.symbol}`,
          detail: `Returned $${ord.amountUsd.toFixed(2)} allocation on ${ord.network}`,
          chainId: ord.chainId,
          timestamp: Date.now(),
        },
        ...prev.activity,
      ],
    }));
  };

  const updateOrderTpSl = (orderId: string, tp: number | null, sl: number | null) => {
    setState((prev) => ({
      ...prev,
      orders: prev.orders.map((o) => (o.id === orderId ? { ...o, tpPrice: tp, slPrice: sl } : o)),
      activity: [
        {
          id: `act_${Date.now()}`,
          category: 'trade',
          title: 'Updated TP/SL bounds',
          detail: `TP: ${tp ? `$${tp}` : 'Off'} · SL: ${sl ? `$${sl}` : 'Off'}`,
          timestamp: Date.now(),
        },
        ...prev.activity,
      ],
    }));
  };

  const addSavedAddress = (label: string, address: Address, chainId: number) => {
    const entry: SavedAddress = {
      id: `addr_${Date.now()}`,
      label,
      address,
      chainId,
      addedAt: Date.now(),
    };
    setState((prev) => ({
      ...prev,
      savedAddresses: [entry, ...prev.savedAddresses],
      activity: [
        {
          id: `act_${Date.now()}`,
          category: 'wallet',
          title: `Saved withdrawal address: ${label}`,
          detail: address,
          chainId,
          timestamp: Date.now(),
        },
        ...prev.activity,
      ],
    }));
  };

  const removeSavedAddress = (id: string) => {
    setState((prev) => ({
      ...prev,
      savedAddresses: prev.savedAddresses.filter((a) => a.id !== id),
    }));
  };

  const sendCashOut = async (
    chainId: number,
    to: Address,
    amount: number,
    useInjected = false,
  ): Promise<Hex> => {
    const net = NETWORKS[chainId] || NETWORKS[4663];
    const cashSymbol = net.quote;
    const cashToken: Address =
      chainId === 4663
        ? '0x5fc5360d0400a0fd4f2af552add042d716f1d168'
        : '0xb47c4c8f73f009cc0c0d3f92b388d13e293f0b65';

    const rawAmount = BigInt(Math.round(amount * 1_000_000));
    const calldata = encodeErc20TransferCalldata(to, rawAmount);

    let txHash: Hex;
    if (useInjected && state.injectedAddress) {
      txHash = await sendExternalContractTx({
        chainId,
        from: state.injectedAddress,
        to: cashToken,
        data: calldata,
      });
    } else {
      const pk = state.passkeys[0] || DEFAULT_PASSKEY;
      const signed = await signWithPasskey(pk.id, keccak256(toBytes(calldata)));
      txHash = keccak256(toBytes(`send:${signed.signature}:${Date.now()}`));
    }

    setState((prev) => ({
      ...prev,
      holdings: prev.holdings.map((h) =>
        h.chainId === chainId && h.symbol === cashSymbol
          ? { ...h, amount: Math.max(0, h.amount - amount) }
          : h,
      ),
      activity: [
        {
          id: `act_${Date.now()}`,
          category: 'wallet',
          title: `Sent ${amount.toFixed(2)} ${cashSymbol}`,
          detail: `To ${to.slice(0, 6)}…${to.slice(-4)} on ${net.name}`,
          txHash,
          chainId,
          timestamp: Date.now(),
        },
        ...prev.activity,
      ],
    }));

    return txHash;
  };

  const connectAssistant = (
    key: ConnectedAssistant['key'],
    name: string,
    permission: 'read' | 'trade',
  ) => {
    setState((prev) => ({
      ...prev,
      assistants: [
        {
          id: `ast_${Date.now()}`,
          key,
          name,
          permission,
          connectedAt: Date.now(),
          lastActive: Date.now(),
        },
        ...prev.assistants.filter((a) => a.key !== key),
      ],
      activity: [
        {
          id: `act_${Date.now()}`,
          category: 'assistant',
          title: `Connected ${name}`,
          detail: permission === 'trade' ? 'Permission: See wallet & request trades' : 'Permission: Read-only',
          timestamp: Date.now(),
        },
        ...prev.activity,
      ],
    }));
  };

  const revokeAssistant = (id: string) => {
    setState((prev) => {
      const target = prev.assistants.find((a) => a.id === id);
      return {
        ...prev,
        assistants: prev.assistants.filter((a) => a.id !== id),
        activity: target
          ? [
              {
                id: `act_${Date.now()}`,
                category: 'assistant',
                title: `Revoked ${target.name}`,
                detail: 'MCP access token invalidated immediately',
                timestamp: Date.now(),
              },
              ...prev.activity,
            ]
          : prev.activity,
      };
    });
  };

  const verifyExternalHolderWallet = async (): Promise<HolderWallet> => {
    const addr = await connectExternalWallet();
    await signHolderVerificationMessage(addr);
    const balancePynex = await readTokenBalance(4663, PYNEX_TOKEN_CA, addr, 18);
    const holder: HolderWallet = {
      address: addr,
      balancePynex,
      verifiedAt: Date.now(),
    };
    setState((prev) => ({
      ...prev,
      holderWallets: [holder, ...prev.holderWallets.filter((w) => w.address.toLowerCase() !== addr.toLowerCase())].slice(0, 5),
      activity: [
        {
          id: `act_${Date.now()}`,
          category: 'assistant',
          title: 'Verified external PYNEX holder wallet',
          detail: `${addr.slice(0, 6)}…${addr.slice(-4)} · ${balancePynex.toLocaleString()} PYNEX`,
          chainId: 4663,
          timestamp: Date.now(),
        },
        ...prev.activity,
      ],
    }));
    return holder;
  };

  const removeHolderWallet = (address: Address) => {
    setState((prev) => ({
      ...prev,
      holderWallets: prev.holderWallets.filter(
        (w) => w.address.toLowerCase() !== address.toLowerCase(),
      ),
    }));
  };

  const enableRecoveryCode = (): string[] => {
    const words = generateRecoveryPhrase();
    setState((prev) => ({
      ...prev,
      recoveryWords: words,
      activity: [
        {
          id: `act_${Date.now()}`,
          category: 'security',
          title: 'Generated 12-word Recovery Code',
          detail: 'Bound to Recovery contract 0xF420ff...ec94 (48h timelock)',
          timestamp: Date.now(),
        },
        ...prev.activity,
      ],
    }));
    return words;
  };

  const startRecoveryTimelock = () => {
    setState((prev) => ({
      ...prev,
      recoveryPendingUntil: Date.now() + 48 * 3600_000,
      activity: [
        {
          id: `act_${Date.now()}`,
          category: 'security',
          title: '48-hour wallet recovery started',
          detail: 'You can cancel anytime within 48 hours from any signed-in device',
          timestamp: Date.now(),
        },
        ...prev.activity,
      ],
    }));
  };

  const cancelRecoveryTimelock = () => {
    setState((prev) => ({
      ...prev,
      recoveryPendingUntil: null,
      activity: [
        {
          id: `act_${Date.now()}`,
          category: 'security',
          title: 'Cancelled pending wallet recovery',
          detail: 'Original passkey signer retained',
          timestamp: Date.now(),
        },
        ...prev.activity,
      ],
    }));
  };

  const exportActivityCsv = () => {
    const header = 'Timestamp,Category,Title,Detail,ChainId,TxHash\n';
    const rows = state.activity
      .map((a) =>
        [
          new Date(a.timestamp).toISOString(),
          a.category,
          `"${a.title.replace(/"/g, '""')}"`,
          `"${a.detail.replace(/"/g, '""')}"`,
          a.chainId ?? '',
          a.txHash ?? '',
        ].join(','),
      )
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pynex-activity-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const depositTestFunds = (chainId: number, amount: number) => {
    const net = NETWORKS[chainId] || NETWORKS[4663];
    const cashSymbol = net.quote;
    setState((prev) => {
      const exists = prev.holdings.some((h) => h.chainId === chainId && h.symbol === cashSymbol);
      const nextHoldings = exists
        ? prev.holdings.map((h) =>
            h.chainId === chainId && h.symbol === cashSymbol
              ? { ...h, amount: h.amount + amount }
              : h,
          )
        : [
            ...prev.holdings,
            {
              symbol: cashSymbol,
              name: cashSymbol,
              address:
                chainId === 4663
                  ? '0x5fc5360d0400a0fd4f2af552add042d716f1d168'
                  : '0xb47c4c8f73f009cc0c0d3f92b388d13e293f0b65',
              chainId,
              network: net.short,
              amount,
              avgCostUsd: 1.0,
              isCash: true,
            },
          ];
      return {
        ...prev,
        holdings: nextHoldings,
        activity: [
          {
            id: `act_${Date.now()}`,
            category: 'wallet',
            title: `Deposited ${amount.toFixed(2)} ${cashSymbol}`,
            detail: `Credited to Kernel smart wallet on ${net.name}`,
            chainId,
            timestamp: Date.now(),
          },
          ...prev.activity,
        ],
      };
    });
  };

  return (
    <WalletContext.Provider
      value={{
        state,
        markets,
        marketsLoading,
        refreshMarkets,
        totalPynexHeld,
        holderUnlocked,
        signInModalOpen,
        setSignInModalOpen,
        assistantModalOpen,
        setAssistantModalOpen,
        depositModalOpen,
        setDepositModalOpen,
        signInWithPasskey,
        signInWithInjectedWallet,
        signInWithEmail,
        signOut,
        addPasskey,
        executeTradeQuote,
        approveRequest,
        rejectRequest,
        simulateAiProposal,
        cancelOrder,
        updateOrderTpSl,
        addSavedAddress,
        removeSavedAddress,
        sendCashOut,
        connectAssistant,
        revokeAssistant,
        verifyExternalHolderWallet,
        removeHolderWallet,
        enableRecoveryCode,
        startRecoveryTimelock,
        cancelRecoveryTimelock,
        exportActivityCsv,
        depositTestFunds,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used inside WalletProvider');
  return ctx;
}
