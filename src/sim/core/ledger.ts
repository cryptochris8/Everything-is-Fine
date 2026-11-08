/**
 * The EventLedger: an append-only record of what ACTUALLY happened this round.
 *
 * Everything downstream that talks about the past (news recap, NPC callbacks, outcome
 * selection, HOA rules) reads facts from here, never from what a beat *intended*. If the
 * golf cart never crashed, no fact says it did, so no headline can claim it.
 */

export type FactValue = boolean | number | string;

export interface LedgerEntry {
  /** Monotonic sequence number within the round. */
  seq: number;
  /** Sim time in seconds. */
  t: number;
  key: string;
  value: FactValue;
  /** Incident / mission / system that recorded it. */
  source: string;
  actor?: string;
  prop?: string;
}

export class Ledger {
  private readonly entries: LedgerEntry[] = [];
  private readonly current = new Map<string, FactValue>();

  public record(
    t: number,
    key: string,
    value: FactValue,
    source: string,
    extra: { actor?: string; prop?: string } = {},
  ): LedgerEntry {
    const entry: LedgerEntry = Object.freeze({
      seq: this.entries.length,
      t: Math.round(t * 1000) / 1000,
      key,
      value,
      source,
      ...extra,
    }) as LedgerEntry;
    this.entries.push(entry);
    this.current.set(key, value);
    return entry;
  }

  /** Add `delta` to a numeric fact (missing counts as 0). */
  public bump(t: number, key: string, delta: number, source: string): number {
    const prev = this.current.get(key);
    const next = (typeof prev === 'number' ? prev : 0) + delta;
    this.record(t, key, next, source);
    return next;
  }

  public has(key: string): boolean {
    return this.current.has(key);
  }

  public get(key: string): FactValue | undefined {
    return this.current.get(key);
  }

  /** True when the fact exists and is truthy (non-zero number, non-empty string, true). */
  public truthy(key: string): boolean {
    const v = this.current.get(key);
    return v !== undefined && v !== false && v !== 0 && v !== '';
  }

  public num(key: string): number {
    const v = this.current.get(key);
    return typeof v === 'number' ? v : 0;
  }

  public all(): readonly LedgerEntry[] {
    return this.entries;
  }

  public facts(): ReadonlyMap<string, FactValue> {
    return this.current;
  }

  public size(): number {
    return this.entries.length;
  }

  /** Compact text trace for determinism tests and the debug timeline. */
  public trace(): string {
    return this.entries.map((e) => `${e.t.toFixed(2)} ${e.source} ${e.key}=${String(e.value)}`).join('\n');
  }
}
