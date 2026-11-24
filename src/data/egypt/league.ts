/**
 * Egyptian Premier League 2026/27 — the 20 clubs, as listed in the FotMob table on 24 Nov 2026.
 * Format chosen for the game: double round-robin (38 rounds), not the real split-league format.
 * `table` is the real standing at that date (P W D L GF GA Pts) — used only to calibrate club strength.
 * Colours are approximations of the club colours (no crests are used).
 */
export interface RealLeagueClub {
  id: string;
  name: string;
  shortName: string;
  colors: { primary: string; secondary: string };
  table: { pos: number; p: number; w: number; d: number; l: number; gf: number; ga: number; pts: number };
}

const c = (pos: number, id: string, name: string, shortName: string, primary: string, secondary: string,
  p: number, w: number, d: number, l: number, gf: number, ga: number, pts: number): RealLeagueClub =>
  ({ id, name, shortName, colors: { primary, secondary }, table: { pos, p, w, d, l, gf, ga, pts } });

export const EGYPT_LEAGUE = {
  name: 'Egyptian Premier League',
  season: '2026/27',
  format: 'DOUBLE_ROUND_ROBIN' as const,
  clubs: [
    c(1, 'pyramids', 'Pyramids FC', 'PYR', '#1e3a8a', '#7dd3fc', 9, 9, 0, 0, 21, 4, 27),
    c(2, 'zamalek', 'Zamalek', 'ZAM', '#f8fafc', '#dc2626', 9, 7, 1, 1, 13, 5, 22),
    c(3, 'ahly', 'Al Ahly', 'AHL', '#dc2626', '#f8fafc', 9, 6, 2, 1, 15, 8, 20),
    c(4, 'ceramica', 'Ceramica Cleopatra', 'CER', '#ea580c', '#1e3a8a', 8, 6, 0, 2, 15, 8, 18),
    c(5, 'ittihad', 'Al Ittihad Alexandria', 'ITT', '#15803d', '#facc15', 9, 4, 3, 2, 10, 7, 15),
    c(6, 'modern', 'Modern Sport FC', 'MOD', '#16a34a', '#f8fafc', 8, 4, 1, 3, 12, 10, 13),
    c(7, 'nbe', 'National Bank', 'NBE', '#047857', '#eab308', 9, 3, 3, 3, 9, 9, 12),
    c(8, 'smouha', 'Smouha SC', 'SMO', '#1d4ed8', '#f8fafc', 9, 3, 3, 3, 5, 5, 12),
    c(9, 'zed', 'ZED FC', 'ZED', '#111827', '#22c55e', 9, 3, 3, 3, 9, 10, 12),
    c(10, 'mokawloon', 'Al Mokawloon Al Arab', 'MOK', '#facc15', '#1d4ed8', 8, 3, 2, 3, 11, 8, 11),
    c(11, 'petrojet', 'Petrojet-Suez', 'PET', '#dc2626', '#1e40af', 8, 2, 3, 3, 11, 13, 9),
    c(12, 'masry', 'Al Masry SC', 'MAS', '#15803d', '#f8fafc', 8, 2, 3, 3, 8, 10, 9),
    c(13, 'olympic', 'Olympic El Qanah FC', 'OLY', '#1e40af', '#e5e7eb', 8, 1, 5, 2, 10, 12, 8),
    c(14, 'degla', 'Wadi Degla FC', 'WDG', '#facc15', '#111827', 9, 1, 5, 3, 9, 11, 8),
    c(15, 'gaish', "Tala'ea El Gaish", 'TEG', '#166534', '#facc15', 8, 2, 2, 4, 6, 12, 8),
    c(16, 'enppi', 'Al Sharkeyah-ENPPI', 'ENP', '#6b7280', '#111827', 8, 2, 1, 5, 11, 16, 7),
    c(17, 'mahalla', 'Ghazl Al Mahalla', 'GHZ', '#38bdf8', '#f8fafc', 8, 2, 1, 5, 4, 11, 7),
    c(18, 'asyut', 'Asyut Petroleum', 'ASP', '#1e3a8a', '#dc2626', 8, 1, 3, 4, 4, 8, 6),
    c(19, 'aboqir', 'Abo Qir Semad', 'ABQ', '#2563eb', '#f8fafc', 9, 1, 2, 6, 3, 12, 5),
    c(20, 'gouna', 'El Gouna FC', 'GOU', '#dc2626', '#1e3a8a', 9, 0, 3, 6, 6, 13, 3)
  ]
};
