/**
 * BIG RANDY'S COOKOUT — the vertical-slice favour (blueprint 05, BBQ-01..03).
 *
 * The mission is a spine of everyday steps (meet Randy → fetch charcoal → bring burgers →
 * serve). At two points it asks the Director for a complication; WHICH one depends on world
 * state and history:
 *   - fetching:  Granny offers a golf-cart "shortcut", or Linda demands a permit, or nothing.
 *   - cooking:   Brisket steals the burgers (not if Randy guards food since last time),
 *                Earl's Flip-O-Matic misfires (only if you visited Earl's garage),
 *                the sprinkler timer goes off (not if Randy disconnected it), or the grill
 *                flares up (always-eligible fallback).
 * Every complication offers at least two responses and ends in a payoff that records facts;
 * the feast reads those facts to pick a truthful ending.
 */
import type { IncidentDef } from '../../comedy/types.js';

export const BBQ_MISSION: IncidentDef = {
  id: 'BBQ',
  title: "Big Randy's Cookout",
  kind: 'mission',
  tags: ['mission', 'bbq'],
  weight: 1,
  cooldown: 0,
  cast: { chef: 'randy', flyer: 'todd' },
  props: { fuel: 'charcoal', food: 'platter', grill: 'grill' },
  maxDuration: 900,
  fallback: 'feast',
  start: 'arrive',
  stages: {
    arrive: {
      beat: 'setup',
      do: [
        { anim: 'chef', play: 'grill' },
        { objective: 'Welcome to Pleasant Pines! Have a look around.' },
        {
          if: { runAtLeast: 2 },
          then: [{ caption: ['Another beautiful day in Pleasant Pines. The birds are singing. Linda is measuring them.', 'Good morning, Pleasant Pines! Everything is fine. For now.'], dur: 4 }],
          else: [{ caption: 'PLEASANT PINES — "The Friendliest Street in America" (self-reported)', dur: 4 }],
        },
      ],
      timeout: { sec: 3.5, to: 'todd_launch' },
    },
    todd_launch: {
      beat: 'setup',
      do: [{ hop: 'flyer', to: { spot: 'toddLanding' }, height: 10, dur: 2.3 }, { sound: 'boing', at: { spot: 'trampoline' } }],
      timeout: { sec: 2.4, to: 'todd_lands' },
    },
    todd_lands: {
      beat: 'setup',
      do: [
        { fx: 'dust', at: { actor: 'flyer' } },
        { sound: 'thud', at: { actor: 'flyer' } },
        { face: 'flyer', target: { player: true } },
        { say: 'flyer', line: ["Morning, neighbor! Don't mind me. Commuting.", 'Oh, hi! Welcome to the street! Great boxes!'], dur: 3.2 },
        { emote: 'flyer', icon: 'thumbsup' },
        { anim: 'chef', play: 'grill' },
      ],
      timeout: { sec: 3.4, to: 'nobody_reacts' },
    },
    nobody_reacts: {
      beat: 'setup',
      do: [
        { say: 'chef', line: 'Mornin\', Todd.', dur: 1.8 },
        { caption: '(Nobody reacts.)', dur: 2.2 },
        { move: 'flyer', to: { spot: 'trampoline' }, style: 'run' },
        { release: 'flyer' },
      ],
      timeout: { sec: 2.4, to: 'randy_calls' },
    },
    randy_calls: {
      beat: 'setup',
      do: [
        { say: 'chef', line: ['Hey! HEY! You must be the new neighbor!', 'New neighbor! Over here! Big Randy! The Big is for heart!'], dur: 3 },
        { emote: 'chef', icon: '!' },
        { follow: 'chef', target: { player: true }, style: 'run', keep: 2.4 },
        { objective: 'Meet Big Randy', target: { actor: 'chef' } },
      ],
      go: [
        { when: { any: [{ playerNear: { actor: 'chef' }, r: 3.4 }, { used: 'chef' }] }, to: 'offer' },
      ],
      timeout: { sec: 25, to: 'offer' },
    },
    offer: {
      beat: 'setup',
      do: [
        { stop: 'chef' },
        { face: 'chef', target: { player: true } },
        { anim: 'chef', play: 'wave', dur: 1.5 },
        {
          if: { runAtLeast: 2 },
          then: [{ say: 'chef', line: ["Neighbor! Cookout's back on! Same deal: I need charcoal. Earl's garage. Again.", "You're just in time! I've got a good feeling about today's cookout. I always do. That's my problem."], dur: 4.6 }],
          else: [{ say: 'chef', line: "Welcome! You mind helpin' me with one tiny thing? My cookout needs charcoal, and Earl borrowed my last bag. Four years ago.", dur: 5.2 }],
        },
        { choices: ['Sure, happy to help!', 'What could possibly go wrong?'], from: 'chef' },
        { objective: 'Answer Big Randy (pick a reply)' },
      ],
      go: [
        { when: { chose: 0 }, to: 'accept', do: [{ say: 'chef', line: 'Ha! I knew I liked you. Charcoal\'s in Earl\'s garage. End of the street. Can\'t miss it. People have tried.', dur: 4.6 }, { affinity: 'chef', by: 1 }] },
        { when: { chose: 1 }, to: 'accept', do: [{ say: 'chef', line: 'Ha! Nothing! Nothing has EVER gone wrong at one of my cookouts. That I remember. Charcoal\'s in Earl\'s garage.', dur: 4.8 }, { fact: 'player_jinxed_it' }, { chaos: 5 }] },
      ],
      timeout: { sec: 20, to: 'accept', do: [{ say: 'chef', line: "I'll take that thoughtful silence as a yes! Charcoal's in Earl's garage!", dur: 3.4 }] },
    },
    accept: {
      beat: 'setup',
      do: [
        { fact: 'bbq_accepted' },
        { move: 'chef', to: { spot: 'grill' }, offset: { x: 0.2, z: -1.6 }, style: 'walk' },
        { objective: "Get the charcoal from Uncle Earl's garage (end of the street)", target: { prop: 'fuel' } },
      ],
      timeout: { sec: 0.5, to: 'fetch' },
    },
    fetch: {
      beat: 'setup',
      go: [
        { when: { heldBy: 'fuel', by: 'player' }, to: 'fetch_hook' },
        { when: { fact: 'charcoal_delivered' }, to: 'light' },
      ],
      timeout: { sec: 240, to: 'randy_finds_charcoal' },
    },
    fetch_hook: {
      beat: 'setup',
      do: [
        { fact: 'player_visited_garage' },
        { objective: "Bring the charcoal to Randy's grill", target: { spot: 'grill' } },
        { if: { available: 'earl' }, then: [{ say: 'earl', line: ['Ah, the charcoal! Tell Randy I want my grill brush back.', 'Charcoal? Top shelf. Next to the fireworks. Those are NOT charcoal. Learned that one the hard way.'], dur: 3.8 }] },
        { request: ['GRANNY_CART_DELIVERY', 'LINDA_CHARCOAL_PERMIT', 'QUIET_WALK'], fallback: 'QUIET_WALK' },
      ],
      timeout: { sec: 0.3, to: 'fetch_wait' },
    },
    fetch_wait: {
      beat: 'setup',
      go: [
        { when: { fact: 'charcoal_delivered' }, to: 'light' },
      ],
      timeout: { sec: 240, to: 'randy_finds_charcoal' },
    },
    randy_finds_charcoal: {
      beat: 'setup',
      do: [
        { say: 'chef', line: 'Never mind! Found a bag in my truck! Been there since the Clinton administration. Still good. Probably.', dur: 4.6 },
        { place: 'fuel', at: { spot: 'grill' }, offset: { x: 1.1, z: 0.4 } },
        { setProp: 'fuel', state: 'delivered' },
        { fact: 'charcoal_delivered' },
        { fact: 'randy_found_charcoal' },
      ],
      timeout: { sec: 1, to: 'light' },
    },
    light: {
      beat: 'setup',
      do: [
        { face: 'chef', target: { spot: 'grill' } },
        { anim: 'chef', play: 'grill' },
        {
          if: { propState: 'grill', is: 'campstove' },
          then: [{ say: 'chef', line: 'The big grill\'s resting. This little camp stove\'s got heart, though. Watch it work.', dur: 3.8 }],
          else: [
            { setProp: 'grill', state: 'cooking' },
            { fx: 'smoke', at: { spot: 'grill' }, dur: 5 },
            { say: 'chef', line: ["Charcoal! You're a hero! Now watch a master at work. Now that's not smoke. That's flavor finding its way out.", 'Perfect! Now stand back. Further. Little further. Grilling is a contact sport.'], dur: 4.6 },
          ],
        },
        { affinity: 'chef', by: 0.5 },
        { bump: 'problems_solved' },
        { objective: "Bring the burger platter from Randy's porch to the grill", target: { prop: 'food' } },
      ],
      go: [
        { when: { fact: 'platter_at_grill' }, to: 'cook' },
        { when: { heldBy: 'food', by: 'player' }, to: 'carry_burgers' },
      ],
      timeout: { sec: 180, to: 'cook', do: [{ say: 'chef', line: "I'll grab the burgers myself! Exercise!", dur: 2.4 }, { place: 'food', at: { spot: 'grillTable' }, y: 0.9 }] },
    },
    carry_burgers: {
      beat: 'setup',
      do: [{ objective: 'Set the burgers on the table by the grill', target: { spot: 'grillTable' } }],
      go: [
        { when: { fact: 'platter_at_grill' }, to: 'cook' },
        { when: { all: [{ heldBy: 'food', by: 'nobody' }, { elapsed: 0.5 }] }, to: 'light_wait' },
      ],
      timeout: { sec: 180, to: 'cook', do: [{ place: 'food', at: { spot: 'grillTable' }, y: 0.9 }] },
    },
    light_wait: {
      beat: 'setup',
      do: [{ objective: 'Pick the burgers back up and bring them to the grill', target: { prop: 'food' } }],
      go: [
        { when: { fact: 'platter_at_grill' }, to: 'cook' },
        { when: { heldBy: 'food', by: 'player' }, to: 'carry_burgers' },
      ],
      timeout: { sec: 150, to: 'cook', do: [{ say: 'chef', line: "I'll grab those! Teamwork!", dur: 2 }, { place: 'food', at: { spot: 'grillTable' }, y: 0.9 }] },
    },
    cook: {
      beat: 'complication',
      do: [
        { setProp: 'food', state: 'grilled' },
        { fx: 'smoke', at: { spot: 'grill' }, dur: 4 },
        { say: 'chef', line: ['Six perfect patties. Smell that? That\'s confidence.', 'Burgers are like people. You gotta flip \'em at the right time. And then eat \'em. Okay, not like people.'], dur: 3.8 },
        { objective: 'Keep an eye on the burgers while Randy cooks', target: { prop: 'food' } },
        { request: ['DOG_STEALS_BURGERS', 'AUTO_FLIPPER', 'SPRINKLER_SURPRISE'], fallback: 'RANDY_FLARE_UP' },
      ],
      go: [{ when: { all: [{ elapsed: 2.5 }, { noMajor: true }] }, to: 'serve' }],
      timeout: { sec: 240, to: 'serve' },
    },
    serve: {
      beat: 'payoff',
      do: [
        {
          if: { propState: 'food', is: ['eaten'] },
          then: [{ say: 'chef', line: "No burgers? No problem! Everybody bring a side dish and we'll call it a potluck. Very modern.", dur: 4.4 }, { fact: 'burgers_lost' }],
          else: [
            { say: 'chef', line: ['Come and get it, Pleasant Pines! Bring the burgers to the picnic table, neighbor!', 'Soup\'s on! Burgers\' on! Somebody take those to the picnic table!'], dur: 3.6 },
            { objective: 'Serve the burgers at the picnic table', target: { spot: 'picnicTable' } },
          ],
        },
        { move: 'chef', to: { spot: 'picnicTable' }, offset: { x: 0, z: -1.6 }, style: 'walk' },
        { if: { available: 'linda' }, then: [{ recruit: 'linda', as: 'guest1' }, { move: 'guest1', to: { spot: 'picnicTable' }, offset: { x: -1.8, z: 0.3 }, style: 'walk' }] },
        { if: { available: 'earl' }, then: [{ recruit: 'earl', as: 'guest2' }, { move: 'guest2', to: { spot: 'picnicTable' }, offset: { x: 1.8, z: 0.3 }, style: 'walk' }] },
        { if: { available: 'granny' }, then: [{ recruit: 'granny', as: 'guest3' }, { move: 'guest3', to: { spot: 'picnicTable' }, offset: { x: 0, z: 1.8 }, style: 'walk' }] },
      ],
      go: [
        { when: { fact: 'burgers_lost' }, to: 'feast_wait' },
        { when: { propNear: 'food', target: { spot: 'picnicTable' }, r: 3 }, to: 'feast_wait' },
      ],
      timeout: { sec: 150, to: 'feast_wait', do: [{ say: 'chef', line: "I'll carry 'em! You've done plenty! Possibly too much!", dur: 2.8 }, { place: 'food', at: { spot: 'picnicTable' }, y: 0.8 }] },
    },
    feast_wait: {
      beat: 'payoff',
      do: [
        { objective: null },
        { place: 'food', at: { spot: 'picnicTable' }, y: 0.8 },
        {
          if: { all: [{ propState: 'valve', is: ['on', 'jammed'] }, { not: { fact: 'water_bbq' } }] },
          then: [
            { caption: "Nobody turned off the sprinkler. The cookout proceeds anyway. Everyone's ankles are wet.", dur: 3.6 },
            { fact: 'water_bbq' },
            { memory: 'water_bbq' },
            { hoaRule: 'water_events', text: 'All water-based social events require a Puddle Permit (Form 7-W).' },
          ],
        },
      ],
      go: [{ when: { all: [{ elapsed: 2 }, { noMajor: true }] }, to: 'feast' }],
      timeout: { sec: 20, to: 'feast' },
    },
    feast: {
      beat: 'payoff',
      do: [
        { fx: 'confetti', at: { spot: 'picnicTable' }, dur: 2.5, r: 3 },
        { sound: 'fanfare' },
        { anim: 'chef', play: 'cheer', dur: 3 },
        {
          if: { fact: 'dog_head_chef' },
          then: [
            { outcome: 'dog_chef' },
            { caption: "It's Brisket's birthday. Nobody knew. Brisket knew.", dur: 3.6 },
            { say: 'chef', line: 'Ladies and gentlemen... our new head chef. Brisket! Speech! ...No? Okay.', dur: 4 },
          ],
          else: [
            {
              if: { fact: 'water_bbq' },
              then: [
                { outcome: 'water_bbq' },
                { caption: 'The guests hold the cookout in ankle-deep water. Nobody suggests moving.', dur: 3.8 },
                { say: 'chef', line: "Welcome... to the FIRST ANNUAL WATER BBQ! I'm calling it annual. It's happened once. That counts.", dur: 4.6 },
              ],
              else: [
                {
                  if: { fact: 'burgers_on_clipboard' },
                  then: [
                    { outcome: 'clipboard_catering' },
                    { caption: 'Linda eats a burger directly off her HOA clipboard. Out of principle.', dur: 3.6 },
                    { say: 'chef', line: "Airborne catering! It's the future, folks!", dur: 3 },
                  ],
                  else: [
                    {
                      if: { fact: 'burgers_caught' },
                      then: [
                        { outcome: 'perfect_catch' },
                        { caption: 'Six burgers. One catch. The neighbors talk about it for years.', dur: 3.6 },
                        { say: 'chef', line: 'Did y\'all SEE that catch?! Best cookout in Pleasant Pines history! I\'m getting it engraved on something!', dur: 4.4 },
                      ],
                      else: [
                        {
                          if: { fact: 'burgers_lost' },
                          then: [
                            { outcome: 'potluck' },
                            { caption: 'The cookout becomes a potluck. Granny brings a casserole. It is mostly marshmallows.', dur: 4 },
                            { say: 'chef', line: 'This is fine. This is GREAT, actually. Who needs burgers? I do. But it\'s fine.', dur: 4 },
                          ],
                          else: [
                            {
                              if: { propState: 'food', is: ['soggy'] },
                              then: [{ outcome: 'soggy' }, { say: 'chef', line: 'Soggy but sincere! Like my wedding toast!', dur: 3.2 }],
                              else: [
                                {
                                  if: { propState: 'food', is: ['dusty'] },
                                  then: [{ outcome: 'dusty' }, { say: 'chef', line: 'A little dusty! Adds crunch! Five-second rule is more of a guideline!', dur: 3.6 }],
                                  else: [{ outcome: 'classic' }, { say: 'chef', line: ['A flawless cookout! Somebody write this down! Linda, write this down!', 'Look at this. Neighbors. Burgers. Nobody on fire. I might cry.'], dur: 3.8 }],
                                },
                              ],
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
        { setProp: 'food', state: 'served' },
        { fact: 'cookout_held' },
        { affinity: 'chef', by: 1 },
        { memory: 'randy.cookouts', value: true },
      ],
      timeout: { sec: 7, to: 'wrap' },
    },
    wrap: {
      beat: 'aftermath',
      do: [
        { if: { available: 'linda' }, then: [{ say: 'linda', line: ['This cookout was technically compliant. I hate how much I enjoyed it.', 'I have no notes. That has never happened. I am unsettled.'], dur: 3.6 }] },
        { fact: 'day_complete' },
      ],
      end: true,
      linger: 4,
    },
  },
};

// ------------------------------------------------------------------ fetch-phase hooks

export const QUIET_WALK: IncidentDef = {
  id: 'QUIET_WALK',
  title: 'A quiet walk (suspiciously)',
  kind: 'major',
  tags: ['fetch', 'breather'],
  weight: 0.6,
  cooldown: 0,
  requestOnly: true,
  cast: {},
  maxDuration: 6,
  fallback: 'done',
  start: 'walk',
  stages: {
    walk: {
      beat: 'setup',
      do: [{ caption: ['A peaceful walk down Maple Street. Suspiciously peaceful.', 'Nothing happens. You are not sure how to feel about it.'], dur: 3 }],
      timeout: { sec: 2, to: 'done' },
    },
    done: { beat: 'aftermath', end: true, linger: 0.2 },
  },
};

export const GRANNY_CART_DELIVERY: IncidentDef = {
  id: 'GRANNY_CART_DELIVERY',
  title: "Granny's Express Delivery",
  kind: 'major',
  tags: ['fetch', 'granny', 'vehicle', 'big'],
  weight: 1.4,
  cooldown: 120,
  requestOnly: true,
  requires: { all: [{ propState: 'cart', is: 'parked' }, { roll: 0.75 }] },
  cast: { driver: 'granny' },
  props: { cart: 'cart', cargo: 'charcoal' },
  compatibleNext: ['dog', 'sprinkler'],
  maxDuration: 90,
  fallback: 'park',
  start: 'pull_up',
  stages: {
    pull_up: {
      beat: 'setup',
      do: [
        { give: 'cart', to: 'driver' },
        { setProp: 'cart', state: 'driving' },
        { sound: 'horn', at: { actor: 'driver' } },
        { caption: 'HONK HONK.', dur: 1.6 },
        { follow: 'driver', target: { player: true }, style: 'drive', keep: 2.6 },
      ],
      go: [{ when: { actorNear: 'driver', target: { player: true }, r: 3.6 }, to: 'offer' }],
      timeout: { sec: 14, to: 'offer' },
    },
    offer: {
      beat: 'setup',
      do: [
        { stop: 'driver' },
        { say: 'driver', line: "Hop in, sugar! I'll get that charcoal to Randy faster than you can say 'liability'!", dur: 4 },
        { choices: ['Sure, Granny! (Hand her the charcoal)', "I'll walk, thanks."], from: 'driver' },
      ],
      go: [
        { when: { chose: 0 }, to: 'ride' },
        { when: { chose: 1 }, to: 'escort' },
        { when: { fact: 'charcoal_delivered' }, to: 'too_late' },
      ],
      timeout: { sec: 12, to: 'escort' },
    },
    ride: {
      beat: 'complication',
      do: [
        { give: 'cargo', to: 'driver' },
        { say: 'driver', line: 'Hold onto your hat! Or my hat! Somebody hold a hat!', dur: 2.8 },
        { route: 'driver', via: ['streetGranny', 'grannyGarden', 'streetGranny', 'lindaLawn', 'lindaHedges', 'hoaBoard', 'grill'], style: 'drive', pauses: 0.2 },
        { caption: 'Granny takes a "shortcut" through her own prize garden.', dur: 3 },
        { fact: 'granny_shortcut' },
        { chaos: 10 },
        { objective: 'Follow Granny to the grill (if you can keep up)', target: { actor: 'driver' } },
      ],
      go: [{ when: { actorNear: 'driver', target: { spot: 'lindaHedges' }, r: 2.5 }, to: 'hedge' }],
      timeout: { sec: 30, to: 'arrive' },
    },
    hedge: {
      beat: 'escalation',
      do: [
        { fx: 'leaves', at: { spot: 'lindaHedges' }, dur: 2, r: 2 },
        { sound: 'crash', at: { spot: 'lindaHedges' } },
        { fact: 'granny_hedge_crash' },
        { memory: 'granny.cart_crash' },
        { if: { available: 'linda' }, then: [{ say: 'linda', line: 'MY HEDGES! Those were compliant!', dur: 2.6 }], else: [{ caption: 'Somewhere, Linda feels a disturbance in the hedges.', dur: 2.6 }] },
        { say: 'driver', line: 'That hedge came out of NOWHERE!', dur: 2.4 },
        { chaos: 8 },
        { bump: 'problems_created' },
      ],
      go: [{ when: { arrived: 'driver' }, to: 'arrive' }],
      timeout: { sec: 25, to: 'arrive' },
    },
    arrive: {
      beat: 'payoff',
      do: [
        { place: 'cargo', at: { spot: 'grill' }, offset: { x: 1.1, z: 0.4 } },
        { setProp: 'cargo', state: 'delivered' },
        { fact: 'charcoal_delivered' },
        { fact: 'granny_delivered' },
        { say: 'driver', line: 'Door to door! Well. Lawn to hedge to lawn to door.', dur: 3 },
        { award: 'deputized', text: 'Granny Darlene deputizes you! You are now an Honorary Deputy of Pleasant Pines.' },
        { memory: 'deputized' },
        { affinity: 'driver', by: 2 },
        { bump: 'problems_solved' },
      ],
      timeout: { sec: 3, to: 'drive_home' },
    },
    escort: {
      beat: 'complication',
      do: [
        { say: 'driver', line: "Suit yourself. I'll escort you. For your protection. From what? Exactly.", dur: 3.6 },
        { follow: 'driver', target: { player: true }, style: 'drive', keep: 3.6 },
        { fact: 'granny_escort' },
      ],
      go: [{ when: { fact: 'charcoal_delivered' }, to: 'escort_done' }],
      timeout: { sec: 70, to: 'escort_done' },
    },
    escort_done: {
      beat: 'payoff',
      do: [
        { sound: 'horn', at: { actor: 'driver' } },
        { say: 'driver', line: 'Escort complete. Zero incidents. I am almost disappointed.', dur: 3 },
        { affinity: 'driver', by: 0.5 },
      ],
      timeout: { sec: 2.5, to: 'drive_home' },
    },
    too_late: {
      beat: 'aftermath',
      do: [{ say: 'driver', line: "Oh, you already delivered it. Well, I'm already out here. Might as well patrol.", dur: 3.4 }],
      timeout: { sec: 2, to: 'drive_home' },
    },
    drive_home: {
      beat: 'aftermath',
      do: [{ move: 'driver', to: { spot: 'cartPark' }, style: 'drive' }],
      go: [{ when: { arrived: 'driver' }, to: 'park' }],
      timeout: { sec: 20, to: 'park' },
    },
    park: {
      beat: 'aftermath',
      do: [
        { give: 'cart', to: 'nobody', at: { spot: 'cartPark' } },
        { setProp: 'cart', state: 'parked' },
        {
          if: { heldBy: 'cargo', by: 'driver' },
          then: [{ place: 'cargo', at: { spot: 'grill' }, offset: { x: 1.1, z: 0.4 } }, { setProp: 'cargo', state: 'delivered' }, { fact: 'charcoal_delivered' }],
        },
      ],
      end: true,
      linger: 0.5,
    },
  },
};

export const LINDA_CHARCOAL_PERMIT: IncidentDef = {
  id: 'LINDA_CHARCOAL_PERMIT',
  title: 'Form C-4',
  kind: 'major',
  tags: ['fetch', 'linda', 'paperwork'],
  weight: 1,
  cooldown: 200,
  requestOnly: true,
  requires: { all: [{ not: { memory: 'permit.charcoal' } }, { roll: 0.7 }] },
  cast: { inspector: 'linda' },
  maxDuration: 60,
  fallback: 'walked',
  start: 'intercept',
  stages: {
    intercept: {
      beat: 'setup',
      do: [
        { say: 'inspector', line: 'Excuse me! EXCUSE me! Transporting combustibles on Maple Street requires Form C-4.', dur: 3.8 },
        { emote: 'inspector', icon: '!' },
        { follow: 'inspector', target: { player: true }, style: 'run', keep: 2 },
      ],
      go: [{ when: { actorNear: 'inspector', target: { player: true }, r: 2.8 }, to: 'form' }],
      timeout: { sec: 16, to: 'give_up' },
    },
    form: {
      beat: 'complication',
      do: [
        { stop: 'inspector' },
        { anim: 'inspector', play: 'write' },
        { say: 'inspector', line: 'Please initial here, here, and here. And here. This one is just for me.', dur: 3.6 },
        { choices: ['Sign the form', "It's for Randy's cookout!", 'Keep walking'], from: 'inspector' },
      ],
      go: [
        { when: { chose: 0 }, to: 'signed' },
        { when: { chose: 1 }, to: 'two_forms' },
        { when: { chose: 2 }, to: 'walked' },
      ],
      timeout: { sec: 14, to: 'walked' },
    },
    signed: {
      beat: 'payoff',
      do: [
        { caption: 'Linda produces a tiny stamp from nowhere. APPROVED.', dur: 2.8 },
        { sound: 'stamp' },
        { say: 'inspector', line: 'Thank you for your compliance. You may now carry charcoal. Recreationally.', dur: 3.4 },
        { memory: 'permit.charcoal' },
        { fact: 'permit_signed' },
        { affinity: 'inspector', by: 1.5 },
      ],
      end: true,
      linger: 2.5,
    },
    two_forms: {
      beat: 'payoff',
      do: [
        { say: 'inspector', line: "Ah. Randy. Then you'll need TWO forms. One for the charcoal, one for Randy.", dur: 3.6 },
        { caption: 'You sign two forms. One of them is for Randy.', dur: 2.8 },
        { memory: 'permit.charcoal' },
        { fact: 'permit_signed_twice' },
        { affinity: 'inspector', by: 0.5 },
      ],
      end: true,
      linger: 2.5,
    },
    walked: {
      beat: 'payoff',
      do: [
        { anim: 'inspector', play: 'write', dur: 3 },
        { say: 'inspector', line: 'Noted. NOTED. In pen.', dur: 2.4 },
        { fact: 'linda_noted_you' },
        { memory: 'linda.watching' },
        { affinity: 'inspector', by: -0.5 },
      ],
      end: true,
      linger: 2,
    },
    give_up: {
      beat: 'aftermath',
      do: [{ say: 'inspector', line: "Fine. I'll MAIL it to you. You live right there. I'll still mail it.", dur: 3.2 }],
      end: true,
      linger: 1,
    },
  },
};

// ------------------------------------------------------------------ cooking complications

export const DOG_STEALS_BURGERS: IncidentDef = {
  id: 'DOG_STEALS_BURGERS',
  title: 'The Great Burger Heist',
  kind: 'major',
  tags: ['bbq', 'dog', 'chase', 'food'],
  weight: 1.3,
  cooldown: 300,
  requestOnly: true,
  requires: {
    all: [
      { not: { memory: 'randy.guards_food' } },
      { propState: 'platter', is: ['grilled', 'raw'] },
      { heldBy: 'platter', by: 'nobody' },
    ],
  },
  cast: { thief: 'dog', chef: 'randy' },
  props: { food: 'platter', toy: 'toy' },
  compatibleNext: ['sprinkler', 'granny'],
  maxDuration: 120,
  fallback: 'fallback_end',
  start: 'notice',
  stages: {
    notice: {
      beat: 'setup',
      do: [
        { stop: 'thief' },
        { face: 'thief', target: { prop: 'food' } },
        { anim: 'thief', play: 'sniff' },
        { emote: 'thief', icon: '!' },
        { caption: 'Brisket has noticed the burgers.', dur: 2.6 },
        { objective: 'Uh oh. Brisket is eyeing the burgers!', target: { prop: 'food' } },
        { sound: 'sniff', at: { actor: 'thief' } },
      ],
      go: [{ when: { heldBy: 'food', by: 'player' }, to: 'foiled' }],
      timeout: { sec: 3.2, to: 'grab' },
    },
    grab: {
      beat: 'complication',
      do: [{ move: 'thief', to: { prop: 'food' }, style: 'sprint' }],
      go: [
        { when: { heldBy: 'food', by: 'player' }, to: 'foiled' },
        { when: { actorNear: 'thief', target: { prop: 'food' }, r: 1.1 }, to: 'snatch' },
      ],
      timeout: { sec: 7, to: 'fizzle' },
    },
    foiled: {
      beat: 'payoff',
      do: [
        { emote: 'thief', icon: '?' },
        { anim: 'thief', play: 'sit', dur: 3 },
        { say: 'chef', line: ["Good reflexes, neighbor! You'd make a fine burger bodyguard.", 'Ha! Not today, Brisket! Not TODAY!'], dur: 3.2 },
        { fact: 'dog_foiled' },
        { affinity: 'chef', by: 1 },
        { bump: 'problems_solved' },
      ],
      end: true,
      linger: 2.5,
    },
    snatch: {
      beat: 'complication',
      do: [
        { give: 'food', to: 'thief' },
        { setProp: 'food', state: 'stolen' },
        { fact: 'dog_stole_burgers' },
        { chaos: 15 },
        { bump: 'problems_created' },
        { say: 'chef', line: ['BRISKET! Those are for COMPANY!', 'BRISKET NO! Brisket YES? No! NO!'], dur: 2.6 },
        { caption: 'BRISKET HAS THE BURGERS.', dur: 2.4 },
        { sound: 'alarm' },
        {
          oneOf: [
            [{ route: 'thief', via: ['picnicTable', 'sprinklerValve', 'toddLanding', 'hoaBoard', 'lindaLawn', 'dogHouse'], style: 'run', pauses: 0.9 }, { fact: 'dog_route', value: 'sprinkler' }],
            [{ route: 'thief', via: ['randyPorch', 'lindaLawn', 'lindaGnome', 'lindaHedges', 'hoaBoard', 'dogHouse'], style: 'run', pauses: 0.9 }, { fact: 'dog_route', value: 'linda' }],
            [{ route: 'thief', via: ['randyLawnWest', 'streetGranny', 'cartPark', 'grannyGarden', 'streetGranny', 'dogHouse'], style: 'run', pauses: 0.9 }, { fact: 'dog_route', value: 'granny' }],
          ],
        },
        { objective: 'Get the burgers back! Catch Brisket, throw his squeaky toy (F), or ask a neighbor for help', target: { actor: 'thief' } },
      ],
      timeout: { sec: 0.2, to: 'chase' },
    },
    chase: {
      beat: 'complication',
      go: [
        { when: { heldBy: 'food', by: 'nobody' }, to: 'recovered' },
        { when: { used: 'granny' }, to: 'granny_help' },
        { when: { used: 'chef' }, to: 'chase', do: [{ say: 'chef', line: ["The squeaky toy! By the dog house! He can't resist it!", "Don't look at me, I've never caught him. He's very fast for a dog with no plan."], dur: 3.2 }] },
        { when: { arrived: 'thief' }, to: 'dog_feast' },
      ],
      timeout: { sec: 50, to: 'dog_feast' },
    },
    granny_help: {
      beat: 'escalation',
      do: [
        { recruit: 'granny', as: 'helper' },
        {
          if: { available: 'helper' },
          then: [
            { say: 'helper', line: "Leave it to me, sugar! Nobody outruns the cart!", dur: 2.6 },
            { give: 'cart', to: 'helper' },
            { setProp: 'cart', state: 'driving' },
            { sound: 'horn', at: { actor: 'helper' } },
            { follow: 'helper', target: { actor: 'thief' }, style: 'drive', keep: 1.2 },
            { caption: 'Granny Darlene has entered the chase.', dur: 2.4 },
            { chaos: 10 },
            { fact: 'granny_joined_chase' },
          ],
        },
      ],
      go: [
        { when: { heldBy: 'food', by: 'nobody' }, to: 'recovered' },
        { when: { actorNear: 'helper', target: { actor: 'thief' }, r: 1.8 }, to: 'granny_catch' },
        { when: { arrived: 'thief' }, to: 'dog_feast' },
      ],
      timeout: { sec: 14, to: 'chase' },
    },
    granny_catch: {
      beat: 'payoff',
      do: [
        { give: 'food', to: 'nobody', at: { actor: 'thief' } },
        { setProp: 'food', state: 'dusty' },
        { emote: 'thief', icon: 'gasp' },
        { route: 'thief', via: ['dogHouse'], style: 'run' },
        { stop: 'helper' },
        { hop: 'helper', to: { spot: 'randyLawnWest' }, height: 1.4, dur: 0.8 },
        { fx: 'leaves', at: { spot: 'randyLawnWest' }, dur: 1.5 },
        { sound: 'crash' },
        { caption: "Brisket drops the burgers. Granny's cart does not stop. Granny's cart was never going to stop.", dur: 3.8 },
        { say: 'helper', line: "I'm FINE! The cart's fine! That bush had it coming!", dur: 3 },
        { fact: 'granny_cart_crash' },
        { memory: 'granny.cart_crash' },
        { award: 'deputized', text: 'Granny Darlene deputizes you for "outstanding burger enforcement." You are now an Honorary Deputy.' },
        { memory: 'deputized' },
        { affinity: 'helper', by: 2 },
        { chaos: 6 },
      ],
      timeout: { sec: 1, to: 'recovered' },
    },
    recovered: {
      beat: 'payoff',
      do: [
        {
          if: { fact: 'dog_distracted_by_toy' },
          then: [{ say: 'chef', line: "The squeaky toy! Genius! You speak fluent Brisket!", dur: 3 }, { fact: 'toy_saved_burgers' }, { affinity: 'chef', by: 1 }],
          else: [{ say: 'chef', line: 'You got \'em! Little dusty. Adds crunch.', dur: 2.6 }],
        },
        { if: { propState: 'food', is: 'stolen' }, then: [{ setProp: 'food', state: 'dusty' }] },
        { objective: "Bring the burgers back to Randy's grill", target: { spot: 'grillTable' } },
        { bump: 'problems_solved' },
      ],
      go: [
        { when: { all: [{ propNear: 'food', target: { spot: 'grillTable' }, r: 3 }, { heldBy: 'food', by: 'nobody' }] }, to: 'returned' },
        { when: { all: [{ propNear: 'food', target: { spot: 'picnicTable' }, r: 3 }, { heldBy: 'food', by: 'nobody' }] }, to: 'returned' },
        { when: { heldBy: 'food', by: 'thief' }, to: 'chase', do: [{ caption: 'Brisket has the burgers AGAIN. He is nothing if not persistent.', dur: 2.6 }, { route: 'thief', via: ['randyLawnEast', 'toddLawn', 'streetMid', 'dogHouse'], style: 'run', pauses: 1 }] },
      ],
      timeout: { sec: 70, to: 'returned', do: [{ say: 'chef', line: "I'll fetch 'em! Brisket isn't the only one who can run! I'm wheezing!", dur: 3 }, { place: 'food', at: { spot: 'grillTable' }, y: 0.9 }] },
    },
    returned: {
      beat: 'aftermath',
      do: [
        { say: 'chef', line: ['Crisis averted! Mostly! Partially! Ish!', "From now on, nobody touches the burgers. I'm installing a security system. It's me. I'm the system."], dur: 3.4 },
        { memory: 'randy.guards_food' },
        { affinity: 'chef', by: 1 },
        { anim: 'thief', play: 'sit', dur: 4 },
      ],
      end: true,
      linger: 2,
    },
    dog_feast: {
      beat: 'payoff',
      do: [
        { stop: 'thief' },
        { give: 'food', to: 'nobody', at: { actor: 'thief' } },
        { setProp: 'food', state: 'eaten' },
        { anim: 'thief', play: 'sit' },
        { emote: 'thief', icon: 'heart' },
        { fx: 'hearts', at: { actor: 'thief' }, dur: 2 },
        { fact: 'burgers_eaten' },
        { fact: 'dog_head_chef' },
        { memory: 'dog_head_chef' },
        { memory: 'randy.guards_food' },
        { chaos: 10 },
        { bump: 'problems_created', by: 2 },
        { move: 'chef', to: { actor: 'thief' }, style: 'walk', offset: { x: 1.5, z: -1 } },
        { say: 'chef', line: 'Well... he IS the birthday boy.', dur: 2.8 },
      ],
      end: true,
      linger: 3,
    },
    fizzle: {
      beat: 'aftermath',
      do: [
        { caption: 'Brisket gets distracted by a leaf. The burgers are safe. The leaf is not.', dur: 3 },
        { fact: 'dog_distracted_by_leaf' },
      ],
      end: true,
      linger: 1.5,
    },
    fallback_end: {
      beat: 'aftermath',
      do: [
        { if: { heldBy: 'food', by: 'thief' }, then: [{ place: 'food', at: { spot: 'grillTable' }, y: 0.9 }] },
        { say: 'chef', line: 'Brisket! Drop it! ...Good boy. Mostly good boy.', dur: 2.6 },
      ],
      end: true,
      linger: 1,
    },
  },
};

export const AUTO_FLIPPER: IncidentDef = {
  id: 'AUTO_FLIPPER',
  title: 'The Flip-O-Matic 3000',
  kind: 'major',
  tags: ['bbq', 'earl', 'gadget', 'airborne', 'big'],
  weight: 1.3,
  cooldown: 300,
  requestOnly: true,
  requires: {
    all: [
      // Only if you showed interest in Earl's inventions (blueprint: "if the player discovered the garage").
      { any: [{ fact: 'talked.earl' }, { fact: 'player.inspected.flipper' }, { affinity: 'earl', gte: 1 }, { memory: 'flipper_flung' }] },
      { propState: 'platter', is: ['grilled', 'raw'] },
      { heldBy: 'platter', by: 'nobody' },
      { propState: 'flipper', is: ['stored'] },
    ],
  },
  cast: { inventor: 'earl', chef: 'randy' },
  props: { gadget: 'flipper', food: 'platter' },
  compatibleNext: ['linda', 'dog'],
  maxDuration: 100,
  fallback: 'wrap',
  start: 'arrive',
  stages: {
    arrive: {
      beat: 'setup',
      do: [
        { give: 'gadget', to: 'inventor' },
        { say: 'inventor', line: 'RANDY! I brought the Flip-O-Matic 3000! It flips burgers so you don\'t have to!', dur: 3.4 },
        { move: 'inventor', to: { spot: 'grill' }, offset: { x: 1.4, z: -1.2 }, style: 'run' },
        { say: 'chef', line: 'Earl, I love it already, and I don\'t know what it is.', dur: 3 },
        { objective: 'Uncle Earl is bringing an invention. Brace yourself.', target: { actor: 'inventor' } },
      ],
      go: [{ when: { arrived: 'inventor' }, to: 'install' }],
      timeout: { sec: 25, to: 'install' },
    },
    install: {
      beat: 'setup',
      do: [
        { place: 'gadget', at: { spot: 'grill' }, offset: { x: 0.6, z: 0 }, y: 1.0 },
        { setProp: 'gadget', state: 'installed' },
        { anim: 'inventor', play: 'proud' },
        { say: 'inventor', line: "It's only got two settings: gentle, and ALSO gentle. I think. The labels fell off.", dur: 3.6 },
        { choices: ['Let it rip, Earl!', 'Maybe turn it down a notch?'], from: 'inventor' },
        { objective: 'Let Earl run it — or hit its OFF button before it starts', target: { prop: 'gadget' } },
      ],
      go: [
        { when: { propState: 'gadget', is: 'disabled' }, to: 'disabled_early' },
        { when: { chose: 0 }, to: 'flip_hard', do: [{ say: 'inventor', line: 'Now THAT is the spirit of science!', dur: 2.2 }, { affinity: 'inventor', by: 1 }] },
        { when: { chose: 1 }, to: 'flip_soft', do: [{ say: 'inventor', line: 'Turning it down to... hmm. These numbers go the other way.', dur: 2.8 }] },
      ],
      timeout: { sec: 10, to: 'flip_hard' },
    },
    disabled_early: {
      beat: 'payoff',
      do: [
        { say: 'inventor', line: "Aw. You're right. It's not ready. It's never been ready. It's never going to be ready.", dur: 3.6 },
        { anim: 'inventor', play: 'shrug', dur: 2 },
        { say: 'chef', line: 'Old school it is! Flipping by hand, like my daddy, and his daddy, and his daddy\'s spatula.', dur: 3.8 },
        { fact: 'flipper_disabled_early' },
        { affinity: 'inventor', by: -0.5 },
        { affinity: 'chef', by: 0.5 },
        { bump: 'problems_solved' },
      ],
      end: true,
      linger: 2.5,
    },
    flip_soft: {
      beat: 'complication',
      do: [
        { setProp: 'gadget', state: 'flipping' },
        { sound: 'sproing', at: { spot: 'grill' } },
        { launch: 'food', to: { spot: 'grillTable' }, height: 2.5, dur: 1.1, landY: 0.9 },
        { caption: 'Flip! A perfect little flip.', dur: 2 },
      ],
      timeout: { sec: 2.2, to: 'flip_twice' },
    },
    flip_twice: {
      beat: 'escalation',
      do: [
        { say: 'inventor', line: 'The good news is it worked. The bad news is it worked twice.', dur: 3 },
        { fact: 'flipper_worked_twice' },
      ],
      timeout: { sec: 1.5, to: 'flip_hard' },
    },
    flip_hard: {
      beat: 'complication',
      do: [
        { setProp: 'gadget', state: 'flipping' },
        { sound: 'sproing', at: { spot: 'grill' } },
        { chaos: 12 },
        { fact: 'burgers_launched' },
        { bump: 'problems_created' },
        {
          if: { available: 'linda' },
          then: [
            { oneOf: [[{ fact: 'flip_target', value: 'linda' }], [{ fact: 'flip_target', value: 'roof' }], [{ fact: 'flip_target', value: 'linda' }]] },
          ],
          else: [{ oneOf: [[{ fact: 'flip_target', value: 'roof' }], [{ fact: 'flip_target', value: 'table' }]] }],
        },
      ],
      go: [
        { when: { fact: 'flip_target', eq: 'linda' }, to: 'fly_linda' },
        { when: { fact: 'flip_target', eq: 'roof' }, to: 'fly_roof' },
        { when: { fact: 'flip_target', eq: 'table' }, to: 'fly_table' },
      ],
      timeout: { sec: 0.5, to: 'fly_table' },
    },
    fly_linda: {
      beat: 'escalation',
      do: [
        { recruit: 'linda', as: 'inspector' },
        { stop: 'inspector' },
        { anim: 'inspector', play: 'write' },
        { launch: 'food', to: { actor: 'inspector' }, height: 14, dur: 3.8, landY: 1 },
        { marker: { actor: 'inspector' }, dur: 3.8 },
        { caption: 'The burgers are AIRBORNE. Stand under them!', dur: 3 },
        { objective: 'CATCH THE BURGERS! Get into the circle before they land!', target: { actor: 'inspector' } },
      ],
      go: [
        { when: { all: [{ elapsed: 0.5 }, { heldBy: 'food', by: 'nobody' }, { catchable: { actor: 'inspector' } }] }, to: 'caught' },
        { when: { all: [{ elapsed: 0.5 }, { heldBy: 'food', by: 'nobody' }] }, to: 'clipboard' },
      ],
      timeout: { sec: 8, to: 'clipboard' },
    },
    fly_roof: {
      beat: 'escalation',
      do: [
        { launch: 'food', to: { spot: 'randyRoof' }, height: 12, dur: 3.6, landY: 6.6 },
        { marker: { spot: 'randyPorch' }, dur: 3.6 },
        { caption: 'The burgers are AIRBORNE. They are heading for the roof!', dur: 3 },
        { objective: 'CATCH THE BURGERS! Stand in the circle by the porch!', target: { spot: 'randyPorch' } },
      ],
      go: [
        { when: { all: [{ elapsed: 0.5 }, { heldBy: 'food', by: 'nobody' }, { catchable: { spot: 'randyPorch' } }] }, to: 'caught' },
        { when: { all: [{ elapsed: 0.5 }, { heldBy: 'food', by: 'nobody' }] }, to: 'roof' },
      ],
      timeout: { sec: 8, to: 'roof' },
    },
    fly_table: {
      beat: 'escalation',
      do: [
        { launch: 'food', to: { spot: 'picnicTable' }, height: 9, dur: 3, landY: 0.8 },
        { marker: { spot: 'picnicTable' }, dur: 3 },
        { caption: 'The burgers are AIRBORNE!', dur: 2.4 },
        { objective: 'CATCH THE BURGERS! Get into the circle!', target: { spot: 'picnicTable' } },
      ],
      go: [
        { when: { all: [{ elapsed: 0.5 }, { heldBy: 'food', by: 'nobody' }, { catchable: { spot: 'picnicTable' } }] }, to: 'caught' },
        { when: { all: [{ elapsed: 0.5 }, { heldBy: 'food', by: 'nobody' }] }, to: 'table_landing' },
      ],
      timeout: { sec: 8, to: 'table_landing' },
    },
    caught: {
      beat: 'payoff',
      do: [
        { give: 'food', to: 'player' },
        { sound: 'catch' },
        { fx: 'stars', at: { player: true }, dur: 1.5 },
        { caption: 'You catch the burgers. Every. Single. One.', dur: 2.8 },
        { say: 'inventor', line: 'SEE?! Perfectly safe! I\'m writing that down!', dur: 2.6 },
        { fact: 'burgers_caught' },
        { affinity: 'inventor', by: 1 },
        { affinity: 'chef', by: 1.5 },
        { bump: 'problems_solved' },
        { objective: 'Take the burgers to the picnic table', target: { spot: 'picnicTable' } },
      ],
      timeout: { sec: 2.5, to: 'maybe_rogue' },
    },
    clipboard: {
      beat: 'payoff',
      do: [
        { give: 'food', to: 'inspector' },
        { setProp: 'clipboard', state: 'burgered' },
        { caption: "All six burgers land perfectly on Linda's HOA clipboard. In a grid.", dur: 3.4 },
        { say: 'inspector', line: 'This is in violation of nothing. YET.', dur: 2.6 },
        { hoaRule: 'airborne_catering', text: 'Rule 14-B: Catering must remain grounded at all times.' },
        { fact: 'burgers_on_clipboard' },
        { memory: 'flipper_flung' },
        { chaos: 6 },
      ],
      timeout: { sec: 3, to: 'linda_delivers' },
    },
    linda_delivers: {
      beat: 'aftermath',
      do: [
        { say: 'inspector', line: 'I will deliver these to the picnic table. Under protest. Single file.', dur: 3 },
        { move: 'inspector', to: { spot: 'picnicTable' }, offset: { x: -1.5, z: 0 }, style: 'walk' },
      ],
      go: [{ when: { arrived: 'inspector' }, to: 'maybe_rogue', do: [{ place: 'food', at: { spot: 'picnicTable' }, y: 0.8 }] }],
      timeout: { sec: 20, to: 'maybe_rogue', do: [{ place: 'food', at: { spot: 'picnicTable' }, y: 0.8 }] },
    },
    roof: {
      beat: 'payoff',
      do: [
        { caption: "The burgers land on Randy's roof. All of them. Face up.", dur: 3 },
        { say: 'chef', line: 'Well. That\'s a first. Earl, do you have a ladder?', dur: 2.6 },
        { say: 'inventor', line: 'I have a ladder-launcher.', dur: 2 },
        { fact: 'burgers_on_roof' },
        { memory: 'flipper_flung' },
        { chaos: 6 },
        { objective: 'The burgers are on the roof! Ask Todd for help — he bounces', target: { actor: 'todd' } },
      ],
      go: [{ when: { used: 'todd' }, to: 'todd_rescue' }],
      timeout: { sec: 25, to: 'todd_rescue' },
    },
    todd_rescue: {
      beat: 'payoff',
      do: [
        { recruit: 'todd', as: 'flyer' },
        { say: 'flyer', line: "Burgers on a roof? Say no more! This is literally what I train for!", dur: 3 },
        { hop: 'flyer', to: { spot: 'randyRoof' }, height: 12, dur: 2.4 },
        { sound: 'boing', at: { spot: 'trampoline' } },
        { fact: 'todd_saved_burgers' },
      ],
      timeout: { sec: 2.6, to: 'todd_return' },
    },
    todd_return: {
      beat: 'payoff',
      do: [
        { give: 'food', to: 'flyer' },
        { hop: 'flyer', to: { spot: 'picnicTable' }, height: 8, dur: 2 },
      ],
      timeout: { sec: 2.2, to: 'todd_land' },
    },
    todd_land: {
      beat: 'payoff',
      do: [
        { place: 'food', at: { spot: 'picnicTable' }, y: 0.8 },
        { setProp: 'food', state: 'dusty' },
        { fx: 'dust', at: { spot: 'picnicTable' } },
        { say: 'flyer', line: 'Special delivery! Slightly shingled!', dur: 2.4 },
        { bump: 'problems_solved' },
        { affinity: 'flyer', by: 2 },
        { release: 'flyer' },
      ],
      timeout: { sec: 2, to: 'maybe_rogue' },
    },
    table_landing: {
      beat: 'payoff',
      do: [
        { caption: 'The burgers land perfectly on the picnic table. Earl weeps with pride.', dur: 3 },
        { say: 'inventor', line: "I'm not crying, there's flipper oil in my eye.", dur: 2.6 },
        { fact: 'flipper_perfect_landing' },
        { memory: 'flipper_flung' },
      ],
      timeout: { sec: 2, to: 'maybe_rogue' },
    },
    maybe_rogue: {
      beat: 'escalation',
      go: [
        { when: { all: [{ chaosGte: 40 }, { roll: 0.5 }, { not: { propState: 'gadget', is: 'disabled' } }] }, to: 'rogue' },
        { when: { always: true }, to: 'wrap' },
      ],
      timeout: { sec: 0.5, to: 'wrap' },
    },
    rogue: {
      beat: 'escalation',
      do: [
        { setProp: 'gadget', state: 'rogue' },
        { say: 'inventor', line: 'Uh oh. It\'s learning.', dur: 2 },
        { caption: 'The Flip-O-Matic starts flipping everything. The grill lid. The lawn chairs. Randy.', dur: 3.4 },
        { hop: 'chef', to: { spot: 'grill' }, height: 3, dur: 1.2 },
        { chaos: 8 },
        { objective: "Hit the Flip-O-Matic's OFF button!", target: { prop: 'gadget' } },
      ],
      go: [{ when: { propState: 'gadget', is: 'disabled' }, to: 'rogue_off' }],
      timeout: { sec: 15, to: 'rogue_tired' },
    },
    rogue_off: {
      beat: 'payoff',
      do: [
        { say: 'inventor', line: 'Thank you. I was too scared to do that.', dur: 2.4 },
        { fact: 'flipper_stopped' },
        { bump: 'problems_solved' },
        { affinity: 'inventor', by: 1 },
      ],
      timeout: { sec: 1.5, to: 'wrap' },
    },
    rogue_tired: {
      beat: 'payoff',
      do: [{ setProp: 'gadget', state: 'disabled' }, { caption: 'The Flip-O-Matic runs out of battery. Earl swears it never had a battery.', dur: 3.2 }, { fact: 'flipper_exhausted' }],
      timeout: { sec: 1.5, to: 'wrap' },
    },
    wrap: {
      beat: 'aftermath',
      do: [
        { if: { propState: 'gadget', is: ['installed', 'flipping', 'rogue'] }, then: [{ setProp: 'gadget', state: 'disabled' }] },
        { fact: 'flipper_used' },
        { if: { heldBy: 'food', by: 'inspector' }, then: [{ place: 'food', at: { spot: 'picnicTable' }, y: 0.8 }] },
        { move: 'inventor', to: { spot: 'earlWorkbench' }, offset: { x: -1.2, z: -0.8 }, style: 'walk' },
      ],
      end: true,
      linger: 1.5,
    },
  },
};

export const SPRINKLER_SURPRISE: IncidentDef = {
  id: 'SPRINKLER_SURPRISE',
  title: 'The Sprinkler Timer',
  kind: 'major',
  tags: ['bbq', 'sprinkler', 'water', 'linda'],
  weight: 1.2,
  cooldown: 300,
  requestOnly: true,
  requires: {
    all: [
      { propState: 'valve', is: 'off' },
      { not: { memory: 'randy.timer_fixed' } },
      { propState: 'platter', is: ['grilled', 'raw'] },
      { heldBy: 'platter', by: 'nobody' },
    ],
  },
  cast: { chef: 'randy', inspector: 'linda' },
  props: { valve: 'valve', food: 'platter' },
  compatibleNext: ['dog', 'chickens'],
  maxDuration: 100,
  fallback: 'water_party',
  start: 'tick',
  stages: {
    tick: {
      beat: 'setup',
      do: [
        { setProp: 'valve', state: 'ticking' },
        { sound: 'tick', at: { prop: 'valve' } },
        { say: 'chef', line: 'Huh. Did I set the sprinkler timer for noon? What time is it? Why is it clicking?', dur: 3.2 },
        { caption: 'Click... click... click... The sprinkler timer is counting down.', dur: 3 },
        { move: 'inspector', to: { spot: 'picnicTable' }, offset: { x: -1.6, z: 0.6 }, style: 'walk' },
        { objective: 'The sprinkler timer is ticking! Shut it off at the valve!', target: { prop: 'valve' } },
      ],
      go: [{ when: { propState: 'valve', is: 'off' }, to: 'prevented' }],
      timeout: { sec: 7.5, to: 'spray' },
    },
    prevented: {
      beat: 'payoff',
      do: [
        { say: 'chef', line: 'Whew! I knew that timer was in good hands. Your hands. Not mine. Never mine.', dur: 3 },
        { say: 'inspector', line: "Water discharge prevented. I'm almost disappointed. Almost.", dur: 3 },
        { fact: 'sprinkler_prevented' },
        { memory: 'randy.timer_fixed' },
        { affinity: 'chef', by: 1 },
        { affinity: 'inspector', by: 0.5 },
        { bump: 'problems_solved' },
      ],
      end: true,
      linger: 2.5,
    },
    spray: {
      beat: 'complication',
      do: [
        { setProp: 'valve', state: 'on' },
        { fact: 'sprinkler_on' },
        { sound: 'spray', at: { spot: 'sprinklerHead' } },
        { caption: 'FSSSSHHHHHHH.', dur: 1.8 },
        { chaos: 12 },
        { bump: 'problems_created' },
        { say: 'chef', line: "It's fine! It's a marinade now!", dur: 2.4 },
        { objective: 'Save the burgers! Grab them out of the spray — or shut off the valve', target: { prop: 'food' } },
      ],
      go: [
        { when: { all: [{ used: 'valve' }, { chaosGte: 30 }, { roll: 0.55 }] }, to: 'jammed' },
        { when: { propState: 'valve', is: 'off' }, to: 'shut_off' },
        { when: { heldBy: 'food', by: 'player' }, to: 'burgers_rescued' },
        { when: { propState: 'food', is: 'soggy' }, to: 'soggy' },
      ],
      timeout: { sec: 14, to: 'water_party' },
    },
    jammed: {
      beat: 'escalation',
      do: [
        { setProp: 'valve', state: 'jammed' },
        { caption: 'The valve handle comes off in your hand. The sprinkler is now a fountain.', dur: 3.2 },
        { fx: 'splash', at: { spot: 'sprinklerHead' }, dur: 3, r: 3 },
        { fact: 'valve_jammed' },
        { chaos: 8 },
        { say: 'inspector', line: 'Do you have a permit for that GEYSER?', dur: 2.4 },
        { objective: 'The valve is jammed! Rescue the burgers — or ask Uncle Earl for help', target: { prop: 'food' } },
      ],
      go: [
        { when: { heldBy: 'food', by: 'player' }, to: 'burgers_rescued' },
        { when: { used: 'earl' }, to: 'earl_fix' },
        { when: { propState: 'food', is: 'soggy' }, to: 'soggy' },
      ],
      timeout: { sec: 16, to: 'water_party' },
    },
    earl_fix: {
      beat: 'escalation',
      do: [
        { recruit: 'earl', as: 'fixer' },
        { say: 'fixer', line: 'Stand back! I\'m going to reverse the polarity of the water!', dur: 2.8 },
        { move: 'fixer', to: { prop: 'valve' }, style: 'sprint' },
      ],
      go: [{ when: { arrived: 'fixer' }, to: 'earl_sits' }],
      timeout: { sec: 14, to: 'earl_sits' },
    },
    earl_sits: {
      beat: 'payoff',
      do: [
        { setProp: 'valve', state: 'off' },
        { anim: 'fixer', play: 'sit', dur: 3 },
        { caption: 'Earl fixes the valve by sitting on it.', dur: 2.6 },
        { say: 'fixer', line: 'Engineering!', dur: 1.6 },
        { fact: 'earl_sat_on_valve' },
        { affinity: 'fixer', by: 1 },
        { bump: 'problems_solved' },
      ],
      timeout: { sec: 2.5, to: 'shut_off' },
    },
    burgers_rescued: {
      beat: 'payoff',
      do: [
        { say: 'chef', line: 'You saved the burgers! You absolute HERO! The lawn, though... the lawn is a lake.', dur: 3.4 },
        { fact: 'burgers_saved_from_water' },
        { affinity: 'chef', by: 1.5 },
        { bump: 'problems_solved' },
        { objective: 'Take the burgers to the picnic table (mind the puddles)', target: { spot: 'picnicTable' } },
      ],
      go: [{ when: { propState: 'valve', is: 'off' }, to: 'shut_off' }],
      timeout: { sec: 5, to: 'water_party' },
    },
    soggy: {
      beat: 'payoff',
      do: [{ caption: 'The burgers are now soup-adjacent.', dur: 2.4 }, { fact: 'burgers_soggy' }],
      timeout: { sec: 2.5, to: 'water_party' },
    },
    shut_off: {
      beat: 'payoff',
      do: [
        { setProp: 'valve', state: 'off' },
        { fact: 'sprinkler_shut_off' },
        { say: 'chef', line: 'Crisis averted! Lawn\'s well hydrated, though. Very hydrated. Squishy, even.', dur: 3 },
        { bump: 'problems_solved' },
      ],
      go: [{ when: { propState: 'food', is: 'soggy' }, to: 'water_party' }],
      timeout: { sec: 2, to: 'wrap' },
    },
    water_party: {
      beat: 'payoff',
      do: [
        { caption: 'The yard is ankle-deep. The neighbors arrive anyway. Nobody suggests moving.', dur: 3.4 },
        { say: 'chef', line: 'Ladies and gentlemen... the first annual WATER BBQ!', dur: 3 },
        { say: 'inspector', line: 'All water-based social events now require a Puddle Permit. Form 7-W. In triplicate.', dur: 3.6 },
        { hoaRule: 'water_events', text: 'All water-based social events require a Puddle Permit (Form 7-W).' },
        { memory: 'water_bbq' },
        { fact: 'water_bbq' },
        { chaos: 6 },
      ],
      timeout: { sec: 3, to: 'wrap' },
    },
    wrap: {
      beat: 'aftermath',
      do: [{ if: { propState: 'valve', is: ['on', 'jammed', 'ticking'] }, then: [{ setProp: 'valve', state: 'off' }] }],
      end: true,
      linger: 1.5,
    },
  },
};

export const RANDY_FLARE_UP: IncidentDef = {
  id: 'RANDY_FLARE_UP',
  title: 'A Flavor Event',
  kind: 'major',
  tags: ['bbq', 'fire', 'randy'],
  weight: 0.5,
  cooldown: 300,
  requestOnly: true,
  requires: { all: [{ propState: 'grill', is: ['cooking', 'smoking', 'cold'] }, { heldBy: 'platter', by: 'nobody' }] },
  cast: { chef: 'randy' },
  props: { grill: 'grill', food: 'platter' },
  maxDuration: 60,
  fallback: 'campstove',
  start: 'flare',
  stages: {
    flare: {
      beat: 'complication',
      do: [
        { setProp: 'grill', state: 'flaming' },
        { fx: 'bigsmoke', at: { spot: 'grill' }, dur: 6, r: 2 },
        { sound: 'whoosh', at: { spot: 'grill' } },
        { say: 'chef', line: "That's not a fire! That's a FLAVOR EVENT!", dur: 2.6 },
        { chaos: 10 },
        { objective: "Grab the burgers before Randy's 'flavor event' gets them!", target: { prop: 'food' } },
      ],
      go: [{ when: { heldBy: 'food', by: 'player' }, to: 'saved' }],
      timeout: { sec: 8, to: 'campstove' },
    },
    saved: {
      beat: 'payoff',
      do: [
        { say: 'chef', line: 'You saved the burgers! The grill... the grill had a good run.', dur: 3 },
        { fact: 'burgers_saved_from_fire' },
        { bump: 'problems_solved' },
        { affinity: 'chef', by: 1 },
      ],
      timeout: { sec: 2.5, to: 'campstove' },
    },
    campstove: {
      beat: 'aftermath',
      do: [
        { setProp: 'grill', state: 'ruined' },
        { fx: 'smoke', at: { spot: 'grill' }, dur: 3 },
        { say: 'chef', line: "...I've been meaning to downsize.", dur: 2.4 },
        { fact: 'grill_ruined' },
        { memory: 'grill_ruined' },
        { if: { propState: 'food', is: ['grilled', 'raw'] }, then: [{ if: { heldBy: 'food', by: 'nobody' }, then: [{ setProp: 'food', state: 'dusty' }, { fact: 'burgers_singed' }] }] },
      ],
      end: true,
      linger: 2,
    },
  },
};
