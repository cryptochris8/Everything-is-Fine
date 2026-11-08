// What tools/build-audio.mjs generates: the theme song and music beds, the sound effects
// (ids match the sim's `sound:` actions and src/game/Sfx.ts), and the voice cast + lines.
// Voice lines come straight from the comedy content, so the audio always matches the text.
import { createHash } from 'node:crypto';

import { CAST } from '../src/sim/content/cast.ts';
import { INCIDENTS } from '../src/sim/content/index.ts';

// ---------------------------------------------------------------- music -----
export const MUSIC = {
  theme: {
    seconds: 62,
    prompt: [
      'Upbeat 1990s family sitcom theme song, cheerful suburban pop, bright ukulele, handclaps, whistling hook, bouncy bass, brushed drums, a little brass, 112 bpm, major key, warm and silly.',
      'Friendly mixed group vocals, sung clearly with comic timing. Lyrics:',
      'Verse: "New house on Maple, the lawns are so green / The grill is on fire but the driveway is clean / The dog took the burgers, the gnome is on the run / Granny took the golf cart and she is having fun!"',
      'Chorus: "Everything is fine! Everything is fine! / Smile and wave, it\'s a beautiful time / Good neighbors, bad decisions / Everything is fine!"',
      'End on a held, cheerful final "fiiine!" and one last ukulele strum.',
    ].join(' '),
  },
  street: {
    seconds: 90,
    prompt:
      'Light breezy instrumental underscore for a cartoon suburban comedy video game: pizzicato strings, ukulele, glockenspiel, soft brushed drums, a gentle whistled melody, 104 bpm, sunny and slightly mischievous, sits quietly under dialogue, steady energy with no big build or ending, seamless loop, instrumental, no vocals.',
  },
  chaos: {
    seconds: 45,
    prompt:
      'Frantic comedic block-party instrumental: honking brass section, slap bass, bongos, slide whistle accents, 132 bpm, joyful chaos, everything going wrong in the best way, cartoon chase energy, seamless loop, instrumental, no vocals.',
  },
};

// ------------------------------------------------------------------ sfx -----
export const SFX = {
  boing: { seconds: 0.8, prompt: 'cartoon trampoline boing, springy and comedic' },
  sproing: { seconds: 1.2, prompt: 'big comedic spring launch, sproing with a rising slide whistle' },
  horn: { seconds: 0.9, prompt: 'small golf cart horn, two short cheerful wheezy beeps' },
  squeak: { seconds: 0.5, prompt: 'single squeeze of a rubber dog chew toy squeak' },
  whoosh: { seconds: 0.6, prompt: 'quick comedic whoosh of an object thrown through the air' },
  spray: { seconds: 2, prompt: 'garden lawn sprinkler turning on, hissing and spraying water' },
  splash: { seconds: 1, prompt: 'comedic water splash, someone slipping into a puddle' },
  crash: { seconds: 1.5, prompt: 'golf cart crashing into a hedge, branches crunching and leaves rustling, comedic' },
  thud: { seconds: 0.6, prompt: 'soft cartoon bonk thud, comedic' },
  clank: { seconds: 0.8, prompt: 'clunky homemade metal gadget clanking and rattling, comedic contraption' },
  stamp: { seconds: 0.6, prompt: 'rubber stamp thumped firmly onto paper on a clipboard' },
  catch: { seconds: 0.8, prompt: 'cheerful cartoon catch, bright ascending chime with a soft pop' },
  fanfare: { seconds: 2, prompt: 'short triumphant comedy brass fanfare, sitcom style ta-da' },
  alarm: { seconds: 1.5, prompt: 'cartoon alarm, frantic wobbly siren, short and comedic' },
  sniff: { seconds: 1, prompt: 'small dog sniffing rapidly at the ground' },
  cluck: { seconds: 1.5, prompt: 'small flock of chickens clucking and squawking, agitated' },
  beep: { seconds: 0.6, prompt: 'cute little robot beeping twice' },
  tick: { seconds: 1.5, prompt: 'mechanical kitchen timer ticking quickly, tension' },
  chaos: { seconds: 1.2, prompt: 'comedic rising slide whistle with a cymbal swell, things getting out of hand' },
  award: { seconds: 1.5, prompt: 'achievement unlocked jingle, bright chimes and a happy flourish' },
  rule: { seconds: 1, prompt: 'bureaucratic desk bell ding ding followed by a rubber stamp' },
  news: { seconds: 4, prompt: '1990s local TV news broadcast intro sting, brass and timpani, upbeat and self-important' },
  vacuum: { seconds: 2, prompt: 'small robot vacuum cleaner humming and whirring as it drives along a hard floor' },
  meow: { seconds: 1, prompt: 'a single dignified house cat meow' },
  thwump: { seconds: 1, prompt: 'homemade catapult launching a heavy object, deep thwump and spring release' },
  splat: { seconds: 0.8, prompt: 'a cake landing on a roof, soft frosting splat with a little crunch' },
  chitter: { seconds: 1.5, prompt: 'several squirrels chittering excitedly' },
  wind: { seconds: 2, prompt: 'sudden gust of wind blowing a stack of papers, pages rustling and flapping' },
  ambience: { seconds: 20, loop: true, prompt: 'quiet sunny suburban neighborhood afternoon ambience, songbirds chirping, distant lawnmower, gentle breeze in trees, seamless loop' },
};

// ---------------------------------------------------------------- voice -----
// Library and stock voices only (no clones of real people).
export const VOICES = {
  randy: { id: 'Bj9UqZbhQsanLzgalpEG', name: "Austin Knox (good ol' Texas boy)", style: 0.55 },
  linda: { id: 'hpp4J3VqNfWAUOO0d1Us', name: 'Bella (professional, bright)', style: 0.4, stability: 0.5 },
  earl: { id: 'Rmv8zCb2IRE895dK1qWB', name: 'Dexter Glitch (nerdy, lovable)', style: 0.55 },
  granny: { id: '5u41aNhyCU6hXOcjPPv0', name: 'Carol (old American)', style: 0.6, stability: 0.35 },
  todd: { id: 'bIHbv24MWmeRgasZH58o', name: 'Will (relaxed optimist)', style: 0.35 },
  anchor: { id: 'nPczCjzI2devNBz1zQrb', name: 'Brian (deep, resonant)', style: 0.3, stability: 0.55 },
};

/** The news anchor's fixed lines (the recap screen plays these around the headline card). */
export const ANCHOR_LINES = [
  "Good evening. I'm Chet Mabry, and this is Pleasant Pines Local News.",
  'Our top story tonight...',
  "And that's the news. Everything is fine. Back to you.",
];

const ids = (s) => createHash('sha1').update(s).digest('hex').slice(0, 12);

function linesOf(l) {
  return typeof l === 'string' ? [l] : [...l];
}

/** Every `say` action anywhere in an action list (if/then/else, oneOf, nested). */
function collectSays(actions, out) {
  for (const a of actions ?? []) {
    if ('say' in a) out.push(a);
    if ('if' in a) {
      collectSays(a.then, out);
      collectSays(a.else, out);
    }
    if ('oneOf' in a) for (const alt of a.oneOf) collectSays(alt, out);
  }
}

function speakerFor(def, ref) {
  const cast = def.cast[ref];
  if (typeof cast === 'string') return cast;
  if (Array.isArray(cast)) return null; // a candidate list: the speaker isn't known ahead of time
  return ref; // a literal actor id (recruit 'linda' as 'linda')
}

/**
 * Every voiced line: { id, speaker, text }. Text is the exact on-screen string (the game
 * looks lines up by speaker + text). Lines with {name} tokens are skipped (filled at runtime).
 */
export function voiceLines() {
  const out = new Map();
  const add = (speaker, text) => {
    if (!VOICES[speaker] || text.includes('{')) return;
    const key = `${speaker}|${text}`;
    if (!out.has(key)) out.set(key, { id: `${speaker}_${ids(key)}`, speaker, text });
  };
  for (const def of INCIDENTS) {
    const says = [];
    for (const st of Object.values(def.stages)) {
      collectSays(st.do, says);
      for (const g of st.go ?? []) collectSays(g.do, says);
      collectSays(st.timeout?.do, says);
    }
    for (const s of says) {
      const who = speakerFor(def, s.say);
      if (who) for (const t of linesOf(s.line)) add(who, t);
    }
  }
  for (const a of CAST) {
    for (const g of a.talk) for (const t of linesOf(g.lines)) add(a.id, t);
    for (const r of a.routine) if (r.bark) for (const t of linesOf(r.bark)) add(a.id, t);
  }
  for (const t of ANCHOR_LINES) add('anchor', t);
  return [...out.values()];
}
