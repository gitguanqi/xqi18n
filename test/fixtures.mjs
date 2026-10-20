// Shared message samples.
//
// The same tree feeds the Node suites and the browser pages, so a behaviour
// change cannot pass in one environment and fail in the other without being
// noticed. Every value here exists to prove one specific rule.

export const messages = {
  zhCn: {
    name: '快乐',
    zero: 0,
    no: false,
    empty: '',
    plain: 'text',
    a: {
      b: {
        c: 'deep3',
        d: { e: 'deep4' },
        f: { g: { h: 'deep5' } },
      },
    },
  },
  enUs: {
    name: 'happy',
    a: { b: { c: 'deep3-en' } },
  },
};

/** Keys that must resolve, with their expected value. */
export const resolvedCases = [
  ['name', '快乐'],
  ['a.b.c', 'deep3'],
  ['a.b.d.e', 'deep4'],
  ['a.b.f.g.h', 'deep5'],
  ['zero', 0],
  ['no', false],
  ['empty', ''],
  ['plain', 'text'],
];

/**
 * Keys that must be reported as missing. A string in the middle of the path, a
 * path deeper than the tree, and prototype members all belong here.
 */
export const missingCases = [
  'nope',
  'a.b.c.x',
  'a.b.zzz',
  'plain.sub',
  'constructor',
  'toString',
  'hasOwnProperty',
  '__proto__',
  'valueOf',
];

/**
 * Deterministic behaviour fingerprint of a build. Comparing these across the
 * readable, minified, UMD and ESM bundles proves the four artifacts agree.
 */
export function snapshot(Xqi18n) {
  const i18n = new Xqi18n({ lang: 'zhCn', messages, warn: false });
  // Null prototype on purpose: `missingCases` contains `__proto__`, and a normal
  // object literal would treat `result['__proto__'] = value` as a prototype
  // assignment — the exact trap the library itself guards against.
  const result = Object.create(null);

  const record = (label, run) => {
    try {
      result[label] = { value: run() };
    } catch (error) {
      result[label] = { error: `${error.constructor.name}: ${error.message}` };
    }
  };

  for (const [key] of resolvedCases) {
    record(key, () => i18n.tns(key));
  }
  for (const key of missingCases) {
    record(key, () => i18n.tns(key));
  }
  record('empty-key', () => i18n.tns(''));
  record('number-key', () => i18n.tns(0));
  record('object-key', () => i18n.tns({}));
  record('unknown-lang', () => {
    const other = new Xqi18n({ lang: 'frFr', messages, warn: false });
    return other.tns('name');
  });
  record('strict-missing', () => {
    const strict = new Xqi18n({ lang: 'zhCn', messages, strict: true });
    return strict.tns('nope');
  });
  record('switch-lang', () => {
    i18n.lang = 'enUs';
    const value = i18n.tns('name');
    i18n.lang = 'zhCn';
    return value;
  });

  return result;
}
