/** Headless season with the domestic cups: npm run cups */
import { generateEgyptWorld } from '../src/data/egypt/world.ts';
import { matchdayTeam } from '../src/data/generators.ts';
import { MatchEngine } from '../src/engine/MatchEngine.ts';
import { computeTable, newSeason } from '../src/league/schedule.ts';
import { processRound, type LeagueWorld } from '../src/league/condition.ts';
import { applyCupCondition, continentalEntrants, createCups, dueSlot, foreignTeams, groupTable, guestTeams, recordCupResults, superCupEntrants, tieAggregate, tiesAtSlot, CUP_NAMES } from '../src/club/cups.ts';
import { Rng } from '../src/engine/rng.ts';
import type { MatchSummary } from '../src/types/match.ts';
import type { CupState } from '../src/types/cups.ts';

const OFF = { goal: false, redCard: false, injury: false, staminaBelow60: false, halfTime: false, subWindow65: false };
const w = generateEgyptWorld(77, 'ahly');
const guests = guestTeams(5);
const foreign = foreignTeams(11);
let world: LeagueWorld = { user: w.user, opponents: w.opponents, season: newSeason(1, [w.user, ...w.opponents], 3) };
const league = [world.user, ...world.opponents];
let cups: CupState[] = createCups(1, 38, league, guests, league.slice(0, 4).map(t => t.id).map((id, i, a) => a[[0, 2, 1, 3][i]!]!), 9,
  { cl: ['egy_ahly', 'egy_pyramids'], cc: ['egy_zamalek', 'egy_masry'], foreign });
const rng = new Rng(4);
let seed = 1, cupMatches = 0, et = 0, pens = 0;
const sim = (hId: string, aId: string, id: string, ko: boolean, aggregate?: { home: number; away: number }): MatchSummary => {
  const all = new Map([...world.opponents, world.user, ...guests, ...foreign].map(t => [t.id, t]));
  const e = MatchEngine.fromSetup({ matchId: id, seed: seed++, home: matchdayTeam(all.get(hId)!, true), away: matchdayTeam(all.get(aId)!, true), userSide: 'home', speed: 'X8', autoPause: OFF, knockout: ko, aggregate });
  e.start(); while (e.state.status !== 'FINISHED') e.step();
  return e.getSummary();
};
while (!world.season.finished) {
  for (let slot = dueSlot(cups, world.season.round); slot !== null; slot = dueSlot(cups, world.season.round)) {
    const ties = tiesAtSlot(cups, slot);
    const sums = new Map(ties.map(t => [t.id, sim(t.homeId, t.awayId, t.id, t.knockout, tieAggregate(cups, t))]));
    for (const s of sums.values()) { cupMatches++; if (s.extraTime) et++; if (s.shootout) pens++; }
    cups = recordCupResults(cups, sums, rng);
    applyCupCondition([world.user, ...world.opponents, ...guests, ...foreign], ties, sums);
  }
  const byId = new Map([world.user, ...world.opponents].map(t => [t.id, t]));
  const sums = new Map<string, MatchSummary>();
  for (const f of world.season.fixtures.filter(x => x.round === world.season.round)) sums.set(f.id, sim(f.homeId, f.awayId, f.id, false));
  world = processRound(world, sums).world;
  void byId;
}
const name = (id: string | null): string => [...league, ...guests, ...foreign].find(t => t.id === id)?.name ?? '?';
for (const c of cups) {
  const unplayed = c.ties.filter(t => !t.result).length;
  console.log(`${CUP_NAMES[c.id]}: ${c.ties.length} ties, unplayed ${unplayed}, winner ${name(c.winnerId)} (beat ${name(c.runnerUpId)})`);
  for (const final of c.ties.filter(t => t.stageKey === 'F' || t.stageKey === 'F1' || t.stageKey === 'F2' || (c.id.startsWith('CAF') && t.stageKey.startsWith('SF'))))
    if (final.result) console.log(`   ${final.stageKey} ${name(final.homeId)} ${final.result.home}-${final.result.away} ${name(final.awayId)}${final.result.agg ? ` (agg ${final.result.agg.home}-${final.result.agg.away})` : ''}${final.result.et ? ' aet' : ''}${final.result.pens ? ` pens ${final.result.pens.home}-${final.result.pens.away}` : ''}`);
  const ko2 = c.ties.filter(t => t.leg === 2);
  const badAgg = ko2.filter(t => t.result && t.result.agg && t.result.winnerId !== (t.result.agg.home > t.result.agg.away ? t.homeId : t.result.agg.home < t.result.agg.away ? t.awayId : t.result.winnerId));
  if (ko2.length) console.log(`   two-legged ties ${ko2.length}, aggregate mismatches ${badAgg.length}, decided on pens ${ko2.filter(t => t.result?.pens).length}`);
  const egy = c.ties.filter(t => t.homeId.startsWith('egy_') || t.awayId.startsWith('egy_'));
  if (c.id.startsWith('CAF')) console.log('   Egyptian clubs reached:', [...new Set(egy.map(t => t.homeId.startsWith('egy_') ? t.homeId : t.awayId))].map(id => `${name(id)} → ${egy.filter(t => t.homeId === id || t.awayId === id).at(-1)?.stageKey}`).join(', '));
  const top = Object.values(c.scorers).sort((a, b) => b.goals - a.goals)[0];
  if (top) console.log(`   top scorer ${top.name} ${top.goals}`);
  if (c.groups) for (const g of Object.keys(c.groups)) console.log(`   Group ${g}: ` + groupTable(c, g).map(r => `${name(r.teamId).split(' ')[0]} ${r.pts}`).join(', '));
}
const table = computeTable([world.user, ...world.opponents], world.season.fixtures);
console.log(`cup matches ${cupMatches}, extra time ${et}, shootouts ${pens}; champion ${table[0]!.name}`);
console.log('next Super Cup:', superCupEntrants(table, cups.find(c => c.id === 'EGYPT_CUP')).map(name).join(', '));
const nextCaf = continentalEntrants(table, cups.find(c => c.id === 'EGYPT_CUP'));
console.log('next CAF: CL', nextCaf.cl.map(name).join(', '), '· CC', nextCaf.cc.map(name).join(', '));
console.log('foreign nationalities sample:', foreign[0]!.name, foreign[0]!.players.slice(0, 6).map(p => `${p.name} (${p.nationality})`).join(', '));
console.log('user fitness avg end:', (world.user.players.reduce((a, p) => a + p.fitness, 0) / world.user.players.length).toFixed(0));
