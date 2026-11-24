import type { PlayerSummary, SummaryTeam } from '../../types/match.ts';
import { ROLE_INFO } from '../../engine/roles.ts';
import { textOn } from '../../lib/pitch.ts';

const hasDetail = (p: SummaryTeam['players'][number]): p is PlayerSummary => 'avg' in p;

/** Average shape on the pitch (team attacking left → right), from per-tick positions. */
export function AveragePositions({ team }: { team: SummaryTeam }) {
  const players = team.players.filter(hasDetail).filter(p => p.avg && p.stats.ticks > 0);
  if (!players.length) return <p className="text-sm text-zinc-500">Average positions aren't available for matches played before this update.</p>;
  const maxTicks = Math.max(...players.map(p => p.stats.ticks));
  const fill = team.color;
  return (
    <div>
      <svg viewBox="-3 -3 111 78" className="block h-auto w-full rounded-lg bg-emerald-950/40" role="img" aria-label="Average positions">
        <g fill="none" stroke="rgba(167,243,208,0.3)" strokeWidth="0.3">
          <rect x="0" y="0" width="105" height="68" />
          <line x1="52.5" y1="0" x2="52.5" y2="68" />
          <circle cx="52.5" cy="34" r="9.15" />
          <rect x="0" y={34 - 20.16} width="16.5" height="40.32" />
          <rect x={105 - 16.5} y={34 - 20.16} width="16.5" height="40.32" />
        </g>
        <text x="104" y="-0.4" textAnchor="end" fontSize="1.7" fill="#a1a1aa">attacking →</text>
        {players.map(p => {
          const cx = p.avg!.y * 105, cy = p.avg!.x * 68;
          const share = p.stats.ticks / maxTicks;
          const starterLike = share > 0.6;
          return (
            <g key={p.id} opacity={0.45 + 0.55 * share}>
              <title>{`${p.name} — ${ROLE_INFO[p.role].label}, ${Math.round(p.stats.ticks / 6)}'`}</title>
              <circle cx={cx} cy={cy} r="2.3" fill={starterLike ? fill : 'transparent'} stroke={starterLike ? 'rgba(0,0,0,0.5)' : fill} strokeWidth="0.5" strokeDasharray={starterLike ? undefined : '1 0.6'} />
              <text x={cx} y={cy + 0.05} textAnchor="middle" dominantBaseline="central" fontSize="2.1" fontWeight="700" fill={starterLike ? textOn(fill) : '#e4e4e7'}>{p.shirt}</text>
              <text x={cx} y={cy + 3.9} textAnchor="middle" fontSize="1.6" fill="#d4d4d8">{p.name.split(' ').slice(-1)[0]}</text>
            </g>
          );
        })}
      </svg>
      <p className="mt-2 text-[11px] text-zinc-500">
        {team.formation ? `Set up as ${team.formation}. ` : ''}Solid dots played most of the match; dashed dots are substitutes or players who went off early.
      </p>
    </div>
  );
}
