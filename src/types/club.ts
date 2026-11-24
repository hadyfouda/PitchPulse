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
