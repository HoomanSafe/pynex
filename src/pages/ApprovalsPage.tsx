import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { KeyRound, Bot, CheckCircle2, XCircle, Wallet, Plus } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { AiAppGlyph, TokenIcon } from '../components/BrandLogo';
import { useWallet } from '../lib/walletContext';
import { formatPrice, shortAddr } from '../lib/contracts';

export function ApprovalsPage() {
  const {
    state,
    markets,
    approveRequest,
    rejectRequest,
    simulateAiProposal,
    setSignInModalOpen,
  } = useWallet();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const pending = state.approvals.filter((a) => a.status === 'pending');
  const recent = state.approvals.filter((a) => a.status !== 'pending');

  const handleSign = async (id: string, useInjected = false) => {
    if (!state.signedIn) {
      setSignInModalOpen(true);
      return;
    }
    setBusyId(id);
    setFeedback(null);
    try {
      await approveRequest(id, useInjected);
      setFeedback('Request signed and settled on-chain.');
    } catch (err) {
      setFeedback((err as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AppShell>
      <div className="max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold">Approvals</h1>
            <p className="text-sm text-[var(--text-muted)]">
              Trades and orders your assistant asks for wait here. Nothing happens until you sign.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              const eth = markets.find((m) => m.symbol === 'ETH') || markets[0];
              if (eth) simulateAiProposal(eth);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[var(--border)] bg-[var(--win)] text-xs font-semibold hover:border-[var(--accent)] cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-[var(--accent-text)]" />
            Simulate AI request
          </button>
        </div>

        {feedback && (
          <div className="rounded-xl border border-[var(--good-line)] bg-[var(--good-soft)] p-3 text-xs text-[var(--good-text)] font-medium">
            {feedback}
          </div>
        )}

        {/* Waiting for you */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider">
            Waiting for you ({pending.length})
          </h2>

          {pending.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--win)] p-8 text-center space-y-2">
              <Bot className="w-6 h-6 text-[var(--text-faint)] mx-auto" />
              <div className="text-sm font-semibold">Nothing waiting for you</div>
              <p className="text-xs text-[var(--text-muted)]">
                Requests from your connected AI assistant land here with fresh terms for 24 hours.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pending.map((req) => (
                <div
                  key={req.id}
                  className="rounded-2xl border border-[var(--accent-line)] bg-[var(--win)] p-5 space-y-4 shadow-[var(--win-shadow)]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <AiAppGlyph app={req.assistantKey} size={34} />
                      <div>
                        <div className="text-sm font-display font-bold flex items-center gap-2">
                          <span>
                            {req.assistantName} asks to {req.action.toUpperCase()} {req.symbol}
                          </span>
                          <span className="text-xs font-normal text-[var(--text-muted)]">
                            on {req.network}
                          </span>
                        </div>
                        {req.reason && (
                          <p className="text-xs text-[var(--text-muted)] mt-0.5">{req.reason}</p>
                        )}
                      </div>
                    </div>
                    <TokenIcon symbol={req.symbol} chainId={req.chainId} size={28} />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-xl bg-[var(--surface-1)] border border-[var(--border)] text-xs font-mono tabular-nums">
                    <div>
                      <div className="text-[var(--text-muted)] font-sans">You pay</div>
                      <div className="font-bold mt-0.5">
                        {req.payAmount.toFixed(2)} {req.paySymbol}
                      </div>
                    </div>
                    <div>
                      <div className="text-[var(--text-muted)] font-sans">Ref price</div>
                      <div className="font-bold mt-0.5">{formatPrice(req.priceUsd)}</div>
                    </div>
                    <div>
                      <div className="text-[var(--text-muted)] font-sans">Min out ({req.slippagePct}%)</div>
                      <div className="font-bold text-[var(--good-text)] mt-0.5">
                        {req.minOut.toPrecision(4)} {req.outSymbol}
                      </div>
                    </div>
                    <div>
                      <div className="text-[var(--text-muted)] font-sans">PYNEX fee (0.25%)</div>
                      <div className="font-bold mt-0.5">${req.feeUsd.toFixed(3)}</div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={busyId === req.id}
                      onClick={() => handleSign(req.id, false)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--accent)] text-[var(--accent-ink)] text-xs font-bold hover:opacity-95 cursor-pointer"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      {busyId === req.id ? 'Signing…' : 'Sign with Passkey'}
                    </button>

                    {state.injectedAddress && (
                      <button
                        type="button"
                        disabled={busyId === req.id}
                        onClick={() => handleSign(req.id, true)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] text-xs font-semibold hover:border-[var(--accent)] cursor-pointer"
                      >
                        <Wallet className="w-3.5 h-3.5 text-[var(--accent-text)]" />
                        Sign via {shortAddr(state.injectedAddress)}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => rejectRequest(req.id)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[var(--bad-line)] bg-[var(--bad-soft)] text-[var(--bad-text)] text-xs font-semibold cursor-pointer"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Recent Requests */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              Recent requests
            </h2>
            <Link to="/app/profile?tab=activity" className="text-xs text-[var(--accent-text)] hover:underline">
              See everything in Activity →
            </Link>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--win)] divide-y divide-[var(--hair)] overflow-hidden">
            {recent.length === 0 ? (
              <div className="p-5 text-xs text-[var(--text-muted)]">No completed or rejected requests yet.</div>
            ) : (
              recent.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-3 px-4 py-3 text-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <AiAppGlyph app={r.assistantKey} size={24} />
                    <div className="min-w-0">
                      <div className="font-semibold">
                        {r.action.toUpperCase()} {r.symbol}
                      </div>
                      <div className="text-[var(--text-muted)] font-mono truncate">
                        Pay {r.payAmount} {r.paySymbol} · min {r.minOut.toPrecision(4)} {r.outSymbol}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 font-semibold shrink-0 ${
                      r.status === 'signed' ? 'text-[var(--good-text)]' : 'text-[var(--bad-text)]'
                    }`}
                  >
                    {r.status === 'signed' ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" /> Signed
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3.5 h-3.5" /> Rejected
                      </>
                    )}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>

        {/* How approvals work */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {[
            {
              title: '1. Your assistant asks',
              body: 'A connected AI app proposes a trade or an order. Nothing moves yet.',
            },
            {
              title: '2. You sign, or reject',
              body: 'Signing prices the trade again right then and opens your passkey. It never fills below the minimum shown.',
            },
            {
              title: '3. Only you can approve',
              body: 'Your passkey signs it. A chat message never can. Rejecting costs nothing, and requests expire after 24 hours.',
            },
          ].map((c) => (
            <div key={c.title} className="rounded-2xl border border-[var(--border)] bg-[var(--win)] p-4 space-y-1">
              <div className="text-sm font-display font-bold">{c.title}</div>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">{c.body}</p>
            </div>
          ))}
        </section>
      </div>
    </AppShell>
  );
}
