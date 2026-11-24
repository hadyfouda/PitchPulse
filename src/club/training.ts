/**
 * Training ground: weekly team sessions plus personal plans.
 *
 * Every round each fit player gains fractional attribute points in his training focus; a full point is applied as soon
 * as it is earned. The rate depends on age (young players learn fastest), how far he is from his potential (nothing
 * once he reaches it), the session intensity, the training facilities and whether he is on a personal plan.
 *
 * Balance: with Normal intensity and level-1 facilities a player's in-season gains match what AI clubs' players gain
 * over the summer (see growthFor), so training is where the user's squad develops — harder sessions and better
 * facilities speed it up at a cost in fitness, injuries and money. Veterans at their ceiling don't improve, but the
 * season's training load makes them decline more slowly over the summer.
 */
import type { Player, PlayerAttributes, Team } from '../types/domain.ts';
import { isAvailable } from '../types/domain.ts';
import type { IndividualFocus, TeamTrainingFocus, TrainingIntensity, TrainingReport, TrainingState } from '../types/club.ts';
import { KIND_ATTRS, bestKind, playerOverall } from '../data/generators.ts';
import type { Rng } from '../engine/rng.ts';

type AttrKey = keyof PlayerAttributes;

export const MAX_INDIVIDUAL = 5;
export const MAX_FACILITIES = 5;

export const INTENSITY: Record<TrainingIntensity, { label: string; mult: number; fitness: number; injury: number; desc: string }> = {
  LIGHT: { label: 'Light', mult: 0.6, fitness: 5, injury: 0, desc: 'Slower development, players recover +5 fitness more each week. No training injuries.' },
  NORMAL: { label: 'Normal', mult: 1, fitness: 0, injury: 0.003, desc: 'Steady development, normal recovery.' },
  INTENSE: { label: 'Intense', mult: 1.45, fitness: -4, injury: 0.012, desc: '+45% development, but −4 fitness each week and a real risk of training knocks.' }
};

export const TEAM_FOCUS: Record<TeamTrainingFocus, { label: string; attrs: AttrKey[] | null; mult: number; desc: string }> = {
  BALANCED: { label: 'Balanced', attrs: null, mult: 1, desc: 'Each player works on the attributes of his own position — the fastest way to raise overall ratings.' },
  ATTACK: { label: 'Attack', attrs: ['finishing', 'technique', 'composure', 'vision'], mult: 1, desc: 'Finishing, technique, composure and vision for the whole squad.' },
  DEFENCE: { label: 'Defence', attrs: ['tackling', 'positioning', 'strength'], mult: 1, desc: 'Tackling, positioning and strength for the whole squad.' },
  PHYSICAL: { label: 'Physical', attrs: ['pace', 'stamina', 'strength'], mult: 1, desc: 'Pace, stamina and strength — players last longer in matches.' },
  MATCH_PREP: { label: 'Match prep', attrs: null, mult: 0.5, desc: 'Half the development, but everyone gains +6 sharpness and +2 morale before the next match.' }
};

export const INDIVIDUAL_FOCUS: Record<IndividualFocus, { label: string; attrs: AttrKey[] | null; gkOnly?: boolean; outfieldOnly?: boolean }> = {
  POSITION: { label: 'His position', attrs: null },
  FINISHING: { label: 'Finishing', attrs: ['finishing', 'composure', 'longShots'], outfieldOnly: true },
  PLAYMAKING: { label: 'Playmaking', attrs: ['passing', 'vision', 'technique'], outfieldOnly: true },
  DEFENDING: { label: 'Defending', attrs: ['tackling', 'positioning', 'strength'], outfieldOnly: true },
  PHYSICAL: { label: 'Physical', attrs: ['pace', 'stamina', 'strength'], outfieldOnly: true },
  GOALKEEPING: { label: 'Goalkeeping', attrs: ['reflexes', 'handling', 'positioning'], gkOnly: true }
};

/** Personal plans get the coaches' full attention. */
export const INDIVIDUAL_MULT = 1.3;
export const FACILITY_MULT = [1, 1.1, 1.2, 1.32, 1.45] as const;
/** Cost of upgrading FROM level n (index n−1). */
export const FACILITY_COST = [3_000_000, 5_000_000, 8_000_000, 12_000_000] as const;

export const ATTR_LABEL: Record<AttrKey, string> = {
  pace: 'Pace', passing: 'Passing', vision: 'Vision', technique: 'Technique', finishing: 'Finishing', longShots: 'Long shots',
  tackling: 'Tackling', positioning: 'Positioning', workRate: 'Work rate', stamina: 'Stamina', strength: 'Strength',
  composure: 'Composure', reflexes: 'Reflexes', handling: 'Handling'
};

export function defaultTraining(): TrainingState {
  return { intensity: 'NORMAL', focus: 'BALANCED', individual: {}, progress: {}, facilities: 1, loadSum: 0, loadRounds: 0, lastReport: null };
}

/** Attribute points per focus attribute per round at Normal intensity, level-1 facilities. */
export function ageRate(age: number): number {
  if (age <= 19) return 0.285;
  if (age <= 21) return 0.215;
  if (age <= 24) return 0.1;
  if (age <= 27) return 0.04;
  if (age <= 30) return 0.012;
  return 0;
}

/** 1 with plenty of room to grow, fading to 0 at the potential ceiling. */
export function headroomFactor(p: Player): number {
  return Math.max(0, Math.min(1, (p.potential - playerOverall(p)) / 2.5));
}

const positionAttrs = (p: Player): AttrKey[] => KIND_ATTRS[bestKind(p)];

/** What a player works on this week and how hard. */
export function planFor(p: Player, t: TrainingState): { attrs: AttrKey[]; mult: number; label: string; personal: boolean } {
  const personal = t.individual[p.id];
  if (personal) {
    const def = INDIVIDUAL_FOCUS[personal];
    const valid = !(def.gkOnly && p.position !== 'GK') && !(def.outfieldOnly && p.position === 'GK');
    if (valid) return { attrs: def.attrs ?? positionAttrs(p), mult: INDIVIDUAL_MULT, label: def.label, personal: true };
  }
  const team = TEAM_FOCUS[t.focus];
  // Goalkeepers always do goalkeeping work in team sessions
  const attrs = p.position === 'GK' ? INDIVIDUAL_FOCUS.GOALKEEPING.attrs! : team.attrs ?? positionAttrs(p);
  return { attrs, mult: team.mult, label: p.position === 'GK' ? 'Goalkeeping' : team.label, personal: false };
}

export const trainingLoad = (t: TrainingState): number => INTENSITY[t.intensity].mult * FACILITY_MULT[t.facilities - 1]!;

/** Expected overall-rating gain per round (for the UI). */
export function expectedRate(p: Player, t: TrainingState): number {
  const plan = planFor(p, t);
  const overallAttrs = new Set(positionAttrs(p));
  const share = plan.attrs.filter(a => overallAttrs.has(a)).length / overallAttrs.size;
  return ageRate(p.age) * headroomFactor(p) * plan.mult * trainingLoad(t) * share;
}

/** Attribute points per focus attribute per round (whatever the focus). */
export function attributeRate(p: Player, t: TrainingState): number {
  return ageRate(p.age) * headroomFactor(p) * planFor(p, t).mult * trainingLoad(t);
}

export function rateLabel(perRound: number, p: Player, t: TrainingState): { label: string; cls: string } {
  if (headroomFactor(p) === 0) return { label: p.age >= 29 ? 'At peak' : 'At ceiling', cls: 'text-zinc-500' };
  // Training attributes his overall doesn't use (e.g. physical work for a playmaker): better in matches, same OVR
  if (perRound === 0 && attributeRate(p, t) > 0) return { label: 'Off-position work', cls: 'text-sky-300' };
  if (perRound >= 0.2) return { label: 'Very fast', cls: 'text-emerald-300' };
  if (perRound >= 0.1) return { label: 'Fast', cls: 'text-emerald-400' };
  if (perRound >= 0.04) return { label: 'Steady', cls: 'text-lime-400' };
  if (perRound > 0) return { label: 'Slow', cls: 'text-amber-300' };
  return { label: 'None', cls: 'text-zinc-500' };
}

/**
 * One week of training for the user's squad. Mutates `team`'s players; returns the new training state and a report.
 * Injured players rest; suspended players still train.
 */
export function applyTraining(team: Team, training: TrainingState, rng: Rng, season: number, round: number): { training: TrainingState; report: TrainingReport } {
  const t: TrainingState = structuredClone(training);
  const intensity = INTENSITY[t.intensity];
  const load = trainingLoad(t);
  const report: TrainingReport = { season, round, gains: [], ovrUps: [], injuries: [] };

  for (const p of team.players) {
    if (p.injury) continue;
    const before = playerOverall(p);
    const plan = planFor(p, t);
    const rate = ageRate(p.age) * headroomFactor(p) * plan.mult * load;
    if (rate > 0) {
      const prog = (t.progress[p.id] ??= {});
      for (const a of plan.attrs) {
        prog[a] = (prog[a] ?? 0) + rate * (0.8 + rng.next() * 0.4);
        while ((prog[a] ?? 0) >= 1 && p.attrs[a] < 99) {
          prog[a]! -= 1;
          p.attrs[a] += 1;
          report.gains.push({ playerId: p.id, name: p.name, attr: ATTR_LABEL[a], value: p.attrs[a] });
        }
      }
    }
    const after = playerOverall(p);
    if (after > before) report.ovrUps.push({ playerId: p.id, name: p.name, from: before, to: after });

    // Side effects of the session
    p.fitness = Math.max(20, Math.min(100, p.fitness + intensity.fitness));
    if (t.focus === 'MATCH_PREP') { p.sharpness = Math.min(100, p.sharpness + 6); p.morale = Math.min(95, p.morale + 2); }
    if (isAvailable(p) && rng.next() < intensity.injury) {
      p.injury = { severity: 'MINOR', label: 'training knock', matchesOut: 1 };
      p.fitness = Math.min(p.fitness, 75);
      report.injuries.push(`${p.name} picked up a knock in training — out for 1 match.`);
    }
  }

  // Forget plans and progress of players who left
  const ids = new Set(team.players.map(p => p.id));
  for (const id of Object.keys(t.individual)) if (!ids.has(id)) delete t.individual[id];
  for (const id of Object.keys(t.progress)) if (!ids.has(id)) delete t.progress[id];

  t.loadSum += load;
  t.loadRounds += 1;
  t.lastReport = report;
  return { training: t, report };
}

/** Summer decline multiplier for the user's veterans: Normal/level-1 = 1 (same as AI clubs), harder/better training holds players longer. */
export function declineFactor(t: TrainingState): number {
  const avg = t.loadRounds > 0 ? t.loadSum / t.loadRounds : 1;
  return Math.max(0.6, Math.min(1.15, 1 - 0.3 * (avg - 1)));
}

/** Progress toward the next point in the player's current plan, 0–1 (average over the plan's attributes). */
export function nextPointProgress(p: Player, t: TrainingState): number {
  const plan = planFor(p, t);
  const prog = t.progress[p.id] ?? {};
  return plan.attrs.reduce((s, a) => s + (prog[a] ?? 0), 0) / plan.attrs.length;
}
