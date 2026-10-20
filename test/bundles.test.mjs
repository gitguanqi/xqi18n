// The shipped builds must agree.
//
// A fix applied to only one of them is the classic failure mode for a package
// that commits its own output, so every artifact runs the same fingerprint and
// the results are compared, not just their export shapes.

import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { snapshot } from './fixtures.mjs';
import { createChecks } from './shared-suite.mjs';

const require = createRequire(import.meta.url);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const at = (...parts) => resolve(root, ...parts);

/**
 * `package.json` has no "type": "module" (adding it would turn every committed
 * .js into ESM and break `require`), so the ESM `.js` files cannot be imported
 * from disk by extension. A data URL loads them as ESM without renaming.
 */
async function importEsmFile(file) {
  const source = await readFile(at(file), 'utf8');
  const encoded = Buffer.from(source, 'utf8').toString('base64');
  return import(`data:text/javascript;base64,${encoded}`);
}

const builds = {
  'umd readable': { kind: 'cjs', load: () => require(at('lib/xqi18n.js')) },
  'umd minified': { kind: 'cjs', load: () => require(at('lib/xqi18n.min.js')) },
  'browser esm readable': { kind: 'esm', load: () => importEsmFile('lib/xqi18n-esm.js') },
  'browser esm minified': { kind: 'esm', load: () => importEsmFile('lib/xqi18n-esm.min.js') },
  'node esm': { kind: 'esm', load: () => import(pathToFileURL(at('lib/xqi18n-esm.mjs')).href) },
  'node esm minified': {
    kind: 'esm',
    load: () => import(pathToFileURL(at('lib/xqi18n-esm.min.mjs')).href),
  },
};

const loaded = {};
for (const [label, build] of Object.entries(builds)) {
  const module = await build.load();
  loaded[label] = build.kind === 'cjs' ? { Xqi18n: module } : module;
}

test('every build behaves identically', () => {
  const reference = snapshot(loaded['umd readable'].Xqi18n);
  for (const [label, module] of Object.entries(loaded)) {
    assert.deepEqual(snapshot(module.Xqi18n), reference, label);
  }
});

// The fingerprint covers translation; this covers lifecycle. Running it on one
// build per module system keeps the output readable — the other four are
// compared byte-for-byte or by fingerprint above.
test('the readable builds pass the shared behaviour suite', async (t) => {
  for (const label of ['umd readable', 'node esm']) {
    await t.test(label, async (inner) => {
      for (const [name, run] of createChecks(loaded[label].Xqi18n)) {
        await inner.test(name, () => {
          run();
        });
      }
    });
  }
});

test('umd builds export the constructor without an interop wrapper', () => {
  for (const file of ['lib/xqi18n.js', 'lib/xqi18n.min.js']) {
    const module = require(at(file));
    assert.equal(typeof module, 'function', `${file} must export a function`);
    assert.equal(module.default, undefined, `${file} must not be wrapped in { default }`);
    assert.equal(typeof module.prototype.translateFn, 'function', `${file} prototype`);
  }
});

test('esm default and named exports are the same constructor', () => {
  for (const [label, module] of Object.entries(loaded)) {
    if (builds[label].kind !== 'esm') {
      continue;
    }
    assert.equal(module.default, module.Xqi18n, `${label}: default !== Xqi18n`);
    assert.equal(module.default, module.xqi18n, `${label}: default !== xqi18n`);
  }
});

test('node esm mirrors are byte-identical to the browser esm copies', async () => {
  for (const [from, to] of [
    ['lib/xqi18n-esm.js', 'lib/xqi18n-esm.mjs'],
    ['lib/xqi18n-esm.min.js', 'lib/xqi18n-esm.min.mjs'],
  ]) {
    assert.equal(
      await readFile(at(from), 'utf8'),
      await readFile(at(to), 'utf8'),
      `${from} must match ${to}`,
    );
  }
});

test('minified builds are smaller and carry the version banner', async () => {
  const pkg = JSON.parse(await readFile(at('package.json'), 'utf8'));
  for (const [readable, minified] of [
    ['lib/xqi18n.js', 'lib/xqi18n.min.js'],
    ['lib/xqi18n-esm.js', 'lib/xqi18n-esm.min.js'],
  ]) {
    const large = await stat(at(readable));
    const small = await stat(at(minified));
    assert.ok(small.size < large.size, `${minified} should be smaller than ${readable}`);

    const source = await readFile(at(minified), 'utf8');
    assert.ok(source.startsWith('/*! xqi18n v'), `${minified} lost its banner`);
    assert.ok(source.includes(pkg.version), `${minified} banner has a stale version`);
  }
});

test('esm builds contain no commonjs syntax', async () => {
  for (const file of ['lib/xqi18n-esm.js', 'lib/xqi18n-esm.min.js']) {
    const source = await readFile(at(file), 'utf8');
    assert.ok(!source.includes('module.exports'), `${file} contains module.exports`);
    assert.ok(/export\s*\{/.test(source), `${file} has no export list`);
  }
});

test('built bundles keep Chinese literals readable', async () => {
  const source = await readFile(at('lib/xqi18n.js'), 'utf8');
  assert.ok(source.includes('Translate Warn'), 'error strings are missing from the build');
  assert.ok(!source.includes('\\u5feb'), 'Chinese literals were escaped; charset utf8 is off');
});

test('every error string survives minification', async () => {
  const strings = [
    'Translate Warn: options must be a object!',
    'Translate Warn: lang must be a string!',
    'Translate Warn: lang cannot be empty!',
    'Translate Warn: messages must be a object!',
    'Translate Warn: key cannot be empty!',
    'Translate Warn: key must be a string!',
    'Translate Warn: key does not exist!',
  ];
  for (const file of ['lib/xqi18n.js', 'lib/xqi18n.min.js', 'lib/xqi18n-esm.min.mjs']) {
    const source = await readFile(at(file), 'utf8');
    for (const text of strings) {
      assert.ok(source.includes(text), `${file} is missing "${text}"`);
    }
  }
});
