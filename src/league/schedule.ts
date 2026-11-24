import type { Team } from '../types/domain.ts';
import type { Fixture, SeasonState, TableRow } from '../types/league.ts';
import { Rng } from '../engine/rng.ts';

/** Double round-robin via the circle method: every club plays every other club home and away. */
export function generateFixtures(teamIds: readonly string[], season: number, seed: number): Fixture[] {
  const rng = new Rng(seed);
  const ids = [...teamIds];
  for (let i = ids.length - 1; i > 0; i--) { const j = rng.int(0, i); [ids[i], ids[j]] = [ids[j]!, ids[i]!]; }
  if (ids.length % 2) ids.push('BYE');
  const n = ids.length;
  const half = n - 1;
  const fixed = ids[0]!;
  let rot = ids.slice(1);
  const fixtures: Fixture[] = [];
  for (let r = 0; r < half; r++) {
    const list = [fixed, ...rot];
    for (let i = 0; i < n / 2; i++) {
      const a = list[i]!, b = list[n - 1 - i]!;
      if (a === 'BYE' || b === 'BYE') continue;
      const aHome = i === 0 ? r % 2 === 0 : (r + i) % 2 === 0;
      const [home, away] = aHome ? [a, b] : [b, a];
      fixtures.push({ id: `s${season}r${r + 1}_${home}_${away}`, round: r + 1, homeId: home, awayId: away, result: null });
      fixtures.push({ id: `s${season}r${r + 1 + half}_${away}_${home}`, round: r + 1 + half, homeId: away, awayId: home, result: null });
    }
    rot = [rot[rot.length - 1]!, ...rot.slice(0, -1)];
  }
  return fixtures.sort((x, y) => x.round - y.round);
}

export function newSeason(number: number, teams: readonly Team[], seed: number): SeasonState {
  const fixtures = generateFixtures(teams.map(t => t.id), number, seed);
  return {
    number, fixtures, round: 1, rounds: Math.max(...fixtures.map(f => f.round)),
    playerStats: {}, lastReport: null, finished: false
  };
}

export function computeTable(teams: readonly Team[], fixtures: readonly Fixture[]): TableRow[] {
  const rows = new Map<string, TableRow>(teams.map(t => [t.id, {
    teamId: t.id, name: t.name, shortName: t.shortName, color: t.colors.primary,
    p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0, form: []
  }]));
  const played = fixtures.filter(f => f.result).sort((a, b) => a.round - b.round);
  for (const f of played) {
    const h = rows.get(f.homeId), a = rows.get(f.awayId), r = f.result!;
    if (!h || !a) continue;
    h.p++; a.p++;
    h.gf += r.home; h.ga += r.away; a.gf += r.away; a.ga += r.home;
    if (r.home > r.away) { h.w++; a.l++; h.pts += 3; h.form.push('W'); a.form.push('L'); }
    else if (r.home < r.away) { a.w++; h.l++; a.pts += 3; a.form.push('W'); h.form.push('L'); }
    else { h.d++; a.d++; h.pts++; a.pts++; h.form.push('D'); a.form.push('D'); }
  }
  const list = [...rows.values()];
  for (const r of list) { r.gd = r.gf - r.ga; r.form = r.form.slice(-5); }
  return list.sort((x, y) => y.pts - x.pts || y.gd - x.gd || y.gf - x.gf || x.name.localeCompare(y.name));
}

export const positionOf = (table: readonly TableRow[], teamId: string): number => table.findIndex(r => r.teamId === teamId) + 1;

export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}
