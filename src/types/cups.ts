export type CupId = 'SUPER' | 'EGYPT_CUP' | 'LEAGUE_CUP';

export interface CupTieResult {
  home: number;
  away: number;
  et: boolean;
  pens: { home: number; away: number } | null;
  /** null for a drawn group match. */
  winnerId: string | null;
  matchId: string;
  simulated?: boolean;
}

export interface CupTie {
  id: string;
  cup: CupId;
  stageKey: string;
  /** Position in the season calendar: k + fraction = played after league round k. */
  slot: number;
  homeId: string;
  awayId: string;
  neutral: boolean;
  /** false for group matches (draws allowed). */
  knockout: boolean;
  group?: string;
  result: CupTieResult | null;
}

export interface CupStage {
  key: string;
  label: string;
  slot: number;
  kind: 'GROUP' | 'KO';
  /** Group matchday number (GROUP stages only). */
  matchday?: number;
  neutral?: boolean;
}

export interface CupState {
  id: CupId;
  name: string;
  season: number;
  stages: CupStage[];
  ties: CupTie[];
  /** League Cup groups: group letter → team ids. */
  groups?: Record<string, string[]>;
  /** Prize money already paid out to the user for this cup. */
  scorers: Record<string, { name: string; teamId: string; goals: number }>;
  winnerId: string | null;
  runnerUpId: string | null;
}

export interface CupsRecord {
  season: number;
  cups: CupState[];
  /** Lower-division clubs that only take part in the Egypt Cup (generated squads). */
  guests: import('./domain.ts').Team[];
  /** Honours won by the user's club, most recent first. */
  honours: Array<{ season: number; cup: CupId | 'LEAGUE'; name: string }>;
  /** Winners by season (all clubs), for the history screen. */
  winners: Array<{ season: number; cup: CupId; winnerId: string; winnerName: string; runnerUpName: string }>;
}
