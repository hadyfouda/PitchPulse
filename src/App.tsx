import { useEffect } from 'react';
import { useGame } from './store/gameStore.ts';
import { NewCareer } from './components/prematch/NewCareer.tsx';
import { ClubHub } from './components/hub/ClubHub.tsx';
import { Matchday } from './components/match/Matchday.tsx';
import { FullTime } from './components/match/FullTime.tsx';

export default function App() {
  const ready = useGame(s => s.ready);
  const career = useGame(s => s.career);
  const screen = useGame(s => s.screen);
  const init = useGame(s => s.init);

  useEffect(() => { void init(); }, [init]);

  if (!ready) return <div className="grid min-h-dvh place-items-center text-sm text-zinc-500">Loading your club…</div>;
  if (!career) return <NewCareer />;
  if (screen === 'match') return <Matchday />;
  if (screen === 'fulltime') return <FullTime />;
  return <ClubHub />;
}
