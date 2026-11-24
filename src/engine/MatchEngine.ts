/**
 * PitchPulse match engine — a zone-based, tick-driven state machine.
 *
 * Pure TypeScript: no DOM, no timers, no worker APIs. The worker owns time;
 * this class only advances one 10-second tick per `step()`, which keeps it
 * deterministic (seeded RNG) and testable from Node.
 */
import type { Team } from '../types/domain.ts';
import type {
  AutoPauseTriggers, EngineTick, Lane, LivePlayer, MatchEvent, MatchEventType, MatchSetup, MatchState,
  MatchSummary, PauseReason, PitchDot, PitchPositions, PlayerMatchStats, PlayerSummary, PlayerView, QueuedAction, QueuedActionBody, ShotOutcome,
  ShotType, Side, SpeedMode, TeamMatchState, TeamStats, TeamView, Third
} from '../types/match.ts';
import type { ShoutType, Tactics } from '../types/tactics.ts';
import { Rng } from './rng.ts';
import {
  HALF_TICKS, MAX_SUBS, SECONDS_PER_TICK, SHOUT_COOLDOWN_TICKS, SHOUT_DURATION_TICKS,
  SUB_FORCE_STOPPAGE_TICKS, TICKS_PER_MINUTE
} from './constants.ts';
import { slotDef } from './formations.ts';
import { ROLE_INFO, defaultRoleFor, isDefensiveKind, isRoleAllowed, positionFit, roleFit } from './roles.ts';
import {
  ACTION_BASE, LANE_WEIGHTS, MENTALITY_INDEX, PRESS_STAMINA, PRESS_ZONE_FACTOR, actionWeights, counterChance,
  effectivePressing, exposure, foulChance, highTurnoverShotChance, inBehindChance, matrixModifier, offsideShare,
  type ActionContext, type ActionKind
} from './tacticalMatrix.ts';
import { BIG_CHANCE_XG, computeXg, goalProbability, sampleLocation } from './xg.ts';
import { computeRating } from './ratings.ts';
import { shotAbs } from './geometry.ts';
import { aiMinute } from './aiManager.ts';

export interface StepResult {
  events: MatchEvent[];
  pause: { reason: PauseReason; message: string } | null;
  ended: boolean;
}

const THIRD_Y = [1 / 6, 0.5, 5 / 6] as const;
const LANE_X = [1 / 6, 0.5, 5 / 6] as const;
const other = (s: Side): Side => (s === 'home' ? 'away' : 'home');
const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));
const flip = (v: Third | Lane): Third => (2 - v) as Third;

const NON_KEY: ReadonlySet<MatchEventType> = new Set(['ATTACK', 'TURNOVER', 'LONG_BALL', 'FOUL', 'CORNER', 'OFFSIDE', 'COUNTER', 'SHOUT_END']);

const emptyPlayerStats = (): PlayerMatchStats => ({
  ticks: 0, passes: 0, passesCompleted: 0, keyPasses: 0, shots: 0, shotsOnTarget: 0, goals: 0, assists: 0,
  xg: 0, tackles: 0, interceptions: 0, dribbles: 0, fouls: 0, saves: 0, conceded: 0, mistakes: 0
});
const emptyTeamStats = (): TeamStats => ({
  possessionTicks: 0, shots: 0, shotsOnTarget: 0, xg: 0, bigChances: 0, passes: 0, passesCompleted: 0,
  tackles: 0, fouls: 0, corners: 0, offsides: 0, yellow: 0, red: 0
});

function buildTeamState(team: Team, side: Side): TeamMatchState {
  const players: LivePlayer[] = [];
  const used = new Set<string>();
  const live = (id: string, slot: number, status: LivePlayer['status']): void => {
    const p = team.players.find(x => x.id === id);
    if (!p || used.has(id)) return;
    used.add(id);
    const kind = slot >= 0 ? slotDef(team.tactics.formation, slot).kind : null;
    const lineupRole = team.lineup.slots.find(sl => sl.slot === slot)?.role;
    const role = kind
      ? (lineupRole && isRoleAllowed(kind, lineupRole) ? lineupRole : defaultRoleFor(kind, p.naturalRoles))
      : (p.naturalRoles[0] ?? 'CM');
    players.push({
      id: p.id, name: p.name, shirt: p.shirt, position: p.position, naturalRoles: [...p.naturalRoles],
      attrs: { ...p.attrs }, role, slot, lastSlot: slot, status, stamina: p.fitness, sharpness: p.sharpness ?? 70, yellow: 0, injured: false,
      staminaWarned: false, morale: p.morale, rating: 6.0, stats: emptyPlayerStats(), posSum: { x: 0, y: 0, n: 0 }
    });
  };
  for (const sl of team.lineup.slots) if (sl.playerId) live(sl.playerId, sl.slot, 'PITCH');
  for (const id of team.lineup.bench.slice(0, 9)) live(id, -1, 'BENCH');
  const morale = team.players.reduce((a, p) => a + p.morale, 0) / Math.max(1, team.players.length);
  return {
    side, teamId: team.id, name: team.name, shortName: team.shortName, color: team.colors.primary,
    identity: team.identity, isUser: team.isUser, tactics: { ...team.tactics }, players, subsUsed: 0, score: 0,
    morale, stats: emptyTeamStats(), shout: { active: null, activeUntil: 0, cooldownUntil: 0 }
  };
}

export class MatchEngine {
  readonly state: MatchState;
  private rng: Rng;
  private pending: MatchEvent[] = [];
  private pauseReq: { reason: PauseReason; message: string } | null = null;

  private constructor(state: MatchState) {
    this.state = state;
    this.rng = new Rng(state.rngState);
  }

  static fromSetup(setup: MatchSetup): MatchEngine {
    const state: MatchState = {
      version: 1, matchId: setup.matchId, seed: setup.seed, rngState: setup.seed, userSide: setup.userSide,
      tick: 0, halfTick: 0, period: 'PRE', added: { first: 0, second: 0 }, status: 'IDLE', pauseReason: null,
      speed: setup.speed, home: buildTeamState(setup.home, 'home'), away: buildTeamState(setup.away, 'away'),
      possession: 'home', ball: { third: 1, lane: 1 }, carrierId: null, counterTicks: 0, setPiece: null,
      stoppage: false, ticksSinceStoppage: 0, events: [], nextEventId: 1, shots: [], momentum: [], queue: [],
      nextActionId: 1, autoPause: { ...setup.autoPause }, subWindowFired: false, lastNarrationTick: -10, startedAt: 0
    };
    return new MatchEngine(state);
  }

  static fromSnapshot(snapshot: MatchState): MatchEngine {
    const state = structuredClone(snapshot);
    // Snapshots saved by Phase 1 predate average-position tracking
    for (const t of [state.home, state.away]) for (const p of t.players) { p.posSum ??= { x: 0, y: 0, n: 0 }; p.stats.interceptions ??= 0; p.sharpness ??= 70; }
    if (state.status === 'RUNNING') { state.status = 'PAUSED'; state.pauseReason = 'USER'; }
    return new MatchEngine(state);
  }

  // ───────────────────────────── Commands ─────────────────────────────

  start(): MatchEvent[] {
    const s = this.state;
    this.pending = [];
    if (s.status !== 'IDLE') return [];
    s.status = 'RUNNING';
    s.period = 'FIRST';
    s.startedAt = Date.now();
    s.possession = 'home';
    s.ball = { third: 1, lane: 1 };
    this.emit('KICK_OFF', { side: 'home' });
    return this.flush();
  }

  pause(): void {
    if (this.state.status === 'RUNNING') { this.state.status = 'PAUSED'; this.state.pauseReason = 'USER'; }
  }

  resume(): MatchEvent[] {
    const s = this.state;
    if (s.status === 'IDLE') return this.start();
    if (s.status === 'PAUSED') { s.status = 'RUNNING'; s.pauseReason = null; }
    return [];
  }

  setSpeed(speed: SpeedMode): void { this.state.speed = speed; }

  setAutoPause(t: AutoPauseTriggers): void { this.state.autoPause = { ...t }; }

  /** Queue a change for a side. Tactics patches for the same side are merged. */
  queueAction(body: QueuedActionBody, side: Side = this.state.userSide): QueuedAction | null {
    const s = this.state;
    if (s.status === 'FINISHED') return null;
    if (body.kind === 'TACTICS') {
      const existing = s.queue.find(a => a.side === side && a.kind === 'TACTICS');
      if (existing && existing.kind === 'TACTICS') {
        existing.patch = { ...existing.patch, ...body.patch };
        if (body.note) existing.note = body.note;
        return existing;
      }
    }
    if (body.kind === 'SUB') {
      const t = this.team(side);
      const pendingSubs = s.queue.filter(a => a.side === side && a.kind === 'SUB');
      if (t.subsUsed + pendingSubs.length >= MAX_SUBS) return null;
      if (pendingSubs.some(a => a.kind === 'SUB' && (a.inId === body.inId || a.outId === body.outId))) return null;
      const out = t.players.find(p => p.id === body.outId);
      const inn = t.players.find(p => p.id === body.inId);
      if (!out || !inn || inn.status !== 'BENCH' || (out.status !== 'PITCH' && out.status !== 'INJURED_OFF')) return null;
    }
    const action = { ...body, id: s.nextActionId++, side, queuedAtTick: s.tick } as QueuedAction;
    s.queue.push(action);
    return action;
  }

  cancelAction(id: number): void {
    this.state.queue = this.state.queue.filter(a => a.id !== id);
  }

  shout(side: Side, shout: ShoutType): MatchEvent[] {
    const s = this.state;
    const t = this.team(side);
    this.pending = [];
    if (s.period !== 'FIRST' && s.period !== 'SECOND') return [];
    if (s.tick < t.shout.cooldownUntil) return [];
    t.shout = { active: shout, activeUntil: s.tick + SHOUT_DURATION_TICKS, cooldownUntil: s.tick + SHOUT_COOLDOWN_TICKS };
    if (shout === 'DEMAND_MORE') t.morale = Math.min(100, t.morale + 5);
    this.emit('SHOUT', { side, meta: { shout } });
    return this.flush();
  }

  // ───────────────────────────── Tick ─────────────────────────────

  step(): StepResult {
    const s = this.state;
    this.pending = [];
    this.pauseReq = null;
    if (s.status !== 'RUNNING') return { events: [], pause: null, ended: false };

    if (s.period === 'HT') {
      this.startSecondHalf();
      return this.finishStep(false);
    }

    s.tick++;
    s.halfTick++;
    s.ticksSinceStoppage++;

    this.applyInstantActions();
    if (s.queue.some(a => a.kind === 'SUB') && !s.stoppage && s.ticksSinceStoppage >= SUB_FORCE_STOPPAGE_TICKS) {
      s.stoppage = true;
    }
    if (s.stoppage) {
      this.applySubs();
      s.stoppage = false;
      s.ticksSinceStoppage = 0;
    }
    this.drainStamina();
    this.updateShouts();
    if (s.halfTick % TICKS_PER_MINUTE === 0) this.minuteHooks();

    this.playPhase();
    this.randomInjury();
    this.trackShape();

    for (const t of [s.home, s.away]) for (const p of t.players) if (p.status === 'PITCH') p.stats.ticks++;
    this.checkStaminaWarnings();
    if (s.halfTick % TICKS_PER_MINUTE === 0 || this.pending.some(e => e.key)) this.updateRatings();

    const ended = this.checkPeriodEnd();
    return this.finishStep(ended);
  }

  private finishStep(ended: boolean): StepResult {
    const s = this.state;
    s.rngState = this.rng.state;
    let pause = null;
    if (this.pauseReq && !ended) {
      s.status = 'PAUSED';
      s.pauseReason = this.pauseReq.reason;
      pause = this.pauseReq;
    }
    return { events: this.flush(), pause, ended };
  }

  // ───────────────────────────── Phases & time ─────────────────────────────

  private minuteInfo(): { minute: number; added: number } {
    const s = this.state;
    if (s.period === 'PRE') return { minute: 0, added: 0 };
    if (s.period === 'HT') return { minute: 45, added: s.added.first };
    if (s.period === 'FT') return { minute: 90, added: s.added.second };
    const m = Math.max(1, Math.ceil(s.halfTick / TICKS_PER_MINUTE));
    const base = s.period === 'SECOND' ? 45 : 0;
    return m > 45 ? { minute: base + 45, added: m - 45 } : { minute: base + m, added: 0 };
  }

  private checkPeriodEnd(): boolean {
    const s = this.state;
    const half = s.period === 'FIRST' ? 'first' : 'second';
    if (s.halfTick === HALF_TICKS) {
      const start = s.tick - s.halfTick;
      const inHalf = s.events.filter(e => e.tick > start);
      const count = (t: MatchEventType): number => inHalf.filter(e => e.type === t).length;
      const raw = 1 + count('GOAL') * 0.4 + count('SUB') * 0.35 + (count('YELLOW') + count('RED')) * 0.25 + count('INJURY') * 1;
      s.added[half] = clamp(Math.round(raw), 1, half === 'first' ? 4 : 7);
      this.emit('ADDED_TIME', { meta: { added: s.added[half] } });
    }
    if (s.halfTick >= HALF_TICKS + s.added[half] * TICKS_PER_MINUTE) {
      if (s.period === 'FIRST') { this.endFirstHalf(); return false; }
      this.endMatch();
      return true;
    }
    return false;
  }

  private endFirstHalf(): void {
    const s = this.state;
    s.period = 'HT';
    s.setPiece = null;
    s.counterTicks = 0;
    for (const t of [s.home, s.away]) for (const p of t.players) if (p.status === 'PITCH') p.stamina = Math.min(100, p.stamina + 8);
    this.updateRatings();
    this.emit('HALF_TIME', { meta: { home: s.home.score, away: s.away.score } });
    this.requestPause('HALF_TIME', `Half-time: ${s.home.shortName} ${s.home.score}–${s.away.score} ${s.away.shortName}`);
  }

  private startSecondHalf(): void {
    const s = this.state;
    s.period = 'SECOND';
    s.halfTick = 0;
    s.possession = 'away';
    s.ball = { third: 1, lane: 1 };
    this.applyInstantActions();
    this.applySubs();
    s.stoppage = false;
    s.ticksSinceStoppage = 0;
    this.emit('SECOND_HALF', { side: 'away' });
  }

  private endMatch(): void {
    const s = this.state;
    s.period = 'FT';
    s.status = 'FINISHED';
    s.queue = [];
    this.updateRatings();
    this.emit('FULL_TIME', { meta: { home: s.home.score, away: s.away.score } });
  }

  private minuteHooks(): void {
    const s = this.state;
    const { minute } = this.minuteInfo();
    for (const side of ['home', 'away'] as const) {
      const t = this.team(side);
      if (t.isUser) continue;
      const d = aiMinute(s, side, minute);
      for (const a of d.actions) {
        if (a.kind === 'TACTICS' && d.note) a.note = d.note;
        this.queueAction(a, side);
      }
      if (d.shout) this.pending.push(...this.shoutInternal(side, d.shout));
    }
    if (s.period === 'SECOND' && minute >= 65 && !s.subWindowFired) {
      s.subWindowFired = true;
      this.requestPause('SUB_WINDOW', "65' — tactical substitution window");
    }
  }

  private shoutInternal(side: Side, shout: ShoutType): MatchEvent[] {
    const saved = this.pending;
    const evs = this.shout(side, shout);
    this.pending = saved;
    return evs;
  }

  // ───────────────────────────── Queue execution ─────────────────────────────

  private applyInstantActions(): void {
    const s = this.state;
    const keep: QueuedAction[] = [];
    for (const a of s.queue) {
      if (a.kind === 'TACTICS') this.applyTactics(a.side, a.patch, a.note);
      else if (a.kind === 'ROLE') this.applyRole(a.side, a.playerId, a.role);
      else keep.push(a);
    }
    s.queue = keep;
  }

  private applyTactics(side: Side, patch: Partial<Tactics>, note?: string): void {
    const t = this.team(side);
    const changes = (Object.keys(patch) as Array<keyof Tactics>).filter(k => patch[k] !== undefined && patch[k] !== t.tactics[k]);
    if (!changes.length) return;
    const oldFormation = t.tactics.formation;
    t.tactics = { ...t.tactics, ...patch };
    if (t.tactics.formation !== oldFormation) this.reassignSlots(t, oldFormation);
    const summary = changes.map(k => `${k}:${String(t.tactics[k])}`).join(',');
    this.emit(t.isUser ? 'TACTIC_CHANGE' : 'AI_ADAPT', { side, meta: note ? { changes: summary, note } : { changes: summary } });
  }

  private applyRole(side: Side, playerId: string, role: LivePlayer['role']): void {
    const t = this.team(side);
    const p = t.players.find(x => x.id === playerId);
    if (!p || p.status !== 'PITCH') return;
    const kind = slotDef(t.tactics.formation, p.slot).kind;
    if (!isRoleAllowed(kind, role) || p.role === role) return;
    p.role = role;
    this.emit('ROLE_CHANGE', { side, playerId: p.id, playerName: p.name, meta: { role } });
  }

  /** Greedy remap of on-pitch players to the new formation's slots by proximity and position fit. */
  private reassignSlots(t: TeamMatchState, oldFormation: Tactics['formation']): void {
    const onPitch = t.players.filter(p => p.status === 'PITCH');
    const newSlots = Array.from({ length: 11 }, (_, i) => ({ i, def: slotDef(t.tactics.formation, i) }));
    const pairs: Array<{ p: LivePlayer; slot: number; cost: number }> = [];
    for (const p of onPitch) {
      const old = slotDef(oldFormation, p.slot);
      for (const ns of newSlots) {
        if ((ns.i === 0) !== (p.slot === 0)) continue; // keeper stays keeper
        const fitPenalty = positionFit(p.position, ns.def.kind) < 0.9 ? 0.35 : 0;
        pairs.push({ p, slot: ns.i, cost: Math.hypot(old.x - ns.def.x, old.y - ns.def.y) + fitPenalty });
      }
    }
    pairs.sort((a, b) => a.cost - b.cost);
    const takenSlots = new Set<number>();
    const placed = new Set<string>();
    for (const pr of pairs) {
      if (takenSlots.has(pr.slot) || placed.has(pr.p.id)) continue;
      takenSlots.add(pr.slot);
      placed.add(pr.p.id);
      pr.p.slot = pr.slot;
      pr.p.lastSlot = pr.slot;
      const kind = slotDef(t.tactics.formation, pr.slot).kind;
      if (!isRoleAllowed(kind, pr.p.role)) pr.p.role = defaultRoleFor(kind, pr.p.naturalRoles);
    }
  }

  private applySubs(): void {
    const s = this.state;
    const keep: QueuedAction[] = [];
    for (const a of s.queue) {
      if (a.kind !== 'SUB') { keep.push(a); continue; }
      const t = this.team(a.side);
      const out = t.players.find(p => p.id === a.outId);
      const inn = t.players.find(p => p.id === a.inId);
      if (!out || !inn || inn.status !== 'BENCH' || t.subsUsed >= MAX_SUBS) continue;
      let slot: number;
      if (out.status === 'PITCH') slot = out.slot;
      else if (out.status === 'INJURED_OFF') {
        const occupied = new Set(t.players.filter(p => p.status === 'PITCH').map(p => p.slot));
        slot = !occupied.has(out.lastSlot) ? out.lastSlot
          : Array.from({ length: 11 }, (_, i) => i).find(i => !occupied.has(i)) ?? -1;
        if (slot < 0) continue;
      } else continue;
      const kind = slotDef(t.tactics.formation, slot).kind;
      inn.status = 'PITCH';
      inn.slot = slot;
      inn.lastSlot = slot;
      inn.role = isRoleAllowed(kind, out.role) ? out.role : defaultRoleFor(kind, inn.naturalRoles);
      if (out.status === 'PITCH') { out.lastSlot = out.slot; out.slot = -1; }
      out.status = 'SUBBED_OFF'; // an injured player who has been replaced also counts as subbed off
      t.subsUsed++;
      this.emit('SUB', { side: a.side, playerId: inn.id, playerName: inn.name, otherName: out.name, meta: { outId: out.id } });
    }
    s.queue = keep;
  }

  // ───────────────────────────── Condition ─────────────────────────────

  private drainStamina(): void {
    const s = this.state;
    for (const t of [s.home, s.away]) {
      const press = PRESS_STAMINA[effectivePressing(t.tactics.pressing, t.shout.active)];
      const ment = 1 + MENTALITY_INDEX[t.tactics.mentality] * 0.04;
      const shout = t.shout.active === 'PUSH_HIGHER' ? 1.35 : t.shout.active === 'DEMAND_MORE' ? 1.15 : t.shout.active === 'SLOW_TEMPO' ? 0.8 : 1;
      const relief = s.possession === t.side ? 0.92 : 1.08;
      for (const p of t.players) {
        if (p.status !== 'PITCH') continue;
        const drain = 0.062 * (1.4 - p.attrs.stamina * 0.008) * press * ROLE_INFO[p.role].stamina * ment * shout * relief;
        p.stamina = Math.max(5, p.stamina - drain);
      }
    }
  }

  private updateShouts(): void {
    for (const t of [this.state.home, this.state.away]) {
      if (t.shout.active && this.state.tick >= t.shout.activeUntil) {
        this.emit('SHOUT_END', { side: t.side, meta: { shout: t.shout.active } });
        t.shout.active = null;
      }
    }
  }

  private checkStaminaWarnings(): void {
    const t = this.team(this.state.userSide);
    const tired = t.players.filter(p => p.status === 'PITCH' && !p.staminaWarned && p.stamina < 60);
    for (const p of tired) {
      p.staminaWarned = true;
      this.emit('STAMINA_LOW', { side: t.side, playerId: p.id, playerName: p.name, meta: { stamina: Math.round(p.stamina) } });
    }
    const first = tired[0];
    if (first) this.requestPause('STAMINA', `${first.name} is tiring (${Math.round(first.stamina)}% stamina)`);
  }

  private randomInjury(): void {
    if (!this.rng.chance(0.00025)) return;
    const s = this.state;
    const t = this.rng.chance(0.5) ? s.home : s.away;
    const candidates = t.players.filter(p => p.status === 'PITCH');
    if (!candidates.length) return;
    const victim = this.rng.weighted(candidates.map(p => [p, 1 + (100 - p.stamina) / 25] as const));
    this.injure(t, victim);
  }

  private injure(t: TeamMatchState, p: LivePlayer): void {
    if (p.status !== 'PITCH') return;
    p.injured = true;
    p.lastSlot = p.slot;
    p.slot = -1;
    p.status = 'INJURED_OFF';
    this.state.stoppage = true;
    this.emit('INJURY', { side: t.side, playerId: p.id, playerName: p.name });
    this.requestPause('INJURY', `${p.name} (${t.shortName}) is injured`);
  }

  private updateRatings(): void {
    const s = this.state;
    for (const t of [s.home, s.away]) {
      const diff = t.score - this.team(other(t.side)).score;
      for (const p of t.players) {
        if (p.status === 'BENCH') continue;
        const kindSlot = p.slot >= 0 ? p.slot : p.lastSlot;
        const isKeeper = kindSlot === 0 && p.position === 'GK';
        const kind = kindSlot >= 0 ? slotDef(t.tactics.formation, kindSlot).kind : 'CM';
        p.rating = computeRating(p, diff, isKeeper, isDefensiveKind(kind));
      }
    }
  }

  // ───────────────────────────── Spatial model ─────────────────────────────

  private team(side: Side): TeamMatchState {
    return side === 'home' ? this.state.home : this.state.away;
  }

  private onPitch(t: TeamMatchState): LivePlayer[] {
    return t.players.filter(p => p.status === 'PITCH');
  }

  /** Player position in his own team's frame (y = 1 is the opponent's goal). */
  private pos(t: TeamMatchState, p: LivePlayer, inPoss: boolean): { x: number; y: number } {
    const sd = slotDef(t.tactics.formation, p.slot);
    const ri = ROLE_INFO[p.role];
    let { x, y } = sd;
    if (sd.kind === 'GK') return { x, y: y + (inPoss && p.role === 'SK' ? 0.06 : 0) };
    y += MENTALITY_INDEX[t.tactics.mentality] * 0.035;
    if (inPoss) {
      y += ri.pushIn;
      x += (0.5 - x) * ri.inside;
    } else {
      y += ri.pushOut;
      const line = t.tactics.defLine === 'HIGH' ? 0.035 : t.tactics.defLine === 'DEEP' ? -0.05 : 0;
      y += isDefensiveKind(sd.kind) ? line : line * 0.5;
      if (t.shout.active === 'PUSH_HIGHER') y += 0.04;
      if (t.shout.active === 'TIGHTEN_DEFENSE') y -= 0.03;
    }
    return { x: clamp(x, 0.02, 0.98), y: clamp(y, 0.02, 0.98) };
  }

  /** Gaussian presence, normalised so a wider-ranging role spreads the same total influence thinner. */
  private presence(pos: { x: number; y: number }, zx: number, zy: number, sigmaY: number, sigmaX = 0.2): number {
    const dy = pos.y - zy;
    const dx = pos.x - zx;
    return Math.exp(-(dy * dy) / (2 * sigmaY * sigmaY)) * Math.exp(-(dx * dx) / (2 * sigmaX * sigmaX)) * (0.16 / sigmaY);
  }

  private eff(t: TeamMatchState, p: LivePlayer): number {
    const stam = 0.72 + 0.28 * (p.stamina / 100);
    const morale = 0.96 + ((t.morale + p.morale) / 200) * 0.08;
    const shout = t.shout.active === 'DEMAND_MORE' ? 1.06 : 1;
    const kind = slotDef(t.tactics.formation, p.slot).kind;
    const sharp = 0.94 + 0.0006 * (p.sharpness ?? 70);
    return stam * morale * shout * sharp * positionFit(p.position, kind) * roleFit(p.naturalRoles, p.role);
  }

  /** Attacking quality of team A in zone (t, l) of its own attacking frame. */
  private attackStrength(A: TeamMatchState, t: Third, l: Lane): number {
    const zx = LANE_X[l], zy = THIRD_Y[t];
    const m = MENTALITY_INDEX[A.tactics.mentality];
    let sum = 0;
    for (const p of this.onPitch(A)) {
      if (p.slot === 0 && (t > 0 || p.role !== 'SK')) continue;
      const ri = ROLE_INFO[p.role];
      const w = this.presence(this.pos(A, p, true), zx, zy, ri.sigmaY);
      if (w < 0.02) continue;
      const a = p.attrs;
      const value = t === 0 ? (0.45 * a.passing + 0.3 * a.composure + 0.25 * a.technique) * ri.buildUp
        : t === 1 ? (0.4 * a.passing + 0.3 * a.vision + 0.3 * a.technique) * (ri.buildUp + ri.creation) / 2
          : (0.3 * a.technique + 0.25 * a.vision + 0.25 * a.pace + 0.2 * a.finishing) * ri.creation;
      sum += w * value * this.eff(A, p);
    }
    if (t === 2) sum *= 1 + m * 0.06;
    return sum;
  }

  /** Defensive control of team B over the attacker's zone (t, l). */
  private defenseStrength(B: TeamMatchState, t: Third, l: Lane): number {
    const dt = flip(t), dl = flip(l);
    const zx = LANE_X[dl], zy = THIRD_Y[dt];
    const press = PRESS_ZONE_FACTOR[effectivePressing(B.tactics.pressing, B.shout.active)][dt];
    let sum = 0;
    for (const p of this.onPitch(B)) {
      const ri = ROLE_INFO[p.role];
      const w = this.presence(this.pos(B, p, false), zx, zy, ri.sigmaY) * (p.slot === 0 ? 0.5 : 1);
      if (w < 0.02) continue;
      const a = p.attrs;
      const keeper = p.slot === 0 ? (a.reflexes + a.handling) / 2 : 0;
      const value = p.slot === 0 ? keeper : 0.35 * a.tackling + 0.35 * a.positioning + 0.15 * a.workRate + 0.15 * a.pace;
      const pressBonus = dt === 2 ? ri.press : 1;
      sum += w * value * ri.defense * pressBonus * this.eff(B, p);
    }
    let f = press;
    // A high line compresses midfield; a deep line protects the box but leaves gaps in front of it
    if (B.tactics.defLine === 'HIGH') f *= dt === 1 ? 1.1 : 1;
    if (B.tactics.defLine === 'DEEP') f *= dt === 1 ? 0.94 : dt === 0 ? 1.06 : 1;
    // A low block packs the middle of its own third and gives up the flanks
    if (effectivePressing(B.tactics.pressing, B.shout.active) === 'LOW' && dt === 0) f *= dl === 1 ? 1.15 : 0.88;
    if (B.shout.active === 'TIGHTEN_DEFENSE') f *= dt === 0 ? 1.12 : 1.04;
    return sum * f;
  }

  /** Weighted pick of an on-pitch player near a zone given in that team's own frame. */
  private pickNear(t: TeamMatchState, inPoss: boolean, third: Third, lane: Lane, score: (p: LivePlayer) => number, includeGK = false): LivePlayer | null {
    const zx = LANE_X[lane], zy = THIRD_Y[third];
    const entries: Array<readonly [LivePlayer, number]> = [];
    for (const p of this.onPitch(t)) {
      if (p.slot === 0 && !includeGK) continue;
      const w = this.presence(this.pos(t, p, inPoss), zx, zy, 0.24, 0.26) * Math.max(1, score(p));
      entries.push([p, w]);
    }
    if (!entries.length) return this.onPitch(t)[0] ?? null;
    return this.rng.weighted(entries);
  }

  private keeperOf(t: TeamMatchState): LivePlayer | null {
    const ps = this.onPitch(t);
    return ps.find(p => p.slot === 0) ?? [...ps].sort((a, b) => b.attrs.reflexes - a.attrs.reflexes)[0] ?? null;
  }

  private pickLane(focus: Tactics['focus']): Lane {
    const w = LANE_WEIGHTS[focus];
    return this.rng.weighted<Lane>([[0, w[0]], [1, w[1]], [2, w[2]]]);
  }

  // ───────────────────────────── Shape (radar + average positions) ─────────────────────────────

  /** Formation position shifted toward the ball: teams slide across and step up/down as a block. */
  private shapePos(t: TeamMatchState, p: LivePlayer): { x: number; y: number } {
    const s = this.state;
    const inPoss = s.possession === t.side;
    const base = this.pos(t, p, inPoss);
    const bt = inPoss ? s.ball.third : flip(s.ball.third);
    const bl = inPoss ? s.ball.lane : flip(s.ball.lane);
    const keeper = p.slot === 0;
    const lateral = (LANE_X[bl] - 0.5) * (keeper ? 0.12 : inPoss ? 0.3 : 0.38);
    const vertical = keeper ? 0 : (THIRD_Y[bt] - 0.5) * (inPoss ? 0.32 : 0.26);
    // Out of possession the block compresses toward the ball's lane
    const squeeze = inPoss || keeper ? 0 : (LANE_X[bl] - base.x) * 0.12;
    return { x: clamp(base.x + lateral + squeeze, 0.03, 0.97), y: clamp(base.y + vertical, 0.02, 0.97) };
  }

  /** Own frame (x: left→right facing the opponent goal, y: own goal→opponent goal) → absolute pitch. */
  private toAbs(side: Side, o: { x: number; y: number }): { x: number; y: number } {
    return side === 'home' ? { x: o.y, y: o.x } : { x: 1 - o.y, y: 1 - o.x };
  }

  private trackShape(): void {
    for (const t of [this.state.home, this.state.away]) {
      for (const p of t.players) {
        if (p.status !== 'PITCH') continue;
        const o = this.shapePos(t, p);
        p.posSum.x += o.x; p.posSum.y += o.y; p.posSum.n++;
      }
    }
  }

  private positions(): PitchPositions {
    const s = this.state;
    const lastShot = s.shots[s.shots.length - 1];
    const shotNow = lastShot && lastShot.tick === s.tick ? lastShot : null;
    const dots = (t: TeamMatchState): PitchDot[] => this.onPitch(t).map(p => {
      if (shotNow && shotNow.playerId === p.id) { const a = shotAbs(shotNow); return { id: p.id, x: a.x, y: a.y }; }
      const a = this.toAbs(t.side, this.shapePos(t, p));
      // Small deterministic drift so the shape breathes between ticks
      const h = (p.shirt * 37 + (t.side === 'home' ? 0 : 11)) % 97;
      return { id: p.id, x: clamp(a.x + Math.sin(s.tick * 0.9 + h) * 0.008, 0.01, 0.99), y: clamp(a.y + Math.cos(s.tick * 0.7 + h) * 0.01, 0.01, 0.99) };
    });
    const home = dots(s.home), away = dots(s.away);
    let ball: { x: number; y: number };
    const poss = this.team(s.possession);
    if (s.period === 'PRE' || s.period === 'HT' || s.period === 'FT') ball = { x: 0.5, y: 0.5 };
    else if (shotNow) ball = shotAbs(shotNow);
    else if (s.setPiece === 'CORNER') ball = this.toAbs(poss.side, { x: s.ball.lane === 0 ? 0.01 : 0.99, y: 0.99 });
    else if (s.setPiece === 'PENALTY') ball = this.toAbs(poss.side, { x: 0.5, y: 0.895 });
    else {
      const carrier = s.carrierId ? (s.possession === 'home' ? home : away).find(d => d.id === s.carrierId) : undefined;
      ball = carrier
        ? { x: carrier.x + (s.possession === 'home' ? 0.012 : -0.012), y: carrier.y + 0.006 }
        : this.toAbs(poss.side, { x: LANE_X[s.ball.lane], y: THIRD_Y[s.ball.third] });
      if (s.ball.third === 1 && s.ball.lane === 1 && s.ticksSinceStoppage === 0 && !s.carrierId) ball = { x: 0.5, y: 0.5 };
    }
    return { home, away, ball, carrierId: s.carrierId };
  }

  // ───────────────────────────── Play ─────────────────────────────

  private playPhase(): void {
    const s = this.state;
    const A = this.team(s.possession);
    const B = this.team(other(s.possession));
    A.stats.possessionTicks++;
    this.addMomentum(s.possession, s.ball.third === 2 ? 1.2 : s.ball.third === 1 ? 0.4 : 0.1);

    if (s.setPiece) { this.resolveSetPiece(A, B); return; }

    const { third: t, lane: l } = s.ball;
    const counter = s.counterTicks > 0;
    if (counter) s.counterTicks--;
    const ctx: ActionContext = {
      third: t, lane: l, buildUp: A.tactics.buildUp, focus: A.tactics.focus, mentality: A.tactics.mentality,
      attShout: A.shout.active, oppPressing: B.tactics.pressing, oppDefLine: B.tactics.defLine,
      oppShout: B.shout.active, counter
    };
    const action = this.rng.weighted(actionWeights(ctx));
    const actor = this.pickNear(A, true, t, l, p => this.actionSkill(p, action), t === 0);
    if (!actor) return;
    s.carrierId = actor.id;

    if (action === 'LONG_SHOT') { this.shot(A, B, 'LONG_SHOT', actor, null); return; }

    const att = this.attackStrength(A, t, l);
    const def = this.defenseStrength(B, t, l);
    const diff = (att - def) / (att + def + 1e-6);
    const { mod } = matrixModifier(action, ctx);
    let p = ACTION_BASE[action] + 0.42 * diff + mod;
    if (action === 'LONG_BALL') {
      if (this.onPitch(A).some(x => x.role === 'TM')) p += 0.05;
      if (actor.role === 'BPD' || actor.role === 'SK') p += 0.05;
    }
    const success = this.rng.chance(clamp(p, 0.05, 0.96));
    const isPass = action !== 'DRIBBLE' && action !== 'WORK_SHOT';
    if (isPass) {
      actor.stats.passes++; A.stats.passes++;
      if (success) { actor.stats.passesCompleted++; A.stats.passesCompleted++; }
    }

    // One tick is 10 seconds of play: a successful phase hides several safe circulation passes
    if (success && (action === 'RECYCLE' || action === 'PROGRESS' || action === 'SWITCH') && t < 2) {
      const extra = action === 'RECYCLE' ? 2 : 1;
      const mate = this.pickNear(A, true, t, l, p => p.attrs.passing, t === 0);
      actor.stats.passes++; actor.stats.passesCompleted++;
      if (mate && extra > 1) { mate.stats.passes++; mate.stats.passesCompleted++; }
      A.stats.passes += extra; A.stats.passesCompleted += extra;
    } else if (success && t === 2 && (action === 'RECYCLE' || action === 'SWITCH')) {
      actor.stats.passes++; actor.stats.passesCompleted++; A.stats.passes++; A.stats.passesCompleted++;
    }
    if (success) this.onSuccess(A, B, action, actor, t, l, counter);
    else this.onFail(A, B, action, actor, t, l);

    if (!s.stoppage && !s.setPiece && this.rng.chance(0.06)) {
      s.stoppage = true; // throw-in / goal kick
      if (this.rng.chance(0.45)) this.turnover(other(s.possession), s.ball.third, s.ball.lane);
    }
  }

  private actionSkill(p: LivePlayer, action: ActionKind): number {
    const a = p.attrs;
    const ri = ROLE_INFO[p.role];
    switch (action) {
      case 'DRIBBLE': return (a.technique + a.pace) / 2;
      case 'CROSS': case 'CUTBACK': return a.passing * ri.creation;
      case 'THROUGH': return a.vision * ri.creation;
      case 'LONG_SHOT': return a.longShots;
      case 'WORK_SHOT': return a.finishing * ri.finishing;
      default: return a.passing * ri.buildUp;
    }
  }

  private onSuccess(A: TeamMatchState, B: TeamMatchState, action: ActionKind, actor: LivePlayer, t: Third, l: Lane, counter: boolean): void {
    const s = this.state;
    switch (action) {
      case 'RECYCLE':
        if (this.rng.chance(0.35)) s.ball.lane = this.pickLane(A.tactics.focus);
        // Recycling in the final third often means going back to midfield
        if (t === 2 && this.rng.chance(0.4)) s.ball.third = 1;
        return;
      case 'SWITCH':
        s.ball.lane = l === 1 ? (this.rng.chance(0.5) ? 0 : 2) : flip(l);
        return;
      case 'PROGRESS': {
        let nt = Math.min(2, t + 1) as Third;
        if (counter && nt < 2 && this.rng.chance(0.5)) nt = 2;
        s.ball.third = nt;
        if (this.rng.chance(0.5)) s.ball.lane = this.pickLane(A.tactics.focus);
        if (nt === 2) this.narrate('ATTACK', A, actor, { lane: s.ball.lane });
        return;
      }
      case 'DRIBBLE':
        actor.stats.dribbles++;
        if (t < 2) { s.ball.third = (t + 1) as Third; if (s.ball.third === 2) this.narrate('ATTACK', A, actor, { lane: s.ball.lane, dribble: 1 }); return; }
        if (l !== 1) {
          s.ball.lane = 1;
          if (this.rng.chance(actor.role === 'IF' ? 0.4 : 0.22)) this.shot(A, B, 'OPEN_PLAY', actor, null);
          return;
        }
        this.shot(A, B, 'OPEN_PLAY', actor, null);
        return;
      case 'LONG_BALL': {
        s.ball.third = 2;
        s.ball.lane = this.pickLane(A.tactics.focus);
        const runner = this.pickNear(A, true, 2, s.ball.lane, p => (p.attrs.pace + p.attrs.finishing) / 2);
        if (runner && this.rng.chance(inBehindChance(B.tactics.defLine, effectivePressing(B.tactics.pressing, B.shout.active)))) {
          actor.stats.keyPasses++;
          this.narrate('LONG_BALL', A, actor, { behind: 1 }, runner, true);
          this.shot(A, B, 'THROUGH', runner, actor);
        } else {
          this.narrate('LONG_BALL', A, actor, {}, runner);
          // Second ball: a long ball lands in a contested area; a target man helps win it
          const secondBallLoss = this.onPitch(A).some(x => x.role === 'TM') ? 0.28 : 0.4;
          if (this.rng.chance(secondBallLoss)) {
            const winner = this.pickNear(B, false, 0, flip(s.ball.lane), p => p.attrs.positioning + p.attrs.strength);
            if (winner) winner.stats.interceptions++;
            this.turnover(B.side, 2, s.ball.lane);
          }
        }
        return;
      }
      case 'THROUGH': {
        actor.stats.keyPasses++;
        const runner = this.pickNear(A, true, 2, 1, p => p.attrs.pace * 0.5 + p.attrs.finishing * ROLE_INFO[p.role].finishing * 0.5);
        if (runner && runner.id !== actor.id) this.shot(A, B, counter ? 'COUNTER' : 'THROUGH', runner, actor);
        else this.shot(A, B, 'OPEN_PLAY', actor, null);
        return;
      }
      case 'CROSS':
        actor.stats.keyPasses++;
        this.shot(A, B, this.rng.chance(0.72) ? 'HEADER' : 'OPEN_PLAY', null, actor);
        return;
      case 'CUTBACK':
        actor.stats.keyPasses++;
        this.shot(A, B, 'CUTBACK', null, actor);
        return;
      case 'WORK_SHOT': {
        const shooter = this.pickNear(A, true, 2, 1, p => p.attrs.finishing * ROLE_INFO[p.role].finishing) ?? actor;
        const assister = shooter.id !== actor.id && this.rng.chance(0.6) ? actor : null;
        if (assister) assister.stats.keyPasses++;
        this.shot(A, B, counter ? 'COUNTER' : 'OPEN_PLAY', shooter, assister);
        return;
      }
      default:
        return;
    }
  }

  private onFail(A: TeamMatchState, B: TeamMatchState, action: ActionKind, actor: LivePlayer, t: Third, l: Lane): void {
    const s = this.state;
    if ((action === 'THROUGH' || action === 'LONG_BALL') && this.rng.chance(offsideShare(B.tactics.defLine))) {
      A.stats.offsides++;
      this.emit('OFFSIDE', { side: A.side, playerId: actor.id, playerName: actor.name });
      this.turnover(B.side, t, l);
      s.stoppage = true;
      return;
    }
    if (t === 2 && (action === 'CROSS' || action === 'CUTBACK' || action === 'WORK_SHOT')) {
      const cornerP = action === 'CROSS' ? 0.14 : 0.08;
      if (this.rng.chance(cornerP)) { this.awardCorner(A, l); return; }
    }
    this.loseBall(A, B, actor, t, l);
  }

  private loseBall(A: TeamMatchState, B: TeamMatchState, actor: LivePlayer, t: Third, l: Lane): void {
    const s = this.state;
    const tackler = this.pickNear(B, false, flip(t), flip(l), p => p.attrs.tackling * ROLE_INFO[p.role].defense);
    if (tackler && this.rng.chance(foulChance(effectivePressing(B.tactics.pressing, B.shout.active), B.shout.active, tackler.attrs.tackling))) {
      this.foul(A, B, tackler, actor, t, l);
      return;
    }
    // Most turnovers are interceptions or loose balls; only some are true tackles
    if (tackler) {
      if (this.rng.chance(0.2)) { tackler.stats.tackles++; B.stats.tackles++; } else tackler.stats.interceptions++;
    }
    if (t === 0) actor.stats.mistakes++;
    this.turnover(B.side, t, l);

    // High turnover: won the ball in the opponent's defensive third
    if (t === 0 && this.rng.chance(highTurnoverShotChance(effectivePressing(B.tactics.pressing, B.shout.active)))) {
      this.narrate('TURNOVER', B, tackler, { high: 1 }, actor, true);
      this.shot(B, A, 'OPEN_PLAY', null, tackler);
      return;
    }
    const wingBacks = this.onPitch(A).filter(p => p.role === 'WB').length;
    const exp = exposure(A.tactics.mentality, A.tactics.defLine, wingBacks);
    if (this.rng.chance(counterChance(B.tactics.buildUp, exp, flip(t)))) {
      s.counterTicks = 3;
      this.narrate('COUNTER', B, tackler, {}, null, true);
    }
  }

  /** Hand possession to `winner`; (t, l) are in the LOSER's frame and get mirrored. */
  private turnover(winner: Side, t: Third, l: Lane): void {
    const s = this.state;
    s.possession = winner;
    s.ball = { third: flip(t), lane: flip(l) };
    s.carrierId = null;
    s.counterTicks = 0;
    s.setPiece = null;
  }

  private foul(A: TeamMatchState, B: TeamMatchState, offender: LivePlayer, victim: LivePlayer, t: Third, l: Lane): void {
    const s = this.state;
    B.stats.fouls++;
    offender.stats.fouls++;
    this.emit('FOUL', { side: B.side, playerId: offender.id, playerName: offender.name, otherName: victim.name });
    const red = this.rng.chance(0.0025);
    const yellowP = 0.14 * (B.shout.active === 'DEMAND_MORE' ? 1.3 : 1) * (t === 2 ? 1.2 : 1);
    if (red) this.sendOff(B, offender, false);
    else if (this.rng.chance(offender.yellow ? yellowP * 0.28 : yellowP)) {
      offender.yellow++;
      B.stats.yellow++;
      if (offender.yellow >= 2) this.sendOff(B, offender, true);
      else this.emit('YELLOW', { side: B.side, playerId: offender.id, playerName: offender.name });
    }
    if (this.rng.chance(0.008)) this.injure(A, victim);
    s.stoppage = true;
    s.counterTicks = 0;
    if (t === 2 && l === 1 && this.rng.chance(0.16)) s.setPiece = 'PENALTY';
    else if (t === 2) s.setPiece = 'FREE_KICK';
  }

  private sendOff(t: TeamMatchState, p: LivePlayer, secondYellow: boolean): void {
    if (p.status !== 'PITCH') return;
    p.status = 'SENT_OFF';
    p.lastSlot = p.slot;
    p.slot = -1;
    t.stats.red++;
    this.emit('RED', { side: t.side, playerId: p.id, playerName: p.name, meta: { secondYellow: secondYellow ? 1 : 0 } });
    this.requestPause('RED_CARD', `Red card: ${p.name} (${t.shortName})`);
  }

  private awardCorner(A: TeamMatchState, l: Lane): void {
    const s = this.state;
    A.stats.corners++;
    s.setPiece = 'CORNER';
    s.stoppage = true;
    s.ball = { third: 2, lane: l === 1 ? (this.rng.chance(0.5) ? 0 : 2) : l };
    this.emit('CORNER', { side: A.side });
  }

  private resolveSetPiece(A: TeamMatchState, B: TeamMatchState): void {
    const s = this.state;
    const sp = s.setPiece;
    s.setPiece = null;
    const taker = [...this.onPitch(A)].filter(p => p.slot !== 0).sort((a, b) => (b.attrs.passing + b.attrs.technique) - (a.attrs.passing + a.attrs.technique))[0] ?? null;
    if (sp === 'PENALTY') {
      const shooter = [...this.onPitch(A)].filter(p => p.slot !== 0).sort((a, b) => (b.attrs.finishing + b.attrs.composure) - (a.attrs.finishing + a.attrs.composure))[0] ?? null;
      this.emit('PENALTY', { side: A.side, playerId: shooter?.id, playerName: shooter?.name });
      this.shot(A, B, 'PENALTY', shooter, null);
      return;
    }
    if (sp === 'FREE_KICK') {
      if (this.rng.chance(0.3)) {
        const shooter = [...this.onPitch(A)].filter(p => p.slot !== 0).sort((a, b) => (b.attrs.longShots + b.attrs.technique) - (a.attrs.longShots + a.attrs.technique))[0] ?? null;
        this.shot(A, B, 'FREE_KICK', shooter, null);
      } else if (this.rng.chance(0.4)) {
        if (taker) taker.stats.keyPasses++;
        this.shot(A, B, 'HEADER', null, taker);
      }
      return;
    }
    // Corner
    if (this.rng.chance(0.2)) {
      if (taker) taker.stats.keyPasses++;
      this.shot(A, B, 'CORNER', null, taker);
      return;
    }
    if (this.rng.chance(0.5)) return; // recycled on the edge of the box
    this.turnover(B.side, 2, 1);
    const exp = exposure(A.tactics.mentality, A.tactics.defLine, 0) + 0.1;
    if (this.rng.chance(counterChance(B.tactics.buildUp, exp, 0))) {
      s.counterTicks = 3;
      this.narrate('COUNTER', B, null, { fromCorner: 1 }, null, true);
    }
  }

  // ───────────────────────────── Shots ─────────────────────────────

  private pickShooter(A: TeamMatchState, type: ShotType): LivePlayer | null {
    const header = type === 'HEADER' || type === 'CORNER';
    const entries: Array<readonly [LivePlayer, number]> = [];
    for (const p of this.onPitch(A)) {
      if (p.slot === 0) continue;
      const ri = ROLE_INFO[p.role];
      const pos = this.pos(A, p, true);
      let w = this.presence(pos, 0.5, type === 'LONG_SHOT' ? 0.7 : 0.88, 0.2, 0.28);
      if (type === 'CORNER' && isDefensiveKind(slotDef(A.tactics.formation, p.slot).kind) && !['WB', 'FB', 'IFB'].includes(p.role)) w = Math.max(w, 0.55);
      const skill = header ? (p.attrs.strength * 0.6 + p.attrs.positioning * 0.4) * ri.aerial
        : type === 'LONG_SHOT' ? p.attrs.longShots
          : p.attrs.finishing * ri.finishing;
      entries.push([p, w * Math.pow(skill, 1.4)]);
    }
    if (!entries.length) return null;
    return this.rng.weighted(entries);
  }

  private shot(A: TeamMatchState, B: TeamMatchState, type: ShotType, shooterIn: LivePlayer | null, assisterIn: LivePlayer | null): void {
    const s = this.state;
    s.counterTicks = 0;
    const shooter = shooterIn ?? this.pickShooter(A, type);
    if (!shooter) return;
    const assister = assisterIn && assisterIn.id !== shooter.id ? assisterIn : null;
    const ri = ROLE_INFO[shooter.role];
    const header = type === 'HEADER' || type === 'CORNER';
    const loc = sampleLocation(type, this.rng, s.ball.lane);

    let pressure = 0;
    if (type !== 'PENALTY') {
      const att = this.attackStrength(A, 2, 1);
      const def = this.defenseStrength(B, 2, 1);
      pressure = clamp(def / (att + def + 1e-6), 0, 1);
    }
    const xg = computeXg(type, loc.dist, loc.lat, pressure, header ? ri.aerial : ri.finishing);
    const big = xg >= BIG_CHANCE_XG;
    A.stats.shots++; A.stats.xg += xg;
    shooter.stats.shots++; shooter.stats.xg += xg;
    if (big) A.stats.bigChances++;

    const keeper = this.keeperOf(B);
    const keeperSkill = keeper ? (keeper.slot === 0 ? keeper.attrs.reflexes : keeper.attrs.reflexes * 0.6) * (0.85 + 0.15 * keeper.stamina / 100) : 20;
    const e = this.eff(A, shooter);
    const finish = (header ? shooter.attrs.strength * 0.55 + shooter.attrs.finishing * 0.45
      : type === 'LONG_SHOT' || type === 'FREE_KICK' ? shooter.attrs.longShots : shooter.attrs.finishing) * e;
    const pGoal = goalProbability(xg, finish, shooter.attrs.composure, keeperSkill, big);

    let outcome: ShotOutcome;
    if (this.rng.chance(pGoal)) outcome = 'GOAL';
    else {
      const pBlock = type === 'PENALTY' ? 0 : (type === 'OPEN_PLAY' || type === 'LONG_SHOT' || type === 'FREE_KICK') ? 0.18 + 0.2 * pressure : 0.07;
      if (this.rng.chance(pBlock)) outcome = 'BLOCKED';
      else outcome = this.rng.chance(header ? 0.3 : 0.24 + shooter.attrs.finishing / 400) ? 'SAVED' : 'OFF';
    }
    const { minute } = this.minuteInfo();
    s.shots.push({ id: s.shots.length + 1, tick: s.tick, minute, side: A.side, playerId: shooter.id, playerName: shooter.name, type, dist: loc.dist, lat: loc.lat, xg, outcome });
    this.addMomentum(A.side, 2 + xg * 8 + (big ? 3 : 0));
    const base = { side: A.side, playerId: shooter.id, playerName: shooter.name, otherName: assister?.name, xg, meta: { type, big: big ? 1 : 0, dist: Math.round(loc.dist) } };

    switch (outcome) {
      case 'GOAL': {
        A.score++;
        A.stats.shotsOnTarget++; shooter.stats.shotsOnTarget++; shooter.stats.goals++;
        if (assister) assister.stats.assists++;
        for (const p of this.onPitch(B)) p.stats.conceded++;
        A.morale = Math.min(100, A.morale + 4);
        B.morale = Math.max(0, B.morale - 4);
        this.addMomentum(A.side, 6);
        this.emit('GOAL', { ...base, meta: { ...base.meta, home: s.home.score, away: s.away.score } });
        s.possession = B.side;
        s.ball = { third: 1, lane: 1 };
        s.carrierId = null;
        s.stoppage = true;
        s.setPiece = null;
        this.requestPause('GOAL', `GOAL! ${shooter.name} — ${s.home.shortName} ${s.home.score}–${s.away.score} ${s.away.shortName}`);
        return;
      }
      case 'SAVED':
        A.stats.shotsOnTarget++; shooter.stats.shotsOnTarget++;
        if (keeper) keeper.stats.saves++;
        this.emit('SHOT_SAVED', { ...base, meta: { ...base.meta, keeper: keeper?.name ?? 'the keeper' } });
        if (type !== 'PENALTY' && this.rng.chance(0.22)) { this.awardCorner(A, s.ball.lane); return; }
        this.turnover(B.side, 2, 1);
        return;
      case 'BLOCKED':
        this.emit('SHOT_BLOCKED', base);
        if (this.rng.chance(0.3)) { this.awardCorner(A, s.ball.lane); return; }
        if (this.rng.chance(0.45)) { s.ball = { third: 2, lane: s.ball.lane }; return; }
        this.turnover(B.side, 2, 1);
        return;
      case 'OFF':
        this.emit('SHOT_OFF', base);
        this.turnover(B.side, 2, 1);
        s.stoppage = true;
        return;
    }
  }

  // ───────────────────────────── Events & momentum ─────────────────────────────

  private emit(type: MatchEventType, o: Partial<Omit<MatchEvent, 'id' | 'tick' | 'minute' | 'added' | 'type' | 'key'>> = {}): void {
    const s = this.state;
    const { minute, added } = this.minuteInfo();
    const ev: MatchEvent = { id: s.nextEventId++, tick: s.tick, minute, added, type, key: !NON_KEY.has(type), ...o };
    if (ev.playerId === undefined) delete ev.playerId;
    if (ev.playerName === undefined) delete ev.playerName;
    if (ev.otherName === undefined) delete ev.otherName;
    this.pending.push(ev);
    s.events.push(ev);
    if (s.events.length > 600) {
      const idx = s.events.findIndex(e => !e.key);
      s.events.splice(idx >= 0 ? idx : 0, 1);
    }
  }

  /** Rate-limited colour commentary for build-up play. `force` bypasses the limit. */
  private narrate(type: MatchEventType, t: TeamMatchState, actor: LivePlayer | null, meta: Record<string, string | number>, other: LivePlayer | null = null, force = false): void {
    const s = this.state;
    if (!force && s.tick - s.lastNarrationTick < 3) return;
    s.lastNarrationTick = s.tick;
    this.emit(type, { side: t.side, playerId: actor?.id, playerName: actor?.name, otherName: other?.name, meta });
  }

  private addMomentum(side: Side, v: number): void {
    const s = this.state;
    const idx = Math.max(0, Math.floor((s.tick - 1) / TICKS_PER_MINUTE));
    while (s.momentum.length <= idx) s.momentum.push(0);
    s.momentum[idx] = Math.round(((s.momentum[idx] ?? 0) + (side === 'home' ? v : -v)) * 10) / 10;
  }

  private requestPause(reason: PauseReason, message: string): void {
    const t = this.state.autoPause;
    const enabled: Record<PauseReason, boolean> = {
      USER: true, GOAL: t.goal, RED_CARD: t.redCard, INJURY: t.injury, STAMINA: t.staminaBelow60,
      HALF_TIME: t.halfTime, SUB_WINDOW: t.subWindow65
    };
    if (enabled[reason] && !this.pauseReq) this.pauseReq = { reason, message };
  }

  private flush(): MatchEvent[] {
    const out = this.pending;
    this.pending = [];
    return out;
  }

  // ───────────────────────────── Views ─────────────────────────────

  private teamView(t: TeamMatchState): TeamView {
    const players: PlayerView[] = t.players.map(p => ({
      id: p.id, name: p.name, shirt: p.shirt, position: p.position, role: p.role,
      slotKind: p.slot >= 0 ? slotDef(t.tactics.formation, p.slot).kind
        : p.status === 'INJURED_OFF' && p.lastSlot >= 0 ? slotDef(t.tactics.formation, p.lastSlot).kind : null,
      slot: p.slot, status: p.status, stamina: Math.round(p.stamina), yellow: p.yellow, injured: p.injured,
      rating: p.rating, goals: p.stats.goals, assists: p.stats.assists
    }));
    return {
      side: t.side, name: t.name, shortName: t.shortName, color: t.color, identity: t.identity, isUser: t.isUser,
      tactics: { ...t.tactics }, score: t.score, subsUsed: t.subsUsed, stats: { ...t.stats, xg: Math.round(t.stats.xg * 100) / 100 },
      shout: { ...t.shout }, players
    };
  }

  /** @param progress 0..1 fraction of the current tick elapsed in real time (for a smooth clock). */
  getView(progress = 0): EngineTick {
    const s = this.state;
    const { minute, added } = this.minuteInfo();
    const frac = s.status === 'RUNNING' ? clamp(progress, 0, 0.999) : 0;
    let clockSeconds = 0;
    if (s.period === 'FIRST') clockSeconds = (s.halfTick + frac) * SECONDS_PER_TICK;
    else if (s.period === 'HT') clockSeconds = 45 * 60;
    else if (s.period === 'SECOND') clockSeconds = 45 * 60 + (s.halfTick + frac) * SECONDS_PER_TICK;
    else if (s.period === 'FT') clockSeconds = 90 * 60;
    const half = s.period === 'SECOND' || s.period === 'FT' ? s.added.second : s.added.first;
    return {
      matchId: s.matchId, status: s.status, period: s.period, pauseReason: s.pauseReason, speed: s.speed, tick: s.tick,
      clockSeconds: Math.round(clockSeconds), minute, added,
      addedAnnounced: s.period === 'HT' ? s.added.first : s.halfTick >= HALF_TICKS || s.period === 'FT' ? half : 0,
      possession: s.possession, ball: { ...s.ball }, home: this.teamView(s.home), away: this.teamView(s.away),
      queue: s.queue.map(a => ({ ...a })), momentum: [...s.momentum], userSide: s.userSide,
      positions: this.positions(), lastShot: s.shots[s.shots.length - 1] ?? null,
      halfTimeIndex: s.period === 'SECOND' || s.period === 'FT' ? 45 + s.added.first : null, setPiece: s.setPiece
    };
  }

  getSnapshot(): MatchState {
    this.state.rngState = this.rng.state;
    return structuredClone(this.state);
  }

  getSummary(): MatchSummary {
    const s = this.state;
    const side = (t: TeamMatchState): MatchSummary['home'] => {
      const v = this.teamView(t);
      const players: PlayerSummary[] = v.players.filter(p => p.status !== 'BENCH').map(pv => {
        const lp = t.players.find(x => x.id === pv.id)!;
        const n = lp.posSum.n;
        return { ...pv, stats: { ...lp.stats, xg: Math.round(lp.stats.xg * 100) / 100 }, avg: n ? { x: lp.posSum.x / n, y: lp.posSum.y / n } : null };
      });
      return { name: t.name, shortName: t.shortName, color: t.color, score: t.score, stats: v.stats, players, identity: t.identity, formation: t.tactics.formation };
    };
    return {
      id: s.matchId, playedAt: Date.now(), userSide: s.userSide, home: side(s.home), away: side(s.away),
      events: s.events.filter(e => e.key), shots: [...s.shots], momentum: [...s.momentum], halfTimeIndex: 45 + s.added.first
    };
  }
}
