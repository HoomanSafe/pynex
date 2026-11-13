import React, { useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Copy,
  Check,
  Download,
  Plus,
  Trash2,
  KeyRound,
  ShieldAlert,
  Send,
  QrCode,
  Bot,
  ExternalLink,
} from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { TokenIcon } from '../components/BrandLogo';
import { useWallet } from '../lib/walletContext';
import { NETWORKS, formatPrice, formatUsd, shortAddr } from '../lib/contracts';
import type { Address } from 'viem';

export function ProfilePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') || 'portfolio') as
    | 'portfolio'
    | 'activity'
    | 'addresses'
    | 'security';

  const {
    state,
    markets,
    setDepositModalOpen,
    setAssistantModalOpen,
    addSavedAddress,
    removeSavedAddress,
    addPasskey,
    enableRecoveryCode,
    startRecoveryTimelock,
    cancelRecoveryTimelock,
    exportActivityCsv,
  } = useWallet();

  const [copiedWallet, setCopiedWallet] = useState(false);
  const [tradeFilter, setTradeFilter] = useState<'all' | 'you' | 'assistant'>('all');
  const [activityFilter, setActivityFilter] = useState<string>('all');

  // Address form
  const [addrLabel, setAddrLabel] = useState('');
  const [addrHex, setAddrHex] = useState('');
  const [addrChain, setAddrChain] = useState(4663);
  const [addrErr, setAddrErr] = useState<string | null>(null);

  // Passkey form
  const [passkeyLabel, setPasskeyLabel] = useState('');
  const [showRecoveryWords, setShowRecoveryWords] = useState(false);

  const stats = useMemo(() => {
    let total = 0;
    let cash = 0;
    let invested = 0;
    for (const h of state.holdings) {
      const m = markets.find((t) => t.symbol.toUpperCase() === h.symbol.toUpperCase());
      const px = h.isCash ? 1 : m?.priceUsd ?? h.avgCostUsd;
      const val = h.amount * px;
      total += val;
      if (h.isCash) cash += val;
      else invested += val;
    }
    return { total, cash, invested };
  }, [state.holdings, markets]);

  const copyWallet = () => {
    navigator.clipboard.writeText(state.smartWalletAddress);
    setCopiedWallet(true);
    setTimeout(() => setCopiedWallet(false), 1600);
  };

  const filteredTrades = state.trades.filter((t) =>
    tradeFilter === 'all' ? true : t.source === tradeFilter,
  );

  const filteredActivity = state.activity.filter((a) =>
    activityFilter === 'all' ? true : a.category === activityFilter,
  );

  const handleAddAddr = (e: React.FormEvent) => {
    e.preventDefault();
    setAddrErr(null);
    if (!addrLabel.trim()) {
      setAddrErr('Enter a recognizable label.');
      return;
    }
    if (!/^0x[a-fA-F0-9]{40}$/.test(addrHex.trim())) {
      setAddrErr('Enter a valid 42-character 0x EVM address.');
      return;
    }
    addSavedAddress(addrLabel.trim(), addrHex.trim() as Address, addrChain);
    setAddrLabel('');
    setAddrHex('');
  };

  return (
    <AppShell>
      <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Profile Header Banner */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--win)] overflow-hidden">
          <div className="h-20 bg-gradient-to-r from-[#23201f] via-[#2b3833] to-[#1b1918] border-b border-[var(--hair)]" />
          <div className="px-5 pb-5 flex flex-wrap items-end justify-between gap-4 -mt-8">
            <div className="flex items-end gap-4 min-w-0">
              <div className="w-16 h-16 rounded-2xl border-4 border-[var(--win)] bg-[#353130] text-[#77fbca] flex items-center justify-center font-display font-bold text-2xl shrink-0">
                P
              </div>
              <div className="pt-8 min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-display font-bold truncate">{state.displayName}</h1>
                  <span className="text-xs font-mono text-[var(--accent-text)]">Kernel v3.1</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono text-[var(--text-muted)]">
                  <span>{shortAddr(state.smartWalletAddress, 8, 6)}</span>
                  <button
                    type="button"
                    onClick={copyWallet}
                    className="inline-flex items-center gap-1 hover:text-[var(--text)] cursor-pointer"
                  >
                    {copiedWallet ? <Check className="w-3.5 h-3.5 text-[var(--good-text)]" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDepositModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[var(--accent)] text-[var(--accent-ink)] text-xs font-bold cursor-pointer"
              >
                <QrCode className="w-3.5 h-3.5" /> Deposit / Send
              </button>
              <button
                type="button"
                onClick={() => setAssistantModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] text-xs font-semibold cursor-pointer"
              >
                <Bot className="w-3.5 h-3.5 text-[var(--accent-text)]" /> AI apps ({state.assistants.length})
              </button>
            </div>
          </div>

          {/* Sub-navigation tabs */}
          <div className="flex items-center gap-1 px-5 border-t border-[var(--hair)] overflow-x-auto">
            {(
              [
                ['portfolio', 'Portfolio'],
                ['activity', 'Activity'],
                ['addresses', 'Addresses'],
                ['security', 'Security'],
              ] as const
            ).map(([k, lbl]) => (
              <button
                key={k}
                type="button"
                onClick={() => setSearchParams({ tab: k })}
                className={`px-4 py-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === k
                    ? 'border-[var(--accent)] text-[var(--text)]'
                    : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}
              >
                {lbl}
              </button>
            ))}
          </div>
        </div>

        {/* PORTFOLIO TAB */}
        {activeTab === 'portfolio' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: 'Total value', val: formatUsd(stats.total) },
                { label: 'Cash (stablecoins)', val: formatUsd(stats.cash) },
                { label: 'Invested', val: formatUsd(stats.invested) },
              ].map((card) => (
                <div
                  key={card.label}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--win)] p-5 space-y-1"
                >
                  <div className="text-xs text-[var(--text-muted)]">{card.label}</div>
                  <div className="text-2xl font-display font-bold font-mono tabular-nums">
                    {card.val}
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--win)] overflow-x-auto">
              <div className="px-5 py-3.5 border-b border-[var(--hair)] font-display font-bold text-sm">
                Top holdings
              </div>
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[var(--hair)] text-[var(--text-muted)]">
                  <tr>
                    <th className="py-2.5 px-5 font-semibold">Asset</th>
                    <th className="py-2.5 px-5 font-semibold text-right">Balance</th>
                    <th className="py-2.5 px-5 font-semibold text-right">Price</th>
                    <th className="py-2.5 px-5 font-semibold text-right">Value</th>
                    <th className="py-2.5 px-5 font-semibold text-right">P/L</th>
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
                      const pnl = h.isCash ? 0 : (px - h.avgCostUsd) * h.amount;
                      return (
                        <tr key={`${h.chainId}-${h.symbol}`} className="hover:bg-[var(--surface-1)]">
                          <td className="py-3 px-5 font-sans font-semibold">
                            <Link
                              to={`/app?t=${h.symbol}&chain=${h.chainId}`}
                              className="flex items-center gap-2.5 hover:underline"
                            >
                              <TokenIcon symbol={h.symbol} chainId={h.chainId} size={24} />
                              <span>{h.symbol}</span>
                              <span className="text-[var(--text-muted)] font-normal">
                                {h.network}
                              </span>
                            </Link>
                          </td>
                          <td className="py-3 px-5 text-right">
                            {h.amount < 10
                              ? h.amount.toFixed(4)
                              : h.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-5 text-right">{formatPrice(px)}</td>
                          <td className="py-3 px-5 text-right font-semibold">{formatUsd(val)}</td>
                          <td
                            className={`py-3 px-5 text-right ${
                              pnl >= 0 ? 'text-[var(--good-text)]' : 'text-[var(--bad-text)]'
                            }`}
                          >
                            {h.isCash ? '—' : `${pnl >= 0 ? '+' : ''}${formatUsd(pnl)}`}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--win)] overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5 border-b border-[var(--hair)]">
                <span className="font-display font-bold text-sm">Recent trades</span>
                <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[var(--surface-2)]">
                  {(['all', 'you', 'assistant'] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setTradeFilter(f)}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold capitalize cursor-pointer ${
                        tradeFilter === f
                          ? 'bg-[var(--win)] text-[var(--text)]'
                          : 'text-[var(--text-muted)]'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
              <div className="divide-y divide-[var(--hair)]">
                {filteredTrades.map((t) => {
                  const net = NETWORKS[t.chainId] || NETWORKS[4663];
                  return (
                    <div
                      key={t.id}
                      className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-xs"
                    >
                      <div>
                        <span
                          className={`font-mono font-bold uppercase mr-2 ${
                            t.side === 'buy'
                              ? 'text-[var(--good-text)]'
                              : 'text-[var(--bad-text)]'
                          }`}
                        >
                          {t.side}
                        </span>
                        <span className="font-semibold">{t.symbol}</span>
                        <span className="text-[var(--text-muted)] ml-2">
                          via {t.source === 'assistant' ? t.assistantName : 'You'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 font-mono tabular-nums">
                        <span>{formatUsd(t.amountUsd)}</span>
                        <a
                          href={`${net.explorer}/tx/${t.txHash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[var(--accent-text)] hover:underline"
                        >
                          Tx <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ACTIVITY TAB */}
        {activeTab === 'activity' && (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--win)] overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-[var(--hair)]">
              <div className="flex flex-wrap items-center gap-1">
                {['all', 'trade', 'wallet', 'security', 'assistant'].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActivityFilter(cat)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize cursor-pointer ${
                      activityFilter === cat
                        ? 'bg-[var(--surface-2)] text-[var(--text)]'
                        : 'text-[var(--text-muted)]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={exportActivityCsv}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] text-xs font-semibold hover:border-[var(--accent)] cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> Export CSV
              </button>
            </div>
            <div className="divide-y divide-[var(--hair)]">
              {filteredActivity.map((ev) => (
                <div
                  key={ev.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 text-xs"
                >
                  <div>
                    <div className="font-semibold">{ev.title}</div>
                    <div className="text-[var(--text-muted)] font-mono mt-0.5">{ev.detail}</div>
                  </div>
                  <div className="text-[var(--text-faint)] font-mono tabular-nums">
                    {new Date(ev.timestamp).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ADDRESSES TAB */}
        {activeTab === 'addresses' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 rounded-2xl border border-[var(--border)] bg-[var(--win)] overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--hair)]">
                <span className="font-display font-bold text-sm">Address book</span>
                <button
                  type="button"
                  onClick={() => setDepositModalOpen(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent-text)] cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" /> Send cash
                </button>
              </div>
              <div className="divide-y divide-[var(--hair)]">
                {state.savedAddresses.length === 0 ? (
                  <div className="p-6 text-xs text-[var(--text-muted)]">
                    No saved addresses yet. Add one to enable cash withdrawals.
                  </div>
                ) : (
                  state.savedAddresses.map((sa) => (
                    <div
                      key={sa.id}
                      className="flex items-center justify-between gap-3 px-5 py-3.5 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold">
                          {sa.label}{' '}
                          <span className="text-[var(--good-text)] font-mono ml-1">Ready</span>
                        </div>
                        <div className="font-mono text-[var(--text-muted)] truncate mt-0.5">
                          {sa.address} · {NETWORKS[sa.chainId]?.name || 'Robinhood Chain'}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeSavedAddress(sa.id)}
                        className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--bad-text)] cursor-pointer"
                        aria-label="Remove address"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <form
              onSubmit={handleAddAddr}
              className="lg:col-span-5 rounded-2xl border border-[var(--border)] bg-[var(--win)] p-5 space-y-3 self-start"
            >
              <div className="font-display font-bold text-sm flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-[var(--accent-text)]" /> Add saved address
              </div>
              <input
                type="text"
                value={addrLabel}
                onChange={(e) => setAddrLabel(e.target.value)}
                placeholder="Label (e.g. Ledger Cold Storage)"
                className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--well)] text-xs"
              />
              <input
                type="text"
                value={addrHex}
                onChange={(e) => setAddrHex(e.target.value)}
                placeholder="0x..."
                className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--well)] text-xs font-mono"
              />
              <select
                value={addrChain}
                onChange={(e) => setAddrChain(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--well)] text-xs"
              >
                <option value={4663}>Robinhood Chain (USDG)</option>
                <option value={99901}>Elysium (USDC)</option>
              </select>
              {addrErr && <p className="text-xs text-[var(--bad-text)]">{addrErr}</p>}
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-[var(--accent)] text-[var(--accent-ink)] text-xs font-bold cursor-pointer"
              >
                Save address
              </button>
            </form>
          </div>
        )}

        {/* SECURITY TAB */}
        {activeTab === 'security' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Passkeys */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--win)] p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-display font-bold flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-[var(--accent-text)]" /> Passkeys (Wallet Owners)
                </h2>
                <span className="text-xs font-mono text-[var(--text-muted)]">
                  {state.passkeys.length} active
                </span>
              </div>

              <div className="divide-y divide-[var(--hair)] border border-[var(--border)] rounded-xl overflow-hidden">
                {state.passkeys.map((pk) => (
                  <div key={pk.id} className="px-3.5 py-2.5 bg-[var(--surface-1)] text-xs">
                    <div className="font-semibold">{pk.label}</div>
                    <div className="font-mono text-[var(--text-muted)] mt-0.5">
                      {pk.hardwareBacked ? 'WebAuthn Hardware' : 'Enclave Passkey'} ·{' '}
                      {shortAddr(pk.kernelAddress)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={passkeyLabel}
                  onChange={(e) => setPasskeyLabel(e.target.value)}
                  placeholder="New passkey label (e.g. iPhone Face ID)"
                  className="flex-1 px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--well)] text-xs"
                />
                <button
                  type="button"
                  onClick={async () => {
                    await addPasskey(passkeyLabel || 'Backup Passkey');
                    setPasskeyLabel('');
                  }}
                  className="px-4 py-2 rounded-xl bg-[var(--accent)] text-[var(--accent-ink)] text-xs font-bold cursor-pointer shrink-0"
                >
                  Add passkey
                </button>
              </div>
            </div>

            {/* 12-word Recovery Code + 48h timelock */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--win)] p-5 space-y-4">
              <h2 className="text-base font-display font-bold flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-[var(--accent-text)]" /> 12-Word Recovery Code
              </h2>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                Twelve words that can move your ZeroDev Kernel v3.1 wallet to a new passkey via the
                Recovery contract (<span className="font-mono">0xF420ff…ec94</span>). Every recovery
                waits 48 hours so you can cancel it from any signed-in device.
              </p>

              {state.recoveryPendingUntil && (
                <div className="p-3 rounded-xl border border-[var(--warn-line)] bg-[var(--warn-soft)] text-xs space-y-2">
                  <div className="font-semibold text-[var(--warn-text)]">
                    Recovery timelock active until{' '}
                    {new Date(state.recoveryPendingUntil).toLocaleString()}
                  </div>
                  <button
                    type="button"
                    onClick={cancelRecoveryTimelock}
                    className="px-3 py-1.5 rounded-lg bg-[var(--bad)] text-white font-semibold cursor-pointer"
                  >
                    Cancel recovery now
                  </button>
                </div>
              )}

              {state.recoveryWords ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2 p-3 rounded-xl border border-[var(--border)] bg-[var(--well)] font-mono text-xs">
                    {state.recoveryWords.map((w, i) => (
                      <div key={i}>
                        <span className="text-[var(--text-faint)] mr-1">{i + 1}.</span>
                        {showRecoveryWords ? w : '•••••'}
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setShowRecoveryWords((v) => !v)}
                      className="px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] text-xs font-semibold cursor-pointer"
                    >
                      {showRecoveryWords ? 'Hide words' : 'Reveal words'}
                    </button>
                    {!state.recoveryPendingUntil && (
                      <button
                        type="button"
                        onClick={startRecoveryTimelock}
                        className="px-3 py-1.5 rounded-lg border border-[var(--warn-line)] bg-[var(--warn-soft)] text-[var(--warn-text)] text-xs font-semibold cursor-pointer"
                      >
                        Test 48h recovery timelock
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    enableRecoveryCode();
                    setShowRecoveryWords(true);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-[var(--accent)] text-[var(--accent-ink)] text-xs font-bold cursor-pointer"
                >
                  Generate 12-word recovery code
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
