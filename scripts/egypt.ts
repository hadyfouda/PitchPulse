/** Egyptian league check: estimated ratings per club, then a full simulated 38-round season. */
import { generateEgyptWorld } from '../src/data/egypt/world.ts';
import { playerOverall, teamOverall, matchdayTeam } from '../src/data/generators.ts';
import { MatchEngine } from '../src/engine/MatchEngine.ts';
import { computeTable, newSeason } from '../src/league/schedule.ts';
import { processRound, type LeagueWorld } from '../src/league/condition.ts';
import type { MatchSummary } from '../src/types/match.ts';
import { wageBill, formatMoney } from '../src/club/economy.ts';

const w = generateEgyptWorld(42, 'ahly');
const teams = [w.user, ...w.opponents];
for (const t of teams) {
  const top = [...t.players].sort((a, b) => playerOverall(b) - playerOverall(a)).slice(0, 3).map(p => `${p.name} ${playerOverall(p)}`).join(', ');
  console.log(`${t.shortName.padEnd(4)} XI ${teamOverall(t)} | squad ${t.players.length} | wages ${formatMoney(wageBill(t))}/wk | ${top}`);
}
let world: LeagueWorld = { user: w.user, opponents: w.opponents, season: newSeason(1, teams, 7) };
let seed = 1000;
while (!world.season.finished) {
  const all = [world.user, ...world.opponents];
  const byId = new Map(all.map(t => [t.id, t]));
  const sums = new Map<string, MatchSummary>();
  for (const f of world.season.fixtures.filter(x => x.round === world.season.round)) {
    const e = MatchEngine.fromSetup({ matchId: f.id, seed: seed++, home: matchdayTeam(byId.get(f.homeId)!, true), away: matchdayTeam(byId.get(f.awayId)!, true), userSide: 'home', speed: 'X8', autoPause: { goal: false, redCard: false, injury: false, staminaBelow60: false, halfTime: false, subWindow65: false } });
    e.start(); while (e.state.status !== 'FINISHED') e.step();
    sums.set(f.id, e.getSummary());
  }
  world = processRound(world, sums).world;
}
const table = computeTable([world.user, ...world.opponents], world.season.fixtures);
table.forEach((r, i) => console.log(`${String(i + 1).padStart(2)} ${r.shortName.padEnd(5)} ${String(r.pts).padStart(3)} pts  ${r.gf}-${r.ga}`));
const scorers = Object.values(world.season.playerStats).sort((a, b) => b.goals - a.goals).slice(0, 5);
console.log('Top scorers:', scorers.map(s => `${s.name} ${s.goals}`).join(', '));
