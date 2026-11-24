import { useMemo } from 'react';
import type { EngineTick } from '../../types/match.ts';
import { useMatch } from '../../store/matchStore.ts';
import { describe, TONE_CLASS } from '../../lib/commentary.ts';
import { minuteText } from '../../lib/format.ts';
import { engine } from '../../store/engineBridge.ts';
import { PAUSE_LABEL } from '../../lib/labels.ts';
import { Panel, Segmented } from '../ui/controls.tsx';

/** Ball location on a 3×3 zone grid, drawn with home attacking left → right. */
export function ZoneTracker({ v }: { v: EngineTick }) {
  const home = v.possession === 'home';
  const col = home ? v.ball.third : 2 - v.ball.third;
  const row = home ? v.ball.lane : 2 - v.ball.lane;
  const team = home ? v.home : v.away;
  return (
    <div>
      <div className="grid aspect-[2.2/1] grid-cols-3 grid-rows-3 gap-[3px] overflow-hidden rounded-lg border border-emerald-900/60 bg-emerald-950/30 p-[3px]">
        {Array.from({ length: 9 }, (_, i) => {
          const r = Math.floor(i / 3), c = i % 3;
          const active = r === row && c === col && v.period !== 'HT' && v.period !== 'FT';
          return (
            <div key={i} className={`rounded-[4px] transition-all duration-500 ${active ? 'shadow-[0_0_18px_-2px]' : 'bg-emerald-900/15'}`}
              style={active ? { background: `${team.color}55`, boxShadow: `0 0 16px -2px ${team.color}`, outline: `1px solid ${team.color}` } : undefined} />
          );
        })}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-zinc-500">
        <span>◀ {v.home.shortName} goal</span>
        <span style={{ color: team.color }}>{team.shortName} ball</span>
        <span>{v.away.shortName} goal ▶</span>
      </div>
    </div>
  );
}

export function MomentumStrip({ v, bars = 24 }: { v: EngineTick; bars?: number }) {
  const data = v.momentum.slice(-bars);
  const max = Math.max(4, ...data.map(Math.abs));
  // Fixed slot count so one early minute doesn't stretch across the whole strip
  const slots: Array<number | null> = [...Array<null>(Math.max(0, bars - data.length)).fill(null), ...data];
  return (
    <div>
      <div className="relative flex h-12 items-center gap-[2px]" aria-label="Momentum, last minutes">
        <div className="absolute inset-x-0 top-1/2 h-px bg-zinc-800" />
        {slots.map((m, i) => (
          <div key={i} className="relative flex h-full flex-1 flex-col justify-center">
            {m !== null && (
              <div className="mx-auto w-full rounded-sm transition-all" style={{
                height: `${Math.max(4, (Math.abs(m) / max) * 50)}%`,
                background: m >= 0 ? v.home.color : v.away.color,
                transform: m >= 0 ? 'translateY(-50%)' : 'translateY(50%)',
                opacity: 0.4 + 0.6 * ((i + 1) / slots.length)
              }} />
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-zinc-500"><span>{v.home.shortName} ▲</span><span>{data.length ? `last ${data.length}'` : 'momentum'}</span><span>▼ {v.away.shortName}</span></div>
    </div>
  );
}

export function CommentaryFeed({ v }: { v: EngineTick }) {
  const feed = useMatch(s => s.feed);
  const filter = useMatch(s => s.feedFilter);
  const setFilter = useMatch(s => s.setFeedFilter);
  const names = { home: v.home.shortName, away: v.away.shortName };
  const lines = useMemo(
    () => feed.filter(e => filter === 'ALL' || e.key).slice(-120).reverse(),
    [feed, filter]
  );
  return (
    <Panel title="Commentary" className="flex min-h-0 flex-col"
      right={<div className="w-36"><Segmented size="sm" value={filter} onChange={setFilter} options={[{ value: 'ALL', label: 'All' }, { value: 'KEY', label: 'Key' }]} /></div>}>
      <ol className="max-h-[42vh] min-h-[12rem] space-y-1 overflow-y-auto pr-1 lg:max-h-[46vh]">
        {lines.map(e => {
          const line = describe(e, names);
          const sideColor = e.side ? (e.side === 'home' ? v.home.color : v.away.color) : 'transparent';
          return (
            <li key={e.id} className="flex gap-2 rounded-md px-1.5 py-1 text-[13px] leading-snug hover:bg-zinc-800/40">
              <span className="tabular w-11 flex-none pt-px text-right font-mono text-[11px] text-zinc-500">{minuteText(e.minute, e.added)}</span>
              <span className="mt-1.5 h-2 w-0.5 flex-none rounded" style={{ background: sideColor }} />
              <span className={TONE_CLASS[line.tone]}>{line.text}</span>
            </li>
          );
        })}
      </ol>
    </Panel>
  );
}

export function PauseBanner({ v }: { v: EngineTick }) {
  const alert = useMatch(s => s.alert);
  if (v.status !== 'PAUSED' || !alert) return null;
  return (
    <div className="panel flex flex-wrap items-center justify-between gap-3 border-amber-500/50 bg-amber-500/10 p-3" role="status">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-400">Auto-paused · {PAUSE_LABEL[alert.reason]}</div>
        <div className="text-sm text-amber-50">{alert.message}</div>
        <div className="text-[11px] text-amber-200/70">Make your changes — tactics apply on the next tick, substitutions at the next stoppage.</div>
      </div>
      <button className="btn btn-primary" onClick={engine.resume}>{v.period === 'HT' ? 'Start 2nd half' : 'Resume'}</button>
    </div>
  );
}
