/**
 * Season-to-season player lifecycle: growth toward potential, decline with age, retirements,
 * the youth academy intake, and keeping AI squads at full strength.
 */
import type { Player, PlayerAttributes, Position, Team } from '../types/domain.ts';
import type { Academy } from '../types/club.ts';
import { Rng } from '../engine/rng.ts';
import { generatePlayer, playerOverall, wageFor } from '../data/generators.ts';

const OUTFIELD_KEYS: Array<keyof PlayerAttributes> = ['pace', 'passing', 'vision', 'technique', 'finishing', 'longShots', 'tackling', 'positioning', 'workRate', 'stamina', 'strength', 'composure'];
const GK_KEYS: Array<keyof PlayerAttributes> = ['reflexes', 'handling', 'positioning', 'composure', 'passing'];
const clamp = (v: number): number => Math.max(1, Math.min(99, Math.round(v)));

/** Target overall change for one summer, by age and headroom. */
export function growthFor(p: Player, rng: Rng, prospect = false): number {
  const ovr = playerOverall(p);
  const headroom = Math.max(0, p.potential - ovr);
  let d: number;
  if (prospect || p.age <= 19) d = Math.min(headroom, 3 + rng.next() * 5);
  else if (p.age <= 21) d = Math.min(headroom, 2 + rng.next() * 4);
  else if (p.age <= 24) d = Math.min(headroom, rng.next() * 3);
  else if (p.age <= 28) d = Math.min(headroom, -1.2 + rng.next() * 2);
  else if (p.age <= 31) d = -3.2 + rng.next() * 2.5;
  else d = -6 + rng.next() * 3;
  return d;
}

/** Shift the player's relevant attributes so his overall moves by roughly `delta`. */
export function applyGrowth(p: Player, delta: number, rng: Rng): void {
  const keys = p.position === 'GK' ? GK_KEYS : OUTFIELD_KEYS;
  for (const k of keys) {
    // Physical attributes fade first with age; technical ones last
    const physical = k === 'pace' || k === 'stamina' || k === 'strength';
    const ageBias = delta < 0 && physical ? 1.4 : delta < 0 && !physical ? 0.7 : 1;
    p.attrs[k] = clamp(p.attrs[k] + delta * ageBias * (0.6 + rng.next() * 0.8));
  }
}

export interface LifecycleNews {
  user: string[];
}

/** Retire, develop and re-price every player; refill AI squads. Mutates the teams passed in. */
/**
 * `userDecline` scales the summer decline of the user's players (from the season's training load, see training.ts).
 * The user's players don't grow over the summer — they develop in training during the season instead.
 */
export function seasonLifecycle(user: Team, opponents: Team[], academy: Academy, seed: number, userDecline = 1): LifecycleNews {
  const rng = new Rng(seed);
  const news: LifecycleNews = { user: [] };
  const used = new Set([user, ...opponents].flatMap(t => t.players.map(p => p.name)));

  for (const t of [user, ...opponents]) {
    const keep: Player[] = [];
    for (const p of t.players) {
      const retire = p.age >= 37 || (p.age >= 35 && rng.chance(0.7)) || (p.age >= 34 && rng.chance(0.35));
      if (retire) {
        if (t.isUser) news.user.push(`${p.name} (${p.age}) has retired.`);
        continue;
      }
      const before = playerOverall(p);
      const g = growthFor(p, rng);
      applyGrowth(p, t.isUser ? (g > 0 ? 0 : g * userDecline) : g, rng);
      const after = playerOverall(p);
      if (t.isUser && Math.abs(after - before) >= 4) news.user.push(`${p.name} ${after > before ? 'improved' : 'declined'} over the summer (${before} → ${after}).`);
      p.wage = Math.max(p.wage, Math.round(wageFor(p) * 0.9 / 500) * 500);
      keep.push(p);
    }
    t.players = keep;
    // AI clubs turn over their squads: fading veterans below the squad median are let go for younger signings
    if (!t.isUser) {
      const median = [...keep].map(playerOverall).sort((x, y) => x - y)[Math.floor(keep.length / 2)] ?? 0;
      t.players = keep.filter(p => !(p.age >= 30 && playerOverall(p) < median && rng.chance(0.6)));
    }
    t.lineup = { slots: t.lineup.slots.map(s => (keep.some(p => p.id === s.playerId) ? s : { ...s, playerId: null })), bench: t.lineup.bench.filter(id => keep.some(p => p.id === id)) };
    if (!t.isUser) replenishSquad(t, rng, used);
  }

  for (const p of academy.prospects) applyGrowth(p, growthFor(p, rng, true), rng);
  return news;
}

const MIN_BY_POSITION: Record<Position, number> = { GK: 2, DEF: 6, MID: 6, FWD: 4 };

/** Keep an AI squad at 20 with sensible positional cover by signing generated players. */
export function replenishSquad(t: Team, rng: Rng, used: Set<string>): Player[] {
  const signed: Player[] = [];
  const nextShirt = (): number => { for (let n = 2; n < 60; n++) if (!t.players.some(p => p.shirt === n)) return n; return 99; };
  const add = (pos: Position): void => {
    const p = generatePlayer(rng, pos, t.level + rng.int(-2, 1), nextShirt(), used, { age: rng.int(18, 26) });
    t.players.push(p);
    signed.push(p);
  };
  for (const pos of Object.keys(MIN_BY_POSITION) as Position[]) {
    while (t.players.filter(p => p.position === pos).length < MIN_BY_POSITION[pos]) add(pos);
  }
  while (t.players.length < 20) add(rng.pick<Position>(['DEF', 'MID', 'FWD']));
  return signed;
}

/** Three to five academy prospects aged 15–17; roughly one in twelve is a genuine gem. */
export function youthIntake(season: number, seed: number, existingNames: Set<string>): Player[] {
  const rng = new Rng(seed);
  const count = rng.int(3, 5);
  const positions: Position[] = ['GK', 'DEF', 'DEF', 'MID', 'MID', 'MID', 'FWD', 'FWD'];
  return Array.from({ length: count }, (_, i) => {
    const gem = rng.chance(0.08);
    const p = generatePlayer(rng, rng.pick(positions), rng.int(42, 54), 60 + i, existingNames, {
      age: rng.int(15, 17), idPrefix: `y${season}`, ageNeutral: true, potentialBonus: gem ? rng.int(12, 18) : rng.int(0, 6)
    });
    p.wage = rng.int(2, 6) * 500;
    p.morale = rng.int(70, 85);
    return p;
  });
}

/** Scouting is imperfect: a potential range rather than the exact ceiling. */
export function potentialRange(p: Player): [number, number] {
  const ovr = playerOverall(p);
  // Established players have no hidden upside to scout
  if (p.age >= 26 || p.potential <= ovr + 1) return [ovr, ovr];
  const fuzz = p.age <= 18 ? 6 : p.age <= 21 ? 4 : 2;
  const mid = Math.round(p.potential / 2) * 2;
  return [Math.max(playerOverall(p), mid - fuzz), Math.min(99, mid + fuzz)];
}

export function potentialStars(p: Player): number {
  return Math.max(0.5, Math.min(5, Math.round(((p.potential - 50) / 9) * 2) / 2));
}
