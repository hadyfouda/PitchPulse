/**
 * Seeded mulberry32 RNG. Its whole state is one 32-bit integer, so it can be
 * stored in a snapshot and a resumed match continues identically.
 */
export class Rng {
  state: number;

  constructor(seed: number) {
    this.state = seed | 0;
  }

  next(): number {
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), 1 | t);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  chance(p: number): boolean {
    return this.next() < p;
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  pick<T>(items: readonly T[]): T {
    const item = items[Math.floor(this.next() * items.length)];
    if (item === undefined) throw new Error('Rng.pick on empty list');
    return item;
  }

  /** Picks a key from [key, weight] pairs. Non-positive weights are ignored. */
  weighted<T>(entries: ReadonlyArray<readonly [T, number]>): T {
    let total = 0;
    for (const [, w] of entries) if (w > 0) total += w;
    if (total <= 0) {
      const first = entries[0];
      if (!first) throw new Error('Rng.weighted on empty list');
      return first[0];
    }
    let x = this.next() * total;
    for (const [k, w] of entries) {
      if (w <= 0) continue;
      x -= w;
      if (x <= 0) return k;
    }
    const last = entries[entries.length - 1];
    if (!last) throw new Error('Rng.weighted on empty list');
    return last[0];
  }
}

export const randomSeed = (): number => (Math.random() * 4294967296) >>> 0;
