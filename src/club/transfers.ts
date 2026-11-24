/**
 * Transfer market: scouting with tactical fit, fee negotiation with counter-offers,
 * personal terms, selling to AI bidders, and keeping every squad valid.
 */
import type { Player, Position, Team } from '../types/domain.ts';
import type { ClubFinances, MarketState } from '../types/club.ts';
import type { RoleId, SlotKind } from '../types/tactics.ts';
import { Rng } from '../engine/rng.ts';
import { ROLE_INFO, roleFit } from '../engine/roles.ts';
import { generatePlayer, playerOverall, playerValue, repairLineup, slotScore, wageFor } from '../data/generators.ts';
import { addLedger, formatMoney, wageBill } from './economy.ts';
import { replenishSquad } from './development.ts';

/** Real Egyptian squads carry 30–45 players. */
export const MAX_SQUAD = 46;
const MIN_SQUAD = 16;
const MIN_BY_POSITION: Record<Position, number> = { GK: 2, DEF: 5, MID: 5, FWD: 3 };

export interface FitInfo {
  slot: number;
  kind: SlotKind;
  role: RoleId;
  /** Slot score gained over the current starter (negative = squad depth only). */
  delta: number;
  label: string;
}

export interface MarketEntry {
  player: Player;
  clubId: string | null;
  clubName: string;
  ovr: number;
  value: number;
  asking: number;
  wageDemand: number;
  fit: FitInfo;
  /** Why the club won't negotiate, if so. */
  blocked: string | null;
}

/** Where would this player slot into the user's XI, and by how much would he improve it? */
export function tacticalFit(user: Team, p: Player): FitInfo {
  const byId = new Map(user.players.map(x => [x.id, x]));
  let best: FitInfo | null = null;
  for (const s of user.lineup.slots) {
    if ((s.kind === 'GK') !== (p.position === 'GK')) continue;
    const cand = slotScore({ ...p, fitness: 100 }, s.kind) * roleFit(p.naturalRoles, s.role);
    const cur = s.playerId ? byId.get(s.playerId) : undefined;
    const curScore = cur ? slotScore({ ...cur, fitness: 100 }, s.kind) * roleFit(cur.naturalRoles, s.role) : 0;
    const delta = Math.round((cand - curScore) * 10) / 10;
    if (!best || delta > best.delta) best = { slot: s.slot, kind: s.kind, role: s.role, delta, label: '' };
  }
  const f = best ?? { slot: -1, kind: 'CM', role: 'CM', delta: -99, label: '' };
  f.label = f.delta >= 1 ? `+${f.delta.toFixed(1)} at ${f.kind} · ${ROLE_INFO[f.role].short}` : f.delta > -3 ? `Rotation at ${f.kind}` : `Depth`;
  return f;
}

function positionCountOk(team: Team, leaving: Player): boolean {
  const left = team.players.filter(p => p.id !== leaving.id);
  return left.length >= MIN_SQUAD && left.filter(p => p.position === leaving.position).length >= MIN_BY_POSITION[leaving.position];
}

export function buildMarket(user: Team, opponents: readonly Team[], market: MarketState): MarketEntry[] {
  const entries: MarketEntry[] = [];
  for (const p of market.freeAgents) {
    const value = playerValue(p);
    entries.push({ player: p, clubId: null, clubName: 'Free agent', ovr: playerOverall(p), value, asking: 0, wageDemand: Math.round(wageFor(p) * 1.15 / 500) * 500, fit: tacticalFit(user, p), blocked: null });
  }
  for (const t of opponents) {
    const starters = new Set(t.lineup.slots.map(s => s.playerId));
    const best = [...t.players].sort((a, b) => playerOverall(b) - playerOverall(a))[0];
    for (const p of t.players) {
      const value = playerValue(p);
      const marquee = p === best;
      const asking = Math.round(value * (marquee ? 1.8 : starters.has(p.id) ? 1.35 : 1.05) / 50_000) * 50_000;
      entries.push({
        player: p, clubId: t.id, clubName: t.name, ovr: playerOverall(p), value, asking,
        wageDemand: Math.round(Math.max(p.wage * 1.2, wageFor(p)) / 500) * 500, fit: tacticalFit(user, p),
        blocked: !positionCountOk(t, p) ? `${t.shortName} can't spare a ${p.position}` : p.injury ? 'Injured — no medical possible' : null
      });
    }
  }
  return entries;
}

export type OfferVerdict = { status: 'ACCEPT' } | { status: 'COUNTER'; counter: number; message: string } | { status: 'REJECT'; message: string };

/** The selling club's response to a fee. `attempt` starts at 0; patience runs out after three rounds. */
export function evaluateOffer(entry: MarketEntry, fee: number, attempt: number): OfferVerdict {
  if (entry.clubId === null) return { status: 'ACCEPT' };
  const ratio = fee / entry.asking;
  if (ratio >= 1) return { status: 'ACCEPT' };
  if (attempt >= 2) return ratio >= 0.95 ? { status: 'ACCEPT' } : { status: 'REJECT', message: `${entry.clubName} have ended talks.` };
  if (ratio >= 0.8) {
    const counter = Math.round(((entry.asking + fee) / 2 + entry.asking * 0.02 * (2 - attempt)) / 50_000) * 50_000;
    const final = Math.min(entry.asking, Math.max(counter, fee + 50_000));
    return { status: 'COUNTER', counter: final, message: `${entry.clubName} want more. They'd settle for ${formatMoney(final)}.` };
  }
  return { status: 'REJECT', message: `${entry.clubName} won't consider a bid that low (they value him around ${formatMoney(entry.asking)}).` };
}

export function evaluateWage(entry: MarketEntry, wage: number): { ok: boolean; message: string } {
  if (wage >= entry.wageDemand * 0.92) return { ok: true, message: `${entry.player.name} agrees personal terms.` };
  return { ok: false, message: `${entry.player.name}'s agent wants at least ${formatMoney(Math.round(entry.wageDemand * 0.92 / 500) * 500)} a week.` };
}

export interface ClubWorld {
  user: Team;
  opponents: Team[];
  market: MarketState;
  finances: ClubFinances;
}

export function affordability(w: ClubWorld, fee: number, wage: number): string | null {
  if (w.user.players.length >= MAX_SQUAD) return `Squad is full (${MAX_SQUAD}). Sell or release someone first.`;
  if (fee > w.finances.transferBudget) return 'The fee is over your transfer budget.';
  if (fee > w.finances.balance) return 'The club cannot cover the fee from its balance.';
  if (wageBill(w.user) + wage > w.finances.wageBudget) return 'This wage would break the board\'s wage budget.';
  return null;
}

function freeShirt(team: Team, preferred: number): number {
  if (!team.players.some(p => p.shirt === preferred)) return preferred;
  for (let n = 2; n < 60; n++) if (!team.players.some(p => p.shirt === n)) return n;
  return 99;
}

/** Complete a signing. Returns the new world and a news line. */
export function signPlayer(prev: ClubWorld, entry: MarketEntry, fee: number, wage: number, season: number, round: number): { world: ClubWorld; news: string } {
  const w: ClubWorld = structuredClone(prev);
  const id = entry.player.id;
  let player: Player | undefined;
  if (entry.clubId === null) {
    player = w.market.freeAgents.find(p => p.id === id);
    w.market.freeAgents = w.market.freeAgents.filter(p => p.id !== id);
  } else {
    const seller = w.opponents.find(t => t.id === entry.clubId)!;
    player = seller.players.find(p => p.id === id);
    seller.players = seller.players.filter(p => p.id !== id);
    seller.lineup = repairLineup(seller);
    const used = new Set([w.user, ...w.opponents].flatMap(t => t.players.map(p => p.name)));
    replenishSquad(seller, new Rng((Date.now() ^ season * 7919) >>> 0), used);
  }
  if (!player) throw new Error('Player no longer available');
  player.wage = wage;
  player.shirt = freeShirt(w.user, player.shirt);
  player.morale = Math.min(95, player.morale + 8);
  player.suspension = 0; player.seasonYellows = 0;
  w.user.players.push(player);
  if (w.user.lineup.bench.length < 9) w.user.lineup.bench.push(player.id);
  w.finances.transferBudget -= fee;
  const signingBonus = entry.clubId === null ? Math.round(entry.value * 0.08 / 10_000) * 10_000 : 0;
  addLedger(w.finances, { season, round, kind: 'TRANSFER', label: `Signed ${player.name}${entry.clubId ? ` from ${entry.clubName}` : ' (free)'}`, amount: -(fee + signingBonus) });
  return { world: w, news: `${player.name} joins from ${entry.clubName}${fee ? ` for ${formatMoney(fee)}` : ''}.` };
}

export interface Bid {
  clubId: string;
  clubName: string;
  fee: number;
}

/** One to three AI clubs bid for a player you are willing to sell. */
export function bidsFor(w: ClubWorld, playerId: string, seed: number): Bid[] | string {
  const p = w.user.players.find(x => x.id === playerId);
  if (!p) return 'Player not found.';
  if (!positionCountOk(w.user, p)) return `You need at least ${MIN_BY_POSITION[p.position]} ${p.position}s and ${MIN_SQUAD} players.`;
  const rng = new Rng(seed);
  const value = playerValue(p);
  const n = rng.int(1, 3);
  const clubs = [...w.opponents].sort(() => rng.next() - 0.5).slice(0, n);
  return clubs.map(c => ({ clubId: c.id, clubName: c.name, fee: Math.round(value * rng.range(0.78, 1.15) / 50_000) * 50_000 })).sort((a, b) => b.fee - a.fee);
}

export function sellPlayer(prev: ClubWorld, playerId: string, bid: Bid, season: number, round: number): { world: ClubWorld; news: string } {
  const w: ClubWorld = structuredClone(prev);
  const p = w.user.players.find(x => x.id === playerId);
  const buyer = w.opponents.find(t => t.id === bid.clubId);
  if (!p || !buyer) throw new Error('Sale no longer possible');
  w.user.players = w.user.players.filter(x => x.id !== playerId);
  w.user.lineup = repairLineup({ ...w.user, lineup: { slots: w.user.lineup.slots.map(s => (s.playerId === playerId ? { ...s, playerId: null } : s)), bench: w.user.lineup.bench.filter(id => id !== playerId) } });
  p.shirt = freeShirt(buyer, p.shirt);
  buyer.players.push(p);
  // The board lets you reinvest most of a sale
  w.finances.transferBudget += Math.round(bid.fee * 0.6);
  addLedger(w.finances, { season, round, kind: 'TRANSFER', label: `Sold ${p.name} to ${buyer.name}`, amount: bid.fee });
  return { world: w, news: `${p.name} leaves for ${buyer.name} (${formatMoney(bid.fee)}).` };
}

/** Free agents available this season: a mixed bag of veterans, journeymen and the odd bargain. */
export function freeAgentPool(seed: number, used: Set<string>): Player[] {
  const rng = new Rng(seed);
  const positions: Position[] = ['GK', 'DEF', 'DEF', 'DEF', 'MID', 'MID', 'MID', 'FWD', 'FWD'];
  return Array.from({ length: 24 }, (_, i) => {
    const age = rng.chance(0.35) ? rng.int(30, 34) : rng.int(19, 29);
    return generatePlayer(rng, rng.pick(positions), rng.int(56, 72), 70 + i, used, { age, idPrefix: 'fa' });
  });
}
