/**
 * Deterministic PRNG for everything procedural. Never call Math.random() inside the
 * simulation: same seed + same input log must replay the same day in Pleasant Pines.
 *
 * mulberry32: tiny, fast, good enough for gameplay selection. `fork(label)` derives an
 * independent stream so adding a roll in one system never shifts another system's rolls
 * (the classic "I added a bark and now the dog steals different burgers" replay bug).
 */

export class Rng {
  private state: number;

  public constructor(seed: number) {
    this.state = seed >>> 0;
  }

  /** Float in [0, 1). */
  public next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Float in [min, max). */
  public range(min: number, max: number): number {
    return min + (max - min) * this.next();
  }

  /** Integer in [min, max] inclusive. */
  public int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  public chance(p: number): boolean {
    return this.next() < p;
  }

  public pick<T>(items: readonly T[]): T {
    if (items.length === 0) {
      throw new Error('Rng.pick on empty list');
    }
    return items[Math.floor(this.next() * items.length)]!;
  }

  /**
   * Weighted pick. Items with weight <= 0 are never chosen. Returns undefined when nothing
   * has positive weight.
   */
  public weighted<T>(items: readonly T[], weight: (item: T) => number): T | undefined {
    let total = 0;
    const weights = items.map((it) => {
      const w = Math.max(0, weight(it));
      total += w;
      return w;
    });
    if (total <= 0) {
      return undefined;
    }
    let roll = this.next() * total;
    for (let i = 0; i < items.length; i++) {
      roll -= weights[i]!;
      if (roll < 0) {
        return items[i];
      }
    }
    return items[items.length - 1];
  }

  /** Independent child stream, stable for a given (parent seed, label). */
  public fork(label: string): Rng {
    return new Rng(hashString(label) ^ this.int(0, 0x7fffffff));
  }

  public snapshot(): number {
    return this.state;
  }

  public restore(state: number): void {
    this.state = state >>> 0;
  }
}

/** FNV-1a 32-bit. Stable across platforms; used for labels and seed strings. */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Accepts "1234" or any word ("tuesday") so players can share seeds. */
export function parseSeed(input: string | number | null | undefined, fallback: number): number {
  if (typeof input === 'number' && Number.isFinite(input)) {
    return input >>> 0;
  }
  if (typeof input !== 'string' || input.trim() === '') {
    return fallback >>> 0;
  }
  const trimmed = input.trim();
  return /^\d+$/.test(trimmed) ? Number(trimmed) >>> 0 : hashString(trimmed.toLowerCase());
}
