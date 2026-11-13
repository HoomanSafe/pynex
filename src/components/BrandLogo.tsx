import React, { useState } from 'react';
import { NETWORKS } from '../lib/contracts';

export function PynexLogo({ size = 28 }: { size?: number }) {
  const [imgFailed, setImgFailed] = useState(false);

  if (imgFailed) {
    return (
      <span
        className="inline-flex items-center justify-center rounded-lg bg-[#353130] text-[#77fbca] font-bold shrink-0"
        style={{ width: size, height: size, fontSize: size * 0.55 }}
      >
        P
      </span>
    );
  }

  return (
    <img
      src="/assets/aistudio/image_9771dd8c.png"
      alt="PYNEX"
      width={size}
      height={size}
      onError={() => setImgFailed(true)}
      className="rounded-lg object-cover shrink-0"
      style={{ width: size, height: size }}
    />
  );
}

export function TokenIcon({
  symbol,
  chainId,
  logo,
  size = 28,
  showNet = true,
}: {
  symbol: string;
  chainId?: number;
  logo?: string | null;
  size?: number;
  showNet?: boolean;
}) {
  const [err, setErr] = useState(false);
  const sym = symbol.toUpperCase();
  const net = chainId ? NETWORKS[chainId] : undefined;

  let mainEl: React.ReactNode;

  if (sym === 'PYNEX') {
    mainEl = <PynexLogo size={size} />;
  } else if (logo && !err) {
    mainEl = (
      <img
        src={logo}
        alt={symbol}
        width={size}
        height={size}
        onError={() => setErr(true)}
        className="rounded-full object-cover shrink-0"
        style={{ width: size, height: size }}
      />
    );
  } else if (sym === 'ETH' && !err) {
    mainEl = (
      <img
        src="/tokens/eth.png"
        alt="ETH"
        width={size}
        height={size}
        onError={() => setErr(true)}
        className="rounded-full object-cover bg-[#6b86f8]/15 shrink-0"
        style={{ width: size, height: size }}
      />
    );
  } else if (sym === 'USDG' && !err) {
    mainEl = (
      <img
        src="/tokens/usdg.png"
        alt="USDG"
        width={size}
        height={size}
        onError={() => setErr(true)}
        className="rounded-full object-cover bg-[#1fae74]/15 shrink-0"
        style={{ width: size, height: size }}
      />
    );
  } else {
    const colors: Record<string, string> = {
      USDC: 'from-[#4da2ff] to-[#2775ca]',
      HYPE: 'from-[#77fbca] to-[#1d8e66]',
      ETH: 'from-[#9db3ff] to-[#5c7cfa]',
      USDG: 'from-[#77fbca] to-[#1a9e6a]',
    };
    const grad = colors[sym] || 'from-[#4d4745] to-[#2b2827]';
    mainEl = (
      <span
        className={`inline-flex items-center justify-center rounded-full bg-gradient-to-br ${grad} text-white font-semibold shrink-0 select-none`}
        style={{ width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.44)) }}
      >
        {sym.slice(0, 1)}
      </span>
    );
  }

  if (!showNet || !net || size < 20) return <>{mainEl}</>;

  const badgeSize = Math.max(11, Math.min(16, Math.round(size * 0.42)));
  return (
    <span className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
      {mainEl}
      <img
        src={net.icon}
        alt={net.name}
        width={badgeSize}
        height={badgeSize}
        className="absolute -bottom-0.5 -right-0.5 rounded-full border border-[var(--win)] bg-[var(--win)] object-cover"
        style={{ width: badgeSize, height: badgeSize }}
      />
    </span>
  );
}

export function AiAppGlyph({
  app,
  size = 24,
}: {
  app: 'claude' | 'chatgpt' | 'gemini' | 'perplexity' | 'cursor' | 'copilot';
  size?: number;
}) {
  const styles: Record<string, { bg: string; fg: string; label: string }> = {
    claude: { bg: 'bg-[#D97757]/15 border-[#D97757]/35', fg: '#D97757', label: 'C' },
    chatgpt: { bg: 'bg-[#10A37F]/15 border-[#10A37F]/35', fg: '#10A37F', label: 'G' },
    gemini: { bg: 'bg-[#3186FF]/15 border-[#3186FF]/35', fg: '#3186FF', label: '✦' },
    perplexity: { bg: 'bg-[#22B8CD]/15 border-[#22B8CD]/35', fg: '#22B8CD', label: 'P' },
    cursor: { bg: 'bg-[#77fbca]/15 border-[#77fbca]/35', fg: '#77fbca', label: '▸' },
    copilot: { bg: 'bg-[#8B5CF6]/15 border-[#8B5CF6]/35', fg: '#A78BFA', label: '◈' },
  };

  const s = styles[app] || styles.claude;
  return (
    <span
      className={`inline-flex items-center justify-center rounded-lg border font-display font-bold shrink-0 ${s.bg}`}
      style={{ width: size, height: size, color: s.fg, fontSize: Math.round(size * 0.48) }}
      aria-hidden="true"
    >
      {s.label}
    </span>
  );
}
