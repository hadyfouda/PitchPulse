import type { LeagueSimJob, LeagueSimRequest, LeagueSimResponse } from './leagueProtocol.ts';
import type { MatchSummary } from '../types/match.ts';

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, { resolve: (r: LeagueSimResponse['results']) => void; reject: (e: Error) => void }>();

function ensure(): Worker {
  if (worker) return worker;
  worker = new Worker(new URL('./leagueSim.worker.ts', import.meta.url), { type: 'module' });
  worker.onmessage = (e: MessageEvent<LeagueSimResponse>) => {
    const p = pending.get(e.data.id);
    if (!p) return;
    pending.delete(e.data.id);
    if (e.data.error) p.reject(new Error(e.data.error)); else p.resolve(e.data.results);
  };
  worker.onerror = e => { for (const p of pending.values()) p.reject(new Error(e.message)); pending.clear(); };
  return worker;
}

/** Simulate a batch of fixtures off the main thread. */
export function simulateFixtures(jobs: LeagueSimJob[]): Promise<Map<string, MatchSummary>> {
  if (!jobs.length) return Promise.resolve(new Map());
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve: results => resolve(new Map(results.map(r => [r.fixtureId, r.summary]))), reject });
    ensure().postMessage({ id, jobs } satisfies LeagueSimRequest);
  });
}
