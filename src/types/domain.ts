import type { RoleId, SlotKind, Tactics, TacticalIdentity } from './tactics.ts';

export type Position = 'GK' | 'DEF' | 'MID' | 'FWD';

/** All attributes are on a 1–100 scale. */
export interface PlayerAttributes {
  pace: number;
  passing: number;
  vision: number;
  technique: number;
  finishing: number;
  longShots: number;
  tackling: number;
  positioning: number;
  workRate: number;
  stamina: number;
  strength: number;
  composure: number;
  reflexes: number;
  handling: number;
}

export interface Player {
  id: string;
  name: string;
  shirt: number;
  age: number;
  position: Position;
  /** Roles the player is comfortable in, best first. */
  naturalRoles: RoleId[];
  attrs: PlayerAttributes;
  /** 0–100. Between-match condition: drops with minutes played, recovers between rounds. Starting stamina in a match. */
  fitness: number;
  /** 0–100. Match rhythm: rises with minutes, decays on the bench. Small effect on performance. */
  sharpness: number;
  /** 0–100. */
  morale: number;
  injury: Injury | null;
  /** League matches still to serve. */
  suspension: number;
  /** Yellow cards this season (5 → 1-match ban, 10 → 2-match ban). */
  seasonYellows: number;
  /** Weekly wage in euros. */
  wage: number;
  /** Overall rating ceiling (1–100). */
  potential: number;
  /** ISO-3 country code for real players (generated players leave it out). */
  nationality?: string;
}

export interface Injury {
  severity: 'MINOR' | 'MAJOR';
  label: string;
  /** League matches still to miss. */
  matchesOut: number;
}

export const isAvailable = (p: Pick<Player, 'injury' | 'suspension'>): boolean => !p.injury && p.suspension <= 0;

export interface LineupSlot {
  /** Index into the formation's slot list (0 = GK). */
  slot: number;
  kind: SlotKind;
  playerId: string | null;
  role: RoleId;
}

export interface Lineup {
  slots: LineupSlot[];
  /** Up to 9 substitutes, in bench order. */
  bench: string[];
}

export interface Team {
  id: string;
  name: string;
  shortName: string;
  colors: { primary: string; secondary: string };
  identity: TacticalIdentity;
  /** 0–100 overall level used when generating the squad. */
  level: number;
  players: Player[];
  tactics: Tactics;
  lineup: Lineup;
  isUser: boolean;
}
