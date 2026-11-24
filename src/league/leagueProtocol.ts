import type { Team } from '../types/domain.ts';
import type { MatchSummary } from '../types/match.ts';

export interface LeagueSimJob {
  fixtureId: string;
  matchId: string;
  seed: number;
  home: Team;
  away: Team;
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
