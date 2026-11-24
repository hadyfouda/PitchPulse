import type { Side } from '../types/match.ts';

/** Absolute pitch coordinates of a recorded shot (dist/lat are metres from the attacked goal). */
export function shotAbs(shot: { side: Side; dist: number; lat: number }): { x: number; y: number } {
  const dx = shot.dist / 105, dy = shot.lat / 68;
  return shot.side === 'home' ? { x: 1 - dx, y: 0.5 + dy } : { x: dx, y: 0.5 - dy };
}
