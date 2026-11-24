import type { PlayerAttributes, Position, Team } from './domain.ts';
import type { RoleId, ShoutType, SlotKind, Tactics, TacticalIdentity } from './tactics.ts';

export type Side = 'home' | 'away';
/** 0 = own defensive third, 1 = middle third, 2 = final third (always from the attacking team's view). */
export type Third = 0 | 1 | 2;
/** 0 = left, 1 = centre, 2 = right (from the attacking team's view). */
export type Lane = 0 | 1 | 2;

export type SpeedMode = 'BG30' | 'BG15' | 'X1' | 'X2' | 'X8';
export type MatchPeriod = 'PRE' | 'FIRST' | 'HT' | 'SECOND' | 'FT';
export type MatchStatus = 'IDLE' | 'RUNNING' | 'PAUSED' | 'FINISHED';

export type PlayerStatus = 'PITCH' | 'BENCH' | 'SUBBED_OFF' | 'SENT_OFF' | 'INJURED_OFF';

export interface PlayerMatchStats {
  ticks: number;
  passes: number;
  passesCompleted: number;
  keyPasses: number;
  shots: number;
  shotsOnTarget: number;
  goals: number;
  assists: number;
  xg: number;
  tackles: number;
  interceptions: number;
  dribbles: number;
  fouls: number;
  saves: number;
  conceded: number;
  mistakes: number;
}

export interface LivePlayer {
  id: string;
  name: string;
  shirt: number;
  position: Position;
  naturalRoles: RoleId[];
  attrs: PlayerAttributes;
  role: RoleId;
  /** Formation slot currently occupied, or -1 when not on the pitch. */
  slot: number;
  /** Slot the player last occupied (used to replace injured players). */
  lastSlot: number;
  status: PlayerStatus;
  stamina: number;
  /** 0–100 match rhythm carried in from the league. */
  sharpness: number;
  yellow: number;
  injured: boolean;
  staminaWarned: boolean;
  morale: number;
  rating: number;
  stats: PlayerMatchStats;
  /** Running sum of the player's shape position (own frame) for the average-positions map. */
  posSum: { x: number; y: number; n: number };
}

export interface TeamStats {
  possessionTicks: number;
  shots: number;
  shotsOnTarget: number;
  xg: number;
  bigChances: number;
  passes: number;
  passesCompleted: number;
  tackles: number;
  fouls: number;
  corners: number;
  offsides: number;
  yellow: number;
  red: number;
}

export interface ShoutState {
  active: ShoutType | null;
  /** Match tick at which the active shout wears off. */
  activeUntil: number;
  /** Match tick at which shouts become available again. */
  cooldownUntil: number;
}

export interface TeamMatchState {
  side: Side;
  teamId: string;
  name: string;
  shortName: string;
  color: string;
  identity: TacticalIdentity;
  isUser: boolean;
  tactics: Tactics;
  players: LivePlayer[];
  subsUsed: number;
  score: number;
  morale: number;
  stats: TeamStats;
  shout: ShoutState;
}

export type MatchEventType =
  | 'KICK_OFF' | 'GOAL' | 'SHOT_SAVED' | 'SHOT_OFF' | 'SHOT_BLOCKED' | 'BIG_CHANCE'
  | 'CORNER' | 'FOUL' | 'PENALTY' | 'OFFSIDE' | 'YELLOW' | 'RED' | 'INJURY'
  | 'SUB' | 'TACTIC_CHANGE' | 'ROLE_CHANGE' | 'SHOUT' | 'SHOUT_END' | 'AI_ADAPT'
  | 'STAMINA_LOW' | 'ADDED_TIME' | 'HALF_TIME' | 'SECOND_HALF' | 'FULL_TIME'
  | 'ATTACK' | 'COUNTER' | 'TURNOVER' | 'LONG_BALL';

export interface MatchEvent {
  id: number;
  tick: number;
  /** Display minute, e.g. 45 with added = 2 renders as 45+2'. */
  minute: number;
  added: number;
  type: MatchEventType;
  side?: Side;
  playerId?: string;
  playerName?: string;
  otherName?: string;
  xg?: number;
  /** Free-form structured details for the commentary formatter. */
  meta?: Record<string, string | number>;
  key: boolean;
}

export type ShotType = 'OPEN_PLAY' | 'THROUGH' | 'HEADER' | 'CUTBACK' | 'LONG_SHOT' | 'COUNTER' | 'FREE_KICK' | 'CORNER' | 'PENALTY';
export type ShotOutcome = 'GOAL' | 'SAVED' | 'OFF' | 'BLOCKED';

export interface ShotRecord {
  id: number;
  tick: number;
  minute: number;
  side: Side;
  playerId: string;
  playerName: string;
  type: ShotType;
  /** Metres from the goal line and lateral metres from the centre (− = left). */
  dist: number;
  lat: number;
  xg: number;
  outcome: ShotOutcome;
}

export interface AutoPauseTriggers {
  goal: boolean;
  redCard: boolean;
  injury: boolean;
  staminaBelow60: boolean;
  halfTime: boolean;
  subWindow65: boolean;
}

export type PauseReason = 'USER' | 'GOAL' | 'RED_CARD' | 'INJURY' | 'STAMINA' | 'HALF_TIME' | 'SUB_WINDOW';

export type QueuedActionBody =
  | { kind: 'TACTICS'; patch: Partial<Tactics>; note?: string }
  | { kind: 'SUB'; outId: string; inId: string }
  | { kind: 'ROLE'; playerId: string; role: RoleId };

export type QueuedAction = QueuedActionBody & {
  id: number;
  side: Side;
  queuedAtTick: number;
};

export interface MatchSetup {
  matchId: string;
  seed: number;
  home: Team;
  away: Team;
  userSide: Side;
  speed: SpeedMode;
  autoPause: AutoPauseTriggers;
}

/** The complete, serialisable engine state. Snapshots are exactly this object. */
export interface MatchState {
  version: 1;
  matchId: string;
  seed: number;
  rngState: number;
  userSide: Side;
  tick: number;
  /** Ticks elapsed in the current half (10 match seconds each). */
  halfTick: number;
  period: MatchPeriod;
  added: { first: number; second: number };
  status: MatchStatus;
  pauseReason: PauseReason | null;
  speed: SpeedMode;
  home: TeamMatchState;
  away: TeamMatchState;
  possession: Side;
  ball: { third: Third; lane: Lane };
  carrierId: string | null;
  /** Ticks of counter-attack bonus remaining for the side in possession. */
  counterTicks: number;
  /** Set piece awarded to the side in possession, resolved on the next tick. */
  setPiece: 'CORNER' | 'FREE_KICK' | 'PENALTY' | null;
  stoppage: boolean;
  ticksSinceStoppage: number;
  events: MatchEvent[];
  nextEventId: number;
  shots: ShotRecord[];
  /** Per display-minute dominance: positive = home, negative = away. */
  momentum: number[];
  queue: QueuedAction[];
  nextActionId: number;
  autoPause: AutoPauseTriggers;
  subWindowFired: boolean;
  lastNarrationTick: number;
  startedAt: number;
}

export interface PlayerView {
  id: string;
  name: string;
  shirt: number;
  position: Position;
  role: RoleId;
  slotKind: SlotKind | null;
  slot: number;
  status: PlayerStatus;
  stamina: number;
  yellow: number;
  injured: boolean;
  rating: number;
  goals: number;
  assists: number;
}

export interface TeamView {
  side: Side;
  name: string;
  shortName: string;
  color: string;
  identity: TacticalIdentity;
  isUser: boolean;
  tactics: Tactics;
  score: number;
  subsUsed: number;
  stats: TeamStats;
  shout: ShoutState;
  players: PlayerView[];
}

/** A dot on the radar in absolute pitch coordinates: x 0 = home goal line → 1 = away goal line; y 0 = top touchline → 1 = bottom. */
export interface PitchDot {
  id: string;
  x: number;
  y: number;
}

export interface PitchPositions {
  home: PitchDot[];
  away: PitchDot[];
  ball: { x: number; y: number };
  carrierId: string | null;
}

/** Lightweight projection sent to the UI on every tick / heartbeat. */
export interface EngineTick {
  matchId: string;
  status: MatchStatus;
  period: MatchPeriod;
  pauseReason: PauseReason | null;
  speed: SpeedMode;
  tick: number;
  /** Seconds on the match clock (e.g. 2712 = 45:12), including the sub-tick fraction. */
  clockSeconds: number;
  minute: number;
  added: number;
  addedAnnounced: number;
  possession: Side;
  ball: { third: Third; lane: Lane };
  home: TeamView;
  away: TeamView;
  queue: QueuedAction[];
  momentum: number[];
  userSide: Side;
  positions: PitchPositions;
  lastShot: ShotRecord | null;
  /** Momentum index where the second half starts (null during the first half). */
  halfTimeIndex: number | null;
  setPiece: MatchState['setPiece'];
}

export interface PlayerSummary extends PlayerView {
  stats: PlayerMatchStats;
  /** Average shape position in the team's own frame (x: left→right, y: own goal→opponent goal). */
  avg: { x: number; y: number } | null;
}

export interface MatchSummary {
  id: string;
  playedAt: number;
  userSide: Side;
  home: SummaryTeam;
  away: SummaryTeam;
  events: MatchEvent[];
  shots: ShotRecord[];
  momentum: number[];
  halfTimeIndex?: number;
}

export interface SummaryTeam {
  name: string;
  shortName: string;
  color: string;
  score: number;
  stats: TeamStats;
  /** Phase 1 archives hold plain PlayerView entries without stats/avg. */
  players: Array<PlayerView | PlayerSummary>;
  identity: TacticalIdentity;
  formation?: string;
}
