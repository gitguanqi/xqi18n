// Agent discovery contract.
//
// `llms.txt` and `skills/**/SKILL.md` are published files, so they are held to
// the same standard as the README: the metadata must resolve, every referenced
// path must ship, and the filenames must point at the API that actually exists.
// A stale `agents` target or a missing `files` entry breaks agent discovery
// without failing any runtime test, which is why it gets its own suite.

import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const read = (relative) => readFileSync(join(root, relative), 'utf8');

const LLMS = 'llms.txt';
const SKILL_DIR = 'skills/xqi18n-integration';
const SKILL = `${SKILL_DIR}/SKILL.md`;

/** Runtime names a consumer or an agent must be able to find. */
const RUNTIME_SURFACE = [
  'new xqi18n',
  'tns(',
  'translateFn',
  'subscribe',
  'toJSON',
  'i18n.lang',
  'messages',
  'strict',
  'warn',
  'createXqi18nVuePlugin',
  'xqi18n/vue',
  'lib/xqi18n.min.js',
];

test('manifest points at the agent files', () => {
  assert.equal(pkg.llms, './llms.txt');
  assert.equal(pkg.agents, `./${SKILL}`);
});

test('the metadata targets exist in the repository', () => {
  for (const relative of [LLMS, SKILL, `${SKILL_DIR}/references/api.md`]) {
    assert.ok(existsSync(join(root, relative)), `${relative} is declared but missing`);
  }
});

test('the metadata targets ship in the tarball', () => {
  // Declaring `files` narrows the tarball, so a metadata file that is not listed
  // would exist in git and be absent from the published package.
  assert.ok(pkg.files.includes(LLMS), 'files must include llms.txt');
  assert.ok(pkg.files.includes('skills'), 'files must include the skills directory');
  for (const entry of ['index.js', 'lib', 'README.md', 'zh.md']) {
    assert.ok(pkg.files.includes(entry), `the existing whitelist lost ${entry}`);
  }
  assert.ok(!pkg.files.some((entry) => entry.startsWith('test')), 'test pages must not ship');
});

test('llms.txt covers the shipped runtime surface', () => {
  const source = read(LLMS);
  assert.ok(source.startsWith('# xqi18n'), 'llms.txt must start with the package heading');
  for (const needle of RUNTIME_SURFACE) {
    assert.ok(source.includes(needle), `llms.txt never mentions ${needle}`);
  }
  assert.ok(!/^##\s*TODO/m.test(source), 'llms.txt still has a TODO section');
  assert.ok(!source.includes('<placeholder>'), 'llms.txt still has a placeholder');
  // The two integration constraints that are easiest to get wrong.
  assert.ok(source.includes('use(xqi18nVue, { i18n })'), 'the plugin needs the instance');
  assert.ok(source.includes('"type": "module"'), 'the ESM warning must be documented');
});

test('the skill has portable frontmatter', () => {
  const source = read(SKILL);
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(source);
  assert.ok(match, 'SKILL.md must open with YAML frontmatter');

  const frontmatter = match[1];
  const name = /^name:\s*(\S+)\s*$/m.exec(frontmatter);
  const description = /^description:\s*(.+)$/m.exec(frontmatter);
  assert.ok(name, 'frontmatter needs a name');
  assert.ok(description, 'frontmatter needs a description');
  assert.match(name[1], /^[a-z0-9]+(-[a-z0-9]+)*$/, 'name must be lowercase hyphenated');
  assert.equal(name[1], SKILL_DIR.split('/').pop(), 'the name must match its directory');
  // The description has to say when to load it, not only what it is.
  assert.ok(description[1].length > 80, 'the description is too short to guide loading');
  assert.match(description[1], /\b(Load|load)\b/, 'the description must state when to load');
  assert.ok(!source.includes('TODO'), 'the skill still has a TODO');
});

test('the skill links only to files that ship with it', () => {
  const source = read(SKILL);
  const links = [...source.matchAll(/\]\(([^)]+)\)/g)].map((entry) => entry[1]);
  assert.ok(links.length > 0, 'the skill must link its detailed reference');

  for (const link of links) {
    assert.ok(!/^https?:/.test(link), `${link} must not depend on the network`);
    assert.ok(!link.startsWith('/'), `${link} must be relative to the skill directory`);
    const target = resolve(root, SKILL_DIR, link);
    assert.ok(
      target.startsWith(resolve(root, SKILL_DIR)),
      `${link} escapes the skill directory and cannot ship with it`,
    );
    assert.ok(existsSync(target), `${link} is linked but missing`);
  }
});

test('the skill omits what llms.txt already covers', () => {
  const llms = read(LLMS);
  const skill = read(SKILL);
  // Duplicated error tables drift; SKILL.md points at the reference instead.
  assert.ok(
    !skill.includes('Translate Warn: options must be a object!'),
    'SKILL.md must not copy the error table',
  );
  assert.ok(skill.length < llms.length * 2, 'the skill is drifting into a second API manual');
});

test('the reference documents the error strings from the source', () => {
  const reference = read(`${SKILL_DIR}/references/api.md`);
  const core = readFileSync(join(root, 'src', 'core.ts'), 'utf8');
  const constants = [...core.matchAll(/'(Translate Warn:[^']+)'/g)].map((entry) => entry[1]);
  assert.ok(constants.length >= 8, 'the error constants moved; update this test');
  for (const message of constants) {
    assert.ok(reference.includes(message), `references/api.md is missing "${message}"`);
  }
});
