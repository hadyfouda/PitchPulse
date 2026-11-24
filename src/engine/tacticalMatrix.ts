/**
 * The tactical counter matrix: every rock-paper-scissors interaction lives here
 * as plain data + small pure functions, so balance can be tuned in one place.
 */
import type { Lane, Third } from '../types/match.ts';
import type { AttackFocus, BuildUp, DefLine, Mentality, Pressing, ShoutType } from '../types/tactics.ts';

export type ActionKind =
  | 'RECYCLE' | 'SWITCH' | 'PROGRESS' | 'DRIBBLE' | 'LONG_BALL'
  | 'THROUGH' | 'CROSS' | 'CUTBACK' | 'LONG_SHOT' | 'WORK_SHOT';

export interface ActionContext {
  third: Third;
  lane: Lane;
  buildUp: BuildUp;
  focus: AttackFocus;
  mentality: Mentality;
  attShout: ShoutType | null;
  oppPressing: Pressing;
  oppDefLine: DefLine;
  oppShout: ShoutType | null;
  counter: boolean;
}

export const MENTALITY_INDEX: Record<Mentality, number> = {
  VERY_DEFENSIVE: -2, DEFENSIVE: -1, BALANCED: 0, ATTACKING: 1, ALL_OUT: 2
};

/** How much a pressing scheme multiplies defensive strength in each third, from the DEFENDER's view (0 = own third). */
export const PRESS_ZONE_FACTOR: Record<Pressing, readonly [number, number, number]> = {
  HIGH: [1.0, 1.08, 1.28],
  MID: [1.05, 1.12, 0.85],
  LOW: [1.22, 0.85, 0.6]
};

export const PRESS_STAMINA: Record<Pressing, number> = { HIGH: 1.38, MID: 1.0, LOW: 0.85 };

/** Effective pressing after a Push Higher shout (MID → HIGH, LOW → MID). */
export function effectivePressing(p: Pressing, shout: ShoutType | null): Pressing {
  if (shout !== 'PUSH_HIGHER') return p;
  return p === 'LOW' ? 'MID' : 'HIGH';
}

export const LANE_WEIGHTS: Record<AttackFocus, readonly [number, number, number]> = {
  WINGS: [0.42, 0.16, 0.42],
  BALANCED: [0.32, 0.36, 0.32],
  CENTER: [0.2, 0.6, 0.2]
};

const ATTACKING_ACTIONS: ReadonlySet<ActionKind> = new Set(['PROGRESS', 'THROUGH', 'CROSS', 'CUTBACK', 'LONG_SHOT', 'WORK_SHOT', 'DRIBBLE']);

/** Relative likelihood of each action in this context. */
export function actionWeights(c: ActionContext): Array<[ActionKind, number]> {
  const wide = c.lane !== 1;
  let w: Partial<Record<ActionKind, number>>;

  if (c.counter) {
    w = c.third < 2
      ? { PROGRESS: 5, LONG_BALL: 2, DRIBBLE: 2, RECYCLE: 0.5 }
      : { THROUGH: 3, WORK_SHOT: 3, CUTBACK: wide ? 2 : 0, DRIBBLE: 1 };
  } else if (c.third === 0) {
    w = { RECYCLE: 3, PROGRESS: 4, LONG_BALL: 1, DRIBBLE: 0.5, SWITCH: 0.6 };
  } else if (c.third === 1) {
    w = { RECYCLE: 2.5, PROGRESS: 4, LONG_BALL: 0.8, DRIBBLE: 1, SWITCH: 0.8, THROUGH: wide ? 0.1 : 0.4, LONG_SHOT: wide ? 0 : 0.1 };
  } else if (wide) {
    w = { CROSS: 2.2, CUTBACK: 0.9, DRIBBLE: 1.1, RECYCLE: 2.6, SWITCH: 0.8, LONG_SHOT: 0.08 };
  } else {
    w = { WORK_SHOT: 1.5, THROUGH: 1.2, LONG_SHOT: 0.26, DRIBBLE: 0.8, RECYCLE: 2.6, SWITCH: 1.1 };
  }

  if (!c.counter) {
    // Build-up style
    if (c.buildUp === 'SHORT') { mul(w, 'RECYCLE', 1.6); mul(w, 'LONG_BALL', 0.3); mul(w, 'PROGRESS', 1.05); }
    if (c.buildUp === 'DIRECT') { mul(w, 'LONG_BALL', 2.1); mul(w, 'RECYCLE', 0.75); mul(w, 'CROSS', 1.1); }
    if (c.buildUp === 'COUNTER') { mul(w, 'LONG_BALL', 2); mul(w, 'RECYCLE', 0.6); mul(w, 'PROGRESS', 1.15); }
    // Attack focus
    if (c.focus === 'WINGS') { mul(w, 'SWITCH', c.lane === 1 ? 2.2 : 0.8); mul(w, 'CROSS', 1.7); mul(w, 'CUTBACK', 1.4); mul(w, 'THROUGH', 0.75); }
    if (c.focus === 'CENTER') { mul(w, 'SWITCH', 0.5); mul(w, 'CROSS', 0.55); mul(w, 'THROUGH', 1.15); mul(w, 'WORK_SHOT', 1.15); mul(w, 'CUTBACK', 1.1); }
    // Low blocks invite long shots
    if (c.oppPressing === 'LOW' && c.third >= 1) mul(w, 'LONG_SHOT', 1.6);
  }

  // Mentality: attacking actions vs safe recycling
  const m = MENTALITY_INDEX[c.mentality];
  const attackMul = [0.6, 0.8, 1, 1.22, 1.45][m + 2] ?? 1;
  const recycleMul = [1.6, 1.25, 1, 0.85, 0.65][m + 2] ?? 1;
  for (const k of Object.keys(w) as ActionKind[]) {
    if (ATTACKING_ACTIONS.has(k)) mul(w, k, attackMul);
  }
  mul(w, 'RECYCLE', recycleMul);
  if (m <= -1 && c.third === 0) mul(w, 'LONG_BALL', 1.4);

  // Shouts
  if (c.attShout === 'SLOW_TEMPO') { mul(w, 'RECYCLE', 1.8); for (const k of ATTACKING_ACTIONS) mul(w, k, 0.75); }
  if (c.attShout === 'TIGHTEN_DEFENSE') { for (const k of ATTACKING_ACTIONS) mul(w, k, 0.85); }

  return (Object.entries(w) as Array<[ActionKind, number]>).filter(([, v]) => v > 0);
}

export const ACTION_BASE: Record<ActionKind, number> = {
  RECYCLE: 0.86, SWITCH: 0.78, PROGRESS: 0.62, DRIBBLE: 0.42, LONG_BALL: 0.34,
  THROUGH: 0.1, CROSS: 0.16, CUTBACK: 0.13, LONG_SHOT: 1, WORK_SHOT: 0.085
};

export interface MatrixResult {
  /** Added to the success probability. */
  mod: number;
  /** Tags explaining which interaction fired (used for commentary + tuning). */
  tags: string[];
}

/** Success-probability modifiers from the tactical counter matrix. */
export function matrixModifier(action: ActionKind, c: ActionContext): MatrixResult {
  let mod = 0;
  const tags: string[] = [];
  const press = effectivePressing(c.oppPressing, c.oppShout);

  // High Press vs build-up from the back
  if (press === 'HIGH' && c.third === 0 && !c.counter) {
    if (c.buildUp === 'SHORT' && (action === 'RECYCLE' || action === 'PROGRESS' || action === 'SWITCH')) { mod -= 0.14; tags.push('press-traps-short'); }
    else if (c.buildUp === 'BALANCED' && action !== 'LONG_BALL') mod -= 0.06;
    if (action === 'LONG_BALL') { mod += 0.045; tags.push('bypass-press'); }
  }
  if (press === 'HIGH' && c.third === 1 && action === 'PROGRESS') mod -= 0.04;
  // Breaking into the final third is the hardest step
  if (c.third === 1 && (action === 'PROGRESS' || action === 'DRIBBLE')) mod -= 0.17;

  // Low Block: concede possession, protect the centre, vulnerable out wide / from range
  if (press === 'LOW') {
    if (c.third <= 1 && (action === 'RECYCLE' || action === 'SWITCH')) mod += 0.08;
    if (c.third === 0 && action === 'PROGRESS') mod += 0.06;
    if (c.third === 2 && c.lane === 1 && (action === 'THROUGH' || action === 'WORK_SHOT' || action === 'DRIBBLE')) { mod -= 0.2; tags.push('block-shuts-centre'); }
    if (c.third === 1 && c.lane === 1 && action === 'PROGRESS') mod -= 0.12;
    if (c.third === 1 && c.lane !== 1 && action === 'PROGRESS') mod += 0.05;
    if (action === 'CROSS' || action === 'CUTBACK') { mod += 0.1; tags.push('block-weak-wide'); }
  }
  if (press === 'MID' && c.third === 1) mod -= 0.03;
  // Patient short passing keeps the ball and opens gaps when it isn't pressed high
  if (c.buildUp === 'SHORT' && press !== 'HIGH' && !c.counter) {
    if (action === 'RECYCLE' || action === 'SWITCH' || action === 'PROGRESS') mod += 0.04;
    if (c.third === 2 && (action === 'THROUGH' || action === 'CUTBACK')) mod += 0.03;
  }

  // Defensive line
  if (c.oppDefLine === 'HIGH' && (action === 'LONG_BALL' || action === 'THROUGH')) { mod += 0.02; tags.push('space-behind'); }
  if (c.oppDefLine === 'DEEP' && action === 'THROUGH') { mod -= 0.08; tags.push('no-space-behind'); }

  // Shouts
  if (c.attShout === 'SLOW_TEMPO' && c.third <= 1 && (action === 'RECYCLE' || action === 'PROGRESS')) mod += 0.04;
  if (c.oppShout === 'TIGHTEN_DEFENSE' && c.third === 2) mod -= 0.05;

  // Wing play: overlaps make it easier to get down the flanks and deliver
  if (c.focus === 'WINGS' && c.lane !== 1 && !c.counter) {
    if (action === 'PROGRESS' || action === 'DRIBBLE') mod += 0.04;
    if (action === 'CROSS' || action === 'CUTBACK') mod += 0.03;
  }
  if (c.counter) { mod += 0.1; tags.push('counter'); }
  return { mod, tags };
}

/** Chance that a long ball / through ball over a high line becomes a clean run on goal. */
export function inBehindChance(oppDefLine: DefLine, oppPressing: Pressing): number {
  let p = 0.05;
  if (oppDefLine === 'HIGH') p += 0.07;
  if (oppDefLine === 'DEEP') p -= 0.03;
  if (oppPressing === 'HIGH') p += 0.03;
  return Math.max(0.01, p);
}

/** Probability a failed pass over the top was flagged offside. */
export function offsideShare(oppDefLine: DefLine): number {
  return oppDefLine === 'HIGH' ? 0.4 : oppDefLine === 'STANDARD' ? 0.1 : 0.04;
}

/**
 * How exposed a team is to a counter when it loses the ball:
 * attacking mentality, a high line and bombing wing-backs all leave space.
 */
export function exposure(mentality: Mentality, defLine: DefLine, wingBacks: number): number {
  let e = 0.18 + MENTALITY_INDEX[mentality] * 0.11;
  if (defLine === 'HIGH') e += 0.07;
  if (defLine === 'DEEP') e -= 0.08;
  e += wingBacks * 0.05;
  return Math.min(0.75, Math.max(0.03, e));
}

/** Chance the side that just won the ball launches a counter. */
export function counterChance(winnerBuildUp: BuildUp, loserExposure: number, wonInThird: Third): number {
  let p = loserExposure * (wonInThird === 0 ? 0.9 : wonInThird === 1 ? 1.1 : 0.7);
  if (winnerBuildUp === 'COUNTER') p *= 2.1;
  if (winnerBuildUp === 'SHORT') p *= 0.6;
  return Math.min(0.6, p * 0.6);
}

/** A ball won in the opponent's defensive third by a high press can turn straight into a shot. */
export function highTurnoverShotChance(winnerPressing: Pressing): number {
  return winnerPressing === 'HIGH' ? 0.105 : 0.04;
}

/** Fouls: aggressive pressing and Demand More raise the count. */
export function foulChance(defPressing: Pressing, defShout: ShoutType | null, tackling: number): number {
  let p = 0.1 * (defPressing === 'HIGH' ? 1.3 : defPressing === 'LOW' ? 0.9 : 1);
  if (defShout === 'DEMAND_MORE') p *= 1.5;
  p *= 1.25 - tackling / 200;
  return p;
}

function mul(w: Partial<Record<ActionKind, number>>, k: ActionKind, f: number): void {
  const v = w[k];
  if (v !== undefined) w[k] = v * f;
}
