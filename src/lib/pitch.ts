/** Pitch geometry (metres) and a canvas painter for the live radar. */
export const PITCH_L = 105;
export const PITCH_W = 68;

export const OUTCOME_COLOR = {
  GOAL: '#34d399',
  SAVED: '#fbbf24',
  OFF: '#a1a1aa',
  BLOCKED: '#fb7185'
} as const;

export const OUTCOME_LABEL = { GOAL: 'Goal', SAVED: 'On target', OFF: 'Off target', BLOCKED: 'Blocked' } as const;

export interface PitchBox {
  /** Pixel rectangle of the playing surface inside the canvas. */
  x: number;
  y: number;
  w: number;
  h: number;
}

export function pitchBox(width: number, height: number): PitchBox {
  const padX = width * 0.035;
  const padY = height * 0.05;
  return { x: padX, y: padY, w: width - padX * 2, h: height - padY * 2 };
}

/** Normalised (0..1) pitch coordinates → canvas pixels. */
export const toPx = (b: PitchBox, nx: number, ny: number): [number, number] => [b.x + nx * b.w, b.y + ny * b.h];

export function drawPitch(ctx: CanvasRenderingContext2D, b: PitchBox, dim = false): void {
  const mx = b.w / PITCH_L, my = b.h / PITCH_W;
  // Mowing stripes
  const stripes = 12;
  for (let i = 0; i < stripes; i++) {
    ctx.fillStyle = i % 2 === 0 ? 'rgba(16, 70, 52, 0.55)' : 'rgba(14, 58, 44, 0.55)';
    ctx.fillRect(b.x + (b.w / stripes) * i, b.y, b.w / stripes + 0.5, b.h);
  }
  ctx.strokeStyle = dim ? 'rgba(167, 243, 208, 0.18)' : 'rgba(167, 243, 208, 0.38)';
  ctx.lineWidth = Math.max(1, b.w / 600);
  ctx.strokeRect(b.x, b.y, b.w, b.h);
  // Halfway line + centre circle
  ctx.beginPath(); ctx.moveTo(b.x + b.w / 2, b.y); ctx.lineTo(b.x + b.w / 2, b.y + b.h); ctx.stroke();
  ctx.beginPath(); ctx.arc(b.x + b.w / 2, b.y + b.h / 2, 9.15 * mx, 0, Math.PI * 2); ctx.stroke();
  dot(ctx, b.x + b.w / 2, b.y + b.h / 2, Math.max(1.5, mx * 0.4));
  for (const side of [0, 1] as const) {
    const gx = side === 0 ? b.x : b.x + b.w;
    const dir = side === 0 ? 1 : -1;
    const cy = b.y + b.h / 2;
    // Penalty area, six-yard box, spot, arc
    ctx.strokeRect(side === 0 ? gx : gx - 16.5 * mx, cy - 20.16 * my, 16.5 * mx, 40.32 * my);
    ctx.strokeRect(side === 0 ? gx : gx - 5.5 * mx, cy - 9.16 * my, 5.5 * mx, 18.32 * my);
    dot(ctx, gx + dir * 11 * mx, cy, Math.max(1.5, mx * 0.4));
    ctx.beginPath();
    const a = Math.acos(5.5 / 9.15);
    if (side === 0) ctx.arc(gx + 11 * mx, cy, 9.15 * mx, -a, a);
    else ctx.arc(gx - 11 * mx, cy, 9.15 * mx, Math.PI - a, Math.PI + a);
    ctx.stroke();
    // Goal
    ctx.strokeRect(side === 0 ? gx - 2 * mx : gx, cy - 3.66 * my, 2 * mx, 7.32 * my);
  }
}

function dot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = ctx.strokeStyle;
  ctx.fill();
}

/** Black or white text for a given fill colour. */
export function textOn(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return '#fff';
  const n = parseInt(m[1]!, 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, bl = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * bl > 150 ? '#09090b' : '#fafafa';
}
