import { useState } from 'react';
import type { Player } from '../../types/domain.ts';
import { useGame } from '../../store/gameStore.ts';
import { ROLE_INFO } from '../../engine/roles.ts';
import { playerOverall } from '../../data/generators.ts';
import { formatMoney } from '../../club/economy.ts';
import { potentialRange, potentialStars } from '../../club/development.ts';
import { MAX_SQUAD } from '../../club/transfers.ts';
import { Panel } from '../ui/controls.tsx';

function Stars({ value }: { value: number }) {
  return (
    <span className="text-amber-300" aria-label={`${value} of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (value >= i + 1 ? '★' : value >= i + 0.5 ? '⯪' : '☆')).join('')}
    </span>
  );
}

export function AcademyTab() {
  const career = useGame(s => s.career)!;
  const promote = useGame(s => s.promoteProspect);
  const release = useGame(s => s.releaseProspect);
  const [msg, setMsg] = useState<string | null>(null);
  const prospects = [...career.academy.prospects].sort((a, b) => b.potential - a.potential);
  const full = career.user.players.length >= MAX_SQUAD;

  return (
    <div className="space-y-3">
      <Panel title="Youth academy" right={<span className="text-[11px] text-zinc-500">Intake every summer · graduates at 19</span>}>
        <p className="text-sm text-zinc-400">
          Prospects train here and grow fastest while young. Promote them when they're ready to compete, or let them go.
          Potential is a scouting estimate — the younger the player, the wider the range.
        </p>
        {msg && <p className="mt-2 rounded-md bg-emerald-500/10 px-2 py-1.5 text-sm text-emerald-200">{msg}</p>}
      </Panel>
      {prospects.length === 0 ? <Panel><p className="text-sm text-zinc-500">The academy is empty until next summer's intake.</p></Panel> : (
        <div className="grid gap-3 sm:grid-cols-2">
          {prospects.map(p => <ProspectCard key={p.id} p={p} full={full}
            onPromote={async () => setMsg(await promote(p.id))}
            onRelease={async () => { if (confirm(`Release ${p.name}?`)) { await release(p.id); setMsg(`${p.name} released.`); } }} />)}
        </div>
      )}
    </div>
  );
}

function ProspectCard({ p, full, onPromote, onRelease }: { p: Player; full: boolean; onPromote: () => void; onRelease: () => void }) {
  const [lo, hi] = potentialRange(p);
  const ovr = playerOverall(p);
  const gem = p.potential >= 82;
  return (
    <div className={`panel p-3 ${gem ? 'border-amber-500/40' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-semibold text-zinc-100">{p.name} {gem && <span className="ml-1 rounded bg-amber-500/15 px-1 text-[10px] text-amber-300">Wonderkid</span>}</div>
          <div className="text-[11px] text-zinc-500">{p.age} yrs · {p.position} · {p.naturalRoles.map(r => ROLE_INFO[r].label).join(', ')}</div>
        </div>
        <div className="text-right">
          <div className="tabular text-lg font-semibold text-zinc-50">{ovr}</div>
          <div className="text-[10px] text-zinc-500">now</div>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="text-zinc-400">Potential <Stars value={potentialStars(p)} /></span>
        <span className="tabular text-zinc-300">{lo}–{hi}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-zinc-800">
        <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, (ovr / Math.max(hi, ovr)) * 100)}%` }} />
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-[11px] text-zinc-500">Wage {formatMoney(p.wage)}/wk</span>
        <span className="flex gap-1.5">
          <button className="btn px-2 py-1 text-xs" onClick={onRelease}>Release</button>
          <button className="btn btn-primary px-2 py-1 text-xs" disabled={full} title={full ? 'Squad is full' : 'Move to the first-team squad'} onClick={onPromote}>Promote</button>
        </span>
      </div>
    </div>
  );
}
