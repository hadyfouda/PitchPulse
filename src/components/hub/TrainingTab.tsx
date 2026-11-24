import { useState } from 'react';
import type { Player } from '../../types/domain.ts';
import type { IndividualFocus, TeamTrainingFocus, TrainingIntensity } from '../../types/club.ts';
import { useGame } from '../../store/gameStore.ts';
import { playerOverall } from '../../data/generators.ts';
import { formatMoney } from '../../club/economy.ts';
import {
  FACILITY_COST, FACILITY_MULT, INDIVIDUAL_FOCUS, INTENSITY, MAX_FACILITIES, MAX_INDIVIDUAL, TEAM_FOCUS,
  expectedRate, headroomFactor, nextPointProgress, planFor, rateLabel
} from '../../club/training.ts';
import { Panel, Segmented } from '../ui/controls.tsx';

const POS_COLOR: Record<string, string> = { GK: 'text-amber-300', DEF: 'text-sky-300', MID: 'text-emerald-300', FWD: 'text-rose-300' };

export function TrainingTab() {
  const career = useGame(s => s.career)!;
  const setTraining = useGame(s => s.setTraining);
  const setPlan = useGame(s => s.setIndividualPlan);
  const upgrade = useGame(s => s.upgradeFacilities);
  const [msg, setMsg] = useState<string | null>(null);
  const t = career.training;
  const players = career.user.players;
  const personal = Object.keys(t.individual).length;

  const rows = players
    .map(p => ({ p, rate: expectedRate(p, t) }))
    .sort((a, b) => b.rate - a.rate || a.p.age - b.p.age);
  const seasonGain = rows.reduce((s, r) => s + r.rate, 0) * career.season.rounds;
  const growing = rows.filter(r => r.rate > 0).length;
  const nextCost = t.facilities < MAX_FACILITIES ? FACILITY_COST[t.facilities - 1]! : null;
  const report = t.lastReport;

  return (
    <div className="space-y-3">
      <Panel title="Training ground" right={<span className="text-[11px] text-zinc-500">Runs every week between rounds</span>}>
        <div className="space-y-3">
          <div>
            <div className="mb-1 text-xs font-semibold text-zinc-400">Intensity</div>
            <Segmented value={t.intensity} onChange={(v: TrainingIntensity) => void setTraining({ intensity: v })}
              options={(Object.keys(INTENSITY) as TrainingIntensity[]).map(k => ({ value: k, label: INTENSITY[k].label }))} />
            <p className="mt-1 text-[11px] text-zinc-500">{INTENSITY[t.intensity].desc}</p>
          </div>
          <div>
            <div className="mb-1 text-xs font-semibold text-zinc-400">Team focus</div>
            <Segmented value={t.focus} onChange={(v: TeamTrainingFocus) => void setTraining({ focus: v })}
              options={(Object.keys(TEAM_FOCUS) as TeamTrainingFocus[]).map(k => ({ value: k, label: TEAM_FOCUS[k].label }))} />
            <p className="mt-1 text-[11px] text-zinc-500">{TEAM_FOCUS[t.focus].desc} Goalkeepers always do goalkeeping work.</p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-800 bg-zinc-900/60 p-2.5">
            <div>
              <div className="text-xs font-semibold text-zinc-300">Facilities · level {t.facilities}/{MAX_FACILITIES}</div>
              <div className="mt-1 flex gap-1">
                {Array.from({ length: MAX_FACILITIES }, (_, i) => (
                  <span key={i} className={`h-2 w-6 rounded-full ${i < t.facilities ? 'bg-emerald-500' : 'bg-zinc-700'}`} />
                ))}
              </div>
              <div className="mt-1 text-[11px] text-zinc-500">
                +{Math.round((FACILITY_MULT[t.facilities - 1]! - 1) * 100)}% development
                {nextCost !== null && <> · next level +{Math.round((FACILITY_MULT[t.facilities]! - 1) * 100)}%</>}
              </div>
            </div>
            {nextCost !== null ? (
              <button className="btn text-xs" disabled={career.finances.balance < nextCost}
                onClick={() => void upgrade().then(setMsg)} title={`Balance ${formatMoney(career.finances.balance)}`}>
                Upgrade · {formatMoney(nextCost)}
              </button>
            ) : <span className="text-xs text-emerald-300">World-class</span>}
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <Stat label="Improving" value={`${growing}/${players.length}`} />
            <Stat label="Personal plans" value={`${personal}/${MAX_INDIVIDUAL}`} />
            <Stat label="Squad gain / season" value={`≈ +${Math.round(seasonGain)} OVR`} hint="Sum of every player's expected overall gain over a full season at the current settings" />
          </div>
          {msg && <p className="text-xs text-amber-200">{msg}</p>}
        </div>
      </Panel>

      {report && (report.gains.length > 0 || report.injuries.length > 0) && (
        <Panel title={`Last week · after round ${report.round}`}>
          {report.ovrUps.length > 0 && (
            <ul className="mb-2 space-y-0.5 text-sm">
              {report.ovrUps.map(u => <li key={u.playerId} className="text-emerald-300">▲ {u.name} <b>{u.from} → {u.to}</b> overall</li>)}
            </ul>
          )}
          <div className="flex flex-wrap gap-1">
            {report.gains.map((g, i) => (
              <span key={i} className="rounded bg-zinc-800/80 px-1.5 py-0.5 text-[11px] text-zinc-300">
                {g.name.split(' ').slice(-1)[0]} <span className="text-emerald-400">+1 {g.attr}</span> <span className="text-zinc-500">({g.value})</span>
              </span>
            ))}
          </div>
          {report.injuries.map((x, i) => <p key={i} className="mt-1.5 text-xs text-rose-300">✚ {x}</p>)}
        </Panel>
      )}

      <Panel title="Players" right={<span className="text-[11px] text-zinc-500">Fastest learners first</span>}>
        <ul className="divide-y divide-zinc-800/70">
          {rows.map(({ p, rate }) => <PlayerRow key={p.id} p={p} rate={rate} full={personal >= MAX_INDIVIDUAL} onPlan={f => void setPlan(p.id, f).then(m => setMsg(m))} />)}
        </ul>
        <p className="mt-2 text-[11px] leading-snug text-zinc-500">
          The number after the arrow is the player's potential. ★ = personal plan. Young players with room below their potential learn fastest; nobody improves past his potential. Players on a
          personal plan train {Math.round((1.3 - 1) * 100)}% faster in their chosen area. Veterans don't improve, but harder
          training and better facilities make them decline more slowly over the summer. Injured players rest.
        </p>
      </Panel>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg bg-zinc-900/70 px-2 py-1.5" title={hint}>
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="tabular text-sm font-semibold text-zinc-100">{value}</div>
    </div>
  );
}

function PlayerRow({ p, rate, full, onPlan }: { p: Player; rate: number; full: boolean; onPlan: (f: IndividualFocus | null) => void }) {
  const t = useGame(s => s.career!.training);
  const ovr = playerOverall(p);
  // Your own coaches know exactly how far a player can go
  const pot = Math.max(ovr, p.potential);
  const plan = planFor(p, t);
  const current = t.individual[p.id] ?? '';
  const speed = rateLabel(rate, p, t);
  const progress = headroomFactor(p) > 0 ? nextPointProgress(p, t) : 0;
  const options = (Object.keys(INDIVIDUAL_FOCUS) as IndividualFocus[]).filter(k => {
    const d = INDIVIDUAL_FOCUS[k];
    return !(d.gkOnly && p.position !== 'GK') && !(d.outfieldOnly && p.position === 'GK');
  });

  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
      <div className="min-w-0 flex-1 basis-40">
        <div className="truncate text-sm text-zinc-100">
          <span className={`text-[11px] font-semibold ${POS_COLOR[p.position]}`}>{p.position}</span> {p.name}
          {p.injury && <span className="ml-1 text-[11px] text-rose-300">✚ resting</span>}
        </div>
        <div className="text-[11px] text-zinc-500">
          {p.age} yrs · <b className="text-zinc-300">{ovr}</b> → {pot} · <span className={speed.cls}>{speed.label}</span>
          <span className="text-zinc-600"> · {plan.label}</span>
        </div>
        <div className="mt-1 h-1 w-full max-w-[14rem] overflow-hidden rounded-full bg-zinc-800" title="Progress toward the next attribute point">
          <span className="block h-full rounded-full bg-emerald-500/80" style={{ width: `${Math.min(100, progress * 100)}%` }} />
        </div>
      </div>
      <select className={`field w-[8.5rem] py-1 text-xs ${current ? 'border-emerald-600/60 text-emerald-200' : ''}`} value={current}
        onChange={e => onPlan(e.target.value ? (e.target.value as IndividualFocus) : null)} aria-label={`Training plan for ${p.name}`}>
        <option value="">Team plan</option>
        {options.map(k => <option key={k} value={k} disabled={full && !current}>★ {INDIVIDUAL_FOCUS[k].label}</option>)}
      </select>
    </li>
  );
}
