import { useRef, useState } from 'react';
import { useGame } from '../../store/gameStore.ts';
import { formatMoney, meritPayment, wageBill } from '../../club/economy.ts';
import { computeTable, ordinal, positionOf } from '../../league/schedule.ts';
import { Panel } from '../ui/controls.tsx';

export function boardMood(c: number): { label: string; cls: string } {
  if (c >= 80) return { label: 'Delighted', cls: 'text-emerald-300' };
  if (c >= 60) return { label: 'Confident', cls: 'text-emerald-400' };
  if (c >= 40) return { label: 'Patient', cls: 'text-zinc-300' };
  if (c >= 20) return { label: 'Concerned', cls: 'text-amber-300' };
  return { label: 'Losing faith', cls: 'text-rose-400' };
}

export function ClubTab() {
  const career = useGame(s => s.career)!;
  const exportSave = useGame(s => s.exportSave);
  const importSave = useGame(s => s.importSave);
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const f = career.finances;
  const bill = wageBill(career.user);
  const teams = [career.user, ...career.opponents];
  const pos = positionOf(computeTable(teams, career.season.fixtures), career.user.id);
  const mood = boardMood(f.boardConfidence);
  const played = career.season.round - 1;

  const onImport = async (file: File): Promise<void> => {
    if (!confirm('Importing replaces your current career, results and season history on this device. Continue?')) return;
    const err = await importSave(await file.text());
    setStatus(err ? { ok: false, text: err } : { ok: true, text: 'Save imported.' });
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <Panel title="Finances">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-zinc-500">Balance</dt><dd className={`tabular text-right font-semibold ${f.balance < 0 ? 'text-rose-300' : 'text-zinc-100'}`}>{formatMoney(f.balance)}</dd>
            <dt className="text-zinc-500">Transfer budget</dt><dd className="tabular text-right text-zinc-100">{formatMoney(f.transferBudget)}</dd>
            <dt className="text-zinc-500">Wage bill</dt><dd className={`tabular text-right ${bill > f.wageBudget ? 'text-rose-300' : 'text-zinc-100'}`}>{formatMoney(bill)}/wk</dd>
            <dt className="text-zinc-500">Wage budget</dt><dd className="tabular text-right text-zinc-100">{formatMoney(f.wageBudget)}/wk</dd>
          </dl>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-800" title="Wage bill vs budget">
            <div className={`h-full ${bill > f.wageBudget ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, (bill / Math.max(1, f.wageBudget)) * 100)}%` }} />
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-zinc-500">
            Income each round: €150K broadcast fee, €600K gate at home, €400K for a win (€150K for a draw). Wages are paid weekly.
            Season-end merit payment: {formatMoney(meritPayment(1, teams.length))} for the champions down to {formatMoney(meritPayment(teams.length, teams.length))} for last
            — currently {formatMoney(meritPayment(pos, teams.length))} for {ordinal(pos)}.
          </p>
        </Panel>

        <Panel title="Board">
          <div className="flex items-baseline justify-between">
            <span className={`text-lg font-semibold ${mood.cls}`}>{mood.label}</span>
            <span className="tabular text-sm text-zinc-400">{Math.round(f.boardConfidence)}/100</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-800">
            <div className="h-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-500" style={{ width: `${f.boardConfidence}%` }} />
          </div>
          <p className="mt-3 text-sm text-zinc-300">Expectation: finish <b>{ordinal(f.expectedPosition)}</b> or better. {played > 0 && <>You're <b>{ordinal(pos)}</b> after {played} round{played > 1 ? 's' : ''}.</>}</p>
          <p className="mt-1 text-[11px] text-zinc-500">Confidence moves with results against the odds, the season's finish against expectation, the wage budget and your off-pitch decisions. It sets next season's transfer and wage budgets.</p>
        </Panel>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Panel title="Ledger">
          {f.ledger.length === 0 ? <p className="text-sm text-zinc-500">No transactions yet.</p> : (
            <ul className="max-h-72 space-y-0.5 overflow-y-auto pr-1 text-[12px]">
              {f.ledger.slice(0, 60).map((e, i) => (
                <li key={i} className="flex justify-between gap-2 border-b border-zinc-800/40 py-1">
                  <span className="truncate text-zinc-400"><span className="tabular text-zinc-600">S{e.season}·R{e.round}</span> {e.label}</span>
                  <span className={`tabular flex-none ${e.amount >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{e.amount >= 0 ? '+' : ''}{formatMoney(e.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Club news">
          {career.news.length === 0 ? <p className="text-sm text-zinc-500">Transfers, academy moves and dressing-room stories appear here.</p> : (
            <ul className="max-h-72 space-y-1 overflow-y-auto pr-1 text-[13px]">
              {career.news.map((n, i) => <li key={i} className="text-zinc-300"><span className="tabular mr-1 text-[11px] text-zinc-600">S{n.season}·R{n.round}</span>{n.text}</li>)}
            </ul>
          )}
        </Panel>
      </div>

      <Panel title="Save file">
        <p className="text-sm text-zinc-400">Everything lives in this browser. Export a JSON backup to move your career to another device or keep it safe; importing replaces the career here.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="btn btn-primary" onClick={() => void exportSave().then(() => setStatus({ ok: true, text: 'Save exported.' })).catch(e => setStatus({ ok: false, text: String(e.message ?? e) }))}>Export save (.json)</button>
          <button className="btn" onClick={() => fileRef.current?.click()}>Import save…</button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" aria-label="Import save file"
            onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; if (file) void onImport(file); }} />
        </div>
        {status && <p className={`mt-2 text-sm ${status.ok ? 'text-emerald-300' : 'text-rose-300'}`}>{status.text}</p>}
      </Panel>
    </div>
  );
}
