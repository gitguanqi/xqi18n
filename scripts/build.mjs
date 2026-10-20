// Regenerates every committed artifact under lib/ from src/.
//
// The package ships its build output, so a source change is incomplete until
// this script has run and the new files are committed alongside it.
//
//   node scripts/build.mjs
//
// Output paths are deliberately identical to the 0.0.x layout: README snippets,
// CDN URLs and `require('xqi18n/lib/xqi18n.min.js')` all depend on them.

import { execFileSync } from 'node:child_process';
import { copyFile, mkdir, readFile, rm, stat } from 'node:fs/promises';

import { at, loadDependency, resolveTsc, root } from './tools.mjs';

const { module: esbuild } = loadDependency('esbuild');

const pkg = JSON.parse(await readFile(at('package.json'), 'utf8'));
const BANNER = `/*! xqi18n v${pkg.version} | MIT | https://github.com/gitguanqi/xqi18n */\n`;

/**
 * esbuild has no UMD output, so its IIFE is wrapped in the classic four-branch
 * shell. Three details are load-bearing:
 *   - `define(factory)` passes the factory itself, so AMD loaders still get lazy
 *     evaluation (the 0.0.x build called `factory()` and registered the value).
 *   - `globalThis` first, then `self`, then `this`, so a strict or worker context
 *     still has a global to attach to.
 *   - the footer unwraps `.default`, because esbuild's CJS interop object would
 *     otherwise make `require('xqi18n')` an object instead of the constructor.
 */
const UMD_BANNER = `${BANNER}(function (root, factory) {
    if (typeof module === 'object' && typeof module.exports === 'object') module.exports = factory();
    else if (typeof define === 'function' && define.amd) define(factory);
    else if (typeof define === 'function' && define.cmd) define(function (require, exports, module) { module.exports = factory(); });
    else root.xqi18n = factory();
})(typeof globalThis !== 'undefined' ? globalThis : typeof self !== 'undefined' ? self : this, function () {`;
const UMD_FOOTER = `
return __xqi18nUmd__.default || __xqi18nUmd__;
});
`;

const VUE_UMD_BANNER = `${BANNER}(function (root, factory) {
    if (typeof module === 'object' && typeof module.exports === 'object') module.exports = factory();
    else if (typeof define === 'function' && define.amd) define(factory);
    else if (typeof define === 'function' && define.cmd) define(function (require, exports, module) { module.exports = factory(); });
    else root.xqi18nVue = factory();
})(typeof globalThis !== 'undefined' ? globalThis : typeof self !== 'undefined' ? self : this, function () {`;
const VUE_UMD_FOOTER = `
return __xqi18nVueUmd__.default || __xqi18nVueUmd__;
});
`;

const CORE = { entry: 'src/index.ts', globalName: '__xqi18nUmd__' };
const BUNDLES = [
  // The four 0.0.x paths, unchanged.
  { ...CORE, outfile: 'lib/xqi18n.js', format: 'iife', umd: true, minify: false },
  { ...CORE, outfile: 'lib/xqi18n.min.js', format: 'iife', umd: true, minify: true },
  { ...CORE, outfile: 'lib/xqi18n-esm.js', format: 'esm', umd: false, minify: false },
  { ...CORE, outfile: 'lib/xqi18n-esm.min.js', format: 'esm', umd: false, minify: true },
  // `.mjs` mirrors: package.json has no "type": "module" (adding it would turn
  // index.js and lib/xqi18n.js into ESM and break `require`), so the `import`
  // conditions need an unambiguous extension.
  { entry: 'src/vue/index.ts', outfile: 'lib/vue/xqi18n.mjs', format: 'esm', umd: false, minify: false },
  {
    entry: 'src/vue/index.ts',
    outfile: 'lib/vue/xqi18n.js',
    format: 'iife',
    umd: true,
    minify: false,
    globalName: '__xqi18nVueUmd__',
    vue: true,
  },
  {
    entry: 'src/vue/index.ts',
    outfile: 'lib/vue/xqi18n.min.js',
    format: 'iife',
    umd: true,
    minify: true,
    globalName: '__xqi18nVueUmd__',
    vue: true,
  },
];

const COMMON = {
  bundle: true,
  target: ['es2018'],
  // Without this esbuild escapes every Chinese literal to \uXXXX.
  charset: 'utf8',
  legalComments: 'none',
  logLevel: 'warning',
};

/**
 * Windows indexers and antivirus scanners briefly hold files that were just
 * written, which surfaces as EPERM/EACCES from esbuild. Retrying the same build
 * is safe: the output is deterministic.
 */
async function withRetry(run, label) {
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      return await run();
    } catch (error) {
      const locked = /Access is denied|EPERM|EBUSY|EACCES/i.test(String(error.message));
      if (!locked || attempt === 5) {
        throw new Error(`${label}: ${error.message}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 150 * attempt));
    }
  }
  return undefined;
}

async function removeOutputs() {
  const targets = [
    ...BUNDLES.map((bundle) => bundle.outfile),
    'lib/xqi18n-esm.mjs',
    'lib/xqi18n-esm.min.mjs',
    'lib/vue/xqi18n.min.mjs',
  ];
  for (const file of targets) {
    for (let attempt = 1; attempt <= 6; attempt += 1) {
      try {
        await rm(at(file), { force: true });
        break;
      } catch (error) {
        if (attempt === 6) {
          throw new Error(
            `Cannot replace ${file}: ${error.code}. Close any process holding it and retry.`,
          );
        }
        await new Promise((resolve) => setTimeout(resolve, 100 * attempt));
      }
    }
  }
}

async function buildBundles() {
  // On Windows a freshly written file can still be held by an indexer or
  // antivirus scanner, and esbuild truncates existing outputs in place. Removing
  // them first (with retries) makes a second `npm run build` reliable.
  await removeOutputs();

  for (const bundle of BUNDLES) {
    await withRetry(
      () =>
        esbuild.build({
          ...COMMON,
          entryPoints: [at(bundle.entry)],
          outfile: at(bundle.outfile),
          format: bundle.format,
          minify: bundle.minify,
          ...(bundle.umd
            ? {
                globalName: bundle.globalName,
                banner: { js: bundle.vue ? VUE_UMD_BANNER : UMD_BANNER },
                footer: { js: bundle.vue ? VUE_UMD_FOOTER : UMD_FOOTER },
              }
            : { banner: { js: BANNER } }),
        }),
      `build ${bundle.outfile}`,
    );
  }
}

/**
 * `.js` stays for browsers (a `<script type="module">` wants a .js MIME) and
 * `.mjs` is the byte-identical Node copy, so the two never diverge.
 */
async function buildEsmMirrors() {
  for (const [from, to] of [
    ['lib/xqi18n-esm.js', 'lib/xqi18n-esm.mjs'],
    ['lib/xqi18n-esm.min.js', 'lib/xqi18n-esm.min.mjs'],
  ]) {
    await withRetry(() => copyFile(at(from), at(to)), `copy ${to}`);
  }
}

async function buildVueMinMirror() {
  await withRetry(
    () =>
      esbuild.build({
        ...COMMON,
        entryPoints: [at('src/vue/index.ts')],
        outfile: at('lib/vue/xqi18n.min.mjs'),
        format: 'esm',
        minify: true,
      }),
    'build lib/vue/xqi18n.min.mjs',
  );
}

async function buildTypes() {
  const tsc = await resolveTsc();
  execFileSync(process.execPath, [tsc, '-p', 'tsconfig.build.json'], {
    cwd: root,
    stdio: 'inherit',
  });
}

/** Fail the build if an artifact is missing, empty, or of the wrong module kind. */
async function verifyArtifacts() {
  const expectations = [
    { file: 'lib/xqi18n.js', mustContain: 'root.xqi18n', mustNotContain: 'export {' },
    { file: 'lib/xqi18n.min.js', mustContain: 'root.xqi18n' },
    // esbuild consolidates the default export into the export list, so the
    // marker is `as default` rather than `export default`.
    { file: 'lib/xqi18n-esm.js', mustContain: 'as default' },
    { file: 'lib/xqi18n-esm.min.js', mustContain: 'as default' },
    { file: 'lib/xqi18n-esm.mjs', mustContain: 'as default' },
    { file: 'lib/xqi18n-esm.min.mjs', mustContain: 'as default' },
    { file: 'lib/vue/xqi18n.js', mustContain: 'root.xqi18nVue' },
    { file: 'lib/vue/xqi18n.min.js', mustContain: 'root.xqi18nVue' },
    { file: 'lib/vue/xqi18n.mjs', mustContain: 'as default' },
    { file: 'lib/vue/xqi18n.min.mjs', mustContain: 'as default' },
    { file: 'lib/types/index.d.ts', mustContain: 'export default' },
    { file: 'lib/types/vue/index.d.ts', mustContain: 'createXqi18nVuePlugin' },
  ];

  const problems = [];
  for (const { file, mustContain, mustNotContain } of expectations) {
    let source;
    try {
      source = await readFile(at(file), 'utf8');
    } catch {
      problems.push(`${file}: missing`);
      continue;
    }
    if (source.length === 0) {
      problems.push(`${file}: empty`);
    }
    if (mustContain && !source.includes(mustContain)) {
      problems.push(`${file}: expected to contain "${mustContain}"`);
    }
    if (mustNotContain && source.includes(mustNotContain)) {
      problems.push(`${file}: must not contain "${mustNotContain}"`);
    }
  }

  if (problems.length > 0) {
    throw new Error('Artifact verification failed:\n  ' + problems.join('\n  '));
  }

  for (const { file } of expectations) {
    const info = await stat(at(file));
    console.log(`  ${file.padEnd(28)} ${String(info.size).padStart(7)} B`);
  }
}

await mkdir(at('lib/vue'), { recursive: true });
await mkdir(at('lib/types'), { recursive: true });

await buildBundles();
await buildEsmMirrors();
await buildVueMinMirror();
await buildTypes();
await verifyArtifacts();

console.log(`xqi18n ${pkg.version}: build finished.`);
