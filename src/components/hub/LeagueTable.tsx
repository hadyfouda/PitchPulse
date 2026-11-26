import type { TableRow } from '../../types/league.ts';

const FORM_CLASS = { W: 'bg-emerald-600/80', D: 'bg-zinc-600', L: 'bg-rose-600/80' } as const;

export function FormDots({ form }: { form: TableRow['form'] }) {
  return (
    <span className="inline-flex gap-0.5">
      {form.map((r, i) => <span key={i} className={`grid h-4 w-4 place-items-center rounded-[3px] text-[9px] font-bold text-white ${FORM_CLASS[r]}`}>{r}</span>)}
    </span>
  );
}

export function LeagueTable({ rows, userId, compact = false, highlightIds = [] }: { rows: TableRow[]; userId: string; compact?: boolean; highlightIds?: string[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[12px]">
        <thead>
          <tr className="border-b border-zinc-800 text-[11px] text-zinc-500">
            <th className="w-6 py-1.5 text-right font-medium">#</th>
            <th className="w-full py-1.5 pl-2 text-left font-medium">Club</th>
            <th className="w-8 text-right font-medium" title="Played">P</th>
            {!compact && <><th className="hidden w-7 text-right font-medium sm:table-cell">W</th><th className="hidden w-7 text-right font-medium sm:table-cell">D</th><th className="hidden w-7 text-right font-medium sm:table-cell">L</th>
              <th className="hidden w-14 whitespace-nowrap text-right font-medium sm:table-cell" title="Goals for–against">GF–GA</th></>}
            <th className="w-10 text-right font-medium" title="Goal difference">GD</th>
            <th className="w-10 text-right font-semibold text-zinc-300">Pts</th>
            {!compact && <th className="pl-2 text-left font-medium sm:pl-3">Form</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const user = r.teamId === userId;
            return (
              <tr key={r.teamId} className={`border-b border-zinc-800/50 ${user ? 'bg-emerald-500/10' : highlightIds.includes(r.teamId) ? 'bg-zinc-800/40' : ''}`}>
                <td className={`tabular py-1.5 text-right ${i === 0 ? 'text-amber-300' : 'text-zinc-500'}`}>{i + 1}</td>
                <td className="max-w-0 py-1.5 pl-2">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="h-2.5 w-2.5 flex-none rounded-full" style={{ background: r.color }} />
                    <span className={`truncate ${user ? 'font-semibold text-emerald-200' : 'text-zinc-200'}`}>{compact ? r.shortName : r.name}</span>
                  </span>
                </td>
                <td className="tabular text-right text-zinc-400">{r.p}</td>
                {!compact && <><td className="tabular hidden text-right text-zinc-400 sm:table-cell">{r.w}</td><td className="tabular hidden text-right text-zinc-400 sm:table-cell">{r.d}</td><td className="tabular hidden text-right text-zinc-400 sm:table-cell">{r.l}</td>
                  <td className="tabular hidden whitespace-nowrap text-right text-zinc-500 sm:table-cell">{r.gf}–{r.ga}</td></>}
                <td className={`tabular text-right ${r.gd > 0 ? 'text-emerald-400' : r.gd < 0 ? 'text-rose-400' : 'text-zinc-400'}`}>{r.gd > 0 ? `+${r.gd}` : r.gd}</td>
                <td className="tabular text-right font-semibold text-zinc-100">{r.pts}</td>
                {!compact && <td className="whitespace-nowrap pl-2 sm:pl-3"><FormDots form={r.form} /></td>}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
