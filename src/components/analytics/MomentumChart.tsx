import type { MatchEvent, Side } from '../../types/match.ts';
import { TICKS_PER_MINUTE } from '../../engine/constants.ts';

interface Props {
  momentum: number[];
  events: MatchEvent[];
  halfTimeIndex: number | null | undefined;
  homeColor: string;
  awayColor: string;
  homeName: string;
  awayName: string;
  height?: number;
  live?: boolean;
}

const W = 600;

/** Minute-by-minute dominance as a smoothed area chart (home above the axis, away below). */
export function MomentumChart({ momentum, events, halfTimeIndex, homeColor, awayColor, homeName, awayName, height = 120, live = false }: Props) {
  const H = height;
  const mid = H / 2;
  const n = Math.max(momentum.length, 92);
  const smooth = momentum.map((_, i) => {
    const w = [momentum[i - 1], momentum[i], momentum[i + 1]].filter((x): x is number => x !== undefined);
    return w.reduce((a, b) => a + b, 0) / w.length;
  });
  const max = Math.max(6, ...smooth.map(Math.abs));
  const x = (i: number): number => (i / (n - 1)) * W;
  const y = (val: number): number => mid - (val / max) * (mid - 10);

  const area = (sign: 1 | -1): string => {
    if (!smooth.length) return '';
    let d = `M ${x(0)} ${mid}`;
    smooth.forEach((val, i) => { d += ` L ${x(i).toFixed(1)} ${y(sign === 1 ? Math.max(0, val) : Math.min(0, val)).toFixed(1)}`; });
    return `${d} L ${x(smooth.length - 1)} ${mid} Z`;
  };

  const added = halfTimeIndex ? halfTimeIndex - 45 : 0;
  const minuteToIndex = (m: number): number => (m <= 45 ? m : m + added);
  const goals = events.filter(e => e.type === 'GOAL' && e.side).map(e => ({
    i: Math.max(0, Math.floor((e.tick - 1) / TICKS_PER_MINUTE)), side: e.side as Side, id: e.id, who: e.playerName ?? ''
  }));

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label="Momentum chart">
        <defs>
          <linearGradient id="momHome" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={homeColor} stopOpacity="0.75" /><stop offset="1" stopColor={homeColor} stopOpacity="0.15" /></linearGradient>
          <linearGradient id="momAway" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor={awayColor} stopOpacity="0.75" /><stop offset="1" stopColor={awayColor} stopOpacity="0.15" /></linearGradient>
        </defs>
        {[15, 30, 45, 60, 75, 90].map(m => (
          <g key={m}>
            <line x1={x(minuteToIndex(m))} x2={x(minuteToIndex(m))} y1={8} y2={H - 8} stroke="#27272a" strokeWidth="1" />
            <text x={x(minuteToIndex(m))} y={H - 1} textAnchor="middle" fontSize="9" fill="#71717a">{m}'</text>
          </g>
        ))}
        {halfTimeIndex != null && <line x1={x(halfTimeIndex)} x2={x(halfTimeIndex)} y1={4} y2={H - 10} stroke="#a1a1aa" strokeDasharray="3 3" strokeWidth="1" />}
        <line x1={0} x2={W} y1={mid} y2={mid} stroke="#3f3f46" strokeWidth="1" />
        <path d={area(1)} fill="url(#momHome)" stroke={homeColor} strokeWidth="1.2" strokeOpacity="0.9" />
        <path d={area(-1)} fill="url(#momAway)" stroke={awayColor} strokeWidth="1.2" strokeOpacity="0.9" />
        {goals.map(g => (
          <g key={g.id}>
            <title>{`Goal — ${g.who}`}</title>
            <circle cx={x(g.i)} cy={g.side === 'home' ? 9 : H - 18} r="5" fill={g.side === 'home' ? homeColor : awayColor} stroke="#fafafa" strokeWidth="1.5" />
          </g>
        ))}
        {live && smooth.length > 0 && <circle cx={x(smooth.length - 1)} cy={y(smooth[smooth.length - 1] ?? 0)} r="3" fill="#fafafa" />}
        <text x={4} y={12} fontSize="9" fill="#a1a1aa">{homeName} ▲</text>
        <text x={4} y={H - 12} fontSize="9" fill="#a1a1aa">{awayName} ▼</text>
      </svg>
    </div>
  );
}
