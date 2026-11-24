/**
 * Everything that happens between two league rounds: fatigue and recovery, match sharpness,
 * injuries and their recovery, yellow-card accumulation and red-card bans, season stats.
 * Pure functions over plain data so the whole season loop can be tested from Node.
 */
import type { Player, Team } from '../types/domain.ts';
import type { MatchSummary, PlayerSummary } from '../types/match.ts';
import type { RoundReport, SeasonArchive, SeasonState } from '../types/league.ts';
import { computeTable, newSeason, ordinal, positionOf } from './schedule.ts';

export interface LeagueWorld {
  user: Team;
  opponents: Team[];
  season: SeasonState;
}

const MINOR_INJURIES = ['ankle knock', 'tight hamstring', 'dead leg', 'bruised ribs', 'calf tightness'];
const MAJOR_INJURIES = ['hamstring tear', 'ankle ligament damage', 'groin strain', 'knee sprain', 'fractured metatarsal'];

/** Fitness lost for a full 90 minutes (≈24 for an average engine). */
export const fatigueFor = (p: Player, minutes: number): number => (minutes / 90) * (34 - p.attrs.stamina * 0.14);
/**
 * Fitness after the week between two rounds: recovers a share of what is missing, so an ever-present
 * starter settles around 75–82% instead of sliding forever. Better engines recover faster.
 */
export const recoverFitness = (p: Player): number => {
  const k = (0.45 + p.attrs.stamina * 0.0015) * (p.injury ? 0.6 : 1);
  return Math.min(100, p.fitness + (100 - p.fitness) * k + 1);
};

export function defaultCondition(p: Partial<Player>): Pick<Player, 'sharpness' | 'injury' | 'suspension' | 'seasonYellows'> {
  return { sharpness: p.sharpness ?? 70, injury: p.injury ?? null, suspension: p.suspension ?? 0, seasonYellows: p.seasonYellows ?? 0 };
}

const isDetailed = (p: MatchSummary['home']['players'][number]): p is PlayerSummary => 'stats' in p;

/**
 * Apply one completed round. `summaries` maps fixture id → match summary for every fixture in the round.
 * `rand` is injectable for tests.
 */
export function processRound(world: LeagueWorld, summaries: ReadonlyMap<string, MatchSummary>, rand: () => number = Math.random): { world: LeagueWorld; report: RoundReport } {
  const w: LeagueWorld = structuredClone(world);
  const teams = [w.user, ...w.opponents];
  const byId = new Map(teams.map(t => [t.id, t]));
  const season = w.season;
  const round = season.round;
  const news: string[] = [];
  const userName = (p: Player): string => p.name;
  const tableBefore = computeTable(teams, season.fixtures);
  const positionBefore = positionOf(tableBefore, w.user.id);

  // 1. Bans served and injuries counted down for this round (those players were unavailable)
  for (const t of teams) {
    for (const p of t.players) {
      if (p.suspension > 0) {
        p.suspension--;
        if (p.suspension === 0 && t.isUser) news.push(`${userName(p)} has served his suspension.`);
      }
      if (p.injury) {
        p.injury.matchesOut--;
        if (p.injury.matchesOut <= 0) {
          if (t.isUser) news.push(`${userName(p)} is back from his ${p.injury.label}.`);
          p.injury = null;
          p.fitness = Math.min(p.fitness, 82);
        }
      }
    }
  }

  // 2. Results, fatigue, sharpness, discipline, new injuries, season stats
  const results: RoundReport['results'] = [];
  for (const f of season.fixtures.filter(x => x.round === round)) {
    const sm = summaries.get(f.id);
    if (!sm) continue;
    f.result = { home: sm.home.score, away: sm.away.score, matchId: sm.id };
    results.push({ fixtureId: f.id, homeId: f.homeId, awayId: f.awayId, home: sm.home.score, away: sm.away.score });
    const all = [...sm.home.players, ...sm.away.players].filter(isDetailed).filter(p => p.stats.ticks > 0);
    const motm = [...all].sort((a, b) => b.rating - a.rating)[0];

    for (const [teamId, side] of [[f.homeId, sm.home], [f.awayId, sm.away]] as const) {
      const team = byId.get(teamId);
      if (!team) continue;
      const own = side.score, opp = side === sm.home ? sm.away.score : sm.home.score;
      const moraleDelta = own > opp ? 4 : own < opp ? -4 : 0;
      const playedIds = new Set<string>();
      for (const ps of side.players) {
        if (!isDetailed(ps) || ps.stats.ticks <= 0) continue;
        const p = team.players.find(x => x.id === ps.id);
        if (!p) continue;
        playedIds.add(p.id);
        const minutes = ps.stats.ticks / 6;
        p.fitness = Math.max(20, p.fitness - fatigueFor(p, minutes));
        p.sharpness = Math.min(100, p.sharpness + (minutes / 90) * 14);

        const st = (season.playerStats[p.id] ??= { playerId: p.id, teamId: team.id, name: p.name, apps: 0, minutes: 0, goals: 0, assists: 0, ratingSum: 0, yellows: 0, reds: 0, motm: 0 });
        st.teamId = team.id;
        st.apps++; st.minutes += Math.round(minutes); st.goals += ps.goals; st.assists += ps.assists; st.ratingSum += ps.rating;
        if (motm && motm.id === p.id) st.motm++;

        if (ps.status === 'SENT_OFF') {
          const secondYellow = sm.events.some(e => e.type === 'RED' && e.playerId === p.id && e.meta?.secondYellow === 1);
          const ban = secondYellow ? 1 : 2;
          p.suspension += ban;
          st.reds++;
          if (team.isUser) news.push(`${p.name} is suspended for ${ban} match${ban > 1 ? 'es' : ''} (${secondYellow ? 'second yellow' : 'straight red'}).`);
        } else if (ps.yellow > 0) {
          const before = p.seasonYellows;
          p.seasonYellows += ps.yellow;
          st.yellows += ps.yellow;
          for (const threshold of [5, 10, 15]) {
            if (before < threshold && p.seasonYellows >= threshold) {
              const ban = threshold / 5;
              p.suspension += ban;
              if (team.isUser) news.push(`${p.name} reaches ${threshold} yellow cards — banned for ${ban} match${ban > 1 ? 'es' : ''}.`);
            }
          }
        }
        if (ps.injured) {
          const major = rand() < 0.25;
          const pool = major ? MAJOR_INJURIES : MINOR_INJURIES;
          const out = major ? 3 + Math.floor(rand() * 5) : 1 + Math.floor(rand() * 2);
          p.injury = { severity: major ? 'MAJOR' : 'MINOR', label: pool[Math.floor(rand() * pool.length)] ?? 'knock', matchesOut: out };
          p.fitness = Math.min(p.fitness, 70);
          if (team.isUser) news.push(`${p.name} has a ${p.injury.label} — out for ${out} match${out > 1 ? 'es' : ''}.`);
        }
      }
      for (const p of team.players) {
        if (!playedIds.has(p.id)) p.sharpness = Math.max(30, p.sharpness - 5);
        p.morale = Math.max(30, Math.min(95, p.morale + moraleDelta));
      }
    }
  }

  // 3. Recovery until the next round
  for (const t of teams) for (const p of t.players) p.fitness = recoverFitness(p);

  season.round++;
  if (season.round > season.rounds) season.finished = true;
  const positionAfter = positionOf(computeTable(teams, season.fixtures), w.user.id);
  const report: RoundReport = { round, results, news, positionBefore, positionAfter };
  season.lastReport = report;
  return { world: w, report };
}

export function archiveSeason(world: LeagueWorld): SeasonArchive {
  const teams = [world.user, ...world.opponents];
  const table = computeTable(teams, world.season.fixtures);
  const teamName = new Map(teams.map(t => [t.id, t.shortName]));
  const stats = Object.values(world.season.playerStats);
  const top = <K extends 'goals' | 'assists'>(k: K) => {
    const best = [...stats].sort((a, b) => b[k] - a[k] || a.minutes - b.minutes)[0];
    return best && best[k] > 0 ? { name: best.name, team: teamName.get(best.teamId) ?? '', value: best[k] } : null;
  };
  const scorer = top('goals'), assister = top('assists');
  const rated = stats.filter(s => s.apps >= Math.ceil(world.season.rounds / 2)).sort((a, b) => b.ratingSum / b.apps - a.ratingSum / a.apps)[0];
  return {
    id: world.season.number, finishedAt: Date.now(), table,
    championId: table[0]?.teamId ?? '', championName: table[0]?.name ?? '',
    userTeamId: world.user.id, userPosition: positionOf(table, world.user.id),
    topScorer: scorer ? { name: scorer.name, team: scorer.team, goals: scorer.value } : null,
    topAssister: assister ? { name: assister.name, team: assister.team, assists: assister.value } : null,
    bestRated: rated ? { name: rated.name, team: teamName.get(rated.teamId) ?? '', rating: Math.round((rated.ratingSum / rated.apps) * 100) / 100 } : null
  };
}

/** Summer break: everyone recovers, bans and yellows reset, a year older, new fixtures. */
export function startNextSeason(world: LeagueWorld, seed: number): LeagueWorld {
  const w: LeagueWorld = structuredClone(world);
  const teams = [w.user, ...w.opponents];
  for (const t of teams) for (const p of t.players) {
    p.fitness = 100; p.sharpness = 65; p.injury = null; p.suspension = 0; p.seasonYellows = 0; p.age++;
  }
  w.season = newSeason(world.season.number + 1, teams, seed);
  return w;
}

export function describeRound(report: RoundReport): string {
  if (report.round === 1) return ordinal(report.positionAfter);
  const d = report.positionBefore - report.positionAfter;
  const move = d > 0 ? `up ${d}` : d < 0 ? `down ${-d}` : 'no change';
  return `${ordinal(report.positionAfter)} (${move})`;
}
