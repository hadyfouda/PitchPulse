/** JSON save export / import for manual backups. */
import { db, type CareerRecord, type SettingsRecord } from './db.ts';
import type { MatchSummary } from '../types/match.ts';
import type { SeasonArchive } from '../types/league.ts';
import { migrateCareer } from '../league/migrate.ts';

export const SAVE_FORMAT = 'pitchpulse-save';
export const SAVE_VERSION = 4;

export interface SaveFile {
  format: typeof SAVE_FORMAT;
  version: number;
  exportedAt: string;
  career: CareerRecord;
  settings: SettingsRecord | null;
  matches: MatchSummary[];
  seasons: SeasonArchive[];
}

export async function buildSave(): Promise<SaveFile> {
  const [career, settings, matches, seasons] = await Promise.all([
    db.career.get('career'), db.settings.get('settings'), db.matches.toArray(), db.seasons.toArray()
  ]);
  if (!career) throw new Error('There is no career to export yet.');
  return { format: SAVE_FORMAT, version: SAVE_VERSION, exportedAt: new Date().toISOString(), career, settings: settings ?? null, matches, seasons };
}

export function downloadSave(save: SaveFile): void {
  const blob = new Blob([JSON.stringify(save)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const club = save.career.user.shortName.toLowerCase();
  a.href = url;
  a.download = `pitchpulse-${club}-s${save.career.season.number}r${save.career.season.round}-${save.exportedAt.slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Validates a save file's shape. Returns an error message, or null if it looks usable. */
export function validateSave(data: unknown): string | null {
  if (!data || typeof data !== 'object') return 'Not a JSON object.';
  const d = data as Partial<SaveFile>;
  if (d.format !== SAVE_FORMAT) return 'This is not a PitchPulse save file.';
  if (typeof d.version !== 'number' || d.version > SAVE_VERSION) return 'This save was made by a newer version of PitchPulse.';
  const c = d.career;
  if (!c || !c.user || !Array.isArray(c.opponents) || !Array.isArray(c.user.players)) return 'The save file is missing the career.';
  if (!Array.isArray(d.matches) || !Array.isArray(d.seasons)) return 'The save file is missing match or season history.';
  return null;
}

/** Replaces everything on this device with the save's contents (the in-progress live match is dropped). */
export async function restoreSave(save: SaveFile): Promise<void> {
  const career = migrateCareer({ ...save.career, pendingFixtureId: null });
  await db.transaction('rw', [db.career, db.settings, db.matches, db.seasons, db.live], async () => {
    await Promise.all([db.career.clear(), db.matches.clear(), db.seasons.clear(), db.live.clear()]);
    await db.career.put(career);
    if (save.settings) await db.settings.put(save.settings);
    await db.matches.bulkPut(save.matches);
    await db.seasons.bulkPut(save.seasons);
  });
}
