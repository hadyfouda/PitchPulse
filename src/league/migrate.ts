import type { CareerRecord } from '../db/db.ts';
import type { Player } from '../types/domain.ts';
import { defaultCondition } from './condition.ts';
import { newSeason } from './schedule.ts';
import { randomSeed } from '../engine/rng.ts';
import { playerOverall, wageFor } from '../data/generators.ts';
import { initialFinances } from '../club/economy.ts';
import { youthIntake } from '../club/development.ts';
import { freeAgentPool } from '../club/transfers.ts';
import { defaultTraining } from '../club/training.ts';

type LegacyCareer = Partial<CareerRecord> & Pick<CareerRecord, 'id' | 'seed' | 'createdAt' | 'user' | 'opponents'> & { nextOpponent?: number };

function upgradePlayer(p: Player): Player {
  const next = { ...p, ...defaultCondition(p) };
  if (!next.potential) {
    const ovr = playerOverall(next);
    next.potential = Math.min(96, ovr + (next.age <= 20 ? 10 : next.age <= 23 ? 6 : next.age <= 27 ? 2 : 0));
  }
  if (!next.wage) next.wage = wageFor(next);
  return next;
}

/** Upgrade a career saved by an earlier phase. Idempotent: running it on a current career changes nothing. */
export function migrateCareer(raw: LegacyCareer): CareerRecord {
  const c = structuredClone(raw) as LegacyCareer;
  for (const t of [c.user, ...c.opponents]) t.players = t.players.map(upgradePlayer);
  const teams = [c.user, ...c.opponents];
  const season = c.season ?? newSeason(1, teams, randomSeed());
  const names = new Set(teams.flatMap(t => t.players.map(p => p.name)));
  const out: CareerRecord = {
    id: 'career', seed: c.seed, createdAt: c.createdAt, user: c.user, opponents: c.opponents, season,
    pendingFixtureId: c.pendingFixtureId ?? null,
    finances: c.finances ?? initialFinances(c.user, teams),
    academy: c.academy ?? { prospects: youthIntake(season.number, randomSeed(), names), lastIntakeSeason: season.number },
    market: c.market ?? { freeAgents: freeAgentPool(randomSeed(), names), season: season.number },
    dilemma: c.dilemma ?? null,
    news: c.news ?? [],
    training: c.training ?? defaultTraining()
  };
  out.academy.prospects = out.academy.prospects.map(upgradePlayer);
  out.market.freeAgents = out.market.freeAgents.map(upgradePlayer);
  return out;
}

export const needsMigration = (raw: LegacyCareer): boolean =>
  !raw.season || !raw.finances || !raw.academy || !raw.market || raw.news === undefined || !raw.training ||
  [raw.user, ...raw.opponents].some(t => t.players.some(p => p.wage === undefined || p.potential === undefined));
