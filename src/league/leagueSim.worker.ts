/// <reference lib="webworker" />
/**
 * Batch simulator for the rest of a league round (and the user's own match on "Simulate").
 * Runs the same pure MatchEngine flat-out, so it never touches the live match worker.
 */
import type { LeagueSimRequest, LeagueSimResponse } from './leagueProtocol.ts';
import { MatchEngine } from '../engine/MatchEngine.ts';

const ctx = self as unknown as DedicatedWorkerGlobalScope;
const OFF = { goal: false, redCard: false, injury: false, staminaBelow60: false, halfTime: false, subWindow65: false };

ctx.onmessage = (e: MessageEvent<LeagueSimRequest>) => {
  const { id, jobs } = e.data;
  try {
    const results = jobs.map(job => {
      const engine = MatchEngine.fromSetup({
        matchId: job.matchId, seed: job.seed, home: job.home, away: job.away,
        userSide: 'home', speed: 'X8', autoPause: OFF,
        knockout: job.knockout, aggregate: job.aggregate, competition: job.competition
      });
      engine.start();
      let guard = 0;
      while (engine.state.status !== 'FINISHED' && guard++ < 5000) engine.step();
      return { fixtureId: job.fixtureId, summary: engine.getSummary() };
    });
    ctx.postMessage({ id, results } satisfies LeagueSimResponse);
  } catch (err) {
    ctx.postMessage({ id, results: [], error: err instanceof Error ? err.message : String(err) } satisfies LeagueSimResponse);
  }
};
