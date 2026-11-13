import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ExternalLink,
  KeyRound,
  Wallet,
  ShieldCheck,
  CheckCircle2,
  Bot,
  SlidersHorizontal,
  X,
  RefreshCw,
} from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { TokenIcon } from '../components/BrandLogo';
import { CandlestickChart, type Candle } from '../components/CandlestickChart';
import {
  useWallet,
  type MarketToken,
  type TradeQuoteResult,
} from '../lib/walletContext';
import {
  NETWORKS,
  formatPrice,
  formatUsd,
  shortAddr,
  readLiveBlockNumber,
} from '../lib/contracts';

export function TerminalPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    state,
    markets,
    marketsLoading,
    executeTradeQuote,
    cancelOrder,
    updateOrderTpSl,
    simulateAiProposal,
    setSignInModalOpen,
  } = useWallet();

  const [heldOnly, setHeldOnly] = useState(false);
  const [mobileTab, setMobileTab] = useState<'markets' | 'chart' | 'trade' | 'orders'>('chart');
  const [bottomTab, setBottomTab] = useState<'position' | 'orders' | 'trades'>('position');

  const paramSym = (searchParams.get('t') || 'ETH').toUpperCase();
  const paramChain = Number(searchParams.get('chain') || 0);

  const selectedToken: MarketToken = useMemo(() => {
    const match = markets.find(
      (m) =>
        m.symbol.toUpperCase() === paramSym &&
        (!paramChain || m.chainId === paramChain),
    );
    if (match) return match;
    return (
      markets.find((m) => m.symbol === 'ETH') || {
        address: '0x0bd7d308f8e1639fab988df18a8011f41eacad73',
        chainId: 4663,
        symbol: 'ETH',
        name: 'Ether',
        decimals: 18,
        priceUsd: 2142.85,
        source: 'coinbase',
        observed_at: Date.now(),
        network: 'Robinhood',
        change24h: 2.34,
      }
    );
  }, [markets, paramSym, paramChain]);

  const net = NETWORKS[selectedToken.chainId] || NETWORKS[4663];

  const [interval, setIntervalTf] = useState('15m');
  const [candles, setCandles] = useState<Candle[]>([]);
  const [candlesLoading, setCandlesLoading] = useState(true);
  const [liveBlock, setLiveBlock] = useState<number | null>(null);

  // Order ticket state
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [orderMode, setOrderMode] = useState<'market' | 'limit' | 'tpsl'>('market');
  const [amountInput, setAmountInput] = useState('100');
  const [limitPriceInput, setLimitPriceInput] = useState('');
  const [tpInput, setTpInput] = useState('');
  const [slInput, setSlInput] = useState('');
  const [slippagePct, setSlippagePct] = useState(1.0);
  const [quote, setQuote] = useState<TradeQuoteResult | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [showCalldata, setShowCalldata] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [txFeedback, setTxFeedback] = useState<{ ok: boolean; msg: string } | null>(null);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [editTp, setEditTp] = useState('');
  const [editSl, setEditSl] = useState('');

  useEffect(() => {
    setCandlesLoading(true);
    fetch(
      `/api/v1/markets/${encodeURIComponent(selectedToken.symbol)}/candles?interval=${interval}&price=${selectedToken.priceUsd}`,
    )
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.candles)) setCandles(d.candles);
      })
      .catch(() => {})
      .finally(() => setCandlesLoading(false));
  }, [selectedToken.symbol, selectedToken.priceUsd, interval]);

  useEffect(() => {
    readLiveBlockNumber(selectedToken.chainId).then(setLiveBlock);
  }, [selectedToken.chainId]);

  const parsedAmount = Math.max(0, Number(amountInput) || 0);

  useEffect(() => {
    if (parsedAmount <= 0) {
      setQuote(null);
      return;
    }
    const timer = setTimeout(() => {
      setQuoteLoading(true);
      fetch('/api/v1/trade/quote', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          chainId: selectedToken.chainId,
          side,
          tokenAddress: selectedToken.address,
          tokenSymbol: selectedToken.symbol,
          tokenDecimals: selectedToken.decimals,
          tokenPriceUsd: selectedToken.priceUsd,
          amountUsd:
            side === 'buy'
              ? parsedAmount
              : parsedAmount * selectedToken.priceUsd,
          slippageBps: Math.round(slippagePct * 100),
        }),
      })
        .then((r) => r.json())
        .then((q) => setQuote(q))
        .catch(() => {})
        .finally(() => setQuoteLoading(false));
    }, 180);
    return () => clearTimeout(timer);
  }, [
    selectedToken.chainId,
    selectedToken.address,
    selectedToken.symbol,
    selectedToken.decimals,
    selectedToken.priceUsd,
    side,
    parsedAmount,
    slippagePct,
  ]);

  const cashHolding = state.holdings.find(
    (h) => h.chainId === selectedToken.chainId && h.symbol === net.quote,
  );
  const tokenHolding = state.holdings.find(
    (h) =>
      h.chainId === selectedToken.chainId &&
      h.symbol.toUpperCase() === selectedToken.symbol.toUpperCase(),
  );

  const visibleMarkets = useMemo(() => {
    const list = markets.filter((m) => m.symbol !== 'USDG' && m.symbol !== 'USDC');
    if (!heldOnly) return list;
    return list.filter((m) =>
      state.holdings.some(
        (h) => h.symbol.toUpperCase() === m.symbol.toUpperCase() && h.amount > 0,
      ),
    );
  }, [markets, heldOnly, state.holdings]);

  const portfolioMetrics = useMemo(() => {
    let totalValue = 0;
    let cashValue = 0;
    let unrealizedPnl = 0;
    for (const h of state.holdings) {
      const m = markets.find((t) => t.symbol.toUpperCase() === h.symbol.toUpperCase());
      const curPx = h.isCash ? 1 : m?.priceUsd ?? h.avgCostUsd;
      const val = h.amount * curPx;
      totalValue += val;
      if (h.isCash) cashValue += val;
      else unrealizedPnl += (curPx - h.avgCostUsd) * h.amount;
    }
    return {
      totalValue,
      cashValue,
      unrealizedPnl,
      realizedPnl: state.realizedPnlUsd,
      totalPnl: unrealizedPnl + state.realizedPnlUsd,
    };
  }, [state.holdings, state.realizedPnlUsd, markets]);

  const pickToken = (tok: MarketToken) => {
    setSearchParams({ t: tok.symbol, chain: String(tok.chainId) });
    setTxFeedback(null);
    setMobileTab('chart');
  };

  const handleSubmitOrder = async (useInjected = false) => {
    if (!state.signedIn) {
      setSignInModalOpen(true);
      return;
    }
    if (!quote) return;
    setTxFeedback(null);

    if (side === 'buy' && (cashHolding?.amount ?? 0) < quote.amountInUsd) {
      setTxFeedback({
        ok: false,
        msg: `Insufficient ${net.quote}. Deposit ${net.quote} from the top balance button.`,
      });
      return;
    }

    if (orderMode === 'limit' && (!Number(limitPriceInput) || Number(limitPriceInput) <= 0)) {
      setTxFeedback({ ok: false, msg: 'Enter a valid limit target price.' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await executeTradeQuote(quote, orderMode, {
        limitPrice: limitPriceInput ? Number(limitPriceInput) : undefined,
        tpPrice: tpInput ? Number(tpInput) : null,
        slPrice: slInput ? Number(slInput) : null,
        useInjectedWallet: useInjected,
        source: 'you',
      });
      setTxFeedback({
        ok: true,
        msg: `Confirmed via ${res.signingMethod} · Tx ${shortAddr(res.txHash)}`,
      });
    } catch (err) {
      setTxFeedback({ ok: false, msg: (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell>
      {/* Mobile Section Switcher */}
      <div className="lg:hidden grid grid-cols-4 gap-1 p-2 border-b border-[var(--border)] bg-[var(--win)]">
        {(
          [
            ['markets', 'Markets'],
            ['chart', 'Chart'],
            ['trade', 'Trade'],
            ['orders', 'Orders'],
          ] as const
        ).map(([k, lbl]) => (
          <button
            key={k}
            type="button"
            onClick={() => setMobileTab(k)}
            className={`py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
              mobileTab === k
                ? 'bg-[var(--accent)] text-[var(--accent-ink)]'
                : 'text-[var(--text-muted)]'
            }`}
          >
            {lbl}
          </button>
        ))}
      </div>

      {/* Main 3-Column Terminal Workspace */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[248px_minmax(0,1fr)_316px] min-h-0">
        {/* Left: Markets Sidebar */}
        <aside
          className={`${
            mobileTab === 'markets' ? 'flex' : 'hidden'
          } lg:flex flex-col border-r border-[var(--border)] bg-[var(--win)] min-h-0`}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--hair)]">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Markets
            </span>
            <button
              type="button"
              onClick={() => setHeldOnly((v) => !v)}
              className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border cursor-pointer ${
                heldOnly
                  ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-text)]'
                  : 'border-[var(--border)] text-[var(--text-muted)]'
              }`}
            >
              Held
            </button>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-[var(--hair)]">
            {marketsLoading && visibleMarkets.length === 0 ? (
              <div className="p-4 text-xs text-[var(--text-muted)]">Loading markets…</div>
            ) : visibleMarkets.length === 0 ? (
              <div className="p-4 text-xs text-[var(--text-muted)]">No held tokens match filter.</div>
            ) : (
              visibleMarkets.map((tok) => {
                const isSelected =
                  tok.symbol === selectedToken.symbol && tok.chainId === selectedToken.chainId;
                return (
                  <button
                    key={`${tok.chainId}-${tok.symbol}`}
                    type="button"
                    onClick={() => pickToken(tok)}
                    className={`w-full flex items-center justify-between gap-2 px-4 py-3 text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[var(--accent-soft)]'
                        : 'hover:bg-[var(--surface-1)]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <TokenIcon symbol={tok.symbol} chainId={tok.chainId} size={26} />
                      <div className="min-w-0">
                        <div className="text-xs font-bold truncate">{tok.symbol}</div>
                        <div className="text-[11px] text-[var(--text-muted)] truncate">
                          {tok.network}
                        </div>
                      </div>
                    </div>
                    <div className="text-right font-mono tabular-nums shrink-0">
                      <div className="text-xs font-semibold">{formatPrice(tok.priceUsd)}</div>
                      <div
                        className={`text-[11px] ${
                          tok.change24h >= 0 ? 'text-[var(--good-text)]' : 'text-[var(--bad-text)]'
                        }`}
                      >
                        {tok.change24h >= 0 ? '+' : ''}
                        {tok.change24h.toFixed(2)}%
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Center: Chart + Bottom Position/Orders/Trades */}
        <div
          className={`${
            mobileTab === 'chart' || mobileTab === 'orders' ? 'flex' : 'hidden'
          } lg:flex flex-col min-w-0 min-h-0 bg-[var(--desk)]`}
        >
          {/* Token Header + Chart */}
          <section
            className={`${
              mobileTab === 'orders' ? 'hidden lg:flex' : 'flex'
            } flex-col border-b border-[var(--border)] bg-[var(--win)]`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-[var(--hair)]">
              <div className="flex items-center gap-3 min-w-0">
                <TokenIcon
                  symbol={selectedToken.symbol}
                  chainId={selectedToken.chainId}
                  logo={selectedToken.logo}
                  size={34}
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h1 className="text-base font-display font-bold">{selectedToken.symbol}</h1>
                    <span className="text-xs text-[var(--text-muted)]">{selectedToken.name}</span>
                    <span className="text-[11px] text-[var(--text-faint)]">· {net.name}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs font-mono tabular-nums mt-0.5">
                    <span className="text-sm font-bold">{formatPrice(selectedToken.priceUsd)}</span>
                    <span
                      className={
                        selectedToken.change24h >= 0
                          ? 'text-[var(--good-text)]'
                          : 'text-[var(--bad-text)]'
                      }
                    >
                      {selectedToken.change24h >= 0 ? '+' : ''}
                      {selectedToken.change24h.toFixed(2)}% (24h)
                    </span>
                    {selectedToken.volume24hUsd ? (
                      <span className="text-[var(--text-muted)]">
                        Vol {formatUsd(selectedToken.volume24hUsd)}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {liveBlock && (
                  <span className="text-[11px] font-mono text-[var(--text-muted)] tabular-nums">
                    Block #{liveBlock.toLocaleString()}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => {
                    simulateAiProposal(selectedToken);
                    setTxFeedback({
                      ok: true,
                      msg: `Claude MCP proposed a $50 ${selectedToken.symbol} buy — check Approvals.`,
                    });
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] text-xs font-semibold hover:border-[var(--accent)] cursor-pointer"
                >
                  <Bot className="w-3.5 h-3.5 text-[var(--accent-text)]" />
                  Ask AI to propose
                </button>
                <a
                  href={`${net.explorer}/token/${selectedToken.address}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text)]"
                >
                  Explorer
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            <CandlestickChart
              candles={candles}
              loading={candlesLoading}
              currentPrice={selectedToken.priceUsd}
              interval={interval}
              onIntervalChange={setIntervalTf}
            />
          </section>

          {/* Bottom Panel: Position / Orders / Market trades */}
          <section
            className={`${
              mobileTab === 'chart' ? 'hidden lg:flex' : 'flex'
            } flex-1 flex-col bg-[var(--win)] min-h-[240px]`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 border-b border-[var(--hair)]">
              <div className="flex items-center gap-1">
                {(
                  [
                    ['position', 'Position'],
                    ['orders', `Orders (${state.orders.length})`],
                    ['trades', `Market trades (${state.trades.length})`],
                  ] as const
                ).map(([k, label]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setBottomTab(k)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                      bottomTab === k
                        ? 'bg-[var(--surface-2)] text-[var(--text)]'
                        : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs font-mono tabular-nums">
                <span>
                  <span className="text-[var(--text-muted)] mr-1">Total</span>
                  <strong>{formatUsd(portfolioMetrics.totalValue)}</strong>
                </span>
                <span>
                  <span className="text-[var(--text-muted)] mr-1">Unrealized P&L</span>
                  <strong
                    className={
                      portfolioMetrics.unrealizedPnl >= 0
                        ? 'text-[var(--good-text)]'
                        : 'text-[var(--bad-text)]'
                    }
                  >
                    {portfolioMetrics.unrealizedPnl >= 0 ? '+' : ''}
                    {formatUsd(portfolioMetrics.unrealizedPnl)}
                  </strong>
                </span>
                <span>
                  <span className="text-[var(--text-muted)] mr-1">Realized P&L</span>
                  <strong
                    className={
                      portfolioMetrics.realizedPnl >= 0
                        ? 'text-[var(--good-text)]'
                        : 'text-[var(--bad-text)]'
                    }
                  >
                    {portfolioMetrics.realizedPnl >= 0 ? '+' : ''}
                    {formatUsd(portfolioMetrics.realizedPnl)}
                  </strong>
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-x-auto">
              {bottomTab === 'position' && (
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-[var(--hair)] text-[var(--text-muted)]">
                    <tr>
                      <th className="py-2.5 px-4 font-semibold">Asset</th>
                      <th className="py-2.5 px-4 font-semibold">Network</th>
                      <th className="py-2.5 px-4 font-semibold text-right">Balance</th>
                      <th className="py-2.5 px-4 font-semibold text-right">Avg Cost</th>
                      <th className="py-2.5 px-4 font-semibold text-right">Value</th>
                      <th className="py-2.5 px-4 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--hair)] font-mono tabular-nums">
                    {state.holdings
                      .filter((h) => h.amount > 0)
                      .map((h) => {
                        const m = markets.find(
                          (t) => t.symbol.toUpperCase() === h.symbol.toUpperCase(),
                        );
                        const px = h.isCash ? 1 : m?.priceUsd ?? h.avgCostUsd;
                        const val = h.amount * px;
                        return (
                          <tr key={`${h.chainId}-${h.symbol}`} className="hover:bg-[var(--surface-1)]">
                            <td className="py-2.5 px-4 font-sans font-semibold">
                              <div className="flex items-center gap-2">
                                <TokenIcon symbol={h.symbol} chainId={h.chainId} size={20} />
                                {h.symbol}
                              </div>
                            </td>
                            <td className="py-2.5 px-4 font-sans text-[var(--text-muted)]">
                              {h.network}
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              {h.amount < 10 ? h.amount.toFixed(4) : h.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-2.5 px-4 text-right text-[var(--text-muted)]">
                              {formatPrice(h.avgCostUsd)}
                            </td>
                            <td className="py-2.5 px-4 text-right font-semibold">{formatUsd(val)}</td>
                            <td className="py-2.5 px-4 text-right font-sans">
                              {!h.isCash && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSearchParams({ t: h.symbol, chain: String(h.chainId) });
                                    setSide('sell');
                                    setMobileTab('trade');
                                  }}
                                  className="px-2.5 py-1 rounded-md border border-[var(--border)] text-[11px] font-semibold hover:border-[var(--accent)] cursor-pointer"
                                >
                                  Trade
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              )}

              {bottomTab === 'orders' && (
                <div className="p-4 space-y-2">
                  {state.orders.length === 0 ? (
                    <div className="py-8 text-center text-xs text-[var(--text-muted)]">
                      No active limit or TP/SL orders. Place one from the order card on the right.
                    </div>
                  ) : (
                    state.orders.map((ord) => (
                      <div
                        key={ord.id}
                        className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] text-xs"
                      >
                        <div className="space-y-0.5">
                          <div className="font-semibold flex items-center gap-2">
                            <span className="uppercase font-mono text-[var(--accent-text)]">
                              {ord.type}
                            </span>
                            <span>
                              {ord.side.toUpperCase()} {ord.symbol}
                            </span>
                            <span className="text-[var(--text-muted)] font-normal">
                              · {ord.network}
                            </span>
                          </div>
                          <div className="text-[var(--text-muted)] font-mono tabular-nums">
                            Size {formatUsd(ord.amountUsd)}
                            {ord.limitPrice ? ` · Target ${formatPrice(ord.limitPrice)}` : ''}
                            {ord.tpPrice ? ` · TP ${formatPrice(ord.tpPrice)}` : ''}
                            {ord.slPrice ? ` · SL ${formatPrice(ord.slPrice)}` : ''}
                          </div>
                        </div>

                        {editingOrderId === ord.id ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <input
                              type="number"
                              placeholder="TP $"
                              value={editTp}
                              onChange={(e) => setEditTp(e.target.value)}
                              className="w-24 px-2 py-1 rounded-lg border border-[var(--border)] bg-[var(--well)] font-mono text-xs"
                            />
                            <input
                              type="number"
                              placeholder="SL $"
                              value={editSl}
                              onChange={(e) => setEditSl(e.target.value)}
                              className="w-24 px-2 py-1 rounded-lg border border-[var(--border)] bg-[var(--well)] font-mono text-xs"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                updateOrderTpSl(
                                  ord.id,
                                  editTp ? Number(editTp) : null,
                                  editSl ? Number(editSl) : null,
                                );
                                setEditingOrderId(null);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-[var(--accent)] text-[var(--accent-ink)] font-semibold cursor-pointer"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingOrderId(null)}
                              className="p-1 text-[var(--text-muted)] cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingOrderId(ord.id);
                                setEditTp(ord.tpPrice ? String(ord.tpPrice) : '');
                                setEditSl(ord.slPrice ? String(ord.slPrice) : '');
                              }}
                              className="px-2.5 py-1 rounded-lg border border-[var(--border)] bg-[var(--win)] font-semibold hover:border-[var(--accent)] cursor-pointer"
                            >
                              Edit TP/SL
                            </button>
                            <button
                              type="button"
                              onClick={() => cancelOrder(ord.id)}
                              className="px-2.5 py-1 rounded-lg border border-[var(--bad-line)] bg-[var(--bad-soft)] text-[var(--bad-text)] font-semibold cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {bottomTab === 'trades' && (
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-[var(--hair)] text-[var(--text-muted)]">
                    <tr>
                      <th className="py-2.5 px-4 font-semibold">Age</th>
                      <th className="py-2.5 px-4 font-semibold">Side</th>
                      <th className="py-2.5 px-4 font-semibold">Market</th>
                      <th className="py-2.5 px-4 font-semibold text-right">Amount</th>
                      <th className="py-2.5 px-4 font-semibold text-right">Value</th>
                      <th className="py-2.5 px-4 font-semibold text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--hair)] font-mono tabular-nums">
                    {state.trades.map((tr) => {
                      const trNet = NETWORKS[tr.chainId] || NETWORKS[4663];
                      const minsAgo = Math.max(1, Math.round((Date.now() - tr.timestamp) / 60_000));
                      return (
                        <tr key={tr.id} className="hover:bg-[var(--surface-1)]">
                          <td className="py-2.5 px-4 text-[var(--text-muted)]">
                            {minsAgo < 60 ? `${minsAgo}m` : `${Math.round(minsAgo / 60)}h`}
                          </td>
                          <td
                            className={`py-2.5 px-4 font-semibold uppercase ${
                              tr.side === 'buy'
                                ? 'text-[var(--good-text)]'
                                : 'text-[var(--bad-text)]'
                            }`}
                          >
                            {tr.side}
                          </td>
                          <td className="py-2.5 px-4 font-sans">
                            {tr.symbol} ·{' '}
                            <span className="text-[var(--text-muted)]">
                              {tr.source === 'assistant' ? tr.assistantName : 'You'}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            {tr.tokenAmount.toPrecision(4)} {tr.symbol}
                          </td>
                          <td className="py-2.5 px-4 text-right">{formatUsd(tr.amountUsd)}</td>
                          <td className="py-2.5 px-4 text-right">
                            <a
                              href={`${trNet.explorer}/tx/${tr.txHash}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[var(--good-text)] hover:underline"
                            >
                              Confirmed <ExternalLink className="w-3 h-3" />
                            </a>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        </div>

        {/* Right: Order Ticket & Smart Contract Signing */}
        <aside
          className={`${
            mobileTab === 'trade' ? 'flex' : 'hidden'
          } lg:flex flex-col border-l border-[var(--border)] bg-[var(--win)] p-4 space-y-4`}
        >
          {/* Buy / Sell Segmented Control */}
          <div className="grid grid-cols-2 p-1 rounded-xl bg-[var(--surface-2)]">
            <button
              type="button"
              onClick={() => setSide('buy')}
              className={`py-2 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                side === 'buy'
                  ? 'bg-[var(--accent)] text-[var(--accent-ink)]'
                  : 'text-[var(--text-muted)]'
              }`}
            >
              Buy
            </button>
            <button
              type="button"
              onClick={() => setSide('sell')}
              className={`py-2 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                side === 'sell'
                  ? 'bg-[var(--bad)] text-white'
                  : 'text-[var(--text-muted)]'
              }`}
            >
              Sell
            </button>
          </div>

          {/* Market / Limit / TP-SL Tabs */}
          <div className="flex items-center justify-between gap-1 border-b border-[var(--hair)] pb-2">
            {(
              [
                ['market', 'Market'],
                ['limit', 'Limit'],
                ['tpsl', 'TP/SL'],
              ] as const
            ).map(([k, lbl]) => (
              <button
                key={k}
                type="button"
                onClick={() => setOrderMode(k)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                  orderMode === k
                    ? 'bg-[var(--surface-2)] text-[var(--text)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}
              >
                {lbl}
              </button>
            ))}
            <span className="ml-auto text-[11px] font-mono text-[var(--text-muted)]">
              Slip ≤ {slippagePct.toFixed(1)}%
            </span>
          </div>

          {/* Amount Input */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-3 space-y-2">
            <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
              <span>{side === 'buy' ? `Pay (${net.quote})` : `Sell (${selectedToken.symbol})`}</span>
              <span className="font-mono tabular-nums">
                Bal:{' '}
                {side === 'buy'
                  ? `${(cashHolding?.amount ?? 0).toFixed(2)} ${net.quote}`
                  : `${(tokenHolding?.amount ?? 0).toPrecision(4)} ${selectedToken.symbol}`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                step="any"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                className="flex-1 min-w-0 bg-transparent text-2xl font-mono font-bold tabular-nums focus:outline-none"
              />
              <span className="px-2.5 py-1 rounded-lg bg-[var(--surface-2)] text-xs font-semibold shrink-0">
                {side === 'buy' ? net.quote : selectedToken.symbol}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1.5 pt-1">
              {side === 'buy'
                ? ['25', '100', '500', String(Math.floor(cashHolding?.amount ?? 100))].map(
                    (preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setAmountInput(preset)}
                        className="py-1 rounded-md border border-[var(--border)] bg-[var(--win)] text-[11px] font-mono font-semibold hover:border-[var(--accent)] cursor-pointer"
                      >
                        {idx === 3 ? 'Max' : `$${preset}`}
                      </button>
                    ),
                  )
                : [0.25, 0.5, 0.75, 1].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() =>
                        setAmountInput(
                          String(((tokenHolding?.amount ?? 0) * pct).toPrecision(4)),
                        )
                      }
                      className="py-1 rounded-md border border-[var(--border)] bg-[var(--win)] text-[11px] font-mono font-semibold hover:border-[var(--accent)] cursor-pointer"
                    >
                      {pct === 1 ? 'Max' : `${pct * 100}%`}
                    </button>
                  ))}
            </div>
          </div>

          {orderMode === 'limit' && (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-3 space-y-1.5">
              <label className="text-xs text-[var(--text-muted)]">
                Limit price ({net.quote} per {selectedToken.symbol})
              </label>
              <input
                type="number"
                step="any"
                placeholder={String(selectedToken.priceUsd)}
                value={limitPriceInput}
                onChange={(e) => setLimitPriceInput(e.target.value)}
                className="w-full bg-transparent text-base font-mono font-semibold tabular-nums focus:outline-none"
              />
            </div>
          )}

          {(orderMode === 'tpsl' || orderMode === 'market') && (
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-2.5 space-y-1">
                <label className="text-[11px] text-[var(--text-muted)]">Take profit ($)</label>
                <input
                  type="number"
                  step="any"
                  placeholder="Optional"
                  value={tpInput}
                  onChange={(e) => setTpInput(e.target.value)}
                  className="w-full bg-transparent text-xs font-mono font-semibold focus:outline-none"
                />
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-2.5 space-y-1">
                <label className="text-[11px] text-[var(--text-muted)]">Stop loss ($)</label>
                <input
                  type="number"
                  step="any"
                  placeholder="Optional"
                  value={slInput}
                  onChange={(e) => setSlInput(e.target.value)}
                  className="w-full bg-transparent text-xs font-mono font-semibold focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Slippage Control */}
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="inline-flex items-center gap-1 text-[var(--text-muted)]">
              <SlidersHorizontal className="w-3.5 h-3.5" /> Max slippage
            </span>
            <div className="flex items-center gap-1">
              {[0.3, 0.5, 1.0].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setSlippagePct(v)}
                  className={`px-2 py-0.5 rounded border text-[11px] font-mono cursor-pointer ${
                    slippagePct === v
                      ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-text)] font-bold'
                      : 'border-[var(--border)] text-[var(--text-muted)]'
                  }`}
                >
                  {v}%
                </button>
              ))}
            </div>
          </div>

          {/* Quote Details */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-3 space-y-1.5 text-xs font-mono tabular-nums">
            {quoteLoading && !quote ? (
              <div className="flex items-center gap-2 text-[var(--text-muted)]">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Checking route & safety…
              </div>
            ) : quote ? (
              <>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)] font-sans">Expected out</span>
                  <span className="font-semibold">
                    {quote.expectedOut.toPrecision(5)}{' '}
                    {side === 'buy' ? selectedToken.symbol : net.quote}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)] font-sans">Min out ({quote.slippagePct}%)</span>
                  <span>
                    {quote.minAmountOut.toPrecision(5)}{' '}
                    {side === 'buy' ? selectedToken.symbol : net.quote}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)] font-sans">PYNEX fee (0.25%)</span>
                  <span>${quote.pynexFeeUsd.toFixed(3)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)] font-sans">Network fee ({net.quote})</span>
                  <span>~${quote.networkFeeUsd.toFixed(2)}</span>
                </div>

                <div className="pt-1.5 border-t border-[var(--hair)] flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 text-[11px] font-sans text-[var(--good-text)]">
                    <ShieldCheck className="w-3.5 h-3.5" /> 5/5 checks passed
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowCalldata((v) => !v)}
                    className="text-[11px] font-sans underline text-[var(--text-muted)] hover:text-[var(--text)] cursor-pointer"
                  >
                    {showCalldata ? 'Hide calldata' : 'Contract calldata'}
                  </button>
                </div>

                {showCalldata && (
                  <div className="mt-2 p-2 rounded-lg bg-[var(--well)] border border-[var(--border)] text-[10px] break-all space-y-1 text-[var(--text-muted)]">
                    <div>Executor: {quote.contractCall.to}</div>
                    <div>Paymaster: {quote.contractCall.paymaster}</div>
                    <div>Calldata: {quote.contractCall.calldata.slice(0, 74)}…</div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-[var(--text-muted)] font-sans">Enter an amount for a live quote.</div>
            )}
          </div>

          {/* Execution Buttons */}
          <div className="space-y-2 mt-auto">
            <button
              type="button"
              disabled={submitting || !quote}
              onClick={() => handleSubmitOrder(false)}
              className={`w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold transition-opacity disabled:opacity-45 cursor-pointer ${
                side === 'buy'
                  ? 'bg-[var(--accent)] text-[var(--accent-ink)]'
                  : 'bg-[var(--bad)] text-white'
              }`}
            >
              <KeyRound className="w-4 h-4" />
              {submitting
                ? 'Signing UserOp…'
                : `${side === 'buy' ? 'Buy' : 'Sell'} ${selectedToken.symbol} with Passkey`}
            </button>

            {state.injectedAddress && (
              <button
                type="button"
                disabled={submitting || !quote}
                onClick={() => handleSubmitOrder(true)}
                className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] text-xs font-semibold hover:border-[var(--accent)] cursor-pointer"
              >
                <Wallet className="w-3.5 h-3.5 text-[var(--accent-text)]" />
                Sign with connected wallet ({shortAddr(state.injectedAddress)})
              </button>
            )}
          </div>

          {txFeedback && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                txFeedback.ok
                  ? 'border-[var(--good-line)] bg-[var(--good-soft)] text-[var(--good-text)]'
                  : 'border-[var(--bad-line)] bg-[var(--bad-soft)] text-[var(--bad-text)]'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{txFeedback.msg}</span>
            </div>
          )}
        </aside>
      </div>
    </AppShell>
  );
}
