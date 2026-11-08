/**
 * Engine-free audio decisions (tested in tests/audio.test.ts): which music bed plays when,
 * how the beds crossfade and duck under dialogue, how voice lines are found and queued, and
 * how loud a sound is from across the street. GameAudio.ts does the engine side.
 */

export type MusicTrack = 'theme' | 'street' | 'chaos';
export type AudioPhase = 'title' | 'playing' | 'paused' | 'news';

/** Chaos at or above this swaps the street bed for the block-party track. */
export const CHAOS_MUSIC_AT = 70;

export const MUSIC_LEVEL: Readonly<Record<MusicTrack, number>> = { theme: 0.75, street: 0.42, chaos: 0.5 };
export const AMBIENCE_LEVEL = 0.35;
/** Music multiplier while someone is talking. */
export const DUCK = 0.45;
/** Music multiplier while paused. */
export const PAUSE_LEVEL = 0.35;
/** Each day opens like a sitcom episode: the theme song plays over the first this-many seconds. */
export const OPENING_THEME_SECONDS = 30;
/** The theme's level during the cold open (dialogue is happening over it). */
export const OPENING_LEVEL = 0.55;
/** Fade speed: full scale per second. */
export const FADE_RATE = 0.6;

/**
 * The bed that should be playing. The theme song bookends the day (title, the cold open of
 * each day, and the news); chaos or the block-party finale swaps the street bed out.
 */
export function musicFor(phase: AudioPhase, chaos: number, finale: boolean, opening = false): MusicTrack {
  if (phase === 'title' || phase === 'news') {
    return 'theme';
  }
  if (finale || chaos >= CHAOS_MUSIC_AT) {
    return 'chaos';
  }
  return opening ? 'theme' : 'street';
}

/** Target volume of every bed (and the ambience) this frame. */
export function mixTargets(phase: AudioPhase, chaos: number, finale: boolean, talking: boolean, opening = false): Record<MusicTrack | 'ambience', number> {
  const track = musicFor(phase, chaos, finale, opening);
  const duck = (talking ? DUCK : 1) * (phase === 'paused' ? PAUSE_LEVEL : 1);
  const out = { theme: 0, street: 0, chaos: 0, ambience: 0 };
  const level = track === 'theme' && (phase === 'playing' || phase === 'paused') ? OPENING_LEVEL : MUSIC_LEVEL[track];
  out[track] = level * duck;
  out.ambience = phase === 'playing' ? AMBIENCE_LEVEL : phase === 'paused' ? AMBIENCE_LEVEL * PAUSE_LEVEL : 0;
  return out;
}

/** Move `current` toward `target` at `rate` per second (linear fade, never overshoots). */
export function approach(current: number, target: number, rate: number, dt: number): number {
  const step = rate * dt;
  return Math.abs(target - current) <= step ? target : current + Math.sign(target - current) * step;
}

/** Gain for a sound `d` metres from the player: full nearby, never silent across the street. */
export function distanceGain(d: number | null): number {
  if (d === null) {
    return 1;
  }
  return Math.max(0.3, Math.min(1, 1.15 - d / 50));
}

export const voiceKey = (speaker: string, text: string): string => `${speaker}|${text}`;

/** speaker + exact on-screen text → file. */
export function voiceIndex(lines: readonly { speaker: string; text: string; file: string }[]): Map<string, string> {
  return new Map(lines.map((l) => [voiceKey(l.speaker, l.text), l.file]));
}

export interface QueuedLine {
  file: string;
  at: number;
}

/**
 * Dialogue plays one line at a time, in order. A line that has waited longer than `maxWait`
 * seconds is dropped (the bubble it belonged to is long gone), so the voices never fall
 * behind the conversation.
 */
export class VoiceQueue {
  private readonly items: QueuedLine[] = [];
  public constructor(private readonly maxWait = 4) {}
  public push(file: string, now: number): void {
    this.items.push({ file, at: now });
  }
  /** The next line to play, or null (skips stale lines). */
  public next(now: number): QueuedLine | null {
    while (this.items.length > 0) {
      const item = this.items.shift()!;
      if (now - item.at <= this.maxWait) {
        return item;
      }
    }
    return null;
  }
  public clear(): void {
    this.items.length = 0;
  }
  public get size(): number {
    return this.items.length;
  }
}

/** The news-card script: the sting, the anchor's lines and when the theme comes back in. */
export const NEWS_SCRIPT: readonly { at: number; anchor?: string; sfx?: string; music?: boolean }[] = [
  { at: 0, sfx: 'news' },
  { at: 1.3, anchor: "Good evening. I'm Chet Mabry, and this is Pleasant Pines Local News." },
  { at: 5.4, anchor: 'Our top story tonight...' },
  { at: 12, anchor: "And that's the news. Everything is fine. Back to you." },
  { at: 16, music: true },
];
