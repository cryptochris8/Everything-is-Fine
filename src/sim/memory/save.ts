/**
 * Persistent neighbourhood memory: what Pleasant Pines remembers between days.
 *
 * Versioned and validated. Anything unreadable falls back to a fresh save rather than
 * crashing (a corrupted save must never stop someone playing). Storage is behind an
 * interface: the game uses browser localStorage when the play host allows it (UNVERIFIED on
 * the published Sandbox page — see PLATFORM_FINDINGS.md) and an in-memory store otherwise.
 */
import type { Difficulty } from '../comedy/types.js';
import type { FactValue } from '../core/ledger.js';
import { parseDifficulty } from '../gameplay/difficulty.js';

export const SAVE_VERSION = 1;
export const CONTENT_VERSION = '0.1.0';

export interface SavedHeadline {
  day: number;
  seed: number;
  headline: string;
  outcome: string;
}

export interface SavedNote {
  id: string;
  text: string;
  day: number;
}

export interface SaveData {
  version: number;
  contentVersion: string;
  day: number;
  memory: Record<string, FactValue>;
  affinity: Record<string, number>;
  hoaRules: SavedNote[];
  awards: SavedNote[];
  headlines: SavedHeadline[];
  difficulty: Difficulty;
  settings: { captions: boolean; reducedMotion: boolean; volume: number; captionScale: number };
  stats: { daysPlayed: number; problemsSolved: number; problemsCreated: number; bestChaos: number };
}

export function freshSave(): SaveData {
  return {
    version: SAVE_VERSION,
    contentVersion: CONTENT_VERSION,
    day: 1,
    memory: {},
    affinity: {},
    hoaRules: [],
    awards: [],
    headlines: [],
    difficulty: 'normal',
    settings: { captions: true, reducedMotion: false, volume: 0.8, captionScale: 1 },
    stats: { daysPlayed: 0, problemsSolved: 0, problemsCreated: 0, bestChaos: 0 },
  };
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

function cleanFacts(v: unknown): Record<string, FactValue> {
  const out: Record<string, FactValue> = {};
  if (!isRecord(v)) {
    return out;
  }
  for (const [k, val] of Object.entries(v)) {
    if (typeof val === 'boolean' || typeof val === 'string' || (typeof val === 'number' && Number.isFinite(val))) {
      out[k] = val;
    }
  }
  return out;
}

function cleanNotes(v: unknown): SavedNote[] {
  if (!Array.isArray(v)) {
    return [];
  }
  return v
    .filter((n): n is Record<string, unknown> => isRecord(n) && typeof n.id === 'string' && typeof n.text === 'string')
    .map((n) => ({ id: String(n.id), text: String(n.text).slice(0, 200), day: Number(n.day) || 1 }));
}

/** Parse untrusted JSON text into a valid save. Never throws. */
export function parseSave(text: string | null | undefined): SaveData {
  if (!text) {
    return freshSave();
  }
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return freshSave();
  }
  if (!isRecord(raw)) {
    return freshSave();
  }
  const base = freshSave();
  const version = Number(raw.version);
  if (!Number.isFinite(version) || version > SAVE_VERSION) {
    // From the future (or garbage): don't guess, start fresh.
    return base;
  }
  const settings = isRecord(raw.settings) ? raw.settings : {};
  const stats = isRecord(raw.stats) ? raw.stats : {};
  const affinity: Record<string, number> = {};
  for (const [k, v] of Object.entries(cleanFacts(raw.affinity))) {
    if (typeof v === 'number') {
      affinity[k] = Math.max(-10, Math.min(10, v));
    }
  }
  return {
    version: SAVE_VERSION,
    contentVersion: CONTENT_VERSION,
    day: Math.max(1, Math.floor(Number(raw.day) || 1)),
    memory: cleanFacts(raw.memory),
    affinity,
    hoaRules: cleanNotes(raw.hoaRules),
    awards: cleanNotes(raw.awards),
    headlines: Array.isArray(raw.headlines)
      ? raw.headlines
          .filter((h): h is Record<string, unknown> => isRecord(h) && typeof h.headline === 'string')
          .slice(-30)
          .map((h) => ({ day: Number(h.day) || 1, seed: Number(h.seed) >>> 0, headline: String(h.headline).slice(0, 200), outcome: String(h.outcome ?? '') }))
      : [],
    difficulty: parseDifficulty(raw.difficulty) ?? base.difficulty,
    settings: {
      captions: settings.captions !== false,
      reducedMotion: settings.reducedMotion === true,
      volume: Math.max(0, Math.min(1, Number(settings.volume ?? base.settings.volume))),
      captionScale: Math.max(0.8, Math.min(1.6, Number(settings.captionScale ?? 1))),
    },
    stats: {
      daysPlayed: Math.max(0, Number(stats.daysPlayed) || 0),
      problemsSolved: Math.max(0, Number(stats.problemsSolved) || 0),
      problemsCreated: Math.max(0, Number(stats.problemsCreated) || 0),
      bestChaos: Math.max(0, Math.min(100, Number(stats.bestChaos) || 0)),
    },
  };
}

export function serializeSave(save: SaveData): string {
  return JSON.stringify(save);
}

export interface SaveStore {
  load(): string | null;
  store(text: string): void;
  clear(): void;
}

export class MemoryStore implements SaveStore {
  private text: string | null = null;
  public load(): string | null {
    return this.text;
  }
  public store(text: string): void {
    this.text = text;
  }
  public clear(): void {
    this.text = null;
  }
}

/** localStorage when reachable; silently degrades to memory (private mode, blocked storage, iframes). */
export class BrowserStore implements SaveStore {
  private readonly fallback = new MemoryStore();
  public constructor(private readonly key = 'everything-is-fine.save.v1') {}

  public load(): string | null {
    try {
      return globalThis.localStorage?.getItem(this.key) ?? this.fallback.load();
    } catch {
      return this.fallback.load();
    }
  }

  public store(text: string): void {
    this.fallback.store(text);
    try {
      globalThis.localStorage?.setItem(this.key, text);
    } catch {
      // Storage blocked: the in-memory copy keeps this session's memory alive.
    }
  }

  public clear(): void {
    this.fallback.clear();
    try {
      globalThis.localStorage?.removeItem(this.key);
    } catch {
      // ignore
    }
  }

  /** True when a write/read round-trip through localStorage actually works here. */
  public static available(): boolean {
    try {
      const k = '__eif_probe__';
      globalThis.localStorage?.setItem(k, '1');
      const ok = globalThis.localStorage?.getItem(k) === '1';
      globalThis.localStorage?.removeItem(k);
      return ok;
    } catch {
      return false;
    }
  }
}
