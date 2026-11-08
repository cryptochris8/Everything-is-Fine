// Stub: Bad Hair Day's brushable-hair module isn't ported (Everything Is Fine! has no
// hair-brushing). HumanRig only parents `root` and calls update/dispose.
import type * as THREE from 'three';

export interface HairRig {
  readonly root: THREE.Object3D;
  update(dt: number): void;
  dispose(): void;
}

/** Head/shoulder fit the hair module sizes itself to (kept for family/spec.ts). */
export interface HairFit {
  rx: number;
  ry: number;
  rz: number;
  shoulderY: number;
  shoulderHalfWidth: number;
  backZ: number;
  neckY: number;
}
