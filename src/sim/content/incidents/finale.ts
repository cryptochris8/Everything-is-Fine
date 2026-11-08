/**
 * The Chaos finale (blueprint 02): at 100 chaos, Pleasant Pines does not "game over" — it
 * throws a safe, exaggerated block party, then settles back to a manageable baseline.
 */
import type { IncidentDef } from '../../comedy/types.js';

export const BLOCK_PARTY: IncidentDef = {
  id: 'BLOCK_PARTY',
  title: 'Block Party Mode',
  kind: 'finale',
  tags: ['finale', 'big'],
  weight: 1,
  cooldown: 60,
  cast: {},
  maxDuration: 25,
  fallback: 'calm',
  start: 'alarm',
  stages: {
    alarm: {
      beat: 'payoff',
      do: [
        { caption: 'CHAOS LEVEL: MAXIMUM. Pleasant Pines has entered... BLOCK PARTY MODE.', dur: 3.6 },
        { sound: 'fanfare' },
        { fx: 'confetti', at: { spot: 'streetMid' }, dur: 4, r: 8 },
        { fx: 'fireworks', at: { spot: 'park' }, dur: 5, r: 6 },
        { if: { available: 'granny' }, then: [{ recruit: 'granny', as: 'granny' }, { route: 'granny', via: ['streetGranny', 'streetMid', 'streetGranny', 'cartPark'], style: 'drive' }, { say: 'granny', line: 'WOOOO! Victory lap!', dur: 2 }] },
        { if: { available: 'earl' }, then: [{ recruit: 'earl', as: 'earl' }, { say: 'earl', line: "Fireworks! I've been saving these for an emergency! This feels like one!", dur: 3 }] },
        { if: { available: 'todd' }, then: [{ recruit: 'todd', as: 'todd' }, { hop: 'todd', to: { spot: 'trampoline' }, height: 16, dur: 3 }] },
        { if: { available: 'dog' }, then: [{ recruit: 'dog', as: 'dog' }, { route: 'dog', via: ['streetMid', 'toddLanding', 'streetMid', 'dogHouse'], style: 'sprint' }] },
        { fact: 'block_party' },
      ],
      timeout: { sec: 6, to: 'speech' },
    },
    speech: {
      beat: 'payoff',
      do: [
        {
          if: { available: 'linda' },
          then: [{ recruit: 'linda', as: 'linda' }, { say: 'linda', line: 'Everyone remain calm! Remain CALM! ...Everything is FINE!', dur: 3.2 }],
          else: [{ caption: 'Somewhere, Linda shouts: "EVERYTHING IS FINE!"', dur: 3 }],
        },
        { fx: 'confetti', at: { player: true }, dur: 2.5, r: 3 },
      ],
      timeout: { sec: 4, to: 'calm' },
    },
    calm: {
      beat: 'aftermath',
      do: [
        { chaos: -65 },
        { caption: 'And just like that... everything is fine.', dur: 3 },
        { award: 'block_party', text: 'Survived a Pleasant Pines Block Party. (Commemorative paper hat.)' },
      ],
      end: true,
      linger: 2,
    },
  },
};
