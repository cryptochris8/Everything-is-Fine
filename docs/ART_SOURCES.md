# Art sources and provenance

All 3D art is **code-built** (no model files). Everything comes from AppalachAI / Athlete Domains in-house projects; there are no third-party model packs, so no licences or credits are needed. Each line below says where the code was ported from. The original projects were **only read** (copied 2026-11-07); none of them was modified.

| What | Where in this repo | Ported from |
|---|---|---|
| Shared geometry builder (`GeoBuilder`, ink hull, smooth parts), helpers, shared-resource registry, toon gradient, palette | `src/game/art/render/` | Bad Hair Day `src/render/{models/builder,common,shared}.ts`, `toon.ts`, `palette.ts` |
| **Materials (rewritten)** | `src/game/art/render/models/materials.ts` | Same API as Bad Hair Day / Trash Panda, but rewritten as WebGPU/TSL node materials following Mailbox Mayhem's Genesys port (`That-One-Mailman/src/render/models/materials.ts`). The GLSL `onBeforeCompile` originals don't run on the engine's WebGPURenderer. |
| Skinned humans: skeleton, body/head/hair/outfit kits, animation (walk/jog blend, ~30 gestures, 15 expressions, emotes), IK | `src/game/art/family/` | Bad Hair Day `src/family/` (minus `index.ts`). The brushable-hair module isn't ported: `src/game/art/hair/types.ts` is a stub. |
| Pleasant Pines cast outfits (Randy, Linda, Earl, Granny, Todd, the player) | `src/game/art/neighbors.ts` | **Original**, built with the Bad Hair Day kit. None of Bad Hair Day's family looks are used (they depict a real family). |
| Brisket (skinned dog) | `src/game/art/people.ts` → `family/dog.ts` | Bad Hair Day `DogRig` (golden coat) |
| Houses (6 styles), props, scenery, fences, cans, loot | `src/game/art/tp/` | Trash Panda Trouble `src/render/models/{houses,props,scenery,cans,loot,types,textures}.ts`, `sim/types.ts`, `render/palette.ts`, `toon.ts`. Its builder, common, shared and materials are shims onto the shared copies. |
| Golf cart, Mow-Bot, trampoline, kettle grill, camp stove, moving boxes, gnome, platter and burgers, chickens, Earl's workshop | `src/game/art/yard.ts` | **Original**, in the same kit and style |
| Sky panorama | `assets/textures/sky_toon_hills.webp` | Chris's Skybox library, `C:\Users\chris\Skybox\library\web\m4-toon-hills.webp` (Blockade Labs, AppalachAI-owned; see `Skybox\LICENSING.md`) |

**Not used, and why:**
- **AppalachAI Meshy library** (`3D-assets/Appalachai-Assets`):
  - It's a different (textured) style.
  - Files are 2–8 MB each.
  - The items are also sold commercially, and shipping them inside the game would make them downloadable.
  - It stays available as a fallback.
- **HYTOPIA packs** (`C:\Users\chris\assets`, `Hytopia-games/*`): their licence allows use on the HYTOPIA platform only.
- **Sketchfab zips:** the licences are mixed or unclear.

**Comparison switch:** `?oldart=1` restores the session-1 primitive look; `?gallery=1` lines up the ported models on the street.
