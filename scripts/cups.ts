/** Headless season with the domestic cups: npm run cups */
import { generateEgyptWorld } from '../src/data/egypt/world.ts';
import { matchdayTeam } from '../src/data/generators.ts';
import { MatchEngine } from '../src/engine/MatchEngine.ts';
import { computeTable, newSeason } from '../src/league/schedule.ts';
import { processRound, type LeagueWorld } from '../src/league/condition.ts';
import { applyCupCondition, createCups, dueSlot, groupTable, guestTeams, recordCupResults, superCupEntrants, tiesAtSlot, CUP_NAMES } from '../src/club/cups.ts';
import { Rng } from '../src/engine/rng.ts';
import type { MatchSummary } from '../src/types/match.ts';
import type { CupState } from '../src/types/cups.ts';

const OFF = { goal: false, redCard: false, injury: false, staminaBelow60: false, halfTime: false, subWindow65: false };
const w = generateEgyptWorld(77, 'ahly');
const guests = guestTeams(5);
let world: LeagueWorld = { user: w.user, opponents: w.opponents, season: newSeason(1, [w.user, ...w.opponents], 3) };
const league = [world.user, ...world.opponents];
let cups: CupState[] = createCups(1, 38, league, guests, league.slice(0, 4).map(t => t.id).map((id, i, a) => a[[0, 2, 1, 3][i]!]!), 9);
const rng = new Rng(4);
let seed = 1, cupMatches = 0, et = 0, pens = 0;
const sim = (hId: string, aId: string, id: string, ko: boolean): MatchSummary => {
  const all = new Map([...world.opponents, world.user, ...guests].map(t => [t.id, t]));
  const e = MatchEngine.fromSetup({ matchId: id, seed: seed++, home: matchdayTeam(all.get(hId)!, true), away: matchdayTeam(all.get(aId)!, true), userSide: 'home', speed: 'X8', autoPause: OFF, knockout: ko });
  e.start(); while (e.state.status !== 'FINISHED') e.step();
  return e.getSummary();
};
while (!world.season.finished) {
  for (let slot = dueSlot(cups, world.season.round); slot !== null; slot = dueSlot(cups, world.season.round)) {
    const ties = tiesAtSlot(cups, slot);
    const sums = new Map(ties.map(t => [t.id, sim(t.homeId, t.awayId, t.id, t.knockout)]));
    for (const s of sums.values()) { cupMatches++; if (s.extraTime) et++; if (s.shootout) pens++; }
    cups = recordCupResults(cups, sums, rng);
    applyCupCondition([world.user, ...world.opponents, ...guests], ties, sums);
  }
  const byId = new Map([world.user, ...world.opponents].map(t => [t.id, t]));
  const sums = new Map<string, MatchSummary>();
  for (const f of world.season.fixtures.filter(x => x.round === world.season.round)) sums.set(f.id, sim(f.homeId, f.awayId, f.id, false));
  world = processRound(world, sums).world;
  void byId;
}
const name = (id: string | null): string => [...league, ...guests].find(t => t.id === id)?.name ?? '?';
for (const c of cups) {
  const unplayed = c.ties.filter(t => !t.result).length;
  console.log(`${CUP_NAMES[c.id]}: ${c.ties.length} ties, unplayed ${unplayed}, winner ${name(c.winnerId)} (beat ${name(c.runnerUpId)})`);
  const final = c.ties.find(t => t.stageKey === 'F');
  if (final?.result) console.log(`   final ${name(final.homeId)} ${final.result.home}-${final.result.away} ${name(final.awayId)}${final.result.et ? ' aet' : ''}${final.result.pens ? ` pens ${final.result.pens.home}-${final.result.pens.away}` : ''}`);
  const top = Object.values(c.scorers).sort((a, b) => b.goals - a.goals)[0];
  if (top) console.log(`   top scorer ${top.name} ${top.goals}`);
  if (c.groups) for (const g of Object.keys(c.groups)) console.log(`   Group ${g}: ` + groupTable(c, g).map(r => `${name(r.teamId).split(' ')[0]} ${r.pts}`).join(', '));
}
const table = computeTable([world.user, ...world.opponents], world.season.fixtures);
console.log(`cup matches ${cupMatches}, extra time ${et}, shootouts ${pens}; champion ${table[0]!.name}`);
console.log('next Super Cup:', superCupEntrants(table, cups.find(c => c.id === 'EGYPT_CUP')).map(name).join(', '));
console.log('user fitness avg end:', (world.user.players.reduce((a, p) => a + p.fitness, 0) / world.user.players.length).toFixed(0));
