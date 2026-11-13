import React, { useMemo, useState } from 'react';
import { formatPrice } from '../lib/contracts';

export interface Candle {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

export function CandlestickChart({
  candles,
  loading,
  currentPrice,
  interval,
  onIntervalChange,
}: {
  candles: Candle[];
  loading: boolean;
  currentPrice: number;
  interval: string;
  onIntervalChange: (tf: string) => void;
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const intervals = ['1m', '5m', '15m', '1h', '4h', '1d'];

  const bounds = useMemo(() => {
    if (!candles.length) {
      return { min: currentPrice * 0.95, max: currentPrice * 1.05, maxVol: 1 };
    }
    let min = Infinity;
    let max = -Infinity;
    let maxVol = 0;
    for (const c of candles) {
      if (c.l < min) min = c.l;
      if (c.h > max) max = c.h;
      if (c.v > maxVol) maxVol = c.v;
    }
    const pad = (max - min) * 0.1 || currentPrice * 0.02;
    return { min: Math.max(0, min - pad), max: max + pad, maxVol: maxVol || 1 };
  }, [candles, currentPrice]);

  const activeCandle = hoverIdx !== null && candles[hoverIdx] ? candles[hoverIdx] : candles[candles.length - 1];

  const width = 760;
  const height = 280;
  const padRight = 72;
  const plotW = width - padRight;
  const plotH = height - 28;

  const yFor = (price: number) => {
    const span = Math.max(1e-12, bounds.max - bounds.min);
    return 10 + ((bounds.max - price) / span) * (plotH - 20);
  };

  const lastY = yFor(currentPrice);

  return (
    <div className="flex flex-col flex-1 min-h-[290px]">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 border-b border-[var(--hair)]">
        <div className="flex items-center gap-1">
          {intervals.map((tf) => (
            <button
              key={tf}
              type="button"
              onClick={() => onIntervalChange(tf)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                interval === tf
                  ? 'bg-[var(--surface-2)] text-[var(--text)] font-semibold'
                  : 'text-[var(--text-faint)] hover:text-[var(--text)]'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>

        {activeCandle && (
          <div className="flex flex-wrap items-center gap-3 text-[11.5px] font-mono tabular-nums text-[var(--text-muted)]">
            <span>O {formatPrice(activeCandle.o)}</span>
            <span>H {formatPrice(activeCandle.h)}</span>
            <span>L {formatPrice(activeCandle.l)}</span>
            <span className={activeCandle.c >= activeCandle.o ? 'text-[var(--good-text)]' : 'text-[var(--bad-text)]'}>
              C {formatPrice(activeCandle.c)}
            </span>
          </div>
        )}
      </div>

      <div className="relative flex-1 min-h-[240px] w-full select-none p-2">
        {loading && candles.length === 0 ? (
          <div className="h-full min-h-[230px] flex items-center justify-center text-xs text-[var(--text-muted)]">
            Loading chart data…
          </div>
        ) : (
          <svg
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="none"
            className="w-full h-full min-h-[230px] overflow-visible"
            onMouseLeave={() => setHoverIdx(null)}
          >
            {/* Horizontal grid lines */}
            {[0.15, 0.38, 0.62, 0.85].map((ratio, idx) => {
              const p = bounds.max - (bounds.max - bounds.min) * ratio;
              const y = yFor(p);
              return (
                <g key={idx}>
                  <line
                    x1={0}
                    y1={y}
                    x2={plotW}
                    y2={y}
                    stroke="var(--hair)"
                    strokeWidth={1}
                    vectorEffect="non-scaling-stroke"
                  />
                  <text
                    x={plotW + 8}
                    y={y + 3}
                    fill="var(--text-faint)"
                    fontSize={10.5}
                    fontFamily="var(--font-mono)"
                  >
                    {formatPrice(p)}
                  </text>
                </g>
              );
            })}

            {/* Volume bars + Candlesticks */}
            {candles.map((c, idx) => {
              const step = plotW / Math.max(candles.length, 1);
              const x = idx * step + step * 0.5;
              const barW = Math.max(2, Math.min(8, step * 0.62));
              const isUp = c.c >= c.o;
              const fill = isUp ? 'var(--good)' : 'var(--bad)';
              const topY = yFor(Math.max(c.o, c.c));
              const botY = yFor(Math.min(c.o, c.c));
              const bodyH = Math.max(1.5, botY - topY);
              const wickTop = yFor(c.h);
              const wickBot = yFor(c.l);
              const volH = (c.v / bounds.maxVol) * 34;

              return (
                <g
                  key={c.t}
                  onMouseEnter={() => setHoverIdx(idx)}
                  className="cursor-crosshair"
                >
                  <rect
                    x={x - step * 0.5}
                    y={0}
                    width={step}
                    height={plotH}
                    fill="transparent"
                  />
                  <rect
                    x={x - barW / 2}
                    y={height - 10 - volH}
                    width={barW}
                    height={volH}
                    fill={fill}
                    opacity={0.18}
                  />
                  <line
                    x1={x}
                    y1={wickTop}
                    x2={x}
                    y2={wickBot}
                    stroke={fill}
                    strokeWidth={1.2}
                    vectorEffect="non-scaling-stroke"
                  />
                  <rect
                    x={x - barW / 2}
                    y={topY}
                    width={barW}
                    height={bodyH}
                    rx={1}
                    fill={fill}
                  />
                </g>
              );
            })}

            {/* Current Price Line */}
            <line
              x1={0}
              y1={lastY}
              x2={plotW}
              y2={lastY}
              stroke="var(--accent)"
              strokeWidth={1}
              strokeDasharray="3 3"
              vectorEffect="non-scaling-stroke"
            />
            <g transform={`translate(${plotW + 4}, ${Math.max(10, Math.min(plotH - 10, lastY))})`}>
              <rect
                x={0}
                y={-9}
                width={66}
                height={18}
                rx={4}
                fill="var(--accent)"
              />
              <text
                x={33}
                y={3.5}
                textAnchor="middle"
                fill="var(--accent-ink)"
                fontSize={10}
                fontWeight={700}
                fontFamily="var(--font-mono)"
              >
                {formatPrice(currentPrice)}
              </text>
            </g>

            {/* Hover crosshair */}
            {hoverIdx !== null && candles[hoverIdx] && (
              <line
                x1={(hoverIdx + 0.5) * (plotW / Math.max(candles.length, 1))}
                y1={0}
                x2={(hoverIdx + 0.5) * (plotW / Math.max(candles.length, 1))}
                y2={plotH}
                stroke="var(--border-strong)"
                strokeWidth={1}
                strokeDasharray="2 2"
                vectorEffect="non-scaling-stroke"
              />
            )}
          </svg>
        )}
      </div>
    </div>
  );
}
