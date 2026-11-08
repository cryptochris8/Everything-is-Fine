/**
 * Ambient micro-gags (blueprint 05): 1–5 second bits of neighbourhood life that happen
 * whether or not you are doing anything. Never more than two at once, never a wall of noise.
 */
import type { IncidentDef } from '../../comedy/types.js';

const near = (spot: 'trampoline' | 'cartPark' | 'earlMailbox' | 'hoaBoard' | 'playerLawn' | 'dogHouse' | 'grill', r = 26) =>
  ({ target: { spot }, r }) as const;

export const TODD_COMMUTE: IncidentDef = {
  id: 'TODD_COMMUTE',
  title: 'Todd commutes',
  kind: 'ambient',
  tags: ['todd', 'airborne'],
  weight: 1.2,
  cooldown: 35,
  requires: { actorNear: 'todd', target: { spot: 'trampoline' }, r: 2.5 },
  cast: { flyer: 'todd' },
  near: near('trampoline', 30),
  maxDuration: 8,
  fallback: 'done',
  start: 'up',
  stages: {
    up: {
      beat: 'setup',
      do: [
        { sound: 'boing', at: { spot: 'trampoline' } },
        { oneOf: [[{ hop: 'flyer', to: { spot: 'trampoline' }, height: 9, dur: 2 }], [{ hop: 'flyer', to: { spot: 'trampoline' }, height: 13, dur: 2.4 }, { fact: 'todd_big_bounce' }]] },
      ],
      timeout: { sec: 2.5, to: 'down' },
    },
    down: {
      beat: 'payoff',
      do: [
        { if: { playerNear: { spot: 'trampoline' }, r: 14 }, then: [{ say: 'flyer', line: ['Morning!', 'Great day for it!', 'You should try it! Gets you above your problems!', "Can't talk! Momentum!"], dur: 2 }] },
      ],
      end: true,
      linger: 0.5,
    },
    done: { beat: 'aftermath', end: true, linger: 0 },
  },
};

export const GRANNY_SQUIRREL: IncidentDef = {
  id: 'GRANNY_SQUIRREL',
  title: 'Granny vs. the squirrel',
  kind: 'ambient',
  tags: ['granny'],
  weight: 1,
  cooldown: 90,
  requires: { propState: 'cart', is: 'parked' },
  cast: { sheriff: 'granny' },
  near: near('cartPark'),
  maxDuration: 8,
  fallback: 'done',
  start: 'honk',
  stages: {
    honk: {
      beat: 'setup',
      do: [{ face: 'sheriff', target: { spot: 'squirrel' } }, { sound: 'horn', at: { spot: 'cartPark' } }],
      timeout: { sec: 0.6, to: 'honk2' },
    },
    honk2: {
      beat: 'payoff',
      do: [
        { sound: 'horn', at: { spot: 'cartPark' } },
        { caption: 'Granny honks twice at a squirrel. The squirrel does not move. This is a standoff.', dur: 3.2 },
        { say: 'sheriff', line: ['Move along, Kevin.', "I know what you did, Kevin.", "This street ain't big enough for the two of us, Kevin."], dur: 2.4 },
      ],
      end: true,
      linger: 2,
    },
    done: { beat: 'aftermath', end: true, linger: 0 },
  },
};

export const EARL_MAILBOX: IncidentDef = {
  id: 'EARL_MAILBOX',
  title: "Earl's self-opening mailbox",
  kind: 'ambient',
  tags: ['earl', 'gadget'],
  weight: 1,
  cooldown: 80,
  cast: { inventor: 'earl' },
  props: { box: 'mailbox' },
  near: near('earlMailbox'),
  maxDuration: 18,
  fallback: 'done',
  start: 'walk',
  stages: {
    walk: {
      beat: 'setup',
      do: [{ move: 'inventor', to: { spot: 'earlMailbox' }, offset: { x: 0.8, z: 1.2 }, style: 'walk' }],
      go: [{ when: { arrived: 'inventor' }, to: 'test' }],
      timeout: { sec: 12, to: 'done' },
    },
    test: {
      beat: 'complication',
      do: [{ face: 'inventor', target: { spot: 'earlMailbox' } }, { say: 'inventor', line: 'Self-opening mailbox, version nine. Behold!', dur: 2.2 }, { setProp: 'box', state: 'open' }],
      timeout: { sec: 1.2, to: 'snap' },
    },
    snap: {
      beat: 'payoff',
      do: [
        { setProp: 'box', state: 'closed' },
        { sound: 'clank', at: { spot: 'earlMailbox' } },
        { emote: 'inventor', icon: 'dizzy' },
        { anim: 'inventor', play: 'tumble', dur: 1 },
        { caption: 'It shuts. On Earl. Again.', dur: 2 },
        { say: 'inventor', line: ['Version ten, then.', 'It works! It just works... AT me.'], dur: 2 },
      ],
      end: true,
      linger: 1.5,
    },
    done: { beat: 'aftermath', end: true, linger: 0 },
  },
};

export const LINDA_RULER: IncidentDef = {
  id: 'LINDA_RULER',
  title: 'Linda measures your lawn',
  kind: 'ambient',
  tags: ['linda', 'paperwork'],
  weight: 1,
  cooldown: 120,
  cast: { inspector: 'linda' },
  near: near('playerLawn', 30),
  maxDuration: 24,
  fallback: 'done',
  start: 'walk',
  stages: {
    walk: {
      beat: 'setup',
      do: [{ move: 'inspector', to: { spot: 'playerLawn' }, style: 'walk' }],
      go: [{ when: { arrived: 'inspector' }, to: 'measure' }],
      timeout: { sec: 18, to: 'done' },
    },
    measure: {
      beat: 'payoff',
      do: [
        { anim: 'inspector', play: 'write', dur: 3 },
        { caption: 'Linda dramatically measures your grass with a tiny ruler.', dur: 2.6 },
        { say: 'inspector', line: ['Two point nine inches. Acceptable. For now.', 'Hmm. Your grass is growing with... confidence. I\'ll allow it.'], dur: 2.8 },
      ],
      end: true,
      linger: 2,
    },
    done: { beat: 'aftermath', end: true, linger: 0 },
  },
};

export const LINDA_SIGN: IncidentDef = {
  id: 'LINDA_SIGN',
  title: 'Linda fixes a sign during a crisis',
  kind: 'ambient',
  tags: ['linda', 'paperwork'],
  weight: 2,
  cooldown: 90,
  requires: { not: { noMajor: true } },
  cast: { inspector: 'linda' },
  maxDuration: 18,
  fallback: 'done',
  start: 'walk',
  stages: {
    walk: {
      beat: 'setup',
      do: [{ move: 'inspector', to: { spot: 'hoaBoard' }, offset: { x: 0, z: -1.2 }, style: 'walk' }],
      go: [{ when: { arrived: 'inspector' }, to: 'fix' }],
      timeout: { sec: 12, to: 'done' },
    },
    fix: {
      beat: 'payoff',
      do: [
        { face: 'inspector', target: { spot: 'hoaBoard' } },
        { anim: 'inspector', play: 'point', dur: 3 },
        { say: 'inspector', line: ['Two degrees off level. While THIS is happening? Unacceptable.', 'Somebody has to keep standards up while the street falls apart.'], dur: 3 },
      ],
      end: true,
      linger: 2,
    },
    done: { beat: 'aftermath', end: true, linger: 0 },
  },
};

export const BRISKET_ZOOMIES: IncidentDef = {
  id: 'BRISKET_ZOOMIES',
  title: 'Brisket has the zoomies',
  kind: 'ambient',
  tags: ['dog'],
  weight: 0.9,
  cooldown: 100,
  requires: { not: { fact: 'dog_has_toy' } },
  cast: { dog: 'dog' },
  near: near('dogHouse', 24),
  maxDuration: 14,
  fallback: 'done',
  start: 'zoom',
  stages: {
    zoom: {
      beat: 'complication',
      do: [
        { emote: 'dog', icon: '!' },
        { route: 'dog', via: ['randyLawnWest', 'randyLawnEast', 'randyPorch', 'randyLawnWest', 'dogHouse'], style: 'sprint' },
        { caption: 'Brisket has the zoomies. Everyone waits respectfully.', dur: 3 },
      ],
      go: [{ when: { arrived: 'dog' }, to: 'flop' }],
      timeout: { sec: 12, to: 'flop' },
    },
    flop: {
      beat: 'payoff',
      do: [{ anim: 'dog', play: 'sit', dur: 3 }, { emote: 'dog', icon: 'zzz' }],
      end: true,
      linger: 1,
    },
    done: { beat: 'aftermath', end: true, linger: 0 },
  },
};

export const EARL_GARAGE_TOUR: IncidentDef = {
  id: 'EARL_GARAGE_TOUR',
  title: "Earl's garage welcome",
  kind: 'ambient',
  tags: ['earl'],
  weight: 3,
  cooldown: 999,
  once: true,
  requires: { playerNear: { spot: 'earlGarage' }, r: 7 },
  cast: { inventor: 'earl' },
  maxDuration: 8,
  fallback: 'done',
  start: 'hi',
  stages: {
    hi: {
      beat: 'payoff',
      do: [
        { face: 'inventor', target: { player: true } },
        { emote: 'inventor', icon: '!' },
        { say: 'inventor', line: "Welcome to the workshop! Touch anything you like. Especially the Flip-O-Matic. Some of it's only a little bit on fire.", dur: 3.8 },
      ],
      end: true,
      linger: 2,
    },
    done: { beat: 'aftermath', end: true, linger: 0 },
  },
};

export const AMBIENT: readonly IncidentDef[] = [TODD_COMMUTE, GRANNY_SQUIRREL, EARL_MAILBOX, LINDA_RULER, LINDA_SIGN, BRISKET_ZOOMIES, EARL_GARAGE_TOUR];
