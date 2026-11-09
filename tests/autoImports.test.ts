/** src/auto-imports.ts must exist and match what Studio 18 writes, or Studio's build fails. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { autoImportsText, compareEntryNames, listSourceFiles } from '../tools/gen-auto-imports.mjs';

test('auto-imports: Studio order (ordinal, upper-cased) puts game/ before game-data.ts', () => {
  assert.ok(compareEntryNames('game', 'game-data.ts') < 0);
  assert.ok(compareEntryNames('GameAudio.ts', 'audioPlan.ts') > 0);
  assert.equal(compareEntryNames('a', 'A'), 0);
});

test('auto-imports: skips game.ts and itself, one import per file, .js specifiers', () => {
  const text = autoImportsText(['auto-imports.ts', 'game.ts', 'game/Show.ts', 'sim/sim.ts']);
  assert.equal(text, "import './game/Show.js';\nimport './sim/sim.js';\n");
});

test('auto-imports: the committed file is current (regenerate with node tools/gen-auto-imports.mjs)', () => {
  const files = listSourceFiles('src');
  assert.ok(!files.some((f) => /\.test\.ts$/.test(f)), 'no tests under src/: Studio would bundle them');
  assert.equal(readFileSync('src/auto-imports.ts', 'utf8'), autoImportsText(files));
});
