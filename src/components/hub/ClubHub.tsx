import { useState } from 'react';
import type { Tactics } from '../../types/tactics.ts';
import { useGame } from '../../store/gameStore.ts';
import { engine } from '../../store/engineBridge.ts';
import { adaptLineup, teamOverall } from '../../data/generators.ts';
import { computeTable, ordinal, positionOf } from '../../league/schedule.ts';
import { describeRound } from '../../league/condition.ts';
import { minuteText } from '../../lib/format.ts';
import { TacticsEditor } from '../TacticsEditor.tsx';
import { AutoPauseSettings } from '../AutoPauseSettings.tsx';
import { LineupEditor } from '../prematch/LineupEditor.tsx';
import { Panel, Segmented } from '../ui/controls.tsx';
import { NextMatch } from './NextMatch.tsx';
import { LeagueTable } from './LeagueTable.tsx';
import { Leaders } from './Leaders.tsx';
import { History } from './History.tsx';
import { SeasonEnd } from './SeasonEnd.tsx';
import { TransfersTab } from './TransfersTab.tsx';
import { AcademyTab } from './AcademyTab.tsx';
import { ClubTab, boardMood } from './ClubTab.tsx';
import { DilemmaCard } from './DilemmaCard.tsx';
import { TrainingTab } from './TrainingTab.tsx';
import { formatMoney } from '../../club/economy.ts';
import { MobileNav, NavIcons, mobileSection } from '../ui/MobileNav.tsx';

type Tab = 'MATCH' | 'TABLE' | 'LEADERS' | 'TRAINING' | 'TRANSFERS' | 'ACADEMY' | 'CLUB' | 'HISTORY';
type Section = 'HUB' | 'SQUAD' | 'TACTICS';

export function ClubHub() {
  const career = useGame(s => s.career)!;
  const update = useGame(s => s.updateUserTeam);
  const resumable = useGame(s => s.resumable);
  const clearResumable = useGame(s => s.clearResumable);
  const [tab, setTabState] = useState<Tab>('MATCH');
  const [section, setSection] = useState<Section>('HUB');
  const setTab = (t: Tab): void => { setTabState(t); setSection('HUB'); };
  const user = career.user;
  const teams = [user, ...career.opponents];
  const table = computeTable(teams, career.season.fixtures);
  const pos = positionOf(table, user.id);
  const row = table[pos - 1];
  const report = career.season.lastReport;

  const setTactics = (patch: Partial<Tactics>): void => update(t => {
    const tactics = { ...t.tactics, ...patch };
    return patch.formation && patch.formation !== t.tactics.formation ? { ...t, tactics, lineup: adaptLineup(t, tactics) } : { ...t, tactics };
  });

  const resumeEvents = resumable?.events ?? [];
  const lastEvent = resumeEvents[resumeEvents.length - 1];

  return (
    <div className="mx-auto max-w-[1440px] px-3 pb-24 pt-4 sm:px-5 lg:pb-4" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl text-xs font-bold text-white" style={{ background: `linear-gradient(135deg, ${user.colors.primary}, ${user.colors.secondary})` }}>{user.shortName}</span>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.25em] text-emerald-400">PitchPulse · Season {career.season.number}</div>
            <h1 className="text-lg font-semibold text-zinc-50">{user.name} <span className="text-sm font-normal text-zinc-500">· OVR {teamOverall(user)}</span></h1>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          {row && row.p > 0 && <span className="text-zinc-300"><b className="text-zinc-50">{ordinal(pos)}</b> · {row.pts} pts · {row.w}W {row.d}D {row.l}L</span>}
          <button className="text-zinc-300 hover:text-zinc-50" onClick={() => setTab('CLUB')} title="Club balance and transfer budget">
            <b className={career.finances.balance < 0 ? 'text-rose-300' : 'text-zinc-50'}>{formatMoney(career.finances.balance)}</b>
            <span className="text-zinc-500"> · budget {formatMoney(career.finances.transferBudget)}</span>
          </button>
          <button className={`${boardMood(career.finances.boardConfidence).cls}`} onClick={() => setTab('CLUB')} title="Board confidence">
            Board: {boardMood(career.finances.boardConfidence).label}
          </button>
          <button className="btn btn-ghost text-xs text-zinc-500"
            onClick={() => { if (confirm('Start a new career? Your club, results, seasons and saved match will be replaced.')) useGame.setState({ career: null }); }}>
            New career
          </button>
        </div>
      </header>

      {resumable && (
        <div className="panel mb-4 flex flex-wrap items-center justify-between gap-3 border-amber-500/40 bg-amber-500/5 p-3">
          <div className="text-sm text-amber-100">
            A match is still in progress: <b>{resumable.home.shortName} {resumable.home.score}–{resumable.away.score} {resumable.away.shortName}</b>
            {lastEvent ? ` · ${minuteText(lastEvent.minute, lastEvent.added)}` : ''}. It was saved when the tab closed.
          </div>
          <div className="flex gap-2">
            <button className="btn btn-primary" onClick={() => engine.restore(resumable)}>Resume match</button>
            <button className="btn" onClick={() => void clearResumable()}>Discard</button>
          </div>
        </div>
      )}

      {report && !career.season.finished && (report.news.length > 0 || report.round > 0) && (
        <div className="panel mb-4 p-3 text-sm">
          <span className="text-zinc-400">After round {report.round}: </span><b className="text-zinc-100">{describeRound(report)}</b>
          {report.news.length > 0 && <span className="text-zinc-400"> · {report.news.join(' ')}</span>}
        </div>
      )}

      <DilemmaCard />

      <div className="grid gap-3 lg:grid-cols-[minmax(330px,390px)_1fr_minmax(290px,330px)]">
        <div className={`min-w-0 ${mobileSection(section === 'SQUAD')}`}><LineupEditor /></div>

        <div className={`min-w-0 space-y-3 ${mobileSection(section === 'HUB')}`}>
          <Segmented value={tab} onChange={setTab} options={[
            { value: 'MATCH', label: career.season.finished ? 'Season review' : 'Next match' }, { value: 'TABLE', label: 'League table' },
            { value: 'LEADERS', label: 'Leaders' }, { value: 'TRAINING', label: 'Training' }, { value: 'TRANSFERS', label: 'Transfers' }, { value: 'ACADEMY', label: `Academy (${career.academy.prospects.length})` },
            { value: 'CLUB', label: 'Club' }, { value: 'HISTORY', label: 'History' }
          ]} />
          {tab === 'MATCH' && (career.season.finished ? <SeasonEnd /> : <NextMatch />)}
          {tab === 'TABLE' && <Panel title={`League table · after ${career.season.round - 1} of ${career.season.rounds} rounds`}><LeagueTable rows={table} userId={user.id} /></Panel>}
          {tab === 'LEADERS' && <Leaders stats={career.season.playerStats} teams={teams} userId={user.id} />}
          {tab === 'TRAINING' && <TrainingTab />}
          {tab === 'TRANSFERS' && <TransfersTab />}
          {tab === 'ACADEMY' && <AcademyTab />}
          {tab === 'CLUB' && <ClubTab />}
          {tab === 'HISTORY' && <History />}
        </div>

        <div className={`space-y-3 ${mobileSection(section === 'TACTICS')}`}>
          <Panel title="Tactics"><TacticsEditor tactics={user.tactics} onChange={setTactics} /></Panel>
          <Panel><AutoPauseSettings /></Panel>
        </div>
      </div>

      <MobileNav value={section} onChange={setSection} items={[
        { value: 'HUB', label: 'Club', icon: NavIcons.club },
        { value: 'SQUAD', label: 'Squad', icon: NavIcons.squad },
        { value: 'TACTICS', label: 'Tactics', icon: NavIcons.tactics }
      ]} />
    </div>
  );
}
