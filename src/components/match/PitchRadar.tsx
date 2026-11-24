import { useEffect, useRef } from 'react';
import type { EngineTick, ShotRecord } from '../../types/match.ts';
import { MS_PER_MATCH_MINUTE, TICKS_PER_MINUTE } from '../../engine/constants.ts';
import { shotAbs } from '../../engine/geometry.ts';
import { ROLE_INFO } from '../../engine/roles.ts';
import { useGame } from '../../store/gameStore.ts';
import { OUTCOME_COLOR, drawPitch, pitchBox, textOn, toPx } from '../../lib/pitch.ts';
import { Panel, Segmented } from '../ui/controls.tsx';
import { ZoneTracker } from './LivePanels.tsx';

interface Pt { x: number; y: number }
interface ShotAnim { shot: ShotRecord; start: number; from: Pt }
interface RadarState {
  dots: Map<string, Pt>;
  ball: Pt | null;
  trail: Pt[];
  anim: ShotAnim | null;
  lastShotId: number;
  lastFrame: number;
  lastKey: number;
  settled: boolean;
}

const SHOT_ANIM_MS = 1500;
const OUTCOME_TEXT: Record<ShotRecord['outcome'], string> = { GOAL: 'GOAL!', SAVED: 'SAVED', OFF: 'WIDE', BLOCKED: 'BLOCKED' };

/** A "key moment" is anything worth watching in Highlights mode. */
function isKeyMoment(v: EngineTick): boolean {
  if (v.period !== 'FIRST' && v.period !== 'SECOND' && v.period !== 'ET1' && v.period !== 'ET2') return false;
  if (v.setPiece) return true;
  if (v.lastShot && v.tick - v.lastShot.tick <= 2) return true;
  return v.ball.third === 2;
}

export function PitchRadar({ v }: { v: EngineTick }) {
  const settings = useGame(s => s.settings);
  const setSettings = useGame(s => s.setSettings);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef(v);
  const modeRef = useRef(settings);
  viewRef.current = v;
  modeRef.current = settings;
  const st = useRef<RadarState>({ dots: new Map(), ball: null, trail: [], anim: null, lastShotId: v.lastShot?.id ?? 0, lastFrame: 0, lastKey: 0, settled: false });

  // New data arrived → wake the render loop
  useEffect(() => { st.current.settled = false; }, [v]);

  useEffect(() => {
    if (settings.pitchCollapsed) return;
    const canvas = canvasRef.current, wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    let cssW = 0, cssH = 0;

    const resize = (): void => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      cssW = wrap.clientWidth;
      cssH = Math.round(cssW * (68 / 105) * 1.06);
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      st.current.settled = false;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    const frame = (now: number): void => {
      raf = requestAnimationFrame(frame);
      const s = st.current;
      const view = viewRef.current;
      const dt = s.lastFrame ? Math.min(100, now - s.lastFrame) : 16;
      s.lastFrame = now;

      // New shot → start its animation (ignore stale shots after a restore)
      if (view.lastShot && view.lastShot.id !== s.lastShotId) {
        s.lastShotId = view.lastShot.id;
        if (view.tick - view.lastShot.tick <= 2) {
          s.anim = { shot: view.lastShot, start: now, from: shotAbs(view.lastShot) };
        }
      }
      if (s.anim && now - s.anim.start > SHOT_ANIM_MS) s.anim = null;
      if (s.settled && !s.anim) return;
      // Hidden (e.g. another section is open on a phone): nothing to paint; the ResizeObserver resizes us when shown
      if (cssW < 8 || cssH < 8) { s.settled = false; return; }

      // Exponential smoothing toward the latest tick's targets; time constant follows match speed
      const tickMs = MS_PER_MATCH_MINUTE[view.speed] / TICKS_PER_MINUTE;
      const tau = Math.min(900, Math.max(60, tickMs * 0.55));
      const a = 1 - Math.exp(-dt / tau);
      const aBall = 1 - Math.exp(-dt / Math.max(40, tau * 0.4));
      let maxDelta = 0;
      const seen = new Set<string>();
      for (const d of [...view.positions.home, ...view.positions.away]) {
        seen.add(d.id);
        const cur = s.dots.get(d.id);
        if (!cur) { s.dots.set(d.id, { x: d.x, y: d.y }); continue; }
        const dx = d.x - cur.x, dy = d.y - cur.y;
        cur.x += dx * a; cur.y += dy * a;
        maxDelta = Math.max(maxDelta, Math.abs(dx), Math.abs(dy));
      }
      for (const id of [...s.dots.keys()]) if (!seen.has(id)) s.dots.delete(id);
      const tb = view.positions.ball;
      if (!s.ball) s.ball = { ...tb };
      else {
        const dx = tb.x - s.ball.x, dy = tb.y - s.ball.y;
        s.ball.x += dx * aBall; s.ball.y += dy * aBall;
        maxDelta = Math.max(maxDelta, Math.abs(dx), Math.abs(dy));
      }
      const lastTrail = s.trail[s.trail.length - 1];
      if (!lastTrail || Math.hypot(lastTrail.x - s.ball.x, lastTrail.y - s.ball.y) > 0.004) {
        s.trail.push({ ...s.ball });
        if (s.trail.length > 10) s.trail.shift();
      }
      if (maxDelta < 0.0004 && !s.anim) s.settled = true;

      draw(ctx, cssW, cssH, view, s, now, modeRef.current.pitchMode, modeRef.current.pitchLabels);
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [settings.pitchCollapsed]);

  // Redraw when display settings change
  useEffect(() => { st.current.settled = false; }, [settings.pitchMode, settings.pitchLabels]);

  const controls = (
    <div className="flex items-center gap-1.5">
      {!settings.pitchCollapsed && (
        <>
          <div className="w-40"><Segmented size="sm" value={settings.pitchMode} onChange={pitchMode => setSettings({ pitchMode })}
            options={[{ value: 'FULL', label: 'Full match' }, { value: 'HIGHLIGHTS', label: 'Highlights' }]} /></div>
          <div className="w-24"><Segmented size="sm" value={settings.pitchLabels} onChange={pitchLabels => setSettings({ pitchLabels })}
            options={[{ value: 'NUMBER', label: '#' }, { value: 'ROLE', label: 'Role' }]} /></div>
        </>
      )}
      <button className="btn btn-ghost px-2 py-1 text-xs" onClick={() => setSettings({ pitchCollapsed: !settings.pitchCollapsed })}>
        {settings.pitchCollapsed ? 'Show pitch' : 'Hide'}
      </button>
    </div>
  );

  return (
    <Panel title="Radar" right={controls}>
      {settings.pitchCollapsed
        ? <ZoneTracker v={v} />
        : <div ref={wrapRef} className="w-full"><canvas ref={canvasRef} className="block w-full rounded-lg" aria-label="Live 2D match radar" role="img" /></div>}
    </Panel>
  );
}

/** The pitch never changes between frames, so it is rasterised once per size and blitted. */
const pitchCache = new Map<string, HTMLCanvasElement>();
function cachedPitch(W: number, H: number, dim: boolean): HTMLCanvasElement {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const key = `${W}x${H}@${dpr}:${dim ? 1 : 0}`;
  let c = pitchCache.get(key);
  if (!c) {
    if (pitchCache.size > 6) pitchCache.clear();
    c = document.createElement('canvas');
    c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
    const g = c.getContext('2d')!;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = '#071510';
    g.fillRect(0, 0, W, H);
    drawPitch(g, pitchBox(W, H), dim);
    pitchCache.set(key, c);
  }
  return c;
}

function draw(ctx: CanvasRenderingContext2D, W: number, H: number, v: EngineTick, s: RadarState, now: number, mode: 'FULL' | 'HIGHLIGHTS', labels: 'NUMBER' | 'ROLE'): void {
  const b = pitchBox(W, H);
  const key = isKeyMoment(v) || !!s.anim;
  if (key) s.lastKey = now;
  // Highlights: hold the picture a moment after a key phase ends
  const showFull = mode === 'FULL' || now - s.lastKey < 1200;
  ctx.drawImage(cachedPitch(W, H, !showFull), 0, 0, W, H);

  const r = Math.max(8, b.w * 0.0165);
  const info = new Map([...v.home.players, ...v.away.players].map(p => [p.id, p]));
  const homeIds = new Set(v.positions.home.map(d => d.id));
  ctx.globalAlpha = showFull ? 1 : 0.22;

  for (const [id, p] of s.dots) {
    const pl = info.get(id);
    if (!pl) continue;
    const home = homeIds.has(id);
    const color = home ? v.home.color : v.away.color;
    const [px, py] = toPx(b, p.x, p.y);
    if (id === v.positions.carrierId && showFull) {
      ctx.beginPath(); ctx.arc(px, py, r + 3.5, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(253, 224, 71, 0.85)'; ctx.lineWidth = 2; ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fillStyle = color; ctx.fill();
    ctx.lineWidth = home ? 1 : 2;
    ctx.strokeStyle = home ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.9)';
    ctx.stroke();
    const label = labels === 'ROLE' ? ROLE_INFO[pl.role].short : String(pl.shirt);
    ctx.fillStyle = textOn(color);
    ctx.font = `800 ${labels === 'ROLE' && label.length > 2 ? r * 0.78 : r * 1.12}px ui-sans-serif, system-ui, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(label, px, py + 0.5);
  }

  // Ball + trail
  if (s.ball && showFull) {
    s.trail.forEach((t, i) => {
      const [tx, ty] = toPx(b, t.x, t.y);
      ctx.beginPath(); ctx.arc(tx, ty, r * 0.28, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${(i / s.trail.length) * 0.35})`; ctx.fill();
    });
    const [bx, by] = toPx(b, s.ball.x, s.ball.y);
    ctx.beginPath(); ctx.arc(bx, by, r * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff'; ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 1; ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Shot animation: ball flies toward goal, outcome label lands at the goal
  if (s.anim) {
    const t = Math.min(1, (now - s.anim.start) / SHOT_ANIM_MS);
    const shot = s.anim.shot;
    const goalX = shot.side === 'home' ? 1 : 0;
    const miss = shot.outcome === 'OFF' ? (shot.lat >= 0 ? 0.075 : -0.075) * (shot.side === 'home' ? 1 : -1) : 0;
    const endY = shot.outcome === 'BLOCKED' ? s.anim.from.y : 0.5 + miss + (shot.outcome === 'GOAL' ? (shot.side === 'home' ? 1 : -1) * shot.lat / 300 : 0);
    const endX = shot.outcome === 'BLOCKED' ? s.anim.from.x + (goalX - s.anim.from.x) * 0.25 : goalX;
    const color = OUTCOME_COLOR[shot.outcome];
    const [fx, fy] = toPx(b, s.anim.from.x, s.anim.from.y);
    const [ex, ey] = toPx(b, endX, endY);
    const fly = Math.min(1, t / 0.3);
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.globalAlpha = 1 - t * 0.6;
    ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx + (ex - fx) * fly, fy + (ey - fy) * fly); ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath(); ctx.arc(fx + (ex - fx) * fly, fy + (ey - fy) * fly, r * 0.55, 0, Math.PI * 2);
    ctx.fillStyle = '#fff'; ctx.fill();
    ctx.globalAlpha = 1;
    if (t > 0.3) {
      // Outcome card: solid background so it stays readable over the pitch lines
      const pulse = shot.outcome === 'GOAL' ? 1 + Math.sin(t * 20) * 0.06 : 1;
      const title = OUTCOME_TEXT[shot.outcome];
      const sub = `${shot.playerName.split(' ').slice(-1)[0]} · xG ${shot.xg.toFixed(2)}`;
      const big = r * 1.5 * pulse, small = r * 0.95;
      ctx.font = `800 ${big}px ui-sans-serif, system-ui, sans-serif`;
      const w1 = ctx.measureText(title).width;
      ctx.font = `600 ${small}px ui-sans-serif, system-ui, sans-serif`;
      const w2 = ctx.measureText(sub).width;
      const cw = Math.max(w1, w2) + r * 1.6, ch = big + small + r * 1.4;
      const cx = shot.side === 'home' ? b.x + b.w - r * 3 - cw : b.x + r * 3;
      const cy = Math.min(b.y + b.h - ch - 4, Math.max(b.y + 4, ey - ch - r * 1.5));
      ctx.fillStyle = 'rgba(9, 9, 11, 0.82)';
      ctx.strokeStyle = color; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.roundRect(cx, cy, cw, ch, 6); ctx.fill(); ctx.stroke();
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.font = `800 ${big}px ui-sans-serif, system-ui, sans-serif`;
      ctx.fillStyle = color;
      ctx.fillText(title, cx + r * 0.8, cy + r * 0.55);
      ctx.font = `600 ${small}px ui-sans-serif, system-ui, sans-serif`;
      ctx.fillStyle = '#e4e4e7';
      ctx.fillText(sub, cx + r * 0.8, cy + r * 0.75 + big);
    }
  }

  // Overlay labels
  ctx.textBaseline = 'top';
  ctx.font = `600 ${Math.max(10, r * 0.9)}px ui-sans-serif, system-ui, sans-serif`;
  ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(212, 212, 216, 0.55)';
  ctx.fillText(`${v.home.shortName} →`, b.x + 4, 4);
  ctx.textAlign = 'right';
  ctx.fillText(`← ${v.away.shortName}`, b.x + b.w - 4, 4);
  if (mode === 'HIGHLIGHTS') {
    ctx.textAlign = 'center';
    if (showFull) {
      ctx.fillStyle = 'rgba(251, 191, 36, 0.9)';
      ctx.fillText('● KEY MOMENT', W / 2, 4);
    } else {
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(212, 212, 216, 0.6)';
      ctx.font = `500 ${Math.max(12, r * 1.15)}px ui-sans-serif, system-ui, sans-serif`;
      ctx.fillText(v.period === 'HT' ? 'Half-time' : v.period === 'ETB' ? 'Extra time next' : v.period === 'ETH' ? 'Extra-time break' : v.status === 'FINISHED' ? 'Full-time' : 'Quiet spell — waiting for a key moment', W / 2, H / 2);
    }
  }
}
