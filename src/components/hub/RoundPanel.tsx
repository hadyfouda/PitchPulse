import type { MatchSummary } from '../../types/match.ts';
import { useGame } from '../../store/gameStore.ts';
import { computeTable } from '../../league/schedule.ts';
import { describeRound } from '../../league/condition.ts';
import { Panel } from '../ui/controls.tsx';
import { LeagueTable } from './LeagueTable.tsx';

/** League context for a just-finished match: other results of the round and the updated table. */
export function RoundPanel({ summary }: { summary: MatchSummary }) {
  const career = useGame(s => s.career);
  const busy = useGame(s => s.roundBusy);
  const error = useGame(s => s.roundError);
  const m = /^s(\d+)r(\d+)_/.exec(summary.id);
  if (!career || !m) return null;
  const season = Number(m[1]), round = Number(m[2]);
  if (season !== career.season.number) return null;
  const report = career.season.lastReport;

  if (busy) return <Panel title={`Round ${round}`}><p className="text-sm text-zinc-400">Playing out the rest of the round…</p></Panel>;
  if (error) return <Panel title={`Round ${round}`}><p className="text-sm text-rose-400">Couldn't finish the round: {error}</p></Panel>;
  if (!report || report.round !== round) return null;

  const teams = [career.user, ...career.opponents];
  const name = new Map(teams.map(t => [t.id, t]));
  const table = computeTable(teams, career.season.fixtures);
  const involved = report.results.flatMap(r => [r.homeId, r.awayId]).filter(id => id !== career.user.id);

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Panel title={`Round ${round} results`} right={<span className="text-xs text-zinc-300">{describeRound(report)}</span>}>
        <ul className="space-y-1">
          {report.results.map(r => {
            const h = name.get(r.homeId), a = name.get(r.awayId);
            const mine = r.homeId === career.user.id || r.awayId === career.user.id;
            return (
              <li key={r.fixtureId} className={`flex items-center gap-2 rounded px-1.5 py-1 text-[13px] ${mine ? 'bg-emerald-500/10 text-emerald-100' : 'text-zinc-300'}`}>
                <span className="flex-1 truncate text-right">{h?.name}</span>
                <span className="tabular w-12 text-center font-semibold text-zinc-50">{r.home}–{r.away}</span>
                <span className="flex-1 truncate">{a?.name}</span>
              </li>
            );
          })}
        </ul>
        {report.news.length > 0 && (
          <ul className="mt-3 space-y-0.5 border-t border-zinc-800 pt-2 text-[12px] text-amber-200/90">
            {report.news.map(n => <li key={n}>• {n}</li>)}
          </ul>
        )}
      </Panel>
      <Panel title="Table"><LeagueTable rows={table} userId={career.user.id} compact highlightIds={involved.length > 10 ? [] : involved} /></Panel>
    </div>
  );
}
