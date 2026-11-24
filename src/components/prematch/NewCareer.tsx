import { useState } from 'react';
import { CLUB_SEEDS } from '../../data/names.ts';
import { EGYPT_CLUBS } from '../../data/egypt/world.ts';
import { useGame } from '../../store/gameStore.ts';

export function NewCareer() {
  const newCareer = useGame(s => s.newCareer);
  const [busy, setBusy] = useState(false);
  const [classic, setClassic] = useState(false);
  const pick = async (i: number, league: 'EGY' | 'CLASSIC'): Promise<void> => { setBusy(true); await newCareer(i, league); };

  const badge = (short: string, primary: string, secondary: string) => (
    <span className="grid h-9 w-9 flex-none place-items-center rounded-lg text-[11px] font-bold text-white shadow-inner"
      style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})`, textShadow: '0 1px 2px rgba(0,0,0,.6)' }}>{short}</span>
  );

  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center px-5 py-10">
      <div className="mb-6">
        <div className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-400">PitchPulse</div>
        <h1 className="mt-2 text-3xl font-semibold text-zinc-50">Take charge of a club</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-400">
          {classic
            ? 'A fictional 12-club league with generated players.'
            : 'Egyptian Premier League 2026/27 — the 20 real clubs with their real squads, 38 rounds home and away. Player ratings are estimates.'}
        </p>
      </div>

      {!classic ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {EGYPT_CLUBS.map((c, i) => (
            <button key={c.id} disabled={busy} onClick={() => void pick(i, 'EGY')}
              className="panel flex items-center gap-3 p-2.5 text-left transition hover:border-emerald-500/60 disabled:opacity-50">
              {badge(c.shortName, c.colors.primary, c.colors.secondary)}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-zinc-100">{c.name}</span>
                <span className="block text-[11px] text-zinc-500">{c.table.pos}{c.table.pos === 1 ? 'st' : c.table.pos === 2 ? 'nd' : c.table.pos === 3 ? 'rd' : 'th'} · {c.table.pts} pts after {c.table.p}</span>
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {CLUB_SEEDS.map((c, i) => (
            <button key={c.short} disabled={busy} onClick={() => void pick(i, 'CLASSIC')}
              className="panel flex items-center gap-3 p-3 text-left transition hover:border-emerald-500/60 disabled:opacity-50">
              {badge(c.short, c.primary, c.secondary)}
              <span className="text-sm font-medium text-zinc-100">{c.name}</span>
            </button>
          ))}
        </div>
      )}

      <button className="btn btn-ghost mt-5 self-center text-xs text-zinc-500" onClick={() => setClassic(v => !v)}>
        {classic ? '← Egyptian Premier League' : 'Play the fictional league instead'}
      </button>
    </div>
  );
}
