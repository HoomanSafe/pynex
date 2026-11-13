import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Search,
  Bot,
  Wallet,
  Sun,
  Moon,
  ChevronDown,
  Menu,
  X,
  ShieldCheck,
  LogOut,
  User,
} from 'lucide-react';
import { PynexLogo } from './BrandLogo';
import { useWallet, type MarketToken } from '../lib/walletContext';
import { formatUsd, shortAddr } from '../lib/contracts';
import {
  AssistantModal,
  CommandPaletteModal,
  DepositSendModal,
  SignInModal,
} from './Modals';

export function useThemeToggle() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const stored = localStorage.getItem('pynex_theme');
      if (stored === 'light' || stored === 'dark') return stored;
    } catch {
      // ignore
    }
    return 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('pynex_theme', theme);
    } catch {
      // ignore
    }
  }, [theme]);

  return {
    theme,
    toggleTheme: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')),
  };
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const {
    state,
    markets,
    setSignInModalOpen,
    setAssistantModalOpen,
    setDepositModalOpen,
    signOut,
  } = useWallet();
  const { theme, toggleTheme } = useThemeToggle();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      } else if (e.key === 'Escape') {
        setPaletteOpen(false);
        setUserMenuOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const pendingApprovals = state.approvals.filter((a) => a.status === 'pending').length;

  const totalPortfolioUsd = state.holdings.reduce((sum, h) => {
    const m = markets.find((t) => t.symbol.toUpperCase() === h.symbol.toUpperCase());
    const px = h.isCash ? 1 : m?.priceUsd ?? h.avgCostUsd;
    return sum + h.amount * px;
  }, 0);

  const handlePickToken = (tok: MarketToken) => {
    navigate(`/app?t=${encodeURIComponent(tok.symbol)}&chain=${tok.chainId}`);
  };

  const navItems = [
    { to: '/app', label: 'Trade', active: pathname === '/app' || pathname === '/app/' },
    { to: '/app/discover', label: 'Discover', active: pathname.startsWith('/app/discover') },
    {
      to: '/app/approvals',
      label: 'Approvals',
      badge: pendingApprovals,
      active: pathname.startsWith('/app/approvals'),
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[var(--desk)] text-[var(--text)]">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 h-14 px-3 sm:px-5 flex items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--bar-bg)] backdrop-blur-md">
        <div className="flex items-center gap-5 min-w-0">
          <Link to="/" className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
            <PynexLogo size={26} />
            <span className="font-display font-bold text-base tracking-tight">PYNEX</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                  item.active
                    ? 'bg-[var(--surface-2)] text-[var(--text)] font-semibold'
                    : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-1)]'
                }`}
              >
                <span>{item.label}</span>
                {item.badge ? (
                  <span className="px-1.5 py-0.2 rounded-full text-[11px] font-bold bg-[var(--accent)] text-[var(--accent-ink)] tabular-nums">
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            ))}
          </nav>
        </div>

        {/* Search trigger */}
        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          className="hidden lg:flex items-center justify-between gap-6 w-64 px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--win)] text-xs text-[var(--text-muted)] hover:border-[var(--border-strong)] cursor-pointer"
        >
          <span className="inline-flex items-center gap-2">
            <Search className="w-3.5 h-3.5" />
            Search tokens…
          </span>
          <kbd className="px-1.5 py-0.5 rounded bg-[var(--surface-2)] font-mono text-[10px]">⌘K</kbd>
        </button>

        {/* Right Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="lg:hidden p-2 rounded-xl border border-[var(--border)] bg-[var(--win)] text-[var(--text-muted)] hover:text-[var(--text)] cursor-pointer"
            aria-label="Search tokens"
          >
            <Search className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setAssistantModalOpen(true)}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--win)] text-xs font-semibold hover:border-[var(--accent)] cursor-pointer whitespace-nowrap"
          >
            <Bot className="w-3.5 h-3.5 text-[var(--accent-text)]" />
            Assistant
          </button>

          <button
            type="button"
            onClick={() => setDepositModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--accent-line)] bg-[var(--accent-soft)] text-[var(--accent-text)] text-xs font-mono font-semibold tabular-nums hover:opacity-90 cursor-pointer whitespace-nowrap"
          >
            <Wallet className="w-3.5 h-3.5" />
            {formatUsd(totalPortfolioUsd)}
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-xl border border-[var(--border)] bg-[var(--win)] text-[var(--text-muted)] hover:text-[var(--text)] cursor-pointer"
            aria-label="Toggle color theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {state.signedIn ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setUserMenuOpen((v) => !v)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--win)] text-xs font-semibold hover:bg-[var(--surface-1)] cursor-pointer"
              >
                <span className="w-5 h-5 rounded-full bg-[var(--accent)] text-[var(--accent-ink)] inline-flex items-center justify-center text-[11px] font-bold">
                  P
                </span>
                <span className="hidden sm:inline font-mono">
                  {shortAddr(state.injectedAddress || state.smartWalletAddress, 5, 3)}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl border border-[var(--border)] bg-[var(--win)] shadow-[var(--pop-shadow)] p-1.5 z-50">
                  <div className="px-3 py-2 border-b border-[var(--hair)]">
                    <div className="text-xs font-semibold">{state.displayName}</div>
                    <div className="text-[11px] font-mono text-[var(--text-muted)] truncate">
                      {state.smartWalletAddress}
                    </div>
                  </div>
                  <Link
                    to="/app/profile"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium hover:bg-[var(--surface-1)]"
                  >
                    <User className="w-3.5 h-3.5" /> Portfolio & Profile
                  </Link>
                  <Link
                    to="/app/profile?tab=security"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium hover:bg-[var(--surface-1)]"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" /> Security & Recovery
                  </Link>
                  <Link
                    to="/docs"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium hover:bg-[var(--surface-1)]"
                  >
                    Docs & Contracts
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      signOut();
                      setUserMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-[var(--bad-text)] hover:bg-[var(--bad-soft)] cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setSignInModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-[var(--accent)] text-[var(--accent-ink)] text-xs font-bold cursor-pointer whitespace-nowrap"
            >
              Sign in
            </button>
          )}

          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="md:hidden p-2 rounded-xl border border-[var(--border)] bg-[var(--win)] text-[var(--text-muted)] cursor-pointer"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Mobile Nav Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-[var(--border)] bg-[var(--win)] px-4 py-3 space-y-2">
          <div className="grid grid-cols-3 gap-2">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border ${
                  item.active
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-text)]'
                    : 'border-[var(--border)] bg-[var(--surface-1)]'
                }`}
              >
                {item.label}
                {item.badge ? ` (${item.badge})` : ''}
              </Link>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setAssistantModalOpen(true);
                setMobileMenuOpen(false);
              }}
              className="py-2 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] text-xs font-semibold cursor-pointer"
            >
              Assistant (MCP)
            </button>
            <Link
              to="/app/profile"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] text-xs font-semibold text-center"
            >
              Profile & Security
            </Link>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">{children}</main>

      <SignInModal />
      <AssistantModal />
      <DepositSendModal />
      <CommandPaletteModal
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onPickToken={handlePickToken}
      />
    </div>
  );
}
