/**
 * Builds the Egyptian Premier League world from the real squads (squads.ts) and clubs (league.ts).
 *
 * Names, ages, shirt numbers, positions, nationalities and current injuries are real. Ratings are ESTIMATES:
 * there is no public attribute data for the Egyptian league, so each player is generated around his club's level
 * (from its standing and stature), adjusted for age, squad role hints (low shirt numbers, foreign signings) and a
 * short list of well-known players. Everything is deterministic for a given career seed.
 */
import type { Player, Position, Team } from '../../types/domain.ts';
import type { Tactics, TacticalIdentity } from '../../types/tactics.ts';
import { Rng } from '../../engine/rng.ts';
import { AI_IDENTITIES, IDENTITIES } from '../../engine/identities.ts';
import { autoLineup, generatePlayer, playerOverall, setWageScale, teamOverall, wageFor } from '../generators.ts';
import { EGYPT_SQUADS, type RealClub, type RealPlayer } from './squads.ts';
import { EGYPT_LEAGUE, type RealLeagueClub } from './league.ts';

/** Club level (squad quality centre) — estimated from the current standing and the club's stature. */
export const CLUB_LEVEL: Record<string, number> = {
  ahly: 74, pyramids: 74, zamalek: 73,
  ceramica: 68, masry: 67, ittihad: 66, modern: 66, nbe: 66, zed: 66,
  smouha: 65, mokawloon: 65, enppi: 64, petrojet: 64,
  olympic: 63, degla: 63, gaish: 63, mahalla: 62, asyut: 61, aboqir: 61, gouna: 61
};

/** Well-known players get a lift above their club's level (estimate, in overall points). */
const STAR_BONUS: Record<string, number> = {
  'ahly/Emam Ashour': 9, 'ahly/Zizo': 8, 'ahly/Mohamed El Shenawy': 6, 'ahly/Achraf Dari': 5, 'ahly/Afsha': 4,
  'ahly/Taher Mohamed': 4, 'ahly/Yasser Ibrahim': 4, 'ahly/Achraf Bencharki': 4, 'ahly/Monsef Bakrar': 4,
  'ahly/Hussein El Shahat': 3, 'ahly/Marwan Attia': 3, 'ahly/Mohamed Hany': 2, 'ahly/Karim Fouad': 2,
  'zamalek/Naser Mansy': 6, 'zamalek/Mahmoud Bentayg': 5, 'zamalek/Mohamed Sobhi': 4, 'zamalek/Abdalla El Said': 4,
  'zamalek/Chico Banza': 4, 'zamalek/Ahmed Fatouh': 3, 'zamalek/Mahmoud Hamdi El Wensh': 3, 'zamalek/Oday Dabbagh': 3,
  'zamalek/Omar Gaber': 2, 'zamalek/Adam Kaied': 3,
  'pyramids/Mostafa Fathi': 6, 'pyramids/Walid El Karti': 5, 'pyramids/Ahmed El Shenawy': 4, 'pyramids/Mohamed Chibi': 4,
  'pyramids/Nadir Benbouali': 4, 'pyramids/Mohanad Lasheen': 3, 'pyramids/Zalaka': 3, 'pyramids/Ewerton': 3,
  'pyramids/Youssef Obama': 2, 'pyramids/Hamed Hamdan': 3,
  'masry/Salah Mohsen': 5, 'ceramica/Ahmed Belhadji': 3, 'smouha/Pape Badji': 2, 'enppi/Kahraba': 2,
  'mokawloon/Kahraba': 2, 'nbe/Mostafa Shalaby': 2, 'ittihad/John Ebuka': 2
};

const POSITION_OF: Record<RealPlayer['pos'], Position> = { GK: 'GK', DEF: 'DEF', MID: 'MID', FWD: 'FWD' };

/** Squad-role hint from the data we have: first-choice numbers, foreign signings, unnumbered youngsters. */
function roleOffset(p: RealPlayer): number {
  let o = 0;
  if (p.number !== null && p.number >= 1 && p.number <= 11) o += 2;
  if (p.number === null) o -= 3;
  if (p.number !== null && p.number >= 40) o -= 2;
  if (p.nat !== 'EGY') o += 3;
  return o;
}

function estimateAge(p: RealPlayer, rng: Rng): number {
  if (p.age !== null) return p.age;
  return p.number === null || (p.number ?? 0) >= 40 ? rng.int(19, 23) : rng.int(22, 29);
}

function buildPlayer(club: RealClub, rp: RealPlayer, index: number, shirt: number, rng: Rng, used: Set<string>): Player {
  const level = (CLUB_LEVEL[club.id] ?? 63) + roleOffset(rp) + (STAR_BONUS[`${club.id}/${rp.name}`] ?? 0);
  const age = estimateAge(rp, rng);
  const p = generatePlayer(rng, POSITION_OF[rp.pos], level, shirt, used, { age, idPrefix: club.id });
  p.id = `${club.id}_${index}`;
  p.name = rp.name;
  p.nationality = rp.nat;
  if (rp.injured) p.injury = { severity: 'MINOR', label: 'injury', matchesOut: 1 + rng.int(0, 2) };
  return p;
}

/** Egyptian wages are lower than the game's default scale; real squads are also much bigger (see setWageScale). */
export const EGYPT_WAGE_FACTOR = 0.45;

/**
 * Big real squads make the best XI of ~33 random draws far above the club level, so every squad is shifted until
 * its best XI matches the target (club level + 4). Keeps the hierarchy between clubs exactly as estimated.
 */
function normaliseSquad(players: Player[], target: number, tactics: Tactics, identity: TacticalIdentity): void {
  for (let i = 0; i < 4; i++) {
    const xi = teamOverall({ players, lineup: autoLineup({ players, tactics, identity }) } as Team);
    const shift = target - xi;
    if (Math.abs(shift) < 0.5) break;
    for (const p of players) for (const k of Object.keys(p.attrs) as Array<keyof Player['attrs']>) {
      p.attrs[k] = Math.max(1, Math.min(99, Math.round(p.attrs[k] + shift)));
    }
  }
  for (const p of players) {
    const ovr = playerOverall(p);
    const headroom = p.age <= 20 ? 10 : p.age <= 23 ? 5 : p.age <= 26 ? 2 : 0;
    p.potential = Math.min(96, ovr + headroom);
    p.wage = wageFor(p);
  }
}

/** Real shirt numbers where possible; duplicates and missing numbers get the next free number. */
function assignShirts(players: readonly RealPlayer[]): number[] {
  const taken = new Set<number>();
  const out: number[] = new Array(players.length).fill(0);
  players.forEach((p, i) => { if (p.number !== null && !taken.has(p.number)) { taken.add(p.number); out[i] = p.number; } });
  let next = 12;
  players.forEach((_, i) => {
    if (out[i]) return;
    while (taken.has(next)) next++;
    taken.add(next); out[i] = next;
  });
  return out;
}

function buildTeam(meta: RealLeagueClub, club: RealClub, rng: Rng, isUser: boolean, aiIndex: number): Team {
  const used = new Set<string>();
  const shirts = assignShirts(club.players);
  const players = club.players.map((rp, i) => buildPlayer(club, rp, i, shirts[i]!, rng, used));
  const identity: TacticalIdentity = isUser ? 'CUSTOM' : (AI_IDENTITIES[aiIndex % AI_IDENTITIES.length] ?? 'GEGENPRESS');
  const tactics: Tactics = identity === 'CUSTOM'
    ? { formation: '4-3-3', pressing: 'MID', defLine: 'STANDARD', buildUp: 'BALANCED', focus: 'BALANCED', mentality: 'BALANCED' }
    : { ...IDENTITIES[identity].tactics };
  normaliseSquad(players, (CLUB_LEVEL[club.id] ?? 63) + 4, tactics, identity);
  const base = { players, tactics, identity };
  return {
    id: `egy_${club.id}`, name: meta.name, shortName: meta.shortName, colors: { ...meta.colors },
    identity, level: CLUB_LEVEL[club.id] ?? 63, players, tactics, lineup: autoLineup(base), isUser
  };
}

export const EGYPT_CLUBS = EGYPT_LEAGUE.clubs;

/** The 20 real clubs; `userClubId` is a key of EGYPT_LEAGUE.clubs (e.g. 'ahly'). */
export function generateEgyptWorld(seed: number, userClubId: string): { user: Team; opponents: Team[] } {
  setWageScale(EGYPT_WAGE_FACTOR);
  const rng = new Rng(seed);
  const squads = new Map(EGYPT_SQUADS.map(c => [c.id, c]));
  let aiIndex = 0;
  const teams = EGYPT_LEAGUE.clubs.map(meta => {
    const squad = squads.get(meta.id);
    if (!squad) throw new Error(`Missing squad for ${meta.id}`);
    const isUser = meta.id === userClubId;
    return buildTeam(meta, squad, rng, isUser, isUser ? 0 : aiIndex++);
  });
  const user = teams.find(t => t.isUser) ?? teams[0]!;
  user.isUser = true;
  return { user, opponents: teams.filter(t => t !== user) };
}
