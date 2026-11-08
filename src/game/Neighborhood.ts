/**
 * Builds Pleasant Pines, the street, from the shared layout data: lawns, asphalt, houses,
 * fences, hedges, trees, Earl's garage, the coop, the park. Everything static is batched
 * into a few vertex-coloured meshes; solid things get invisible box colliders.
 *
 * Ground top is y = G (the template's ground box). All heights are G + something.
 */
import * as ENGINE from '@gnsx/genesys.js';
import * as THREE from 'three';

import { HOUSES, SPOTS, WORLD_BOUNDS } from '../sim/world/layout.js';
import { Batch, batchMaterial } from './Batch.js';
import { HOUSE_HEIGHT, HOUSE_STYLE, buildHouse, placeFence, placeProp } from './art/street.js';
import { movingBoxesGeometry, trampolineGeometry, workshopGeometry, yardMesh } from './art/yard.js';

/** `?oldart=1` keeps the session-1 primitive look (comparison / fallback). */
const OLD_ART = new URLSearchParams(globalThis.location?.search ?? '').has('oldart');

export const G = -0.85;

const C = {
  grass: '#79c85a',
  grass2: '#6dbb4f',
  grassStripe: '#86d468',
  asphalt: '#5d6168',
  dash: '#f5d54a',
  sidewalk: '#e2dccd',
  curb: '#c9c2b2',
  driveway: '#cfc8b8',
  trunk: '#8a5a34',
  leaf: ['#4fae4a', '#5cbf55', '#3f9c46', '#6ccc5e'] as const,
  hedge: '#3f9945',
  fence: '#fbfbf5',
  wood: '#b07a45',
  darkWood: '#7c5230',
  window: '#9fd6ff',
  door: ['#d9534f', '#3b7dd8', '#f0ad4e', '#5cb85c', '#9b59b6', '#ffffff'] as const,
  metal: '#9aa3ad',
  red: '#e24c3f',
  soil: '#7a5233',
  tomato: '#ff4b3a',
  flower: ['#ff6fae', '#ffd23f', '#ffffff', '#b07cff', '#ff8a3d'] as const,
};

/** Triangular-prism roof, ridge along X. */
function roofGeometry(w: number, h: number, d: number): THREE.BufferGeometry {
  const x = w / 2;
  const z = d / 2;
  const v = [
    // front slope (−Z)
    -x, 0, -z, x, 0, -z, x, h, 0, -x, 0, -z, x, h, 0, -x, h, 0,
    // back slope (+Z)
    x, 0, z, -x, 0, z, -x, h, 0, x, 0, z, -x, h, 0, x, h, 0,
    // gables
    -x, 0, z, -x, 0, -z, -x, h, 0, x, 0, -z, x, 0, z, x, h, 0,
    // underside
    -x, 0, -z, -x, 0, z, x, 0, z, -x, 0, -z, x, 0, z, x, 0, -z,
  ];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  g.computeVertexNormals();
  return g;
}

interface Collider {
  w: number;
  h: number;
  d: number;
  x: number;
  y: number;
  z: number;
  rotY?: number;
}

export interface NeighborhoodHandles {
  /** Root of everything built here (for cleanup). */
  nodes: ENGINE.SceneNode[];
}

export function buildNeighborhood(world: ENGINE.World): NeighborhoodHandles {
  const b = new Batch();
  const colliders: Collider[] = [];
  const solid = (c: Collider) => colliders.push(c);
  const nodes: ENGINE.SceneNode[] = [];

  recolorGround(world);
  // Trash Panda Trouble street dressing (props, trees, fences, cars) lives under one node.
  const dressingNode = ENGINE.SceneNode.create({ name: 'Dressing' });
  world.add(dressingNode);
  nodes.push(dressingNode);
  const dress = new THREE.Group();
  dressingNode.add(dress);

  // ---------------------------------------------------------------- lawns and street
  const spanX = WORLD_BOUNDS.maxX - WORLD_BOUNDS.minX + 30;
  b.box(spanX, 0.04, 8, C.asphalt, 0, G + 0.02, 0);
  for (let x = WORLD_BOUNDS.minX - 10; x < WORLD_BOUNDS.maxX + 10; x += 4) {
    b.box(1.8, 0.02, 0.18, C.dash, x, G + 0.05, 0);
  }
  for (const s of [-1, 1]) {
    b.box(spanX, 0.1, 2, C.sidewalk, 0, G + 0.05, s * 5);
    b.box(spanX, 0.14, 0.25, C.curb, 0, G + 0.07, s * 4.1);
  }
  // Lawn tint per lot so yards read as separate territories.
  const lotTints = ['#76c457', '#7cca5c', '#73c254', '#80cd60', '#78c659', '#7ac85b'];
  HOUSES.forEach((h, i) => {
    const lot = h.lot;
    const cx = (lot.minX + lot.maxX) / 2;
    const cz = (lot.minZ + lot.maxZ) / 2;
    const w = lot.maxX - lot.minX - 1;
    const d = lot.maxZ - lot.minZ - 0.6;
    if (h.owner === 'linda') {
      // Linda's lawn: immaculate stripes. Of course.
      for (let k = 0; k < 11; k++) {
        b.box(w / 11, 0.03, d, k % 2 ? C.grassStripe : lotTints[i]!, lot.minX + 0.5 + (k + 0.5) * (w / 11), G + 0.015, cz);
      }
    } else {
      b.box(w, 0.03, d, lotTints[i]!, cx, G + 0.015, cz);
    }
  });

  // ---------------------------------------------------------------- houses
  const houseNode = ENGINE.SceneNode.create({ name: 'Houses' });
  world.add(houseNode);
  nodes.push(houseNode);
  HOUSES.forEach((h, i) => {
    const { x, z } = h.center;
    const fz = h.facing === -1 ? z - h.depth / 2 : z + h.depth / 2;
    const out = h.facing === -1 ? -1 : 1;
    if (OLD_ART) {
      const wallH = 4.2;
      b.box(h.width, wallH, h.depth, h.wall, x, G + wallH / 2, z);
      b.add(roofGeometry(h.width + 1.2, 2.6, h.depth + 1.4), h.roof, { x, y: G + wallH, z });
      b.box(1, 2.2, 1, '#a65a4a', x + h.width * 0.28, G + wallH + 1.6, z + 1.2);
      solid({ w: h.width, h: wallH + 2.6, d: h.depth, x, y: G + (wallH + 2.6) / 2, z });
      b.box(1.4, 2.4, 0.15, C.door[i % C.door.length], x, G + 1.2, fz + out * 0.06);
      b.box(2.4, 0.2, 1.4, C.curb, x, G + 0.1, fz + out * 0.7);
      for (const wx of [-h.width * 0.3, h.width * 0.3]) {
        b.box(2, 1.5, 0.12, C.window, x + wx, G + 2.3, fz + out * 0.06);
        b.box(2.3, 0.18, 0.2, h.trim, x + wx, G + 1.45, fz + out * 0.1);
        b.box(0.5, 1.5, 0.14, h.roof, x + wx - 1.3, G + 2.3, fz + out * 0.08);
        b.box(0.5, 1.5, 0.14, h.roof, x + wx + 1.3, G + 2.3, fz + out * 0.08);
      }
      b.box(h.width + 0.3, 0.25, h.depth + 0.3, h.trim, x, G + wallH - 0.1, z);
    } else {
      // Trash Panda Trouble house (src/game/art/street.ts): style per owner.
      const house = buildHouse(h, i, G);
      houseNode.add(house.root);
      const hh = HOUSE_HEIGHT[HOUSE_STYLE[h.owner] ?? 'ranch'];
      solid({ w: h.width, h: hh, d: h.depth, x, y: G + hh / 2, z });
    }
    // Driveway / path to the sidewalk.
    const pathLen = Math.abs(fz - out * 0.2 - (h.facing === -1 ? 6 : -6));
    b.box(2.2, 0.05, pathLen, C.driveway, x, G + 0.03, (fz + (h.facing === -1 ? 6 : -6)) / 2);
    // Mailbox by the sidewalk (Earl's is a gadget prop, drawn elsewhere).
    if (h.owner !== 'earl') {
      const mx = x + 3;
      const mz = h.facing === -1 ? 6.6 : -6.6;
      if (OLD_ART) {
        b.box(0.12, 1.1, 0.12, C.wood, mx, G + 0.55, mz);
        b.box(0.5, 0.4, 0.7, i % 2 ? '#2c3e50' : C.red, mx, G + 1.25, mz);
      } else {
        placeProp(dress, 'mailbox', i * 3, mx, mz, G, h.facing === -1 ? Math.PI : 0, 1.15);
      }
    }
  });

  // ---------------------------------------------------------------- Randy's yard
  // Picnic table + benches.
  const pt = SPOTS.picnicTable;
  if (OLD_ART) {
    b.box(3.2, 0.12, 1.4, C.wood, pt.x, G + 0.78, pt.z);
    for (const sx of [-1.3, 1.3]) {
      b.box(0.14, 0.75, 1.2, C.darkWood, pt.x + sx, G + 0.38, pt.z);
    }
    for (const sz of [-1.05, 1.05]) {
      b.box(3.2, 0.1, 0.4, C.wood, pt.x, G + 0.45, pt.z + sz);
    }
  } else {
    // Top at ~0.79 m, where the burger platter lands (sim: picnicTable y 0.8).
    placeProp(dress, 'picnicTable', 0, pt.x, pt.z, G, 0, [1.7, 1.05, 1.75]);
  }
  solid({ w: 3.2, h: 0.85, d: 1.4, x: pt.x, y: G + 0.42, z: pt.z });
  // Grill-side prep table.
  const gt = SPOTS.grillTable;
  b.box(1.4, 0.08, 0.9, '#d0d0d0', gt.x, G + 0.86, gt.z);
  for (const [dx, dz] of [[-0.6, -0.35], [0.6, -0.35], [-0.6, 0.35], [0.6, 0.35]] as const) {
    b.box(0.06, 0.86, 0.06, C.metal, gt.x + dx, G + 0.43, gt.z + dz);
  }
  // Porch table where the platter starts.
  const rp = SPOTS.randyPorch;
  b.box(1.4, 0.08, 0.9, C.wood, rp.x, G + 0.8, rp.z);
  b.box(0.12, 0.8, 0.12, C.darkWood, rp.x, G + 0.4, rp.z);
  // Dog house.
  const dh = SPOTS.dogHouse;
  if (OLD_ART) {
    b.box(1.6, 1.1, 1.6, '#c0392b', dh.x, G + 0.55, dh.z);
    b.add(roofGeometry(1.9, 0.8, 1.9), '#7f2a20', { x: dh.x, y: G + 1.1, z: dh.z }, Math.PI / 2);
    b.box(0.7, 0.75, 0.05, '#2b1a12', dh.x, G + 0.38, dh.z - 0.81);
  } else {
    placeProp(dress, 'doghouse', 1, dh.x, dh.z, G, Math.PI, 1.35);
  }
  solid({ w: 1.6, h: 1.4, d: 1.6, x: dh.x, y: G + 0.7, z: dh.z });
  // Sprinkler head (the valve itself is a prop).
  const sh = SPOTS.sprinklerHead;
  b.add(new THREE.CylinderGeometry(0.12, 0.16, 0.25, 8), C.metal, { x: sh.x, y: G + 0.12, z: sh.z });

  // ---------------------------------------------------------------- Todd's yard: fence + trampoline
  if (OLD_ART) {
    for (let x = 2; x <= 22; x += 0.5) {
      if (Math.abs(x - 12) < 1.2) {
        continue; // gate gap so you can reach the trampoline
      }
      b.box(0.12, 1.0, 0.08, C.fence, x, G + 0.5, 9.6);
    }
    b.box(9.6, 0.1, 0.06, C.fence, 6.6, G + 0.75, 9.62);
    b.box(9.6, 0.1, 0.06, C.fence, 17.4, G + 0.75, 9.62);
  } else {
    // Gate gap at x ≈ 12 so you can reach the trampoline.
    placeFence(dress, 'picket', 1.8, 9.6, 10.8, 9.6, 1.0, G);
    placeFence(dress, 'picket', 13.2, 9.6, 22.2, 9.6, 1.0, G);
  }
  solid({ w: 9.4, h: 1.1, d: 0.3, x: 6.6, y: G + 0.55, z: 9.6 });
  solid({ w: 9.4, h: 1.1, d: 0.3, x: 17.4, y: G + 0.55, z: 9.6 });
  const tr = SPOTS.trampoline;
  if (OLD_ART) {
    b.add(new THREE.CylinderGeometry(2.1, 2.1, 0.08, 20), '#1b1b2a', { x: tr.x, y: G + 0.8, z: tr.z });
    b.add(new THREE.TorusGeometry(2.15, 0.1, 6, 24), '#2e86de', { x: tr.x, y: G + 0.82, z: tr.z }, 0, Math.PI / 2);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      b.box(0.08, 0.8, 0.08, C.metal, tr.x + Math.cos(a) * 2, G + 0.4, tr.z + Math.sin(a) * 2);
    }
  } else {
    placeMesh(dress, trampolineGeometry(), 'Trampoline', tr.x, tr.z, G);
  }

  // ---------------------------------------------------------------- Linda's hedges + gnome bed
  if (OLD_ART) {
    for (let x = -45; x <= -27; x += 1.5) {
      if (Math.abs(x - -36) < 1) {
        continue; // garden path
      }
      b.add(new THREE.BoxGeometry(1.5, 1.2, 1.2), C.hedge, { x, y: G + 0.6, z: 8.6 });
    }
  } else {
    // Clipped to regulation height. Of course.
    placeFence(dress, 'hedge', -45.75, 8.6, -37, 8.6, 1.2, G);
    placeFence(dress, 'hedge', -35, 8.6, -26.25, 8.6, 1.2, G);
  }
  solid({ w: 8, h: 1.2, d: 1.2, x: -41, y: G + 0.6, z: 8.6 });
  solid({ w: 8, h: 1.2, d: 1.2, x: -31, y: G + 0.6, z: 8.6 });
  const lg = SPOTS.lindaGnome;
  b.add(new THREE.CylinderGeometry(1.6, 1.6, 0.12, 14), C.soil, { x: lg.x, y: G + 0.06, z: lg.z });
  flowers(b, lg.x, lg.z, 1.3, 10, 1);

  // ---------------------------------------------------------------- HOA board + welcome sign
  const hb = SPOTS.hoaBoard;
  b.box(0.15, 2.2, 0.15, C.darkWood, hb.x - 1, G + 1.1, hb.z);
  b.box(0.15, 2.2, 0.15, C.darkWood, hb.x + 1, G + 1.1, hb.z);
  b.box(2.4, 1.4, 0.12, '#b98b5b', hb.x, G + 1.75, hb.z);
  solid({ w: 2.4, h: 2.2, d: 0.4, x: hb.x, y: G + 1.1, z: hb.z });
  nodes.push(signNode(world, ['HOA NOTICES', 'Rules updated daily'], 2.2, 1.2, hb.x, G + 1.8, hb.z - 0.07, Math.PI, '#fff6e0', '#3a2a18'));

  const ws = SPOTS.welcomeSign;
  b.box(0.25, 2.6, 0.25, C.darkWood, ws.x - 2, G + 1.3, ws.z);
  b.box(0.25, 2.6, 0.25, C.darkWood, ws.x + 2, G + 1.3, ws.z);
  b.box(4.8, 2, 0.2, '#2f6f4f', ws.x, G + 2.2, ws.z);
  flowers(b, ws.x, ws.z - 0.6, 2, 12, 2);
  solid({ w: 4.8, h: 2.6, d: 0.5, x: ws.x, y: G + 1.3, z: ws.z });
  nodes.push(signNode(world, ['WELCOME TO', 'PLEASANT PINES', '"The Friendliest Street in America"', '(self-reported)'], 4.5, 1.8, ws.x, G + 2.2, ws.z - 0.11, Math.PI, '#2f6f4f', '#fff8e1'));

  // ---------------------------------------------------------------- Earl's garage + coop
  const gx = 41;
  const gz = 16.5;
  if (OLD_ART) {
    b.box(8.4, 3.6, 0.3, '#c9b37a', gx, G + 1.8, gz + 4.4);
    b.box(0.3, 3.6, 9, '#c9b37a', gx - 4.2, G + 1.8, gz);
    b.box(0.3, 3.6, 9, '#c9b37a', gx + 4.2, G + 1.8, gz);
    b.box(9, 0.3, 9.6, '#6d5a3a', gx, G + 3.7, gz);
    b.box(8.4, 0.03, 9, '#8c8c8c', gx, G + 0.02, gz);
  } else {
    placeMesh(dress, workshopGeometry(), 'EarlsWorkshop', gx, gz, G);
  }
  solid({ w: 8.4, h: 3.6, d: 0.3, x: gx, y: G + 1.8, z: gz + 4.4 });
  solid({ w: 0.3, h: 3.6, d: 9, x: gx - 4.2, y: G + 1.8, z: gz });
  solid({ w: 0.3, h: 3.6, d: 9, x: gx + 4.2, y: G + 1.8, z: gz });
  const wb = SPOTS.earlWorkbench;
  b.box(2.6, 0.12, 1, C.wood, wb.x, G + 0.92, wb.z);
  b.box(2.4, 0.9, 0.9, C.darkWood, wb.x, G + 0.45, wb.z);
  const cs = SPOTS.charcoalShelf;
  b.box(2, 0.08, 0.8, C.wood, cs.x, G + 0.02, cs.z);
  b.box(2, 0.08, 0.8, C.wood, cs.x, G + 1.6, cs.z + 0.2);
  b.box(0.6, 0.5, 0.4, C.red, cs.x + 0.5, G + 1.9, cs.z + 0.2); // fireworks crate. Not charcoal.
  nodes.push(signNode(world, ["EARL'S WORKSHOP", 'Inventions & Apologies'], 4, 0.9, gx, G + 3.25, gz - 4.62, Math.PI, '#ffd23f', '#2b2b2b'));
  const coop = SPOTS.coop;
  b.box(3, 2, 2.4, '#d35400', coop.x, G + 1, coop.z);
  b.add(roofGeometry(3.4, 1.2, 2.8), '#7f3000', { x: coop.x, y: G + 2, z: coop.z });
  solid({ w: 3, h: 2.6, d: 2.4, x: coop.x, y: G + 1.3, z: coop.z });
  for (let x = 37; x <= 47; x += 0.6) {
    if (Math.abs(x - SPOTS.coopGate.x) > 0.8) {
      b.box(0.06, 0.9, 0.06, C.fence, x, G + 0.45, 25.5);
    }
  }

  // ---------------------------------------------------------------- Granny's garden + cart port
  const gg = SPOTS.grannyGarden;
  b.box(6, 0.14, 4, C.soil, gg.x, G + 0.07, gg.z);
  for (let i = 0; i < 12; i++) {
    const px = gg.x - 2.4 + (i % 4) * 1.6;
    const pz = gg.z - 1.2 + Math.floor(i / 4) * 1.2;
    b.add(new THREE.ConeGeometry(0.3, 0.9, 5), '#3f8f3a', { x: px, y: G + 0.55, z: pz });
    b.add(new THREE.IcosahedronGeometry(0.13, 0), C.tomato, { x: px + 0.15, y: G + 0.6, z: pz - 0.15 });
  }
  const cp = SPOTS.cartPark;
  b.box(3.2, 0.05, 4, C.driveway, cp.x, G + 0.03, cp.z - 0.6);

  // ---------------------------------------------------------------- player's moving boxes
  const mb = SPOTS.movingBoxes;
  if (OLD_ART) {
    b.box(0.9, 0.7, 0.9, '#c8a26a', mb.x, G + 0.35, mb.z);
    b.box(0.9, 0.7, 0.9, '#c09660', mb.x + 1, G + 0.35, mb.z + 0.2, 0.3);
    b.box(0.7, 0.55, 0.7, '#d4ae78', mb.x + 0.4, G + 0.98, mb.z + 0.1, 0.5);
  } else {
    placeMesh(dress, movingBoxesGeometry(), 'MovingBoxes', mb.x, mb.z, G);
  }
  solid({ w: 2, h: 1.2, d: 1.2, x: mb.x + 0.5, y: G + 0.6, z: mb.z + 0.1 });
  // A small moving truck, for flavour.
  if (OLD_ART) {
    b.box(2.6, 2.6, 5.5, '#ffffff', 10, G + 1.6, -13.5);
    b.box(2.6, 1.6, 1.8, '#f39c12', 10, G + 1.1, -10);
    for (const [dx, dz] of [[-1.3, -15], [1.3, -15], [-1.3, -10.4], [1.3, -10.4]] as const) {
      b.add(new THREE.CylinderGeometry(0.45, 0.45, 0.3, 10), '#222222', { x: 10 + dx, y: G + 0.45, z: dz }, 0, 0, Math.PI / 2);
    }
  } else {
    // The moving van, nose to the street.
    placeProp(dress, 'van', 3, 10, -12.6, G, 0, 1.45);
  }
  solid({ w: 2.8, h: 2.9, d: 7.4, x: 10, y: G + 1.45, z: -12.6 });

  // ---------------------------------------------------------------- park: gazebo, benches, flowers
  const gzb = SPOTS.gazebo;
  b.add(new THREE.CylinderGeometry(3.4, 3.6, 0.3, 8), '#e8e0cc', { x: gzb.x, y: G + 0.15, z: gzb.z });
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    b.box(0.18, 2.6, 0.18, '#ffffff', gzb.x + Math.cos(a) * 3.1, G + 1.6, gzb.z + Math.sin(a) * 3.1);
    solid({ w: 0.3, h: 2.6, d: 0.3, x: gzb.x + Math.cos(a) * 3.1, y: G + 1.6, z: gzb.z + Math.sin(a) * 3.1 });
  }
  b.add(new THREE.ConeGeometry(4, 1.8, 8), '#c0392b', { x: gzb.x, y: G + 3.8, z: gzb.z });
  for (const [x, z] of [[22, -12], [40, -12], [26, -28]] as const) {
    if (OLD_ART) {
      b.box(2.2, 0.1, 0.6, C.wood, x, G + 0.5, z);
      b.box(2.2, 0.6, 0.1, C.wood, x, G + 0.8, z - 0.3);
    } else {
      placeProp(dress, 'bench', x, x, z, G, 0, 1.2);
    }
    solid({ w: 2.2, h: 0.9, d: 0.7, x, y: G + 0.45, z });
  }
  flowers(b, 36, -10, 2.5, 14, 3);
  flowers(b, 20, -22, 2, 10, 4);

  // ---------------------------------------------------------------- street furniture
  for (const x of [-38, -14, 10, 34]) {
    for (const s of [-1, 1]) {
      const z = s * 6.4;
      if (OLD_ART) {
        b.add(new THREE.CylinderGeometry(0.1, 0.12, 4, 6), '#3d3d3d', { x, y: G + 2, z });
        b.box(0.6, 0.3, 0.6, '#fff3b0', x, G + 4.1, z);
      } else {
        // The lamp arm reaches over the road.
        placeProp(dress, 'streetlight', 0, x, z, G, s === -1 ? 0 : Math.PI);
      }
    }
  }
  if (OLD_ART) {
    b.add(new THREE.CylinderGeometry(0.22, 0.26, 0.8, 8), C.red, { x: -18, y: G + 0.4, z: -6.5 });
  } else {
    placeProp(dress, 'fireHydrant', 0, -18, -6.5, G, 0, 1.2);
    // Parked cars at the curb, clear of every gag's path.
    placeProp(dress, 'car', 0, -44, 2.7, G, Math.PI / 2, 1.1);
    solid({ w: 4.6, h: 1.6, d: 2.1, x: -44, y: G + 0.8, z: 2.7 });
    placeProp(dress, 'pickup', 5, 40, -2.7, G, -Math.PI / 2, 1.1);
    solid({ w: 5, h: 1.9, d: 2.2, x: 40, y: G + 0.95, z: -2.7 });
  }

  // ---------------------------------------------------------------- trees (seeded, deterministic placement)
  const treeSpots: [number, number, number][] = [
    [-47, 18, 1.2], [-47, 28, 1], [-22, 31, 1.3], [-2, 31, 1.1], [24, 31, 1.2], [47, 20, 1.1], [47, 31, 1],
    [-47, -16, 1.1], [-38, -31, 1.2], [-12, -31, 1], [12, -31, 1.3], [16, -16, 1], [46, -30, 1.2], [44, -8, 1],
    [-30, 21, 0.9], [22, 20, 0.9], [-16, -14, 0.8], [8, -16, 0.9], [-3, 22, 0.8], [27, 22, 0.9],
  ];
  const TREE_KINDS = ['treeOak', 'treeRound', 'treeBirch', 'treeOak', 'treePine'] as const;
  treeSpots.forEach(([x, z, s], i) => {
    if (OLD_ART) {
      b.add(new THREE.CylinderGeometry(0.25 * s, 0.35 * s, 2.4 * s, 6), C.trunk, { x, y: G + 1.2 * s, z });
      const leaf = C.leaf[i % C.leaf.length];
      b.add(new THREE.IcosahedronGeometry(1.7 * s, 0), leaf, { x, y: G + 3.2 * s, z }, i);
      b.add(new THREE.IcosahedronGeometry(1.2 * s, 0), C.leaf[(i + 1) % C.leaf.length], { x: x + 0.6 * s, y: G + 4.2 * s, z: z - 0.3 * s }, i * 2);
    } else {
      placeProp(dress, TREE_KINDS[i % TREE_KINDS.length]!, i * 7, x, z, G, (i * 1.7) % (Math.PI * 2), s * 1.25);
    }
    solid({ w: 0.6 * s, h: 2.4 * s, d: 0.6 * s, x, y: G + 1.2 * s, z });
  });
  // Distant tree line beyond the play area so the world doesn't end at a cliff of grass.
  for (let x = -70; x <= 70; x += 7) {
    for (const z of [-44, 44]) {
      const s = 1.4 + ((x * 7 + z) % 5) * 0.1;
      if (OLD_ART) {
        b.add(new THREE.ConeGeometry(2.4 * s, 7 * s, 6), C.leaf[Math.abs(x) % 4], { x, y: G + 3.5 * s, z });
      } else {
        placeProp(dress, Math.abs(x) % 3 === 0 ? 'treeRound' : 'treePine', x + z, x, z, G, x * 0.37, s * 1.5);
      }
    }
  }
  for (let z = -40; z <= 40; z += 7) {
    for (const x of [-64, 64]) {
      if (OLD_ART) {
        b.add(new THREE.ConeGeometry(2.6, 7.5, 6), C.leaf[Math.abs(z) % 4], { x, y: G + 3.7, z });
      } else {
        placeProp(dress, 'treePine', z + x, x, z, G, z * 0.41, 2);
      }
    }
  }

  // ---------------------------------------------------------------- one batched mesh
  const mat = batchMaterial();
  const scenery = ENGINE.MeshNode.create({
    name: 'PleasantPines',
    geometry: b.build(),
    material: mat,
    castShadow: true,
    receiveShadow: true,
    physicsOptions: { enabled: false },
  });
  world.add(scenery);
  nodes.push(scenery);

  // Invisible solid colliders.
  for (const c of colliders) {
    nodes.push(addCollider(world, c));
  }
  // Keep the player on the map.
  const { minX, maxX, minZ, maxZ } = WORLD_BOUNDS;
  nodes.push(addCollider(world, { w: maxX - minX + 4, h: 6, d: 1, x: 0, y: G + 3, z: minZ - 1 }));
  nodes.push(addCollider(world, { w: maxX - minX + 4, h: 6, d: 1, x: 0, y: G + 3, z: maxZ + 1 }));
  nodes.push(addCollider(world, { w: 1, h: 6, d: maxZ - minZ + 4, x: minX - 1, y: G + 3, z: 0 }));
  nodes.push(addCollider(world, { w: 1, h: 6, d: maxZ - minZ + 4, x: maxX + 1, y: G + 3, z: 0 }));
  return { nodes };
}

function placeMesh(parent: THREE.Object3D, geo: THREE.BufferGeometry, name: string, x: number, z: number, y: number, yaw = 0): void {
  const m = yardMesh(geo, name);
  m.position.set(x, y, z);
  m.rotation.y = yaw;
  parent.add(m);
}

function flowers(b: Batch, cx: number, cz: number, r: number, n: number, salt: number): void {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + salt;
    const rr = r * (0.4 + 0.6 * (((i * 37 + salt * 11) % 10) / 10));
    const x = cx + Math.cos(a) * rr;
    const z = cz + Math.sin(a) * rr;
    b.box(0.05, 0.4, 0.05, '#3f8f3a', x, G + 0.2, z);
    b.add(new THREE.IcosahedronGeometry(0.16, 0), C.flower[(i + salt) % C.flower.length], { x, y: G + 0.45, z });
  }
}

function addCollider(world: ENGINE.World, c: Collider): ENGINE.MeshNode {
  const node = ENGINE.MeshNode.create({
    name: 'Collider',
    geometry: new THREE.BoxGeometry(c.w, c.h, c.d),
    material: new THREE.MeshBasicMaterial({ visible: false }),
    position: new THREE.Vector3(c.x, c.y, c.z),
    rotation: new THREE.Euler(0, c.rotY ?? 0, 0),
    selfHidden: true,
    castShadow: false,
    receiveShadow: false,
    physicsOptions: {
      enabled: true,
      motionType: ENGINE.PhysicsMotionType.Static,
      collisionProfile: ENGINE.DefaultCollisionProfile.BlockAll,
      collisionMeshType: ENGINE.CollisionMeshType.BoundingBox,
    },
  });
  world.add(node);
  return node;
}

function recolorGround(world: ENGINE.World): void {
  for (const n of world.getNodes(ENGINE.MeshNode)) {
    if (n.name === 'Ground') {
      n.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.isMesh) {
          mesh.material = new THREE.MeshStandardMaterial({ color: C.grass2, roughness: 1 });
          mesh.receiveShadow = true;
        }
      });
    }
  }
}

/** A flat sign with canvas-drawn text. Facing: rotY = π shows text toward −Z (the street). */
export function signNode(
  world: ENGINE.World,
  lines: string[],
  w: number,
  h: number,
  x: number,
  y: number,
  z: number,
  rotY: number,
  bg: string,
  fg: string,
): ENGINE.MeshNode {
  const canvas = document.createElement('canvas');
  const scale = 128;
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = fg;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const rows = lines.length;
  lines.forEach((line, i) => {
    const big = i === 0 || (rows > 2 && i === 1);
    const size = big ? canvas.height / (rows + 0.6) : canvas.height / (rows + 2.4);
    ctx.font = `${big ? '900' : '700'} ${Math.round(size)}px "Trebuchet MS", "Arial Rounded MT Bold", sans-serif`;
    ctx.fillText(line, canvas.width / 2, ((i + 0.5) / rows) * canvas.height, canvas.width * 0.94);
  });
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  // The engine's WebGPURenderer samples canvas textures the other way up from classic WebGL:
  // the default flipY = true rendered every sign upside down. Measured 2026-11-07 (flipY true →
  // upside down; false + flipped UVs → upside down; false + rotated UVs → rotated): plain
  // flipY = false with untouched UVs reads correctly.
  tex.flipY = false;
  const plane = new THREE.PlaneGeometry(w, h);
  const node = ENGINE.MeshNode.create({
    name: 'Sign',
    geometry: plane,
    material: new THREE.MeshBasicMaterial({ map: tex, side: THREE.FrontSide }),
    position: new THREE.Vector3(x, y, z),
    rotation: new THREE.Euler(0, rotY, 0),
    physicsOptions: { enabled: false },
  });
  world.add(node);
  return node;
}
