import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ShieldCheck, AlertTriangle, ArrowUpRight } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { TokenIcon } from '../components/BrandLogo';
import { formatPrice, formatUsd, shortAddr } from '../lib/contracts';

interface DiscoverItem {
  chainId: number;
  network: string;
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logo: string | null;
  pool: {
    id: string;
    fee: number;
    pairSymbol: string;
    venue: string;
  };
  createdAt: number;
  priceUsd: number;
  change5m: number;
  change1h: number;
  change24h: number;
  vol1h: number;
  vol24h: number;
  buys1h: number;
  sells1h: number;
  liquidityUsd: number;
  mcapUsd: number;
  safety: { sell: string; buyTaxPct: number; sellTaxPct: number };
  risk: { level: string; reasons: { text: string }[] };
}

export function DiscoverPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'trending' | 'new' | 'top'>('trending');
  const [networkFilter, setNetworkFilter] = useState<'all' | '4663' | '99901'>('all');
  const [minLiq, setMinLiq] = useState<number>(0);
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<DiscoverItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/v1/discover/feed?tab=${tab}`)
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.items)) setItems(d.items);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tab]);

  const filtered = items.filter((item) => {
    if (networkFilter !== 'all' && String(item.chainId) !== networkFilter) return false;
    if (item.liquidityUsd < minLiq) return false;
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      return (
        item.symbol.toLowerCase().includes(q) ||
        item.name.toLowerCase().includes(q) ||
        item.address.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <AppShell>
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-display font-bold">Discover</h1>
          <p className="text-sm text-[var(--text-muted)]">
            New and busy tokens on Robinhood Chain and Elysium, updated every minute. PYNEX
            test-sells each one and flags anything risky.
          </p>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center p-1 rounded-xl bg-[var(--win)] border border-[var(--border)]">
              {(
                [
                  ['trending', 'Trending'],
                  ['new', 'New'],
                  ['top', 'Top 24h'],
                ] as const
              ).map(([k, lbl]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setTab(k)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                    tab === k
                      ? 'bg-[var(--accent)] text-[var(--accent-ink)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                  }`}
                >
                  {lbl}
                </button>
              ))}
            </div>

            <div className="flex items-center p-1 rounded-xl bg-[var(--win)] border border-[var(--border)]">
              {(
                [
                  ['all', 'All'],
                  ['4663', 'Robinhood'],
                  ['99901', 'Elysium'],
                ] as const
              ).map(([k, lbl]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setNetworkFilter(k)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                    networkFilter === k
                      ? 'bg-[var(--surface-2)] text-[var(--text)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                  }`}
                >
                  {lbl}
                </button>
              ))}
            </div>

            <div className="flex items-center p-1 rounded-xl bg-[var(--win)] border border-[var(--border)]">
              {(
                [
                  [0, 'Any Liq'],
                  [1000, '$1K+'],
                  [10000, '$10K+'],
                ] as const
              ).map(([val, lbl]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setMinLiq(val)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                    minLiq === val
                      ? 'bg-[var(--surface-2)] text-[var(--text)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                  }`}
                >
                  {lbl}
                </button>
              ))}
            </div>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-[var(--text-faint)] absolute left-3 top-2.5" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tokens or paste 0x address"
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--win)] text-xs focus:outline-none focus:border-[var(--accent)]"
            />
          </div>
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--win)] overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[var(--hair)] text-[var(--text-muted)] bg-[var(--surface-1)]">
              <tr>
                <th className="py-3 px-4 font-semibold">Token</th>
                <th className="py-3 px-4 font-semibold text-right">Price</th>
                <th className="py-3 px-4 font-semibold text-right">1h</th>
                <th className="py-3 px-4 font-semibold text-right">24h</th>
                <th className="py-3 px-4 font-semibold text-right">Volume 24h</th>
                <th className="py-3 px-4 font-semibold text-right">Liquidity</th>
                <th className="py-3 px-4 font-semibold text-right">MCap</th>
                <th className="py-3 px-4 font-semibold">Safety</th>
                <th className="py-3 px-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--hair)] font-mono tabular-nums">
              {loading && items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-[var(--text-muted)] font-sans">
                    Scanning Robinhood Chain & Elysium pools…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-[var(--text-muted)] font-sans">
                    No pools match your current filters.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr
                    key={`${item.chainId}-${item.address}`}
                    className="hover:bg-[var(--surface-1)] transition-colors"
                  >
                    <td className="py-3 px-4 font-sans">
                      <div className="flex items-center gap-3">
                        <TokenIcon
                          symbol={item.symbol}
                          chainId={item.chainId}
                          logo={item.logo}
                          size={30}
                        />
                        <div>
                          <div className="font-bold text-sm">{item.symbol}</div>
                          <div className="text-[11px] text-[var(--text-muted)]">
                            {item.name} · <span className="font-mono">{shortAddr(item.address)}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-semibold">
                      {formatPrice(item.priceUsd)}
                    </td>
                    <td
                      className={`py-3 px-4 text-right ${
                        item.change1h >= 0 ? 'text-[var(--good-text)]' : 'text-[var(--bad-text)]'
                      }`}
                    >
                      {item.change1h >= 0 ? '+' : ''}
                      {item.change1h.toFixed(2)}%
                    </td>
                    <td
                      className={`py-3 px-4 text-right ${
                        item.change24h >= 0 ? 'text-[var(--good-text)]' : 'text-[var(--bad-text)]'
                      }`}
                    >
                      {item.change24h >= 0 ? '+' : ''}
                      {item.change24h.toFixed(2)}%
                    </td>
                    <td className="py-3 px-4 text-right">{formatUsd(item.vol24h)}</td>
                    <td className="py-3 px-4 text-right">{formatUsd(item.liquidityUsd)}</td>
                    <td className="py-3 px-4 text-right">{formatUsd(item.mcapUsd)}</td>
                    <td className="py-3 px-4 font-sans">
                      {item.risk?.level === 'low' ? (
                        <span className="inline-flex items-center gap-1 text-[var(--good-text)] font-medium">
                          <ShieldCheck className="w-3.5 h-3.5" /> Sell OK · 0% tax
                        </span>
                      ) : (
                        <span
                          title={item.risk?.reasons?.[0]?.text || 'Caution'}
                          className="inline-flex items-center gap-1 text-[var(--warn-text)] font-medium"
                        >
                          <AlertTriangle className="w-3.5 h-3.5" /> {item.risk?.level || 'caution'}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-sans">
                      <button
                        type="button"
                        onClick={() =>
                          navigate(
                            `/app?t=${encodeURIComponent(item.symbol)}&chain=${item.chainId}`,
                          )
                        }
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--accent)] text-[var(--accent-ink)] text-xs font-bold hover:opacity-90 cursor-pointer"
                      >
                        Trade <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
