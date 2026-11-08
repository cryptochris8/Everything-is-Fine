/**
 * Build `.dist/` without Studio.
 *
 * The dev launcher (`scripts/genesys/dev/launcher.ts`) resolves every `@project/...`
 * asset to `/.dist/...` (DevStorageProvider.projectLogicalPathToDistUrl), and
 * `GameRuntime.startGame` downloads `@project/game.js` as *text* and evaluates it with
 * `new Function('require', 'module', 'exports', bundle)` — a CommonJS module whose
 * `require` only resolves four names: '@gnsx/genesys.js', 'three', 'three/tsl',
 * 'three/webgpu' (`InjectedDependencies.ts:81-94`). So the bundle must be CJS with
 * those four external.
 *
 * Normally Studio produces `.dist` (`pnpm build-project` just RPCs the editor and fails
 * with "make sure it is running and open the project in it"). This reproduces it with
 * esbuild so the spike can be looked at in a plain browser, with no editor in the loop.
 */

import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { build } from 'esbuild';

const DIST = '.dist';

rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });

await build({
  entryPoints: ['src/game.ts'],
  outfile: `${DIST}/game.js`,
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  target: 'es2021',
  sourcemap: false,
  external: ['@gnsx/genesys.js', 'three', 'three/tsl', 'three/webgpu'],
});

// The runtime reads the project file and the scene/asset tree out of .dist too.
cpSync('EverythingIsFine.genesys-project', `${DIST}/EverythingIsFine.genesys-project`);
cpSync('assets', `${DIST}/assets`, { recursive: true });

console.log('built .dist (game.js + project file + assets)');
