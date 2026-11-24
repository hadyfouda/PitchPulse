import { useGame } from '../../store/gameStore.ts';
import { useMatch } from '../../store/matchStore.ts';
import { ordinal } from '../../league/schedule.ts';
import { Panel } from '../ui/controls.tsx';
import { LeagueTable } from './LeagueTable.tsx';
import { useState } from 'react';

export function History() {
  const archive = useGame(s => s.archive);
  const seasons = useGame(s => s.seasons);
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="space-y-3">
      <Panel title="Recent results · tap to analyse">
        {archive.length === 0 ? <p className="text-sm text-zinc-500">No matches played yet.</p> : (
          <ul className="divide-y divide-zinc-800/70">
            {archive.slice(0, 15).map(m => {
              const us = m.userSide === 'home' ? m.home : m.away;
              const them = m.userSide === 'home' ? m.away : m.home;
              const res = us.score > them.score ? 'W' : us.score < them.score ? 'L' : 'D';
              return (
                <li key={m.id}>
                  <button className="flex w-full items-center justify-between gap-2 rounded-md px-1 py-1.5 text-left text-sm hover:bg-zinc-800/50"
                    onClick={() => { useMatch.getState().setSummary(m, true); useGame.getState().setScreen('fulltime'); }} title="Open in the Analytics Room">
                    <span className={`grid h-5 w-5 place-items-center rounded text-[10px] font-bold ${res === 'W' ? 'bg-emerald-600/80' : res === 'L' ? 'bg-rose-600/80' : 'bg-zinc-600'}`}>{res}</span>
                    <span className="flex-1 truncate text-zinc-300">{m.home.shortName} {m.home.score}–{m.away.score} {m.away.shortName}</span>
                    <span className="tabular text-xs text-zinc-500">xG {us.stats.xg.toFixed(2)}–{them.stats.xg.toFixed(2)}</span>
                    <span className="text-xs text-zinc-600">›</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <Panel title="Season archive">
        {seasons.length === 0 ? <p className="text-sm text-zinc-500">Finished seasons will be kept here with their final table and awards.</p> : (
          <ul className="space-y-2">
            {seasons.map(s => (
              <li key={s.id} className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3">
                <button className="flex w-full flex-wrap items-baseline justify-between gap-2 text-left" onClick={() => setOpen(open === s.id ? null : s.id)}>
                  <span className="text-sm font-semibold text-zinc-100">Season {s.id} · Champions: <span className="text-amber-300">{s.championName}</span></span>
                  <span className="text-xs text-zinc-400">You finished {ordinal(s.userPosition)} {open === s.id ? '▾' : '▸'}</span>
                </button>
                <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-zinc-400">
                  {s.topScorer && <span>Golden Boot: <b className="text-zinc-200">{s.topScorer.name}</b> ({s.topScorer.team}) {s.topScorer.goals}</span>}
                  {s.topAssister && <span>Playmaker: <b className="text-zinc-200">{s.topAssister.name}</b> {s.topAssister.assists}</span>}
                  {s.bestRated && <span>Best rated: <b className="text-zinc-200">{s.bestRated.name}</b> {s.bestRated.rating.toFixed(2)}</span>}
                </div>
                {open === s.id && <div className="mt-3"><LeagueTable rows={s.table} userId={s.userTeamId} /></div>}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
