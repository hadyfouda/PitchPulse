import { useMemo, useState } from 'react';
import type { Player, Position } from '../../types/domain.ts';
import type { RoleId } from '../../types/tactics.ts';
import { ROLES } from '../../types/tactics.ts';
import { useGame } from '../../store/gameStore.ts';
import { ROLE_INFO } from '../../engine/roles.ts';
import { playerOverall, playerValue } from '../../data/generators.ts';
import { formatMoney, wageBill } from '../../club/economy.ts';
import { potentialRange } from '../../club/development.ts';
import { MAX_SQUAD, affordability, buildMarket, evaluateOffer, evaluateWage, type Bid, type MarketEntry } from '../../club/transfers.ts';
import { Panel, Segmented } from '../ui/controls.tsx';
import { Modal } from '../ui/Modal.tsx';

type Source = 'ALL' | 'CLUBS' | 'FREE';
type SortKey = 'FIT' | 'OVR' | 'PRICE' | 'AGE' | 'POT';
const POS_COLOR: Record<Position, string> = { GK: 'text-amber-300', DEF: 'text-sky-300', MID: 'text-emerald-300', FWD: 'text-rose-300' };

export function TransfersTab() {
  const career = useGame(s => s.career)!;
  const [pos, setPos] = useState<'ALL' | Position>('ALL');
  const [source, setSource] = useState<Source>('ALL');
  const [sort, setSort] = useState<SortKey>('FIT');
  const [maxAge, setMaxAge] = useState(34);
  const [minOvr, setMinOvr] = useState(65);
  const [maxPrice, setMaxPrice] = useState(0);
  const [role, setRole] = useState<'' | RoleId>('');
  const [deal, setDeal] = useState<MarketEntry | null>(null);
  const [selling, setSelling] = useState<Player | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const f = career.finances;
  const budgetCap = maxPrice || f.transferBudget;

  const market = useMemo(() => buildMarket(career.user, career.opponents, career.market), [career.user, career.opponents, career.market]);
  const rows = market
    .filter(e => (pos === 'ALL' || e.player.position === pos) && (source === 'ALL' || (source === 'FREE') === (e.clubId === null)))
    .filter(e => e.player.age <= maxAge && e.ovr >= minOvr && e.asking <= budgetCap && (!role || e.player.naturalRoles.includes(role)))
    .sort((a, b) => sort === 'FIT' ? b.fit.delta - a.fit.delta || b.ovr - a.ovr
      : sort === 'OVR' ? b.ovr - a.ovr : sort === 'PRICE' ? a.asking - b.asking : sort === 'AGE' ? a.player.age - b.player.age : b.player.potential - a.player.potential)
    .slice(0, 40);

  return (
    <div className="space-y-3">
      <Panel title="Transfer window">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="Transfer budget" value={formatMoney(f.transferBudget)} />
          <Stat label="Club balance" value={formatMoney(f.balance)} />
          <Stat label="Wage bill / budget" value={`${formatMoney(wageBill(career.user))} / ${formatMoney(f.wageBudget)}`} warn={wageBill(career.user) > f.wageBudget} />
          <Stat label="Squad" value={`${career.user.players.length} / ${MAX_SQUAD}`} />
        </div>
        {flash && <p className="mt-2 rounded-md bg-emerald-500/10 px-2 py-1.5 text-sm text-emerald-200">{flash}</p>}
      </Panel>

      <Panel title="Scouting hub" right={<span className="text-[11px] text-zinc-500">{rows.length} shown · fit compares with your current XI and roles</span>}>
        <div className="mb-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <Segmented size="sm" value={pos} onChange={setPos} options={[{ value: 'ALL', label: 'All' }, { value: 'GK', label: 'GK' }, { value: 'DEF', label: 'DEF' }, { value: 'MID', label: 'MID' }, { value: 'FWD', label: 'FWD' }]} />
          <Segmented size="sm" value={source} onChange={setSource} options={[{ value: 'ALL', label: 'Everyone' }, { value: 'CLUBS', label: 'At clubs' }, { value: 'FREE', label: 'Free agents' }]} />
          <Segmented size="sm" value={sort} onChange={setSort} options={[{ value: 'FIT', label: 'Fit' }, { value: 'OVR', label: 'OVR' }, { value: 'POT', label: 'Potential' }, { value: 'PRICE', label: 'Price' }, { value: 'AGE', label: 'Age' }]} />
          <label className="flex items-center gap-2 text-xs text-zinc-400">Max age <input type="range" min={17} max={36} value={maxAge} onChange={e => setMaxAge(+e.target.value)} className="flex-1 accent-emerald-500" /><b className="tabular w-6 text-zinc-200">{maxAge}</b></label>
          <label className="flex items-center gap-2 text-xs text-zinc-400">Min OVR <input type="range" min={50} max={90} value={minOvr} onChange={e => setMinOvr(+e.target.value)} className="flex-1 accent-emerald-500" /><b className="tabular w-6 text-zinc-200">{minOvr}</b></label>
          <div className="flex gap-2">
            <select className="field py-1 text-xs" value={role} onChange={e => setRole(e.target.value as RoleId | '')} aria-label="Role">
              <option value="">Any role</option>
              {ROLES.map(r => <option key={r} value={r}>{ROLE_INFO[r].label}</option>)}
            </select>
            <select className="field py-1 text-xs" value={maxPrice} onChange={e => setMaxPrice(+e.target.value)} aria-label="Max price">
              <option value={0}>Within budget</option>
              {[1, 3, 5, 10, 20, 40].map(m => <option key={m} value={m * 1_000_000}>≤ €{m}M</option>)}
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-[12px]">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500">
                <th className="py-1.5 text-left font-medium">Player</th><th className="px-1.5 text-right font-medium">Age</th><th className="px-1.5 text-right font-medium">OVR</th>
                <th className="px-1.5 text-right font-medium" title="Scouted potential range">Pot</th><th className="pl-3 text-left font-medium">Club</th>
                <th className="px-1.5 text-right font-medium">Asking</th><th className="px-1.5 text-right font-medium">Wage/wk</th><th className="pl-3 text-left font-medium" title="Gain over your current starter in that slot and role">Fit vs your XI</th><th />
              </tr>
            </thead>
            <tbody>
              {rows.map(e => {
                const [lo, hi] = potentialRange(e.player);
                return (
                  <tr key={e.player.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                    <td className="py-1.5">
                      <span className={`mr-1 font-semibold ${POS_COLOR[e.player.position]}`}>{e.player.position}</span>
                      <span className="text-zinc-100">{e.player.name}</span>
                      <span className="ml-1 text-[10px] text-zinc-500">{e.player.naturalRoles.map(r => ROLE_INFO[r].short).join('/')}</span>
                    </td>
                    <td className="tabular px-1.5 text-right text-zinc-400">{e.player.age}</td>
                    <td className="tabular px-1.5 text-right font-semibold text-zinc-100">{e.ovr}</td>
                    <td className="tabular px-1.5 text-right text-zinc-400">{hi > e.ovr ? `${lo}–${hi}` : '—'}</td>
                    <td className="max-w-[9rem] truncate pl-3 text-zinc-400">{e.clubName}</td>
                    <td className="tabular px-1.5 text-right text-zinc-200">{e.clubId ? formatMoney(e.asking) : 'Free'}</td>
                    <td className="tabular px-1.5 text-right text-zinc-400">{formatMoney(e.wageDemand)}</td>
                    <td className={`whitespace-nowrap pl-3 ${e.fit.delta >= 1 ? 'text-emerald-300' : 'text-zinc-500'}`}>{e.fit.label}</td>
                    <td className="py-1 pl-2 text-right">
                      {e.blocked ? <span className="text-[11px] text-zinc-600" title={e.blocked}>Unavailable</span>
                        : <button className="btn px-2 py-0.5 text-[11px]" onClick={() => setDeal(e)}>Negotiate</button>}
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && <tr><td colSpan={9} className="py-4 text-center text-zinc-500">No players match these filters.</td></tr>}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Your squad · sell">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-[12px]">
            <thead><tr className="border-b border-zinc-800 text-zinc-500"><th className="py-1.5 text-left font-medium">Player</th><th className="text-right font-medium">Age</th><th className="text-right font-medium">OVR</th><th className="text-right font-medium">Value</th><th className="text-right font-medium">Wage/wk</th><th /></tr></thead>
            <tbody>
              {[...career.user.players].sort((a, b) => playerOverall(b) - playerOverall(a)).map(p => (
                <tr key={p.id} className="border-b border-zinc-800/50">
                  <td className="py-1.5"><span className={`mr-1 font-semibold ${POS_COLOR[p.position]}`}>{p.position}</span><span className="text-zinc-200">{p.name}</span></td>
                  <td className="tabular text-right text-zinc-400">{p.age}</td>
                  <td className="tabular text-right font-semibold text-zinc-100">{playerOverall(p)}</td>
                  <td className="tabular text-right text-zinc-300">{formatMoney(playerValue(p))}</td>
                  <td className="tabular text-right text-zinc-400">{formatMoney(p.wage)}</td>
                  <td className="py-1 text-right"><button className="btn px-2 py-0.5 text-[11px]" onClick={() => setSelling(p)}>Invite bids</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {deal && <NegotiationModal entry={deal} onClose={() => setDeal(null)} onDone={msg => { setDeal(null); setFlash(msg); }} />}
      {selling && <SellModal player={selling} onClose={() => setSelling(null)} onDone={msg => { setSelling(null); setFlash(msg); }} />}
    </div>
  );
}

function Stat({ label, value, warn = false }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 px-3 py-2">
      <div className="text-[11px] text-zinc-500">{label}</div>
      <div className={`tabular text-sm font-semibold ${warn ? 'text-rose-300' : 'text-zinc-100'}`}>{value}</div>
    </div>
  );
}

const roundTo = (v: number, step: number): number => Math.max(0, Math.round(v / step) * step);

function NegotiationModal({ entry, onClose, onDone }: { entry: MarketEntry; onClose: () => void; onDone: (msg: string) => void }) {
  const career = useGame(s => s.career)!;
  const buy = useGame(s => s.buyPlayer);
  const free = entry.clubId === null;
  const [stage, setStage] = useState<'FEE' | 'WAGE'>(free ? 'WAGE' : 'FEE');
  const [fee, setFee] = useState(free ? 0 : roundTo(entry.asking * 0.85, 50_000));
  const [agreedFee, setAgreedFee] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [wage, setWage] = useState(roundTo(entry.wageDemand * 0.95, 500));
  const [msg, setMsg] = useState<{ tone: 'ok' | 'warn' | 'bad'; text: string } | null>(null);
  const [ended, setEnded] = useState(false);
  const [busy, setBusy] = useState(false);
  const world = { user: career.user, opponents: career.opponents, market: career.market, finances: career.finances };

  const offer = (amount: number): void => {
    const v = evaluateOffer(entry, amount, attempt);
    setAttempt(a => a + 1);
    if (v.status === 'ACCEPT') { setAgreedFee(amount); setStage('WAGE'); setMsg({ tone: 'ok', text: `${entry.clubName} accept ${formatMoney(amount)}. Now agree personal terms.` }); }
    else if (v.status === 'COUNTER') { setFee(v.counter); setMsg({ tone: 'warn', text: v.message }); }
    else { setEnded(true); setMsg({ tone: 'bad', text: v.message }); }
  };

  const sign = async (): Promise<void> => {
    const terms = evaluateWage(entry, wage);
    if (!terms.ok) { setMsg({ tone: 'warn', text: terms.message }); return; }
    const problem = affordability(world, agreedFee, wage);
    if (problem) { setMsg({ tone: 'bad', text: problem }); return; }
    setBusy(true);
    onDone(await buy(entry, agreedFee, wage));
  };

  const [lo, hi] = potentialRange(entry.player);
  const toneClass = msg?.tone === 'ok' ? 'bg-emerald-500/10 text-emerald-200' : msg?.tone === 'warn' ? 'bg-amber-500/10 text-amber-200' : 'bg-rose-500/10 text-rose-200';
  return (
    <Modal title={`Negotiate · ${entry.player.name}`} onClose={onClose}>
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-lg bg-zinc-950/60 p-2"><div className="text-zinc-500">OVR / Pot</div><div className="tabular text-sm font-semibold text-zinc-100">{entry.ovr} / {hi > entry.ovr ? `${lo}–${hi}` : entry.ovr}</div></div>
        <div className="rounded-lg bg-zinc-950/60 p-2"><div className="text-zinc-500">Value</div><div className="tabular text-sm font-semibold text-zinc-100">{formatMoney(entry.value)}</div></div>
        <div className="rounded-lg bg-zinc-950/60 p-2"><div className="text-zinc-500">Age · {entry.player.position}</div><div className="tabular text-sm font-semibold text-zinc-100">{entry.player.age}</div></div>
      </div>
      <p className={`mt-2 text-xs ${entry.fit.delta >= 1 ? 'text-emerald-300' : 'text-zinc-400'}`}>{entry.fit.label} · {entry.clubName}</p>

      {stage === 'FEE' && (
        <div className="mt-4 space-y-2">
          <div className="flex items-baseline justify-between text-sm"><span className="text-zinc-400">Their valuation</span><b className="tabular text-zinc-100">{formatMoney(entry.asking)}</b></div>
          <label className="block text-xs text-zinc-400">Your offer
            <input type="range" min={roundTo(entry.asking * 0.5, 50_000)} max={roundTo(entry.asking * 1.1, 50_000)} step={50_000} value={fee}
              onChange={e => setFee(+e.target.value)} disabled={ended} className="mt-1 w-full accent-emerald-500" />
          </label>
          <div className="flex items-center justify-between">
            <span className="tabular text-lg font-semibold text-zinc-50">{formatMoney(fee)}</span>
            <span className="text-[11px] text-zinc-500">Budget {formatMoney(career.finances.transferBudget)} · round {Math.min(3, attempt + 1)}/3</span>
          </div>
          <button className="btn btn-primary w-full" disabled={ended} onClick={() => offer(fee)}>Submit offer</button>
        </div>
      )}

      {stage === 'WAGE' && (
        <div className="mt-4 space-y-2">
          {!free && <div className="flex justify-between text-sm"><span className="text-zinc-400">Agreed fee</span><b className="tabular text-zinc-100">{formatMoney(agreedFee)}</b></div>}
          <div className="flex justify-between text-sm"><span className="text-zinc-400">Wage demand</span><b className="tabular text-zinc-100">{formatMoney(entry.wageDemand)}/wk</b></div>
          <label className="block text-xs text-zinc-400">Your wage offer
            <input type="range" min={roundTo(entry.wageDemand * 0.6, 500)} max={roundTo(entry.wageDemand * 1.3, 500)} step={500} value={wage} onChange={e => setWage(+e.target.value)} className="mt-1 w-full accent-emerald-500" />
          </label>
          <div className="flex items-center justify-between">
            <span className="tabular text-lg font-semibold text-zinc-50">{formatMoney(wage)}/wk</span>
            <span className="text-[11px] text-zinc-500">Wage room {formatMoney(Math.max(0, career.finances.wageBudget - wageBill(career.user)))}/wk</span>
          </div>
          {free && <p className="text-[11px] text-zinc-500">Free transfer: a signing-on bonus of about {formatMoney(Math.round(entry.value * 0.08 / 10_000) * 10_000)} is paid from the balance.</p>}
          <button className="btn btn-primary w-full" disabled={busy} onClick={() => void sign()}>Agree terms & sign</button>
        </div>
      )}
      {msg && <p className={`mt-3 rounded-md px-2 py-1.5 text-sm ${toneClass}`}>{msg.text}</p>}
    </Modal>
  );
}

function SellModal({ player, onClose, onDone }: { player: Player; onClose: () => void; onDone: (msg: string) => void }) {
  const requestBids = useGame(s => s.requestBids);
  const accept = useGame(s => s.acceptBid);
  const [bids] = useState<Bid[] | string>(() => requestBids(player.id));
  const [busy, setBusy] = useState(false);
  return (
    <Modal title={`Offers for ${player.name}`} onClose={onClose}>
      <p className="text-xs text-zinc-400">Valued at {formatMoney(playerValue(player))}. You keep 60% of any fee for transfers; all of it goes to the club balance.</p>
      {typeof bids === 'string' ? <p className="mt-3 rounded-md bg-amber-500/10 px-2 py-1.5 text-sm text-amber-200">{bids}</p> : (
        <ul className="mt-3 space-y-2">
          {bids.map(b => (
            <li key={b.clubId} className="flex items-center justify-between gap-2 rounded-lg border border-zinc-800 bg-zinc-950/50 px-3 py-2">
              <span className="text-sm text-zinc-200">{b.clubName}</span>
              <span className="flex items-center gap-2">
                <b className="tabular text-zinc-50">{formatMoney(b.fee)}</b>
                <button className="btn btn-primary px-2 py-1 text-xs" disabled={busy} onClick={async () => { setBusy(true); onDone(await accept(player.id, b)); }}>Accept</button>
              </span>
            </li>
          ))}
        </ul>
      )}
      <button className="btn mt-3 w-full" onClick={onClose}>Keep him</button>
    </Modal>
  );
}
