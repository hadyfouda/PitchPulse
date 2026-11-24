/** Procedural players, squads and clubs. Pure functions over a seeded RNG. */
import type { Lineup, LineupSlot, Player, PlayerAttributes, Position, Team } from '../types/domain.ts';
import { isAvailable } from '../types/domain.ts';
import type { RoleId, SlotKind, Tactics, TacticalIdentity } from '../types/tactics.ts';
import { Rng } from '../engine/rng.ts';
import { FORMATION_SLOTS } from '../engine/formations.ts';
import { IDENTITIES, AI_IDENTITIES } from '../engine/identities.ts';
import { KIND_POSITION, ROLES_FOR_KIND, defaultRoleFor, positionFit } from '../engine/roles.ts';
import { CLUB_SEEDS, NAME_POOLS, type ClubSeed } from './names.ts';

const clamp = (v: number): number => Math.max(1, Math.min(99, Math.round(v)));

type AttrKey = keyof PlayerAttributes;
const EMPHASIS: Record<Position, Partial<Record<AttrKey, number>>> = {
  GK: { reflexes: 8, handling: 6, positioning: 4, composure: 2, finishing: -45, longShots: -40, tackling: -35, technique: -20, pace: -12, vision: -15 },
  DEF: { tackling: 8, positioning: 7, strength: 5, pace: 0, finishing: -22, longShots: -15, vision: -8, reflexes: -55, handling: -55 },
  MID: { passing: 7, vision: 6, workRate: 5, stamina: 5, technique: 4, finishing: -8, reflexes: -55, handling: -55 },
  FWD: { finishing: 9, composure: 5, pace: 5, technique: 4, tackling: -22, positioning: -6, reflexes: -55, handling: -55 }
};
const ATTR_KEYS: AttrKey[] = ['pace', 'passing', 'vision', 'technique', 'finishing', 'longShots', 'tackling', 'positioning', 'workRate', 'stamina', 'strength', 'composure', 'reflexes', 'handling'];

function naturalRoles(position: Position, a: PlayerAttributes, rng: Rng): RoleId[] {
  const scored: Array<[RoleId, number]> = [];
  const add = (r: RoleId, v: number): void => { scored.push([r, v + rng.range(-4, 4)]); };
  if (position === 'GK') { add('GK', a.handling); add('SK', a.passing + 25); }
  if (position === 'DEF') {
    add('CB', (a.tackling + a.strength) / 2); add('BPD', (a.passing + a.composure) / 2 + 2);
    add('FB', (a.pace + a.stamina) / 2); add('WB', (a.pace + a.stamina + a.passing) / 3);
    add('IFB', (a.passing + a.technique) / 2 - 4);
  }
  if (position === 'MID') {
    add('DM', (a.tackling + a.positioning) / 2); add('DLP', (a.passing + a.vision) / 2);
    add('B2B', (a.stamina + a.workRate) / 2); add('CM', (a.passing + a.workRate) / 2 - 2);
    add('AP', (a.vision + a.technique) / 2); add('WM', (a.pace + a.stamina) / 2 - 3);
  }
  if (position === 'FWD') {
    add('POACHER', a.finishing); add('TM', (a.strength + a.finishing) / 2);
    add('PF', (a.workRate + a.pace) / 2); add('W', (a.pace + a.passing) / 2);
    add('IF', (a.technique + a.finishing) / 2);
  }
  return scored.sort((x, y) => y[1] - x[1]).slice(0, position === 'GK' ? 2 : 3).map(([r]) => r);
}

export interface PlayerGenOptions {
  age?: number;
  /** Skip the age-based quality offset (academy prospects are generated at their own level). */
  ageNeutral?: boolean;
  idPrefix?: string;
  potentialBonus?: number;
}

export function generatePlayer(rng: Rng, position: Position, level: number, shirt: number, used: Set<string>, opts: PlayerGenOptions = {}): Player {
  let name = '';
  for (let i = 0; i < 20; i++) {
    const pool = rng.weighted(NAME_POOLS.map(p => [p, p.weight] as const));
    name = `${rng.pick(pool.first)} ${rng.pick(pool.last)}`;
    if (!used.has(name)) break;
  }
  used.add(name);
  const age = opts.age ?? rng.int(18, 34);
  // Young players start below their club's level and grow into it; veterans are past their peak
  const ageOffset = opts.ageNeutral ? 0 : age <= 20 ? -6 : age <= 23 ? -3 : age <= 29 ? 1 : age <= 32 ? 0 : -2;
  const quality = level + ageOffset + rng.range(-7, 7);
  const attrs = {} as PlayerAttributes;
  const emph = EMPHASIS[position];
  for (const k of ATTR_KEYS) attrs[k] = clamp(quality + (emph[k] ?? 0) + rng.range(-8, 8));
  if (position !== 'GK') attrs.stamina = clamp(attrs.stamina + 6);
  const p: Player = {
    id: `${opts.idPrefix ?? 'p'}_${(rng.next() * 1e9).toString(36).replace('.', '')}_${shirt}`,
    name, shirt, age, position, naturalRoles: naturalRoles(position, attrs, rng),
    attrs, fitness: 100, sharpness: 70, morale: rng.int(62, 80), injury: null, suspension: 0, seasonYellows: 0,
    wage: 0, potential: 0
  };
  const ovr = playerOverall(p);
  const headroom = age <= 20 ? rng.int(4, 14) : age <= 23 ? rng.int(2, 8) : age <= 27 ? rng.int(0, 3) : 0;
  p.potential = Math.min(96, ovr + headroom + (opts.potentialBonus ?? 0));
  p.wage = wageFor(p);
  return p;
}

let wageScale = 1;
/** Wage level of the current league (the Egyptian league pays less and carries bigger squads). Set on career load. */
export function setWageScale(scale: number): void { wageScale = scale; }

/** Weekly wage (€) a player of this level expects. */
export function wageFor(p: Player): number {
  const ovr = playerOverall(p);
  const base = Math.max(1500, Math.pow(Math.max(0, ovr - 42), 2) * 34);
  const ageAdj = p.age <= 19 ? 0.35 : p.age <= 21 ? 0.6 : p.age >= 32 ? 0.85 : 1;
  return Math.max(1000, Math.round((base * ageAdj * wageScale) / 500) * 500);
}

/** Transfer value (€) from level, age and headroom. */
export function playerValue(p: Player): number {
  const ovr = playerOverall(p);
  const base = Math.pow(Math.max(0, ovr - 48), 2) * 9500;
  const age = p.age <= 20 ? 1.35 : p.age <= 23 ? 1.2 : p.age <= 27 ? 1.05 : p.age <= 29 ? 0.85 : p.age <= 31 ? 0.6 : 0.35;
  const upside = 1 + Math.max(0, p.potential - ovr) * 0.03;
  return Math.max(50_000, Math.round((base * age * upside) / 50_000) * 50_000);
}

const SQUAD_SHAPE: Array<[Position, number]> = [['GK', 2], ['DEF', 7], ['MID', 6], ['FWD', 5]];

export function generateSquad(rng: Rng, level: number): Player[] {
  const used = new Set<string>();
  const shirts: Record<Position, number[]> = {
    GK: [1, 13], DEF: [2, 3, 4, 5, 6, 12, 15], MID: [8, 10, 14, 16, 18, 20], FWD: [7, 9, 11, 17, 19]
  };
  const players: Player[] = [];
  for (const [pos, n] of SQUAD_SHAPE) {
    for (let i = 0; i < n; i++) {
      const starterBoost = i < (pos === 'GK' ? 1 : n - 2) ? 3 : -3;
      players.push(generatePlayer(rng, pos, level + starterBoost, shirts[pos][i] ?? 30 + i, used));
    }
  }
  return players;
}

export const KIND_ATTRS: Record<SlotKind, AttrKey[]> = {
  GK: ['reflexes', 'handling', 'positioning'],
  CB: ['tackling', 'positioning', 'strength'],
  LB: ['pace', 'tackling', 'stamina', 'passing'], RB: ['pace', 'tackling', 'stamina', 'passing'],
  LWB: ['pace', 'stamina', 'passing', 'tackling'], RWB: ['pace', 'stamina', 'passing', 'tackling'],
  DM: ['tackling', 'positioning', 'passing'],
  CM: ['passing', 'vision', 'workRate'],
  AM: ['vision', 'technique', 'passing'],
  LM: ['pace', 'passing', 'stamina'], RM: ['pace', 'passing', 'stamina'],
  LW: ['pace', 'technique', 'finishing'], RW: ['pace', 'technique', 'finishing'],
  ST: ['finishing', 'composure', 'pace']
};

export function slotScore(p: Player, kind: SlotKind): number {
  const keys = KIND_ATTRS[kind];
  const avg = keys.reduce((s, k) => s + p.attrs[k], 0) / keys.length;
  return avg * positionFit(p.position, kind) * (0.6 + 0.4 * p.fitness / 100);
}

/** The slot kind that gives the player his overall (his best position). */
export function bestKind(p: Player): SlotKind {
  const kinds = (Object.keys(KIND_ATTRS) as SlotKind[]).filter(k => KIND_POSITION[k] === p.position);
  return kinds.reduce((a, b) => (slotScore({ ...p, fitness: 100 }, b) > slotScore({ ...p, fitness: 100 }, a) ? b : a));
}

export function playerOverall(p: Player): number {
  const best = (Object.keys(KIND_ATTRS) as SlotKind[]).filter(k => KIND_POSITION[k] === p.position);
  return Math.round(Math.max(...best.map(k => slotScore({ ...p, fitness: 100 }, k))));
}

export function teamOverall(team: Team): number {
  const ids = team.lineup.slots.map(s => s.playerId).filter((x): x is string => !!x);
  const ps = team.players.filter(p => ids.includes(p.id));
  if (!ps.length) return 0;
  return Math.round(ps.reduce((s, p) => s + playerOverall(p), 0) / ps.length);
}

/** Best XI for the current formation (greedy by slot importance) plus a 9-man bench. */
export function autoLineup(team: Pick<Team, 'players' | 'tactics' | 'identity'>, previous?: Lineup): Lineup {
  const slots = FORMATION_SLOTS[team.tactics.formation];
  const available = team.players.filter(p => isAvailable(p));
  const pref = team.identity !== 'CUSTOM' ? IDENTITIES[team.identity].roles : {};
  // Global greedy: best (player, slot) pairs first, so a forward isn't spent at AM while ST gets a midfielder
  const pairs: Array<{ p: Player; slot: number; score: number }> = [];
  slots.forEach((s, i) => {
    for (const p of available) {
      if ((s.kind === 'GK') !== (p.position === 'GK')) continue;
      pairs.push({ p, slot: i, score: slotScore(p, s.kind) });
    }
  });
  pairs.sort((a, b) => b.score - a.score);
  const taken = new Set<string>();
  const chosen = new Map<number, Player>();
  for (const pr of pairs) {
    if (taken.has(pr.p.id) || chosen.has(pr.slot)) continue;
    taken.add(pr.p.id);
    chosen.set(pr.slot, pr.p);
  }
  const result: LineupSlot[] = slots.map((s, i) => {
    const best = chosen.get(i);
    const prevRole = previous?.slots.find(x => x.slot === i && x.kind === s.kind)?.role;
    const prefRole = pref[s.kind];
    const role = prevRole && ROLES_FOR_KIND[s.kind].includes(prevRole) ? prevRole
      : prefRole && ROLES_FOR_KIND[s.kind].includes(prefRole) ? prefRole
        : defaultRoleFor(s.kind, best?.naturalRoles ?? []);
    return { slot: i, kind: s.kind, playerId: best?.id ?? null, role };
  });
  result.sort((a, b) => a.slot - b.slot);
  const rest = available.filter(p => !taken.has(p.id)).sort((a, b) => playerOverall(b) - playerOverall(a));
  const gk = rest.find(p => p.position === 'GK');
  const bench = [...(gk ? [gk] : []), ...rest.filter(p => p !== gk)].slice(0, 9).map(p => p.id);
  return { slots: result, bench };
}

/** Re-map an existing lineup onto a new formation, keeping players where sensible. */
export function adaptLineup(team: Team, tactics: Tactics): Lineup {
  const keep = team.lineup.slots.map(s => s.playerId).filter((x): x is string => !!x);
  const pool = team.players.filter(p => keep.includes(p.id));
  const starters = autoLineup({ ...team, tactics, players: pool });
  const startIds = new Set(starters.slots.map(s => s.playerId));
  const bench = [...team.lineup.bench, ...keep].filter(id => !startIds.has(id));
  return { slots: starters.slots, bench: [...new Set(bench)].slice(0, 9) };
}

function makeTeam(rng: Rng, seed: ClubSeed, identity: TacticalIdentity, level: number, isUser: boolean, index: number): Team {
  const tactics: Tactics = identity === 'CUSTOM'
    ? { formation: '4-3-3', pressing: 'MID', defLine: 'STANDARD', buildUp: 'BALANCED', focus: 'BALANCED', mentality: 'BALANCED' }
    : { ...IDENTITIES[identity].tactics };
  const players = generateSquad(rng, level);
  const base = { players, tactics, identity };
  return {
    id: `club_${index}`, name: seed.name, shortName: seed.short,
    colors: { primary: seed.primary, secondary: seed.secondary },
    identity, level, players, tactics, lineup: autoLineup(base), isUser
  };
}

export interface World {
  user: Team;
  opponents: Team[];
}

/** User club + 11 AI clubs, each with a distinct tactical identity. */
export function generateWorld(seed: number, userClubIndex = 0): World {
  const rng = new Rng(seed);
  const userSeed = CLUB_SEEDS[userClubIndex] ?? CLUB_SEEDS[0]!;
  const user = makeTeam(rng, userSeed, 'CUSTOM', 66, true, 0);
  const opponents = CLUB_SEEDS.filter(c => c !== userSeed).map((c, i) => {
    const identity = AI_IDENTITIES[i % AI_IDENTITIES.length] ?? 'GEGENPRESS';
    return makeTeam(rng, c, identity, rng.int(60, 71), false, i + 1);
  });
  return { user, opponents };
}

export interface LineupIssue {
  slot: number;
  kind: SlotKind;
  playerId: string | null;
  reason: string;
}

/** Starters who can't play (injured, suspended, missing) — the Kick off button stays locked until fixed. */
export function lineupIssues(team: Team): LineupIssue[] {
  const byId = new Map(team.players.map(p => [p.id, p]));
  const issues: LineupIssue[] = [];
  for (const s of team.lineup.slots) {
    const p = s.playerId ? byId.get(s.playerId) : undefined;
    if (!p) issues.push({ slot: s.slot, kind: s.kind, playerId: null, reason: 'No player selected' });
    else if (p.injury) issues.push({ slot: s.slot, kind: s.kind, playerId: p.id, reason: `${p.name} is injured (${p.injury.label}, ${p.injury.matchesOut} more)` });
    else if (p.suspension > 0) issues.push({ slot: s.slot, kind: s.kind, playerId: p.id, reason: `${p.name} is suspended (${p.suspension} more)` });
  }
  return issues;
}

/** Replace only the unavailable starters with the best available fits; keeps every manual choice that is still valid. */
export function repairLineup(team: Team): Lineup {
  const issues = new Set(lineupIssues(team).map(i => i.slot));
  const slots = team.lineup.slots.map(s => ({ ...s }));
  const used = new Set(slots.filter(s => !issues.has(s.slot)).map(s => s.playerId).filter((x): x is string => !!x));
  for (const s of slots) {
    if (!issues.has(s.slot)) continue;
    const best = team.players
      .filter(p => isAvailable(p) && !used.has(p.id) && ((s.kind === 'GK') === (p.position === 'GK')))
      .sort((a, b) => slotScore(b, s.kind) - slotScore(a, s.kind))[0];
    s.playerId = best?.id ?? null;
    if (best) used.add(best.id);
  }
  const bench = [...team.lineup.bench, ...team.players.map(p => p.id)]
    .filter((id, i, arr) => arr.indexOf(id) === i && !used.has(id))
    .filter(id => { const p = team.players.find(x => x.id === id); return !!p && isAvailable(p); })
    .slice(0, 9);
  return { slots, bench };
}

/** The squad a team actually takes into a match: AI clubs re-pick (rotation via fitness), humans keep their XI. */
export function matchdayTeam(team: Team, asAi = !team.isUser): Team {
  if (asAi && team.identity !== 'CUSTOM') return { ...team, lineup: autoLineup(team) };
  const lineup = repairLineup(team);
  return { ...team, lineup, isUser: asAi ? false : team.isUser };
}
