/**
 * People and dogs from the ported Bad Hair Day character kit (src/game/art/family).
 * Bad Hair Day's family looks belong to that game, so nothing here uses them: extras are
 * the generic seeded townsfolk, and the Pleasant Pines cast gets its own outfits
 * (src/game/art/neighbors.ts).
 */
import type { Persona } from './family/anim';
import { HumanRig } from './family/character';
import { DogRig } from './family/dog';
import { buildExtra, extraKey, extraLook } from './family/outfits';
import type { Character, Dog, DogLook, ExtraKind } from './family/types';

const EXTRA_PERSONA: Readonly<Record<ExtraKind, Persona>> = {
  crossingGuard: 'guard',
  jogger: 'extra',
  teacher: 'extra',
  kid: 'kid',
  neighbor: 'neighbor',
};

/** A seeded generic townsperson (same construction as Bad Hair Day's createExtra, minus brushable hair). */
export function createExtra(kind: ExtraKind, seed: number): Character {
  const k: ExtraKind = kind in EXTRA_PERSONA ? kind : 'neighbor';
  const x = extraLook(k, Number.isFinite(seed) ? Math.floor(seed) : 1);
  const key = 'extra|' + extraKey(x);
  const rig = new HumanRig({
    id: 'extra',
    spec: x.spec,
    persona: EXTRA_PERSONA[k],
    flavor: 'extra',
    key: () => key,
    build: (_outfit, r) => buildExtra(x, r),
    outfit: 'day',
    hair: null,
    beard: false,
    low: true,
    hairSim: x.hair === 'ponytail' && k !== 'crossingGuard' ? 'ponytail' : x.hair === 'none' ? 'none' : 'bounce',
    seed: seed | 0,
  });
  if (k === 'neighbor') {
    rig.setHold('none');
  }
  return rig;
}

export function createDog(look: DogLook): Dog {
  return new DogRig(look);
}
