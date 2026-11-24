import type { RoleId, SlotKind, Tactics, TacticalIdentity } from '../types/tactics.ts';

export interface IdentityProfile {
  label: string;
  summary: string;
  tactics: Tactics;
  /** Preferred roles per slot kind for this identity. */
  roles: Partial<Record<SlotKind, RoleId>>;
  weakness: string;
}

export const IDENTITIES: Record<Exclude<TacticalIdentity, 'CUSTOM'>, IdentityProfile> = {
  GEGENPRESS: {
    label: 'Gegenpress',
    summary: 'Suffocating high press and a high line; wins the ball back within seconds.',
    tactics: { formation: '4-3-3', pressing: 'HIGH', defLine: 'HIGH', buildUp: 'BALANCED', focus: 'BALANCED', mentality: 'BALANCED' },
    roles: { ST: 'PF', CM: 'B2B', LW: 'IF', RW: 'IF', LB: 'FB', RB: 'FB' },
    weakness: 'Space behind the high line — go Direct / Long Ball and they tire late.'
  },
  TIKI_TAKA: {
    label: 'Tiki-Taka',
    summary: 'Patient short passing through the middle, probing for the perfect pass.',
    tactics: { formation: '4-3-3', pressing: 'HIGH', defLine: 'STANDARD', buildUp: 'SHORT', focus: 'CENTER', mentality: 'BALANCED' },
    roles: { DM: 'DLP', CM: 'AP', LB: 'IFB', RB: 'IFB', CB: 'BPD', GK: 'SK' },
    weakness: 'A High Press disrupts their short build-up and forces turnovers.'
  },
  PARK_THE_BUS: {
    label: 'Park the Bus',
    summary: 'Deep low block, everyone behind the ball, waits for a counter.',
    tactics: { formation: '5-4-1', pressing: 'LOW', defLine: 'DEEP', buildUp: 'COUNTER', focus: 'BALANCED', mentality: 'DEFENSIVE' },
    roles: { ST: 'TM', CM: 'CM', LWB: 'FB', RWB: 'FB', CB: 'CB' },
    weakness: 'Central play stalls — attack the Wings, cross, and shoot from range.'
  },
  WING_PLAY: {
    label: 'Wing Play',
    summary: 'Overloads the flanks with wingers and overlapping full-backs.',
    tactics: { formation: '4-4-2', pressing: 'MID', defLine: 'STANDARD', buildUp: 'BALANCED', focus: 'WINGS', mentality: 'BALANCED' },
    roles: { LM: 'W', RM: 'W', LB: 'WB', RB: 'WB', ST: 'TM' },
    weakness: 'Attacking full-backs leave space — Counter-Attack down the channels.'
  },
  COUNTER_ATTACK: {
    label: 'Counter-Attack',
    summary: 'Mid-to-low block that springs fast breaks the moment it wins the ball.',
    tactics: { formation: '4-2-3-1', pressing: 'MID', defLine: 'DEEP', buildUp: 'COUNTER', focus: 'WINGS', mentality: 'DEFENSIVE' },
    roles: { LW: 'IF', RW: 'IF', ST: 'POACHER', DM: 'DM' },
    weakness: 'Keep the ball with Short Possession and a cautious mentality; deny transitions.'
  },
  DIRECT: {
    label: 'Direct Football',
    summary: 'Long balls into a target man and second balls in the final third.',
    tactics: { formation: '4-4-2', pressing: 'MID', defLine: 'STANDARD', buildUp: 'DIRECT', focus: 'CENTER', mentality: 'BALANCED' },
    roles: { ST: 'TM', CB: 'CB', CM: 'B2B' },
    weakness: 'A Deep line and a Low Block swallow long balls; their midfield gets bypassed.'
  }
};

export const AI_IDENTITIES = Object.keys(IDENTITIES) as Array<keyof typeof IDENTITIES>;

export function identityLabel(id: TacticalIdentity): string {
  return id === 'CUSTOM' ? 'Your Tactics' : IDENTITIES[id].label;
}
