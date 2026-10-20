// Package resolution.
//
// A `main` field alone is not enough: bundlers read `module`/`exports`, Node
// reads the conditions, and the `exports` map also *closes* every subpath it
// does not list. These assertions cover both what must resolve and what must
// stay reachable through the `./lib/*` escape hatch.

import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = require('../package.json');

test('require("xqi18n") loads one module, whichever path is used', () => {
  const viaExports = require('xqi18n');
  assert.equal(typeof viaExports, 'function', 'the entry must be the constructor');
  assert.equal(viaExports.default, undefined, 'no { default } wrapper expected');
  assert.equal(viaExports, require(resolve(root, 'lib', 'xqi18n.js')));
  assert.equal(viaExports, require(resolve(root, 'index.js')));
  // The minified file is a separate module instance, but it is still the API.
  const minified = require(resolve(root, 'lib', 'xqi18n.min.js'));
  assert.equal(typeof minified, 'function');
  assert.notEqual(minified, viaExports, 'each build is its own module instance');
});

test('the legacy deep paths stay importable', () => {
  assert.equal(typeof require('xqi18n/lib/xqi18n.js'), 'function');
  assert.equal(typeof require('xqi18n/lib/xqi18n.min.js'), 'function');
  assert.equal(typeof require('xqi18n/index.js'), 'function');
});

test('import("xqi18n") resolves to the node esm mirror', async () => {
  const module = await import('xqi18n');
  assert.equal(module.default, module.xqi18n);
  assert.equal(module.default, module.Xqi18n);
  assert.equal(new module.default({ lang: 'zhCn', messages: { zhCn: { name: '快乐' } } }).tns('name'), '快乐');
});

test('the vue subpath resolves for both module systems', async () => {
  const cjs = require('xqi18n/vue');
  assert.equal(typeof cjs, 'object');
  assert.equal(typeof cjs.install, 'function', 'require() must expose install');
  assert.equal(typeof cjs.createXqi18nVuePlugin, 'function', 'the bound helper must survive the umd unwrap');

  const esm = await import('xqi18n/vue');
  assert.equal(typeof esm.default.install, 'function');
  assert.equal(typeof esm.createXqi18nVuePlugin, 'function');
  assert.equal(esm.default.createXqi18nVuePlugin, esm.createXqi18nVuePlugin);
});

test('unlisted subpaths are rejected instead of silently resolved', async () => {
  await assert.rejects(import('xqi18n/does-not-exist'), {
    code: 'ERR_PACKAGE_PATH_NOT_EXPORTED',
  });
});

test('package.json stays reachable', () => {
  assert.equal(require('xqi18n/package.json').name, 'xqi18n');
  assert.equal(require('xqi18n/package.json').version, pkg.version);
});

test('every exports target exists on disk', () => {
  const targets = [];
  const walk = (value) => {
    if (typeof value === 'string') {
      targets.push(value);
    } else if (value && typeof value === 'object') {
      Object.values(value).forEach(walk);
    }
  };
  walk(pkg.exports);

  for (const target of targets) {
    if (target.includes('*')) {
      continue;
    }
    assert.doesNotThrow(
      () => require.resolve(resolve(root, target)),
      `${target} is listed in exports but missing`,
    );
  }
});
