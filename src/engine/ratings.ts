import type { LivePlayer } from '../types/match.ts';
import { TICKS_PER_MINUTE } from './constants.ts';

/**
 * Live 0.0–10.0 match rating from on-pitch contributions.
 * Players need ~10 minutes on the pitch before they move away from 6.0.
 */
export function computeRating(p: LivePlayer, goalDiff: number, isKeeper: boolean, isDefender: boolean): number {
  const s = p.stats;
  if (s.ticks < TICKS_PER_MINUTE * 3) return 6.0;
  let r = 6.0;
  r += s.goals * 1.0 + s.assists * 0.7 + s.keyPasses * 0.15;
  r += s.shotsOnTarget * 0.12 - (s.shots - s.shotsOnTarget) * 0.03;
  r += s.tackles * 0.14 + (s.interceptions ?? 0) * 0.04 + s.dribbles * 0.06;
  r += s.passesCompleted * 0.012 - (s.passes - s.passesCompleted) * 0.035;
  r += s.saves * 0.35;
  r -= s.conceded * (isKeeper ? 0.3 : isDefender ? 0.12 : 0.03);
  r -= s.fouls * 0.06 + p.yellow * 0.3 + s.mistakes * 0.15;
  if (p.status === 'SENT_OFF') r -= 1.5;
  // Clean sheet bonus for the back line after an hour
  if ((isKeeper || isDefender) && s.conceded === 0 && s.ticks >= TICKS_PER_MINUTE * 60) r += 0.35;
  // Small share of the team result, scaled by time played
  const share = Math.min(1, s.ticks / (TICKS_PER_MINUTE * 90));
  r += Math.max(-0.4, Math.min(0.4, goalDiff * 0.12)) * share;
  return Math.round(Math.min(10, Math.max(3, r)) * 10) / 10;
}
