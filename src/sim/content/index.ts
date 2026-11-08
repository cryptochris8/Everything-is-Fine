/** The whole content catalog. Add new incidents here; `validateContent` checks them at startup. */
import type { SimContent } from '../sim.js';
import { AMBIENT } from './incidents/ambient.js';
import {
  AUTO_FLIPPER,
  BBQ_MISSION,
  DOG_STEALS_BURGERS,
  GRANNY_CART_DELIVERY,
  LINDA_CHARCOAL_PERMIT,
  QUIET_WALK,
  RANDY_FLARE_UP,
  SPRINKLER_SURPRISE,
} from './incidents/bbq.js';
import { ENCOUNTERS } from './incidents/encounters.js';
import { BLOCK_PARTY } from './incidents/finale.js';

export const INCIDENTS = [
  BBQ_MISSION,
  QUIET_WALK,
  GRANNY_CART_DELIVERY,
  LINDA_CHARCOAL_PERMIT,
  DOG_STEALS_BURGERS,
  AUTO_FLIPPER,
  SPRINKLER_SURPRISE,
  RANDY_FLARE_UP,
  ...ENCOUNTERS,
  ...AMBIENT,
  BLOCK_PARTY,
] as const;

export const CONTENT: SimContent = { incidents: INCIDENTS, missionId: 'BBQ' };
