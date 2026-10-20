// Locates the build toolchain.
//
// xqi18n itself declares esbuild and typescript as devDependencies, but the
// committed-dist workflow only needs them when regenerating `lib/`. To keep the
// repository usable without a first install, resolution falls back to the
// sibling packages in this workspace before giving up.

import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const at = (...parts) => resolve(root, ...parts);

const SEARCH_PATHS = [
  root,
  resolve(root, '..', 'xqclip'),
  resolve(root, '..', 'xqeditor'),
];

function requireFrom(base) {
  return createRequire(resolve(base, 'package.json'));
}

/** Load a CommonJS-shaped devDependency from the first location that has it. */
export function loadDependency(name) {
  const failures = [];
  for (const base of SEARCH_PATHS) {
    try {
      const load = requireFrom(base);
      return { module: load(name), resolved: load.resolve(name), base };
    } catch (error) {
      failures.push(`${base}: ${error.code || error.message}`);
    }
  }
  throw new Error(
    `Cannot resolve "${name}". Run "npm install" in ${root}, or install it next to this package.\n` +
      failures.join('\n'),
  );
}

/** Absolute path of the tsc entry script. */
export async function resolveTsc() {
  for (const base of SEARCH_PATHS) {
    try {
      const load = requireFrom(base);
      // TypeScript 7 does not export ./bin/tsc, so read the manifest instead.
      const manifestPath = load.resolve('typescript/package.json');
      const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
      const relative = typeof manifest.bin === 'string' ? manifest.bin : manifest.bin?.tsc;
      if (relative) {
        return resolve(dirname(manifestPath), relative);
      }
    } catch {
      // Try the next location.
    }
  }
  throw new Error(`Cannot resolve "typescript". Run "npm install" in ${root}.`);
}
