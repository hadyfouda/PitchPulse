/** Tactical vocabulary shared by the engine, the AI managers and the UI. */

export const FORMATIONS = ['4-3-3', '4-2-3-1', '4-4-2', '3-5-2', '5-4-1', '3-4-3'] as const;
export type Formation = (typeof FORMATIONS)[number];

export const PRESSING = ['HIGH', 'MID', 'LOW'] as const;
export type Pressing = (typeof PRESSING)[number];

export const DEF_LINES = ['DEEP', 'STANDARD', 'HIGH'] as const;
export type DefLine = (typeof DEF_LINES)[number];

export const BUILD_UPS = ['SHORT', 'BALANCED', 'DIRECT', 'COUNTER'] as const;
export type BuildUp = (typeof BUILD_UPS)[number];

export const ATTACK_FOCUS = ['WINGS', 'BALANCED', 'CENTER'] as const;
export type AttackFocus = (typeof ATTACK_FOCUS)[number];

export const MENTALITIES = ['VERY_DEFENSIVE', 'DEFENSIVE', 'BALANCED', 'ATTACKING', 'ALL_OUT'] as const;
export type Mentality = (typeof MENTALITIES)[number];

export interface Tactics {
  formation: Formation;
  pressing: Pressing;
  defLine: DefLine;
  buildUp: BuildUp;
  focus: AttackFocus;
  mentality: Mentality;
}

/** Slot kinds a formation is made of. Roles are only valid for certain kinds. */
export type SlotKind = 'GK' | 'CB' | 'LB' | 'RB' | 'LWB' | 'RWB' | 'DM' | 'CM' | 'LM' | 'RM' | 'AM' | 'LW' | 'RW' | 'ST';

export const ROLES = [
  'GK', 'SK',
  'CB', 'BPD',
  'FB', 'WB', 'IFB',
  'DM', 'DLP', 'B2B', 'CM', 'AP',
  'WM', 'W', 'IF',
  'PF', 'POACHER', 'TM'
] as const;
export type RoleId = (typeof ROLES)[number];

export type ShoutType = 'PUSH_HIGHER' | 'SLOW_TEMPO' | 'TIGHTEN_DEFENSE' | 'DEMAND_MORE';
export const SHOUTS: readonly ShoutType[] = ['PUSH_HIGHER', 'SLOW_TEMPO', 'TIGHTEN_DEFENSE', 'DEMAND_MORE'];

/** Tactical identities used by AI clubs. 'CUSTOM' is the human manager. */
export type TacticalIdentity = 'GEGENPRESS' | 'TIKI_TAKA' | 'PARK_THE_BUS' | 'WING_PLAY' | 'COUNTER_ATTACK' | 'DIRECT' | 'CUSTOM';
