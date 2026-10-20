// Type check that works before `npm install`.
//
// The tsconfig is the checking config (`noEmit`), and the build emits
// declarations separately. Resolving tsc through scripts/tools.mjs keeps this
// runnable in a fresh checkout, where node_modules does not exist yet.

import { execFileSync } from 'node:child_process';

import { resolveTsc, root } from './tools.mjs';

const tsc = await resolveTsc();
execFileSync(process.execPath, [tsc, '-p', 'tsconfig.json'], { cwd: root, stdio: 'inherit' });
console.log('xqi18n: typecheck passed.');
