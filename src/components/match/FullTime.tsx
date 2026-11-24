import { useState } from 'react';
import type { MatchSummary, Side } from '../../types/match.ts';
import { useGame } from '../../store/gameStore.ts';
import { useMatch } from '../../store/matchStore.ts';
import { describe, TONE_CLASS } from '../../lib/commentary.ts';
import { minuteText, pct } from '../../lib/format.ts';
import { identityLabel } from '../../engine/identities.ts';
import { MomentumChart } from '../analytics/MomentumChart.tsx';
import { ShotMap } from '../analytics/ShotMap.tsx';
import { AveragePositions } from '../analytics/AveragePositions.tsx';
import { RatingsTable } from '../analytics/RatingsTable.tsx';
import { Panel, Segmented, StatBar } from '../ui/controls.tsx';
import { RoundPanel } from '../hub/RoundPanel.tsx';

type Tab = 'OVERVIEW' | 'SHOTS' | 'POSITIONS' | 'RATINGS';
const TABS: Array<{ value: Tab; label: string }> = [
  { value: 'OVERVIEW', label: 'Overview' }, { value: 'SHOTS', label: 'Shot map' },
  { value: 'POSITIONS', label: 'Average positions' }, { value: 'RATINGS', label: 'Player ratings' }
];

/** Post-match Analytics Room. Also opened from match history. */
export function FullTime() {
  const summary = useMatch(s => s.summary);
  const reviewing = useMatch(s => s.reviewing);
  const reset = useMatch(s => s.reset);
  const setScreen = useGame(s => s.setScreen);
  const [tab, setTab] = useState<Tab>('OVERVIEW');
  const [side, setSide] = useState<Side>(summary?.userSide ?? 'home');
  const done = (): void => { reset(); setScreen('home'); };
  if (!summary) return <div className="grid min-h-dvh place-items-center"><button className="btn" onClick={done}>Back</button></div>;

  const { home, away } = summary;
  const us = summary.userSide === 'home' ? home : away;
  const them = summary.userSide === 'home' ? away : home;
  const result = us.score > them.score ? 'Victory' : us.score < them.score ? 'Defeat' : 'Draw';
  const team = side === 'home' ? home : away;
  const teamToggle = (
    <div className="w-48"><Segmented size="sm" value={side} onChange={setSide}
      options={[{ value: 'home', label: home.shortName }, { value: 'away', label: away.shortName }]} /></div>
  );

  return (
    <div className="mx-auto max-w-6xl space-y-3 px-3 py-5">
      <div className="panel p-5 text-center">
        <div className={`text-xs font-semibold uppercase tracking-[0.3em] ${result === 'Victory' ? 'text-emerald-400' : result === 'Defeat' ? 'text-rose-400' : 'text-zinc-400'}`}>
          {reviewing ? `Analytics Room · ${new Date(summary.playedAt).toLocaleDateString()}` : 'Full-time'} · {result}
        </div>
        <div className="mt-3 flex items-center justify-center gap-4">
          <span className="flex-1 truncate text-right text-lg font-semibold text-zinc-100">{home.name}</span>
          <span className="tabular text-5xl font-semibold text-zinc-50">{home.score}<span className="mx-2 text-zinc-600">–</span>{away.score}</span>
          <span className="flex-1 truncate text-left text-lg font-semibold text-zinc-100">{away.name}</span>
        </div>
        <div className="tabular mt-1 text-sm text-zinc-500">xG {home.stats.xg.toFixed(2)} – {away.stats.xg.toFixed(2)} · vs {identityLabel(them.identity)}</div>
        <button className="btn btn-primary mt-4 px-6" onClick={done}>{reviewing ? 'Back to club' : 'Continue'}</button>
      </div>

      <div className="flex justify-center"><div className="w-full max-w-2xl"><Segmented value={tab} onChange={setTab} options={TABS} /></div></div>

      {tab === 'OVERVIEW' && (
        <>
          <RoundPanel summary={summary} />
          <Panel title="Momentum">
            <MomentumChart momentum={summary.momentum} events={summary.events} halfTimeIndex={summary.halfTimeIndex}
              homeColor={home.color} awayColor={away.color} homeName={home.shortName} awayName={away.shortName} height={140} />
          </Panel>
          <div className="grid gap-3 md:grid-cols-2">
            <Panel title="Match stats"><Stats s={summary} /></Panel>
            <Panel title="Key moments"><KeyMoments s={summary} /></Panel>
          </div>
        </>
      )}
      {tab === 'SHOTS' && <Panel title={`Shot map · ${team.name}`} right={teamToggle}><ShotMap shots={summary.shots} side={side} teamColor={team.color} /></Panel>}
      {tab === 'POSITIONS' && <Panel title={`Average positions · ${team.name}`} right={teamToggle}><AveragePositions team={team} /></Panel>}
      {tab === 'RATINGS' && <Panel title={`Player ratings · ${team.name}`} right={teamToggle}><RatingsTable team={team} /></Panel>}
    </div>
  );
}

function KeyMoments({ s }: { s: MatchSummary }) {
  const names = { home: s.home.shortName, away: s.away.shortName };
  const keyEvents = s.events.filter(e => ['GOAL', 'RED', 'INJURY', 'PENALTY'].includes(e.type) || (e.type === 'SHOT_SAVED' && e.meta?.big === 1));
  return (
    <ol className="space-y-1">
      {keyEvents.length === 0 && <li className="text-sm text-zinc-500">A quiet one.</li>}
      {keyEvents.map(e => {
        const line = describe(e, names);
        return (
          <li key={e.id} className="flex gap-2 text-[13px]">
            <span className="tabular w-11 flex-none text-right font-mono text-[11px] text-zinc-500">{minuteText(e.minute, e.added)}</span>
            <span className={TONE_CLASS[line.tone]}>{line.text}</span>
          </li>
        );
      })}
    </ol>
  );
}

function Stats({ s }: { s: MatchSummary }) {
  const h = s.home.stats, a = s.away.stats;
  const hc = s.home.color, ac = s.away.color;
  const poss = pct(h.possessionTicks, a.possessionTicks);
  return (
    <div className="space-y-2.5">
      <StatBar label="Possession" home={poss} away={100 - poss} format={x => `${x}%`} homeColor={hc} awayColor={ac} />
      <StatBar label="Shots (on target)" home={h.shots} away={a.shots} homeText={`${h.shots} (${h.shotsOnTarget})`} awayText={`${a.shots} (${a.shotsOnTarget})`} homeColor={hc} awayColor={ac} />
      <StatBar label="Expected goals" home={h.xg} away={a.xg} format={x => x.toFixed(2)} homeColor={hc} awayColor={ac} />
      <StatBar label="Big chances" home={h.bigChances} away={a.bigChances} homeColor={hc} awayColor={ac} />
      <StatBar label="Pass accuracy" home={pct(h.passesCompleted, h.passes - h.passesCompleted)} away={pct(a.passesCompleted, a.passes - a.passesCompleted)} format={x => `${x}%`} homeColor={hc} awayColor={ac} />
      <StatBar label="Tackles" home={h.tackles} away={a.tackles} homeColor={hc} awayColor={ac} />
      <StatBar label="Corners" home={h.corners} away={a.corners} homeColor={hc} awayColor={ac} />
      <StatBar label="Fouls" home={h.fouls} away={a.fouls} homeColor={hc} awayColor={ac} />
      <StatBar label="Offsides" home={h.offsides} away={a.offsides} homeColor={hc} awayColor={ac} />
      <StatBar label="Cards (Y/R)" home={h.yellow + h.red} away={a.yellow + a.red} homeText={`${h.yellow}/${h.red}`} awayText={`${a.yellow}/${a.red}`} homeColor={hc} awayColor={ac} />
    </div>
  );
}
