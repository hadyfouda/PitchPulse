import type { Position } from '../types/domain.ts';
import type { RoleId, SlotKind } from '../types/tactics.ts';

/**
 * How a role changes positioning and zone contributions.
 * inside: 0..1 pulls the player toward the centre lane (negative = wider).
 * pushIn / pushOut: vertical shift in / out of possession.
 */
export interface RoleInfo {
  label: string;
  short: string;
  desc: string;
  inside: number;
  pushIn: number;
  pushOut: number;
  sigmaY: number;
  stamina: number;
  /** Contribution multipliers. */
  buildUp: number;
  creation: number;
  finishing: number;
  aerial: number;
  defense: number;
  press: number;
}

const base: Omit<RoleInfo, 'label' | 'short' | 'desc'> = {
  inside: 0, pushIn: 0.04, pushOut: 0, sigmaY: 0.16, stamina: 1,
  buildUp: 1, creation: 1, finishing: 1, aerial: 1, defense: 1, press: 1
};
const r = (label: string, short: string, desc: string, o: Partial<RoleInfo>): RoleInfo => ({ ...base, label, short, desc, ...o });

export const ROLE_INFO: Record<RoleId, RoleInfo> = {
  GK: r('Goalkeeper', 'GK', 'Stays on the line, safe distribution.', { pushIn: 0, stamina: 0.2, buildUp: 0.7, defense: 1 }),
  SK: r('Sweeper Keeper', 'SK', 'Joins build-up and sweeps behind a high line.', { pushIn: 0.04, stamina: 0.25, buildUp: 1.15 }),
  CB: r('Centre-Back', 'CB', 'Defends the box, keeps it simple.', { pushIn: 0.03, stamina: 0.85, defense: 1.12, buildUp: 0.85, aerial: 1.15 }),
  BPD: r('Ball-Playing Defender', 'BPD', 'Breaks lines with passes from the back; better long balls.', { pushIn: 0.04, stamina: 0.85, defense: 1.02, buildUp: 1.25 }),
  FB: r('Full-Back', 'FB', 'Balanced overlap and defensive cover.', { pushIn: 0.1, stamina: 1.05, defense: 1, creation: 1 }),
  WB: r('Wing-Back', 'WB', 'Bombs on high and wide; supplies crosses but leaves space behind.', { inside: -0.06, pushIn: 0.26, stamina: 1.22, defense: 0.88, creation: 1.18 }),
  IFB: r('Inverted Full-Back', 'IFB', 'Steps into midfield in possession to add a passer centrally.', { inside: 0.55, pushIn: 0.14, stamina: 1.05, buildUp: 1.12, defense: 0.96 }),
  DM: r('Defensive Midfielder', 'DM', 'Screens the back line and wins the ball.', { pushIn: 0.02, defense: 1.18, buildUp: 1.0 }),
  DLP: r('Deep-Lying Playmaker', 'DLP', 'Dictates tempo from deep; drives progression through midfield.', { pushIn: 0, buildUp: 1.22, creation: 1.08, defense: 0.92 }),
  B2B: r('Box-to-Box', 'B2B', 'Covers both boxes; arrives late in attack. Heavy stamina cost.', { pushIn: 0.16, pushOut: -0.04, sigmaY: 0.23, stamina: 1.28, defense: 1.02, finishing: 1.05 }),
  CM: r('Central Midfielder', 'CM', 'Balanced link player.', {}),
  AP: r('Advanced Playmaker', 'AP', 'Finds pockets between the lines; creates through balls.', { pushIn: 0.1, creation: 1.22, buildUp: 1.05, defense: 0.7 }),
  WM: r('Wide Midfielder', 'WM', 'Holds the flank and tracks back.', { pushIn: 0.06, defense: 0.95, creation: 1.02, stamina: 1.05 }),
  W: r('Winger', 'W', 'Hugs the touchline and delivers crosses.', { inside: -0.05, pushIn: 0.08, creation: 1.15, defense: 0.62, stamina: 1.1 }),
  IF: r('Inside Forward', 'IF', 'Cuts in from the flank to shoot.', { inside: 0.32, pushIn: 0.1, finishing: 1.14, creation: 1.0, defense: 0.58, stamina: 1.08 }),
  PF: r('Pressing Forward', 'PF', 'Hunts defenders from the front; forces high turnovers.', { pushIn: 0.04, pushOut: 0.08, press: 1.38, defense: 0.85, stamina: 1.22, finishing: 0.97 }),
  POACHER: r('Poacher', 'POA', 'Lives in the box; elite finishing, little build-up.', { pushIn: 0.06, buildUp: 0.55, finishing: 1.16, defense: 0.4, stamina: 0.92 }),
  TM: r('Target Man', 'TM', 'Wins headers and holds up long balls.', { pushIn: 0.02, aerial: 1.2, buildUp: 0.8, defense: 0.55 })
};

export const ROLES_FOR_KIND: Record<SlotKind, readonly RoleId[]> = {
  GK: ['GK', 'SK'],
  CB: ['CB', 'BPD'],
  LB: ['FB', 'WB', 'IFB'],
  RB: ['FB', 'WB', 'IFB'],
  LWB: ['WB', 'FB'],
  RWB: ['WB', 'FB'],
  DM: ['DM', 'DLP'],
  CM: ['CM', 'B2B', 'DLP', 'AP'],
  AM: ['AP', 'B2B'],
  LM: ['WM', 'W'],
  RM: ['WM', 'W'],
  LW: ['W', 'IF'],
  RW: ['W', 'IF'],
  ST: ['PF', 'POACHER', 'TM']
};

export const KIND_POSITION: Record<SlotKind, Position> = {
  GK: 'GK', CB: 'DEF', LB: 'DEF', RB: 'DEF', LWB: 'DEF', RWB: 'DEF',
  DM: 'MID', CM: 'MID', AM: 'MID', LM: 'MID', RM: 'MID',
  LW: 'FWD', RW: 'FWD', ST: 'FWD'
};

export const isDefensiveKind = (k: SlotKind): boolean => KIND_POSITION[k] === 'DEF';
export const isWideKind = (k: SlotKind): boolean => ['LB', 'RB', 'LWB', 'RWB', 'LM', 'RM', 'LW', 'RW'].includes(k);

export function defaultRoleFor(kind: SlotKind, naturalRoles: readonly RoleId[] = []): RoleId {
  const allowed = ROLES_FOR_KIND[kind];
  const natural = naturalRoles.find(role => allowed.includes(role));
  return natural ?? allowed[0] ?? 'CM';
}

export function isRoleAllowed(kind: SlotKind, role: RoleId): boolean {
  return ROLES_FOR_KIND[kind].includes(role);
}

/** Multiplier for playing a player in a slot outside his natural position. */
export function positionFit(position: Position, kind: SlotKind): number {
  const need = KIND_POSITION[kind];
  if (position === need) return 1;
  if (need === 'GK' || position === 'GK') return 0.4;
  const wideMidDef = (kind === 'LWB' || kind === 'RWB') && position === 'MID';
  if (wideMidDef) return 0.95;
  const order: Position[] = ['DEF', 'MID', 'FWD'];
  const gap = Math.abs(order.indexOf(position) - order.indexOf(need));
  return gap === 1 ? 0.88 : 0.74;
}

export function roleFit(naturalRoles: readonly RoleId[], role: RoleId): number {
  return naturalRoles.includes(role) ? 1 : 0.95;
}
