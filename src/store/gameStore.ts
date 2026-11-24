import { create } from 'zustand';
import type { Team } from '../types/domain.ts';
import type { MatchSetup, MatchState, MatchSummary } from '../types/match.ts';
import type { Fixture, SeasonArchive } from '../types/league.ts';
import type { ClubNews } from '../types/club.ts';
import { db, type CareerRecord, type SettingsRecord } from '../db/db.ts';
import { autoLineup, generateWorld, matchdayTeam, repairLineup, teamOverall } from '../data/generators.ts';
import { randomSeed } from '../engine/rng.ts';
import { DEFAULT_AUTOPAUSE } from '../engine/constants.ts';
import { computeTable, newSeason, positionOf } from '../league/schedule.ts';
import { archiveSeason, describeRound, processRound, startNextSeason } from '../league/condition.ts';
import { notify } from '../lib/alerts.ts';
import { Rng } from '../engine/rng.ts';
import { FACILITY_COST, MAX_FACILITIES, MAX_INDIVIDUAL, applyTraining, declineFactor, defaultTraining } from '../club/training.ts';
import type { IndividualFocus, TrainingState } from '../types/club.ts';
import { migrateCareer, needsMigration } from '../league/migrate.ts';
import { simulateFixtures } from '../league/leagueBridge.ts';
import type { LeagueSimJob } from '../league/leagueProtocol.ts';
import { addLedger, applyRoundFinances, expectedPosition, formatMoney, initialFinances, seasonEndFinances } from '../club/economy.ts';
import { seasonLifecycle, youthIntake } from '../club/development.ts';
import { MAX_SQUAD, bidsFor, freeAgentPool, sellPlayer, signPlayer, type Bid, type MarketEntry } from '../club/transfers.ts';
import { resolveDilemma, rollDilemma, describeDilemma } from '../club/dilemmas.ts';
import { buildSave, downloadSave, restoreSave, validateSave, type SaveFile } from '../db/saveFile.ts';

export type Screen = 'home' | 'match' | 'fulltime';

const DEFAULT_SETTINGS: SettingsRecord = {
  id: 'settings', autoPause: { ...DEFAULT_AUTOPAUSE }, notifications: false, sound: true, defaultSpeed: 'BG15',
  notifyMatch: true, notifyClub: true, notifyWhenOpen: false,
  backgroundMode: typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches === true,
  pitchMode: 'FULL', pitchLabels: 'NUMBER', pitchCollapsed: false
};
const NEWS_CAP = 40;

interface GameState {
  ready: boolean;
  screen: Screen;
  career: CareerRecord | null;
  settings: SettingsRecord;
  archive: MatchSummary[];
  seasons: SeasonArchive[];
  resumable: MatchState | null;
  /** True while the rest of the round is being simulated and applied. */
  roundBusy: boolean;
  roundError: string | null;
  init: () => Promise<void>;
  newCareer: (clubIndex: number) => Promise<void>;
  updateUserTeam: (fn: (t: Team) => Team) => void;
  setSettings: (patch: Partial<Omit<SettingsRecord, 'id'>>) => void;
  setScreen: (s: Screen) => void;
  teamById: (id: string) => Team | undefined;
  nextFixture: () => Fixture | null;
  buildMatchSetup: () => MatchSetup | null;
  recordResult: (summary: MatchSummary) => Promise<void>;
  simulateUserMatch: () => Promise<MatchSummary | null>;
  beginNextSeason: () => Promise<void>;
  clearResumable: () => Promise<void>;
  // Phase 4
  buyPlayer: (entry: MarketEntry, fee: number, wage: number) => Promise<string>;
  requestBids: (playerId: string) => Bid[] | string;
  acceptBid: (playerId: string, bid: Bid) => Promise<string>;
  promoteProspect: (id: string) => Promise<string>;
  releaseProspect: (id: string) => Promise<void>;
  answerDilemma: (choice: 0 | 1) => Promise<string>;
  setTraining: (patch: Partial<Pick<TrainingState, 'intensity' | 'focus'>>) => Promise<void>;
  setIndividualPlan: (playerId: string, focus: IndividualFocus | null) => Promise<string | null>;
  upgradeFacilities: () => Promise<string>;
  exportSave: () => Promise<void>;
  importSave: (text: string) => Promise<string | null>;
}

const allTeams = (c: CareerRecord): Team[] => [c.user, ...c.opponents];
const addNews = (c: CareerRecord, ...texts: string[]): ClubNews[] =>
  [...texts.map(text => ({ season: c.season.number, round: Math.max(1, c.season.round - 1), text })), ...c.news].slice(0, NEWS_CAP);

export const useGame = create<GameState>((set, get) => {
  const persistCareer = async (career: CareerRecord): Promise<void> => {
    set({ career });
    await db.career.put(career);
  };

  /** Simulate every outstanding fixture of the current round (plus apply `userSummary` if given). */
  /** System notifications for everything a round produced (the live full-time whistle notifies on its own). */
  const notifyRound = (next: CareerRecord, prev: CareerRecord, result: MatchSummary | null, simulated: boolean, verdict: string): void => {
    const prefs = get().settings;
    const report = next.season.lastReport;
    const lines: string[] = [];
    if (report) lines.push(`League position: ${describeRound(report)}`, ...report.news);
    if (simulated && result) {
      notify(prefs, 'club', `Result · ${result.home.shortName} ${result.home.score}–${result.away.score} ${result.away.shortName}`, lines.join('\n') || 'Round complete', 'round');
    } else if (report && report.news.length) {
      notify(prefs, 'club', `Squad news · round ${report.round}`, report.news.join('\n'), 'squad');
    }
    if (next.season.finished && verdict) notify(prefs, 'club', `Season ${next.season.number} complete`, verdict, 'season');
    const tr = next.training.lastReport;
    if (tr && (tr.ovrUps.length || tr.injuries.length)) {
      notify(prefs, 'club', 'Training report', [...tr.ovrUps.map(u => `${u.name} ${u.from} → ${u.to}`), ...tr.injuries].join('\n'), 'training');
    }
    if (next.dilemma && next.dilemma !== prev.dilemma) {
      const d = describeDilemma(next.dilemma);
      notify(prefs, 'club', `Off the pitch · ${d.title}`, d.text, 'dilemma');
    }
  };

  const completeRound = async (userSummary: MatchSummary | null, simulateUser: boolean): Promise<MatchSummary | null> => {
    const c = get().career;
    if (!c || c.season.finished) return null;
    set({ roundBusy: true, roundError: null });
    try {
      const round = c.season.round;
      const fixtures = c.season.fixtures.filter(f => f.round === round && !f.result);
      const userFixture = fixtures.find(f => f.homeId === c.user.id || f.awayId === c.user.id);
      const teams = new Map(allTeams(c).map(t => [t.id, t]));
      const jobs: LeagueSimJob[] = fixtures
        .filter(f => simulateUser || f !== userFixture)
        .map(f => ({
          fixtureId: f.id, matchId: `${f.id}_${Date.now().toString(36)}`, seed: randomSeed(),
          home: matchdayTeam(teams.get(f.homeId)!, true), away: matchdayTeam(teams.get(f.awayId)!, true)
        }));
      const summaries = await simulateFixtures(jobs);
      let userResult: MatchSummary | null = userSummary;
      if (userFixture && !userSummary && simulateUser) {
        const sim = summaries.get(userFixture.id);
        if (sim) userResult = { ...sim, userSide: userFixture.homeId === c.user.id ? 'home' : 'away' };
      }
      if (userFixture && userResult) summaries.set(userFixture.id, userResult);

      const { world } = processRound({ user: c.user, opponents: c.opponents, season: c.season }, summaries);
      if (simulateUser && userFixture) {
        const f = world.season.fixtures.find(x => x.id === userFixture.id);
        if (f?.result) f.result.simulated = true;
      }

      // Money and the board's reaction to this result
      let finances = c.finances;
      if (userFixture && userResult) {
        const home = userFixture.homeId === c.user.id;
        const opp = teams.get(home ? userFixture.awayId : userFixture.homeId)!;
        finances = applyRoundFinances(finances, world.user, {
          season: c.season.number, round, home,
          scored: home ? userResult.home.score : userResult.away.score,
          conceded: home ? userResult.away.score : userResult.home.score,
          userOvr: teamOverall(c.user), oppOvr: teamOverall(opp)
        });
      }
      // The week's training between this round and the next
      const trained = applyTraining(world.user, c.training, new Rng(randomSeed()), c.season.number, round);
      let next: CareerRecord = { ...c, user: world.user, opponents: world.opponents, season: world.season, pendingFixtureId: null, finances, training: trained.training };
      const extraNews: string[] = [
        ...trained.report.ovrUps.map(u => `Training: ${u.name} improves to ${u.to} overall (was ${u.from}).`),
        ...trained.report.injuries
      ];
      let seasonVerdict = '';

      if (world.season.finished) {
        const table = computeTable(allTeams(next), world.season.fixtures);
        const pos = positionOf(table, next.user.id);
        const end = seasonEndFinances(next.finances, next.user, world.season.number, world.season.rounds, pos, table.length);
        next = { ...next, finances: end.finances };
        extraNews.push(end.verdict);
        seasonVerdict = end.verdict;
        const arc = archiveSeason(world);
        await db.seasons.put(arc);
        set({ seasons: [arc, ...get().seasons.filter(s => s.id !== arc.id)] });
      }

      // An unanswered dilemma lapses; a new one may arrive
      if (next.dilemma) extraNews.push(`You didn't respond to "${describeDilemma(next.dilemma).title}" — the moment has passed.`);
      next = { ...next, dilemma: rollDilemma({ user: next.user, finances: next.finances, academy: next.academy, season: next.season }) };
      if (extraNews.length) next = { ...next, news: addNews(next, ...extraNews) };

      if (userResult) {
        const saved = userResult;
        await db.matches.put(saved);
        set({ archive: [saved, ...get().archive.filter(m => m.id !== saved.id)].slice(0, 30) });
      }
      await persistCareer(next);
      notifyRound(next, c, userResult, simulateUser, seasonVerdict);
      return userResult;
    } catch (err) {
      set({ roundError: err instanceof Error ? err.message : String(err) });
      return null;
    } finally {
      set({ roundBusy: false });
    }
  };

  const current = (): { season: number; round: number } => {
    const c = get().career!;
    return { season: c.season.number, round: Math.max(1, c.season.round - 1) };
  };

  return {
    ready: false,
    screen: 'home',
    career: null,
    settings: DEFAULT_SETTINGS,
    archive: [],
    seasons: [],
    resumable: null,
    roundBusy: false,
    roundError: null,

    init: async () => {
      const [rawCareer, settings, archive, live, seasons] = await Promise.all([
        db.career.get('career'),
        db.settings.get('settings'),
        db.matches.orderBy('playedAt').reverse().limit(30).toArray(),
        db.live.get('live'),
        db.seasons.toArray()
      ]);
      let career: CareerRecord | null = null;
      if (rawCareer) {
        const migrate = needsMigration(rawCareer);
        career = migrate ? migrateCareer(rawCareer) : rawCareer;
        if (migrate) await db.career.put(career);
      }
      const resumable = live && live.snapshot.status !== 'FINISHED' ? live.snapshot : null;
      set({
        ready: true,
        career,
        settings: settings ? { ...DEFAULT_SETTINGS, ...settings, autoPause: { ...DEFAULT_AUTOPAUSE, ...settings.autoPause } } : DEFAULT_SETTINGS,
        archive,
        seasons: seasons.sort((a, b) => b.id - a.id),
        resumable
      });
    },

    newCareer: async (clubIndex) => {
      const seed = randomSeed();
      const world = generateWorld(seed, clubIndex);
      const teams = [world.user, ...world.opponents];
      const names = new Set(teams.flatMap(t => t.players.map(p => p.name)));
      const career: CareerRecord = {
        id: 'career', seed, createdAt: Date.now(), user: world.user, opponents: world.opponents,
        season: newSeason(1, teams, seed ^ 0x5eed), pendingFixtureId: null,
        finances: initialFinances(world.user, teams),
        academy: { prospects: youthIntake(1, seed ^ 0xacad, names), lastIntakeSeason: 1 },
        market: { freeAgents: freeAgentPool(seed ^ 0xfa, names), season: 1 },
        dilemma: null,
        news: [],
        training: defaultTraining()
      };
      await db.transaction('rw', [db.career, db.matches, db.live, db.seasons], async () => {
        await db.matches.clear();
        await db.live.clear();
        await db.seasons.clear();
        await db.career.put(career);
      });
      set({ career, archive: [], seasons: [], resumable: null, screen: 'home' });
    },

    updateUserTeam: (fn) => {
      const career = get().career;
      if (!career) return;
      void persistCareer({ ...career, user: fn(career.user) });
    },

    setSettings: (patch) => {
      const settings = { ...get().settings, ...patch };
      set({ settings });
      void db.settings.put(settings);
    },

    setScreen: (screen) => set({ screen }),

    teamById: (id) => {
      const c = get().career;
      return c ? allTeams(c).find(t => t.id === id) : undefined;
    },

    nextFixture: () => {
      const c = get().career;
      if (!c || c.season.finished) return null;
      return c.season.fixtures.find(f => f.round === c.season.round && !f.result && (f.homeId === c.user.id || f.awayId === c.user.id)) ?? null;
    },

    buildMatchSetup: () => {
      const g = get();
      const c = g.career;
      const f = g.nextFixture();
      if (!c || !f) return null;
      const opp = g.teamById(f.homeId === c.user.id ? f.awayId : f.homeId);
      if (!opp) return null;
      const userHome = f.homeId === c.user.id;
      const user = matchdayTeam(c.user, false);
      const ai = matchdayTeam(opp, true);
      void persistCareer({ ...c, pendingFixtureId: f.id });
      return {
        matchId: `${f.id}_${Date.now().toString(36)}`, seed: randomSeed(),
        home: userHome ? user : ai, away: userHome ? ai : user,
        userSide: userHome ? 'home' : 'away', speed: g.settings.defaultSpeed, autoPause: g.settings.autoPause
      };
    },

    recordResult: async (summary) => {
      await db.live.delete('live');
      set({ resumable: null });
      const c = get().career;
      const pending = c?.pendingFixtureId;
      const isLeague = !!pending && !!c && c.season.fixtures.some(f => f.id === pending && !f.result);
      if (isLeague) { await completeRound(summary, false); return; }
      await db.matches.put(summary);
      set({ archive: [summary, ...get().archive.filter(m => m.id !== summary.id)].slice(0, 30) });
    },

    simulateUserMatch: () => completeRound(null, true),

    beginNextSeason: async () => {
      const c = get().career;
      if (!c || !c.season.finished) return;
      const user = structuredClone(c.user), opponents = structuredClone(c.opponents);
      const academy = structuredClone(c.academy);
      // Summer: develop, age and retire players before the new season starts
      const life = seasonLifecycle(user, opponents, academy, randomSeed(), declineFactor(c.training));
      const world = startNextSeason({ user, opponents, season: c.season }, randomSeed());
      const teams = [world.user, ...world.opponents];
      for (const t of world.opponents) t.lineup = autoLineup(t);
      world.user.lineup = repairLineup(world.user);

      // Academy: graduates who turned 19 must move up or move on; a new intake arrives
      const news = [...life.user];
      for (const p of academy.prospects) p.age++;
      const graduates = academy.prospects.filter(p => p.age >= 19);
      academy.prospects = academy.prospects.filter(p => p.age < 19);
      for (const g of graduates) {
        if (world.user.players.length < MAX_SQUAD) { world.user.players.push(g); news.push(`${g.name} graduates from the academy into the first team.`); }
        else news.push(`${g.name} leaves the academy — no room in the squad.`);
      }
      const names = new Set(teams.flatMap(t => t.players.map(p => p.name)));
      const intake = youthIntake(world.season.number, randomSeed(), names);
      academy.prospects.push(...intake);
      academy.lastIntakeSeason = world.season.number;
      news.push(`${intake.length} new prospects join the academy.`);

      const finances = { ...c.finances, expectedPosition: expectedPosition(world.user, teams) };
      const next: CareerRecord = {
        ...c, user: world.user, opponents: world.opponents, season: world.season, pendingFixtureId: null,
        academy, finances, dilemma: null,
        training: { ...c.training, loadSum: 0, loadRounds: 0, lastReport: null },
        market: { freeAgents: freeAgentPool(randomSeed(), names), season: world.season.number }
      };
      await persistCareer({ ...next, news: addNews({ ...next, season: { ...next.season, round: 2 } }, ...news) });
    },

    clearResumable: async () => {
      await db.live.delete('live');
      const c = get().career;
      if (c?.pendingFixtureId) await persistCareer({ ...c, pendingFixtureId: null });
      set({ resumable: null });
    },

    buyPlayer: async (entry, fee, wage) => {
      const c = get().career!;
      const { season, round } = current();
      const { world, news } = signPlayer({ user: c.user, opponents: c.opponents, market: c.market, finances: c.finances }, entry, fee, wage, season, round);
      const next = { ...c, ...world };
      await persistCareer({ ...next, news: addNews(next, news) });
      return news;
    },

    requestBids: (playerId) => {
      const c = get().career!;
      return bidsFor({ user: c.user, opponents: c.opponents, market: c.market, finances: c.finances }, playerId, randomSeed());
    },

    acceptBid: async (playerId, bid) => {
      const c = get().career!;
      const { season, round } = current();
      const { world, news } = sellPlayer({ user: c.user, opponents: c.opponents, market: c.market, finances: c.finances }, playerId, bid, season, round);
      const next = { ...c, ...world };
      await persistCareer({ ...next, news: addNews(next, news) });
      return news;
    },

    promoteProspect: async (id) => {
      const c = get().career!;
      const p = c.academy.prospects.find(x => x.id === id);
      if (!p) return 'Prospect not found.';
      if (c.user.players.length >= MAX_SQUAD) return `Squad is full (${MAX_SQUAD}).`;
      const taken = new Set(c.user.players.map(x => x.shirt));
      let shirt = 30; while (taken.has(shirt)) shirt++;
      const promoted = { ...p, shirt };
      const user = { ...c.user, players: [...c.user.players, promoted] };
      const next = { ...c, user, academy: { ...c.academy, prospects: c.academy.prospects.filter(x => x.id !== id) } };
      const msg = `${p.name} (${p.age}) is promoted to the first team.`;
      await persistCareer({ ...next, news: addNews(next, msg) });
      return msg;
    },

    releaseProspect: async (id) => {
      const c = get().career!;
      const p = c.academy.prospects.find(x => x.id === id);
      if (!p) return;
      const next = { ...c, academy: { ...c.academy, prospects: c.academy.prospects.filter(x => x.id !== id) } };
      await persistCareer({ ...next, news: addNews(next, `${p.name} is released from the academy.`) });
    },

    answerDilemma: async (choice) => {
      const c = get().career!;
      if (!c.dilemma) return '';
      const { world, outcome } = resolveDilemma({ user: c.user, finances: c.finances, academy: c.academy, season: c.season }, c.dilemma, choice);
      const next = { ...c, user: world.user, finances: world.finances, academy: world.academy, dilemma: null };
      await persistCareer({ ...next, news: addNews(next, outcome) });
      return outcome;
    },

    setTraining: async (patch) => {
      const c = get().career!;
      await persistCareer({ ...c, training: { ...c.training, ...patch } });
    },

    setIndividualPlan: async (playerId, focus) => {
      const c = get().career!;
      const individual = { ...c.training.individual };
      if (focus === null) delete individual[playerId];
      else {
        if (!individual[playerId] && Object.keys(individual).length >= MAX_INDIVIDUAL) return `Coaches can run at most ${MAX_INDIVIDUAL} personal plans — end one first.`;
        individual[playerId] = focus;
      }
      await persistCareer({ ...c, training: { ...c.training, individual } });
      return null;
    },

    upgradeFacilities: async () => {
      const c = get().career!;
      const level = c.training.facilities;
      if (level >= MAX_FACILITIES) return 'The training ground is already world-class.';
      const cost = FACILITY_COST[level - 1]!;
      if (c.finances.balance < cost) return `Not enough money — the upgrade costs ${formatMoney(cost)}.`;
      const finances = structuredClone(c.finances);
      addLedger(finances, { season: c.season.number, round: Math.max(1, c.season.round - 1), label: `Training ground upgrade (level ${level + 1})`, amount: -cost, kind: 'EVENT' });
      const next = { ...c, finances, training: { ...c.training, facilities: level + 1 } };
      const msg = `The training ground is upgraded to level ${level + 1} (${formatMoney(cost)}).`;
      await persistCareer({ ...next, news: addNews(next, msg) });
      return msg;
    },

    exportSave: async () => downloadSave(await buildSave()),

    importSave: async (text) => {
      let data: unknown;
      try { data = JSON.parse(text); } catch { return 'The file is not valid JSON.'; }
      const problem = validateSave(data);
      if (problem) return problem;
      await restoreSave(data as SaveFile);
      set({ ready: false, screen: 'home' });
      await get().init();
      return null;
    }
  };
});
