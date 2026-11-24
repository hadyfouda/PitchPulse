import Dexie, { type EntityTable } from 'dexie';
import type { Team } from '../types/domain.ts';
import type { AutoPauseTriggers, MatchState, MatchSummary, SpeedMode } from '../types/match.ts';
import type { SeasonArchive, SeasonState } from '../types/league.ts';
import type { Academy, ClubFinances, ClubNews, Dilemma, MarketState } from '../types/club.ts';

export interface CareerRecord {
  id: 'career';
  seed: number;
  createdAt: number;
  user: Team;
  opponents: Team[];
  season: SeasonState;
  /** League fixture the live match belongs to (null for none). */
  pendingFixtureId: string | null;
  finances: ClubFinances;
  academy: Academy;
  market: MarketState;
  /** Unanswered off-pitch dilemma, if any. */
  dilemma: Dilemma | null;
  /** Club news feed: transfers, academy, dilemma outcomes, summer changes. */
  news: ClubNews[];
}

export interface SettingsRecord {
  id: 'settings';
  autoPause: AutoPauseTriggers;
  notifications: boolean;
  sound: boolean;
  defaultSpeed: SpeedMode;
  /** Radar view: every phase of play, or only key moments. */
  pitchMode: 'FULL' | 'HIGHLIGHTS';
  pitchLabels: 'NUMBER' | 'ROLE';
  pitchCollapsed: boolean;
}

/** The in-progress match, saved every match minute so a closed tab can resume. */
export interface LiveRecord {
  id: 'live';
  savedAt: number;
  snapshot: MatchState;
}

export const db = new Dexie('pitchpulse') as Dexie & {
  career: EntityTable<CareerRecord, 'id'>;
  settings: EntityTable<SettingsRecord, 'id'>;
  live: EntityTable<LiveRecord, 'id'>;
  matches: EntityTable<MatchSummary, 'id'>;
  seasons: EntityTable<SeasonArchive, 'id'>;
};

db.version(1).stores({
  career: 'id',
  settings: 'id',
  live: 'id',
  matches: 'id, playedAt'
});

// v2 (Phase 3): season archive. Career records are migrated lazily on load (see league/migrate.ts).
db.version(2).stores({
  seasons: 'id'
});
