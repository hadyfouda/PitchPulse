import Dexie, { type EntityTable } from 'dexie';
import type { Team } from '../types/domain.ts';
import type { AutoPauseTriggers, MatchState, MatchSummary, SpeedMode } from '../types/match.ts';
import type { SeasonArchive, SeasonState } from '../types/league.ts';
import type { Academy, ClubFinances, ClubNews, Dilemma, MarketState, TrainingState } from '../types/club.ts';
import type { CupsRecord } from '../types/cups.ts';

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
  /** Domestic cups (Egyptian league only). */
  cups?: CupsRecord;
  /** Which league the career plays in (older careers: the fictional one). */
  league?: 'EGY' | 'CLASSIC';
  /** Training ground (added after Phase 4; older careers get the default on load). */
  training: TrainingState;
}

export interface SettingsRecord {
  id: 'settings';
  autoPause: AutoPauseTriggers;
  notifications: boolean;
  /** Which notifications to send (Phase 4+; older records get defaults on load). */
  notifyMatch: boolean;
  notifyClub: boolean;
  /** Also notify while the app is open and in front. */
  notifyWhenOpen: boolean;
  /** Keep a live match running when the phone app is in the background (quiet audio + lock-screen scoreboard). */
  backgroundMode: boolean;
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
