// Manifest contract.
//
// Every assertion here corresponds to something a consumer or a registry reads.
// `bin` and `type` in particular are guarded because both were wrong in 0.0.3 and
// either one silently breaks `require('xqi18n')`.

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));

test('entry fields point at the shipped builds', () => {
  assert.equal(pkg.main, 'index.js');
  assert.equal(pkg.module, 'lib/xqi18n-esm.mjs');
  assert.equal(pkg.browser, 'lib/xqi18n.min.js');
  assert.equal(pkg.unpkg, 'lib/xqi18n.min.js');
  assert.equal(pkg.jsdelivr, 'lib/xqi18n.min.js');
  assert.equal(pkg.types, 'lib/types/index.d.ts');
});

test('the package is not declared as an ES module', () => {
  // `"type": "module"` would turn index.js and lib/xqi18n.js into ESM and break
  // every existing `require('xqi18n')`.
  assert.equal(pkg.type, undefined, 'package.json must not set "type"');
});

test('no fake bin was left behind', () => {
  // 0.0.3 declared `bin: { xqi18n: index.js }`, but index.js is a library entry,
  // so `npx xqi18n` silently ran a module instead of a CLI.
  assert.equal(pkg.bin, undefined);
});

test('exports map covers both module systems and the vue subpath', () => {
  assert.deepEqual(pkg.exports['.'], {
    types: './lib/types/index.d.ts',
    import: './lib/xqi18n-esm.mjs',
    require: './lib/xqi18n.js',
    default: './lib/xqi18n.js',
  });
  assert.deepEqual(pkg.exports['./vue'], {
    types: './lib/types/vue/index.d.ts',
    import: './lib/vue/xqi18n.mjs',
    require: './lib/vue/xqi18n.js',
    default: './lib/vue/xqi18n.js',
  });
  assert.equal(pkg.exports['./lib/*'], './lib/*', 'deep paths must stay open');
  assert.equal(pkg.exports['./package.json'], './package.json');
});

test('files ships the entry, the builds and the docs', () => {
  for (const entry of ['index.js', 'lib', 'README.md', 'zh.md']) {
    assert.ok(pkg.files.includes(entry), `files is missing ${entry}`);
  }
  // Declaring `files` stops every root file from being published, so a missing
  // index.js would make `main` point at nothing.
  assert.ok(!pkg.files.some((entry) => entry.startsWith('test')), 'test pages must not ship');
  assert.ok(!pkg.files.includes('deploy.sh'), 'deploy.sh must not ship');
});

test('scripts run the real suite instead of failing on purpose', () => {
  assert.ok(pkg.scripts.test.startsWith('node --test'), 'test must run node --test');
  assert.ok(!pkg.scripts.test.includes('exit 1'), 'the placeholder failure is still there');
  assert.ok(pkg.scripts.pretest.includes('scripts/build.mjs'), 'pretest must rebuild');
  assert.ok(pkg.scripts['test:browser'].includes('scripts/serve.mjs'), 'no global live-server');
  assert.ok(!pkg.scripts['test:browser'].includes('live-server'));
  assert.ok(pkg.scripts.typecheck.includes('scripts/typecheck.mjs'), 'typecheck must run tsc');
  assert.ok(pkg.scripts.prepublishOnly.includes('scripts/build.mjs'));
});

test('the test script lists every suite explicitly', () => {
  // A broad glob would pick up helpers, and `*-test.mjs` style names would be
  // executed as tests by mistake.
  const listed = pkg.scripts.test.split(/\s+/).filter((part) => part.endsWith('.test.mjs'));
  assert.ok(listed.length >= 9, `expected at least 9 suites, found ${listed.length}`);
  for (const entry of listed) {
    assert.ok(entry.startsWith('test/'), `${entry} must live in test/`);
  }
});

test('build tooling is declared', () => {
  assert.ok(pkg.devDependencies.esbuild, 'esbuild is missing');
  assert.ok(pkg.devDependencies.typescript, 'typescript is missing');
});

test('the package is publishable', () => {
  assert.equal(pkg.name, 'xqi18n');
  assert.equal(pkg.version, '0.2.0');
  assert.equal(pkg.license, 'MIT');
  assert.equal(pkg.private, undefined, 'a private package cannot be published');
  assert.ok(pkg.description.length > 10);
  assert.ok(!/based on vuejs/i.test(pkg.description), 'the description must match what ships');
});
