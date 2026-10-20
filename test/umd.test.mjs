// The UMD shell has four branches and a global-scope fallback. Each one is
// loaded in its own `vm` context, because the branch that "works" in Node's
// CommonJS loader is not the branch a browser or an AMD loader takes.

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

import { messages } from './fixtures.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = await readFile(resolve(root, 'lib', 'xqi18n.js'), 'utf8');

function runIn(sandbox, code = source) {
  const context = vm.createContext(sandbox);
  vm.runInContext(code, context, { filename: 'xqi18n.js' });
  return sandbox;
}

test('browser global branch exposes a lowercase global', () => {
  const sandbox = { console };
  sandbox.self = sandbox;
  sandbox.window = sandbox;
  runIn(sandbox);

  assert.equal(typeof sandbox.xqi18n, 'function');
  assert.equal(sandbox.window.xqi18n, sandbox.xqi18n, 'window must see the same constructor');
  assert.equal(sandbox.Xqi18n, undefined, 'no second, differently-cased global');

  const instance = new sandbox.xqi18n({ lang: 'zhCn', messages });
  assert.equal(instance.tns('name'), '快乐');
});

test('amd branch hands over a factory, not the constructor', () => {
  const calls = [];
  const sandbox = { console };
  sandbox.define = (...args) => {
    calls.push(args);
  };
  sandbox.define.amd = {};
  runIn(sandbox);

  assert.equal(calls.length, 1, 'define must be called once');
  const received = calls[0][0];
  // 0.0.x called `define(factory())`, which passed the constructor itself and
  // made the loader evaluate the module at load time instead of on demand. A
  // real factory has an empty prototype and returns the constructor when called.
  assert.equal(typeof received, 'function', 'define must receive a function');
  assert.equal(
    received.prototype.translateFn,
    undefined,
    'define received the constructor instead of a factory',
  );

  const Xqi18n = received();
  assert.equal(typeof Xqi18n, 'function', 'the factory must return the constructor');
  assert.equal(new Xqi18n({ lang: 'zhCn', messages }).tns('name'), '快乐');

  assert.equal(sandbox.xqi18n, undefined, 'the amd branch must not write a global');
});

test('cmd branch routes through module.exports', () => {
  let exported;
  const sandbox = { console };
  sandbox.define = (factory) => {
    const module = { exports: {} };
    factory(() => undefined, module.exports, module);
    exported = module.exports;
  };
  sandbox.define.cmd = {};
  runIn(sandbox);

  assert.equal(typeof exported, 'function');
  assert.equal(new exported({ lang: 'zhCn', messages }).tns('name'), '快乐');
  assert.equal(sandbox.xqi18n, undefined, 'the cmd branch must not write a global');
});

test('commonjs branch wins and does not pollute the global', () => {
  const sandbox = { console };
  sandbox.module = { exports: {} };
  sandbox.exports = sandbox.module.exports;
  sandbox.self = sandbox;
  runIn(sandbox);

  assert.equal(typeof sandbox.module.exports, 'function');
  assert.equal(sandbox.module.exports.default, undefined, 'no interop wrapper expected');
  assert.equal(sandbox.xqi18n, undefined, 'require() must not create a global');
});

test('strict and worker style scopes still get a global', () => {
  // No `window`, `this` is undefined inside a strict wrapper: only the
  // `globalThis` / `self` fallback can save the global branch.
  const sandbox = { console };
  sandbox.self = sandbox;
  runIn(sandbox, `"use strict";(function () {\n${source}\n}).call(undefined);`);

  assert.equal(typeof sandbox.xqi18n, 'function');
});

test('the global branch falls back to `this` when modern globals are absent', () => {
  // Old engines: neither `globalThis` nor `self` exists, so `this` is the only
  // remaining option. Shadowing both as parameters reproduces that scope.
  const fakeRoot = {};
  const sandbox = { console, __root: fakeRoot };
  vm.createContext(sandbox);
  vm.runInContext(
    `(function (globalThis, self) {\n${source}\n}).call(__root, undefined, undefined);`,
    sandbox,
    { filename: 'xqi18n.js' },
  );

  assert.equal(typeof fakeRoot.xqi18n, 'function');
});
