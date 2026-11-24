import type { ShotRecord, Side } from '../../types/match.ts';
import { OUTCOME_COLOR, OUTCOME_LABEL } from '../../lib/pitch.ts';
import { minuteText } from '../../lib/format.ts';

const TYPE_LABEL: Record<ShotRecord['type'], string> = {
  OPEN_PLAY: 'Open play', THROUGH: 'Through ball', HEADER: 'Header', CUTBACK: 'Cutback', LONG_SHOT: 'Long shot',
  COUNTER: 'Counter', FREE_KICK: 'Free kick', CORNER: 'Corner', PENALTY: 'Penalty'
};

/** Half-pitch shot map, goal at the top. Dot area ∝ xG, colour = outcome. */
export function ShotMap({ shots, side, teamColor }: { shots: ShotRecord[]; side: Side; teamColor: string }) {
  const mine = shots.filter(s => s.side === side);
  const xg = mine.reduce((a, s) => a + s.xg, 0);
  const goals = mine.filter(s => s.outcome === 'GOAL').length;
  const onTarget = mine.filter(s => s.outcome === 'GOAL' || s.outcome === 'SAVED').length;
  const big = mine.filter(s => s.xg >= 0.3).length;
  // Biggest chances drawn last so they stay visible
  const ordered = [...mine].sort((a, b) => a.xg - b.xg);

  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      <svg viewBox="-3 -5 74 44" className="block h-auto w-full rounded-lg bg-emerald-950/40" role="img" aria-label="Shot map">
        <g fill="none" stroke="rgba(167,243,208,0.35)" strokeWidth="0.25">
          <rect x="0" y="0" width="68" height="40" />
          <rect x={34 - 20.16} y="0" width="40.32" height="16.5" />
          <rect x={34 - 9.16} y="0" width="18.32" height="5.5" />
          <path d={`M ${34 - 7.31} 16.5 A 9.15 9.15 0 0 0 ${34 + 7.31} 16.5`} />
          <rect x={34 - 3.66} y="-2" width="7.32" height="2" stroke="rgba(244,244,245,0.6)" />
          <circle cx="34" cy="11" r="0.3" fill="rgba(167,243,208,0.5)" />
        </g>
        {ordered.map(s => {
          const r = 0.55 + Math.sqrt(s.xg) * 2.6;
          return (
            <g key={s.id}>
              <title>{`${minuteText(s.minute, 0)} ${s.playerName} — ${TYPE_LABEL[s.type]}, xG ${s.xg.toFixed(2)} · ${OUTCOME_LABEL[s.outcome]}`}</title>
              <circle cx={34 + s.lat} cy={Math.min(39, s.dist)} r={r} fill={OUTCOME_COLOR[s.outcome]}
                fillOpacity={s.outcome === 'GOAL' ? 0.95 : 0.55} stroke={s.outcome === 'GOAL' ? '#fafafa' : OUTCOME_COLOR[s.outcome]} strokeWidth={s.outcome === 'GOAL' ? 0.35 : 0.2} />
            </g>
          );
        })}
        {mine.length === 0 && <text x="34" y="24" textAnchor="middle" fontSize="2.6" fill="#a1a1aa">No shots</text>}
      </svg>
      <div className="space-y-3 text-sm">
        <div className="grid grid-cols-2 gap-2">
          {[['Shots', `${mine.length}`], ['On target', `${onTarget}`], ['Goals', `${goals}`], ['xG', xg.toFixed(2)],
            ['xG / shot', mine.length ? (xg / mine.length).toFixed(2) : '—'], ['Big chances', `${big}`]].map(([k, val]) => (
            <div key={k} className="rounded-lg border border-zinc-800 bg-zinc-950/50 px-3 py-2">
              <div className="text-[11px] text-zinc-500">{k}</div>
              <div className="tabular text-lg font-semibold" style={{ color: k === 'xG' ? teamColor : undefined }}>{val}</div>
            </div>
          ))}
        </div>
        <ul className="space-y-1">
          {(Object.keys(OUTCOME_COLOR) as Array<keyof typeof OUTCOME_COLOR>).map(o => (
            <li key={o} className="flex items-center gap-2 text-xs text-zinc-400">
              <span className="h-3 w-3 rounded-full" style={{ background: OUTCOME_COLOR[o] }} />{OUTCOME_LABEL[o]}
              <span className="ml-auto tabular text-zinc-500">{mine.filter(s => s.outcome === o).length}</span>
            </li>
          ))}
          <li className="pt-1 text-[11px] text-zinc-500">Dot size = expected goals. Hover a dot for details.</li>
        </ul>
      </div>
    </div>
  );
}
