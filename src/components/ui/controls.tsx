import type { ReactNode } from 'react';

export function Panel({ title, right, children, className = '' }: { title?: string; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`panel p-3 ${className}`}>
      {(title || right) && (
        <div className="mb-2.5 flex items-center justify-between gap-2">
          {title && <h2 className="panel-title">{title}</h2>}
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

export function Segmented<T extends string>({ value, options, onChange, size = 'md', pendingValue }: {
  value: T;
  options: ReadonlyArray<{ value: T; label: string; title?: string }>;
  onChange: (v: T) => void;
  size?: 'sm' | 'md';
  pendingValue?: T;
}) {
  return (
    <div className="flex flex-wrap gap-1 rounded-lg bg-zinc-950/60 p-0.5">
      {options.map(o => {
        const active = (pendingValue ?? value) === o.value;
        const pending = pendingValue !== undefined && pendingValue !== value && pendingValue === o.value;
        return (
          <button
            key={o.value}
            type="button"
            title={o.title}
            onClick={() => onChange(o.value)}
            className={`flex-1 whitespace-nowrap rounded-md px-2 ${size === 'sm' ? 'py-1 text-[11px]' : 'py-1.5 text-xs'} font-medium transition ${
              active
                ? pending ? 'bg-amber-500/20 text-amber-200 ring-1 ring-amber-500/50' : 'bg-emerald-600/25 text-emerald-200 ring-1 ring-emerald-500/50'
                : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 py-1.5">
      <span className="min-w-0">
        <span className="block text-sm text-zinc-200">{label}</span>
        {hint && <span className="block text-[11px] text-zinc-500">{hint}</span>}
      </span>
      <input type="checkbox" className="peer sr-only" checked={checked} onChange={e => onChange(e.target.checked)} />
      <span className="relative h-5 w-9 flex-none rounded-full bg-zinc-700 transition peer-checked:bg-emerald-600 peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-400 after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-zinc-200 after:transition peer-checked:after:translate-x-4" />
    </label>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">{label}</div>
      {children}
    </div>
  );
}

export function StatBar({ label, home, away, format = (v: number) => String(v), homeColor, awayColor, homeText, awayText }: {
  label: string; home: number; away: number; format?: (v: number) => string; homeColor: string; awayColor: string; homeText?: string; awayText?: string;
}) {
  const total = home + away;
  const hp = total === 0 ? 50 : (home / total) * 100;
  return (
    <div>
      <div className="flex justify-between text-xs tabular">
        <span className="font-semibold text-zinc-100">{homeText ?? format(home)}</span>
        <span className="text-zinc-500">{label}</span>
        <span className="font-semibold text-zinc-100">{awayText ?? format(away)}</span>
      </div>
      <div className="mt-1 flex h-1.5 overflow-hidden rounded-full bg-zinc-800">
        <div style={{ width: `${hp}%`, background: homeColor }} className="transition-all duration-500" />
        <div style={{ width: `${100 - hp}%`, background: awayColor }} className="opacity-80 transition-all duration-500" />
      </div>
    </div>
  );
}
