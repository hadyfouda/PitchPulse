export interface FixtureResult {
  home: number;
  away: number;
  matchId: string;
  /** True when the user's own match was simulated instead of watched. */
  simulated?: boolean;
}

export interface Fixture {
  id: string;
  round: number;
  homeId: string;
  awayId: string;
  result: FixtureResult | null;
}

export interface SeasonPlayerStats {
  playerId: string;
  teamId: string;
  name: string;
  apps: number;
  minutes: number;
  goals: number;
  assists: number;
  ratingSum: number;
  yellows: number;
  reds: number;
  motm: number;
}

export interface RoundReport {
  round: number;
  results: Array<{ fixtureId: string; homeId: string; awayId: string; home: number; away: number }>;
  /** Squad news for the user's club (injuries, bans, returns). */
  news: string[];
  positionBefore: number;
  positionAfter: number;
}

export interface SeasonState {
  number: number;
  fixtures: Fixture[];
  /** Next round to be played (1-based). Greater than the last round once the season is over. */
  round: number;
  rounds: number;
  playerStats: Record<string, SeasonPlayerStats>;
  lastReport: RoundReport | null;
  finished: boolean;
}

export interface TableRow {
  teamId: string;
  name: string;
  shortName: string;
  color: string;
  p: number;
  w: number;
  d: number;
  l: number;
  gf: number;
  ga: number;
  gd: number;
  pts: number;
  /** Most recent last. */
  form: Array<'W' | 'D' | 'L'>;
}

export interface SeasonArchive {
  id: number;
  finishedAt: number;
  table: TableRow[];
  championId: string;
  championName: string;
  userTeamId: string;
  userPosition: number;
  topScorer: { name: string; team: string; goals: number } | null;
  topAssister: { name: string; team: string; assists: number } | null;
  bestRated: { name: string; team: string; rating: number } | null;
}
