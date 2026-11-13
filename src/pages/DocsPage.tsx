import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Copy, Check, ExternalLink, RefreshCw, ArrowLeft } from 'lucide-react';
import { PynexLogo } from '../components/BrandLogo';
import { useThemeToggle } from '../components/AppShell';
import { NETWORKS, PYNEX_TOKEN_CA, PYNEX_X_URL, ENTRYPOINT_V07 } from '../lib/contracts';

interface ChainHealth {
  checkedAt: number;
  robinhood: { ok: boolean; block: number | null; ms: number };
  elysium: { ok: boolean; block: number | null; ms: number };
}

export function DocsPage() {
  const { theme, toggleTheme } = useThemeToggle();
  const [health, setHealth] = useState<ChainHealth | null>(null);
  const [checking, setChecking] = useState(false);
  const [copiedAddr, setCopiedAddr] = useState<string | null>(null);

  const fetchHealth = () => {
    setChecking(true);
    fetch('/api/health/chain')
      .then((r) => r.json())
      .then((d) => setHealth(d))
      .catch(() => {})
      .finally(() => setChecking(false));
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const copyText = (val: string) => {
    navigator.clipboard.writeText(val);
    setCopiedAddr(val);
    setTimeout(() => setCopiedAddr(null), 1500);
  };

  const contractRows = [
    { net: NETWORKS[4663], label: 'Registry', addr: NETWORKS[4663].contracts.registry },
    { net: NETWORKS[4663], label: 'Executor', addr: NETWORKS[4663].contracts.executor },
    { net: NETWORKS[4663], label: 'Uniswap v4 Adapter', addr: NETWORKS[4663].contracts.adapter },
    { net: NETWORKS[4663], label: 'Orders', addr: NETWORKS[4663].contracts.orders },
    { net: NETWORKS[4663], label: 'TokenPaymaster', addr: NETWORKS[4663].contracts.tokenPaymaster },
    { net: NETWORKS[4663], label: 'Recovery', addr: NETWORKS[4663].contracts.recovery },
    { net: NETWORKS[4663], label: 'PYNEX Token', addr: PYNEX_TOKEN_CA },
    { net: NETWORKS[99901], label: 'Registry', addr: NETWORKS[99901].contracts.registry },
    { net: NETWORKS[99901], label: 'Executor', addr: NETWORKS[99901].contracts.executor },
    { net: NETWORKS[99901], label: 'Uniswap v4 Adapter', addr: NETWORKS[99901].contracts.adapter },
    { net: NETWORKS[99901], label: 'Orders', addr: NETWORKS[99901].contracts.orders },
    { net: NETWORKS[99901], label: 'TokenPaymaster', addr: NETWORKS[99901].contracts.tokenPaymaster },
  ];

  return (
    <div className="min-h-screen bg-[var(--desk)] text-[var(--text)]">
      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--bar-bg)] backdrop-blur-md">
        <div className="max-w-5xl mx-auto h-14 px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2 font-display font-bold">
              <PynexLogo size={24} />
              PYNEX Docs
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              className="px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--win)] text-xs font-semibold cursor-pointer"
            >
              {theme === 'dark' ? 'Light' : 'Dark'}
            </button>
            <Link
              to="/app"
              className="px-3.5 py-1.5 rounded-xl bg-[var(--accent)] text-[var(--accent-ink)] text-xs font-bold"
            >
              Open terminal
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-12">
        <section className="space-y-3">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text)]"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to home
          </Link>
          <h1 className="text-3xl font-display font-bold">How PYNEX works, in plain terms</h1>
          <p className="text-sm text-[var(--text-muted)] leading-relaxed">
            Everything you need to set up, trade, connect an AI via MCP, verify smart contracts,
            and stay in control on Robinhood Chain and Elysium.
          </p>
        </section>

        {/* Live System Status */}
        <section id="status" className="rounded-2xl border border-[var(--border)] bg-[var(--win)] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-display font-bold">Live System & Chain Status</h2>
              <p className="text-xs text-[var(--text-muted)]">
                Real-time JSON-RPC block probes against Robinhood Chain (4663) & Elysium (99901).
              </p>
            </div>
            <button
              type="button"
              onClick={fetchHealth}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] text-xs font-semibold cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
            <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] space-y-1">
              <div className="flex items-center justify-between font-sans font-semibold">
                <span>Robinhood Chain · 4663</span>
                <span className={health?.robinhood.ok ? 'text-[var(--good-text)]' : 'text-[var(--warn-text)]'}>
                  {health ? (health.robinhood.ok ? 'Operational' : 'Degraded') : 'Checking…'}
                </span>
              </div>
              <div className="text-[var(--text-muted)]">
                Block: {health?.robinhood.block ? `#${health.robinhood.block.toLocaleString()}` : '—'} · Latency:{' '}
                {health?.robinhood.ms ?? '—'}ms
              </div>
            </div>

            <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] space-y-1">
              <div className="flex items-center justify-between font-sans font-semibold">
                <span>Elysium · 99901</span>
                <span className={health?.elysium.ok ? 'text-[var(--good-text)]' : 'text-[var(--warn-text)]'}>
                  {health ? (health.elysium.ok ? 'Operational' : 'Degraded') : 'Checking…'}
                </span>
              </div>
              <div className="text-[var(--text-muted)]">
                Block: {health?.elysium.block ? `#${health.elysium.block.toLocaleString()}` : '—'} · Latency:{' '}
                {health?.elysium.ms ?? '—'}ms
              </div>
            </div>
          </div>
        </section>

        {/* Smart Contracts Table */}
        <section id="contracts" className="space-y-4">
          <div>
            <h2 className="text-xl font-display font-bold">Reference Smart Contracts</h2>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              EntryPoint v0.7 (<span className="font-mono">{ENTRYPOINT_V07}</span>) with ZeroDev Kernel v3.1 smart accounts.
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--win)] overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[var(--hair)] bg-[var(--surface-1)] text-[var(--text-muted)]">
                <tr>
                  <th className="py-3 px-4 font-semibold">Network</th>
                  <th className="py-3 px-4 font-semibold">Contract</th>
                  <th className="py-3 px-4 font-semibold">Address</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--hair)] font-mono">
                {contractRows.map((row) => (
                  <tr key={`${row.net.chainId}-${row.label}`} className="hover:bg-[var(--surface-1)]">
                    <td className="py-2.5 px-4 font-sans font-medium">{row.net.name}</td>
                    <td className="py-2.5 px-4 font-sans">{row.label}</td>
                    <td className="py-2.5 px-4 text-[var(--text-muted)]">{row.addr}</td>
                    <td className="py-2.5 px-4 text-right font-sans">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => copyText(row.addr)}
                          className="p-1 text-[var(--text-muted)] hover:text-[var(--text)] cursor-pointer"
                          aria-label="Copy address"
                        >
                          {copiedAddr === row.addr ? (
                            <Check className="w-3.5 h-3.5 text-[var(--good-text)]" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <a
                          href={`${row.net.explorer}/address/${row.addr}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[var(--accent-text)] hover:underline inline-flex items-center gap-1"
                        >
                          Explorer <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Fees & Token */}
        <section id="fees" className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--win)] p-6 space-y-2">
            <h2 className="text-lg font-display font-bold">Fees</h2>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              <strong>0.25% PYNEX fee</strong> on confirmed trades only, plus the Uniswap v4 pool
              fee and network gas paid in USDG or USDC via TokenPaymaster. Blocked or failed trades
              carry no PYNEX fee.
            </p>
          </div>
          <div id="token" className="rounded-2xl border border-[var(--border)] bg-[var(--win)] p-6 space-y-2">
            <h2 className="text-lg font-display font-bold">PYNEX & AI Access</h2>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Holding <strong>5,000,000 PYNEX</strong> on Robinhood Chain unlocks connecting AI
              assistants over MCP. You can verify up to 5 external holder wallets via a free signed
              message.
            </p>
          </div>
        </section>

        {/* Risks & Help */}
        <section id="risks" className="rounded-2xl border border-[var(--border)] bg-[var(--win)] p-6 space-y-3">
          <h2 className="text-lg font-display font-bold">Risks & Limitations</h2>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            Trading digital assets carries risk of total loss. Smart contracts can contain bugs,
            transactions can fail or settle at worse prices within your slippage limit, and AI
            assistants can make incorrect market analyses. Always inspect the quote terms before
            signing with your passkey.
          </p>
          <div id="help" className="pt-2 flex flex-wrap items-center gap-4 text-xs">
            <a
              href={PYNEX_X_URL}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-[var(--accent-text)] hover:underline inline-flex items-center gap-1"
            >
              Official X (@PynexAgent) <ExternalLink className="w-3 h-3" />
            </a>
            <Link to="/terms" className="text-[var(--text-muted)] hover:text-[var(--text)]">Terms of use</Link>
            <Link to="/privacy" className="text-[var(--text-muted)] hover:text-[var(--text)]">Privacy policy</Link>
          </div>
        </section>
      </main>
    </div>
  );
}

export function LegalPage({ mode }: { mode: 'terms' | 'privacy' }) {
  return (
    <div className="min-h-screen bg-[var(--desk)] text-[var(--text)]">
      <header className="border-b border-[var(--border)] bg-[var(--win)]">
        <div className="max-w-4xl mx-auto h-14 px-4 sm:px-6 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-display font-bold">
            <PynexLogo size={24} />
            PYNEX
          </Link>
          <Link to="/app" className="px-3.5 py-1.5 rounded-xl bg-[var(--accent)] text-[var(--accent-ink)] text-xs font-bold">
            Open terminal
          </Link>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-6">
        <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text)]">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to home
        </Link>
        <h1 className="text-3xl font-display font-bold">
          {mode === 'terms' ? 'Terms of use' : 'Privacy policy'}
        </h1>
        {mode === 'terms' ? (
          <div className="space-y-4 text-sm text-[var(--text-muted)] leading-relaxed">
            <p>
              PYNEX is independent non-custodial software that lets you connect an AI assistant to
              on-chain trading tools on Robinhood Chain and Elysium, where you approve and sign
              every trade with your own passkey or wallet.
            </p>
            <p>
              Nothing in PYNEX, including anything an AI assistant says while connected via MCP,
              constitutes financial, investment, legal, or tax advice. Signed transactions cannot
              be reversed.
            </p>
          </div>
        ) : (
          <div className="space-y-4 text-sm text-[var(--text-muted)] leading-relaxed">
            <p>
              PYNEX never asks for or stores private keys or seed phrases. Your passkey private key
              stays inside your device hardware enclave, and your trading wallet state is stored
              locally in your browser and on public blockchains.
            </p>
            <p>
              You can export your complete activity log as CSV at any time from Profile → Activity.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
