/** Headless multi-season career: economy, transfers, academy, dilemmas, development. npm run career */
import { MatchEngine } from '../src/engine/MatchEngine.ts';
import { autoLineup, generateWorld, matchdayTeam, playerOverall, repairLineup, teamOverall } from '../src/data/generators.ts';
import { computeTable, newSeason, positionOf } from '../src/league/schedule.ts';
import { processRound, startNextSeason, type LeagueWorld } from '../src/league/condition.ts';
import { applyRoundFinances, expectedPosition, formatMoney, initialFinances, seasonEndFinances, wageBill } from '../src/club/economy.ts';
import { seasonLifecycle, youthIntake } from '../src/club/development.ts';
import { affordability, bidsFor, buildMarket, evaluateOffer, evaluateWage, freeAgentPool, sellPlayer, signPlayer } from '../src/club/transfers.ts';
import { resolveDilemma, rollDilemma } from '../src/club/dilemmas.ts';
import type { MatchSummary } from '../src/types/match.ts';

const OFF = { goal: false, redCard: false, injury: false, staminaBelow60: false, halfTime: false, subWindow65: false };
const g = generateWorld(4242);
let world: LeagueWorld = { user: g.user, opponents: g.opponents, season: newSeason(1, [g.user, ...g.opponents], 7) };
const names = new Set([g.user, ...g.opponents].flatMap(t => t.players.map(p => p.name)));
let finances = initialFinances(world.user, [world.user, ...world.opponents]);
let academy = { prospects: youthIntake(1, 11, names), lastIntakeSeason: 1 };
let market = { freeAgents: freeAgentPool(12, names), season: 1 };
let seed = 1, dilemmas = 0;
const leagueOvr = () => { const ts = [world.user, ...world.opponents]; return (ts.reduce((a, t) => a + teamOverall(t), 0) / ts.length).toFixed(1); };
console.log(`start: balance ${formatMoney(finances.balance)}, budget ${formatMoney(finances.transferBudget)}, wages ${formatMoney(wageBill(world.user))}/wk of ${formatMoney(finances.wageBudget)}, expected ${finances.expectedPosition}th, league OVR ${leagueOvr()}, academy ${academy.prospects.length}`);

for (let s = 1; s <= 4; s++) {
  // Summer window: try to sign the best affordable upgrade, then sell the oldest squad player
  const entries = buildMarket(world.user, world.opponents, market).filter(e => !e.blocked && e.fit.delta >= 2).sort((a, b) => b.fit.delta - a.fit.delta);
  for (const e of entries) {
    let fee = e.clubId ? Math.round(e.asking * 0.85 / 50_000) * 50_000 : 0, attempt = 0, deal = false;
    while (attempt < 3) { const v = evaluateOffer(e, fee, attempt); if (v.status === 'ACCEPT') { deal = true; break; } if (v.status === 'REJECT') break; fee = v.counter; attempt++; }
    if (!deal || !evaluateWage(e, e.wageDemand).ok || affordability({ user: world.user, opponents: world.opponents, market, finances }, fee, e.wageDemand)) continue;
    const r = signPlayer({ user: world.user, opponents: world.opponents, market, finances }, e, fee, e.wageDemand, s, 1);
    ({ user: world.user, opponents: world.opponents, market, finances } = { ...world, ...r.world } as typeof r.world & LeagueWorld);
    world = { ...world, user: r.world.user, opponents: r.world.opponents }; market = r.world.market; finances = r.world.finances;
    console.log(`  S${s} window: ${r.news} (fit ${e.fit.label}, after ${attempt} counter${attempt === 1 ? '' : 's'})`);
    break;
  }
  const oldest = [...world.user.players].sort((a, b) => b.age - a.age)[0]!;
  const bids = bidsFor({ user: world.user, opponents: world.opponents, market, finances }, oldest.id, s * 31);
  if (typeof bids !== 'string' && bids[0]) {
    const r = sellPlayer({ user: world.user, opponents: world.opponents, market, finances }, oldest.id, bids[0], s, 1);
    world = { ...world, user: r.world.user, opponents: r.world.opponents }; finances = r.world.finances;
    console.log(`  S${s} window: ${r.news}`);
  }
  world.user.lineup = autoLineup(world.user);

  while (!world.season.finished) {
    const teams = new Map([world.user, ...world.opponents].map(t => [t.id, t]));
    const sums = new Map<string, MatchSummary>();
    for (const f of world.season.fixtures.filter(x => x.round === world.season.round)) {
      const e = MatchEngine.fromSetup({ matchId: f.id, seed: seed++, home: matchdayTeam(teams.get(f.homeId)!, true), away: matchdayTeam(teams.get(f.awayId)!, true), userSide: 'home', speed: 'X8', autoPause: OFF });
      e.start(); while (e.state.status !== 'FINISHED') e.step();
      sums.set(f.id, e.getSummary());
    }
    const uf = world.season.fixtures.find(f => f.round === world.season.round && (f.homeId === world.user.id || f.awayId === world.user.id))!;
    const sm = sums.get(uf.id)!; const home = uf.homeId === world.user.id;
    const opp = teams.get(home ? uf.awayId : uf.homeId)!;
    const round = world.season.round;
    world = processRound(world, sums).world;
    world.user.lineup = autoLineup(world.user);
    finances = applyRoundFinances(finances, world.user, { season: s, round, home, scored: home ? sm.home.score : sm.away.score, conceded: home ? sm.away.score : sm.home.score, userOvr: teamOverall(world.user), oppOvr: teamOverall(opp) });
    const d = rollDilemma({ user: world.user, finances, academy, season: world.season });
    if (d) { dilemmas++; const r = resolveDilemma({ user: world.user, finances, academy, season: world.season }, d, (seed % 2) as 0 | 1); world.user = r.world.user; finances = r.world.finances; academy = r.world.academy; }
  }
  const table = computeTable([world.user, ...world.opponents], world.season.fixtures);
  const pos = positionOf(table, world.user.id);
  const end = seasonEndFinances(finances, world.user, s, world.season.rounds, pos, 12);
  finances = end.finances;
  console.log(`Season ${s}: ${pos}th (expected ${finances.expectedPosition}) | balance ${formatMoney(finances.balance)} | board ${finances.boardConfidence.toFixed(0)} | next budget ${formatMoney(finances.transferBudget)} | wages ${formatMoney(wageBill(world.user))}/wk of ${formatMoney(finances.wageBudget)} | user OVR ${teamOverall(world.user)} | league OVR ${leagueOvr()} | squad ${world.user.players.length} | ${end.verdict}`);

  const life = seasonLifecycle(world.user, world.opponents, academy, 900 + s);
  world = startNextSeason(world, 77 + s);
  for (const t of world.opponents) t.lineup = autoLineup(t);
  world.user.lineup = repairLineup(world.user);
  for (const p of academy.prospects) p.age++;
  const grads = academy.prospects.filter(p => p.age >= 19);
  academy.prospects = academy.prospects.filter(p => p.age < 19);
  world.user.players.push(...grads.slice(0, Math.max(0, 25 - world.user.players.length)));
  const top = [...academy.prospects].sort((a, b) => playerOverall(b) - playerOverall(a))[0];
  academy.prospects.push(...youthIntake(s + 1, 300 + s, names));
  market = { freeAgents: freeAgentPool(500 + s, names), season: s + 1 };
  finances = { ...finances, expectedPosition: expectedPosition(world.user, [world.user, ...world.opponents]) };
  console.log(`  summer: ${life.user.length} user news (${life.user.filter(n => n.includes('retired')).length} retirements), ${grads.length} graduates, best prospect ${top ? `${top.name} ${playerOverall(top)}→pot ${top.potential}` : '-'}, dilemmas so far ${dilemmas}`);
}
