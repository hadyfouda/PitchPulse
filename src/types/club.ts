import type { Player } from './domain.ts';

export interface LedgerEntry {
  season: number;
  round: number;
  label: string;
  /** Positive = income, negative = expense (euros). */
  amount: number;
  kind: 'MATCH' | 'WAGES' | 'TRANSFER' | 'MERIT' | 'EVENT';
}

export interface ClubFinances {
  balance: number;
  /** What the board lets you spend on fees. */
  transferBudget: number;
  /** Ceiling for the weekly wage bill. */
  wageBudget: number;
  /** 0–100. Moves with results versus expectation, finances and off-pitch choices. */
  boardConfidence: number;
  /** Finishing position the board expects this season. */
  expectedPosition: number;
  ledger: LedgerEntry[];
}

export interface Academy {
  prospects: Player[];
  lastIntakeSeason: number;
}

export interface MarketState {
  freeAgents: Player[];
  season: number;
}

export type DilemmaKind =
  | 'PLAYING_TIME' | 'PRESS_TITLE' | 'DRESSING_ROOM' | 'FAN_PROTEST' | 'SPONSOR_DAY'
  | 'PAY_RISE' | 'DOUBLE_SESSIONS' | 'ACADEMY_CALLUP' | 'CAPTAIN_PRAISE' | 'MEDIA_LEAK';

export interface Dilemma {
  id: string;
  kind: DilemmaKind;
  season: number;
  round: number;
  /** Player ids / names the scenario refers to. */
  params: Record<string, string>;
}

export interface ClubNews {
  season: number;
  round: number;
  text: string;
}

export type TrainingIntensity = 'LIGHT' | 'NORMAL' | 'INTENSE';
export type TeamTrainingFocus = 'BALANCED' | 'ATTACK' | 'DEFENCE' | 'PHYSICAL' | 'MATCH_PREP';
export type IndividualFocus = 'POSITION' | 'FINISHING' | 'PLAYMAKING' | 'DEFENDING' | 'PHYSICAL' | 'GOALKEEPING';

export interface TrainingGain {
  playerId: string;
  name: string;
  attr: string;
  value: number;
}

export interface TrainingReport {
  season: number;
  round: number;
  gains: TrainingGain[];
  /** Overall rating rises this round. */
  ovrUps: Array<{ playerId: string; name: string; from: number; to: number }>;
  injuries: string[];
}

export interface TrainingState {
  intensity: TrainingIntensity;
  focus: TeamTrainingFocus;
  /** Up to MAX_INDIVIDUAL players on a personal plan. */
  individual: Record<string, IndividualFocus>;
  /** Fractional progress per player per attribute (a full point is applied as soon as it reaches 1). */
  progress: Record<string, Record<string, number>>;
  /** Training ground level 1–5. */
  facilities: number;
  /** Sum of each round's training load this season (drives how well veterans hold their level over the summer). */
  loadSum: number;
  loadRounds: number;
  lastReport: TrainingReport | null;
}
