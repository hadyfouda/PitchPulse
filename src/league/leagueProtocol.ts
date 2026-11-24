import type { Team } from '../types/domain.ts';
import type { MatchSummary } from '../types/match.ts';

export interface LeagueSimJob {
  fixtureId: string;
  matchId: string;
  seed: number;
  home: Team;
  away: Team;
  knockout?: boolean;
  aggregate?: { home: number; away: number };
  competition?: string;
}

export interface LeagueSimRequest {
  id: number;
  jobs: LeagueSimJob[];
}

export interface LeagueSimResponse {
  id: number;
  results: Array<{ fixtureId: string; summary: MatchSummary }>;
  error?: string;
}
