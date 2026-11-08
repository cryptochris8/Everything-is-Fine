/**
 * Pleasant Pines, one street. Shared by the simulation (zones, homes, waypoints) and the
 * Genesys adapter (which builds houses, lawns and props at these coordinates).
 *
 * Axes: X runs along the street (west → east), Z across it (south → north). Metres.
 * The player's new house is on the south side at x = 0; the camera starts looking north
 * at Randy's barbecue (front-left) and Todd's trampoline (front-right), so the opening gag
 * and the first favour are both in frame within seconds.
 */
import type { Vec2 } from '../core/vec.js';

export interface RectZone {
  kind: 'rect';
  id: string;
  label: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface CircleZone {
  kind: 'circle';
  id: string;
  label: string;
  center: Vec2;
  radius: number;
}

export type Zone = RectZone | CircleZone;

export const WORLD_BOUNDS = { minX: -50, maxX: 50, minZ: -34, maxZ: 34 } as const;

/** Street asphalt half-width; sidewalks run from |z| = 4 to 6. */
export const STREET_HALF_WIDTH = 4;
export const SIDEWALK_OUTER = 6;

export const PLAYER_SPAWN: Vec2 = { x: 0, z: -7.5 };
/** Spawn yaw: facing +Z (north, toward Randy and Todd). */
export const PLAYER_SPAWN_YAW = 0;

export interface HouseDef {
  id: string;
  owner: string;
  /** Centre of the house footprint. */
  center: Vec2;
  width: number;
  depth: number;
  /** Which way the front door faces: +1 = north (+Z), -1 = south. */
  facing: 1 | -1;
  wall: string;
  roof: string;
  trim: string;
  lot: RectZone;
}

const lot = (id: string, label: string, cx: number, north: boolean): RectZone => ({
  kind: 'rect',
  id,
  label,
  minX: cx - 11,
  maxX: cx + 11,
  minZ: north ? SIDEWALK_OUTER : -34,
  maxZ: north ? 34 : -SIDEWALK_OUTER,
});

export const HOUSES: readonly HouseDef[] = [
  { id: 'linda_house', owner: 'linda', center: { x: -36, z: 26 }, width: 13, depth: 9, facing: -1, wall: '#f6f1e6', roof: '#5a6b8c', trim: '#ffffff', lot: lot('linda_yard', "Linda's yard", -36, true) },
  { id: 'randy_house', owner: 'randy', center: { x: -12, z: 27 }, width: 13, depth: 9, facing: -1, wall: '#f2b880', roof: '#b04a3a', trim: '#fff4e0', lot: lot('randy_yard', "Randy's yard", -12, true) },
  { id: 'todd_house', owner: 'todd', center: { x: 12, z: 27 }, width: 12, depth: 9, facing: -1, wall: '#9fd8cb', roof: '#2f7f73', trim: '#ffffff', lot: lot('todd_yard', "Todd's yard", 12, true) },
  { id: 'earl_house', owner: 'earl', center: { x: 34, z: 27 }, width: 12, depth: 9, facing: -1, wall: '#d9d27a', roof: '#6d5a3a', trim: '#f5f0d0', lot: lot('earl_yard', "Earl's yard", 36, true) },
  { id: 'granny_house', owner: 'granny', center: { x: -24, z: -26 }, width: 12, depth: 9, facing: 1, wall: '#f4c6d6', roof: '#8a4f7d', trim: '#ffffff', lot: lot('granny_yard', "Granny's yard", -24, false) },
  { id: 'player_house', owner: 'player', center: { x: 0, z: -26 }, width: 12, depth: 9, facing: 1, wall: '#cfe3f7', roof: '#3d5f8f', trim: '#ffffff', lot: lot('player_yard', 'Your yard', 0, false) },
];

export const ZONES: readonly Zone[] = [
  ...HOUSES.map((h) => h.lot),
  { kind: 'rect', id: 'park', label: 'Pleasant Pines Park', minX: 13, maxX: 50, minZ: -34, maxZ: -6 },
  { kind: 'rect', id: 'street', label: 'Maple Street', minX: -50, maxX: 50, minZ: -SIDEWALK_OUTER, maxZ: SIDEWALK_OUTER },
  { kind: 'rect', id: 'earl_garage', label: "Earl's garage", minX: 37, maxX: 45, minZ: 12, maxZ: 21 },
  { kind: 'circle', id: 'sprinkler_zone', label: "Randy's sprinkler", center: { x: -9, z: 11.5 }, radius: 5.5 },
  { kind: 'circle', id: 'bbq_area', label: "Randy's cookout", center: { x: -11, z: 12 }, radius: 7 },
  { kind: 'circle', id: 'granny_garden', label: "Granny's prize garden", center: { x: -31, z: -13 }, radius: 4 },
  { kind: 'circle', id: 'linda_hedges', label: "Linda's hedges", center: { x: -36, z: 9 }, radius: 5 },
];

/** Fixed landmarks the sim and adapter both refer to by name. */
export const SPOTS = {
  welcomeSign: { x: -46, z: 7.5 },
  hoaBoard: { x: -24, z: 7 },
  grill: { x: -14, z: 12 },
  grillTable: { x: -15.8, z: 13.2 },
  picnicTable: { x: -7.5, z: 12 },
  randyPorch: { x: -12, z: 21 },
  randyRoof: { x: -12, z: 25.5 },
  randyLawnWest: { x: -19, z: 9 },
  randyLawnEast: { x: -4, z: 15 },
  toddLawn: { x: 6, z: 12 },
  earlLawn: { x: 30, z: 13 },
  lindaLawn: { x: -30, z: 14 },
  streetMid: { x: -2, z: 0 },
  streetGranny: { x: -24, z: -1 },
  streetEarl: { x: 28, z: 0 },
  playerLawn: { x: -4, z: -14 },
  dogHouse: { x: -19, z: 18 },
  sprinklerValve: { x: -3.5, z: 8 },
  sprinklerHead: { x: -9, z: 11.5 },
  trampoline: { x: 12, z: 17 },
  toddLanding: { x: 6.5, z: -1.5 },
  earlGarage: { x: 41, z: 16.5 },
  earlWorkbench: { x: 42.5, z: 19 },
  charcoalShelf: { x: 39, z: 19.5 },
  earlMailbox: { x: 30, z: 7 },
  coop: { x: 44, z: 28 },
  coopGate: { x: 41, z: 25.5 },
  cartPark: { x: -20, z: -9.5 },
  grannyPorch: { x: -24, z: -20 },
  grannyGarden: { x: -31, z: -13 },
  lindaPorch: { x: -36, z: 20 },
  lindaHedges: { x: -36, z: 9 },
  lindaGnome: { x: -30, z: 11 },
  playerPorch: { x: 0, z: -20 },
  movingBoxes: { x: 3, z: -10 },
  park: { x: 30, z: -18 },
  gazebo: { x: 32, z: -20 },
  streetWest: { x: -44, z: 0 },
  streetEast: { x: 46, z: 0 },
  squirrel: { x: -18, z: -5.2 },
} as const satisfies Record<string, Vec2>;

export type SpotId = keyof typeof SPOTS;

export function isSpotId(id: string): id is SpotId {
  return Object.prototype.hasOwnProperty.call(SPOTS, id);
}

export function zoneById(id: string): Zone | undefined {
  return ZONES.find((z) => z.id === id);
}

export function inZone(p: Vec2, zone: Zone): boolean {
  if (zone.kind === 'rect') {
    return p.x >= zone.minX && p.x <= zone.maxX && p.z >= zone.minZ && p.z <= zone.maxZ;
  }
  return Math.hypot(p.x - zone.center.x, p.z - zone.center.z) <= zone.radius;
}

export function zoneCenter(zone: Zone): Vec2 {
  if (zone.kind === 'circle') {
    return { ...zone.center };
  }
  return { x: (zone.minX + zone.maxX) / 2, z: (zone.minZ + zone.maxZ) / 2 };
}

/** The friendliest name for where a point is (for captions and news). */
export function describeLocation(p: Vec2): string {
  const priority = ['earl_garage', 'sprinkler_zone', 'granny_garden', 'linda_hedges', 'bbq_area'];
  for (const id of priority) {
    const z = zoneById(id);
    if (z && inZone(p, z)) {
      return z.label;
    }
  }
  for (const z of ZONES) {
    if (z.kind === 'rect' && z.id !== 'street' && inZone(p, z)) {
      return z.label;
    }
  }
  return 'the middle of Maple Street';
}

export function inBounds(p: Vec2, margin = 0): boolean {
  return (
    p.x >= WORLD_BOUNDS.minX + margin &&
    p.x <= WORLD_BOUNDS.maxX - margin &&
    p.z >= WORLD_BOUNDS.minZ + margin &&
    p.z <= WORLD_BOUNDS.maxZ - margin
  );
}
