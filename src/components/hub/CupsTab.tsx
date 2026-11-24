import { useState } from 'react';
import type { CupState, CupTie } from '../../types/cups.ts';
import { useGame } from '../../store/gameStore.ts';
import { CUP_PRIZES, CUP_SHORT, groupTable } from '../../club/cups.ts';
import { formatMoney } from '../../club/economy.ts';
import { Panel, Segmented } from '../ui/controls.tsx';

/** Shows where a cup slot falls relative to the league calendar. */
const whenText = (slot: number): string => slot < 1 ? 'Pre-season' : `After league round ${Math.floor(slot)}`;

export function CupsTab() {
  const career = useGame(s => s.career)!;
  const teamById = useGame(s => s.teamById);
  const cups = career.cups;
  const [cupId, setCupId] = useState<CupState['id']>(() => cups?.cups.find(c => c.ties.some(t => !t.result))?.id ?? 'EGYPT_CUP');

  if (!cups || cups.cups.length === 0) {
    return (
      <Panel title="Cups">
        <p className="py-2 text-sm text-zinc-400">
          {career.league === 'EGY' ? 'The Super Cup, Egypt Cup and League Cup start next season.' : 'Domestic cups are part of the Egyptian league careers.'}
        </p>
      </Panel>
    );
  }

  const cup = cups.cups.find(c => c.id === cupId) ?? cups.cups[0]!;
  const uid = career.user.id;
  const name = (id: string): string => teamById(id)?.name ?? id;
  const short = (id: string): string => teamById(id)?.shortName ?? id.slice(0, 3).toUpperCase();
  const userTies = cup.ties.filter(t => t.homeId === uid || t.awayId === uid);
  const lost = userTies.find(t => t.knockout && t.result && t.result.winnerId !== uid);
  const entered = userTies.length > 0;
  const status = cup.winnerId === uid ? '🏆 Winners'
    : cup.winnerId ? `Won by ${name(cup.winnerId)}`
    : !entered ? 'Not taking part'
    : lost ? `Knocked out (${cup.stages.find(s => s.key === lost.stageKey)?.label ?? lost.stageKey})`
    : 'Still in it';
  const prize = CUP_PRIZES[cup.id];
  const scorers = Object.values(cup.scorers).sort((a, b) => b.goals - a.goals).slice(0, 8);
  const groupStages = cup.stages.filter(s => s.kind === 'GROUP');
  const koStages = cup.stages.filter(s => s.kind === 'KO');

  return (
    <div className="space-y-3">
      <Segmented value={cup.id} onChange={setCupId} options={cups.cups.map(c => ({ value: c.id, label: CUP_SHORT[c.id] }))} />

      <Panel title={`${cup.name} · Season ${cup.season}`}>
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className={cup.winnerId === uid ? 'font-semibold text-amber-300' : lost ? 'text-rose-300' : 'text-zinc-200'}>{status}</span>
          <span className="text-[12px] text-zinc-500">
            Prize: {formatMoney(prize.winner)} to the winner{prize.runnerUp ? ` · ${formatMoney(prize.runnerUp)} runner-up` : ''} · {formatMoney(prize.tieWin)} per win
          </span>
        </div>
        {cup.winnerId && cup.runnerUpId && (
          <p className="mt-1 text-[12px] text-zinc-500">Final: {name(cup.winnerId)} beat {name(cup.runnerUpId)}</p>
        )}
      </Panel>

      {cup.groups && groupStages.length > 0 && (
        <Panel title="Group stage · top two go through">
          <div className="grid gap-3 sm:grid-cols-2">
            {Object.keys(cup.groups).map(g => (
              <div key={g} className="min-w-0">
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Group {g}</div>
                <table className="w-full text-[12px] tabular-nums">
                  <thead><tr className="text-zinc-500"><th className="text-left font-normal">Team</th><th className="w-6 font-normal">P</th><th className="w-8 font-normal">GD</th><th className="w-7 font-normal">Pts</th></tr></thead>
                  <tbody>
                    {groupTable(cup, g).map((r, i) => (
                      <tr key={r.teamId} className={`${r.teamId === uid ? 'text-emerald-300' : 'text-zinc-300'} ${i < 2 ? '' : 'opacity-70'}`}>
                        <td className="truncate py-0.5 pr-1"><span className={`mr-1 inline-block w-3 text-center ${i < 2 ? 'text-emerald-500' : 'text-zinc-600'}`}>{i + 1}</span>{name(r.teamId)}</td>
                        <td className="text-center">{r.p}</td>
                        <td className="text-center">{r.gf - r.ga > 0 ? '+' : ''}{r.gf - r.ga}</td>
                        <td className="text-center font-semibold">{r.pts}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
          {userTies.some(t => !t.knockout) && (
            <div className="mt-3 border-t border-zinc-800 pt-2">
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Your group matches</div>
              <TieList ties={userTies.filter(t => !t.knockout)} uid={uid} short={short} name={name} />
            </div>
          )}
        </Panel>
      )}

      {koStages.map(stage => {
        const ties = cup.ties.filter(t => t.stageKey === stage.key);
        return (
          <Panel key={stage.key} title={`${stage.label} · ${whenText(stage.slot)}${stage.neutral ? ' · neutral venue' : ''}`}>
            {ties.length === 0
              ? <p className="text-[13px] text-zinc-500">Draw after the previous round.</p>
              : <TieList ties={[...ties].sort((a, b) => Number(b.homeId === uid || b.awayId === uid) - Number(a.homeId === uid || a.awayId === uid))} uid={uid} short={short} name={name} />}
          </Panel>
        );
      })}

      {scorers.length > 0 && (
        <Panel title="Top scorers">
          <ol className="space-y-0.5 text-[13px]">
            {scorers.map((s, i) => (
              <li key={`${s.name}_${s.teamId}`} className={`flex justify-between gap-2 ${s.teamId === uid ? 'text-emerald-300' : 'text-zinc-300'}`}>
                <span className="truncate"><span className="mr-2 text-zinc-600">{i + 1}</span>{s.name} <span className="text-zinc-500">· {short(s.teamId)}</span></span>
                <span className="tabular-nums font-semibold">{s.goals}</span>
              </li>
            ))}
          </ol>
        </Panel>
      )}

      {(cups.honours.length > 0 || cups.winners.length > 0) && (
        <Panel title="Honours">
          {cups.honours.length > 0 && (
            <ul className="mb-2 space-y-0.5 text-[13px] text-amber-200">
              {cups.honours.map((h, i) => <li key={i}>🏆 {h.name} <span className="text-zinc-500">· Season {h.season}</span></li>)}
            </ul>
          )}
          {cups.winners.length > 0 && (
            <ul className="space-y-0.5 text-[12px] text-zinc-400">
              {cups.winners.map((w, i) => <li key={i}>S{w.season} · {CUP_SHORT[w.cup]}: <span className={w.winnerId === uid ? 'text-amber-300' : 'text-zinc-200'}>{w.winnerName}</span> beat {w.runnerUpName}</li>)}
            </ul>
          )}
        </Panel>
      )}
    </div>
  );
}

function TieList({ ties, uid, short, name }: { ties: CupTie[]; uid: string; short: (id: string) => string; name: (id: string) => string }) {
  return (
    <ul className="divide-y divide-zinc-800/70 text-[13px]">
      {ties.map(t => {
        const r = t.result;
        const mine = t.homeId === uid || t.awayId === uid;
        const won = (id: string): boolean => !!r && r.winnerId === id;
        return (
          <li key={t.id} className={`flex items-center gap-2 py-1 ${mine ? 'text-emerald-200' : 'text-zinc-300'}`}>
            <span className={`min-w-0 flex-1 truncate text-right ${won(t.homeId) ? 'font-semibold' : ''}`} title={name(t.homeId)}>
              <span className="sm:hidden">{short(t.homeId)}</span><span className="hidden sm:inline">{name(t.homeId)}</span>
            </span>
            <span className="w-14 flex-none rounded bg-zinc-800/70 text-center tabular-nums">{r ? `${r.home}–${r.away}` : 'v'}</span>
            <span className={`min-w-0 flex-1 truncate ${won(t.awayId) ? 'font-semibold' : ''}`} title={name(t.awayId)}>
              <span className="sm:hidden">{short(t.awayId)}</span><span className="hidden sm:inline">{name(t.awayId)}</span>
            </span>
            <span className="w-16 flex-none text-right text-[11px] text-zinc-500">
              {r?.pens ? `${r.pens.home}–${r.pens.away} pens` : r?.et ? 'AET' : ''}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
