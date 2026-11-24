import type { EngineTick, PlayerView, QueuedAction } from '../../types/match.ts';
import type { RoleId } from '../../types/tactics.ts';
import { ROLE_INFO, ROLES_FOR_KIND, positionFit } from '../../engine/roles.ts';
import type { SlotKind } from '../../types/tactics.ts';
import { MAX_SUBS } from '../../engine/constants.ts';
import { engine } from '../../store/engineBridge.ts';
import { useMatch } from '../../store/matchStore.ts';
import { ratingClass, staminaClass } from '../../lib/format.ts';
import { useState } from 'react';
import type { Player } from '../../types/domain.ts';
import { useGame } from '../../store/gameStore.ts';
import { playerOverall, slotScore } from '../../data/generators.ts';
import { Panel, Segmented } from '../ui/controls.tsx';
import { PitchFormation, lastName, type PitchToken } from '../ui/PitchFormation.tsx';

export function SquadPanel({ v }: { v: EngineTick }) {
  const team = v.userSide === 'home' ? v.home : v.away;
  const subOutId = useMatch(s => s.subOutId);
  const setSubOut = useMatch(s => s.setSubOut);
  const pendingSubs = v.queue.filter((a): a is Extract<QueuedAction, { kind: 'SUB' }> => a.kind === 'SUB' && a.side === v.userSide);
  const pendingRoles = v.queue.filter((a): a is Extract<QueuedAction, { kind: 'ROLE' }> => a.kind === 'ROLE' && a.side === v.userSide);
  const pendingOut = new Set(pendingSubs.map(a => a.outId));
  const pendingIn = new Set(pendingSubs.map(a => a.inId));
  const subsLeft = MAX_SUBS - team.subsUsed - pendingSubs.length;
  const finished = v.status === 'FINISHED';

  const xi = team.players.filter(p => p.status === 'PITCH').sort((a, b) => a.slot - b.slot);
  const injured = team.players.filter(p => p.status === 'INJURED_OFF');
  const bench = team.players.filter(p => p.status === 'BENCH');
  const gone = team.players.filter(p => p.status === 'SUBBED_OFF' || p.status === 'SENT_OFF');
  const byId = new Map(team.players.map(p => [p.id, p]));
  const outKind = subOutId ? byId.get(subOutId)?.slotKind ?? null : null;
  // Squad attributes live in the career, the match view only carries ids
  const roster = useGame(s => s.career?.user.players);
  const squad = new Map<string, Player>((roster ?? []).map(p => [p.id, p]));
  const ovrOf = (id: string): number | null => { const p = squad.get(id); return p ? playerOverall(p) : null; };
  /** Ability in a given position (overall × position fit), ignoring tiredness. */
  const atKind = (id: string, kind: NonNullable<typeof outKind>): number | null => {
    const p = squad.get(id); return p ? Math.round(slotScore({ ...p, fitness: 100 }, kind)) : null;
  };
  const outAt = subOutId && outKind ? atKind(subOutId, outKind) : null;

  const [view, setView] = useState<'PITCH' | 'LIST'>('PITCH');
  const selectedPlayer = subOutId ? byId.get(subOutId) : undefined;
  const selectedRole = selectedPlayer ? pendingRoles.find(a => a.playerId === selectedPlayer.id)?.role : undefined;
  const onPitch = [...xi, ...injured];
  const tokens: PitchToken[] = onPitch.map(p => ({
    slot: p.slot, number: p.shirt, name: lastName(p.name), ring: p.status === 'INJURED_OFF' ? 0 : p.stamina,
    sub: p.status === 'INJURED_OFF' ? 'INJURED' : ROLE_INFO[pendingRoles.find(a => a.playerId === p.id)?.role ?? p.role].short,
    tone: p.status === 'INJURED_OFF' ? 'error' : pendingOut.has(p.id) ? 'muted' : 'normal',
    selected: subOutId === p.id,
    badge: p.rating.toFixed(1), badgeClass: `bg-zinc-950/90 ${ratingClass(p.rating)}`,
    marks: <>
      {p.yellow > 0 && <span className="ml-0.5 inline-block h-2.5 w-[7px] flex-none rounded-[1px] bg-amber-400" />}
      {p.goals > 0 && <span className="ml-0.5 flex-none text-[9px]">⚽{p.goals > 1 ? p.goals : ''}</span>}
    </>,
    title: `${p.name} · stamina ${p.stamina}% · rating ${p.rating.toFixed(1)}`
  }));
  const occupied = new Set(onPitch.map(p => p.slot));
  const emptySlots = gone.filter(p => p.status === 'SENT_OFF' && !occupied.has(p.slot)).map(p => ({ slot: p.slot, label: '🟥' }));
  const tapSlot = (slot: number): void => { const p = onPitch.find(x => x.slot === slot); if (p) pickOut(p); };

  const pickOut = (p: PlayerView): void => {
    if (finished || pendingOut.has(p.id)) return;
    setSubOut(subOutId === p.id ? null : p.id);
  };
  const pickIn = (p: PlayerView): void => {
    if (!subOutId || subsLeft <= 0 || pendingIn.has(p.id)) return;
    engine.queue({ kind: 'SUB', outId: subOutId, inId: p.id });
    setSubOut(null);
  };

  return (
    <Panel title={`${team.shortName} · Starting XI`} right={<span className="tabular text-[11px] text-zinc-500">Subs {team.subsUsed + pendingSubs.length}/{MAX_SUBS}</span>}>
      <div className="mb-2.5"><Segmented size="sm" value={view} onChange={setView} options={[{ value: 'PITCH', label: 'Pitch' }, { value: 'LIST', label: 'List' }]} /></div>
      {view === 'PITCH' && (
        <>
          <PitchFormation formation={team.tactics.formation} tokens={tokens} emptySlots={emptySlots} color={team.color} onTap={tapSlot} />
          <div className="mt-2 flex flex-wrap justify-center gap-x-3 text-[10px] text-zinc-500"><span>Ring = stamina</span><span>Corner = match rating</span></div>
          {selectedPlayer ? (
            <div className="mt-2 flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/5 p-2 text-xs">
              <span className="min-w-0 flex-1 truncate text-amber-100"><b>{selectedPlayer.name}</b>{ovrOf(selectedPlayer.id) !== null && <> · OVR {ovrOf(selectedPlayer.id)}</>} · stamina {selectedPlayer.stamina}%</span>
              {selectedPlayer.slotKind && ROLES_FOR_KIND[selectedPlayer.slotKind].length > 1 && (
                <select value={selectedRole ?? selectedPlayer.role} aria-label="Role"
                  onChange={e => engine.queue({ kind: 'ROLE', playerId: selectedPlayer.id, role: e.target.value as RoleId })}
                  className={`w-[6.5rem] flex-none rounded border bg-zinc-900 px-1 py-0.5 text-[11px] ${selectedRole ? 'border-amber-500/60 text-amber-200' : 'border-zinc-700 text-zinc-300'}`}>
                  {ROLES_FOR_KIND[selectedPlayer.slotKind].map(r => <option key={r} value={r}>{ROLE_INFO[r].short} · {ROLE_INFO[r].label}</option>)}
                </select>
              )}
            </div>
          ) : !finished && <p className="mt-2 text-center text-[11px] text-zinc-500">Tap a player to change his role or substitute him.</p>}
        </>
      )}
      {view === 'LIST' && <ul className="space-y-0.5">
        {xi.map(p => (
          <PlayerRow key={p.id} p={p} selected={subOutId === p.id} pendingOut={pendingOut.has(p.id)}
            pendingRole={pendingRoles.find(a => a.playerId === p.id)?.role}
            onClick={() => pickOut(p)} />
        ))}
        {injured.map(p => (
          <PlayerRow key={p.id} p={p} selected={subOutId === p.id} pendingOut={pendingOut.has(p.id)} onClick={() => pickOut(p)} />
        ))}
      </ul>}

      <div className="mb-1.5 mt-3 flex items-center justify-between">
        <span className="panel-title">Bench</span>
        {subOutId && <span className="min-w-0 truncate pl-2 text-right text-[11px] text-amber-300">Pick who comes on for {byId.get(subOutId)?.name.split(' ').slice(-1)[0]}{outAt !== null && outKind ? ` (${outAt} at ${outKind})` : ''}</span>}
      </div>
      <ul className="space-y-0.5">
        {bench.map(p => {
          const usable = !!subOutId && subsLeft > 0 && !pendingIn.has(p.id);
          return (
            <li key={p.id}>
              <button onClick={() => pickIn(p)} disabled={!usable}
                className={`flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left text-[13px] transition ${usable ? 'bg-emerald-500/5 ring-1 ring-emerald-500/30 hover:bg-emerald-500/15' : 'opacity-70'} ${pendingIn.has(p.id) ? 'opacity-40' : ''}`}>
                <span className="tabular w-5 text-right font-mono text-[11px] text-zinc-500">{p.shirt}</span>
                <span className="min-w-0 flex-1 truncate text-zinc-300">{p.name}</span>
                {outKind ? <FitBadge position={p.position} kind={outKind} /> : <span className="text-[10px] text-zinc-500">{p.position}</span>}
                <PowerBadge ovr={ovrOf(p.id)} at={outKind ? atKind(p.id, outKind) : null} vs={outAt} kind={outKind} />
              </button>
            </li>
          );
        })}
      </ul>

      {pendingSubs.length > 0 && (
        <div className="mt-3 space-y-1 rounded-lg border border-sky-700/40 bg-sky-500/5 p-2">
          <div className="text-[11px] font-semibold text-sky-300">Queued — at next stoppage</div>
          {pendingSubs.map(a => (
            <div key={a.id} className="flex items-center justify-between gap-2 text-xs text-zinc-300">
              <span className="flex min-w-0 items-center gap-1">
                <span className="truncate"><span className="text-emerald-400">▲</span> {byId.get(a.inId)?.name} <span className="text-rose-400">▼</span> {byId.get(a.outId)?.name}</span>
                {(() => { const i = byId.get(a.inId), k = byId.get(a.outId)?.slotKind; return i && k ? <FitBadge position={i.position} kind={k} hideOk /> : null; })()}
              </span>
              <button className="btn btn-ghost px-1.5 py-0.5 text-[11px]" onClick={() => engine.cancel(a.id)}>Cancel</button>
            </div>
          ))}
        </div>
      )}

      {gone.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {gone.map(p => (
            <span key={p.id} className="rounded bg-zinc-800/70 px-1.5 py-0.5 text-[11px] text-zinc-500">
              {p.status === 'SENT_OFF' ? '🟥' : p.injured ? '✚' : '▼'} {p.name.split(' ').slice(-1)[0]} <span className={ratingClass(p.rating)}>{p.rating.toFixed(1)}</span>
            </span>
          ))}
        </div>
      )}
    </Panel>
  );
}

function PlayerRow({ p, selected, pendingOut, pendingRole, onClick }: {
  p: PlayerView; selected: boolean; pendingOut: boolean; pendingRole?: RoleId; onClick: () => void;
}) {
  const injuredOff = p.status === 'INJURED_OFF';
  const roles = p.slotKind ? ROLES_FOR_KIND[p.slotKind] : [];
  return (
    <li className={`group flex items-center gap-1.5 rounded-md px-1.5 py-1 transition ${selected ? 'bg-amber-500/10 ring-1 ring-amber-500/60' : 'hover:bg-zinc-800/50'} ${pendingOut ? 'opacity-50' : ''}`}>
      <button onClick={onClick} className="flex min-w-0 flex-1 items-center gap-1.5 text-left" title="Select to substitute">
        <span className="tabular w-5 flex-none text-right font-mono text-[11px] text-zinc-500">{p.shirt}</span>
        <span className="block min-w-0 flex-1">
          <span className="flex items-center gap-1 text-[13px] text-zinc-100">
            <span className="truncate">{p.name}</span>
            {p.yellow > 0 && <span className="h-3 w-2 flex-none rounded-[1px] bg-amber-400" title="Booked" />}
            {injuredOff && <span className="flex-none text-[11px] font-bold text-rose-400" title="Injured — needs replacing">✚ INJ</span>}
            {p.goals > 0 && <span className="flex-none text-[10px] text-emerald-300">⚽{p.goals > 1 ? p.goals : ''}</span>}
          </span>
          {!injuredOff && (
            <span className="mt-0.5 flex items-center gap-1.5">
              <span className="h-1 flex-1 overflow-hidden rounded-full bg-zinc-800">
                <span className={`block h-full ${staminaClass(p.stamina)} transition-all duration-700`} style={{ width: `${p.stamina}%` }} />
              </span>
              <span className={`tabular w-6 text-right text-[10px] ${p.stamina < 60 ? 'text-amber-300' : 'text-zinc-500'}`}>{p.stamina}</span>
            </span>
          )}
        </span>
      </button>
      {roles.length > 1 ? (
        <select value={pendingRole ?? p.role} aria-label={`${p.name} role`}
          onChange={e => engine.queue({ kind: 'ROLE', playerId: p.id, role: e.target.value as RoleId })}
          className={`w-[3.4rem] flex-none rounded border bg-zinc-900 px-0.5 py-0.5 text-[10px] ${pendingRole ? 'border-amber-500/60 text-amber-200' : 'border-zinc-800 text-zinc-400'}`}>
          {roles.map(r => <option key={r} value={r}>{ROLE_INFO[r].short}</option>)}
        </select>
      ) : (
        <span className="w-[3.4rem] flex-none text-center text-[10px] text-zinc-500">{ROLE_INFO[p.role].short}</span>
      )}
      <span className={`tabular w-7 flex-none text-right text-[12px] font-semibold ${ratingClass(p.rating)}`}>{p.rating.toFixed(1)}</span>
    </li>
  );
}

/** Shows how well a bench player fits the slot he'd take; the engine scales his effectiveness by the same factor. */
function FitBadge({ position, kind, hideOk = false }: { position: PlayerView['position']; kind: SlotKind; hideOk?: boolean }) {
  const fit = positionFit(position, kind);
  if (fit >= 0.95) return hideOk ? null : <span className="flex-none text-[10px] text-emerald-400" title="Natural position">{position} ✓</span>;
  const severe = fit < 0.6;
  return (
    <span className={`flex-none rounded px-1 text-[10px] font-semibold ${severe ? 'bg-rose-500/15 text-rose-300' : 'bg-amber-500/15 text-amber-300'}`}
      title={`Out of position: ${position} playing ${kind} — about ${Math.round(fit * 100)}% effectiveness`}>
      ⚠ {position}→{kind} {Math.round(fit * 100)}%
    </span>
  );
}

/**
 * The bench player's strength: his overall, and once you've picked who goes off, his ability in that position
 * compared with the player he'd replace (▲ stronger / ▼ weaker).
 */
function PowerBadge({ ovr, at, vs, kind }: { ovr: number | null; at: number | null; vs: number | null; kind: SlotKind | null }) {
  if (ovr === null) return null;
  if (at === null || vs === null || !kind) {
    return <span className="tabular w-9 flex-none rounded bg-zinc-800 px-1 text-center text-[11px] font-bold text-zinc-200" title="Overall rating">{ovr}</span>;
  }
  const d = at - vs;
  const cls = d > 0 ? 'bg-emerald-500/15 text-emerald-300' : d < 0 ? 'bg-rose-500/15 text-rose-300' : 'bg-zinc-800 text-zinc-300';
  return (
    <span className={`tabular flex-none rounded px-1 text-[11px] font-bold ${cls}`} title={`${at} at ${kind} (overall ${ovr}) vs ${vs} for the player going off`}>
      {at} {d > 0 ? `▲${d}` : d < 0 ? `▼${-d}` : '='}
    </span>
  );
}
