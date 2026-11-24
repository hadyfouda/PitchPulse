/**
 * The only place that talks to the worker. Routes typed worker messages into
 * the Zustand stores and IndexedDB; exposes typed command helpers to the UI.
 */
import type { AutoPauseTriggers, MatchSetup, MatchState, QueuedActionBody, SpeedMode } from '../types/match.ts';
import type { UICommand, WorkerMessage } from '../types/protocol.ts';
import type { ShoutType } from '../types/tactics.ts';
import { db } from '../db/db.ts';
import { notify, playChime } from '../lib/alerts.ts';
import { backgroundMode } from '../lib/background.ts';
import { PAUSE_LABEL } from '../lib/labels.ts';
import { useGame } from './gameStore.ts';
import { useMatch } from './matchStore.ts';

let worker: Worker | null = null;

function ensureWorker(): Worker {
  if (worker) return worker;
  worker = new Worker(new URL('../engine/matchEngine.worker.ts', import.meta.url), { type: 'module' });
  worker.onmessage = (e: MessageEvent<WorkerMessage>) => handle(e.data);
  worker.onerror = e => useMatch.getState().setError(e.message || 'Match engine crashed');
  return worker;
}

function send(command: UICommand): void {
  ensureWorker().postMessage({ channel: 'UI_COMMAND', command });
}

function handle(msg: WorkerMessage): void {
  const m = useMatch.getState();
  switch (msg.channel) {
    case 'ENGINE_TICK':
      m.setView(msg.payload);
      backgroundMode.update(msg.payload);
      if (msg.payload.status === 'RUNNING' && m.alert) m.setAlert(null);
      return;
    case 'MATCH_EVENT':
      m.pushEvents(msg.payload);
      return;
    case 'AUTO_PAUSE': {
      m.setAlert(msg.payload);
      const settings = useGame.getState().settings;
      if (settings.sound) playChime();
      // Goal and half-time messages carry the score already; the others get the (current) score appended
      const v = m.view;
      const withScore = v && msg.payload.reason !== 'GOAL' && msg.payload.reason !== 'HALF_TIME'
        ? `${msg.payload.message} · ${v.home.shortName} ${v.home.score}–${v.away.score} ${v.away.shortName}` : msg.payload.message;
      notify(settings, 'match', `⏸ Paused · ${PAUSE_LABEL[msg.payload.reason]}`, withScore, 'pause');
      return;
    }
    case 'SNAPSHOT':
      // Ignore late snapshots that arrive after the user abandoned the match
      if (msg.payload.status !== 'FINISHED' && useGame.getState().screen === 'match') void db.live.put({ id: 'live', savedAt: Date.now(), snapshot: msg.payload });
      return;
    case 'MATCH_END': {
      m.setSummary(msg.payload);
      m.setAlert(null);
      const g = useGame.getState();
      void g.recordResult(msg.payload);
      if (g.settings.sound) playChime();
      backgroundMode.stop();
      notify(g.settings, 'match', `Full-time · ${msg.payload.home.shortName} ${msg.payload.home.score}–${msg.payload.away.score} ${msg.payload.away.shortName}`, 'The match is over — open PitchPulse for the analysis.', 'pause');
      g.setScreen('fulltime');
      return;
    }
    case 'ENGINE_ERROR':
      m.setError(msg.payload.message);
      return;
  }
}

function startBackground(): void {
  if (!useGame.getState().settings.backgroundMode) return;
  backgroundMode.start({ play: () => engine.resume(), pause: () => engine.pause() });
}

export const engine = {
  startMatch(setup: MatchSetup): void {
    useMatch.getState().reset();
    send({ type: 'INIT', setup });
    send({ type: 'START' });
    startBackground();
    useGame.getState().setScreen('match');
  },
  restore(snapshot: MatchState): void {
    useMatch.getState().reset(snapshot.events);
    send({ type: 'RESTORE', snapshot });
    startBackground();
    useGame.getState().setScreen('match');
  },
  pause: (): void => send({ type: 'PAUSE' }),
  resume: (): void => { useMatch.getState().setAlert(null); send({ type: 'RESUME' }); },
  setSpeed: (speed: SpeedMode): void => send({ type: 'SET_SPEED', speed }),
  queue: (action: QueuedActionBody): void => send({ type: 'QUEUE_ACTION', action }),
  cancel: (id: number): void => send({ type: 'CANCEL_ACTION', id }),
  shout: (shout: ShoutType): void => send({ type: 'SHOUT', shout }),
  setAutoPause: (triggers: AutoPauseTriggers): void => send({ type: 'SET_AUTOPAUSE', triggers }),
  abandon: (): void => {
    backgroundMode.stop();
    send({ type: 'DISPOSE' });
    useMatch.getState().reset();
    void useGame.getState().clearResumable();
    useGame.getState().setScreen('home');
  }
};
