/**
 * Write src/auto-imports.ts exactly as Sandbox Studio 18 does on every build.
 *
 * Studio's build bundles a virtual entry (`import './auto-imports.js'; export * from './game.js'`), so the
 * file must exist or the build fails with `Could not resolve "./auto-imports.js"`. When it exists, Studio
 * regenerates it to import EVERY `.ts` under src/ except game.ts and itself (skipping only node_modules,
 * .git, .engine, .editor, .dist). Anything that must not ship (tests, dev fixtures) therefore lives
 * outside src/. Source: Studio 18.0.0 app.asar, buildProject().
 */

import { readdirSync, writeFileSync } from 'node:fs';
import { join, posix, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const EXCLUDED_FOLDERS = ['node_modules', '.git', '.engine', '.editor', '.dist'];

/**
 * Studio's order: a depth-first walk, each folder's entries sorted the way Windows (NTFS) lists them,
 * i.e. ordinal on the upper-cased name. So `game/` (and everything in it) comes before `game-data.ts`,
 * and `GameAudio.ts` before `gameaudio`-style lower-case names. Checked against a Studio 18.0.0 build, 2026-11-04.
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
    const entries = readdirSync(d, { withFileTypes: true }).sort((p, q) => compareEntryNames(p.name, q.name));
    for (const e of entries) {
      if (e.isDirectory()) {
        if (!EXCLUDED_FOLDERS.includes(e.name)) walk(join(d, e.name));
      } else if (e.name.endsWith('.ts')) {
        out.push(relative(dir, join(d, e.name)).split(sep).join(posix.sep));
      }
    }
  };
  walk(dir);
  return out;
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
