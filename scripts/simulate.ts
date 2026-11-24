/**
 * Headless balance check: plays many matches with the pure engine.
 * Run: npm run sim   (Node 22+, uses native TypeScript stripping)
 */
import { MatchEngine } from '../src/engine/MatchEngine.ts';
import { generateWorld, autoLineup } from '../src/data/generators.ts';
import type { Team } from '../src/types/domain.ts';
import type { Tactics } from '../src/types/tactics.ts';

const OFF = { goal: false, redCard: false, injury: false, staminaBelow60: false, halfTime: false, subWindow65: false };

function play(home: Team, away: Team, seed: number) {
  const e = MatchEngine.fromSetup({ matchId: 'sim' + seed, seed, home, away, userSide: 'home', speed: 'X8', autoPause: OFF });
  e.start();
  let guard = 0;
  while (e.state.status !== 'FINISHED' && guard++ < 2000) e.step();
  return e.state;
}

function withTactics(t: Team, patch: Partial<Tactics>): Team {
  const tactics = { ...t.tactics, ...patch };
  return { ...t, tactics, lineup: autoLineup({ ...t, tactics }) };
}

const world = generateWorld(12345);
const N = Number(process.argv[2] ?? 300);
const agg = { goals: 0, shots: 0, sot: 0, xg: 0, big: 0, yellow: 0, red: 0, subs: 0, injuries: 0, corners: 0, offsides: 0, fouls: 0, homePoss: 0, draws: 0, homeWins: 0, minStamina: 0, ticks: 0 };
for (let i = 0; i < N; i++) {
  const opp = world.opponents[i % world.opponents.length]!;
  const s = play(world.user, opp, 1000 + i);
  for (const t of [s.home, s.away]) {
    agg.goals += t.score; agg.shots += t.stats.shots; agg.sot += t.stats.shotsOnTarget; agg.xg += t.stats.xg;
    agg.big += t.stats.bigChances; agg.yellow += t.stats.yellow; agg.red += t.stats.red; agg.subs += t.subsUsed;
    agg.corners += t.stats.corners; agg.fouls += t.stats.fouls; agg.offsides += t.stats.offsides;
  }
  agg.injuries += s.events.filter(e => e.type === 'INJURY').length;
  agg.homePoss += s.home.stats.possessionTicks / (s.home.stats.possessionTicks + s.away.stats.possessionTicks);
  if (s.home.score === s.away.score) agg.draws++; else if (s.home.score > s.away.score) agg.homeWins++;
  agg.minStamina += Math.min(...s.home.players.filter(p => p.status === 'PITCH').map(p => p.stamina));
  agg.ticks += s.tick;
}
const per = (v: number, d = 1) => (v / N / d).toFixed(2);
console.log(`--- ${N} matches (per team per match unless noted) ---`);
console.log(`goals ${per(agg.goals, 2)} | shots ${per(agg.shots, 2)} | on target ${per(agg.sot, 2)} | xG ${per(agg.xg, 2)} | big chances ${per(agg.big, 2)}`);
console.log(`yellows ${per(agg.yellow, 2)} | reds ${per(agg.red, 2)} | subs ${per(agg.subs, 2)} | corners ${per(agg.corners, 2)} | offsides ${per(agg.offsides, 2)} | fouls ${per(agg.fouls, 2)}`);
console.log(`injuries/match ${per(agg.injuries)} | user possession ${(agg.homePoss / N * 100).toFixed(1)}% | user W ${agg.homeWins} D ${agg.draws} | ticks/match ${per(agg.ticks)} | user min stamina at FT ${per(agg.minStamina)}`);

// Tactical matrix checks: identical squads, only tactics differ
function duel(label: string, a: Partial<Tactics>, b: Partial<Tactics>, M = 400) {
  const neutral: Tactics = { formation: '4-3-3', pressing: 'MID', defLine: 'STANDARD', buildUp: 'BALANCED', focus: 'BALANCED', mentality: 'BALANCED' };
  const base = { ...world.opponents[0]!, tactics: neutral };
  const A = withTactics({ ...base, id: 'A', shortName: 'A', identity: 'CUSTOM' }, a);
  const B = withTactics({ ...base, id: 'B', shortName: 'B', identity: 'CUSTOM' }, b);
  let ga = 0, gb = 0, xa = 0, xb = 0, pa = 0, wa = 0, wb = 0;
  for (let i = 0; i < M; i++) {
    const home = i % 2 === 0;
    const s = home ? play(A, B, 5000 + i) : play(B, A, 5000 + i);
    const ta = home ? s.home : s.away, tb = home ? s.away : s.home;
    ga += ta.score; gb += tb.score; xa += ta.stats.xg; xb += tb.stats.xg;
    pa += ta.stats.possessionTicks / (ta.stats.possessionTicks + tb.stats.possessionTicks);
    if (ta.score > tb.score) wa++; else if (tb.score > ta.score) wb++;
  }
  console.log(`${label.padEnd(44)} A xG ${(xa / M).toFixed(2)} vs B ${(xb / M).toFixed(2)} | goals ${(ga / M).toFixed(2)}-${(gb / M).toFixed(2)} | A poss ${(pa / M * 100).toFixed(0)}% | W-L ${wa}-${wb}`);
}
console.log('--- tactical matrix (A vs B, same squad) ---');
duel('mirror (control)', {}, {});
duel('High Press vs Short possession', { pressing: 'HIGH' }, { buildUp: 'SHORT', pressing: 'MID' });
duel('Direct vs High Press + High line', { buildUp: 'DIRECT' }, { pressing: 'HIGH', defLine: 'HIGH', buildUp: 'BALANCED' });
duel('Balanced vs High Press + High line (ctrl)', {}, { pressing: 'HIGH', defLine: 'HIGH' });
duel('Short vs High Press + High line', { buildUp: 'SHORT' }, { pressing: 'HIGH', defLine: 'HIGH' });
duel('Wings vs Low Block', { focus: 'WINGS' }, { pressing: 'LOW', defLine: 'DEEP' });
duel('Center vs Low Block', { focus: 'CENTER' }, { pressing: 'LOW', defLine: 'DEEP' });
duel('Wings vs Mid Block (control)', { focus: 'WINGS' }, {});
duel('Center vs Mid Block (control)', { focus: 'CENTER' }, {});
duel('All-Out Attack vs Counter', { mentality: 'ALL_OUT' }, { buildUp: 'COUNTER', mentality: 'DEFENSIVE' });
