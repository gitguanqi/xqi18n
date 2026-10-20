// Dependency-free static server for the test pages.
//
// `npm run test:browser` used to require a globally installed `live-server`,
// which is not declared anywhere. This script has no dependencies at all, sets
// the MIME types an ES module page needs, and refuses to serve anything outside
// the repository.

import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { dirname, extname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export const PAGES = ['index.html', 'browser.html', 'esm.html', 'vue2.html', 'vue3.html'];

const CONTENT_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

/**
 * Map a URL path to a file inside `base`, or `null` when the path escapes it.
 * Path traversal and `node_modules` are both rejected.
 */
export function resolveRequestFile(pathname, base = root) {
  const withIndex = pathname.endsWith('/') ? `${pathname}index.html` : pathname;
  const filePath = resolve(base, `.${withIndex}`);
  const relativePath = relative(base, filePath);
  if (
    relativePath.length === 0 ||
    relativePath.startsWith('..') ||
    isAbsolute(relativePath) ||
    relativePath.split(/[\\/]/).includes('node_modules')
  ) {
    return null;
  }
  return filePath;
}

function sendText(response, status, message) {
  response.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  response.end(message);
}

export function createTestServer({ baseDir = root } = {}) {
  return createServer(async (request, response) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      sendText(response, 405, 'Method Not Allowed');
      return;
    }

    let pathname;
    try {
      pathname = decodeURIComponent(new URL(request.url || '/', 'http://localhost').pathname);
    } catch {
      sendText(response, 400, 'Bad Request');
      return;
    }

    if (pathname === '/') {
      response.writeHead(302, { Location: '/test/', 'Cache-Control': 'no-store' });
      response.end();
      return;
    }

    const filePath = resolveRequestFile(pathname, baseDir);
    if (filePath === null) {
      sendText(response, 403, 'Forbidden');
      return;
    }

    let info;
    try {
      info = await stat(filePath);
    } catch {
      sendText(response, 404, 'Not Found');
      return;
    }
    if (!info.isFile()) {
      sendText(response, 404, 'Not Found');
      return;
    }

    response.writeHead(200, {
      'Content-Type': CONTENT_TYPES[extname(filePath)] || 'application/octet-stream',
      'Content-Length': info.size,
      // Test pages must never be served from a stale cache.
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });

    if (request.method === 'HEAD') {
      response.end();
      return;
    }
    createReadStream(filePath).pipe(response);
  });
}

const isDirectRun =
  process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));

if (isDirectRun) {
  const host = process.env.HOST || '127.0.0.1';
  const port = Number(process.env.PORT || 4173);
  const server = createTestServer();

  server.listen(port, host, () => {
    console.log(`xqi18n test pages: http://${host}:${port}/test/`);
    for (const page of PAGES) {
      console.log(`  http://${host}:${port}/test/${page}`);
    }
    console.log('Press Ctrl+C to stop.');
  });

  const stop = () => {
    server.close(() => process.exit(0));
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}
