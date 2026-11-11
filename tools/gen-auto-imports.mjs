/**
 * Write src/auto-imports.ts exactly as Sandbox Studio 19 does on every build.
 *
 * Studio's build bundles a virtual entry (`import './auto-imports.js'; export * from './game.js'`), so the
 * file must exist or the build fails with `Could not resolve "./auto-imports.js"`. When it exists, Studio
 * regenerates it to import EVERY `.ts` under src/ except game.ts and itself (skipping only node_modules,
 * .git, .engine, .editor, .dist). Anything that must not ship (tests, dev fixtures) therefore lives
 * outside src/. Source: Studio 18.0.0 app.asar, buildProject(); order re-checked against Studio 19.0.1, 2026-11-10.
 */

import { readdirSync, writeFileSync } from 'node:fs';
import { join, posix, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const EXCLUDED_FOLDERS = ['node_modules', '.git', '.engine', '.editor', '.dist'];

/**
 * Studio 19's order: every file's src-relative path (forward slashes), sorted ordinal on the upper-cased path.
 * So `game-data.ts` comes before `game/...` ('-' < '/'), and `athlete.ts` before `AthleteControl.ts`.
 * (Studio 18 walked folder by folder and put `game/` first; 19.0.1 changed that, 2026-11-10.)
 */
export function compareEntryNames(a, b) {
  const x = a.toUpperCase();
  const y = b.toUpperCase();
  return x < y ? -1 : x > y ? 1 : 0;
}

/** Every .ts file under `dir`, as paths relative to `dir` with forward slashes, in Studio's order. */
export function listSourceFiles(dir) {
  const out = [];
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      if (e.isDirectory()) {
        if (!EXCLUDED_FOLDERS.includes(e.name)) walk(join(d, e.name));
      } else if (e.name.endsWith('.ts')) {
        out.push(relative(dir, join(d, e.name)).split(sep).join(posix.sep));
      }
    }
  };
  walk(dir);
  return out.sort(compareEntryNames);
}

/** The auto-imports.ts text Studio would write for these src-relative paths. */
export function autoImportsText(files) {
  return files
    .filter((f) => !f.includes('auto-imports.ts') && !f.includes('game.ts'))
    .map((f) => `import './${f.replace(/\.ts$/, '.js')}';\n`)
    .join('');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const text = autoImportsText(listSourceFiles('src'));
  writeFileSync('src/auto-imports.ts', text);
  console.log(`auto-imports: ${text.split('\n').length - 1} imports -> src/auto-imports.ts`);
}
