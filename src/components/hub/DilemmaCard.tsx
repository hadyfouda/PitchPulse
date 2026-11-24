import { useState } from 'react';
import { useGame } from '../../store/gameStore.ts';
import { describeDilemma } from '../../club/dilemmas.ts';

/** An off-pitch decision waiting for the manager. Unanswered, it lapses after the next round. */
export function DilemmaCard() {
  const dilemma = useGame(s => s.career?.dilemma ?? null);
  const answer = useGame(s => s.answerDilemma);
  const [outcome, setOutcome] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (outcome) {
    return (
      <div className="panel mb-4 flex items-center justify-between gap-3 border-violet-500/30 bg-violet-500/5 p-3 text-sm">
        <span className="text-violet-100">{outcome}</span>
        <button className="btn btn-ghost px-2 py-0.5 text-xs" onClick={() => setOutcome(null)}>Dismiss</button>
      </div>
    );
  }
  if (!dilemma) return null;
  const d = describeDilemma(dilemma);
  const choose = async (i: 0 | 1): Promise<void> => { setBusy(true); setOutcome(await answer(i)); setBusy(false); };
  return (
    <div className="panel mb-4 border-violet-500/40 bg-violet-500/5 p-4" role="region" aria-label="Off-pitch decision">
      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-300">Off the pitch · {d.title}</div>
      <p className="mt-1 text-sm text-zinc-100">{d.text}</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {d.options.map((o, i) => (
          <button key={o.label} disabled={busy} onClick={() => void choose(i as 0 | 1)}
            className="rounded-lg border border-zinc-700 bg-zinc-900/70 px-3 py-2 text-left transition hover:border-violet-400/70 disabled:opacity-50">
            <div className="text-sm font-medium text-zinc-100">{o.label}</div>
            <div className="text-[12px] text-zinc-400">{o.effect}</div>
          </button>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-zinc-500">Ignore it and the moment passes after the next match.</p>
    </div>
  );
}
