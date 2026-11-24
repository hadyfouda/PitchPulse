import type { AttackFocus, BuildUp, DefLine, Mentality, Pressing, ShoutType } from '../types/tactics.ts';
import type { PauseReason } from '../types/match.ts';

export const PRESSING_LABEL: Record<Pressing, string> = { HIGH: 'High Press', MID: 'Mid Block', LOW: 'Low Block' };
export const DEFLINE_LABEL: Record<DefLine, string> = { DEEP: 'Deep', STANDARD: 'Standard', HIGH: 'High' };
export const BUILDUP_LABEL: Record<BuildUp, string> = { SHORT: 'Short Possession', BALANCED: 'Balanced', DIRECT: 'Direct / Long Ball', COUNTER: 'Counter-Attack' };
export const FOCUS_LABEL: Record<AttackFocus, string> = { WINGS: 'Wings', BALANCED: 'Balanced', CENTER: 'Center' };
export const MENTALITY_LABEL: Record<Mentality, string> = {
  VERY_DEFENSIVE: 'Very Defensive', DEFENSIVE: 'Defensive', BALANCED: 'Balanced', ATTACKING: 'Attacking', ALL_OUT: 'All-Out Attack'
};

export const SHOUT_INFO: Record<ShoutType, { label: string; effect: string; cost: string }> = {
  PUSH_HIGHER: { label: 'Push Higher', effect: 'Press one level higher, line steps up', cost: 'Heavy stamina drain' },
  SLOW_TEMPO: { label: 'Slow the Tempo', effect: 'Keep the ball, fewer turnovers', cost: 'Fewer chances created' },
  TIGHTEN_DEFENSE: { label: 'Tighten Defense', effect: 'Compact shape around the box', cost: 'Less attacking threat' },
  DEMAND_MORE: { label: 'Demand More', effect: '+6% focus, morale boost', cost: 'More fouls & cards, stamina' }
};

export const PAUSE_LABEL: Record<PauseReason, string> = {
  USER: 'Paused', GOAL: 'Goal', RED_CARD: 'Red card', INJURY: 'Injury', STAMINA: 'Stamina alert',
  HALF_TIME: 'Half-time', SUB_WINDOW: 'Sub window'
};

export const TACTIC_KEY_LABEL: Record<string, string> = {
  formation: 'Formation', pressing: 'Pressing', defLine: 'Line', buildUp: 'Build-up', focus: 'Focus', mentality: 'Mentality'
};

export function valueLabel(key: string, value: string): string {
  const maps: Record<string, Record<string, string>> = {
    pressing: PRESSING_LABEL, defLine: DEFLINE_LABEL, buildUp: BUILDUP_LABEL, focus: FOCUS_LABEL, mentality: MENTALITY_LABEL
  };
  return maps[key]?.[value] ?? value;
}
