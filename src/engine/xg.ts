/**
 * Expected-goals model. Base value from a logistic fit on goal-mouth angle and
 * distance (≈0.45 from 6m central, ≈0.22 from the penalty spot, ≈0.04 from 25m),
 * then adjusted for shot type, defensive pressure and the shooter's role.
 */
import type { ShotType } from '../types/match.ts';
import type { Rng } from './rng.ts';

const GOAL_HALF_WIDTH = 3.66;

export function goalAngle(dist: number, lat: number): number {
  const d = Math.max(0.5, dist);
  const a1 = Math.atan2(lat + GOAL_HALF_WIDTH, d);
  const a2 = Math.atan2(lat - GOAL_HALF_WIDTH, d);
  return Math.abs(a1 - a2);
}

export function baseXg(dist: number, lat: number): number {
  const logit = -0.925 + 1.266 * goalAngle(dist, lat) - 0.105 * dist;
  return 1 / (1 + Math.exp(-logit));
}

const TYPE_MULT: Record<ShotType, number> = {
  OPEN_PLAY: 1, THROUGH: 1.18, HEADER: 0.62, CUTBACK: 1.12, LONG_SHOT: 0.9,
  COUNTER: 1.1, FREE_KICK: 0.85, CORNER: 0.5, PENALTY: 1
};

/** Typical shot locations per type: [minDist, maxDist, maxAbsLateral]. */
const LOCATION: Record<ShotType, readonly [number, number, number]> = {
  OPEN_PLAY: [12, 24, 15],
  THROUGH: [5, 12, 9],
  HEADER: [4, 11, 7],
  CUTBACK: [6, 11, 8],
  LONG_SHOT: [22, 32, 18],
  COUNTER: [7, 13, 10],
  FREE_KICK: [19, 28, 14],
  CORNER: [5, 11, 7],
  PENALTY: [11, 11, 0]
};

/**
 * @param lane attacking lane the move came from (0 = left, 1 = centre, 2 = right):
 * attacks down a flank finish on that side of the box.
 */
export function sampleLocation(type: ShotType, rng: Rng, lane: 0 | 1 | 2 = 1): { dist: number; lat: number } {
  const [lo, hi, latMax] = LOCATION[type];
  if (type === 'PENALTY') return { dist: 11, lat: 0 };
  // Bias toward the nearer end of each range
  const dist = lo + (hi - lo) * Math.pow(rng.next(), 1.3);
  // Crosses, cutbacks and set pieces are delivered into the middle; carried shots finish on the flank they came from
  const carried = type === 'OPEN_PLAY' || type === 'LONG_SHOT' || type === 'COUNTER' || type === 'THROUGH';
  const bias = (lane - 1) * latMax * (carried ? 0.45 : 0.08);
  const lat = Math.max(-30, Math.min(30, (rng.next() * 2 - 1) * latMax + bias));
  return { dist: Math.round(dist * 10) / 10, lat: Math.round(lat * 10) / 10 };
}

/**
 * @param pressure 0..1 — share of the zone controlled by defenders
 * @param roleFinish role multiplier: finishing for feet shots, aerial for headers
 */
export function computeXg(type: ShotType, dist: number, lat: number, pressure: number, roleFinish: number): number {
  if (type === 'PENALTY') return 0.76;
  const pressureMult = type === 'THROUGH' || type === 'COUNTER' ? 1 - 0.15 * pressure : 1 - 0.38 * pressure;
  const roleMult = 1 + (roleFinish - 1) * 0.6;
  const xg = baseXg(dist, lat) * TYPE_MULT[type] * pressureMult * roleMult;
  return Math.min(0.85, Math.max(0.01, Math.round(xg * 1000) / 1000));
}

/**
 * Converts xG into a goal probability using shooter skill vs keeper reflexes.
 * Average finisher vs average keeper ≈ xG.
 */
export function goalProbability(xg: number, finishing: number, composure: number, keeper: number, bigChance: boolean): number {
  let p = xg * (1 + (finishing - keeper) / 140);
  if (bigChance) p *= 0.9 + composure / 500;
  return Math.min(0.95, Math.max(0.004, p));
}

export const BIG_CHANCE_XG = 0.3;
