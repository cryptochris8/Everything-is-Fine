/**
 * Difficulty (Settings → Difficulty): one table for every knob that makes a day in Pleasant
 * Pines kinder or wilder. Persisted with the save; default NORMAL. Separate from the
 * accessibility options (captions, reduced motion), which never change the challenge.
 *
 * `window` scales reaction windows (spotting Brisket before he strikes, the sprinkler timer,
 * catching flying burgers); `dogSpeed` scales how fast the thief runs; `catchRadius` is how
 * forgiving the burger-catch circle is; `chaosGain` scales how quickly the neighbourhood
 * escalates.
 */
import type { Difficulty } from '../comedy/types.js';

export interface DifficultyTuning {
  label: string;
  blurb: string;
  window: number;
  dogSpeed: number;
  catchRadius: number;
  chaosGain: number;
}

export const DIFFICULTIES: readonly Difficulty[] = ['easy', 'normal', 'hard'];

export const DIFFICULTY: Readonly<Record<Difficulty, DifficultyTuning>> = Object.freeze({
  easy: { label: 'EASY', blurb: 'Brisket is a little slower. The burgers fly a little kinder.', window: 1.45, dogSpeed: 0.8, catchRadius: 3.2, chaosGain: 0.8 },
  normal: { label: 'NORMAL', blurb: 'Pleasant Pines as the HOA intended.', window: 1, dogSpeed: 0.92, catchRadius: 2.4, chaosGain: 1 },
  hard: { label: 'HARD', blurb: 'Brisket has been training. So has the Flip-O-Matic.', window: 0.72, dogSpeed: 1.05, catchRadius: 1.7, chaosGain: 1.25 },
});

export function tuning(d: Difficulty | undefined): DifficultyTuning {
  return DIFFICULTY[d ?? 'normal'] ?? DIFFICULTY.normal;
}

export function parseDifficulty(v: unknown): Difficulty | null {
  return v === 'easy' || v === 'normal' || v === 'hard' ? v : null;
}

export function nextDifficulty(d: Difficulty): Difficulty {
  const i = DIFFICULTIES.indexOf(d);
  return DIFFICULTIES[(i + 1) % DIFFICULTIES.length]!;
}
