/**
 * Off-pitch micro-events: short two-choice dilemmas between rounds that move morale,
 * board confidence, fitness/sharpness or money. Stored as data; resolved here.
 */
import type { Player, Team } from '../types/domain.ts';
import type { Academy, ClubFinances, Dilemma, DilemmaKind } from '../types/club.ts';
import type { SeasonState } from '../types/league.ts';
import { playerOverall } from '../data/generators.ts';
import { addLedger } from './economy.ts';

export interface DilemmaWorld {
  user: Team;
  finances: ClubFinances;
  academy: Academy;
  season: SeasonState;
}

interface OptionDef {
  label: string;
  effect: string;
  apply: (w: DilemmaWorld, params: Record<string, string>) => string;
}

interface DilemmaDef {
  kind: DilemmaKind;
  title: string;
  text: (p: Record<string, string>) => string;
  /** Returns scenario params when the event fits the current situation, else null. */
  when: (w: DilemmaWorld, rand: () => number) => Record<string, string> | null;
  options: [OptionDef, OptionDef];
}

const clamp = (v: number, lo = 0, hi = 100): number => Math.max(lo, Math.min(hi, v));
const byId = (w: DilemmaWorld, id: string | undefined): Player | undefined => w.user.players.find(p => p.id === id);
const teamMorale = (w: DilemmaWorld, d: number, except?: string): void => { for (const p of w.user.players) if (p.id !== except) p.morale = clamp(p.morale + d, 20, 99); };
const board = (w: DilemmaWorld, d: number): void => { w.finances.boardConfidence = clamp(w.finances.boardConfidence + d); };
const pick = <T,>(xs: T[], rand: () => number): T | undefined => xs[Math.floor(rand() * xs.length)];
const lastResults = (w: DilemmaWorld): Array<'W' | 'D' | 'L'> => {
  const id = w.user.id;
  return w.season.fixtures.filter(f => f.result && (f.homeId === id || f.awayId === id)).sort((a, b) => a.round - b.round).slice(-3).map(f => {
    const us = f.homeId === id ? f.result!.home : f.result!.away, them = f.homeId === id ? f.result!.away : f.result!.home;
    return us > them ? 'W' : us < them ? 'L' : 'D';
  });
};

const DEFS: DilemmaDef[] = [
  {
    kind: 'PLAYING_TIME', title: 'Unhappy on the bench',
    text: p => `${p.name} knocks on your office door. He's barely played and says he's good enough to start.`,
    when: (w, rand) => {
      const xi = new Set(w.user.lineup.slots.map(s => s.playerId));
      const minApps = Math.max(1, Math.floor((w.season.round - 1) / 3));
      const unhappy = w.user.players.filter(p => !xi.has(p.id) && playerOverall(p) >= 68 && (w.season.playerStats[p.id]?.apps ?? 0) < minApps);
      const p = pick(unhappy, rand);
      return p ? { playerId: p.id, name: p.name } : null;
    },
    options: [
      { label: 'Promise him a chance', effect: 'His morale rises; the regulars feel a little less secure.', apply: (w, p) => { const pl = byId(w, p.playerId); if (pl) pl.morale = clamp(pl.morale + 15, 20, 99); teamMorale(w, -1, p.playerId); return `${p.name} leaves happy with your promise.`; } },
      { label: 'Tell him to earn it in training', effect: 'His morale drops, but the board likes the discipline.', apply: (w, p) => { const pl = byId(w, p.playerId); if (pl) pl.morale = clamp(pl.morale - 12, 20, 99); board(w, 2); return `${p.name} isn't happy, but the message is clear.`; } }
    ]
  },
  {
    kind: 'PRESS_TITLE', title: 'Press conference',
    text: () => 'A journalist asks if your team can win the league this season.',
    when: w => (w.season.round > 3 && w.season.round < w.season.rounds - 2 ? {} : null),
    options: [
      { label: '"We can beat anyone."', effect: 'Morale and board confidence up — expectations rise with them.', apply: w => { teamMorale(w, 4); board(w, 3); w.finances.expectedPosition = Math.max(1, w.finances.expectedPosition - 1); return 'The headline writes itself: "We can beat anyone."'; } },
      { label: '"One game at a time."', effect: 'A calm answer: a small morale lift, no extra pressure.', apply: w => { teamMorale(w, 1); return 'A measured answer; the dressing room appreciates it.'; } }
    ]
  },
  {
    kind: 'DRESSING_ROOM', title: 'Dressing-room row',
    text: p => `${p.a} and ${p.b} had a heated argument after training. The squad is watching how you handle it.`,
    when: (w, rand) => {
      const seniors = w.user.players.filter(p => p.age >= 26).sort((a, b) => playerOverall(b) - playerOverall(a)).slice(0, 6);
      if (seniors.length < 2) return null;
      const a = pick(seniors, rand)!; const b = pick(seniors.filter(x => x !== a), rand)!;
      return { aId: a.id, a: a.name, bId: b.id, b: b.name };
    },
    options: [
      { label: 'Side with the more senior player', effect: 'One of them feels backed, the other is hurt.', apply: (w, p) => { const [x, y] = [byId(w, p.aId), byId(w, p.bId)].sort((m, n) => (n?.age ?? 0) - (m?.age ?? 0)); if (x) x.morale = clamp(x.morale + 10, 20, 99); if (y) y.morale = clamp(y.morale - 15, 20, 99); return `You backed ${x?.name ?? 'the senior man'}; ${y?.name ?? 'the other'} sulks.`; } },
      { label: 'Fine them both', effect: '+€50K in fines, both lose morale, the board approves.', apply: (w, p) => { for (const id of [p.aId, p.bId]) { const pl = byId(w, id); if (pl) pl.morale = clamp(pl.morale - 6, 20, 99); } board(w, 3); addLedger(w.finances, { season: w.season.number, round: w.season.round - 1, kind: 'EVENT', label: 'Disciplinary fines', amount: 50_000 }); return 'Both players fined. Order restored.'; } }
    ]
  },
  {
    kind: 'FAN_PROTEST', title: 'Supporters protest',
    text: () => 'After a poor run, supporters are protesting outside the training ground.',
    when: w => (lastResults(w).filter(r => r === 'L').length >= 2 ? {} : null),
    options: [
      { label: 'Meet the supporters', effect: 'Board confidence and morale improve.', apply: w => { board(w, 5); teamMorale(w, 2); return 'You fronted up to the fans; the mood softens.'; } },
      { label: 'Stay focused on training', effect: 'The board does not like the silence.', apply: w => { board(w, -5); return 'The protest goes unanswered. The board is uneasy.'; } }
    ]
  },
  {
    kind: 'SPONSOR_DAY', title: 'Sponsor appearance',
    text: () => 'A sponsor offers €1.5M for a full promotional day with the first team this week.',
    when: w => (w.season.round > 2 ? {} : null),
    options: [
      { label: 'Accept the money', effect: '+€1.5M, but every player loses 6% fitness.', apply: w => { addLedger(w.finances, { season: w.season.number, round: w.season.round - 1, kind: 'EVENT', label: 'Sponsor promotional day', amount: 1_500_000 }); for (const p of w.user.players) p.fitness = clamp(p.fitness - 6, 20, 100); return 'Cheque banked; tired legs on the training pitch.'; } },
      { label: 'Protect the players', effect: 'Squad morale +2, no money.', apply: w => { teamMorale(w, 2); return 'You declined. The players appreciate it.'; } }
    ]
  },
  {
    kind: 'PAY_RISE', title: 'Contract demand',
    text: p => `${p.name}'s agent asks for a 25% pay rise, hinting at interest from rivals.`,
    when: (w, rand) => {
      const stars = [...w.user.players].sort((a, b) => playerOverall(b) - playerOverall(a)).slice(0, 4);
      const p = pick(stars, rand);
      return p ? { playerId: p.id, name: p.name } : null;
    },
    options: [
      { label: 'Give him the rise', effect: 'His morale soars; wage bill goes up 25% for him.', apply: (w, p) => { const pl = byId(w, p.playerId); if (pl) { pl.wage = Math.round(pl.wage * 1.25 / 500) * 500; pl.morale = clamp(pl.morale + 12, 20, 99); } return `${p.name} signs improved terms.`; } },
      { label: 'Refuse', effect: 'His morale drops sharply.', apply: (w, p) => { const pl = byId(w, p.playerId); if (pl) pl.morale = clamp(pl.morale - 15, 20, 99); return `${p.name} is unhappy with the refusal.`; } }
    ]
  },
  {
    kind: 'DOUBLE_SESSIONS', title: 'Training intensity',
    text: () => 'Your fitness coach wants double sessions this week to sharpen the squad.',
    when: () => ({}),
    options: [
      { label: 'Double sessions', effect: '+8 sharpness for everyone, −8% fitness.', apply: w => { for (const p of w.user.players) { p.sharpness = clamp(p.sharpness + 8); p.fitness = clamp(p.fitness - 8, 20, 100); } return 'A hard week: sharper, but heavier legs.'; } },
      { label: 'Light week', effect: '+6% fitness for everyone.', apply: w => { for (const p of w.user.players) p.fitness = clamp(p.fitness + 6, 0, 100); return 'A recovery week; the squad is fresher.'; } }
    ]
  },
  {
    kind: 'ACADEMY_CALLUP', title: 'Academy request',
    text: p => `Your academy director wants ${p.name} (${p.age}) to train with the first team.`,
    when: (w, rand) => { const p = pick(w.academy.prospects, rand); return p ? { playerId: p.id, name: p.name, age: String(p.age) } : null; },
    options: [
      { label: 'Let him train with the seniors', effect: 'The prospect develops faster (+2 now, +2 potential).', apply: (w, p) => { const pr = w.academy.prospects.find(x => x.id === p.playerId); if (pr) { for (const k of Object.keys(pr.attrs) as Array<keyof Player['attrs']>) pr.attrs[k] = Math.min(99, pr.attrs[k] + 2); pr.potential = Math.min(96, pr.potential + 2); pr.morale = clamp(pr.morale + 8, 20, 99); } return `${p.name} impresses in senior training.`; } },
      { label: 'Keep him with the youth team', effect: 'No disruption to the first team.', apply: (_w, p) => `${p.name} stays with the academy for now.` }
    ]
  },
  {
    kind: 'CAPTAIN_PRAISE', title: 'Captain speaks out',
    text: p => `${p.name} told the press the squad has never been more united.`,
    when: w => { if (!lastResults(w).includes('W')) return null; const c = [...w.user.players].sort((a, b) => b.age - a.age || playerOverall(b) - playerOverall(a))[0]; return c ? { name: c.name } : null; },
    options: [
      { label: 'Thank him publicly', effect: 'Squad morale +3.', apply: w => { teamMorale(w, 3); return 'The squad rallies behind the captain.'; } },
      { label: 'Keep expectations low', effect: 'Board confidence +2.', apply: w => { board(w, 2); return 'You play it down; the board likes the realism.'; } }
    ]
  },
  {
    kind: 'MEDIA_LEAK', title: 'Team news leaked',
    text: () => 'Your planned line-up has leaked to the media before the next match.',
    when: w => (w.season.round > 1 ? {} : null),
    options: [
      { label: 'Hunt down the leak', effect: 'Board +3, squad morale −3.', apply: w => { board(w, 3); teamMorale(w, -3); return 'An internal inquiry rattles the dressing room.'; } },
      { label: 'Laugh it off', effect: 'Squad morale +2, board −2.', apply: w => { teamMorale(w, 2); board(w, -2); return 'You joke about it at the press conference.'; } }
    ]
  }
];

const DEF_BY_KIND = new Map(DEFS.map(d => [d.kind, d]));

/** Roughly one round in four brings a dilemma. */
export function rollDilemma(w: DilemmaWorld, rand: () => number = Math.random): Dilemma | null {
  if (w.season.finished || rand() > 0.28) return null;
  const order = [...DEFS].sort(() => rand() - 0.5);
  for (const d of order) {
    const params = d.when(w, rand);
    if (params) return { id: `d_${w.season.number}_${w.season.round}_${d.kind}`, kind: d.kind, season: w.season.number, round: w.season.round, params };
  }
  return null;
}

export function describeDilemma(d: Dilemma): { title: string; text: string; options: Array<{ label: string; effect: string }> } {
  const def = DEF_BY_KIND.get(d.kind)!;
  return { title: def.title, text: def.text(d.params), options: def.options.map(o => ({ label: o.label, effect: o.effect })) };
}

export function resolveDilemma(prev: DilemmaWorld, d: Dilemma, choice: 0 | 1): { world: DilemmaWorld; outcome: string } {
  const w: DilemmaWorld = structuredClone(prev);
  const def = DEF_BY_KIND.get(d.kind)!;
  const outcome = def.options[choice].apply(w, d.params);
  return { world: w, outcome };
}
