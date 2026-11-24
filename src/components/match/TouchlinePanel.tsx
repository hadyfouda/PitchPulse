import type { EngineTick, QueuedAction } from '../../types/match.ts';
import type { Tactics } from '../../types/tactics.ts';
import { SHOUTS } from '../../types/tactics.ts';
import { TICKS_PER_MINUTE } from '../../engine/constants.ts';
import { engine } from '../../store/engineBridge.ts';
import { SHOUT_INFO, BUILDUP_LABEL, MENTALITY_LABEL, PRESSING_LABEL } from '../../lib/labels.ts';
import { identityLabel } from '../../engine/identities.ts';
import { pct } from '../../lib/format.ts';
import { TacticsEditor } from '../TacticsEditor.tsx';
import { Panel, StatBar } from '../ui/controls.tsx';

export function TouchlinePanel({ v }: { v: EngineTick }) {
  const team = v.userSide === 'home' ? v.home : v.away;
  const opp = v.userSide === 'home' ? v.away : v.home;
  const pending = v.queue.find((a): a is Extract<QueuedAction, { kind: 'TACTICS' }> => a.kind === 'TACTICS' && a.side === v.userSide);
  const live = v.period !== 'PRE' && v.period !== 'FT';
  const cooldown = Math.max(0, Math.ceil((team.shout.cooldownUntil - v.tick) / TICKS_PER_MINUTE));
  const activeLeft = team.shout.active ? Math.max(0, Math.ceil((team.shout.activeUntil - v.tick) / TICKS_PER_MINUTE)) : 0;
  const shoutsReady = cooldown === 0 && (v.period === 'FIRST' || v.period === 'SECOND' || v.period === 'ET1' || v.period === 'ET2');

  return (
    <div className="space-y-3">
      <Panel title="Touchline tactics" right={pending ? <span className="text-[11px] text-amber-300">Applies next tick</span> : undefined}>
        <TacticsEditor tactics={team.tactics} pending={pending?.patch}
          onChange={(patch: Partial<Tactics>) => live && engine.queue({ kind: 'TACTICS', patch })} />
      </Panel>

      <Panel title="Touchline shouts" right={
        <span className="text-[11px] text-zinc-500">{team.shout.active ? `${SHOUT_INFO[team.shout.active].label} · ${activeLeft}' left` : cooldown > 0 ? `Ready in ${cooldown}'` : 'Ready'}</span>
      }>
        <div className="grid grid-cols-2 gap-1.5">
          {SHOUTS.map(s => {
            const active = team.shout.active === s;
            return (
              <button key={s} disabled={!shoutsReady} onClick={() => engine.shout(s)} title={`${SHOUT_INFO[s].effect}. Cost: ${SHOUT_INFO[s].cost}.`}
                className={`rounded-lg border px-2 py-2 text-left transition disabled:cursor-not-allowed ${active ? 'border-violet-500/70 bg-violet-500/15' : 'border-zinc-700 bg-zinc-800/60 hover:border-violet-400/60 disabled:border-zinc-800 disabled:bg-zinc-900/60'}`}>
                <div className={`text-[12px] font-semibold ${shoutsReady || active ? 'text-zinc-100' : 'text-zinc-400'}`}>{SHOUT_INFO[s].label}</div>
                <div className="text-[10px] leading-tight text-zinc-400">{SHOUT_INFO[s].cost}</div>
              </button>
            );
          })}
        </div>
      </Panel>

      <Panel title="Match stats">
        <div className="space-y-2">
          <StatBar label="Possession" home={pct(v.home.stats.possessionTicks, v.away.stats.possessionTicks)} away={100 - pct(v.home.stats.possessionTicks, v.away.stats.possessionTicks)} format={x => `${x}%`} homeColor={v.home.color} awayColor={v.away.color} />
          <StatBar label="Shots (on target)" home={v.home.stats.shots} away={v.away.stats.shots} homeColor={v.home.color} awayColor={v.away.color}
            homeText={`${v.home.stats.shots} (${v.home.stats.shotsOnTarget})`} awayText={`${v.away.stats.shots} (${v.away.stats.shotsOnTarget})`} />
          <StatBar label="xG" home={v.home.stats.xg} away={v.away.stats.xg} format={x => x.toFixed(2)} homeColor={v.home.color} awayColor={v.away.color} />
          <StatBar label="Big chances" home={v.home.stats.bigChances} away={v.away.stats.bigChances} homeColor={v.home.color} awayColor={v.away.color} />
          <div className="grid grid-cols-3 gap-1 pt-1 text-center text-[11px] text-zinc-500">
            <span>Corners <b className="tabular text-zinc-300">{v.home.stats.corners}–{v.away.stats.corners}</b></span>
            <span>Fouls <b className="tabular text-zinc-300">{v.home.stats.fouls}–{v.away.stats.fouls}</b></span>
            <span>Cards <b className="tabular text-zinc-300">{v.home.stats.yellow + v.home.stats.red}–{v.away.stats.yellow + v.away.stats.red}</b></span>
          </div>
        </div>
      </Panel>

      <Panel title={`Opponent · ${identityLabel(opp.identity)}`}>
        <p className="text-xs leading-relaxed text-zinc-400">
          {opp.tactics.formation} · {PRESSING_LABEL[opp.tactics.pressing]} · {BUILDUP_LABEL[opp.tactics.buildUp]} · {MENTALITY_LABEL[opp.tactics.mentality]}
          {opp.shout.active && <span className="text-violet-300"> · shouting “{SHOUT_INFO[opp.shout.active].label}”</span>}
        </p>
      </Panel>
    </div>
  );
}
