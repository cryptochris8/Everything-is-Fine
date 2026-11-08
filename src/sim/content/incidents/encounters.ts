/**
 * Spontaneous free-roam encounters (blueprint 05: YARD-01, YARD-02, FAIR-01). The Director
 * starts these on its own when the street is calm enough, near the player when possible.
 * Each has a player fix AND a funny "let it happen" payoff that leaves a mark on the
 * neighbourhood (a new HOA rule, a lawn arrow, chickens in VIP seating).
 */
import type { IncidentDef } from '../../comedy/types.js';

export const MOWER_RUNAWAY: IncidentDef = {
  id: 'MOWER_RUNAWAY',
  title: 'Mow-Bot Has Ambitions',
  kind: 'major',
  tags: ['earl', 'gadget', 'yard', 'big'],
  weight: 1.2,
  cooldown: 400,
  once: true,
  cast: { bot: 'mower', inventor: 'earl' },
  near: { target: { spot: 'earlLawn' }, r: 34 },
  compatibleNext: ['linda', 'paperwork'],
  maxDuration: 70,
  fallback: 'arrow',
  start: 'start',
  stages: {
    start: {
      beat: 'setup',
      do: [
        { say: 'inventor', line: 'Mow-Bot! Begin Pattern One: Tasteful Stripes.', dur: 2.6 },
        { emote: 'bot', icon: '!' },
        { sound: 'beep', at: { actor: 'bot' } },
        { route: 'bot', via: ['earlLawn', { x: 26, z: 14 }, { x: 22, z: 10 }], style: 'walk' },
      ],
      timeout: { sec: 3, to: 'rogue' },
    },
    rogue: {
      beat: 'complication',
      do: [
        { caption: 'The Mow-Bot has decided Pattern One is beneath it.', dur: 3 },
        { say: 'inventor', line: "Mow-Bot? Mow-Bot, that is NOT tasteful! Somebody hit its off switch! I'm scared of it!", dur: 3.4 },
        { route: 'bot', via: [{ x: 16, z: 13 }, { x: 4, z: 10 }, { x: -6, z: 15 }, { x: -18, z: 10 }, { x: -28, z: 13 }, { x: -24, z: 18 }, { x: -28, z: 13 }, { x: -24, z: 8 }], style: 'run' },
        { fact: 'mower_rogue' },
        { chaos: 12 },
        { bump: 'problems_created' },
        { objective: "Earl's Mow-Bot has gone rogue! Catch it and hit the off switch", target: { actor: 'bot' } },
      ],
      go: [
        { when: { used: 'bot' }, to: 'caught' },
        { when: { arrived: 'bot' }, to: 'arrow' },
      ],
      timeout: { sec: 45, to: 'arrow' },
    },
    caught: {
      beat: 'payoff',
      do: [
        { stop: 'bot' },
        { caption: 'You hit the off switch. The Mow-Bot sighs. Robots cannot sigh. It sighs.', dur: 3.4 },
        { say: 'inventor', line: 'Thank you! It was about to discover sculpture.', dur: 2.6 },
        { fact: 'mower_stopped' },
        { affinity: 'inventor', by: 1 },
        { bump: 'problems_solved' },
      ],
      timeout: { sec: 2, to: 'go_home' },
    },
    arrow: {
      beat: 'payoff',
      do: [
        { stop: 'bot' },
        { caption: "The Mow-Bot has mowed a giant arrow across three lawns. It points directly at Linda's house.", dur: 4 },
        {
          if: { available: 'linda' },
          then: [{ recruit: 'linda', as: 'linda' }, { say: 'linda', line: 'Is that... pointing at ME?', dur: 2.4 }],
        },
        { say: 'inventor', line: "I'm very proud and a little afraid.", dur: 2.4 },
        { hoaRule: 'mower_art', text: 'All lawn patterns require pre-approval. ESPECIALLY arrows.' },
        { memory: 'mower_art' },
        { fact: 'lawn_arrow' },
        { chaos: 8 },
      ],
      timeout: { sec: 3, to: 'go_home' },
    },
    go_home: {
      beat: 'aftermath',
      do: [{ move: 'bot', to: { spot: 'earlMailbox' }, offset: { x: 4, z: 5 }, style: 'walk' }],
      end: true,
      linger: 1,
    },
  },
};

export const GNOME_HEIST: IncidentDef = {
  id: 'GNOME_HEIST',
  title: 'The Sir Reginald Affair',
  kind: 'major',
  tags: ['dog', 'linda', 'chase', 'yard'],
  weight: 1,
  cooldown: 400,
  once: true,
  requires: { all: [{ propState: 'gnome', is: 'placed' }, { heldBy: 'gnome', by: 'nobody' }, { not: { incidentActive: 'DOG_STEALS_BURGERS' } }] },
  cast: { thief: 'dog', owner: 'linda' },
  props: { gnome: 'gnome' },
  near: { target: { spot: 'lindaGnome' }, r: 30 },
  compatibleNext: ['granny', 'paperwork'],
  maxDuration: 90,
  fallback: 'collection',
  start: 'sneak',
  stages: {
    sneak: {
      beat: 'setup',
      do: [
        { caption: "Brisket is tiptoeing toward Sir Reginald, Linda's prize garden gnome.", dur: 3 },
        { move: 'thief', to: { prop: 'gnome' }, style: 'walk' },
        { objective: 'Brisket is sneaking up on Sir Reginald the gnome!', target: { prop: 'gnome' } },
      ],
      go: [
        { when: { heldBy: 'gnome', by: 'player' }, to: 'protect' },
        { when: { actorNear: 'thief', target: { prop: 'gnome' }, r: 1 }, to: 'grab' },
      ],
      timeout: { sec: 22, to: 'grab' },
    },
    protect: {
      beat: 'payoff',
      do: [
        { emote: 'thief', icon: '?' },
        { say: 'owner', line: 'You... protected Sir Reginald? I have never been so moved by a stranger.', dur: 3.2 },
        { affinity: 'owner', by: 1.5 },
        { fact: 'gnome_protected' },
        { bump: 'problems_solved' },
        { objective: "Put Sir Reginald back in Linda's garden", target: { spot: 'lindaGnome' } },
      ],
      end: true,
      linger: 2,
    },
    grab: {
      beat: 'complication',
      do: [
        { give: 'gnome', to: 'thief' },
        { setProp: 'gnome', state: 'taken' },
        { say: 'owner', line: 'SIR REGINALD!', dur: 1.8 },
        { route: 'thief', via: ['hoaBoard', 'streetMid', 'movingBoxes', 'toddLanding', 'randyLawnEast', 'dogHouse'], style: 'run', pauses: 1 },
        { fact: 'gnome_stolen' },
        { chaos: 8 },
        { bump: 'problems_created' },
        { objective: 'Rescue Sir Reginald! Catch Brisket or throw the squeaky toy (F)', target: { actor: 'thief' } },
      ],
      go: [
        { when: { heldBy: 'gnome', by: 'nobody' }, to: 'dropped' },
        { when: { arrived: 'thief' }, to: 'collection' },
      ],
      timeout: { sec: 45, to: 'collection' },
    },
    dropped: {
      beat: 'payoff',
      do: [{ objective: "Return Sir Reginald to Linda's garden", target: { spot: 'lindaGnome' } }, { fact: 'gnome_rescued' }],
      go: [{ when: { all: [{ propNear: 'gnome', target: { spot: 'lindaGnome' }, r: 2.4 }, { heldBy: 'gnome', by: 'nobody' }] }, to: 'thanks' }],
      timeout: { sec: 60, to: 'linda_retrieves' },
    },
    thanks: {
      beat: 'payoff',
      do: [
        { setProp: 'gnome', state: 'placed' },
        { say: 'owner', line: 'You returned Sir Reginald. I am issuing you a commendation. It is also a clipboard.', dur: 3.4 },
        { memory: 'linda.clipboard_saved' },
        { award: 'gnome_hero', text: "Linda's Commendation of Gnome Valor (laminated)." },
        { affinity: 'owner', by: 2 },
        { bump: 'problems_solved' },
      ],
      end: true,
      linger: 2,
    },
    linda_retrieves: {
      beat: 'aftermath',
      do: [
        { move: 'owner', to: { prop: 'gnome' }, style: 'walk' },
        { say: 'owner', line: "I'll retrieve him myself. As per usual.", dur: 2.4 },
      ],
      timeout: { sec: 12, to: 'reset_gnome' },
    },
    reset_gnome: {
      beat: 'aftermath',
      do: [{ place: 'gnome', at: { spot: 'lindaGnome' } }, { setProp: 'gnome', state: 'placed' }],
      end: true,
      linger: 0.5,
    },
    collection: {
      beat: 'payoff',
      do: [
        { stop: 'thief' },
        { give: 'gnome', to: 'nobody', at: { spot: 'dogHouse' } },
        { setProp: 'gnome', state: 'moved' },
        { caption: 'Brisket adds Sir Reginald to his collection. He has eleven gnomes. Nobody knows where he got them.', dur: 4 },
        { say: 'owner', line: 'Form a Gnome Watch. IMMEDIATELY.', dur: 2.4 },
        { hoaRule: 'gnome_watch', text: 'Gnome Watch is now in effect. Report all gnome movements to the HOA.' },
        { memory: 'gnome_collector' },
        { fact: 'dog_gnome_collector' },
        { chaos: 6 },
      ],
      end: true,
      linger: 2.5,
    },
  },
};

export const CHICKEN_BREAKOUT: IncidentDef = {
  id: 'CHICKEN_BREAKOUT',
  title: 'The Great Escape (Poultry Edition)',
  kind: 'major',
  tags: ['chickens', 'earl', 'chase', 'big'],
  weight: 1,
  cooldown: 400,
  once: true,
  chaos: { min: 10 },
  requires: { propState: 'gate', is: 'closed' },
  cast: { flock: 'chickens', owner: 'earl' },
  props: { gate: 'gate' },
  near: { target: { spot: 'earlLawn' }, r: 40 },
  compatibleNext: ['bbq', 'linda'],
  maxDuration: 80,
  fallback: 'vip',
  start: 'peck',
  stages: {
    peck: {
      beat: 'setup',
      do: [
        { caption: 'The chickens are working on the coop latch. Together. As a team.', dur: 3 },
        { sound: 'cluck', at: { spot: 'coopGate' } },
        { objective: "Earl's chickens are plotting something...", target: { spot: 'coopGate' } },
      ],
      timeout: { sec: 4, to: 'open' },
    },
    open: {
      beat: 'complication',
      do: [
        { setProp: 'gate', state: 'open' },
        { fx: 'feathers', at: { spot: 'coopGate' }, dur: 2 },
        { caption: 'The chickens are loose.', dur: 2 },
        { route: 'flock', via: ['coopGate', 'earlLawn', 'streetEarl', 'toddLawn', 'randyLawnEast', 'picnicTable'], style: 'run', pauses: 0.6 },
        { say: 'owner', line: "They've learned to work the latch! Science has gone too far! Shoo 'em home!", dur: 3.2 },
        { fact: 'chickens_loose' },
        { memory: 'chickens_freed' },
        { chaos: 10 },
        { bump: 'problems_created' },
        { objective: 'The chickens escaped! Catch up and shoo them home', target: { actor: 'flock' } },
      ],
      go: [
        { when: { used: 'flock' }, to: 'shooed' },
        { when: { arrived: 'flock' }, to: 'vip' },
      ],
      timeout: { sec: 50, to: 'vip' },
    },
    shooed: {
      beat: 'payoff',
      do: [
        { route: 'flock', via: ['streetEarl', 'earlLawn', 'coopGate', 'coop'], style: 'run' },
        { caption: 'You shoo the chickens. They file back home, muttering.', dur: 3 },
        { say: 'owner', line: 'You have a gift. A weird gift. But a gift.', dur: 2.4 },
        { fact: 'chickens_shooed' },
        { affinity: 'owner', by: 1 },
        { bump: 'problems_solved' },
      ],
      go: [{ when: { arrived: 'flock' }, to: 'latch' }],
      timeout: { sec: 25, to: 'latch' },
    },
    latch: {
      beat: 'aftermath',
      do: [{ setProp: 'gate', state: 'closed' }],
      end: true,
      linger: 0.5,
    },
    vip: {
      beat: 'payoff',
      do: [
        { stop: 'flock' },
        { anim: 'flock', play: 'sit' },
        { caption: "The chickens have occupied the VIP seating at Randy's picnic table.", dur: 3.4 },
        { if: { available: 'randy' }, then: [{ say: 'randy', line: "Well. They RSVP'd.", dur: 2 }], else: [{ caption: '"Well. They RSVP\'d." — Randy, from somewhere', dur: 2.4 }] },
        { hoaRule: 'chicken_seating', text: 'Poultry may not occupy VIP seating.' },
        { fact: 'chickens_vip' },
        { chaos: 6 },
      ],
      end: true,
      linger: 2.5,
    },
  },
};

export const ENCOUNTERS: readonly IncidentDef[] = [MOWER_RUNAWAY, GNOME_HEIST, CHICKEN_BREAKOUT];
