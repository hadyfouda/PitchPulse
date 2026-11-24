import type { SeasonPlayerStats } from '../../types/league.ts';
import type { Team } from '../../types/domain.ts';
import { Panel } from '../ui/controls.tsx';

type Metric = { key: string; title: string; value: (s: SeasonPlayerStats) => number; fmt?: (v: number) => string; min?: (s: SeasonPlayerStats) => boolean };

const METRICS: Metric[] = [
  { key: 'goals', title: 'Top scorers', value: s => s.goals },
  { key: 'assists', title: 'Top assists', value: s => s.assists },
  { key: 'rating', title: 'Average rating', value: s => s.ratingSum / Math.max(1, s.apps), fmt: v => v.toFixed(2), min: s => s.apps >= 3 },
  { key: 'motm', title: 'Player of the match awards', value: s => s.motm }
];

export function Leaders({ stats, teams, userId }: { stats: Record<string, SeasonPlayerStats>; teams: Team[]; userId: string }) {
  const list = Object.values(stats);
  const team = new Map(teams.map(t => [t.id, t]));
  if (!list.length) return <Panel title="Season leaders"><p className="text-sm text-zinc-500">Leaders appear after the first round.</p></Panel>;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {METRICS.map(m => {
        const top = list.filter(s => (m.min ? m.min(s) : true) && m.value(s) > 0).sort((a, b) => m.value(b) - m.value(a) || a.minutes - b.minutes).slice(0, 8);
        return (
          <Panel key={m.key} title={m.title}>
            {top.length === 0 ? <p className="text-xs text-zinc-500">Nobody yet.</p> : (
              <ol className="space-y-1">
                {top.map((s, i) => {
                  const t = team.get(s.teamId);
                  const v = m.value(s);
                  return (
                    <li key={s.playerId} className={`flex items-center gap-2 text-[13px] ${s.teamId === userId ? 'text-emerald-200' : 'text-zinc-300'}`}>
                      <span className="tabular w-4 text-right text-[11px] text-zinc-500">{i + 1}</span>
                      <span className="h-2 w-2 flex-none rounded-full" style={{ background: t?.colors.primary }} />
                      <span className="flex-1 truncate">{s.name} <span className="text-[11px] text-zinc-500">{t?.shortName}</span></span>
                      <span className="tabular text-[11px] text-zinc-500">{s.apps} apps</span>
                      <span className="tabular w-10 text-right font-semibold text-zinc-100">{m.fmt ? m.fmt(v) : v}</span>
                    </li>
                  );
                })}
              </ol>
            )}
          </Panel>
        );
      })}
    </div>
  );
}
