import { useState } from 'react';
import { useGame } from '../../store/gameStore.ts';
import { computeTable, ordinal, positionOf } from '../../league/schedule.ts';
import { archiveSeason } from '../../league/condition.ts';
import { Panel } from '../ui/controls.tsx';
import { LeagueTable } from './LeagueTable.tsx';

export function SeasonEnd() {
  const career = useGame(s => s.career)!;
  const begin = useGame(s => s.beginNextSeason);
  const [busy, setBusy] = useState(false);
  const teams = [career.user, ...career.opponents];
  const table = computeTable(teams, career.season.fixtures);
  const pos = positionOf(table, career.user.id);
  const arc = archiveSeason({ user: career.user, opponents: career.opponents, season: career.season });
  const champion = table[0]!;

  return (
    <div className="space-y-3">
      <div className="panel p-5 text-center">
        <div className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-400">Season {career.season.number} complete</div>
        <h2 className="mt-2 text-2xl font-semibold text-zinc-50">{pos === 1 ? `Champions! ${career.user.name} win the league` : `${champion.name} are champions`}</h2>
        <p className="mt-1 text-sm text-zinc-400">You finished {ordinal(pos)} with {table[pos - 1]?.pts ?? 0} points{pos === 1 ? '' : ` — ${champion.pts - (table[pos - 1]?.pts ?? 0)} behind the champions`}.</p>
        <div className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-1 text-[13px] text-zinc-400">
          {arc.topScorer && <span>Golden Boot: <b className="text-zinc-100">{arc.topScorer.name}</b> ({arc.topScorer.team}) · {arc.topScorer.goals}</span>}
          {arc.topAssister && <span>Playmaker: <b className="text-zinc-100">{arc.topAssister.name}</b> · {arc.topAssister.assists}</span>}
          {arc.bestRated && <span>Player of the Season: <b className="text-zinc-100">{arc.bestRated.name}</b> · {arc.bestRated.rating.toFixed(2)}</span>}
        </div>
        <button className="btn btn-primary mt-4 px-6" disabled={busy} onClick={async () => { setBusy(true); await begin(); setBusy(false); }}>
          Start season {career.season.number + 1}
        </button>
        {career.news[0] && <p className="mt-3 text-sm text-zinc-300">{career.news[0].text} Board confidence: {Math.round(career.finances.boardConfidence)}/100.</p>}
        <p className="mt-2 text-[11px] text-zinc-500">Over the summer players develop or decline with age, veterans may retire, academy graduates step up, a new intake arrives, budgets are reset by the board and a new fixture list is drawn.</p>
      </div>
      <Panel title="Final table"><LeagueTable rows={table} userId={career.user.id} /></Panel>
    </div>
  );
}
