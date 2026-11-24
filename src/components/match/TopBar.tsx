import { useState } from 'react';
import type { EngineTick, SpeedMode, TeamView } from '../../types/match.ts';
import { engine } from '../../store/engineBridge.ts';
import { useMatch } from '../../store/matchStore.ts';
import { SPEED_LABELS } from '../../engine/constants.ts';
import { clockText } from '../../lib/format.ts';
import { PAUSE_LABEL } from '../../lib/labels.ts';
import { AutoPauseSettings } from '../AutoPauseSettings.tsx';

const SPEEDS: SpeedMode[] = ['BG30', 'BG15', 'X1', 'X2', 'X8'];

export function Scoreboard({ v, compact = false }: { v: EngineTick; compact?: boolean }) {
  const side = (t: TeamView, right: boolean) => (
    <div className={`flex min-w-0 flex-1 items-center gap-2 ${right ? 'flex-row-reverse text-right' : ''}`}>
      <span className="h-8 w-1.5 flex-none rounded-full" style={{ background: t.color }} />
      <div className="min-w-0">
        <div className={`truncate font-semibold text-zinc-100 ${compact ? 'text-sm' : 'text-base'}`}>{compact ? t.shortName : t.name}</div>
        {!compact && <div className="text-[11px] text-zinc-500">{t.tactics.formation}{t.isUser ? ' · You' : ''}</div>}
      </div>
    </div>
  );
  return (
    <div className="flex items-center gap-3">
      {side(v.home, false)}
      <div className="flex-none text-center">
        <div className={`tabular font-semibold tracking-tight text-zinc-50 ${compact ? 'text-2xl' : 'text-4xl'}`}>
          {v.home.score}<span className="mx-1.5 text-zinc-600">–</span>{v.away.score}
        </div>
        <div className="tabular font-mono text-xs text-emerald-300">
          {clockText(v)}
          {v.addedAnnounced > 0 && v.period !== 'HT' && v.period !== 'FT' && <span className="ml-1 text-amber-300">(+{v.addedAnnounced})</span>}
        </div>
      </div>
      {side(v.away, true)}
    </div>
  );
}

export function PlayPause({ v }: { v: EngineTick }) {
  const running = v.status === 'RUNNING';
  return (
    <button className={`btn min-w-[5.5rem] ${running ? '' : 'btn-primary'}`} onClick={() => (running ? engine.pause() : engine.resume())}
      disabled={v.status === 'FINISHED'} title="Space">
      {running ? '❚❚ Pause' : v.period === 'HT' ? '▶ 2nd half' : v.period === 'ETB' ? '▶ Extra time' : v.period === 'ETH' ? '▶ ET 2nd half' : '▶ Resume'}
    </button>
  );
}

export function SpeedToggle({ v }: { v: EngineTick }) {
  return (
    <div className="flex rounded-lg bg-zinc-950/70 p-0.5" role="group" aria-label="Match speed">
      {SPEEDS.map(s => (
        <button key={s} onClick={() => engine.setSpeed(s)}
          className={`rounded-md px-2 py-1 text-[11px] font-semibold transition ${v.speed === s ? 'bg-emerald-600/30 text-emerald-200 ring-1 ring-emerald-500/50' : 'text-zinc-400 hover:text-zinc-100'}`}>
          {SPEED_LABELS[s]}
        </button>
      ))}
    </div>
  );
}

export function TopBar({ v }: { v: EngineTick }) {
  const [open, setOpen] = useState(false);
  const toggleFocus = useMatch(s => s.toggleFocus);
  return (
    <div className="panel p-3">
      <Scoreboard v={v} />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-800/70 pt-3">
        <div className="flex items-center gap-2">
          <PlayPause v={v} />
          <span className={`text-xs ${v.status === 'RUNNING' ? 'text-emerald-400' : 'text-amber-300'}`}>
            {v.status === 'RUNNING' ? '● Live' : v.pauseReason ? PAUSE_LABEL[v.pauseReason] : v.status === 'FINISHED' ? 'Full-time' : 'Paused'}
          </span>
        </div>
        <SpeedToggle v={v} />
        <div className="relative flex items-center gap-1.5">
          <button className="btn text-xs" onClick={() => setOpen(o => !o)} aria-expanded={open}>Auto-pause ▾</button>
          <button className="btn text-xs" onClick={toggleFocus} title="Hide everything except the score">Focus mode</button>
          {open && (
            <div className="absolute right-0 top-full z-30 mt-2 w-72 rounded-xl border border-zinc-700 bg-zinc-900 p-3 shadow-2xl">
              <AutoPauseSettings live />
              <button className="btn mt-2 w-full text-xs" onClick={() => setOpen(false)}>Done</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
