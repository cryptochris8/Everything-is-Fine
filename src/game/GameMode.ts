import * as ENGINE from '@gnsx/genesys.js';
import * as THREE from 'three';

import { PLAYER_SPAWN } from '../sim/world/layout.js';
import { AthleteController } from './AthleteControl.js';
import { G } from './Neighborhood.js';
import { NeighborPawn } from './Player.js';
import { Show } from './Show.js';

/**
 * Game mode: spawns the player on the sidewalk in front of their new house, facing north
 * toward Randy's barbecue and Todd's trampoline, and hands every frame to the Show.
 */
@ENGINE.GameClass()
export class PleasantPinesGameMode extends ENGINE.GameMode {
  public readonly show = new Show();

  public override initialize(options?: ENGINE.GameModeOptions): void {
    super.initialize({
      ...options,
      pawnFactory: async () => NeighborPawn.create(),
      playerControllerFactory: async () => AthleteController.create({ noPointerLock: true }),
    });
  }

  public override async spawnPlayerPawnWithTransform(id: number, pc: ENGINE.PlayerController, _pos: THREE.Vector3, _rot: THREE.Euler) {
    // Engine forward is −Z; yaw π faces +Z (north, up the street's north side).
    return super.spawnPlayerPawnWithTransform(id, pc, new THREE.Vector3(PLAYER_SPAWN.x, G + 2.5, PLAYER_SPAWN.z), new THREE.Euler(0, Math.PI, 0));
  }

  public override beginPlay(): boolean {
    if (!super.beginPlay()) {
      return false;
    }
    const world = this.getWorld();
    if (world) {
      this.show.begin(world);
    }
    return true;
  }

  public override endPlay(): boolean {
    this.show.end();
    return super.endPlay();
  }

  public override tickPrePhysics(deltaTime: number): void {
    super.tickPrePhysics(deltaTime);
    this.show.tick(deltaTime);
  }
}
