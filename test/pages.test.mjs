// Static contract of the test pages.
//
// These assertions cannot prove behaviour — that is what the pages and the
// browser run are for — but they catch the failure mode that is invisible until
// a user opens the page: a stale relative path or a missing shared asset.

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { loadDependency } from '../scripts/tools.mjs';

const { module: esbuild } = loadDependency('esbuild');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const page = async (name) => readFile(resolve(root, 'test', name), 'utf8');

/** Inline `<script type="module">` bodies, i.e. the page's own logic. */
function moduleScripts(html) {
  const scripts = [];
  const pattern = /<script type="module">([\s\S]*?)<\/script>/g;
  let match = pattern.exec(html);
  while (match) {
    scripts.push(match[1]);
    match = pattern.exec(html);
  }
  return scripts;
}

test('index links every scenario', async () => {
  const html = await page('index.html');
  for (const name of ['browser.html', 'esm.html', 'vue2.html', 'vue3.html']) {
    assert.ok(html.includes(`href="./${name}"`), `index.html does not link ${name}`);
  }
});

test('every page shares the shell', async () => {
  for (const name of ['index.html', 'browser.html', 'esm.html', 'vue2.html', 'vue3.html']) {
    const html = await page(name);
    assert.ok(html.includes('href="./demo.css"'), `${name} is missing demo.css`);
    assert.ok(
      html.includes('href="./test-icon.svg"'),
      `${name} is missing the shared favicon`,
    );
    assert.ok(
      html.includes('src="./test-icon.svg"'),
      `${name} is missing the shared header icon`,
    );
    assert.ok(html.includes('class="test-nav"'), `${name} is missing the page nav`);
  }
});

test('status-reporting pages expose the runner contract', async () => {
  for (const name of ['browser.html', 'esm.html', 'vue2.html', 'vue3.html']) {
    const html = await page(name);
    assert.ok(html.includes('id="summary"'), `${name} is missing #summary`);
    assert.ok(html.includes('aria-live="polite"'), `${name} summary is not announced`);
    assert.ok(html.includes('id="checks"'), `${name} is missing #checks`);
    assert.ok(html.includes('id="details"'), `${name} is missing #details`);
    assert.ok(html.includes("from './checks.js'"), `${name} does not use the shared runner`);
  }
});

test('the umd page loads the committed umd bundle', async () => {
  const html = await page('browser.html');
  assert.ok(html.includes('src="../lib/xqi18n.min.js"'), 'browser.html must load the umd build');
  assert.ok(!html.includes('xqi18n-esm'), 'browser.html must not load the esm build');
  assert.ok(html.includes("from './shared-suite.mjs'"), 'browser.html must run the shared suite');
});

test('the esm page imports the committed esm bundle', async () => {
  const html = await page('esm.html');
  assert.ok(html.includes('type="module"'), 'esm.html needs a module script');
  assert.ok(
    html.includes("from '../lib/xqi18n-esm.min.js'"),
    'esm.html must import the esm build',
  );
  assert.ok(html.includes('Xqi18n as Canonical'), 'esm.html must assert the named exports');
});

test('the vue pages pin a runtime major and use the plugin build', async () => {
  for (const [file, major, cdn] of [
    ['vue2.html', '2', 'vue@2.7.16'],
    ['vue3.html', '3', 'vue@3.5.13'],
  ]) {
    const html = await page(file);
    assert.ok(html.includes(`data-vue-major="${major}"`), `${file} must declare its major`);
    assert.ok(html.includes(cdn), `${file} must pin ${cdn}`);
    assert.ok(html.includes('src="../lib/vue/xqi18n.min.js"'), `${file} must load the plugin build`);
    assert.ok(html.includes('src="../lib/xqi18n.min.js"'), `${file} must load the core build`);
    assert.ok(!html.includes('type="text/javascript" src="http'), `${file} must not inline a CDN`);
  }
});

test('the vue pages mount exactly one demo instance', async () => {
  for (const [file, mountCall] of [
    ['vue2.html', 'new Vue('],
    ['vue3.html', 'Vue.createApp('],
  ]) {
    const html = await page(file);
    assert.ok(html.includes(mountCall), `${file} does not mount a component`);
    assert.equal(
      (html.match(/id="vue-demo"/g) || []).length,
      1,
      `${file} must have exactly one visible demo host`,
    );
    assert.ok(html.includes('markDemoReady'), `${file} must restore a live demo after teardown`);
    assert.ok(html.includes('data-lang="zhCn"'), `${file} must offer a language switch`);
  }
});

test('the vue2 page covers both teardown surfaces', async () => {
  const html = await page('vue2.html');
  assert.ok(html.includes('$destroy()'), 'vue2.html must destroy a component');
});

test('the vue3 page unmounts its app', async () => {
  const html = await page('vue3.html');
  assert.ok(html.includes('app.unmount()'), 'vue3.html must unmount an app');
  assert.ok(html.includes("inject: ['xqi18n']"), 'vue3.html must prove inject() works');
});

test('the pages do not report PASS with an empty demo', async () => {
  for (const name of ['browser.html', 'esm.html', 'vue2.html', 'vue3.html']) {
    const html = await page(name);
    assert.ok(
      html.indexOf('markDemoReady') > html.indexOf('runner.run'),
      `${name} must mount the demo after the suite runs`,
    );
  }
});

// The page logic only runs in a browser. Parsing it here is the closest a Node
// run can get: a stray brace or a bad import is caught without one.
test('every inline module script parses', async () => {
  for (const name of ['browser.html', 'esm.html', 'vue2.html', 'vue3.html']) {
    const scripts = moduleScripts(await page(name));
    assert.equal(scripts.length, 1, `${name} should have exactly one module script`);
    for (const [index, code] of scripts.entries()) {
      try {
        await esbuild.transform(code, { loader: 'js' });
      } catch (error) {
        assert.fail(`${name} module script ${index + 1} does not parse:\n${error.message}`);
      }
    }
  }
});

test('the shared runner and suites parse as modules', async () => {
  for (const name of ['checks.js', 'fixtures.mjs', 'shared-suite.mjs', 'readme-examples.mjs']) {
    const source = await readFile(resolve(root, 'test', name), 'utf8');
    await esbuild.transform(source, { loader: 'js', format: 'esm' });
  }
});
