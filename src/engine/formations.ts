import type { Formation, SlotKind } from '../types/tactics.ts';

/** x: 0 = left touchline → 1 = right; y: 0 = own goal line → 1 = opponent goal line. */
export interface SlotDef {
  kind: SlotKind;
  x: number;
  y: number;
}

const s = (kind: SlotKind, x: number, y: number): SlotDef => ({ kind, x, y });
const GK = s('GK', 0.5, 0.04);

export const FORMATION_SLOTS: Record<Formation, readonly SlotDef[]> = {
  '4-3-3': [GK, s('LB', 0.12, 0.24), s('CB', 0.37, 0.2), s('CB', 0.63, 0.2), s('RB', 0.88, 0.24),
    s('CM', 0.3, 0.46), s('DM', 0.5, 0.38), s('CM', 0.7, 0.46), s('LW', 0.15, 0.72), s('ST', 0.5, 0.8), s('RW', 0.85, 0.72)],
  '4-2-3-1': [GK, s('LB', 0.12, 0.24), s('CB', 0.37, 0.2), s('CB', 0.63, 0.2), s('RB', 0.88, 0.24),
    s('DM', 0.38, 0.38), s('DM', 0.62, 0.38), s('LW', 0.15, 0.65), s('AM', 0.5, 0.62), s('RW', 0.85, 0.65), s('ST', 0.5, 0.82)],
  '4-4-2': [GK, s('LB', 0.12, 0.24), s('CB', 0.37, 0.2), s('CB', 0.63, 0.2), s('RB', 0.88, 0.24),
    s('LM', 0.12, 0.5), s('CM', 0.38, 0.45), s('CM', 0.62, 0.45), s('RM', 0.88, 0.5), s('ST', 0.38, 0.78), s('ST', 0.62, 0.78)],
  '3-5-2': [GK, s('CB', 0.25, 0.2), s('CB', 0.5, 0.17), s('CB', 0.75, 0.2),
    s('LWB', 0.08, 0.45), s('DM', 0.5, 0.36), s('CM', 0.33, 0.5), s('CM', 0.67, 0.5), s('RWB', 0.92, 0.45), s('ST', 0.38, 0.78), s('ST', 0.62, 0.78)],
  '5-4-1': [GK, s('LWB', 0.08, 0.28), s('CB', 0.3, 0.18), s('CB', 0.5, 0.16), s('CB', 0.7, 0.18), s('RWB', 0.92, 0.28),
    s('LM', 0.15, 0.48), s('CM', 0.4, 0.44), s('CM', 0.6, 0.44), s('RM', 0.85, 0.48), s('ST', 0.5, 0.74)],
  '3-4-3': [GK, s('CB', 0.25, 0.2), s('CB', 0.5, 0.17), s('CB', 0.75, 0.2),
    s('LWB', 0.1, 0.45), s('CM', 0.38, 0.43), s('CM', 0.62, 0.43), s('RWB', 0.9, 0.45), s('LW', 0.18, 0.72), s('ST', 0.5, 0.8), s('RW', 0.82, 0.72)]
};

export function slotDef(formation: Formation, slot: number): SlotDef {
  return FORMATION_SLOTS[formation][slot] ?? GK;
}
