/**
 * Every shipped asset, as a LITERAL `@project/assets/...` path that survives bundling.
 *
 * Studio's editor build scans the BUILT BUNDLE for literal asset strings and copies only what
 * it finds (measured in the outgrown project, 2026-09-08: interpolated paths shipped 1 of 53
 * models; a missing file renders nothing, silently). The global assignment below is a side
 * effect the bundler can't drop. Keep in sync with assets/.
 */
export const SHIPPED_ASSETS: readonly string[] = [
  // Sky: m4-toon-hills from Chris's Skybox library (Blockade Labs, AppalachAI-owned; see
  // C:\Users\chris\Skybox\LICENSING.md). Toon-cel clouds with ink outlines, matching the models.
  '@project/assets/textures/sky_toon_hills.webp',
];

export const SKY_TEXTURE = '@project/assets/textures/sky_toon_hills.webp';

export function installAssetManifest(): void {
  (globalThis as Record<string, unknown>).__EIF_SHIPPED_ASSETS__ = SHIPPED_ASSETS;
}
