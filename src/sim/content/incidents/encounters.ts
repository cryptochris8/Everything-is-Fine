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
        { objective: 'Rescue Sir Reginald! Catch Brisket or throw the squeaky toy at him', target: { actor: 'thief' } },
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

/**
 * Granny's cat rides the robot vacuum out of the house and down Maple Street. Three beats:
 * he sets sail, he starts cleaning, he finishes. Let it happen and the street ends up so
 * clean that Linda cannot find a single violation, which upsets her more than any mess.
 */
export const CAT_VACUUM: IncidentDef = {
  id: 'CAT_VACUUM',
  title: 'Admiral Biscuit Sets Sail',
  kind: 'major',
  tags: ['granny', 'cat', 'chase', 'street'],
  weight: 1.1,
  cooldown: 400,
  once: true,
  cast: { cat: 'cat', owner: 'granny' },
  near: { target: { spot: 'streetGranny' }, r: 40 },
  compatibleNext: ['linda', 'paperwork'],
  maxDuration: 85,
  fallback: 'spotless',
  start: 'set_sail',
  stages: {
    set_sail: {
      beat: 'setup',
      do: [
        { caption: "Admiral Biscuit, Granny's cat, has boarded the robot vacuum. The robot vacuum has left the house.", dur: 3.6 },
        { sound: 'vacuum', at: { actor: 'cat' } },
        { say: 'owner', line: ['Admiral! You bring that vessel back to port this instant!', 'ADMIRAL BISCUIT! That vacuum is NOT seaworthy!'], dur: 3 },
        { route: 'cat', via: ['streetGranny', 'streetMid', { x: 14, z: -2 }, { x: -12, z: 2 }, 'lindaHedges'], style: 'walk' },
        { fact: 'cat_at_sea' },
        { chaos: 6 },
        { bump: 'problems_created' },
        { objective: 'Admiral Biscuit is cruising down Maple Street on a robot vacuum! Catch him', target: { actor: 'cat' } },
      ],
      go: [
        { when: { used: 'cat' }, to: 'rescued' },
        { when: { elapsed: 14 }, to: 'cleaning' },
      ],
      timeout: { sec: 16, to: 'cleaning' },
    },
    cleaning: {
      beat: 'escalation',
      do: [
        { caption: 'The vacuum has started cleaning Maple Street. Thoroughly. Admiral Biscuit salutes no one.', dur: 3.4 },
        { fx: 'dust', at: { actor: 'cat' }, dur: 1.5 },
        { sound: 'vacuum', at: { actor: 'cat' } },
        { if: { available: 'linda' }, then: [{ recruit: 'linda', as: 'linda' }, { say: 'linda', line: 'Is that an unpermitted street-cleaning vehicle?', dur: 2.6 }] },
      ],
      go: [
        { when: { used: 'cat' }, to: 'rescued' },
        { when: { arrived: 'cat' }, to: 'spotless' },
      ],
      timeout: { sec: 55, to: 'spotless' },
    },
    rescued: {
      beat: 'payoff',
      do: [
        { stop: 'cat' },
        { sound: 'meow', at: { actor: 'cat' } },
        { emote: 'cat', icon: 'heart' },
        { caption: 'You scoop Admiral Biscuit off the vacuum. He allows it. This time.', dur: 3 },
        { say: 'owner', line: "Thank you, Deputy! He's been on shore leave far too long.", dur: 2.8 },
        { fact: 'cat_rescued' },
        { affinity: 'owner', by: 1 },
        { bump: 'problems_solved' },
      ],
      timeout: { sec: 2.5, to: 'go_home' },
    },
    spotless: {
      beat: 'payoff',
      do: [
        { stop: 'cat' },
        { fx: 'sparkle', at: { actor: 'cat' }, dur: 2.5 },
        { caption: 'Admiral Biscuit has vacuumed the entire length of Maple Street. It is the cleanest street in the county.', dur: 4 },
        {
          if: { available: 'linda' },
          then: [{ recruit: 'linda', as: 'linda' }, { say: 'linda', line: 'Eleven years I have walked this street with a clipboard. There is NOTHING to cite. I hate this.', dur: 3.6 }],
          else: [{ caption: '"There is nothing to cite. I hate this." — Linda, from somewhere', dur: 2.6 }],
        },
        { hoaRule: 'cat_vehicles', text: 'Cats may not operate vehicles. Robot vacuums are vehicles.' },
        { memory: 'admiral_cleaned_street' },
        { fact: 'cat_cleaned_street' },
        { chaos: 6 },
      ],
      timeout: { sec: 3.5, to: 'go_home' },
    },
    go_home: {
      beat: 'aftermath',
      do: [{ move: 'cat', to: { spot: 'grannyPorch' }, offset: { x: 2.2, z: 1.6 }, style: 'walk' }],
      end: true,
      linger: 1,
    },
  },
};

/**
 * Granny baked the new neighbour a welcome cake. Earl "delivers" it with the Parcel Pitcher,
 * straight onto your roof. Fetch his ladder and lean it on your house to rescue it; take too
 * long and the squirrels Granny keeps warning everyone about finally make their move.
 */
export const CAKE_ON_ROOF: IncidentDef = {
  id: 'CAKE_ON_ROOF',
  title: 'Express Delivery',
  kind: 'major',
  tags: ['granny', 'earl', 'gadget', 'roof'],
  weight: 1.1,
  cooldown: 400,
  once: true,
  requires: { all: [{ propState: 'cake', is: 'boxed' }, { heldBy: 'cake', by: 'nobody' }, { propState: 'ladder', is: 'stored' }, { heldBy: 'ladder', by: 'nobody' }] },
  cast: { inventor: 'earl', baker: 'granny' },
  props: { cake: 'cake', ladder: 'ladder' },
  near: { target: { spot: 'playerPorch' }, r: 45 },
  compatibleNext: ['dog', 'linda'],
  maxDuration: 130,
  fallback: 'squirrels',
  start: 'handoff',
  stages: {
    handoff: {
      beat: 'setup',
      do: [
        { caption: 'Granny baked you a welcome cake. Earl has volunteered to deliver it.', dur: 3 },
        { give: 'cake', to: 'inventor' },
        { say: 'inventor', line: 'Granny says deliver it "by hand." Ha! By HAND. In this century?', dur: 3 },
        { sound: 'beep', at: { actor: 'inventor' } },
        { objective: "Earl is delivering Granny's welcome cake to you. Somehow.", target: { prop: 'cake' } },
      ],
      timeout: { sec: 3.4, to: 'fling' },
    },
    fling: {
      beat: 'complication',
      do: [
        { say: 'inventor', line: 'Parcel Pitcher, ENGAGE!', dur: 2 },
        { sound: 'thwump', at: { actor: 'inventor' } },
        { setProp: 'cake', state: 'airborne' },
        { launch: 'cake', to: { spot: 'playerRoof' }, height: 16, dur: 4.5, landY: 3.95 },
        { caption: 'THWUMP. The cake is airborne.', dur: 2.4 },
      ],
      timeout: { sec: 4.7, to: 'landed' },
    },
    landed: {
      beat: 'complication',
      do: [
        { setProp: 'cake', state: 'roof' },
        { sound: 'splat', at: { prop: 'cake' } },
        { fx: 'dust', at: { prop: 'cake' }, dur: 1.2 },
        { caption: 'Your welcome cake has been delivered. To your roof.', dur: 3 },
        { say: 'baker', line: 'EARL! That cake had THREE kinds of frosting!', dur: 2.6 },
        { say: 'inventor', line: "Technically delivered! The ladder's in my garage. You'll want to hurry. Squirrels.", dur: 3.4 },
        { fact: 'cake_on_roof' },
        { chaos: 8 },
        { bump: 'problems_created' },
      ],
      timeout: { sec: 1, to: 'fetch' },
    },
    fetch: {
      beat: 'complication',
      do: [{ objective: "Your cake is on the roof! Grab Earl's ladder from his garage", target: { prop: 'ladder' } }],
      go: [
        { when: { heldBy: 'ladder', by: 'player' }, to: 'carry' },
        { when: { elapsed: 30 }, to: 'scout' },
      ],
      timeout: { sec: 32, to: 'scout' },
    },
    scout: {
      beat: 'escalation',
      do: [
        { setProp: 'cake', state: 'scouted' },
        { caption: 'A squirrel has appeared on your roof. It is looking at the cake. It is looking at you.', dur: 3.4 },
        { say: 'baker', line: 'Scout squirrel! The rest are coming! Move, Deputy!', dur: 2.6 },
        { objective: "Squirrels are circling your cake! Get Earl's ladder from his garage", target: { prop: 'ladder' } },
      ],
      go: [{ when: { heldBy: 'ladder', by: 'player' }, to: 'carry' }],
      timeout: { sec: 35, to: 'squirrels' },
    },
    carry: {
      beat: 'complication',
      do: [{ objective: 'Lean the ladder against the front of your house', target: { spot: 'playerLadder' } }],
      go: [
        { when: { propState: 'ladder', is: 'leaning' }, to: 'climb' },
        { when: { heldBy: 'ladder', by: 'nobody' }, to: 'fetch_again' },
      ],
      timeout: { sec: 50, to: 'squirrels' },
    },
    fetch_again: {
      beat: 'complication',
      do: [{ objective: 'Pick the ladder back up and lean it on your house', target: { prop: 'ladder' } }],
      go: [{ when: { heldBy: 'ladder', by: 'player' }, to: 'carry' }],
      timeout: { sec: 30, to: 'squirrels' },
    },
    climb: {
      beat: 'payoff',
      do: [
        { give: 'cake', to: 'player' },
        { setProp: 'cake', state: 'rescued' },
        { sound: 'catch' },
        { fx: 'stars', at: { player: true }, dur: 1.5 },
        { caption: 'You climb up and rescue the cake. It is only slightly roof-flavored.', dur: 3 },
        { say: 'baker', line: 'Welcome to the neighborhood, sweetie! Just pick out the gravel.', dur: 3 },
        { say: 'inventor', line: 'Delivery confirmed! Five stars! I am rating myself.', dur: 2.6 },
        { fact: 'cake_rescued' },
        { memory: 'granny.cake_saved' },
        { affinity: 'baker', by: 1.5 },
        { affinity: 'inventor', by: 0.5 },
        { bump: 'problems_solved' },
        { objective: null },
      ],
      end: true,
      linger: 2,
    },
    squirrels: {
      beat: 'payoff',
      do: [
        { setProp: 'cake', state: 'squirreled' },
        { sound: 'chitter', at: { prop: 'cake' } },
        { fx: 'leaves', at: { prop: 'cake' }, dur: 2 },
        { caption: 'A squad of squirrels has seized the cake. They are eating it in shifts.', dur: 3.6 },
        { say: 'baker', line: 'I TOLD you the squirrels were organizing!', dur: 2.6 },
        { hoaRule: 'baked_goods_airspace', text: 'Baked goods may not be launched across property lines.' },
        { memory: 'squirrels_have_cake' },
        { fact: 'squirrels_got_cake' },
        { chaos: 6 },
      ],
      end: true,
      linger: 2.5,
    },
  },
};

/**
 * Linda's annual compliance forms meet a gust of wind. The wind carries them across the
 * street in three hops (catch them on the ground between gusts); the fourth drops them in
 * Earl's chicken coop, where the chickens sign every page and are now, legally, the HOA.
 */
export const HOA_FORMS_WIND: IncidentDef = {
  id: 'HOA_FORMS_WIND',
  title: 'Gone With the Wind (In Triplicate)',
  kind: 'major',
  tags: ['linda', 'paperwork', 'chase', 'wind'],
  weight: 1.1,
  cooldown: 400,
  once: true,
  requires: { all: [{ propState: 'forms', is: 'stacked' }, { heldBy: 'forms', by: 'nobody' }] },
  cast: { owner: 'linda' },
  props: { forms: 'forms' },
  near: { target: { spot: 'hoaBoard' }, r: 40 },
  compatibleNext: ['chickens', 'earl'],
  maxDuration: 110,
  fallback: 'coop',
  start: 'admire',
  stages: {
    admire: {
      beat: 'setup',
      do: [
        { move: 'owner', to: { prop: 'forms' }, offset: { x: -1, z: 0.6 }, style: 'walk' },
        { say: 'owner', line: 'The annual compliance forms. Four hundred pages. Alphabetized. Unstapled, so they can breathe.', dur: 3.6 },
        { objective: 'Linda is very proud of her HOA forms', target: { prop: 'forms' } },
      ],
      timeout: { sec: 4, to: 'gust1' },
    },
    gust1: {
      beat: 'complication',
      do: [
        { sound: 'wind', at: { prop: 'forms' } },
        { fx: 'leaves', at: { prop: 'forms' }, dur: 2 },
        { setProp: 'forms', state: 'blowing' },
        { launch: 'forms', to: { point: { x: -8, z: 2.5 } }, height: 5, dur: 2.4, landY: 0 },
        { caption: 'A gust of wind picks up. So do the forms.', dur: 2.6 },
        { say: 'owner', line: 'MY FORMS!', dur: 1.8 },
        { fact: 'forms_blown' },
        { chaos: 6 },
        { bump: 'problems_created' },
        { objective: "The wind has Linda's HOA forms! Grab them between gusts", target: { prop: 'forms' } },
      ],
      go: [{ when: { heldBy: 'forms', by: 'player' }, to: 'caught' }],
      timeout: { sec: 7, to: 'gust2' },
    },
    gust2: {
      beat: 'escalation',
      do: [
        { sound: 'wind', at: { prop: 'forms' } },
        { fx: 'leaves', at: { prop: 'forms' }, dur: 2 },
        { launch: 'forms', to: { point: { x: 12, z: 6.5 } }, height: 6, dur: 2.6, landY: 0 },
        { caption: 'Another gust. The forms are now touring the neighborhood.', dur: 2.6 },
        { say: 'owner', line: 'Page forty-one is a WAIVER!', dur: 2.2 },
      ],
      go: [{ when: { heldBy: 'forms', by: 'player' }, to: 'caught' }],
      timeout: { sec: 7, to: 'gust3' },
    },
    gust3: {
      beat: 'escalation',
      do: [
        { sound: 'wind', at: { prop: 'forms' } },
        { fx: 'leaves', at: { prop: 'forms' }, dur: 2 },
        { launch: 'forms', to: { point: { x: 30, z: 16 } }, height: 7, dur: 2.8, landY: 0 },
        { caption: 'The wind seems to have a destination in mind.', dur: 2.6 },
      ],
      go: [{ when: { heldBy: 'forms', by: 'player' }, to: 'caught' }],
      timeout: { sec: 7, to: 'last_gust' },
    },
    last_gust: {
      beat: 'escalation',
      do: [
        { sound: 'wind', at: { prop: 'forms' } },
        { launch: 'forms', to: { spot: 'coop' }, height: 8, dur: 2.8, landY: 0.3 },
        { caption: 'Oh no. Not the coop.', dur: 2.4 },
      ],
      timeout: { sec: 3, to: 'coop' },
    },
    caught: {
      beat: 'payoff',
      do: [
        { setProp: 'forms', state: 'rescued' },
        { sound: 'catch' },
        { fx: 'stars', at: { player: true }, dur: 1.5 },
        { caption: 'You snatch up the forms. Every page. Heroically.', dur: 2.6 },
        { say: 'owner', line: 'Every page! ...Page two-twelve has a footprint. I will allow it.', dur: 3 },
        { fact: 'forms_caught' },
        { affinity: 'owner', by: 1 },
        { bump: 'problems_solved' },
        { objective: 'Take the forms back to the HOA board', target: { spot: 'hoaBoard' } },
      ],
      go: [{ when: { propState: 'forms', is: 'filed' }, to: 'thanks' }],
      timeout: { sec: 45, to: 'linda_collects' },
    },
    thanks: {
      beat: 'payoff',
      do: [
        { say: 'owner', line: 'Filed. Officially. You saved the bylaws. I am putting you in the minutes.', dur: 3.2 },
        { memory: 'linda.forms_saved' },
        { award: 'paperwork_hero', text: "Linda's Certificate of Paperwork Recovery (in triplicate)." },
        { affinity: 'owner', by: 1.5 },
        { objective: null },
      ],
      end: true,
      linger: 2,
    },
    linda_collects: {
      beat: 'aftermath',
      do: [
        { move: 'owner', to: { prop: 'forms' }, style: 'walk' },
        { say: 'owner', line: "I'll collect them myself. Alphabetically.", dur: 2.4 },
      ],
      go: [{ when: { arrived: 'owner' }, to: 'file_them' }],
      timeout: { sec: 25, to: 'file_them' },
    },
    file_them: {
      beat: 'aftermath',
      do: [{ place: 'forms', at: { spot: 'hoaBoard' }, offset: { x: 1.4, z: -0.9 } }, { setProp: 'forms', state: 'filed' }],
      end: true,
      linger: 0.5,
    },
    coop: {
      beat: 'payoff',
      do: [
        { setProp: 'forms', state: 'signed' },
        { fx: 'feathers', at: { spot: 'coop' }, dur: 2 },
        { sound: 'cluck', at: { spot: 'coop' } },
        { caption: 'The forms have landed in the chicken coop. The chickens have signed every single page.', dur: 4 },
        { if: { available: 'chickens' }, then: [{ recruit: 'chickens', as: 'chickens' }, { emote: 'chickens', icon: 'star' }] },
        { say: 'owner', line: 'Legally... the chickens are now on the HOA board.', dur: 3 },
        { if: { available: 'earl' }, then: [{ recruit: 'earl', as: 'earl' }, { say: 'earl', line: "Honestly? They'll be great.", dur: 2.2 }] },
        { hoaRule: 'poultry_office', text: 'Poultry may not hold elected office. Effective immediately. Pending a vote.' },
        { memory: 'chickens_on_board' },
        { fact: 'chickens_signed_forms' },
        { chaos: 8 },
      ],
      end: true,
      linger: 3,
    },
  },
};

export const ENCOUNTERS: readonly IncidentDef[] = [MOWER_RUNAWAY, GNOME_HEIST, CHICKEN_BREAKOUT, CAT_VACUUM, CAKE_ON_ROOF, HOA_FORMS_WIND];
