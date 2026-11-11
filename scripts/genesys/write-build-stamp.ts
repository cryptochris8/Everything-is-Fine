import fs from 'fs';
import path from 'path';

import { getProjectRoot } from './common.js';

const editorDir = path.join(getProjectRoot(), '.editor');
fs.mkdirSync(editorDir, { recursive: true });
const stampPath = path.join(editorDir, 'build-stamp.json');
let previous: Record<string, unknown> = {};
try {
  const parsed = JSON.parse(fs.readFileSync(stampPath, 'utf8')) as unknown;
  if (typeof parsed === 'object' && parsed !== null) {
    previous = parsed as Record<string, unknown>;
  }
} catch {
  // First stamp, or an unreadable file — write a fresh one.
}
fs.writeFileSync(
  stampPath,
  `${JSON.stringify({ ...previous, builtAt: new Date().toISOString() }, null, 2)}\n`,
  'utf8',
);
