/**
 * `pnpm test`: runs every `*.test.ts` file under `test/` with QUnit through tsx.
 *
 * Tests live in `test/`, not `src/`: the build bundles every file in `src/` into the game.
 * Extra arguments go to QUnit, for example `pnpm test --filter "score"`.
 * A project with no tests exits 0, so a new project passes `pnpm test`.
 */
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';

import { getProjectRoot } from './common.js';

const TEST_FILE = /\.test\.tsx?$/;

function findTestFiles(dir: string, root: string): string[] {
  if (!fs.existsSync(dir)) {
    return [];
  }
  const files: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findTestFiles(abs, root));
    } else if (TEST_FILE.test(entry.name)) {
      files.push(path.relative(root, abs));
    }
  }
  return files.sort();
}

const root = getProjectRoot();
const files = findTestFiles(path.join(root, 'test'), root);
if (files.length === 0) {
  console.log('No unit tests yet. Add *.test.ts files under test/.');
  process.exit(0);
}

const qunit = path.join(root, 'node_modules', 'qunit', 'bin', 'qunit.js');
if (!fs.existsSync(qunit)) {
  console.error('QUnit is not installed. Run pnpm install.');
  process.exit(1);
}

const result = spawnSync(process.execPath, ['--import', 'tsx', qunit, ...process.argv.slice(2), ...files], {
  cwd: root,
  stdio: 'inherit',
});
process.exit(result.status ?? 1);
