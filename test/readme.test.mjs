// Documentation is part of the contract.
//
// 0.0.3 shipped a copy-paste example with a stray semicolon inside an object
// literal, which is a syntax error the moment a reader pastes it. Parsing every
// JavaScript block catches that class of bug, and running the mirror module
// catches examples that parse but no longer describe the package.

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { loadDependency } from '../scripts/tools.mjs';
import { samples } from './readme-examples.mjs';

const { module: esbuild } = loadDependency('esbuild');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const DOCS = ['README.md', 'zh.md'];

/** Fenced JavaScript blocks, ignoring html/ts/sh samples. */
function jsBlocks(source) {
  const blocks = [];
  const fence = /```(js|javascript)\r?\n([\s\S]*?)```/g;
  let match = fence.exec(source);
  while (match) {
    blocks.push(match[2]);
    match = fence.exec(source);
  }
  return blocks;
}

for (const doc of DOCS) {
  const source = await readFile(resolve(root, doc), 'utf8');

  test(`${doc}: every javascript block parses`, async () => {
    const blocks = jsBlocks(source);
    assert.ok(blocks.length >= 8, `${doc} should document at least 8 snippets`);
    for (const [index, code] of blocks.entries()) {
      try {
        await esbuild.transform(code, { loader: 'js' });
      } catch (error) {
        assert.fail(`${doc} block ${index + 1} does not parse:\n${error.message}\n\n${code}`);
      }
    }
  });

  test(`${doc}: documents the current api and paths`, () => {
    for (const needle of [
      'new xqi18n',
      'tns(',
      'strict',
      'i18n.lang',
      'xqi18n/vue',
      'lib/xqi18n.min.js',
      'xqi18n-esm.min.js',
      'subscribe',
    ]) {
      assert.ok(source.includes(needle), `${doc} never mentions "${needle}"`);
    }
  });

  test(`${doc}: no known-broken snippets`, () => {
    assert.ok(!source.includes('SetItem('), `${doc} still has the localStorage.SetItem typo`);
    assert.ok(!source.includes('fsdgq-i18n'), `${doc} still carries the old package name`);
    assert.ok(
      !/\]（\.\//.test(source),
      `${doc} uses a full-width parenthesis in a markdown link`,
    );
  });
}

test('README and zh.md link to each other', async () => {
  const readme = await readFile(resolve(root, 'README.md'), 'utf8');
  const zh = await readFile(resolve(root, 'zh.md'), 'utf8');
  assert.ok(readme.includes('](./zh.md)'), 'README must link the Chinese doc');
  assert.ok(zh.includes('](./README.md)'), 'zh.md must link the English doc');
  assert.ok(!zh.includes('](./zh.md)'), 'zh.md must not link to itself');
});

test('the documented behaviour actually happens', () => {
  assert.equal(samples.flat, '快乐');
  assert.equal(samples.nested, '个人资料');
  assert.equal(samples.detached, '快乐', 'tns must stay bound when detached');
  assert.equal(samples.afterSwitch, 'happy');
  assert.equal(samples.afterSwitchNested, 'Home');
  assert.equal(samples.afterUnsubscribe, 1, 'unsubscribe must stop further notifications');
  assert.equal(samples.missing, 'nope', 'a missing key returns the key');
  assert.equal(samples.falsyZero, 0, 'a falsy value is still a value');
  assert.equal(samples.strictError, 'TypeError: Translate Warn: key does not exist!');
});

test('the documented vue usage actually happens', () => {
  assert.equal(samples.vueName, '快乐', '$t must translate through the plugin');
  assert.equal(samples.vueTnsAlias, '首页', '$tns alias must be installed');
  assert.equal(samples.vueHasInstance, true, '$xqi18n must be the instance');
  assert.equal(samples.vueMixinCount, 1, 'exactly one mixin per install');
});
