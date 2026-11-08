/**
 * EVERYTHING IS FINE! — Welcome to Pleasant Pines.
 * AppalachAI Studios · The Sandbox Studio (Genesys engine 18).
 *
 * Good neighbors. Bad decisions. Endless possibilities.
 *
 * Engine-agnostic comedy simulation lives in src/sim (tested headless); the Genesys adapter
 * (rendering, input, HUD, audio) lives in src/game.
 */
import * as ENGINE from '@gnsx/genesys.js';

import { PleasantPinesGameMode } from './game/GameMode.js';
import { installAssetManifest } from './game/ShippedAssets.js';

class EverythingIsFineGame extends ENGINE.BaseGameLoop {}

export function main(container: HTMLElement, options?: Partial<ENGINE.BaseGameLoopOptions>): ENGINE.IGameLoop {
  installAssetManifest();
  const merged: Partial<ENGINE.BaseGameLoopOptions> = {
    ...options,
    defaultGameModeClass: PleasantPinesGameMode,
    // Explicit, never 'auto' ('auto' shows sticks on any touchscreen laptop).
    // Off: the Athlete Domains floating stick + drag-to-look are drawn by the HUD (src/game/athlete.ts).
    virtualJoystickOptions: { enabled: false },
  };
  return new EverythingIsFineGame(container, merged);
}
