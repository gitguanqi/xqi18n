// Behaviour of the readable UMD bundle, i.e. the file `require('xqi18n')`
// actually loads. The identical matrix runs against the other three builds in
// bundles.test.mjs.

import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { createChecks } from './shared-suite.mjs';

const require = createRequire(import.meta.url);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const Xqi18n = require(resolve(root, 'lib', 'xqi18n.js'));

for (const [name, run] of createChecks(Xqi18n)) {
  test(name, () => {
    run();
  });
}
