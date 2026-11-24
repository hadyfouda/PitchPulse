/** Balance check: a season of training (user) vs one summer of growth (AI), same players, by age band. */
import { Rng } from '../src/engine/rng.ts';
import { generatePlayer, playerOverall } from '../src/data/generators.ts';
import { applyGrowth, growthFor } from '../src/club/development.ts';
import { applyTraining, declineFactor, defaultTraining } from '../src/club/training.ts';
import type { Player, Position, Team } from '../src/types/domain.ts';
import type { TrainingState } from '../src/types/club.ts';

const rng = new Rng(7);
const used = new Set<string>();
const positions: Position[] = ['GK', 'DEF', 'DEF', 'MID', 'MID', 'FWD'];
const pool: Player[] = [];
for (let i = 0; i < 1800; i++) pool.push(generatePlayer(rng, positions[i % 6]!, 66, i % 99 + 1, used, { age: 17 + (i % 18) }));

const bands: Array<[string, number, number]> = [['17-19', 17, 19], ['20-21', 20, 21], ['22-24', 22, 24], ['25-28', 25, 28], ['29-31', 29, 31], ['32+', 32, 40]];

function userSeason(src: Player[], t0: TrainingState): number[] {
  const team = { players: structuredClone(src) } as Team;
  let t = structuredClone(t0);
  const r = new Rng(11);
  const before = team.players.map(playerOverall);
  for (let round = 1; round <= 22; round++) {
    for (const p of team.players) { p.injury = null; p.fitness = 90; }
    t = applyTraining(team, t, r, 1, round).training;
  }
  const df = declineFactor(t);
  for (const p of team.players) { const g = growthFor(p, r); applyGrowth(p, g > 0 ? 0 : g * df, r); }
  return team.players.map((p, i) => playerOverall(p) - before[i]!);
}
function aiSummer(src: Player[]): number[] {
  const ps = structuredClone(src); const r = new Rng(11);
  return ps.map(p => { const b = playerOverall(p); applyGrowth(p, growthFor(p, r), r); return playerOverall(p) - b; });
}

const setups: Array<[string, TrainingState]> = [
  ['Light L1', { ...defaultTraining(), intensity: 'LIGHT' }],
  ['Normal L1', defaultTraining()],
  ['Intense L1', { ...defaultTraining(), intensity: 'INTENSE' }],
  ['Intense L5', { ...defaultTraining(), intensity: 'INTENSE', facilities: 5 }]
];
const ai = aiSummer(pool);
const results = setups.map(([n, t]) => [n, userSeason(pool, t)] as const);
const mean = (xs: number[]): string => (xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length)).toFixed(2);
console.log('Mean overall change over one season, by age band');
console.log('band     AI summer   ' + results.map(([n]) => n.padEnd(11)).join(' '));
for (const [label, lo, hi] of bands) {
  const idx = pool.map((p, i) => (p.age >= lo && p.age <= hi ? i : -1)).filter(i => i >= 0);
  const pick = (xs: number[]) => idx.map(i => xs[i]!);
  console.log(label.padEnd(8) + ' ' + mean(pick(ai)).padStart(8) + '    ' + results.map(([, xs]) => mean(pick(xs)).padStart(8).padEnd(11)).join(' '));
}
const over = results.map(([n, xs]) => `${n}: ${pool.filter((p, i) => playerOverall(p) + xs[i]! > p.potential + 1).length} above potential+1`);
console.log(over.join(' · '));
