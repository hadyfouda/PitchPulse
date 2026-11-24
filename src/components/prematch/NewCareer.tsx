import { useState } from 'react';
import { CLUB_SEEDS } from '../../data/names.ts';
import { useGame } from '../../store/gameStore.ts';

export function NewCareer() {
  const newCareer = useGame(s => s.newCareer);
  const [busy, setBusy] = useState(false);
  const pick = async (i: number): Promise<void> => { setBusy(true); await newCareer(i); };

  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center px-5 py-10">
      <div className="mb-8">
        <div className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-400">PitchPulse</div>
        <h1 className="mt-2 text-3xl font-semibold text-zinc-50">Take charge of a club</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-400">
          Set your tactics in two-minute bursts, let the match run quietly in a side tab, and step in the
          moment something happens. Everything is stored on this device.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {CLUB_SEEDS.map((c, i) => (
          <button key={c.short} disabled={busy} onClick={() => void pick(i)}
            className="panel flex items-center gap-3 p-3 text-left transition hover:border-emerald-500/60 disabled:opacity-50">
            <span className="grid h-9 w-9 flex-none place-items-center rounded-lg text-[11px] font-bold text-white"
              style={{ background: `linear-gradient(135deg, ${c.primary}, ${c.secondary})` }}>{c.short}</span>
            <span className="text-sm font-medium text-zinc-100">{c.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
