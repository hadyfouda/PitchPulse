import type { Lineup, Player, Team } from '../../types/domain.ts';
import { isAvailable } from '../../types/domain.ts';
import type { RoleId } from '../../types/tactics.ts';
import { ROLE_INFO, ROLES_FOR_KIND, positionFit } from '../../engine/roles.ts';
import { autoLineup, playerOverall } from '../../data/generators.ts';
import { useGame } from '../../store/gameStore.ts';
import { useState } from 'react';
import { Panel, Segmented } from '../ui/controls.tsx';
import { PitchFormation, lastName, type PitchToken } from '../ui/PitchFormation.tsx';

/** Put `playerId` into `slot`, swapping with wherever he was (another slot or the bench). */
function assign(lineup: Lineup, slot: number, playerId: string): Lineup {
  const slots = lineup.slots.map(s => ({ ...s }));
  const bench = [...lineup.bench];
  const target = slots.find(s => s.slot === slot);
  if (!target) return lineup;
  const previous = target.playerId;
  const fromSlot = slots.find(s => s.playerId === playerId);
  const benchIdx = bench.indexOf(playerId);
  target.playerId = playerId;
  if (fromSlot && fromSlot !== target) fromSlot.playerId = previous;
  else if (benchIdx >= 0) { if (previous) bench[benchIdx] = previous; else bench.splice(benchIdx, 1); }
  else if (previous) bench.unshift(previous);
  return { slots, bench: bench.slice(0, 9) };
}

const POS_COLOR: Record<string, string> = { GK: 'text-amber-300', DEF: 'text-sky-300', MID: 'text-emerald-300', FWD: 'text-rose-300' };

export const fitnessClass = (f: number): string => (f >= 90 ? 'text-emerald-400' : f >= 78 ? 'text-lime-400' : f >= 65 ? 'text-amber-400' : 'text-rose-400');

function statusText(p: Player): string {
  if (p.injury) return ` — injured (${p.injury.matchesOut})`;
  if (p.suspension > 0) return ` — banned (${p.suspension})`;
  return '';
}

export function LineupEditor() {
  const team = useGame(s => s.career!.user);
  const update = useGame(s => s.updateUserTeam);
  const byId = new Map(team.players.map(p => [p.id, p]));
  const setLineup = (lineup: Lineup): void => update(t => ({ ...t, lineup }));
  const setRole = (slot: number, role: RoleId): void =>
    setLineup({ ...team.lineup, slots: team.lineup.slots.map(s => (s.slot === slot ? { ...s, role } : s)) });

  const [view, setView] = useState<'PITCH' | 'LIST'>('PITCH');
  const [selected, setSelected] = useState<number | null>(null);
  const selSlot = selected === null ? undefined : team.lineup.slots.find(s => s.slot === selected);
  const selPlayer = selSlot?.playerId ? byId.get(selSlot.playerId) : undefined;

  const tapSlot = (slot: number): void => {
    if (selected === null) { setSelected(slot); return; }
    if (selected === slot) { setSelected(null); return; }
    // Second tap on another position swaps the two players
    const moving = team.lineup.slots.find(s => s.slot === selected)?.playerId;
    if (moving) setLineup(assign(team.lineup, slot, moving));
    setSelected(null);
  };
  const bringIn = (id: string): void => {
    if (selected === null) return;
    setLineup(assign(team.lineup, selected, id));
    setSelected(null);
  };

  const tokens: PitchToken[] = team.lineup.slots.flatMap((s): PitchToken[] => {
    const p = s.playerId ? byId.get(s.playerId) : undefined;
    if (!p) return [];
    const fit = positionFit(p.position, s.kind);
    const blocked = !isAvailable(p);
    return [{
      slot: s.slot, number: p.shirt, name: lastName(p.name), ring: p.fitness, selected: selected === s.slot,
      sub: blocked ? (p.injury ? 'INJURED' : 'BANNED') : fit < 0.9 ? `${p.position}→${s.kind}` : `${s.kind} · ${ROLE_INFO[s.role].short}`,
      tone: blocked ? 'error' : fit < 0.9 ? 'warn' : 'normal',
      badge: String(playerOverall(p)),
      title: `${p.name} · ${ROLE_INFO[s.role].label} · Fitness ${Math.round(p.fitness)}% · Sharpness ${Math.round(p.sharpness)}%`
    }];
  });
  const emptySlots = team.lineup.slots.filter(s => !s.playerId).map(s => ({ slot: s.slot, label: s.kind, selected: selected === s.slot }));

  const inXI = new Set(team.lineup.slots.map(s => s.playerId));
  const unavailable = team.players.filter(p => !isAvailable(p));
  const reserves = team.players.filter(p => isAvailable(p) && !team.lineup.bench.includes(p.id) && !inXI.has(p.id));

  return (
    <Panel title={`Starting XI · ${team.tactics.formation}`}
      right={<button className="btn btn-ghost text-xs" onClick={() => update((t: Team) => ({ ...t, lineup: autoLineup(t, t.lineup) }))} title="Best available XI, weighing fitness">Auto-pick</button>}>
      <div className="mb-2.5"><Segmented size="sm" value={view} onChange={v => { setView(v); setSelected(null); }}
        options={[{ value: 'PITCH', label: 'Pitch' }, { value: 'LIST', label: 'List' }]} /></div>

      {view === 'PITCH' && (
        <>
          <PitchFormation formation={team.tactics.formation} tokens={tokens} emptySlots={emptySlots} color={team.colors.primary} onTap={tapSlot} />
          <div className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5 text-[10px] text-zinc-500">
            <span>Ring = fitness</span><span>Corner = overall</span><span className="text-amber-300/80">Amber = out of position</span><span className="text-rose-300/80">Red = unavailable</span>
          </div>
          {selSlot ? (
            <div className="mt-2.5 space-y-2 rounded-lg border border-amber-500/40 bg-amber-500/5 p-2.5">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-amber-200">{selSlot.kind} · {selPlayer?.name ?? 'empty'}</span>
                <button className="btn btn-ghost px-2 py-0.5 text-[11px]" onClick={() => setSelected(null)}>Done</button>
              </div>
              <div className="grid grid-cols-[1fr_5rem] gap-1.5">
                <select className="field py-1 text-xs" value={selSlot.playerId ?? ''} onChange={e => setLineup(assign(team.lineup, selSlot.slot, e.target.value))} aria-label={`Player for ${selSlot.kind}`}>
                  {!selPlayer && <option value="">— empty —</option>}
                  {team.players.map(pl => (
                    <option key={pl.id} value={pl.id} disabled={!isAvailable(pl)}>
                      {pl.shirt}. {pl.name} · {pl.position} {playerOverall(pl)} · {Math.round(pl.fitness)}%{statusText(pl)}
                    </option>
                  ))}
                </select>
                <select className="field px-1.5 py-1 text-xs font-semibold" value={selSlot.role} onChange={e => setRole(selSlot.slot, e.target.value as RoleId)} aria-label="Role">
                  {ROLES_FOR_KIND[selSlot.kind].map(r => <option key={r} value={r}>{ROLE_INFO[r].short}</option>)}
                </select>
              </div>
              <p className="text-[11px] leading-snug text-zinc-400"><b className="text-zinc-200">{ROLE_INFO[selSlot.role].label}</b> — {ROLE_INFO[selSlot.role].desc}</p>
              {selPlayer && (
                <p className="text-[11px] text-zinc-500">
                  Fitness <span className={fitnessClass(selPlayer.fitness)}>{Math.round(selPlayer.fitness)}%</span> · Sharpness {Math.round(selPlayer.sharpness)}% · Natural: {selPlayer.naturalRoles.map(r => ROLE_INFO[r].short).join(', ')}
                  {positionFit(selPlayer.position, selSlot.kind) < 0.9 && <span className="text-amber-300"> · out of position ({Math.round(positionFit(selPlayer.position, selSlot.kind) * 100)}%)</span>}
                </p>
              )}
              <p className="text-[11px] text-amber-200/80">Tap another position to swap them, or a bench player below to bring him in.</p>
            </div>
          ) : (
            <p className="mt-2 text-center text-[11px] text-zinc-500">Tap a player to change him or his role.</p>
          )}
        </>
      )}

      {view === 'LIST' && (<>
      <div className="mb-1 grid grid-cols-[2.4rem_1fr_4.4rem_2.4rem] gap-1.5 px-0.5 text-[10px] uppercase tracking-wider text-zinc-600">
        <span /><span>Player</span><span>Role</span><span className="text-right">Fit</span>
      </div>
      <div className="space-y-1">
        {team.lineup.slots.map(s => {
          const p = s.playerId ? byId.get(s.playerId) : undefined;
          const fit = p ? positionFit(p.position, s.kind) : 1;
          const blocked = p && !isAvailable(p);
          return (
            <div key={s.slot} className="grid grid-cols-[2.4rem_1fr_4.4rem_2.4rem] items-center gap-1.5">
              <span className="rounded bg-zinc-800 px-1 py-1 text-center text-[10px] font-bold text-zinc-300">{s.kind}</span>
              <select className={`field py-1 text-xs ${blocked ? 'border-rose-600/70 text-rose-300' : fit < 0.9 ? 'border-amber-600/60' : ''}`} value={s.playerId ?? ''}
                onChange={e => setLineup(assign(team.lineup, s.slot, e.target.value))} aria-label={`Player for ${s.kind}`}>
                {!p && <option value="">— empty —</option>}
                {team.players.map(pl => (
                  <option key={pl.id} value={pl.id} disabled={!isAvailable(pl)}>
                    {pl.shirt}. {pl.name} · {pl.position} {playerOverall(pl)} · {Math.round(pl.fitness)}%{statusText(pl)}
                  </option>
                ))}
              </select>
              <select className="field px-1.5 py-1 text-xs font-semibold" value={s.role} onChange={e => setRole(s.slot, e.target.value as RoleId)}
                title={`${ROLE_INFO[s.role].label} — ${ROLE_INFO[s.role].desc}`} aria-label={`Role for ${s.kind}: ${ROLE_INFO[s.role].label}`}>
                {ROLES_FOR_KIND[s.kind].map(r => <option key={r} value={r} title={`${ROLE_INFO[r].label} — ${ROLE_INFO[r].desc}`}>{ROLE_INFO[r].short}</option>)}
              </select>
              <span className={`tabular text-right text-xs font-semibold ${p ? fitnessClass(p.fitness) : 'text-zinc-600'}`}
                title={p ? `Fitness ${Math.round(p.fitness)}% · Sharpness ${Math.round(p.sharpness)}%` : ''}>
                {p ? Math.round(p.fitness) : '—'}
              </span>
            </div>
          );
        })}
      </div>

      <p className="mt-1.5 text-[11px] leading-snug text-zinc-500">
        {[...new Set(team.lineup.slots.map(sl => sl.role))].map(r => `${ROLE_INFO[r].short} ${ROLE_INFO[r].label}`).join(' · ')}
      </p>
      </>)}

      <div className="panel-title mb-1.5 mt-4">Bench ({team.lineup.bench.length}/9)</div>
      <div className="flex flex-wrap gap-1">
        {team.lineup.bench.map(id => { const p = byId.get(id); return p ? <PlayerChip key={id} p={p} onPick={selSlot ? () => bringIn(id) : undefined} /> : null; })}
      </div>
      {reserves.length > 0 && (
        <>
          <div className="panel-title mb-1.5 mt-3">Not in squad</div>
          <div className={`flex flex-wrap gap-1 ${selSlot ? '' : 'opacity-70'}`}>{reserves.map(p => <PlayerChip key={p.id} p={p} onPick={selSlot ? () => bringIn(p.id) : undefined} />)}</div>
        </>
      )}
      {unavailable.length > 0 && (
        <>
          <div className="panel-title mb-1.5 mt-3 text-rose-400/80">Unavailable</div>
          <ul className="space-y-0.5 text-[12px]">
            {unavailable.map(p => (
              <li key={p.id} className="flex justify-between gap-2 text-zinc-400">
                <span className="truncate"><span className={`font-semibold ${POS_COLOR[p.position]}`}>{p.position}</span> {p.name}</span>
                <span className={p.injury ? 'text-rose-300' : 'text-amber-300'}>
                  {p.injury ? `✚ ${p.injury.label} · ${p.injury.matchesOut} match${p.injury.matchesOut > 1 ? 'es' : ''}` : `Banned · ${p.suspension}`}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
      <p className="mt-3 text-[11px] text-zinc-500">Fitness drops with minutes played and recovers between rounds; starting tired costs stamina and raises injury risk. Sharpness grows with game time.</p>
    </Panel>
  );
}

function PlayerChip({ p, onPick }: { p: Player; onPick?: () => void }) {
  const Tag = onPick ? 'button' : 'span';
  return (
    <Tag onClick={onPick} className={`rounded-md border px-1.5 py-0.5 text-[11px] text-zinc-300 ${onPick ? 'border-emerald-600/60 bg-emerald-500/10 hover:bg-emerald-500/20' : 'border-zinc-800 bg-zinc-900'}`}
      title={`${p.naturalRoles.map(r => ROLE_INFO[r].label).join(', ')} · Fitness ${Math.round(p.fitness)}% · Sharpness ${Math.round(p.sharpness)}%${p.seasonYellows ? ` · ${p.seasonYellows} yellow${p.seasonYellows > 1 ? 's' : ''}` : ''}`}>
      <span className={`font-semibold ${POS_COLOR[p.position]}`}>{p.position}</span> {p.name.split(' ').slice(-1)[0]} <span className="text-zinc-500">{playerOverall(p)}</span>
      <span className={`ml-1 tabular ${fitnessClass(p.fitness)}`}>{Math.round(p.fitness)}%</span>
      {p.seasonYellows >= 4 && p.seasonYellows % 5 === 4 && <span className="ml-1 text-amber-400" title="One more yellow means a ban">⚠</span>}
    </Tag>
  );
}
