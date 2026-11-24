import type { ReactNode } from 'react';

export interface MobileNavItem<T extends string> {
  value: T;
  label: string;
  icon: ReactNode;
  badge?: string | number;
}

/**
 * Bottom tab bar for phones (hidden from the `lg` breakpoint up, where every column is visible at once).
 * Sits above the home indicator thanks to the safe-area inset.
 */
export function MobileNav<T extends string>({ items, value, onChange }: { items: MobileNavItem<T>[]; value: T; onChange: (v: T) => void }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-800 bg-zinc-950/95 backdrop-blur lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} aria-label="Sections">
      <div className="mx-auto flex max-w-xl">
        {items.map(it => {
          const active = it.value === value;
          return (
            <button key={it.value} onClick={() => { onChange(it.value); window.scrollTo({ top: 0 }); }}
              className={`relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition ${active ? 'text-emerald-400' : 'text-zinc-500'}`}
              aria-current={active ? 'page' : undefined}>
              <span className="h-5 w-5">{it.icon}</span>
              {it.label}
              {it.badge !== undefined && it.badge !== 0 && (
                <span className="absolute right-[calc(50%-1.4rem)] top-1 rounded-full bg-amber-500 px-1.5 text-[10px] font-bold leading-4 text-zinc-950">{it.badge}</span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/** `hidden` below lg unless this section is the active one; always visible on desktop. */
export const mobileSection = (active: boolean): string => (active ? '' : 'hidden lg:block');

const svg = (d: ReactNode) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">{d}</svg>
);

export const NavIcons = {
  club: svg(<><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z" /><path d="M9 12l2 2 4-4" /></>),
  squad: svg(<><circle cx="9" cy="8" r="3" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /><circle cx="17" cy="9" r="2.5" /><path d="M16 14.2c2.9.4 5 2.8 5 5.8" /></>),
  tactics: svg(<><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M12 4v16" /><circle cx="12" cy="12" r="2.5" /><path d="M6 9l2 2m0-2l-2 2M16 14l2 2m0-2l-2 2" /></>),
  live: svg(<><circle cx="12" cy="12" r="9" /><path d="M10 8.5l5 3.5-5 3.5z" fill="currentColor" /></>),
  touchline: svg(<><path d="M4 20V10l8-6 8 6v10" /><path d="M9 20v-6h6v6" /></>),
};
