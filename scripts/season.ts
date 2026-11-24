/** Headless full-season check: npm run season */
import { MatchEngine } from '../src/engine/MatchEngine.ts';
import { generateWorld, matchdayTeam } from '../src/data/generators.ts';
import { newSeason, computeTable } from '../src/league/schedule.ts';
import { processRound, archiveSeason, startNextSeason, type LeagueWorld } from '../src/league/condition.ts';
import type { MatchSummary } from '../src/types/match.ts';

const OFF = { goal: false, redCard: false, injury: false, staminaBelow60: false, halfTime: false, subWindow65: false };
const gen = generateWorld(2024);
let world: LeagueWorld = { user: gen.user, opponents: gen.opponents, season: newSeason(1, [gen.user, ...gen.opponents], 99) };
const fx = world.season.fixtures;
const perTeam = new Map<string, number>();
for (const f of fx) { perTeam.set(f.homeId, (perTeam.get(f.homeId) ?? 0) + 1); perTeam.set(f.awayId, (perTeam.get(f.awayId) ?? 0) + 1); }
const pairs = new Set(fx.map(f => `${f.homeId}>${f.awayId}`));
console.log(`fixtures ${fx.length}, rounds ${world.season.rounds}, matches per team ${[...new Set(perTeam.values())].join('/')}, unique home-away pairs ${pairs.size}`);
const perRound = new Map<number, Set<string>>();
for (const f of fx) { const s = perRound.get(f.round) ?? new Set(); if (s.has(f.homeId) || s.has(f.awayId)) console.log('CLASH in round', f.round); s.add(f.homeId); s.add(f.awayId); perRound.set(f.round, s); }

let seed = 1, injuries = 0, bans = 0, userFitLog: string[] = [];
for (let season = 1; season <= 2; season++) {
  while (!world.season.finished) {
    const teams = new Map([world.user, ...world.opponents].map(t => [t.id, t]));
    const sums = new Map<string, MatchSummary>();
    for (const f of world.season.fixtures.filter(x => x.round === world.season.round)) {
      const home = matchdayTeam(teams.get(f.homeId)!, true), away = matchdayTeam(teams.get(f.awayId)!, true);
      const e = MatchEngine.fromSetup({ matchId: f.id, seed: seed++, home, away, userSide: 'home', speed: 'X8', autoPause: OFF });
      e.start(); while (e.state.status !== 'FINISHED') e.step();
      sums.set(f.id, e.getSummary());
    }
    const { world: next, report } = processRound(world, sums);
    world = next;
    injuries += report.news.filter(n => n.includes(' out for ')).length;
    bans += report.news.filter(n => n.includes('banned') || n.includes('suspended for')).length;
    if (season === 1 && report.round % 4 === 0) {
      const xi = world.user.players; const avg = xi.reduce((a, p) => a + p.fitness, 0) / xi.length;
      const unavailable = xi.filter(p => p.injury || p.suspension > 0).length;
      userFitLog.push(`R${report.round}: squad fitness ${avg.toFixed(0)} | min ${Math.min(...xi.map(p => p.fitness)).toFixed(0)} | unavailable ${unavailable} | ${report.positionAfter}th`);
    }
  }
  const arc = archiveSeason(world);
  const table = computeTable([world.user, ...world.opponents], world.season.fixtures);
  const totalGoals = table.reduce((a, r) => a + r.gf, 0);
  console.log(`\nSeason ${season}: champion ${arc.championName} (${table[0]!.pts} pts) | user ${arc.userPosition}th | goals/match ${(totalGoals / 132).toFixed(2)} | top scorer ${arc.topScorer?.name} ${arc.topScorer?.goals} | assists ${arc.topAssister?.name} ${arc.topAssister?.assists} | best ${arc.bestRated?.name} ${arc.bestRated?.rating}`);
  console.log('table:', table.map(r => `${r.shortName} ${r.pts}`).join(' · '), '| P sum', table.reduce((a, r) => a + r.p, 0), '| pts sum', table.reduce((a, r) => a + r.pts, 0));
  if (season === 1) { console.log(userFitLog.join('\n')); console.log(`user-club news: ${injuries} injuries, ${bans} bans in season 1`); }
  world = startNextSeason(world, 500 + season);
}
