/**
 * `?gallery=1` — a verification line-up of the ported art on the street in front of the
 * spawn: every Trash Panda prop and can, the Bad Hair Day townsfolk walking in place, and
 * the dog. Debug only; never shown in normal play.
 */
import * as ENGINE from '@gnsx/genesys.js';
import * as THREE from 'three';

import type { Character, Dog } from './family/types';
import { createDog, createExtra } from './people';
import { createCan } from './tp/render/models/cans';
import { createProp } from './tp/render/models/props';
import type { PropKind } from './tp/sim/types';

export interface Gallery {
  update(dt: number): void;
}

const PROPS: PropKind[] = ['car', 'pickup', 'van', 'grill', 'gnome', 'picnicTable', 'mailbox', 'streetlight', 'treeOak', 'treeRound', 'bush', 'doghouse', 'lawnChair', 'flamingo', 'fireHydrant'];

export function buildGallery(world: ENGINE.World, groundY: number): Gallery {
  const holder = ENGINE.SceneNode.create({ name: 'ArtGallery' });
  world.add(holder);
  const root = new THREE.Group();
  root.position.y = groundY;
  holder.add(root);

  // Props on the far side of the road, facing the player (models face +Z; the player looks +Z).
  PROPS.forEach((k, i) => {
    const o = createProp(k, (i * 37) & 255);
    o.position.set(-21 + i * 3, 0, 3.2);
    o.rotation.y = Math.PI;
    root.add(o);
  });
  const cans = [createCan('standard', null, 1), createCan('recycling', null, 2), createCan('special', 'bbqGrill', 3)];
  cans.forEach((c, i) => {
    c.root.position.set(-6 + i * 2, 0, -0.5);
    c.root.rotation.y = Math.PI;
    root.add(c.root);
  });

  // People walking in place on the near side, facing the player.
  const people: Character[] = (['neighbor', 'jogger', 'teacher', 'crossingGuard', 'kid'] as const).map((k, i) => createExtra(k, 11 + i * 7));
  people.forEach((p, i) => {
    p.root.position.set(1 + i * 1.6, 0, -1.5);
    p.root.rotation.y = Math.PI;
    root.add(p.root);
  });
  const dog: Dog = createDog({ name: 'Brisket', coat: 'golden' });
  dog.root.position.set(-2, 0, -1.5);
  dog.root.rotation.y = Math.PI;
  root.add(dog.root);

  let t = 0;
  return {
    update(dt: number) {
      t += dt;
      people.forEach((p, i) => {
        p.setMotion(i % 2 === 0 ? 0 : 1.4);
        if (i === 0 && Math.floor(t / 3) % 2 === 0 && !p.action) {
          p.play('wave');
        }
        p.update(dt);
      });
      dog.setMotion(Math.floor(t / 4) % 2 ? 2.5 : 0);
      dog.update(dt);
      for (const c of cans) {
        c.update({ dt, time: t });
      }
    },
  };
}
