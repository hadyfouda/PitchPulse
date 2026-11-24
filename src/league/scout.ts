/** Pre-match scout dossier: built from the opponent's identity, squad, form and season data. */
import type { Player, Team } from '../types/domain.ts';
import { isAvailable } from '../types/domain.ts';
import type { SeasonState, TableRow } from '../types/league.ts';
import type { Tactics } from '../types/tactics.ts';
import { IDENTITIES, identityLabel } from '../engine/identities.ts';
import { ROLE_INFO } from '../engine/roles.ts';
import { playerOverall } from '../data/generators.ts';
import { computeTable, ordinal, positionOf } from './schedule.ts';
import { BUILDUP_LABEL, PRESSING_LABEL } from '../lib/labels.ts';

export interface ScoutReport {
  style: string;
  summary: string;
  formation: string;
  shape: string;
  position: string;
  form: TableRow['form'];
  goalsFor: number;
  goalsAgainst: number;
  keyThreat: { name: string; shirt: number; role: string; note: string } | null;
  absentees: string[];
  weaknesses: string[];
  suggestion: { label: string; why: string; patch: Partial<Tactics> } | null;
}

/** Counter-tactics that the engine's tactical matrix actually rewards against each identity. */
const COUNTERS: Record<keyof typeof IDENTITIES, { label: string; why: string; patch: Partial<Tactics> }> = {
  GEGENPRESS: { label: 'Go direct over the press', why: 'Long balls skip their press and attack the space behind a high line.', patch: { buildUp: 'DIRECT', defLine: 'STANDARD' } },
  TIKI_TAKA: { label: 'Press them high', why: 'A High Press traps their short build-up and forces turnovers near their box.', patch: { pressing: 'HIGH', buildUp: 'BALANCED' } },
  PARK_THE_BUS: { label: 'Stretch them wide', why: 'Their low block packs the centre — attack the wings, cross and shoot from range.', patch: { focus: 'WINGS', mentality: 'ATTACKING', pressing: 'MID' } },
  WING_PLAY: { label: 'Hit the channels on the break', why: 'Their full-backs push on; Counter-Attack exploits the space they leave.', patch: { buildUp: 'COUNTER', focus: 'BALANCED' } },
  COUNTER_ATTACK: { label: 'Keep the ball, stay compact', why: 'Deny transitions: short possession and a balanced mentality give them nothing to break on.', patch: { buildUp: 'SHORT', mentality: 'BALANCED', defLine: 'STANDARD' } },
  DIRECT: { label: 'Sit deeper', why: 'A deep line and low block swallow long balls aimed at their target man.', patch: { defLine: 'DEEP', pressing: 'LOW' } }
};

function threatScore(p: Player, goals: number, assists: number): number {
  const a = p.attrs;
  const attack = p.position === 'FWD' ? 1 : p.position === 'MID' ? 0.8 : 0.3;
  return goals * 4 + assists * 2.5 + ((a.finishing + a.vision + a.technique + a.pace) / 4) * attack * 0.25;
}

export function scoutReport(opp: Team, teams: readonly Team[], season: SeasonState): ScoutReport {
  const table = computeTable(teams, season.fixtures);
  const row = table.find(r => r.teamId === opp.id);
  const played = row?.p ?? 0;
  const stats = season.playerStats;
  const starters = new Set(opp.lineup.slots.map(s => s.playerId));

  const candidates = opp.players.filter(p => isAvailable(p) && p.position !== 'GK');
  const threat = [...candidates].sort((a, b) => threatScore(b, stats[b.id]?.goals ?? 0, stats[b.id]?.assists ?? 0) - threatScore(a, stats[a.id]?.goals ?? 0, stats[a.id]?.assists ?? 0))[0];
  const role = threat ? (opp.lineup.slots.find(s => s.playerId === threat.id)?.role ?? threat.naturalRoles[0] ?? 'CM') : 'CM';
  const tg = threat ? stats[threat.id]?.goals ?? 0 : 0, ta = threat ? stats[threat.id]?.assists ?? 0 : 0;

  const absentees = opp.players.filter(p => !isAvailable(p) && (starters.has(p.id) || playerOverall(p) >= 70))
    .map(p => p.injury ? `${p.name} (${p.injury.label})` : `${p.name} (suspended)`);

  const weaknesses: string[] = [];
  if (opp.identity !== 'CUSTOM') weaknesses.push(IDENTITIES[opp.identity].weakness);
  if (played >= 3 && row) {
    if (row.ga / played >= 1.8) weaknesses.push(`Leaky at the back: ${(row.ga / played).toFixed(1)} conceded per game.`);
    if (row.gf / played <= 0.9) weaknesses.push(`Struggle to score: ${(row.gf / played).toFixed(1)} per game.`);
  }
  const avgFitness = opp.players.filter(p => starters.has(p.id)).reduce((a, p) => a + p.fitness, 0) / Math.max(1, starters.size);
  if (avgFitness < 85) weaknesses.push(`Tired legs (starters at ${Math.round(avgFitness)}% fitness) — pressing late in the game should pay off.`);
  if (absentees.length >= 2) weaknesses.push(`Short of key men: ${absentees.length} regulars unavailable.`);

  const profile = opp.identity !== 'CUSTOM' ? IDENTITIES[opp.identity] : null;
  return {
    style: identityLabel(opp.identity),
    summary: profile?.summary ?? 'Unpredictable set-up.',
    formation: opp.tactics.formation,
    shape: `${opp.tactics.formation} · ${PRESSING_LABEL[opp.tactics.pressing]} · ${BUILDUP_LABEL[opp.tactics.buildUp]}`,
    position: row && played ? `${ordinal(positionOf(table, opp.id))} · ${row.pts} pts` : 'No games played yet',
    form: row?.form ?? [],
    goalsFor: played ? row!.gf / played : 0,
    goalsAgainst: played ? row!.ga / played : 0,
    keyThreat: threat ? {
      name: threat.name, shirt: threat.shirt, role: ROLE_INFO[role].label,
      note: tg + ta > 0 ? `${tg} goals, ${ta} assists this season. ${ROLE_INFO[role].desc}` : ROLE_INFO[role].desc
    } : null,
    absentees,
    weaknesses,
    suggestion: opp.identity !== 'CUSTOM' ? COUNTERS[opp.identity] : null
  };
}
