import type {
  AutoPauseTriggers, EngineTick, MatchEvent, MatchSetup, MatchState, MatchSummary,
  PauseReason, QueuedActionBody, SpeedMode
} from './match.ts';
import type { ShoutType } from './tactics.ts';

/** Commands the UI sends into the worker. */
export type UICommand =
  | { type: 'INIT'; setup: MatchSetup }
  | { type: 'RESTORE'; snapshot: MatchState }
  | { type: 'START' }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'SET_SPEED'; speed: SpeedMode }
  | { type: 'QUEUE_ACTION'; action: QueuedActionBody }
  | { type: 'CANCEL_ACTION'; id: number }
  | { type: 'SHOUT'; shout: ShoutType }
  | { type: 'SET_AUTOPAUSE'; triggers: AutoPauseTriggers }
  | { type: 'REQUEST_SNAPSHOT' }
  | { type: 'DISPOSE' };

export interface WorkerCommand {
  channel: 'UI_COMMAND';
  command: UICommand;
}

/** Messages the worker posts back to the UI. */
export type WorkerMessage =
  | { channel: 'ENGINE_TICK'; payload: EngineTick }
  | { channel: 'MATCH_EVENT'; payload: MatchEvent[] }
  | { channel: 'AUTO_PAUSE'; payload: { reason: PauseReason; message: string } }
  | { channel: 'SNAPSHOT'; payload: MatchState }
  | { channel: 'MATCH_END'; payload: MatchSummary }
  | { channel: 'ENGINE_ERROR'; payload: { message: string } };
