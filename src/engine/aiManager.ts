/**
 * AI touchline brain. Runs once per match minute for every AI-controlled side
 * and returns intents; the engine pushes them through the same ActionQueue
 * the human manager uses, so AI changes obey identical stoppage rules.
 */
import type { LivePlayer, MatchState, QueuedActionBody, Side, TeamMatchState } from '../types/match.ts';
import type { Mentality, ShoutType, Tactics } from '../types/tactics.ts';
import { IDENTITIES } from './identities.ts';
import { MAX_SUBS } from './constants.ts';
import { slotDef } from './formations.ts';
import { positionFit } from './roles.ts';

export interface AiDecision {
  actions: QueuedActionBody[];
  shout: ShoutType | null;
  note: string | null;
}

const MENT: Mentality[] = ['VERY_DEFENSIVE', 'DEFENSIVE', 'BALANCED', 'ATTACKING', 'ALL_OUT'];
const step = (m: Mentality, d: number): Mentality => MENT[Math.max(0, Math.min(4, MENT.indexOf(m) + d))] ?? m;

export function aiMinute(state: MatchState, side: Side, minute: number): AiDecision {
  const team = side === 'home' ? state.home : state.away;
  const opp = side === 'home' ? state.away : state.home;
  const diff = team.score - opp.score;
  const decision: AiDecision = { actions: [], shout: null, note: null };
  // A human club run by the assistant (quick sim) keeps its tactics but still rotates tired legs
  if (team.identity !== 'CUSTOM') adaptTactics(state, side, team, opp, minute, diff, decision);

  // --- Substitutions ---
  const pendingSubs = state.queue.filter(a => a.side === side && a.kind === 'SUB').length;
  if (team.subsUsed + pendingSubs < MAX_SUBS && pendingSubs === 0) {
    const injured = team.players.find(p => p.status === 'INJURED_OFF' && !alreadyReplaced(team, p));
    let out: LivePlayer | undefined = injured;
    if (!out && minute >= 55) {
      const threshold = minute >= 75 ? 70 : 62;
      out = team.players
        .filter(p => p.status === 'PITCH' && p.slot !== 0 && p.stamina < threshold)
        .sort((a, b) => a.stamina - b.stamina)[0];
    }
    if (out) {
      const replacement = bestReplacement(team, out);
      if (replacement) decision.actions.push({ kind: 'SUB', outId: out.id, inId: replacement.id });
    }
  }

  // --- Shouts ---
  const shoutReady = state.tick >= team.shout.cooldownUntil && team.identity !== 'CUSTOM';
  if (shoutReady) {
    if (diff < 0 && minute >= 60) decision.shout = 'DEMAND_MORE';
    else if (diff > 0 && minute >= 80) decision.shout = 'TIGHTEN_DEFENSE';
  }
  return decision;
}


function adaptTactics(state: MatchState, side: Side, team: TeamMatchState, opp: TeamMatchState, minute: number, diff: number, decision: AiDecision): void {
  if (team.identity === 'CUSTOM') return;
  const baseline = IDENTITIES[team.identity].tactics;
  const desired: Tactics = { ...baseline };
  const onPitch = team.players.filter(p => p.status === 'PITCH').length;
  const oppOnPitch = opp.players.filter(p => p.status === 'PITCH').length;
  let note: string | null = null;

  if (minute >= 70 && diff < 0) {
    desired.mentality = diff <= -2 || minute >= 82 ? 'ALL_OUT' : 'ATTACKING';
    desired.pressing = 'HIGH';
    if (minute >= 80) desired.buildUp = 'DIRECT';
    note = 'throw bodies forward chasing the game';
  } else if (minute >= 75 && diff > 0) {
    desired.mentality = team.identity === 'PARK_THE_BUS' || minute >= 85 ? 'VERY_DEFENSIVE' : 'DEFENSIVE';
    desired.pressing = diff === 1 && minute >= 82 ? 'LOW' : baseline.pressing === 'HIGH' ? 'MID' : baseline.pressing;
    if (desired.pressing === 'LOW') desired.defLine = 'DEEP';
    note = 'drop deeper to protect the lead';
  } else if (minute >= 60 && diff < 0 && team.identity === 'PARK_THE_BUS') {
    desired.mentality = 'BALANCED';
    desired.pressing = 'MID';
    note = 'abandon the low block and come out';
  }
  if (onPitch < oppOnPitch && !(minute >= 70 && diff < 0)) {
    desired.mentality = step(desired.mentality, -1);
    note = note ?? 'reshuffle after going down to ten';
  } else if (onPitch > oppOnPitch && diff <= 0 && minute >= 30) {
    desired.mentality = step(desired.mentality, 1);
    note = note ?? 'push on against ten men';
  }

  const patch: Partial<Tactics> = {};
  (Object.keys(desired) as Array<keyof Tactics>).forEach(k => {
    if (desired[k] !== team.tactics[k]) (patch as Record<string, unknown>)[k] = desired[k];
  });
  const pendingTactics = state.queue.some(a => a.side === side && a.kind === 'TACTICS');
  if (Object.keys(patch).length && !pendingTactics) {
    decision.actions.push({ kind: 'TACTICS', patch });
    decision.note = note ?? 'reset to their usual shape';
  }

}

/** An injured player is "replaced" once someone else occupies his last slot. */
function alreadyReplaced(team: TeamMatchState, injured: LivePlayer): boolean {
  return team.players.some(p => p.status === 'PITCH' && p.slot === injured.lastSlot);
}

function bestReplacement(team: TeamMatchState, out: LivePlayer): LivePlayer | undefined {
  const slot = out.status === 'PITCH' ? out.slot : out.lastSlot;
  const kind = slotDef(team.tactics.formation, slot).kind;
  return team.players
    .filter(p => p.status === 'BENCH')
    .map(p => ({ p, score: positionFit(p.position, kind) * 100 + overall(p) * 0.5 }))
    .sort((a, b) => b.score - a.score)[0]?.p;
}

function overall(p: LivePlayer): number {
  const a = p.attrs;
  return (a.passing + a.technique + a.tackling + a.positioning + a.finishing + a.pace) / 6;
}
