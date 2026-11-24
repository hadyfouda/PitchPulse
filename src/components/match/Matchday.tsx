import { useEffect, useState } from 'react';
import { useMatch } from '../../store/matchStore.ts';
import { engine } from '../../store/engineBridge.ts';
import { clockText } from '../../lib/format.ts';
import { PlayPause, Scoreboard, SpeedToggle, TopBar } from './TopBar.tsx';
import { CommentaryFeed, MomentumStrip, PauseBanner } from './LivePanels.tsx';
import { PitchRadar } from './PitchRadar.tsx';
import { MomentumChart } from '../analytics/MomentumChart.tsx';
import { SquadPanel } from './SquadPanel.tsx';
import { TouchlinePanel } from './TouchlinePanel.tsx';
import { Panel } from '../ui/controls.tsx';
import { MobileNav, NavIcons, mobileSection } from '../ui/MobileNav.tsx';

export function Matchday() {
  const v = useMatch(s => s.view);
  const focus = useMatch(s => s.focusMode);
  const toggleFocus = useMatch(s => s.toggleFocus);
  const error = useMatch(s => s.error);
  const feed = useMatch(s => s.feed);
  const [section, setSection] = useState<'LIVE' | 'SQUAD' | 'TOUCHLINE'>('LIVE');

  // Tab title doubles as a glanceable scoreboard while you work in another tab
  useEffect(() => {
    if (!v) return;
    const paused = v.status === 'PAUSED' ? '⏸ ' : '';
    document.title = `${paused}${v.home.shortName} ${v.home.score}–${v.away.score} ${v.away.shortName} · ${clockText(v)}`;
  }, [v]);
  useEffect(() => () => { document.title = 'PitchPulse'; }, []);

  // Space toggles pause/resume
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.code !== 'Space' || (e.target as HTMLElement).closest('input, select, textarea, button')) return;
      e.preventDefault();
      const cur = useMatch.getState().view;
      if (!cur || cur.status === 'FINISHED') return;
      if (cur.status === 'RUNNING') engine.pause(); else engine.resume();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!v) {
    return <div className="grid min-h-dvh place-items-center text-sm text-zinc-500">{error ? `Engine error: ${error}` : 'Warming up the match engine…'}</div>;
  }

  if (focus) {
    return (
      <div className="mx-auto max-w-xl space-y-3 px-3 py-4">
        <div className="panel p-3">
          <Scoreboard v={v} compact />
          <div className="mt-3"><MomentumStrip v={v} bars={20} /></div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <PlayPause v={v} />
            <SpeedToggle v={v} />
            <button className="btn text-xs" onClick={toggleFocus}>Expand</button>
          </div>
        </div>
        <PauseBanner v={v} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1500px] px-3 pb-24 pt-3 sm:px-4 lg:pb-3" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
      {error && <div className="panel mb-3 border-rose-600/50 bg-rose-500/10 p-2 text-sm text-rose-200">Engine error: {error}</div>}
      {section !== 'LIVE' && (
        <div className="panel sticky top-0 z-30 mb-3 flex items-center gap-3 p-2 lg:hidden">
          <div className="min-w-0 flex-1"><Scoreboard v={v} compact /></div>
          <PlayPause v={v} />
        </div>
      )}
      <div className="grid gap-3 lg:grid-cols-[minmax(270px,320px)_1fr_minmax(280px,330px)]">
        <div className={`lg:order-1 ${mobileSection(section === 'SQUAD')}`}><SquadPanel v={v} /></div>
        <div className={`min-w-0 space-y-3 lg:order-2 ${mobileSection(section === 'LIVE')}`}>
          <TopBar v={v} />
          <PauseBanner v={v} />
          <PitchRadar v={v} />
          <Panel title="Momentum">
            <MomentumChart momentum={v.momentum} events={feed} halfTimeIndex={v.halfTimeIndex} live
              homeColor={v.home.color} awayColor={v.away.color} homeName={v.home.shortName} awayName={v.away.shortName} height={96} />
          </Panel>
          <CommentaryFeed v={v} />
          <div className="flex justify-end">
            <button className="btn btn-ghost text-xs text-zinc-500"
              onClick={() => { if (confirm('Abandon this match? It will not be saved to your results.')) engine.abandon(); }}>
              Abandon match
            </button>
          </div>
        </div>
        <div className={`lg:order-3 ${mobileSection(section === 'TOUCHLINE')}`}><TouchlinePanel v={v} /></div>
      </div>
      <MobileNav value={section} onChange={setSection} items={[
        { value: 'LIVE', label: 'Live', icon: NavIcons.live },
        { value: 'SQUAD', label: 'Squad', icon: NavIcons.squad },
        { value: 'TOUCHLINE', label: 'Touchline', icon: NavIcons.touchline }
      ]} />
    </div>
  );
}
