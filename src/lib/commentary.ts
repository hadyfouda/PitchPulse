/** Turns structured engine events into short commentary lines. UI-only. */
import type { MatchEvent, Side } from '../types/match.ts';
import type { ShoutType } from '../types/tactics.ts';
import { SHOUT_INFO, TACTIC_KEY_LABEL, valueLabel } from './labels.ts';

export type Tone = 'goal' | 'chance' | 'card' | 'red' | 'injury' | 'sub' | 'tactic' | 'period' | 'alert' | 'muted';

export interface CommentaryLine {
  text: string;
  tone: Tone;
}

const SHOT_DESC: Record<string, string> = {
  OPEN_PLAY: 'shot', THROUGH: 'one-on-one', HEADER: 'header', CUTBACK: 'first-time finish from the cutback',
  LONG_SHOT: 'strike from distance', COUNTER: 'finish on the break', FREE_KICK: 'free kick', CORNER: 'header from the corner',
  PENALTY: 'penalty'
};

const LANE = ['down the left', 'through the middle', 'down the right'];

function changesText(raw: string | number | undefined): string {
  if (typeof raw !== 'string' || !raw) return '';
  return raw.split(',').map(pair => {
    const [k = '', v = ''] = pair.split(':');
    return `${TACTIC_KEY_LABEL[k] ?? k}: ${valueLabel(k, v)}`;
  }).join(' · ');
}

export function describe(e: MatchEvent, teams: Record<Side, string>): CommentaryLine {
  const team = e.side ? teams[e.side] : '';
  const who = e.playerName ?? 'A player';
  const m = e.meta ?? {};
  const big = m.big === 1;
  const xg = e.xg !== undefined ? ` (xG ${e.xg.toFixed(2)})` : '';
  const shotType = SHOT_DESC[String(m.type)] ?? 'shot';
  switch (e.type) {
    case 'KICK_OFF': return { text: `Kick-off! ${team} get us underway.`, tone: 'period' };
    case 'GOAL': {
      const assist = e.otherName ? `, set up by ${e.otherName}` : '';
      return { text: `GOAL! ${who} scores for ${team} with a ${shotType}${assist}. ${m.home}–${m.away}${xg}`, tone: 'goal' };
    }
    case 'SHOT_SAVED': return { text: `${big ? 'Big chance! ' : ''}${who}'s ${shotType} is saved by ${m.keeper ?? 'the keeper'}${xg}`, tone: 'chance' };
    case 'SHOT_OFF': return { text: `${big ? 'What a miss! ' : ''}${who} (${team}) sends a ${shotType} wide${xg}`, tone: big ? 'chance' : 'muted' };
    case 'SHOT_BLOCKED': return { text: `${who}'s ${shotType} is blocked${xg}`, tone: 'muted' };
    case 'BIG_CHANCE': return { text: `Big chance for ${team}!`, tone: 'chance' };
    case 'CORNER': return { text: `Corner to ${team}.`, tone: 'muted' };
    case 'FOUL': return { text: `Foul by ${who} on ${e.otherName ?? 'his man'}.`, tone: 'muted' };
    case 'PENALTY': return { text: `PENALTY to ${team}! ${who} steps up…`, tone: 'chance' };
    case 'OFFSIDE': return { text: `${who} is caught offside — ${team} lose it.`, tone: 'muted' };
    case 'YELLOW': return { text: `Yellow card: ${who} (${team}).`, tone: 'card' };
    case 'RED': return { text: m.secondYellow === 1 ? `Second yellow! ${who} (${team}) is sent off.` : `RED CARD! ${who} (${team}) is sent off.`, tone: 'red' };
    case 'INJURY': return { text: `${who} (${team}) goes down injured and can't continue.`, tone: 'injury' };
    case 'SUB': return { text: `Substitution ${team}: ${who} on, ${e.otherName ?? '?'} off.`, tone: 'sub' };
    case 'TACTIC_CHANGE': return { text: `Instructions updated — ${changesText(m.changes)}`, tone: 'tactic' };
    case 'AI_ADAPT': return { text: `${team} ${m.note ?? 'change shape'} (${changesText(m.changes)})`, tone: 'tactic' };
    case 'ROLE_CHANGE': return { text: `${who} switches role to ${String(m.role)}.`, tone: 'tactic' };
    case 'SHOUT': {
      const s = SHOUT_INFO[m.shout as ShoutType];
      return { text: `${team} touchline: "${s?.label ?? m.shout}!"`, tone: 'tactic' };
    }
    case 'SHOUT_END': return { text: `${team}'s ${SHOUT_INFO[m.shout as ShoutType]?.label ?? 'shout'} effect wears off.`, tone: 'muted' };
    case 'STAMINA_LOW': return { text: `${who} is running on fumes (${m.stamina}% stamina).`, tone: 'alert' };
    case 'ADDED_TIME': return { text: `The fourth official signals ${m.added} added minute${m.added === 1 ? '' : 's'}.`, tone: 'period' };
    case 'HALF_TIME': return { text: `Half-time. ${m.home}–${m.away}.`, tone: 'period' };
    case 'SECOND_HALF': return { text: `The second half is underway.`, tone: 'period' };
    case 'FULL_TIME': return { text: `Full-time! ${m.home}–${m.away}.`, tone: 'period' };
    case 'ATTACK': return { text: m.dribble === 1 ? `${who} dribbles into the final third ${LANE[Number(m.lane)] ?? ''}.` : `${team} work it into the final third ${LANE[Number(m.lane)] ?? ''} through ${who}.`, tone: 'muted' };
    case 'COUNTER': return { text: m.fromCorner === 1 ? `${team} clear the corner and break at speed!` : `${who} wins it and ${team} break forward quickly!`, tone: 'muted' };
    case 'TURNOVER': return { text: m.high === 1 ? `${who} presses ${e.otherName ?? 'the defender'} into a mistake high up the pitch!` : `${team} win the ball back.`, tone: 'muted' };
    case 'LONG_BALL': return { text: m.behind === 1 ? `${who} goes long — ${e.otherName ?? 'the striker'} is in behind!` : `${who} launches it forward${e.otherName ? ` towards ${e.otherName}` : ''}.`, tone: 'muted' };
  }
}

export const TONE_CLASS: Record<Tone, string> = {
  goal: 'text-emerald-300 font-semibold',
  chance: 'text-amber-200',
  card: 'text-amber-400',
  red: 'text-rose-400 font-semibold',
  injury: 'text-rose-300',
  sub: 'text-sky-300',
  tactic: 'text-violet-300',
  period: 'text-zinc-100 font-medium',
  alert: 'text-amber-300',
  muted: 'text-zinc-400'
};
