# PitchPulse — Dynamic Idle Tactical Football Manager

Offline-first tactical football manager that sits calmly in a side tab: think in 2-minute bursts, let the match
run in the background, step in at any second.

**Status: Phase 3 — League Season, Rotation & Scouting** (Phases 1–2 included).

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # strict type-check + production build into dist/
npm run sim        # headless balance check: 300 matches + tactical-matrix duels (Node 22+)
npm run season     # headless two-season league run: schedule, table, fatigue, injuries, bans
```

`dist/` is fully static and uses relative paths, so it can be hosted on GitHub Pages or any file server.

## Install on your phone

Live build: **https://hadyfouda.github.io/pitchpulse/**

- **Android (Chrome):** open the link → menu ⋮ → *Install app* / *Add to Home screen*.
- **iPhone (Safari):** open the link → Share → *Add to Home Screen*.

It opens full-screen like a native app and works completely offline after the first visit (the service worker
precaches every file, including both Web Workers). Your career lives in the phone's IndexedDB — use *Export save* in the
Club tab to back it up or move it between devices. On phones the three desktop columns become a bottom tab bar
(Club / Squad / Tactics in the hub, Live / Squad / Touchline during a match).

Deploying: the `gh-pages` branch holds the contents of `dist/` (`npm run build`), served by GitHub Pages.

## Stack

React 19 · TypeScript (strict, `noUncheckedIndexedAccess`) · Vite 8 · Tailwind CSS 4 · Zustand 5 · Dexie 4 (IndexedDB) · Web Worker match engine.

## Folder structure

```
src/
  types/                 Shared contracts — no runtime code
    domain.ts            Player, PlayerAttributes, Team, Lineup
    tactics.ts           Formation, Pressing, DefLine, BuildUp, AttackFocus, Mentality, RoleId, ShoutType
    match.ts             MatchState (= snapshot), LivePlayer, MatchEvent, ShotRecord, QueuedAction, EngineTick, MatchSummary
    protocol.ts          UICommand / WorkerCommand (UI → worker), WorkerMessage (worker → UI)
  engine/                Pure TypeScript simulation — no DOM, no React
    MatchEngine.ts       Tick-based state machine (one step() = 10 match seconds)
    matchEngine.worker.ts  Owns real time; wall-clock catch-up loop; typed messaging
    tacticalMatrix.ts    Every rock-paper-scissors interaction as data + pure functions
    formations.ts        Slot coordinates for the 6 formations
    roles.ts             18 roles: positioning offsets + contribution multipliers
    xg.ts                Angle/distance logistic xG + shot-type, pressure and role modifiers
    aiManager.ts         Per-minute AI adaptation (tactics, subs, shouts) via the same ActionQueue
    identities.ts        AI tactical identities (Gegenpress, Tiki-Taka, Park the Bus, …)
    ratings.ts           Live 0–10 player ratings
    rng.ts               Seeded mulberry32 (state stored in snapshots)
    constants.ts         Tick length, speed modes, cooldowns, defaults
  data/                  Procedural names, squads, clubs, auto-lineup, lineup repair
  league/                Schedule + table, round processing (fatigue, injuries, bans), scout reports, league sim worker
  db/db.ts               Dexie schema: career, settings, live (resume snapshot), matches (archive)
  store/                 Zustand stores + engineBridge (the only code that touches the worker)
  lib/                   Commentary formatter, labels, notifications + chime, formatting
  components/            prematch/ (career, lineup, fixture) · match/ (dashboard, full-time) · ui/
scripts/simulate.ts      Balance harness run straight from the engine sources
```

## Engine design

- **Zones:** 3 thirds × 3 lanes, always expressed from the attacking team's point of view. A turnover mirrors the zone.
- **Strength model:** every player has an (x, y) position from formation slot + role offsets + mentality + line height,
  different in and out of possession. Zone strength = Σ Gaussian presence × attribute mix × stamina × morale × position/role fit.
  Pressing scales the defenders' strength per third.
- **Actions per tick:** recycle, switch, progress, dribble, long ball, through ball, cross, cutback, long shot, work a shot.
  Weights come from build-up, focus, mentality and shouts; success = base + 0.42·(att−def)/(att+def) + matrix modifier.
- **Counter matrix** (`tacticalMatrix.ts`): High Press traps Short build-up but is bypassed by long balls into space behind a high
  line; a Low Block concedes possession, packs the centre and is weak to crosses and long shots; attacking mentality, high lines
  and wing-backs raise counter-attack exposure.
- **xG:** logistic fit on goal-mouth angle and distance (≈0.45 at 6 m, ≈0.22 from the spot, ≈0.04 from 25 m), × shot type ×
  defensive pressure × role. Conversion uses shooter finishing vs keeper reflexes.

Balance from `npm run sim` (per team per match): ~10 shots, ~4 on target, ~1.4 xG, ~1.35 goals (≈2.7 per match), ~1 big chance (xG ≥ 0.30), ~420 passes at ~79%, ~19 tackles,
~1.6 yellows, ~4 corners, ~2.3 offsides, ~10.7 fouls. A neutral mirror match averages ~2.6 goals per match — the real-world average.

## Phase 2 — Visualization & analytics

- **Live radar** (`components/match/PitchRadar.tsx`): `<canvas>` with all 22 players + ball. The engine sends absolute positions every
  tick: formation slot → role offsets → mentality/line height → a *block shift* toward the ball (teams slide across and step up
  or drop as a unit; out of possession the block squeezes toward the ball's lane). The canvas eases toward each tick with an
  exponential filter whose time constant follows the match speed, so motion is smooth at BG 30m and at 8x alike.
  Shots: the shooter is placed at the real shot location, the ball flies to goal and an outcome card (GOAL / SAVED / WIDE /
  BLOCKED + xG) appears. The pitch is rasterised once per size; rendering stops when nothing moves and the browser pauses it
  entirely in background tabs.
- **Modes:** *Full match* (always live), *Highlights* (dimmed until a key moment: ball in the final third, a set piece or a shot,
  then held 1.2 s), labels as shirt numbers or roles, and *Hide* to collapse the pitch to the 3×3 zone tracker. Focus mode still
  reduces the whole screen to score + momentum.
- **Momentum chart:** minute-by-minute dominance (3-minute smoothing), home above / away below, goal markers and a half-time line
  that accounts for first-half added time. Live during the match and in the Analytics Room.
- **Analytics Room** (full-time, and from any result in history): Overview (momentum, stats, key moments), **Shot map** (half
  pitch, dot area ∝ xG, colour = goal / on target / off target / blocked, hover for details), **Average positions** (per-tick
  shape positions averaged; substitutes dashed), **Player ratings** (minutes, rating, G, A, xG, shots, key passes, passes,
  tackles, interceptions, dribbles, saves, errors, fouls — sortable).
- Matches archived before Phase 2 still open; panels that need the new data say so instead of breaking.

## Phase 3 — League season, rotation & scouting

- **League:** 12 clubs (yours + 11 AI clubs with distinct identities), 22-round double round-robin generated with the circle
  method (every pairing home and away, no club twice in a round). Table sorted by points, goal difference, goals scored;
  form of the last five. Season leaders: scorers, assists, average rating (3+ apps), player-of-the-match awards.
- **Rounds:** play your fixture live, or **Simulate** it (your assistant uses your XI and tactics and still rotates tired
  players). The other five fixtures run in a separate `leagueSim.worker.ts`, so the live-match worker is never blocked.
  A full simulated season takes ~15 s in the browser, ~1.5 s in Node.
- **Fitness (cumulative fatigue):** minutes played cost fitness (≈24 for 90 minutes for an average engine); the week
  between rounds recovers a share of what is missing (stamina helps), so an ever-present starter settles around 75–82%.
  A player starts a match at his fitness, so tired legs fade earlier and get injured more often. AI clubs rotate on their own
  because their auto-pick weighs fitness.
- **Sharpness:** rises with minutes (+14 per 90), decays on the bench (−5 per round); worth up to ~3% performance.
- **Injuries:** in-match injuries become minor (1–2 matches) or major (3–7 matches); fitness is capped while recovering.
- **Discipline:** 5 / 10 / 15 yellows → 1 / 2 / 3-match bans; second yellow → 1 match; straight red → 2 matches.
  About 1.5 red cards and ~4 ban-matches per club per season.
- **Availability:** injured and suspended players can't be picked; Kick off and Simulate stay locked until the XI is valid,
  with a one-click *Replace them automatically* that keeps every still-valid manual choice.
- **Scout report:** style and usual shape, league position, form, goals for/against per game, key threat (season output +
  attributes), unavailable regulars, data-driven weaknesses (leaky defence, tired starters, absentees) and a suggested
  counter-plan you can apply in one click — the suggestions follow the engine's tactical matrix.
- **Season end:** final table, champion, Golden Boot, playmaker and player of the season are archived; next season every
  player recovers, bans and yellows reset, players age a year and a new fixture list is drawn.
- **Identity balance:** against a neutral 4-3-3 with the same squad every AI identity earns 1.26–1.46 points per game
  (neutral ≈ 1.37), and over ten simulated seasons no style is more than ~5 points per season above or below what its
  squad strength predicts. A role's presence is normalised by how far it ranges, so wide-ranging roles (Box-to-Box)
  spread their influence instead of counting fully everywhere. Long balls now land as contested second balls.
  Typical Golden Boot: ~19 goals in 22 rounds.
- Careers saved by Phases 1–2 are migrated on load into Season 1 (IndexedDB schema v2 adds the `seasons` store).

## Phase 4 — Club management, transfers & immersion

- **Finances (Club tab):** every round pays a broadcast fee (€150K) plus a home gate (€600K) and win/draw bonuses
  (€400K / €150K); weekly wages are deducted per round. Final position pays merit money (€12M for 1st down to €1M).
  Every entry lands in a ledger. New careers start with a €22M balance, a €12M transfer budget and a wage budget of
  1.25× the current bill.
- **Board confidence:** the board sets an expected finish from squad strength; each round moves confidence by how many
  points you are above or below that pace, and the season end weighs final position against expectation (title +8).
  Budgets are reset from the balance and confidence every summer.
- **Transfer Market & Scouting Hub:** ~32 listed players plus a free-agent pool. Filter by position, age, overall,
  potential, price and individual attributes; every target shows its **tactical fit** against your current shape and
  roles (`+x at DEF · BPD`, `Rotation at …`, `Depth`). Negotiation: offer a fee (the club may counter from 80% of its
  asking price, three attempts), then agree wages (accepted from 92% of the demand). Free agents cost a signing bonus.
  Squad cap 25.
- **Selling:** ask for bids on any player; accepted fees go to the balance and 60% back into the transfer budget.
- **Youth Academy:** 3–5 prospects aged 15–17 each season with current ability, a potential range (narrows with age;
  shown as a single value once a player is 26+ or has no headroom), star rating and best role. Promote or release; an
  unpromoted prospect graduates automatically at 19.
- **Off-pitch dilemmas:** ten situations (contract demands, media questions, training load, player complaints…) appear
  between rounds (~28% chance, only when their conditions hold). Each has two choices that trade morale, board
  confidence, sharpness or money, and expires if ignored.
- **Season lifecycle:** players age and develop toward their potential (fast up to 23, plateau, decline after 30),
  retire from 34, AI clubs release veterans and sign younger players, and every squad is topped up to a valid 20.
  Over four simulated seasons the league stays stable: no rating inflation, the average age holds, balances stay in
  the €16–40M range.
- **Save files:** *Export save* downloads one JSON with the career, all archived seasons and settings; *Import save*
  validates the format and version before replacing anything. Careers from Phase 3 are migrated on load (wages,
  potential, finances, academy and market are created for them).
- Balance check: `npm run career` runs a four-season economy simulation in Node.

## Message protocol

UI → worker: `{ channel: 'UI_COMMAND', command }` where command is `INIT | RESTORE | START | PAUSE | RESUME | SET_SPEED |
QUEUE_ACTION | CANCEL_ACTION | SHOUT | SET_AUTOPAUSE | REQUEST_SNAPSHOT | DISPOSE`.

Worker → UI: `ENGINE_TICK` (view projection, on every tick + 250 ms heartbeat), `MATCH_EVENT` (new events),
`AUTO_PAUSE`, `SNAPSHOT` (full serialisable state, every match minute and on pause), `MATCH_END`, `ENGINE_ERROR`.

## Architectural decisions & edge cases

| Case | Decision |
|---|---|
| Background-tab throttling / laptop sleep | The worker measures wall-clock time (`Date.now`) and runs every tick it owes (capped at 2000 per loop), stopping instantly if a trigger auto-pauses mid-batch. |
| Tab closed mid-match | A worker cannot outlive its tab. The full state is snapshotted to IndexedDB every match minute; on reopen you get **Resume match** (at most ~1 minute lost) and it restores paused. |
| Determinism | Seeded RNG state lives in the snapshot, so a restored match continues exactly as it would have. |
| Action queue timing | Tactics and role changes apply on the next tick. Substitutions apply at the next stoppage (throw-in, foul, goal, set piece, injury, half-time); if play hasn't stopped for 2 match minutes, the referee stops it for the change. Repeated tactics edits before a tick are merged. |
| Shout cooldown | One shared 15-minute cooldown across all four shouts (prevents stacking all four); each effect lasts 10 minutes. |
| Injuries & red cards | The player leaves immediately; the team plays a man short until a sub (counts towards the 5) fills an injured player's slot. Sent-off players can't be replaced. |
| Formation change mid-match | Players are greedily remapped to the nearest compatible slot; roles invalid for the new slot fall back to a sensible default. |
| Notifications | Fired only while the tab is hidden (the in-page banner covers the foreground). The soft chime is independent and optional. |
| AI managers | Use the identical ActionQueue and stoppage rules as the human. |

## Roadmap

All four phases are complete.
