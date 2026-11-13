import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  ShieldAlert,
  ChevronDown,
  Copy,
  KeyRound,
  Lock,
  Sparkles,
  Sun,
  Moon,
  ExternalLink,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { AiAppGlyph, PynexLogo } from '../components/BrandLogo';
import { HeroGlobe } from '../components/HeroGlobe';
import { useThemeToggle } from '../components/AppShell';
import { PYNEX_TOKEN_CA, PYNEX_X_URL, shortAddr } from '../lib/contracts';

type AiKey = 'claude' | 'chatgpt' | 'gemini' | 'perplexity' | 'cursor' | 'copilot';

const AI_APPS: { key: AiKey; name: string }[] = [
  { key: 'claude', name: 'Claude' },
  { key: 'chatgpt', name: 'ChatGPT' },
  { key: 'gemini', name: 'Gemini' },
  { key: 'perplexity', name: 'Perplexity' },
  { key: 'cursor', name: 'Cursor' },
  { key: 'copilot', name: 'Copilot' },
];

type SafetyScenario = 'normal' | 'lookalike' | 'old_price' | 'slippage' | 'stale_quote' | 'flood';

const SAFETY_CHECKS = [
  {
    id: 'verified',
    title: 'Verified tokens only',
    desc: 'Matched to exact contract addresses, so a look-alike can’t slip in.',
  },
  {
    id: 'fresh_price',
    title: 'Fresh prices',
    desc: 'Every price shows its source and age. Older than 10 minutes blocks the trade.',
  },
  {
    id: 'fair_price',
    title: 'A fair price',
    desc: 'Blocked if the pool is more than 2% from the reference price.',
  },
  {
    id: 'slippage',
    title: 'Slippage capped',
    desc: '1% at most.',
  },
  {
    id: 'fresh_quote',
    title: 'A fresh quote',
    desc: 'A quote is good for 30 seconds. After that you see fresh terms.',
  },
  {
    id: 'no_flood',
    title: 'No flooding',
    desc: 'At most 60 new requests an hour, whichever AI sends them.',
  },
];

const FAQ_ITEMS = [
  {
    q: 'Is it live?',
    a: 'Yes. PYNEX runs on Robinhood Chain (chain ID 4663) and Elysium (chain ID 99901) with live RPC feeds, Uniswap v4 routing, and ZeroDev Kernel v3.1 smart accounts.',
  },
  {
    q: 'Who controls my funds?',
    a: 'You do. Your PYNEX wallet is a smart account (ZeroDev Kernel v3.1) owned by your passkey. PYNEX and your AI can’t sign for you.',
  },
  {
    q: 'Does every trade need my approval?',
    a: 'Yes. Every trade an AI asks for waits for you to check fresh terms and sign, whatever its size. There are no spending limits to set, because nothing moves without your signature.',
  },
  {
    q: 'What does it cost?',
    a: 'A 0.25% PYNEX fee shown in every quote, the pool’s own fee, and a network fee of usually a few cents, paid in the network’s stablecoin (USDG or USDC) from your PYNEX wallet. You never need ETH or HYPE for gas.',
  },
  {
    q: 'Which AI apps work?',
    a: 'AI apps that support remote MCP connectors with OAuth, such as Claude, ChatGPT, Gemini, Perplexity, Cursor, and Copilot. The Assistant button in the terminal has the address and setup steps.',
  },
  {
    q: 'Do I need the PYNEX token?',
    a: 'Not to trade, recover or withdraw. Holding at least 5,000,000 PYNEX on Robinhood Chain unlocks connecting new AI assistants via MCP.',
  },
  {
    q: 'How do I stop the AI?',
    a: 'Remove its connection in the Assistant window and it stops at once. It can’t move anything in the meantime anyway: every request waits for your passkey.',
  },
  {
    q: 'What if I lose my passkey?',
    a: 'Turn on a recovery code in Security: twelve words that can move your wallet to a new passkey. A recovery always waits 48 hours, you’re notified when one starts, and you can cancel it from any device still signed in.',
  },
  {
    q: 'Can I send my funds out?',
    a: 'Yes, your cash (USDG on Robinhood Chain or USDC on Elysium), to addresses you’ve saved. To send a token’s value, sell it first.',
  },
];

export function LandingPage() {
  const { theme, toggleTheme } = useThemeToggle();
  const [activeAi, setActiveAi] = useState<AiKey>('claude');
  const [demoSigned, setDemoSigned] = useState(false);
  const [permSetting, setPermSetting] = useState<'read' | 'trade'>('trade');
  const [safetyScenario, setSafetyScenario] = useState<SafetyScenario>('normal');
  const [lifecycleStep, setLifecycleStep] = useState<'quote' | 'approve' | 'sending' | 'confirmed' | 'expired'>('quote');
  const [tradeSize, setTradeSize] = useState(100);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [copiedCa, setCopiedCa] = useState(false);

  const selectedAiName = AI_APPS.find((a) => a.key === activeAi)?.name || 'Claude';

  const blockedCheckId: Record<SafetyScenario, string | null> = {
    normal: null,
    lookalike: 'verified',
    old_price: 'fresh_price',
    slippage: 'slippage',
    stale_quote: 'fresh_quote',
    flood: 'no_flood',
  };

  const copyCa = () => {
    navigator.clipboard.writeText(PYNEX_TOKEN_CA);
    setCopiedCa(true);
    setTimeout(() => setCopiedCa(false), 1800);
  };

  return (
    <div className="relative min-h-screen bg-[var(--desk)] text-[var(--text)] overflow-x-hidden">
      <HeroGlobe />

      {/* Top Navigation */}
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--bar-bg)] backdrop-blur-md">
        <div className="max-w-6xl mx-auto h-14 px-4 sm:px-6 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
            <PynexLogo size={28} />
            <span className="font-display font-bold text-lg tracking-tight">PYNEX</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[var(--text-muted)]">
            <Link to="/docs" className="hover:text-[var(--text)] transition-colors whitespace-nowrap shrink-0">
              Docs
            </Link>
            <a href="#faq" className="hover:text-[var(--text)] transition-colors whitespace-nowrap shrink-0">
              FAQ
            </a>
            <a
              href={PYNEX_X_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 hover:text-[var(--text)] transition-colors whitespace-nowrap shrink-0"
            >
              X (@PynexAgent)
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-[var(--border)] bg-[var(--win)] text-[var(--text-muted)] hover:text-[var(--text)] cursor-pointer"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <Link
              to="/app"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--accent)] text-[var(--accent-ink)] text-xs sm:text-sm font-bold hover:opacity-95 transition-opacity whitespace-nowrap shrink-0"
            >
              Open terminal
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 pt-14 pb-12 sm:pt-20 sm:pb-16 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center space-y-5">
          <h1 className="font-display font-bold tracking-tight text-[clamp(2.25rem,5vw,4.4rem)] leading-[1.03] [text-wrap:balance]">
            Your AI suggests the trade.{' '}
            <span className="text-[var(--accent-text)]">You keep control.</span>
          </h1>
          <p className="max-w-xl mx-auto text-base sm:text-lg text-[var(--text-muted)] leading-relaxed">
            PYNEX connects the AI assistant you already use to trading on Robinhood Chain and
            Elysium. It can research markets and ask to trade. Every trade waits for you to check
            fresh terms and sign.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              to="/app"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--accent)] text-[var(--accent-ink)] text-sm font-bold hover:opacity-95 transition-opacity"
            >
              Open the terminal
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#how"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-[var(--border)] bg-[var(--win)] text-sm font-semibold hover:border-[var(--border-strong)] transition-colors"
            >
              See how it works
            </a>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 pt-2 text-xs sm:text-sm text-[var(--text-muted)]">
            <span className="inline-flex items-center gap-1.5">
              <Check className="w-4 h-4 text-[var(--good-text)]" /> No seed phrase
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Check className="w-4 h-4 text-[var(--good-text)]" /> Only you can sign
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Check className="w-4 h-4 text-[var(--good-text)]" /> No gas token needed
            </span>
          </div>
        </div>

        {/* Interactive AI App + Approval Demo */}
        <div className="max-w-5xl mx-auto mt-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            {/* Left Window: AI App Example */}
            <div className="lg:col-span-7 rounded-2xl border border-[var(--border)] bg-[var(--win)] shadow-[var(--win-shadow)] overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--hair)] bg-[var(--surface-1)]">
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <AiAppGlyph app={activeAi} size={20} />
                  <span>ask {selectedAiName}: buy $40 of ETH</span>
                </div>
                <span className="text-[11px] text-[var(--text-faint)]">your AI app example</span>
              </div>

              <div className="p-4 space-y-4">
                <div className="text-xs font-semibold text-[var(--text-muted)]">
                  Connect PYNEX to the AI app you use
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {AI_APPS.map((app) => (
                    <button
                      key={app.key}
                      type="button"
                      onClick={() => {
                        setActiveAi(app.key);
                        setDemoSigned(false);
                      }}
                      className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border text-[11px] font-medium transition-colors cursor-pointer ${
                        activeAi === app.key
                          ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text)] font-semibold'
                          : 'border-[var(--border)] bg-[var(--surface-1)] text-[var(--text-muted)] hover:text-[var(--text)]'
                      }`}
                    >
                      <AiAppGlyph app={app.key} size={28} />
                      <span>{app.name}</span>
                    </button>
                  ))}
                </div>

                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-[var(--text)]">
                      {selectedAiName} is connected to PYNEX
                    </span>
                    <span className="text-[var(--good-text)] font-mono text-[11px]">MCP OAuth</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-[var(--text-muted)]">
                    <div className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-[var(--good-text)] shrink-0" />
                      See wallet & prices
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-[var(--good-text)] shrink-0" />
                      Ask to approve trade
                    </div>
                    <div className="flex items-center gap-1.5 text-[var(--bad-text)]">
                      <XCircle className="w-3.5 h-3.5 shrink-0" />
                      Cannot sign or move
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--well)] p-3 font-mono text-xs text-[var(--text-muted)] space-y-1">
                  <div className="text-[var(--accent-text)]">
                    ▸ tool_call: pynex.quote_swap(&quot;ETH&quot;, side=&quot;buy&quot;, usd=40)
                  </div>
                  <div>
                    ✓ verified 0x0bd7…ad73 · price 4s old · slippage 1.0% · awaiting owner passkey
                  </div>
                </div>
              </div>
            </div>

            {/* Right Window: Approvals */}
            <div className="lg:col-span-5 rounded-2xl border border-[var(--accent-line)] bg-[var(--win)] shadow-[var(--pop-shadow)] overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--hair)] bg-[var(--surface-1)]">
                <span className="text-xs font-semibold">pynex · approvals</span>
                <span className="text-[11px] font-mono text-[var(--accent-text)]">
                  {demoSigned ? 'Confirmed' : '1 waiting'}
                </span>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-2.5">
                  <AiAppGlyph app={activeAi} size={28} />
                  <div>
                    <div className="text-sm font-semibold">
                      {selectedAiName} asks to Buy ETH
                    </div>
                    <div className="text-xs text-[var(--text-muted)]">
                      Robinhood Chain · Uniswap v4
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-3 space-y-1.5 text-xs font-mono tabular-nums">
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">You pay</span>
                    <span>40.00 USDG</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">PYNEX fee (0.25%)</span>
                    <span>0.10 USDG</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">Minimum out (1%)</span>
                    <span className="text-[var(--good-text)]">0.0184 ETH</span>
                  </div>
                </div>

                {demoSigned ? (
                  <div className="rounded-xl border border-[var(--good-line)] bg-[var(--good-soft)] p-3 text-xs text-[var(--good-text)] flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 font-semibold">
                      <CheckCircle2 className="w-4 h-4" /> Settled on-chain
                    </span>
                    <button
                      type="button"
                      onClick={() => setDemoSigned(false)}
                      className="underline cursor-pointer"
                    >
                      Reset
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setDemoSigned(true)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-[var(--accent)] text-[var(--accent-ink)] text-xs font-bold hover:opacity-95 cursor-pointer"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      Approve with Passkey
                    </button>
                    <button
                      type="button"
                      onClick={() => setDemoSigned(false)}
                      className="py-2.5 px-3 rounded-xl border border-[var(--border)] text-xs font-semibold hover:bg-[var(--surface-1)] cursor-pointer"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how" className="relative z-10 py-14 px-4 sm:px-6 border-t border-[var(--hair)]">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="max-w-xl">
            <div className="text-xs font-semibold uppercase tracking-wider text-[var(--accent-text)]">
              How it works
            </div>
            <h2 className="text-2xl sm:text-3xl font-display font-bold mt-1">
              Three steps. You’re in every one.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                num: '01. Connect',
                title: 'Connect your AI',
                body: 'Add PYNEX to an AI app that supports MCP. Choose whether it can only look, or also request trades.',
              },
              {
                num: '02. Approve',
                title: 'It asks, you approve',
                body: 'Each trade arrives with fresh terms. Approve and sign with your passkey, or reject it.',
              },
              {
                num: '03. Control',
                title: 'Stay in charge',
                body: 'Every action lands in your activity log. Remove a connection and it stops at once.',
              },
            ].map((step) => (
              <div
                key={step.num}
                className="rounded-2xl border border-[var(--border)] bg-[var(--win)] p-6 space-y-2"
              >
                <div className="text-xs font-mono text-[var(--accent-text)]">{step.num}</div>
                <h3 className="text-lg font-display font-bold">{step.title}</h3>
                <p className="text-sm text-[var(--text-muted)] leading-relaxed">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What You Can Do */}
      <section className="relative z-10 py-14 px-4 sm:px-6 border-t border-[var(--hair)]">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-5 space-y-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-[var(--accent-text)]">
              What you can do
            </div>
            <h2 className="text-2xl sm:text-3xl font-display font-bold">
              One wallet, two networks.
            </h2>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed">
              Trade on Robinhood Chain and Elysium from the same ZeroDev Kernel v3.1 wallet address,
              by yourself or with your AI. You sign every step.
            </p>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--win)] p-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--text-muted)]">Smart account</span>
                <span className="font-mono text-[var(--accent-text)]">PYNEX</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[var(--surface-1)] border border-[var(--border)]">
                  <img src="/networks/robinhood.png" alt="Robinhood" className="w-5 h-5 rounded-full" />
                  <div className="text-xs">
                    <div className="font-semibold">Robinhood Chain</div>
                    <div className="text-[var(--text-muted)]">Cash: USDG</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[var(--surface-1)] border border-[var(--border)]">
                  <img src="/networks/elysium.png" alt="Elysium" className="w-5 h-5 rounded-full" />
                  <div className="text-xs">
                    <div className="font-semibold">Elysium</div>
                    <div className="text-[var(--text-muted)]">Cash: USDC</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              {
                title: 'Market, limit, take profit and stop loss',
                desc: 'Buy or sell now, at your price (orders last up to 90 days), or set exits on any buy.',
              },
              {
                title: 'Send cash out',
                desc: 'Send USDG or USDC to addresses you’ve saved, as soon as you save them.',
              },
              {
                title: 'Recover without a seed phrase',
                desc: 'An optional 12-word recovery code moves your wallet to a new passkey. Every recovery waits 48 hours, and you can cancel it.',
              },
              {
                title: 'Network fees in cash',
                desc: 'Fees come out of your USDG or USDC via TokenPaymaster, at cost. You never need to hold ETH or HYPE to trade.',
              },
            ].map((feat) => (
              <div
                key={feat.title}
                className="rounded-2xl border border-[var(--border)] bg-[var(--win)] p-5 space-y-2"
              >
                <h3 className="text-base font-display font-bold">{feat.title}</h3>
                <p className="text-sm text-[var(--text-muted)] leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Owner Control Permissions */}
      <section className="relative z-10 py-14 px-4 sm:px-6 border-t border-[var(--hair)]">
        <div className="max-w-5xl mx-auto rounded-2xl border border-[var(--border)] bg-[var(--win)] p-6 sm:p-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-[var(--accent-text)]">
                Owner control
              </div>
              <h2 className="text-2xl font-display font-bold mt-1">
                Your AI can help. It can’t take over.
              </h2>
              <p className="text-sm text-[var(--text-muted)] mt-1">
                An AI connection is a permission you can remove, not a key. Try both settings.
              </p>
            </div>
            <div className="flex items-center p-1 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
              <button
                type="button"
                onClick={() => setPermSetting('read')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                  permSetting === 'read'
                    ? 'bg-[var(--win)] text-[var(--text)] shadow-sm'
                    : 'text-[var(--text-muted)]'
                }`}
              >
                See your wallet
              </button>
              <button
                type="button"
                onClick={() => setPermSetting('trade')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                  permSetting === 'trade'
                    ? 'bg-[var(--accent)] text-[var(--accent-ink)]'
                    : 'text-[var(--text-muted)]'
                }`}
              >
                Request trades too
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2.5">
              <div className="text-xs font-semibold text-[var(--good-text)] uppercase tracking-wider">
                Your assistant can
              </div>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[var(--good-text)] shrink-0" />
                  See your balances, portfolio, orders and trade history
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[var(--good-text)] shrink-0" />
                  Read prices and charts
                </li>
                {permSetting === 'trade' && (
                  <>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-[var(--good-text)] shrink-0" />
                      Get quotes and request trades
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-[var(--good-text)] shrink-0" />
                      Request limit orders, take profit and stop loss
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-[var(--good-text)] shrink-0" />
                      Propose sends of cash to your saved addresses
                    </li>
                  </>
                )}
              </ul>
            </div>

            <div className="space-y-2.5">
              <div className="text-xs font-semibold text-[var(--bad-text)] uppercase tracking-wider">
                It can never
              </div>
              <ul className="space-y-2 text-sm text-[var(--text-muted)]">
                <li className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-[var(--bad-text)] shrink-0" />
                  Sign or approve anything
                </li>
                <li className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-[var(--bad-text)] shrink-0" />
                  Move funds without your passkey
                </li>
                <li className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-[var(--bad-text)] shrink-0" />
                  Send to an address you haven’t saved
                </li>
                <li className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-[var(--bad-text)] shrink-0" />
                  See your passkey or keys
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Safety Checks Simulator */}
      <section className="relative z-10 py-14 px-4 sm:px-6 border-t border-[var(--hair)]">
        <div className="max-w-5xl mx-auto space-y-6">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-[var(--accent-text)]">
              Safety checks
            </div>
            <h2 className="text-2xl sm:text-3xl font-display font-bold mt-1">
              Checked before it ever reaches you.
            </h2>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              PYNEX’s servers check every request the same way, whichever AI sends it. Send a bad
              request below and see where it stops.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {(
              [
                ['normal', 'A normal request'],
                ['lookalike', 'Look-alike token'],
                ['old_price', 'Old price'],
                ['slippage', '5% slippage'],
                ['stale_quote', 'Quote 45 s old'],
                ['flood', '61st request this hour'],
              ] as [SafetyScenario, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setSafetyScenario(key)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                  safetyScenario === key
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-text)]'
                    : 'border-[var(--border)] bg-[var(--win)] text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {SAFETY_CHECKS.map((chk) => {
              const isBlocked = blockedCheckId[safetyScenario] === chk.id;
              return (
                <div
                  key={chk.id}
                  className={`rounded-2xl border p-4 space-y-1.5 transition-colors ${
                    isBlocked
                      ? 'border-[var(--bad-line)] bg-[var(--bad-soft)]'
                      : 'border-[var(--border)] bg-[var(--win)]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-display font-bold">{chk.title}</span>
                    {isBlocked ? (
                      <span className="text-xs font-mono font-bold text-[var(--bad-text)]">BLOCKED</span>
                    ) : (
                      <span className="text-xs font-mono font-semibold text-[var(--good-text)]">PASS</span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">{chk.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Quote to Receipt + Fees + PYNEX Token */}
      <section className="relative z-10 py-14 px-4 sm:px-6 border-t border-[var(--hair)]">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Quote lifecycle */}
          <div className="lg:col-span-6 rounded-2xl border border-[var(--border)] bg-[var(--win)] p-6 space-y-5">
            <div>
              <div className="text-xs font-mono text-[var(--accent-text)]">Quote to receipt</div>
              <h3 className="text-xl font-display font-bold mt-1">
                Every trade shows fixed terms for 30 seconds
              </h3>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {(['quote', 'approve', 'sending', 'confirmed', 'expired'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setLifecycleStep(st)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize cursor-pointer ${
                    lifecycleStep === st
                      ? 'bg-[var(--accent)] text-[var(--accent-ink)]'
                      : 'bg-[var(--surface-1)] text-[var(--text-muted)]'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4 space-y-2 text-xs font-mono tabular-nums">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">You pay</span>
                <span>40.00 USDG</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">PYNEX fee (0.25%)</span>
                <span>0.10 USDG</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Expected</span>
                <span>0.0186 ETH</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Minimum (1% slippage)</span>
                <span>0.0184 ETH</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-[var(--hair)]">
                <span className="text-[var(--text-muted)]">Stage</span>
                <span className="text-[var(--accent-text)] uppercase font-bold">{lifecycleStep}</span>
              </div>
            </div>
          </div>

          {/* Fee Calculator & PYNEX Token */}
          <div className="lg:col-span-6 space-y-6">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--win)] p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-display font-bold">0.25% fee on confirmed trades</h3>
                <span className="font-mono text-sm font-bold text-[var(--accent-text)] tabular-nums">
                  ${tradeSize}
                </span>
              </div>
              <input
                type="range"
                min={10}
                max={10000}
                step={10}
                value={tradeSize}
                onChange={(e) => setTradeSize(Number(e.target.value))}
                className="w-full accent-[var(--accent)] cursor-pointer"
              />
              <div className="grid grid-cols-3 gap-2 text-xs font-mono tabular-nums pt-1">
                <div className="p-2.5 rounded-xl bg-[var(--surface-1)]">
                  <div className="text-[var(--text-muted)]">PYNEX (0.25%)</div>
                  <div className="font-bold mt-0.5">${(tradeSize * 0.0025).toFixed(2)}</div>
                </div>
                <div className="p-2.5 rounded-xl bg-[var(--surface-1)]">
                  <div className="text-[var(--text-muted)]">Pool fee</div>
                  <div className="font-bold mt-0.5">Set by pool</div>
                </div>
                <div className="p-2.5 rounded-xl bg-[var(--surface-1)]">
                  <div className="text-[var(--text-muted)]">Network fee</div>
                  <div className="font-bold mt-0.5">~$0.03 USDG</div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--accent-line)] bg-[var(--win)] p-6 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PynexLogo size={24} />
                  <h3 className="text-lg font-display font-bold">PYNEX Token</h3>
                </div>
                <span className="text-xs font-mono text-[var(--accent-text)]">Robinhood Chain</span>
              </div>
              <p className="text-sm text-[var(--text-muted)]">
                Holding 5,000,000 PYNEX unlocks connecting AI assistants via MCP. You never need it
                to trade, recover, or withdraw.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <code className="flex-1 px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--well)] text-xs font-mono truncate">
                  {PYNEX_TOKEN_CA}
                </code>
                <button
                  type="button"
                  onClick={copyCa}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] text-xs font-semibold cursor-pointer"
                >
                  {copiedCa ? <Check className="w-3.5 h-3.5 text-[var(--good-text)]" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedCa ? 'Copied' : shortAddr(PYNEX_TOKEN_CA)}
                </button>
                <Link
                  to="/app?t=PYNEX&chain=4663"
                  className="px-3.5 py-2 rounded-xl bg-[var(--accent)] text-[var(--accent-ink)] text-xs font-bold"
                >
                  Trade PYNEX
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="relative z-10 py-14 px-4 sm:px-6 border-t border-[var(--hair)]">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-[var(--accent-text)]">
                FAQ
              </div>
              <h2 className="text-2xl sm:text-3xl font-display font-bold mt-1">Straight answers.</h2>
            </div>
            <Link to="/docs" className="text-xs font-semibold text-[var(--accent-text)] hover:underline">
              Read the docs →
            </Link>
          </div>

          <div className="divide-y divide-[var(--hair)] rounded-2xl border border-[var(--border)] bg-[var(--win)] overflow-hidden">
            {FAQ_ITEMS.map((item, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={item.q}>
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left text-sm font-semibold hover:bg-[var(--surface-1)] transition-colors cursor-pointer"
                  >
                    <span>{item.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-[var(--text-muted)] shrink-0 transition-transform ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-4 text-sm text-[var(--text-muted)] leading-relaxed">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Get Started CTA */}
      <section className="relative z-10 py-14 px-4 sm:px-6 border-t border-[var(--hair)]">
        <div className="max-w-4xl mx-auto rounded-2xl border border-[var(--accent-line)] bg-[var(--win)] p-6 sm:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="text-xs font-mono text-[var(--accent-text)]">Get started</div>
            <h2 className="text-2xl sm:text-3xl font-display font-bold">
              Set up in about two minutes.
            </h2>
            <p className="text-sm text-[var(--text-muted)]">
              1. Sign in with passkey or email · 2. Add funds · 3. Connect your AI and ask anything.
            </p>
          </div>
          <Link
            to="/app"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--accent)] text-[var(--accent-ink)] text-sm font-bold hover:opacity-95 shrink-0"
          >
            Open the terminal
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-[var(--border)] bg-[var(--win)] py-12 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <PynexLogo size={24} />
                <span className="font-display font-bold text-base">PYNEX</span>
              </div>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                Your AI asks. You approve and sign every trade, from a wallet only you control.
              </p>
              <a
                href={PYNEX_X_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent-text)] hover:underline"
              >
                Follow on X (@PynexAgent)
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="space-y-2 text-xs">
              <div className="font-semibold text-[var(--text)]">Product</div>
              <div className="flex flex-col gap-1.5 text-[var(--text-muted)]">
                <Link to="/app" className="hover:text-[var(--text)]">Terminal</Link>
                <Link to="/app/discover" className="hover:text-[var(--text)]">Discover</Link>
                <Link to="/app/approvals" className="hover:text-[var(--text)]">Approvals</Link>
                <Link to="/docs#status" className="hover:text-[var(--text)]">Status</Link>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="font-semibold text-[var(--text)]">Learn</div>
              <div className="flex flex-col gap-1.5 text-[var(--text-muted)]">
                <Link to="/docs" className="hover:text-[var(--text)]">Docs</Link>
                <Link to="/docs#fees" className="hover:text-[var(--text)]">Fees</Link>
                <Link to="/docs#risks" className="hover:text-[var(--text)]">Risks</Link>
                <a href="#faq" className="hover:text-[var(--text)]">FAQ</a>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="font-semibold text-[var(--text)]">Help and legal</div>
              <div className="flex flex-col gap-1.5 text-[var(--text-muted)]">
                <Link to="/docs#help" className="hover:text-[var(--text)]">Help and contact</Link>
                <Link to="/terms" className="hover:text-[var(--text)]">Terms</Link>
                <Link to="/privacy" className="hover:text-[var(--text)]">Privacy</Link>
                <a
                  href={PYNEX_X_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-[var(--text)]"
                >
                  X / Twitter (@PynexAgent)
                </a>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-[var(--hair)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-[11px] text-[var(--text-faint)]">
            <p className="max-w-3xl leading-relaxed">
              Trading digital assets can lose money, including all of it. Transactions can fail,
              settle at worse prices within your slippage limit, or be delayed. Market data, smart
              contracts and AI assistants can be wrong or unavailable. PYNEX is independent software.
            </p>
            <span className="shrink-0">© 2026 PYNEX</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
