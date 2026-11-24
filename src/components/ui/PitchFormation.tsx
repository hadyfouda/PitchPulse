import type { ReactNode } from 'react';
import type { Formation } from '../../types/tactics.ts';
import { slotDef } from '../../engine/formations.ts';

export type TokenTone = 'normal' | 'warn' | 'error' | 'muted';

export interface PitchToken {
  slot: number;
  number: number | string;
  name: string;
  /** Second line under the name, e.g. role short code. */
  sub: string;
  /** 0–100, drawn as a ring around the shirt (fitness or stamina). */
  ring: number;
  tone: TokenTone;
  selected: boolean;
  /** Small corner badge (rating, overall…). */
  badge?: string;
  badgeClass?: string;
  /** Icons after the name: cards, goals, injury. */
  marks?: ReactNode;
  title?: string;
}

const ringColor = (v: number): string => (v >= 90 ? '#34d399' : v >= 78 ? '#a3e635' : v >= 65 ? '#fbbf24' : '#fb7185');

/** Slot coordinates (x 0 = left, y 0 = own goal) → percentages on a vertical pitch attacking upwards. */
export const tokenPos = (formation: Formation, slot: number): { left: number; top: number } => {
  const d = slotDef(formation, slot);
  return { left: 8 + d.x * 84, top: 93 - Math.min(1, d.y / 0.84) * 83 };
};

/** Vertical pitch with one token per occupied slot. Tokens are buttons; the parent decides what a tap does. */
export function PitchFormation({ formation, tokens, color, onTap, emptySlots = [] }: {
  formation: Formation;
  tokens: PitchToken[];
  color: string;
  onTap: (slot: number) => void;
  /** Slots with nobody in them (sent off, empty lineup slot) — drawn as dashed circles. */
  emptySlots?: { slot: number; label: string; selected?: boolean }[];
}) {
  return (
    <div className="relative mx-auto w-full max-w-[420px] select-none overflow-hidden rounded-xl border border-emerald-900/60"
      style={{ aspectRatio: '0.74', background: 'repeating-linear-gradient(180deg, #0f3d2a 0 10%, #0d3524 10% 20%)' }}>
      {/* markings */}
      <svg viewBox="0 0 74 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
        <g fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.45">
          <rect x="3" y="2.5" width="68" height="95" rx="0.6" />
          <line x1="3" y1="50" x2="71" y2="50" />
          <ellipse cx="37" cy="50" rx="8.5" ry="6.2" />
          <rect x="18" y="2.5" width="38" height="14" />
          <rect x="28" y="2.5" width="18" height="5" />
          <rect x="18" y="83.5" width="38" height="14" />
          <rect x="28" y="92.5" width="18" height="5" />
          <path d="M30 16.5 A8 6 0 0 0 44 16.5" />
          <path d="M30 83.5 A8 6 0 0 1 44 83.5" />
        </g>
        <circle cx="37" cy="50" r="0.7" fill="rgba(255,255,255,0.25)" />
      </svg>
      <div className="pointer-events-none absolute left-1/2 top-1 -translate-x-1/2 text-[9px] font-semibold uppercase tracking-[0.2em] text-white/25">Attack ↑</div>

      {emptySlots.map(e => {
        const pos = tokenPos(formation, e.slot);
        return (
          <button key={`e${e.slot}`} onClick={() => onTap(e.slot)} className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
            style={{ left: `${pos.left}%`, top: `${pos.top}%` }}>
            <span className={`grid h-9 w-9 place-items-center rounded-full border-2 border-dashed text-[10px] font-bold ${e.selected ? 'border-amber-300 text-amber-200' : 'border-white/30 text-white/40'}`}>{e.label}</span>
          </button>
        );
      })}

      {tokens.map(t => {
        const pos = tokenPos(formation, t.slot);
        const ring = Math.max(0, Math.min(100, t.ring));
        const border = t.tone === 'error' ? '#f43f5e' : t.tone === 'warn' ? '#f59e0b' : 'rgba(255,255,255,0.9)';
        return (
          <button key={t.slot} onClick={() => onTap(t.slot)} title={t.title}
            className={`absolute flex w-[4.6rem] -translate-x-1/2 -translate-y-1/2 flex-col items-center transition ${t.tone === 'muted' ? 'opacity-45' : ''}`}
            style={{ left: `${pos.left}%`, top: `${pos.top}%`, zIndex: t.selected ? 5 : 1 }}>
            <span className={`relative grid h-10 w-10 place-items-center rounded-full ${t.selected ? 'scale-110' : ''} transition-transform`}
              style={{ background: `conic-gradient(${ringColor(ring)} ${ring * 3.6}deg, rgba(0,0,0,0.45) 0deg)`, boxShadow: t.selected ? '0 0 0 3px #fbbf24' : undefined }}>
              <span className="grid h-[2.05rem] w-[2.05rem] place-items-center rounded-full text-[13px] font-bold text-white"
                style={{ background: color, border: `2px solid ${border}` }}>{t.number}</span>
              {t.badge && <span className={`absolute -right-2.5 -top-1.5 rounded px-1 text-[9px] font-bold leading-[14px] ${t.badgeClass ?? 'bg-zinc-950/90 text-zinc-200'}`}>{t.badge}</span>}
            </span>
            <span className={`mt-0.5 flex max-w-full items-center gap-0.5 rounded px-1 text-[10.5px] font-semibold leading-tight ${t.selected ? 'bg-amber-400 text-zinc-950' : 'bg-zinc-950/70 text-zinc-100'}`}>
              <span className="truncate">{t.name}</span>{t.marks}
            </span>
            <span className={`text-[9.5px] font-semibold leading-tight ${t.tone === 'error' ? 'text-rose-300' : t.tone === 'warn' ? 'text-amber-300' : 'text-emerald-200/80'}`}>{t.sub}</span>
          </button>
        );
      })}
    </div>
  );
}

export const lastName = (name: string): string => name.split(' ').slice(-1)[0] ?? name;
