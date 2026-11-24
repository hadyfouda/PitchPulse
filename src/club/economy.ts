/**
 * Club economy: matchday income, wages, season-end merit payments, budgets and board confidence.
 * Pure functions; the store persists the results.
 */
import type { Team } from '../types/domain.ts';
import type { ClubFinances, LedgerEntry } from '../types/club.ts';
import { teamOverall } from '../data/generators.ts';

export const MATCH_FEE = 150_000; //   broadcast share per league match
export const WIN_BONUS = 400_000;
export const DRAW_BONUS = 150_000;
export const HOME_GATE = 600_000; //   ticket + hospitality per home match
const MERIT_TOP = 12_000_000;
const MERIT_BOTTOM = 1_000_000;
const LEDGER_CAP = 120;

export function formatMoney(n: number): string {
  const sign = n < 0 ? '−' : '';
  const a = Math.abs(n);
  if (a >= 1_000_000) return `${sign}€${(a / 1_000_000).toFixed(a >= 10_000_000 ? 1 : 2).replace(/\.?0+$/, '')}M`;
  if (a >= 1_000) return `${sign}€${Math.round(a / 1_000)}K`;
  return `${sign}€${Math.round(a)}`;
}

export const wageBill = (t: Team): number => t.players.reduce((a, p) => a + p.wage, 0);

/** Board's expected finish: the club's rank by starting-XI strength. */
export function expectedPosition(user: Team, teams: readonly Team[]): number {
  const mine = teamOverall(user);
  return 1 + teams.filter(t => t.id !== user.id && teamOverall(t) > mine).length;
}

export const meritPayment = (position: number, clubs: number): number =>
  Math.round((MERIT_TOP - ((position - 1) / Math.max(1, clubs - 1)) * (MERIT_TOP - MERIT_BOTTOM)) / 50_000) * 50_000;

export function initialFinances(user: Team, teams: readonly Team[]): ClubFinances {
  const bill = wageBill(user);
  return {
    balance: 22_000_000,
    transferBudget: 12_000_000,
    wageBudget: Math.round((bill * 1.25) / 1000) * 1000,
    boardConfidence: 60,
    expectedPosition: expectedPosition(user, teams),
    ledger: []
  };
}

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

export function addLedger(f: ClubFinances, e: LedgerEntry): void {
  f.balance += e.amount;
  f.ledger.unshift(e);
  if (f.ledger.length > LEDGER_CAP) f.ledger.length = LEDGER_CAP;
}

export interface MatchMoneyInput {
  season: number;
  round: number;
  home: boolean;
  scored: number;
  conceded: number;
  userOvr: number;
  oppOvr: number;
}

/** One league round: broadcast fee, bonus, gate, a week of wages, board reaction to the result. */
export function applyRoundFinances(prev: ClubFinances, user: Team, m: MatchMoneyInput): ClubFinances {
  const f: ClubFinances = structuredClone(prev);
  const base = { season: m.season, round: m.round };
  const won = m.scored > m.conceded, drew = m.scored === m.conceded;
  addLedger(f, { ...base, kind: 'MATCH', label: 'Broadcast fee', amount: MATCH_FEE });
  if (m.home) addLedger(f, { ...base, kind: 'MATCH', label: 'Home gate receipts', amount: HOME_GATE });
  if (won) addLedger(f, { ...base, kind: 'MATCH', label: 'Win bonus', amount: WIN_BONUS });
  else if (drew) addLedger(f, { ...base, kind: 'MATCH', label: 'Draw bonus', amount: DRAW_BONUS });
  addLedger(f, { ...base, kind: 'WAGES', label: 'Weekly wages', amount: -wageBill(user) });

  const expectedPts = clamp(1.37 + (m.userOvr - m.oppOvr) * 0.08 + (m.home ? 0.15 : -0.15), 0.3, 2.5);
  const pts = won ? 3 : drew ? 1 : 0;
  let delta = (pts - expectedPts) * 0.9;
  if (f.balance < 0) delta -= 2;
  if (wageBill(user) > f.wageBudget) delta -= 1;
  f.boardConfidence = clamp(Math.round((f.boardConfidence + delta) * 10) / 10, 0, 100);
  return f;
}

/** Season end: merit payment, board verdict on the finish, next season's budgets. */
export function seasonEndFinances(prev: ClubFinances, user: Team, season: number, rounds: number, position: number, clubs: number): { finances: ClubFinances; verdict: string } {
  const f: ClubFinances = structuredClone(prev);
  const merit = meritPayment(position, clubs);
  addLedger(f, { season, round: rounds, kind: 'MERIT', label: `League merit payment (${position}${position === 1 ? 'st' : position === 2 ? 'nd' : position === 3 ? 'rd' : 'th'})`, amount: merit });
  const diff = f.expectedPosition - position;
  f.boardConfidence = clamp(f.boardConfidence + diff * 3 + (position === 1 ? 8 : 0), 0, 100);
  const verdict = diff >= 2 ? 'The board is delighted — you beat their expectations.'
    : diff >= 0 ? 'The board is satisfied with the season.'
      : diff >= -2 ? 'The board expected a little more.'
        : 'The board is unhappy: the team finished well below expectations.';
  const bill = wageBill(user);
  f.transferBudget = Math.round(Math.max(1_500_000, Math.max(0, f.balance) * 0.4) * (0.6 + f.boardConfidence / 125) / 100_000) * 100_000;
  f.wageBudget = Math.round(Math.max(bill * 1.05, bill * (1 + (f.boardConfidence - 40) / 250)) / 1000) * 1000;
  return { finances: f, verdict };
}
