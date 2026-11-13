import React, { useEffect, useState } from 'react';
import {
  X,
  KeyRound,
  Wallet,
  Mail,
  Copy,
  Check,
  ShieldCheck,
  Bot,
  Search,
  ArrowUpRight,
  Trash2,
  QrCode,
  Send,
  Plus,
} from 'lucide-react';
import { useWallet, type MarketToken } from '../lib/walletContext';
import {
  HOLDER_MIN_PYNEX,
  NETWORKS,
  PYNEX_TOKEN_CA,
  shortAddr,
  formatPrice,
} from '../lib/contracts';
import { AiAppGlyph, TokenIcon } from './BrandLogo';
import type { Address } from 'viem';

function SimpleQrSvg({ value }: { value: string }) {
  // Deterministic crisp visual QR-style matrix derived from the wallet address
  const size = 21;
  const cells: boolean[] = [];
  let seed = 0;
  for (let i = 0; i < value.length; i++) {
    seed = (seed * 31 + value.charCodeAt(i)) >>> 0;
  }
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const inTopLeft = r < 7 && c < 7;
      const inTopRight = r < 7 && c >= size - 7;
      const inBotLeft = r >= size - 7 && c < 7;
      if (inTopLeft || inTopRight || inBotLeft) {
        const lr = r >= size - 7 ? r - (size - 7) : r;
        const lc = c >= size - 7 ? c - (size - 7) : c;
        const border = lr === 0 || lr === 6 || lc === 0 || lc === 6;
        const inner = lr >= 2 && lr <= 4 && lc >= 2 && lc <= 4;
        cells.push(border || inner);
      } else {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        cells.push(((seed >> 24) & 1) === 1);
      }
    }
  }
  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="w-36 h-36 rounded-lg bg-white p-2 border border-[var(--border)]"
      aria-label={`QR code for ${value}`}
    >
      {cells.map((on, idx) =>
        on ? (
          <rect
            key={idx}
            x={idx % size}
            y={Math.floor(idx / size)}
            width={1}
            height={1}
            fill="#141716"
          />
        ) : null,
      )}
    </svg>
  );
}

export function SignInModal() {
  const {
    signInModalOpen,
    setSignInModalOpen,
    signInWithPasskey,
    signInWithInjectedWallet,
    signInWithEmail,
    startRecoveryTimelock,
  } = useWallet();
  const [email, setEmail] = useState('');
  const [codeStep, setCodeStep] = useState(false);
  const [code, setCode] = useState('');
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [recoveryInput, setRecoveryInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!signInModalOpen) return null;

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!codeStep) {
      if (!email.includes('@')) {
        setErr('Enter a valid email address.');
        return;
      }
      setCodeStep(true);
    } else {
      if (code.trim().length < 6) {
        setErr('Enter the 6-digit verification code (e.g. 123456).');
        return;
      }
      signInWithEmail(email.trim());
      setCodeStep(false);
      setCode('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--win)] shadow-[var(--pop-shadow)] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--hair)] bg-[var(--surface-1)]">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            {recoveryMode ? 'Recover wallet' : 'Sign in to PYNEX'}
          </span>
          <button
            type="button"
            onClick={() => {
              setSignInModalOpen(false);
              setRecoveryMode(false);
              setErr(null);
            }}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {recoveryMode ? (
            <div className="space-y-4">
              <p className="text-sm text-[var(--text-muted)]">
                Enter your 12-word recovery code to bind a new passkey. Recovery waits 48 hours so
                you can cancel it from any signed-in device.
              </p>
              <textarea
                rows={3}
                value={recoveryInput}
                onChange={(e) => setRecoveryInput(e.target.value)}
                placeholder="Enter 12 recovery words separated by spaces…"
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--well)] p-3 text-sm font-mono focus:outline-none focus:border-[var(--accent)]"
              />
              {err && <p className="text-xs text-[var(--bad-text)]">{err}</p>}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const words = recoveryInput.trim().split(/\s+/).filter(Boolean);
                    if (words.length < 12) {
                      setErr('Enter all 12 recovery words.');
                      return;
                    }
                    startRecoveryTimelock();
                    setRecoveryMode(false);
                    setSignInModalOpen(false);
                  }}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-[var(--accent)] text-[var(--accent-ink)] text-sm font-semibold hover:opacity-90 cursor-pointer"
                >
                  Start 48h recovery
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRecoveryMode(false);
                    setErr(null);
                  }}
                  className="py-2.5 px-4 rounded-xl border border-[var(--border)] text-sm font-medium hover:bg-[var(--surface-1)] cursor-pointer"
                >
                  Back
                </button>
              </div>
            </div>
          ) : (
            <>
              <div>
                <h2 className="text-lg font-display font-bold">Sign in to PYNEX</h2>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  New here? The same steps create your ZeroDev Kernel v3.1 smart wallet.
                </p>
              </div>

              <div className="space-y-2.5">
                <button
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    setErr(null);
                    try {
                      await signInWithPasskey();
                    } catch (e) {
                      setErr((e as Error).message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[var(--accent)] text-[var(--accent-ink)] text-sm font-semibold hover:opacity-95 transition-opacity cursor-pointer"
                >
                  <KeyRound className="w-4 h-4" />
                  Continue with passkey
                </button>

                <button
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    setErr(null);
                    try {
                      await signInWithInjectedWallet();
                    } catch (e) {
                      setErr((e as Error).message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] text-sm font-medium hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
                >
                  <Wallet className="w-4 h-4 text-[var(--accent-text)]" />
                  Connect browser wallet (MetaMask / Rabby)
                </button>
              </div>

              <div className="relative flex items-center py-1">
                <div className="flex-grow border-t border-[var(--hair)]" />
                <span className="mx-3 text-xs text-[var(--text-faint)]">or</span>
                <div className="flex-grow border-t border-[var(--hair)]" />
              </div>

              <form onSubmit={handleEmailSubmit} className="space-y-2.5">
                <div className="relative">
                  <Mail className="w-4 h-4 text-[var(--text-faint)] absolute left-3.5 top-3" />
                  <input
                    type="email"
                    value={email}
                    disabled={codeStep}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email address"
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--well)] text-sm focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>
                {codeStep && (
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="6-digit code (enter any 6 digits)"
                    maxLength={6}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--well)] text-sm font-mono focus:outline-none focus:border-[var(--accent)]"
                  />
                )}
                <button
                  type="submit"
                  className="w-full py-2.5 px-4 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] text-sm font-semibold hover:bg-[var(--surface-2)] cursor-pointer"
                >
                  {codeStep ? 'Verify code' : 'Continue with email'}
                </button>
              </form>

              {err && <p className="text-xs text-[var(--bad-text)]">{err}</p>}

              <div className="flex items-center justify-between pt-1 text-xs text-[var(--text-muted)]">
                <button
                  type="button"
                  onClick={() => setRecoveryMode(true)}
                  className="underline hover:text-[var(--text)] cursor-pointer"
                >
                  Lost your passkey?
                </button>
                <span>PYNEX never asks for a seed phrase.</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function AssistantModal() {
  const {
    assistantModalOpen,
    setAssistantModalOpen,
    state,
    totalPynexHeld,
    holderUnlocked,
    connectAssistant,
    revokeAssistant,
    verifyExternalHolderWallet,
    removeHolderWallet,
  } = useWallet();

  const [copiedMcp, setCopiedMcp] = useState(false);
  const [selectedApp, setSelectedApp] = useState<'claude' | 'chatgpt' | 'gemini' | 'cursor'>('claude');
  const [perm, setPerm] = useState<'read' | 'trade'>('trade');
  const [verifying, setVerifying] = useState(false);
  const [verifyErr, setVerifyErr] = useState<string | null>(null);

  if (!assistantModalOpen) return null;

  const mcpUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://pynex.app'}/mcp`;

  const copyMcp = () => {
    navigator.clipboard.writeText(mcpUrl);
    setCopiedMcp(true);
    setTimeout(() => setCopiedMcp(false), 1800);
  };

  const handleVerifyExternal = async () => {
    setVerifying(true);
    setVerifyErr(null);
    try {
      await verifyExternalHolderWallet();
    } catch (e) {
      setVerifyErr((e as Error).message);
    } finally {
      setVerifying(false);
    }
  };

  const apps: { key: 'claude' | 'chatgpt' | 'gemini' | 'cursor'; name: string }[] = [
    { key: 'claude', name: 'Claude' },
    { key: 'chatgpt', name: 'ChatGPT' },
    { key: 'gemini', name: 'Gemini' },
    { key: 'cursor', name: 'Cursor' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm">
      <div className="w-full max-w-xl max-h-[90vh] flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--win)] shadow-[var(--pop-shadow)] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--hair)] bg-[var(--surface-1)]">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-[var(--accent-text)]" />
            <span className="text-sm font-display font-bold">AI Assistant & MCP Connector</span>
          </div>
          <button
            type="button"
            onClick={() => setAssistantModalOpen(false)}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-5">
          {/* Holder access status */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-xs font-semibold text-[var(--text-muted)]">
                  Hold 5,000,000 PYNEX on Robinhood Chain
                </div>
                <div className="text-base font-display font-bold tabular-nums mt-0.5">
                  {totalPynexHeld.toLocaleString()} PYNEX
                </div>
              </div>
              <span
                className={`text-xs font-semibold px-2.5 py-1 rounded-md border ${
                  holderUnlocked
                    ? 'bg-[var(--good-soft)] border-[var(--good-line)] text-[var(--good-text)]'
                    : 'bg-[var(--warn-soft)] border-[var(--warn-line)] text-[var(--warn-text)]'
                }`}
              >
                {holderUnlocked ? 'Unlocked' : `Need ${(HOLDER_MIN_PYNEX - totalPynexHeld).toLocaleString()} more`}
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              Token CA: <span className="font-mono">{PYNEX_TOKEN_CA}</span>. Connect up to 5 external
              wallets by signing one free ownership message—PYNEX reads your on-chain balance via RPC.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={verifying}
                onClick={handleVerifyExternal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--win)] text-xs font-semibold hover:border-[var(--accent)] cursor-pointer"
              >
                <Wallet className="w-3.5 h-3.5 text-[var(--accent-text)]" />
                {verifying ? 'Verifying on-chain…' : 'Connect external holder wallet'}
              </button>
              {state.holderWallets.map((hw) => (
                <span
                  key={hw.address}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--surface-2)] text-xs font-mono"
                >
                  {shortAddr(hw.address)} · {hw.balancePynex.toLocaleString()} PYNEX
                  <button
                    type="button"
                    onClick={() => removeHolderWallet(hw.address)}
                    className="text-[var(--text-faint)] hover:text-[var(--bad-text)] cursor-pointer"
                    aria-label="Remove wallet"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            {verifyErr && <p className="text-xs text-[var(--bad-text)]">{verifyErr}</p>}
          </div>

          {/* MCP Endpoint */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-[var(--text-muted)]">
              Remote MCP server address
            </label>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--well)] text-xs font-mono truncate">
                {mcpUrl}
              </code>
              <button
                type="button"
                onClick={copyMcp}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] text-xs font-semibold hover:bg-[var(--surface-2)] cursor-pointer shrink-0"
              >
                {copiedMcp ? <Check className="w-3.5 h-3.5 text-[var(--good-text)]" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedMcp ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Connect new AI app */}
          <div className="rounded-xl border border-[var(--border)] p-4 space-y-3">
            <div className="text-xs font-semibold text-[var(--text-muted)]">Authorize AI App</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {apps.map((a) => (
                <button
                  key={a.key}
                  type="button"
                  onClick={() => setSelectedApp(a.key)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                    selectedApp === a.key
                      ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text)]'
                      : 'border-[var(--border)] bg-[var(--surface-1)] text-[var(--text-muted)]'
                  }`}
                >
                  <AiAppGlyph app={a.key} size={20} />
                  {a.name}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPerm('read')}
                className={`p-2.5 rounded-xl border text-left text-xs cursor-pointer ${
                  perm === 'read'
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                    : 'border-[var(--border)] bg-[var(--surface-1)]'
                }`}
              >
                <div className="font-semibold">See your wallet</div>
                <div className="text-[var(--text-muted)] mt-0.5">Read balances, prices & history only</div>
              </button>
              <button
                type="button"
                onClick={() => setPerm('trade')}
                className={`p-2.5 rounded-xl border text-left text-xs cursor-pointer ${
                  perm === 'trade'
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                    : 'border-[var(--border)] bg-[var(--surface-1)]'
                }`}
              >
                <div className="font-semibold">Request trades too</div>
                <div className="text-[var(--text-muted)] mt-0.5">Propose swaps & orders; you sign each</div>
              </button>
            </div>

            <button
              type="button"
              disabled={!holderUnlocked}
              onClick={() =>
                connectAssistant(
                  selectedApp,
                  `${apps.find((a) => a.key === selectedApp)?.name} (MCP)`,
                  perm,
                )
              }
              className="w-full py-2.5 px-4 rounded-xl bg-[var(--accent)] text-[var(--accent-ink)] text-xs font-bold disabled:opacity-45 cursor-pointer"
            >
              {holderUnlocked
                ? `Connect ${apps.find((a) => a.key === selectedApp)?.name}`
                : 'Hold 5,000,000 PYNEX to unlock new connections'}
            </button>
          </div>

          {/* Active connections */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-[var(--text-muted)]">
              Active connections ({state.assistants.length})
            </div>
            {state.assistants.length === 0 ? (
              <div className="text-xs text-[var(--text-faint)] py-3 text-center border border-dashed border-[var(--border)] rounded-xl">
                No AI apps connected.
              </div>
            ) : (
              <div className="divide-y divide-[var(--hair)] border border-[var(--border)] rounded-xl overflow-hidden">
                {state.assistants.map((ast) => (
                  <div key={ast.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5 bg-[var(--surface-1)]">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <AiAppGlyph app={ast.key} size={24} />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold truncate">{ast.name}</div>
                        <div className="text-[11px] text-[var(--text-muted)]">
                          {ast.permission === 'trade' ? 'See wallet + Request trades' : 'Read-only'}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => revokeAssistant(ast.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[var(--bad-line)] bg-[var(--bad-soft)] text-[var(--bad-text)] text-xs font-semibold hover:opacity-90 cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-3 h-3" />
                      Revoke
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function DepositSendModal() {
  const {
    depositModalOpen,
    setDepositModalOpen,
    state,
    depositTestFunds,
    sendCashOut,
    addSavedAddress,
  } = useWallet();
  const [tab, setTab] = useState<'deposit' | 'send'>('deposit');
  const [chainId, setChainId] = useState<number>(4663);
  const [copied, setCopied] = useState(false);
  const [selectedAddr, setSelectedAddr] = useState<string>(state.savedAddresses[0]?.address || '');
  const [sendAmount, setSendAmount] = useState('50');
  const [newLabel, setNewLabel] = useState('');
  const [newAddr, setNewAddr] = useState('');
  const [addingAddr, setAddingAddr] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!depositModalOpen) return null;

  const net = NETWORKS[chainId] || NETWORKS[4663];
  const cashHolding = state.holdings.find((h) => h.chainId === chainId && h.symbol === net.quote);

  const copyAddr = () => {
    navigator.clipboard.writeText(state.smartWalletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);
    const amt = Number(sendAmount);
    if (!selectedAddr || !selectedAddr.startsWith('0x')) {
      setStatusMsg('Select a saved address first.');
      return;
    }
    if (!Number.isFinite(amt) || amt < 1) {
      setStatusMsg(`Minimum send is 1 ${net.quote}.`);
      return;
    }
    if ((cashHolding?.amount ?? 0) < amt) {
      setStatusMsg(`Insufficient ${net.quote} balance.`);
      return;
    }
    setBusy(true);
    try {
      const tx = await sendCashOut(chainId, selectedAddr as Address, amt);
      setStatusMsg(`Sent ${amt.toFixed(2)} ${net.quote} · Tx ${shortAddr(tx)}`);
    } catch (err) {
      setStatusMsg((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--win)] shadow-[var(--pop-shadow)] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--hair)] bg-[var(--surface-1)]">
          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[var(--surface-2)]">
            <button
              type="button"
              onClick={() => {
                setTab('deposit');
                setStatusMsg(null);
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold cursor-pointer ${
                tab === 'deposit' ? 'bg-[var(--win)] text-[var(--text)] shadow-sm' : 'text-[var(--text-muted)]'
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              Deposit
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('send');
                setStatusMsg(null);
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold cursor-pointer ${
                tab === 'send' ? 'bg-[var(--win)] text-[var(--text)] shadow-sm' : 'text-[var(--text-muted)]'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              Send cash
            </button>
          </div>
          <button
            type="button"
            onClick={() => setDepositModalOpen(false)}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {[4663, 99901].map((id) => {
              const n = NETWORKS[id];
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setChainId(id)}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-left text-xs font-semibold cursor-pointer ${
                    chainId === id
                      ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                      : 'border-[var(--border)] bg-[var(--surface-1)] text-[var(--text-muted)]'
                  }`}
                >
                  <img src={n.icon} alt="" className="w-5 h-5 rounded-full" />
                  <div>
                    <div>{n.name}</div>
                    <div className="text-[11px] font-normal text-[var(--text-muted)]">Cash: {n.quote}</div>
                  </div>
                </button>
              );
            })}
          </div>

          {tab === 'deposit' ? (
            <div className="flex flex-col items-center text-center space-y-3">
              <SimpleQrSvg value={state.smartWalletAddress} />
              <div className="w-full space-y-1.5">
                <div className="text-xs text-[var(--text-muted)]">
                  ZeroDev Kernel v3.1 Smart Account (same address on both networks)
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--well)] text-xs font-mono truncate">
                    {state.smartWalletAddress}
                  </code>
                  <button
                    type="button"
                    onClick={copyAddr}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] text-xs font-semibold cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-[var(--good-text)]" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
              <div className="w-full pt-2 border-t border-[var(--hair)] flex items-center justify-between gap-2">
                <span className="text-xs text-[var(--text-muted)]">
                  Balance: <strong className="font-mono text-[var(--text)]">{(cashHolding?.amount ?? 0).toFixed(2)} {net.quote}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    depositTestFunds(chainId, 500);
                    setStatusMsg(`Credited +500.00 ${net.quote} to wallet`);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[var(--accent-soft)] border border-[var(--accent-line)] text-[var(--accent-text)] text-xs font-semibold cursor-pointer"
                >
                  + Simulate $500 {net.quote} deposit
                </button>
              </div>
              {statusMsg && <p className="text-xs text-[var(--good-text)]">{statusMsg}</p>}
            </div>
          ) : (
            <form onSubmit={handleSend} className="space-y-3">
              <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                <span>Available {net.quote}</span>
                <span className="font-mono font-semibold text-[var(--text)]">
                  {(cashHolding?.amount ?? 0).toFixed(2)} {net.quote}
                </span>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[var(--text-muted)]">Saved recipient</label>
                  <button
                    type="button"
                    onClick={() => setAddingAddr(!addingAddr)}
                    className="inline-flex items-center gap-1 text-xs text-[var(--accent-text)] font-semibold cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Add address
                  </button>
                </div>

                {addingAddr && (
                  <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] space-y-2">
                    <input
                      type="text"
                      value={newLabel}
                      onChange={(e) => setNewLabel(e.target.value)}
                      placeholder="Label (e.g. Hardware Vault)"
                      className="w-full px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--well)] text-xs"
                    />
                    <input
                      type="text"
                      value={newAddr}
                      onChange={(e) => setNewAddr(e.target.value)}
                      placeholder="0x..."
                      className="w-full px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--well)] text-xs font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newLabel.trim() && /^0x[a-fA-F0-9]{40}$/.test(newAddr.trim())) {
                          addSavedAddress(newLabel.trim(), newAddr.trim() as Address, chainId);
                          setSelectedAddr(newAddr.trim());
                          setNewLabel('');
                          setNewAddr('');
                          setAddingAddr(false);
                        }
                      }}
                      className="w-full py-1.5 rounded-lg bg-[var(--accent)] text-[var(--accent-ink)] text-xs font-bold cursor-pointer"
                    >
                      Save address
                    </button>
                  </div>
                )}

                <select
                  value={selectedAddr}
                  onChange={(e) => setSelectedAddr(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--well)] text-xs font-mono"
                >
                  <option value="">Select saved address…</option>
                  {state.savedAddresses.map((sa) => (
                    <option key={sa.id} value={sa.address}>
                      {sa.label} ({shortAddr(sa.address)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--text-muted)]">Amount ({net.quote})</label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  value={sendAmount}
                  onChange={(e) => setSendAmount(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--well)] text-sm font-mono tabular-nums"
                />
              </div>

              <button
                type="submit"
                disabled={busy}
                className="w-full py-2.5 px-4 rounded-xl bg-[var(--accent)] text-[var(--accent-ink)] text-sm font-bold hover:opacity-95 cursor-pointer"
              >
                {busy ? 'Signing with Passkey…' : `Sign & Send ${net.quote}`}
              </button>

              {statusMsg && <p className="text-xs text-[var(--accent-text)]">{statusMsg}</p>}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export function CommandPaletteModal({
  open,
  onClose,
  onPickToken,
}: {
  open: boolean;
  onClose: () => void;
  onPickToken: (token: MarketToken) => void;
}) {
  const { markets } = useWallet();
  const [query, setQuery] = useState('');
  const [discoverMatches, setDiscoverMatches] = useState<MarketToken[]>([]);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    fetch(`/api/v1/discover/search?q=${encodeURIComponent(query)}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.items)) {
          setDiscoverMatches(
            d.items.map((x: Record<string, unknown>) => ({
              address: String(x.address),
              chainId: Number(x.chainId),
              symbol: String(x.symbol),
              name: String(x.name),
              decimals: Number(x.decimals || 18),
              priceUsd: Number(x.priceUsd || 0),
              source: 'uniswap-v4',
              observed_at: Date.now(),
              network: String(x.network || 'Robinhood'),
              change24h: Number(x.change24h || 0),
              logo: (x.logo as string | null) ?? null,
            })),
          );
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, [open, query]);

  if (!open) return null;

  const combined = [...markets];
  for (const dm of discoverMatches) {
    if (!combined.some((m) => m.symbol.toUpperCase() === dm.symbol.toUpperCase() && m.chainId === dm.chainId)) {
      combined.push(dm);
    }
  }

  const filtered = combined.filter(
    (t) =>
      t.symbol.toLowerCase().includes(query.toLowerCase()) ||
      t.name.toLowerCase().includes(query.toLowerCase()) ||
      t.address.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--win)] shadow-[var(--pop-shadow)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--hair)]">
          <Search className="w-4 h-4 text-[var(--text-faint)]" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tokens by symbol, name, or 0x contract address…"
            className="flex-1 bg-transparent text-sm focus:outline-none"
          />
          <kbd className="px-1.5 py-0.5 rounded border border-[var(--border)] text-[10px] font-mono text-[var(--text-faint)]">
            ESC
          </kbd>
        </div>

        <div className="max-h-80 overflow-y-auto divide-y divide-[var(--hair)]">
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-xs text-[var(--text-muted)]">
              No tokens matched “{query}”.
            </div>
          ) : (
            filtered.map((tok) => (
              <button
                key={`${tok.chainId}-${tok.address}`}
                type="button"
                onClick={() => {
                  onPickToken(tok);
                  onClose();
                }}
                className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-[var(--surface-1)] cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <TokenIcon symbol={tok.symbol} chainId={tok.chainId} logo={tok.logo} size={28} />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold flex items-center gap-2">
                      <span>{tok.symbol}</span>
                      <span className="text-xs font-normal text-[var(--text-muted)]">{tok.network}</span>
                    </div>
                    <div className="text-xs text-[var(--text-faint)] truncate font-mono">
                      {tok.name} · {shortAddr(tok.address)}
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
            ))
          )}
        </div>
      </div>
    </div>
  );
}
