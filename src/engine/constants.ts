import type { AutoPauseTriggers, SpeedMode } from '../types/match.ts';

/** One tick = 10 match seconds. */
export const TICKS_PER_MINUTE = 6;
export const SECONDS_PER_TICK = 10;
export const HALF_TICKS = 45 * TICKS_PER_MINUTE;
export const MAX_SUBS = 5;

/** Shout effect lasts 10 match minutes; shouts share a 15 match-minute cooldown. */
export const SHOUT_DURATION_TICKS = 10 * TICKS_PER_MINUTE;
export const SHOUT_COOLDOWN_TICKS = 15 * TICKS_PER_MINUTE;

/** A queued substitution forces a stoppage if play hasn't stopped for this long. */
export const SUB_FORCE_STOPPAGE_TICKS = 2 * TICKS_PER_MINUTE;

/** Real milliseconds per match minute for each speed mode. */
export const MS_PER_MATCH_MINUTE: Record<SpeedMode, number> = {
  BG30: 20_000, // 90' in 30 min
  BG15: 10_000, // 90' in 15 min
  X1: 4_000, //    90' in 6 min
  X2: 2_000, //    90' in 3 min
  X8: 500 //       90' in 45 s
};

export const SPEED_LABELS: Record<SpeedMode, string> = {
  BG30: 'BG 30m', BG15: 'BG 15m', X1: '1x', X2: '2x', X8: '8x'
};

export const DEFAULT_AUTOPAUSE: AutoPauseTriggers = {
  goal: true,
  redCard: true,
  injury: true,
  staminaBelow60: true,
  halfTime: true,
  subWindow65: true
};
