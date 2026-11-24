import { useState } from 'react';
import type { PlayerSummary, SummaryTeam } from '../../types/match.ts';
import { ROLE_INFO } from '../../engine/roles.ts';
import { ratingClass } from '../../lib/format.ts';

type Col = { key: string; label: string; title: string; get: (p: PlayerSummary) => number; fmt?: (p: PlayerSummary) => string };

const COLS: Col[] = [
  { key: 'min', label: 'Min', title: 'Minutes played', get: p => Math.round(p.stats.ticks / 6) },
  { key: 'rating', label: 'Rtg', title: 'Match rating', get: p => p.rating, fmt: p => p.rating.toFixed(1) },
  { key: 'goals', label: 'G', title: 'Goals', get: p => p.stats.goals },
  { key: 'assists', label: 'A', title: 'Assists', get: p => p.stats.assists },
  { key: 'xg', label: 'xG', title: 'Expected goals', get: p => p.stats.xg, fmt: p => p.stats.xg.toFixed(2) },
  { key: 'shots', label: 'Sh', title: 'Shots (on target)', get: p => p.stats.shots, fmt: p => `${p.stats.shots}${p.stats.shots ? ` (${p.stats.shotsOnTarget})` : ''}` },
  { key: 'kp', label: 'KP', title: 'Key passes', get: p => p.stats.keyPasses },
  { key: 'pass', label: 'Pass', title: 'Passes completed / attempted', get: p => p.stats.passesCompleted,
    fmt: p => p.stats.passes ? `${p.stats.passesCompleted}/${p.stats.passes} ${Math.round((p.stats.passesCompleted / p.stats.passes) * 100)}%` : '—' },
  { key: 'tkl', label: 'Tkl', title: 'Tackles won', get: p => p.stats.tackles },
  { key: 'int', label: 'Int', title: 'Interceptions', get: p => p.stats.interceptions ?? 0 },
  { key: 'drb', label: 'Drb', title: 'Successful dribbles', get: p => p.stats.dribbles },
  { key: 'sav', label: 'Sav', title: 'Saves', get: p => p.stats.saves },
  { key: 'mis', label: 'Err', title: 'Mistakes (lost the ball in own third)', get: p => p.stats.mistakes },
  { key: 'fls', label: 'Fls', title: 'Fouls committed', get: p => p.stats.fouls }
];

export function RatingsTable({ team }: { team: SummaryTeam }) {
  const [sort, setSort] = useState('rating');
  const players = team.players.filter((p): p is PlayerSummary => 'stats' in p);
  if (!players.length) {
    return <p className="text-sm text-zinc-500">Detailed ratings aren't available for matches played before this update.</p>;
  }
  const col = COLS.find(c => c.key === sort) ?? COLS[1]!;
  const rows = [...players].sort((a, b) => col.get(b) - col.get(a));
  const motm = [...players].sort((a, b) => b.rating - a.rating)[0];

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-[12px]">
        <thead>
          <tr className="border-b border-zinc-800 text-zinc-500">
            <th className="px-1.5 py-1.5 text-left font-medium">Player</th>
            {COLS.map(c => (
              <th key={c.key} title={c.title} className="px-1.5 py-1.5 text-right font-medium">
                <button onClick={() => setSort(c.key)} className={`hover:text-zinc-200 ${sort === c.key ? 'text-emerald-300' : ''}`}>{c.label}{sort === c.key ? ' ▾' : ''}</button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(p => (
            <tr key={p.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
              <td className="px-1.5 py-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="tabular w-5 text-right font-mono text-[11px] text-zinc-500">{p.shirt}</span>
                  <span className="truncate text-zinc-100">{p.name}</span>
                  <span className="text-[10px] text-zinc-500">{ROLE_INFO[p.role].short}</span>
                  {p.yellow > 0 && <span className="h-3 w-2 rounded-[1px] bg-amber-400" />}
                  {p.status === 'SENT_OFF' && <span className="h-3 w-2 rounded-[1px] bg-rose-500" />}
                  {p.injured && <span className="text-[10px] text-rose-400">✚</span>}
                  {p === motm && <span className="rounded bg-emerald-500/15 px-1 text-[10px] font-semibold text-emerald-300">MOTM</span>}
                </div>
              </td>
              {COLS.map(c => (
                <td key={c.key} className={`tabular px-1.5 py-1.5 text-right ${c.key === 'rating' ? `font-semibold ${ratingClass(p.rating)}` : c.get(p) === 0 ? 'text-zinc-600' : 'text-zinc-300'}`}>
                  {c.fmt ? c.fmt(p) : c.get(p)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
