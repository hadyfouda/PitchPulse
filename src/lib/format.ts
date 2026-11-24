import type { EngineTick } from '../types/match.ts';

export function clockText(v: Pick<EngineTick, 'period' | 'clockSeconds' | 'minute' | 'added'>): string {
  if (v.period === 'PRE') return '00:00';
  if (v.period === 'HT') return 'HT';
  if (v.period === 'FT') return 'FT';
  const halfEnd = v.period === 'FIRST' ? 45 * 60 : 90 * 60;
  if (v.clockSeconds >= halfEnd) {
    const over = v.clockSeconds - halfEnd;
    return `${halfEnd / 60}+${Math.floor(over / 60) + 1}'`;
  }
  const m = Math.floor(v.clockSeconds / 60);
  const s = v.clockSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const minuteText = (minute: number, added: number): string => (added > 0 ? `${minute}+${added}'` : `${minute}'`);

export const pct = (a: number, b: number): number => (a + b === 0 ? 50 : Math.round((a / (a + b)) * 100));

export function ratingClass(r: number): string {
  if (r >= 8) return 'text-emerald-300';
  if (r >= 7) return 'text-emerald-400/90';
  if (r >= 6.3) return 'text-zinc-300';
  if (r >= 5.5) return 'text-amber-400';
  return 'text-rose-400';
}

export function staminaClass(s: number): string {
  if (s >= 75) return 'bg-emerald-500';
  if (s >= 60) return 'bg-lime-500';
  if (s >= 45) return 'bg-amber-500';
  return 'bg-rose-500';
}
