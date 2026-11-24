/// <reference lib="webworker" />
/**
 * Match Engine worker. Owns real time; the MatchEngine owns match logic.
 *
 * Time is accounted with wall-clock deltas (Date.now): whatever the browser
 * does to timers (background-tab throttling, a sleeping laptop), the worker
 * catches up by running every tick it owes, and stops mid-batch the moment
 * an auto-pause trigger fires.
 */
import type { MatchEvent, PauseReason } from '../types/match.ts';
import type { UICommand, WorkerCommand, WorkerMessage } from '../types/protocol.ts';
import { MatchEngine } from './MatchEngine.ts';
import { MS_PER_MATCH_MINUTE, TICKS_PER_MINUTE } from './constants.ts';

const ctx = self as unknown as DedicatedWorkerGlobalScope;
const LOOP_MS = 50;
const HEARTBEAT_MS = 250;
const MAX_CATCHUP_TICKS = 2000;

let engine: MatchEngine | null = null;
let acc = 0;
let last = Date.now();
let lastHeartbeat = 0;
let lastSnapshotTick = 0;

const post = (msg: WorkerMessage): void => ctx.postMessage(msg);

function sendView(progress = 0): void {
  if (engine) post({ channel: 'ENGINE_TICK', payload: engine.getView(progress) });
}

function sendSnapshot(): void {
  if (!engine) return;
  lastSnapshotTick = engine.state.tick;
  post({ channel: 'SNAPSHOT', payload: engine.getSnapshot() });
}

function sendEvents(events: MatchEvent[]): void {
  if (events.length) post({ channel: 'MATCH_EVENT', payload: events });
}

function loop(): void {
  const now = Date.now();
  const dt = now - last;
  last = now;
  if (!engine) return;
  if (engine.state.status !== 'RUNNING') { acc = 0; return; }

  acc += dt;
  const msPerTick = MS_PER_MATCH_MINUTE[engine.state.speed] / TICKS_PER_MINUTE;
  const events: MatchEvent[] = [];
  let steps = 0;
  let pause: { reason: PauseReason; message: string } | null = null;
  let ended = false;

  while (acc >= msPerTick && engine.state.status === 'RUNNING' && steps < MAX_CATCHUP_TICKS) {
    const r = engine.step();
    acc -= msPerTick;
    steps++;
    events.push(...r.events);
    if (r.pause) { pause = r.pause; acc = 0; break; }
    if (r.ended) { ended = true; acc = 0; break; }
  }

  sendEvents(events);
  if (pause) post({ channel: 'AUTO_PAUSE', payload: pause });
  if (steps > 0 || now - lastHeartbeat >= HEARTBEAT_MS) {
    lastHeartbeat = now;
    sendView(engine.state.status === 'RUNNING' ? acc / msPerTick : 0);
  }
  if (ended) {
    post({ channel: 'MATCH_END', payload: engine.getSummary() });
    sendSnapshot();
  } else if (pause || engine.state.tick - lastSnapshotTick >= TICKS_PER_MINUTE) {
    sendSnapshot();
  }
}

function handle(cmd: UICommand): void {
  switch (cmd.type) {
    case 'INIT':
      engine = MatchEngine.fromSetup(cmd.setup);
      acc = 0; lastSnapshotTick = 0;
      sendView(); sendSnapshot();
      return;
    case 'RESTORE':
      engine = MatchEngine.fromSnapshot(cmd.snapshot);
      acc = 0; lastSnapshotTick = engine.state.tick;
      sendView();
      return;
    case 'DISPOSE':
      engine = null;
      return;
  }
  if (!engine) return;
  switch (cmd.type) {
    case 'START': sendEvents(engine.start()); last = Date.now(); break;
    case 'PAUSE': engine.pause(); sendSnapshot(); break;
    case 'RESUME': sendEvents(engine.resume()); last = Date.now(); break;
    case 'SET_SPEED': engine.setSpeed(cmd.speed); acc = 0; break;
    case 'QUEUE_ACTION': engine.queueAction(cmd.action); break;
    case 'CANCEL_ACTION': engine.cancelAction(cmd.id); break;
    case 'SHOUT': sendEvents(engine.shout(engine.state.userSide, cmd.shout)); break;
    case 'SET_AUTOPAUSE': engine.setAutoPause(cmd.triggers); break;
    case 'REQUEST_SNAPSHOT': sendSnapshot(); return;
  }
  sendView();
}

ctx.onmessage = (e: MessageEvent<WorkerCommand>) => {
  try {
    if (e.data?.channel === 'UI_COMMAND') handle(e.data.command);
  } catch (err) {
    post({ channel: 'ENGINE_ERROR', payload: { message: err instanceof Error ? err.message : String(err) } });
  }
};

setInterval(() => {
  try { loop(); } catch (err) {
    engine?.pause();
    post({ channel: 'ENGINE_ERROR', payload: { message: err instanceof Error ? err.message : String(err) } });
  }
}, LOOP_MS);
