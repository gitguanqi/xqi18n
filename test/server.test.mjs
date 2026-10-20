// The test server is maintained code: the pages depend on its MIME types and on
// `no-store`, and it must not serve anything outside the repository.

import assert from 'node:assert/strict';
import { request } from 'node:http';
import { dirname, resolve } from 'node:path';
import test, { after, before } from 'node:test';
import { fileURLToPath } from 'node:url';

import { createTestServer, resolveRequestFile, root } from '../scripts/serve.mjs';

let server;
let base;

before(async () => {
  server = createTestServer();
  await new Promise((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolveClose) => server.close(resolveClose));
});

/** Raw request so encoded traversal segments are not normalised away. */
function raw(pathname, method = 'GET') {
  return new Promise((resolveResponse, reject) => {
    const req = request({ host: '127.0.0.1', port: server.address().port, path: pathname, method }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        resolveResponse({
          status: res.statusCode,
          headers: res.headers,
          body: Buffer.concat(chunks).toString('utf8'),
        });
      });
    });
    req.on('error', reject);
    req.end();
  });
}

test('the repository root redirects to the test directory', async () => {
  const response = await fetch(`${base}/`, { redirect: 'manual' });
  assert.equal(response.status, 302);
  assert.equal(response.headers.get('location'), '/test/');
});

test('html is served with the right type and no caching', async () => {
  const response = await fetch(`${base}/test/browser.html`);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /^text\/html; charset=utf-8/);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const body = await response.text();
  assert.ok(body.includes('window.xqi18n'), 'the page body looks wrong');
});

test('a bare directory serves index.html', async () => {
  const response = await fetch(`${base}/test/`);
  assert.equal(response.status, 200);
  const body = await response.text();
  assert.ok(body.includes('Standalone checks'), 'test/index.html was not served');
});

test('modules and styles get MIME types a browser accepts', async () => {
  const expectations = [
    ['/lib/xqi18n.min.js', /^text\/javascript; charset=utf-8/],
    ['/lib/xqi18n-esm.min.mjs', /^text\/javascript; charset=utf-8/],
    ['/test/demo.css', /^text\/css; charset=utf-8/],
    ['/test/test-icon.svg', /^image\/svg\+xml/],
    ['/test/shared-suite.mjs', /^text\/javascript; charset=utf-8/],
  ];
  for (const [pathname, pattern] of expectations) {
    const response = await fetch(`${base}${pathname}`);
    assert.equal(response.status, 200, `${pathname} was not served`);
    assert.match(response.headers.get('content-type'), pattern, `${pathname} has a wrong type`);
  }
});

test('encoded traversal is refused', async () => {
  const response = await raw('/%2e%2e/%2e%2e/Windows/win.ini');
  assert.ok(
    response.status === 403 || response.status === 404,
    `traversal returned ${response.status}`,
  );
  assert.ok(!response.body.includes('[fonts]'), 'the file system was exposed');
});

test('node_modules is not reachable', async () => {
  const response = await raw('/node_modules/anything.js');
  assert.equal(response.status, 403);
});

test('unknown files are 404', async () => {
  const response = await fetch(`${base}/test/nope.html`);
  assert.equal(response.status, 404);
});

test('non-GET methods are rejected', async () => {
  const response = await raw('/test/browser.html', 'POST');
  assert.equal(response.status, 405);
});

test('resolveRequestFile rejects escapes and accepts normal paths', () => {
  assert.equal(resolveRequestFile('/test/browser.html'), resolve(root, 'test', 'browser.html'));
  assert.equal(resolveRequestFile('/test/'), resolve(root, 'test', 'index.html'));
  assert.equal(resolveRequestFile('/../../etc/passwd'), null);
  assert.equal(resolveRequestFile('/node_modules/x.js'), null);
  assert.equal(resolveRequestFile('/'), resolve(root, 'index.html'));
});
