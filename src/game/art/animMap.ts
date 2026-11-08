/**
 * Sim animation vocabulary → Bad Hair Day rig gestures and faces. Pure (no engine), so it is
 * unit-tested in tests/art.test.ts; CastViews.ts applies it.
 */
import type { ActorAnim } from '../../sim/comedy/types.js';
import type { Action, DogAction, Expression } from './family/types.js';

/** What each sim animation looks like on a human rig: a looping gesture and a face. */
export function humanAnimFor(anim: ActorAnim): { action: Action | null; loop: boolean; face: Expression } {
  switch (anim) {
    case 'wave':
      return { action: 'wave', loop: true, face: 'happy' };
    case 'cheer':
      return { action: 'cheer', loop: true, face: 'joy' };
    case 'dance':
      return { action: 'dance', loop: true, face: 'joy' };
    case 'facepalm':
      return { action: 'facepalm', loop: false, face: 'pout' };
    case 'shrug':
      return { action: 'shrug', loop: false, face: 'worried' };
    case 'point':
      return { action: 'point', loop: true, face: 'determined' };
    case 'flail':
    case 'spin':
      return { action: 'noooo', loop: true, face: 'dramatic' };
    case 'write':
      return { action: 'inspect', loop: true, face: 'smug' };
    case 'grill':
      return { action: 'grab', loop: true, face: 'determined' };
    case 'proud':
      return { action: 'thumbsUp', loop: false, face: 'proud' };
    case 'tumble':
      return { action: 'noooo', loop: true, face: 'eek' };
    case 'sit':
      return { action: null, loop: false, face: 'neutral' };
    default:
      return { action: null, loop: false, face: 'neutral' };
  }
}

/** Dog animations. */
export function dogAnimFor(anim: ActorAnim): { action: DogAction | null; loop: boolean; sit: boolean } {
  switch (anim) {
    case 'sniff':
      return { action: 'sniff', loop: true, sit: false };
    case 'beg':
      return { action: 'beg', loop: true, sit: false };
    case 'sit':
      return { action: null, loop: false, sit: true };
    case 'dance':
    case 'cheer':
      return { action: 'zoomies', loop: true, sit: false };
    case 'spin':
    case 'flail':
      return { action: 'shake', loop: true, sit: false };
    default:
      return { action: null, loop: false, sit: false };
  }
}
