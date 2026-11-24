import type { SpeedMode } from '../../types/match.ts';
import type { Tactics } from '../../types/tactics.ts';
import { useGame } from '../../store/gameStore.ts';
import { useMatch } from '../../store/matchStore.ts';
import { engine } from '../../store/engineBridge.ts';
import { lineupIssues, repairLineup, teamOverall } from '../../data/generators.ts';
import { scoutReport } from '../../league/scout.ts';
import { SPEED_LABELS } from '../../engine/constants.ts';
import { TACTIC_KEY_LABEL, valueLabel } from '../../lib/labels.ts';
import { Panel, Segmented } from '../ui/controls.tsx';
import { FormDots } from './LeagueTable.tsx';

const SPEEDS: SpeedMode[] = ['BG30', 'BG15', 'X1', 'X2', 'X8'];

export function NextMatch() {
  const career = useGame(s => s.career)!;
  const settings = useGame(s => s.settings);
  const setSettings = useGame(s => s.setSettings);
  const fixture = useGame(s => s.nextFixture());
  const teamById = useGame(s => s.teamById);
  const update = useGame(s => s.updateUserTeam);
  const resumable = useGame(s => s.resumable);
  const busy = useGame(s => s.roundBusy);
  const roundError = useGame(s => s.roundError);
  const user = career.user;
  if (!fixture) return null;

  const home = fixture.homeId === user.id;
  const opp = teamById(home ? fixture.awayId : fixture.homeId)!;
  const teams = [user, ...career.opponents];
  const report = scoutReport(opp, teams, career.season);
  const issues = lineupIssues(user);
  const blocked = issues.length > 0 || !!resumable || busy;

  const kickOff = (): void => {
    const setup = useGame.getState().buildMatchSetup();
    if (setup) engine.startMatch(setup);
  };
  const simulate = async (): Promise<void> => {
    const summary = await useGame.getState().simulateUserMatch();
    if (summary) { useMatch.getState().setSummary(summary, false); useGame.getState().setScreen('fulltime'); }
  };
  const applySuggestion = (patch: Partial<Tactics>): void => update(t => ({ ...t, tactics: { ...t.tactics, ...patch } }));
  const suggestionApplied = report.suggestion
    ? (Object.keys(report.suggestion.patch) as Array<keyof Tactics>).every(k => user.tactics[k] === report.suggestion!.patch[k])
    : false;

  return (
    <div className="space-y-3">
      <Panel title={`Season ${career.season.number} · Round ${fixture.round} of ${career.season.rounds}`}>
        <div className="flex items-center justify-between gap-4 py-2">
          <Badge name={home ? user.name : opp.name} short={home ? user.shortName : opp.shortName} color={home ? user.colors.primary : opp.colors.primary} ovr={teamOverall(home ? user : opp)} />
          <div className="text-center"><div className="text-[11px] text-zinc-500">{home ? 'Home' : 'Away'}</div><div className="text-2xl font-light text-zinc-600">vs</div></div>
          <Badge name={home ? opp.name : user.name} short={home ? opp.shortName : user.shortName} color={home ? opp.colors.primary : user.colors.primary} ovr={teamOverall(home ? opp : user)} right />
        </div>

        {issues.length > 0 && (
          <div className="mt-2 rounded-lg border border-rose-600/40 bg-rose-500/10 p-3 text-sm">
            <div className="font-medium text-rose-200">Your XI has unavailable players</div>
            <ul className="mt-1 list-inside list-disc text-[13px] text-rose-200/80">{issues.map(i => <li key={i.slot}>{i.kind}: {i.reason}</li>)}</ul>
            <button className="btn mt-2 text-xs" onClick={() => update(t => ({ ...t, lineup: repairLineup(t) }))}>Replace them automatically</button>
          </div>
        )}

        <div className="mt-3 space-y-2">
          <span className="panel-title">Match speed</span>
          <Segmented value={settings.defaultSpeed} onChange={defaultSpeed => setSettings({ defaultSpeed })} options={SPEEDS.map(s => ({ value: s, label: SPEED_LABELS[s] }))} />
          <div className="flex gap-2 pt-1">
            <button className="btn btn-primary flex-1 py-2.5 text-base" onClick={kickOff} disabled={blocked}>
              {resumable ? 'Resume or discard the saved match first' : 'Kick off'}
            </button>
            <button className="btn px-4" onClick={() => void simulate()} disabled={blocked} title="Your assistant manages the match with your XI and tactics">
              {busy ? 'Simulating…' : 'Simulate'}
            </button>
          </div>
          {roundError && <p className="text-xs text-rose-400">Simulation failed: {roundError}</p>}
        </div>
      </Panel>

      <Panel title={`Scout report · ${opp.name}`}>
        <div className="grid gap-3 sm:grid-cols-3">
          <Fact label="Style" value={report.style} />
          <Fact label="League position" value={report.position} />
          <div><div className="text-[11px] text-zinc-500">Form</div><div className="mt-1">{report.form.length ? <FormDots form={report.form} /> : <span className="text-sm text-zinc-400">—</span>}</div></div>
          <Fact label="Usual shape" value={report.shape} wrap />
          <Fact wrap label="Scored / conceded" value={report.goalsFor || report.goalsAgainst ? `${report.goalsFor.toFixed(1)} / ${report.goalsAgainst.toFixed(1)} per game` : '—'} />
          <Fact label="Unavailable" value={report.absentees.length ? report.absentees.join(', ') : 'Full squad'} wrap />
        </div>
        <p className="mt-3 text-sm text-zinc-400">{report.summary}</p>
        {report.keyThreat && (
          <div className="mt-3 rounded-lg border border-amber-600/30 bg-amber-500/5 p-3">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-400">Key threat</div>
            <div className="mt-0.5 text-sm text-zinc-100">#{report.keyThreat.shirt} {report.keyThreat.name} · <span className="text-zinc-400">{report.keyThreat.role}</span></div>
            <div className="text-[12px] text-zinc-400">{report.keyThreat.note}</div>
          </div>
        )}
        {report.weaknesses.length > 0 && (
          <ul className="mt-3 space-y-1 text-[13px]">
            {report.weaknesses.map(w => <li key={w} className="flex gap-2 text-emerald-200/90"><span className="text-emerald-500">▸</span>{w}</li>)}
          </ul>
        )}
        {report.suggestion && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-violet-500/30 bg-violet-500/5 p-3">
            <div className="min-w-0">
              <div className="text-sm font-medium text-violet-200">Suggested plan: {report.suggestion.label}</div>
              <div className="text-[12px] text-zinc-400">{report.suggestion.why}</div>
              <div className="mt-1 text-[11px] text-zinc-500">
                {Object.entries(report.suggestion.patch).map(([k, v]) => `${TACTIC_KEY_LABEL[k] ?? k}: ${valueLabel(k, String(v))}`).join(' · ')}
              </div>
            </div>
            <button className="btn text-xs" disabled={suggestionApplied} onClick={() => applySuggestion(report.suggestion!.patch)}>
              {suggestionApplied ? 'Applied ✓' : 'Apply to my tactics'}
            </button>
          </div>
        )}
      </Panel>
    </div>
  );
}

function Fact({ label, value, wrap = false }: { label: string; value: string; wrap?: boolean }) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] text-zinc-500">{label}</div>
      <div className={`text-sm text-zinc-200 ${wrap ? 'leading-snug' : 'truncate'}`} title={value}>{value}</div>
    </div>
  );
}

function Badge({ name, short, color, ovr, right = false }: { name: string; short: string; color: string; ovr: number; right?: boolean }) {
  return (
    <div className={`flex min-w-0 flex-1 items-center gap-2.5 ${right ? 'flex-row-reverse text-right' : ''}`}>
      <span className="grid h-11 w-11 flex-none place-items-center rounded-xl text-xs font-bold text-white" style={{ background: color }}>{short}</span>
      <div className="min-w-0"><div className="truncate font-medium text-zinc-100">{name}</div><div className="text-xs text-zinc-500">OVR {ovr}</div></div>
    </div>
  );
}
