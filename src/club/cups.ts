/**
 * Domestic cups for the Egyptian league: Egyptian Super Cup (4 clubs), Egypt Cup (32-club knockout with
 * lower-division guests) and League Cup (4 groups of 5, then knockout).
 *
 * Every tie has a calendar `slot`: k + fraction means "played after league round k". Ties are created stage by
 * stage — the next stage is drawn as soon as the previous one is complete. Pure functions over plain data.
 */
import type { Player, Team } from '../types/domain.ts';
import type { MatchSummary, PlayerSummary } from '../types/match.ts';
import type { CupId, CupStage, CupState, CupTie, CupsRecord } from '../types/cups.ts';
import type { TacticalIdentity, Tactics } from '../types/tactics.ts';
import { Rng } from '../engine/rng.ts';
import { AI_IDENTITIES, IDENTITIES } from '../engine/identities.ts';
import { autoLineup, generateSquad, teamOverall } from '../data/generators.ts';
import { fatigueFor } from '../league/condition.ts';

export const CUP_NAMES: Record<CupId, string> = { SUPER: 'Egyptian Super Cup', EGYPT_CUP: 'Egypt Cup', LEAGUE_CUP: 'League Cup' };
export const CUP_SHORT: Record<CupId, string> = { SUPER: 'Super Cup', EGYPT_CUP: 'Egypt Cup', LEAGUE_CUP: 'League Cup' };

/** Prize money for the user's club (€). */
export const CUP_PRIZES: Record<CupId, { tieWin: number; groupWin: number; winner: number; runnerUp: number }> = {
  SUPER: { tieWin: 300_000, groupWin: 0, winner: 1_500_000, runnerUp: 600_000 },
  EGYPT_CUP: { tieWin: 250_000, groupWin: 0, winner: 3_000_000, runnerUp: 1_200_000 },
  LEAGUE_CUP: { tieWin: 200_000, groupWin: 80_000, winner: 1_500_000, runnerUp: 600_000 }
};

/** Calendar for a 38-round season (scaled for shorter seasons). */
const STAGES: Record<CupId, CupStage[]> = {
  SUPER: [
    { key: 'SF', label: 'Semi-finals', slot: 0.2, kind: 'KO', neutral: true },
    { key: 'F', label: 'Final', slot: 0.4, kind: 'KO', neutral: true }
  ],
  EGYPT_CUP: [
    { key: 'R32', label: 'Round of 32', slot: 3.5, kind: 'KO' },
    { key: 'R16', label: 'Round of 16', slot: 8.5, kind: 'KO' },
    { key: 'QF', label: 'Quarter-finals', slot: 14.5, kind: 'KO' },
    { key: 'SF', label: 'Semi-finals', slot: 23.5, kind: 'KO', neutral: true },
    { key: 'F', label: 'Final', slot: 36.5, kind: 'KO', neutral: true }
  ],
  LEAGUE_CUP: [
    { key: 'G1', label: 'Group matchday 1', slot: 1.5, kind: 'GROUP', matchday: 1 },
    { key: 'G2', label: 'Group matchday 2', slot: 5.5, kind: 'GROUP', matchday: 2 },
    { key: 'G3', label: 'Group matchday 3', slot: 10.5, kind: 'GROUP', matchday: 3 },
    { key: 'G4', label: 'Group matchday 4', slot: 16.5, kind: 'GROUP', matchday: 4 },
    { key: 'G5', label: 'Group matchday 5', slot: 20.5, kind: 'GROUP', matchday: 5 },
    { key: 'QF', label: 'Quarter-finals', slot: 26.5, kind: 'KO' },
    { key: 'SF', label: 'Semi-finals', slot: 30.5, kind: 'KO', neutral: true },
    { key: 'F', label: 'Final', slot: 34.5, kind: 'KO', neutral: true }
  ]
};

/** Lower-division clubs invited to the Egypt Cup (squads are generated). */
const GUESTS: Array<{ name: string; short: string; primary: string; secondary: string; level: number }> = [
  { name: 'Ismaily SC', short: 'ISM', primary: '#facc15', secondary: '#1d4ed8', level: 61 },
  { name: 'Pharco FC', short: 'PHA', primary: '#0ea5e9', secondary: '#f8fafc', level: 60 },
  { name: 'Haras El Hodoud', short: 'HRS', primary: '#166534', secondary: '#f8fafc', level: 60 },
  { name: 'Kahrabaa Ismailia', short: 'KAH', primary: '#f59e0b', secondary: '#111827', level: 59 },
  { name: 'El Dakhleya', short: 'DAK', primary: '#1e3a8a', secondary: '#f8fafc', level: 58 },
  { name: 'Tanta SC', short: 'TAN', primary: '#dc2626', secondary: '#facc15', level: 57 },
  { name: 'El Mansoura', short: 'MNS', primary: '#2563eb', secondary: '#facc15', level: 57 },
  { name: 'Al Nasr', short: 'NSR', primary: '#ea580c', secondary: '#111827', level: 56 },
  { name: 'Aswan SC', short: 'ASW', primary: '#b91c1c', secondary: '#f8fafc', level: 56 },
  { name: 'La Viena', short: 'LAV', primary: '#7c3aed', secondary: '#f8fafc', level: 55 },
  { name: 'Telecom Egypt', short: 'TEL', primary: '#0f766e', secondary: '#f8fafc', level: 55 },
  { name: 'Montakhab Suez', short: 'MSZ', primary: '#1d4ed8', secondary: '#dc2626', level: 55 }
];

export function guestTeams(seed: number): Team[] {
  const rng = new Rng(seed);
  return GUESTS.map((g, i) => {
    const identity: TacticalIdentity = AI_IDENTITIES[(i * 3) % AI_IDENTITIES.length] ?? 'COUNTER_ATTACK';
    const tactics: Tactics = { ...IDENTITIES[identity].tactics };
    const players = generateSquad(rng, g.level).map(p => ({ ...p, id: `guest${i}_${p.id}` })) as Player[];
    const base = { players, tactics, identity };
    return {
      id: `guest_${i}`, name: g.name, shortName: g.short, colors: { primary: g.primary, secondary: g.secondary },
      identity, level: g.level, players, tactics, lineup: autoLineup(base), isUser: false
    };
  });
}

const shuffle = <T,>(arr: readonly T[], rng: Rng): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng.next() * (i + 1)); [a[i], a[j]] = [a[j]!, a[i]!]; }
  return a;
};

function stagesFor(id: CupId, rounds: number): CupStage[] {
  const k = rounds / 38;
  return STAGES[id].map(s => ({ ...s, slot: s.slot < 1 ? s.slot : Math.round(s.slot * k) + 0.5 }));
}

function tie(cup: CupState, stage: CupStage, homeId: string, awayId: string, n: number, group?: string): CupTie {
  return {
    id: `${cup.id}_s${cup.season}_${stage.key}_${n}`, cup: cup.id, stageKey: stage.key, slot: stage.slot,
    homeId, awayId, neutral: !!stage.neutral, knockout: stage.kind === 'KO', group, result: null
  };
}

/** Round robin for 5 teams: 5 matchdays, 2 matches each (one team rests). */
function fiveTeamRoundRobin(ids: string[]): Array<Array<[string, string]>> {
  const list = [...ids, 'BYE'];
  const days: Array<Array<[string, string]>> = [];
  for (let r = 0; r < 5; r++) {
    const day: Array<[string, string]> = [];
    for (let i = 0; i < 3; i++) {
      const a = list[i]!, b = list[5 - i]!;
      if (a !== 'BYE' && b !== 'BYE') day.push(r % 2 === 0 ? [a, b] : [b, a]);
    }
    days.push(day);
    list.splice(1, 0, list.pop()!);
  }
  return days;
}

/**
 * The season's cups. `superEntrants`: 4 ids in order [league champion, cup winner, league runner-up, cup runner-up].
 * `leagueTeams`: the 20 league clubs.
 */
export function createCups(season: number, rounds: number, leagueTeams: Team[], guests: Team[], superEntrants: string[], seed: number): CupState[] {
  const rng = new Rng(seed);
  const base = (id: CupId): CupState => ({ id, name: CUP_NAMES[id], season, stages: stagesFor(id, rounds), ties: [], scorers: {}, winnerId: null, runnerUpId: null });

  const sup = base('SUPER');
  const [e0, e1, e2, e3] = superEntrants;
  if (e0 && e1 && e2 && e3) {
    sup.ties.push(tie(sup, sup.stages[0]!, e0, e3, 1), tie(sup, sup.stages[0]!, e1, e2, 2));
  }

  const cup = base('EGYPT_CUP');
  const entrants = shuffle([...leagueTeams.map(t => t.id), ...guests.map(t => t.id)], rng);
  for (let i = 0; i + 1 < entrants.length; i += 2) {
    let h = entrants[i]!, a = entrants[i + 1]!;
    if (a.startsWith('guest_') && !h.startsWith('guest_')) [h, a] = [a, h]; // the smaller club hosts
    cup.ties.push(tie(cup, cup.stages[0]!, h, a, i / 2 + 1));
  }

  const lc = base('LEAGUE_CUP');
  const seeded = [...leagueTeams].sort((a, b) => teamOverall(b) - teamOverall(a)).map(t => t.id);
  const groups: Record<string, string[]> = { A: [], B: [], C: [], D: [] };
  for (let pot = 0; pot < 5; pot++) {
    const drawn = shuffle(seeded.slice(pot * 4, pot * 4 + 4), rng);
    (['A', 'B', 'C', 'D'] as const).forEach((g, i) => { if (drawn[i]) groups[g]!.push(drawn[i]!); });
  }
  lc.groups = groups;
  let n = 1;
  for (const [g, ids] of Object.entries(groups)) {
    fiveTeamRoundRobin(ids).forEach((day, d) => {
      for (const [h, a] of day) lc.ties.push(tie(lc, lc.stages[d]!, h, a, n++, g));
    });
  }
  return e0 ? [sup, cup, lc] : [cup, lc];
}

export interface GroupRow { teamId: string; p: number; w: number; d: number; l: number; gf: number; ga: number; pts: number }

export function groupTable(cup: CupState, group: string): GroupRow[] {
  const ids = cup.groups?.[group] ?? [];
  const rows = new Map(ids.map(id => [id, { teamId: id, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 }]));
  for (const t of cup.ties) {
    if (t.group !== group || !t.result) continue;
    const h = rows.get(t.homeId), a = rows.get(t.awayId);
    if (!h || !a) continue;
    h.p++; a.p++; h.gf += t.result.home; h.ga += t.result.away; a.gf += t.result.away; a.ga += t.result.home;
    if (t.result.home > t.result.away) { h.w++; a.l++; h.pts += 3; }
    else if (t.result.home < t.result.away) { a.w++; h.l++; a.pts += 3; }
    else { h.d++; a.d++; h.pts++; a.pts++; }
  }
  return [...rows.values()].sort((x, y) => y.pts - x.pts || (y.gf - y.ga) - (x.gf - x.ga) || y.gf - x.gf || x.teamId.localeCompare(y.teamId));
}

/** Draw the next stage once the current one is complete; set the winner after the final. */
export function progressCup(cup: CupState, rng: Rng): void {
  for (let i = 0; i < cup.stages.length; i++) {
    const stage = cup.stages[i]!;
    const ties = cup.ties.filter(t => t.stageKey === stage.key);
    if (!ties.length || ties.some(t => !t.result)) return;
    const next = cup.stages[i + 1];
    if (!next) {
      const final = ties[0]!;
      cup.winnerId = final.result!.winnerId;
      cup.runnerUpId = final.result!.winnerId === final.homeId ? final.awayId : final.homeId;
      return;
    }
    if (cup.ties.some(t => t.stageKey === next.key)) continue;
    if (next.kind === 'GROUP') continue;
    let pairs: Array<[string, string]>;
    if (stage.kind === 'GROUP') {
      const pos = (g: string, k: number): string => groupTable(cup, g)[k]!.teamId;
      pairs = [[pos('A', 0), pos('B', 1)], [pos('B', 0), pos('A', 1)], [pos('C', 0), pos('D', 1)], [pos('D', 0), pos('C', 1)]];
    } else {
      const winners = shuffle(ties.map(t => t.result!.winnerId!), rng);
      pairs = [];
      for (let k = 0; k + 1 < winners.length; k += 2) pairs.push([winners[k]!, winners[k + 1]!]);
    }
    pairs.forEach(([h, a], k) => cup.ties.push(tie(cup, next, h, a, k + 1)));
    return;
  }
}

/** Earliest unplayed cup slot that falls before the next league round. */
export function dueSlot(cups: CupState[] | undefined, nextLeagueRound: number): number | null {
  let best: number | null = null;
  for (const c of cups ?? []) for (const t of c.ties) {
    if (!t.result && t.slot < nextLeagueRound && (best === null || t.slot < best)) best = t.slot;
  }
  return best;
}

export const tiesAtSlot = (cups: CupState[], slot: number): CupTie[] => cups.flatMap(c => c.ties.filter(t => !t.result && t.slot === slot));

export const stageOf = (cups: CupState[], t: CupTie): CupStage | undefined => cups.find(c => c.id === t.cup)?.stages.find(s => s.key === t.stageKey);

export const tieLabel = (cups: CupState[], t: CupTie): string => `${CUP_SHORT[t.cup]} · ${stageOf(cups, t)?.label ?? t.stageKey}${t.group ? ` · Group ${t.group}` : ''}`;

const isDetailed = (p: MatchSummary['home']['players'][number]): p is PlayerSummary => 'stats' in p;

/** Record results for a slot's ties, update scorers and draw the next stages. */
export function recordCupResults(cups: CupState[], summaries: ReadonlyMap<string, MatchSummary>, rng: Rng): CupState[] {
  const out = structuredClone(cups);
  for (const cup of out) {
    for (const t of cup.ties) {
      const sm = summaries.get(t.id);
      if (!sm || t.result) continue;
      const h = sm.home.score, a = sm.away.score;
      let winnerId: string | null = null;
      if (h !== a) winnerId = h > a ? t.homeId : t.awayId;
      else if (sm.shootout) winnerId = sm.shootout.home > sm.shootout.away ? t.homeId : t.awayId;
      t.result = { home: h, away: a, et: !!sm.extraTime, pens: sm.shootout ? { home: sm.shootout.home, away: sm.shootout.away } : null, winnerId, matchId: sm.id };
      for (const [teamId, side] of [[t.homeId, sm.home], [t.awayId, sm.away]] as const) {
        for (const ps of side.players) {
          if (!isDetailed(ps) || ps.goals <= 0) continue;
          const s = (cup.scorers[ps.id] ??= { name: ps.name, teamId, goals: 0 });
          s.goals += ps.goals;
        }
      }
    }
    progressCup(cup, rng);
  }
  return out;
}

/**
 * Condition after a midweek cup match: fatigue and sharpness for those who played, injuries, morale, and a short
 * recovery for everyone (less than the week between league rounds). Mutates the teams.
 */
export function applyCupCondition(teams: Team[], ties: CupTie[], summaries: ReadonlyMap<string, MatchSummary>, rand: () => number = Math.random): string[] {
  const news: string[] = [];
  const byId = new Map(teams.map(t => [t.id, t]));
  for (const t of ties) {
    const sm = summaries.get(t.id);
    if (!sm) continue;
    for (const [teamId, side, opp] of [[t.homeId, sm.home, sm.away], [t.awayId, sm.away, sm.home]] as const) {
      const team = byId.get(teamId);
      if (!team) continue;
      const won = t.result?.winnerId ? t.result.winnerId === teamId : side.score > opp.score;
      const lost = t.result?.winnerId ? t.result.winnerId !== teamId : side.score < opp.score;
      for (const ps of side.players) {
        if (!isDetailed(ps) || ps.stats.ticks <= 0) continue;
        const p = team.players.find(x => x.id === ps.id);
        if (!p) continue;
        const minutes = ps.stats.ticks / 6;
        p.fitness = Math.max(20, p.fitness - fatigueFor(p, minutes));
        p.sharpness = Math.min(100, p.sharpness + (minutes / 90) * 10);
        if (ps.injured) {
          const out = 1 + Math.floor(rand() * 3);
          p.injury = { severity: out > 2 ? 'MAJOR' : 'MINOR', label: 'knock picked up in the cup', matchesOut: out };
          p.fitness = Math.min(p.fitness, 70);
          if (team.isUser) news.push(`${p.name} was injured in the cup — out for ${out} league match${out > 1 ? 'es' : ''}.`);
        }
      }
      for (const p of team.players) p.morale = Math.max(30, Math.min(95, p.morale + (won ? 3 : lost ? -3 : 0)));
    }
  }
  for (const t of teams) for (const p of t.players) p.fitness = Math.min(100, p.fitness + (100 - p.fitness) * 0.2);
  return news;
}

/** Next season's Super Cup line-up: league champion, cup winner, league runner-up, cup runner-up (league fills gaps). */
export function superCupEntrants(table: Array<{ teamId: string }>, egyptCup: CupState | undefined): string[] {
  const order = [table[0]?.teamId, egyptCup?.winnerId, table[1]?.teamId, egyptCup?.runnerUpId];
  const out: string[] = [];
  for (const id of order) if (id && !id.startsWith('guest_') && !out.includes(id)) out.push(id);
  for (const r of table) { if (out.length >= 4) break; if (!out.includes(r.teamId)) out.push(r.teamId); }
  // Order matters for the semi-final pairings: [champion, cup winner, runner-up, cup runner-up]
  return out.slice(0, 4);
}

export function emptyCups(season: number, guests: Team[]): CupsRecord {
  return { season, cups: [], guests, honours: [], winners: [] };
}
