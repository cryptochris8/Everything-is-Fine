/**
 * Street dressing built from the ported Trash Panda Trouble models: one house per lot (six
 * styles), plus helpers to drop TP props into the world. Pure placement; the Neighborhood
 * keeps the colliders, paths and gameplay layout.
 */
import * as THREE from 'three';

import type { HouseDef as LayoutHouse } from '../../sim/world/layout.js';
import { sceneryMaterial } from './render/models/materials';
import { createHouse } from './tp/render/models/houses';
import { createProp } from './tp/render/models/props';
import { fenceGeometry } from './tp/render/models/scenery';
import type { HouseModel } from './tp/render/models/types';
import type { FenceStyle, HouseDef, HouseStyle, PropKind } from './tp/sim/types';

/** Who lives in which style. Randy's two floors give the roof gag something to land on. */
export const HOUSE_STYLE: Readonly<Record<string, HouseStyle>> = {
  randy: 'twoStory',
  linda: 'colonial',
  todd: 'aFrame',
  earl: 'ranch',
  granny: 'cottage',
  player: 'bungalow',
};

/** Rough peak height (m above the ground) per style, for colliders. */
export const HOUSE_HEIGHT: Readonly<Record<HouseStyle, number>> = {
  ranch: 5,
  cottage: 6,
  twoStory: 8,
  bungalow: 5,
  aFrame: 6.5,
  colonial: 8,
};

/** TP HouseDef for a layout house. TP houses face +Z at yaw 0 ("front faces (sin yaw, cos yaw)"). */
export function tpHouseDef(h: LayoutHouse, index: number): HouseDef {
  const style = HOUSE_STYLE[h.owner] ?? 'ranch';
  const yaw = h.facing === -1 ? Math.PI : 0;
  const frontZ = h.center.z + h.facing * (h.depth / 2 + 0.6);
  return {
    id: index,
    lotId: index,
    style,
    x: h.center.x,
    z: h.center.z,
    w: h.width,
    d: h.depth,
    yaw,
    wallColor: h.wall,
    roofColor: h.roof,
    trimColor: h.trim,
    doorColor: ['#d9534f', '#3b7dd8', '#f0ad4e', '#5cb85c', '#9b59b6', '#ffffff'][index % 6]!,
    door: { x: h.center.x, z: frontZ },
    porch: { x: h.center.x + 1.2, z: frontZ },
    motionLight: false,
    windowSeed: ((index * 37) % 10) / 10,
    garageSide: 0,
  };
}

/** Build the house model for a layout house, placed and rotated in world space (y = ground). */
export function buildHouse(h: LayoutHouse, index: number, groundY: number): HouseModel {
  const def = tpHouseDef(h, index);
  const m = createHouse(def);
  m.root.position.set(def.x, groundY, def.z);
  m.root.rotation.y = def.yaw;
  m.setWindowsLit(0);
  return m;
}

/** Drop a Trash Panda prop (scenery, furniture, vehicles) at a ground point. TP props face +Z at yaw 0. */
export function placeProp(
  parent: THREE.Object3D,
  kind: PropKind,
  variant: number,
  x: number,
  z: number,
  groundY: number,
  yaw = 0,
  scale: number | readonly [number, number, number] = 1,
): THREE.Object3D {
  const o = createProp(kind, variant);
  o.position.set(x, groundY, z);
  o.rotation.y = yaw;
  if (typeof scale === 'number') {
    o.scale.setScalar(scale);
  } else {
    o.scale.set(scale[0], scale[1], scale[2]);
  }
  o.castShadow = true;
  o.receiveShadow = true;
  parent.add(o);
  return o;
}

/** A straight fence run from a to b (TP fence styles: picket, wood, hedge, chainlink). */
export function placeFence(parent: THREE.Object3D, style: FenceStyle, ax: number, az: number, bx: number, bz: number, height: number, groundY: number): THREE.Object3D {
  const len = Math.hypot(bx - ax, bz - az);
  const mesh = new THREE.Mesh(fenceGeometry(style, len, height), sceneryMaterial());
  // Fence geometry runs along local +X from the origin.
  mesh.position.set(ax, groundY, az);
  mesh.rotation.y = -Math.atan2(bz - az, bx - ax);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}
