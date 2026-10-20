// Environment-neutral assertion matrix.
//
// `node:assert` does not exist in a browser, so the helpers are local. The same
// exported `createChecks()` runs under `node --test` and inside the standalone
// test pages: a rule that passes in one place and fails in the other is a bug in
// the page, not a difference of opinion.

import { messages, missingCases, resolvedCases } from './fixtures.mjs';

export function fail(message) {
  throw new Error(message);
}

export function assert(condition, message) {
  if (!condition) {
    fail(message);
  }
}

export function assertEqual(actual, expected, label) {
  const left = JSON.stringify(actual);
  const right = JSON.stringify(expected);
  if (left !== right) {
    fail(`${label}: expected ${right}, received ${left}`);
  }
}

export function assertThrows(run, expected, label) {
  let thrown = null;
  try {
    run();
  } catch (error) {
    thrown = error;
  }
  assert(thrown !== null, `${label}: expected a thrown error, nothing was thrown`);
  if (expected.name) {
    assert(
      thrown.name === expected.name,
      `${label}: expected ${expected.name}, received ${thrown.name} (${thrown.message})`,
    );
  }
  if (expected.message) {
    assert(
      thrown.message === expected.message,
      `${label}: expected message "${expected.message}", received "${thrown.message}"`,
    );
  }
}

/** Collect `console.warn` calls made by `run`, even when it throws. */
export function captureWarnings(run) {
  const original = typeof console !== 'undefined' ? console.warn : undefined;
  const calls = [];
  if (typeof console !== 'undefined') {
    console.warn = (...args) => {
      calls.push(args.map((value) => String(value)).join(' '));
    };
  }
  let value;
  let error = null;
  try {
    value = run();
  } catch (caught) {
    error = caught;
  } finally {
    if (typeof console !== 'undefined' && original) {
      console.warn = original;
    }
  }
  return { value, error, calls };
}

export const ERRORS = {
  optionsType: 'Translate Warn: options must be a object!',
  langType: 'Translate Warn: lang must be a string!',
  langEmpty: 'Translate Warn: lang cannot be empty!',
  messagesType: 'Translate Warn: messages must be a object!',
  keyEmpty: 'Translate Warn: key cannot be empty!',
  keyType: 'Translate Warn: key must be a string!',
  keyMissing: 'Translate Warn: key does not exist!',
};

/** Build the full check list for a given constructor. */
export function createChecks(Xqi18n) {
  const checks = [];
  const add = (name, run) => checks.push([name, run]);

  add('exports a constructor with translateFn', () => {
    assert(typeof Xqi18n === 'function', 'the default export is not a function');
    assert(
      typeof Xqi18n.prototype.translateFn === 'function',
      'translateFn is missing from the prototype',
    );
  });

  add('constructor keeps the given lang and messages', () => {
    const i18n = new Xqi18n({ lang: 'zhCn', messages });
    assertEqual(i18n.lang, 'zhCn', 'lang');
    assert(i18n.messages === messages, 'messages must be the object that was passed in');
  });

  add('tns is an own property and works when detached', () => {
    const i18n = new Xqi18n({ lang: 'zhCn', messages });
    assert(
      Object.prototype.hasOwnProperty.call(i18n, 'tns'),
      'tns must be an own property, not a prototype method',
    );
    const detached = i18n.tns;
    assertEqual(detached('name'), '快乐', 'detached tns');
  });

  add('flat keys resolve', () => {
    const i18n = new Xqi18n({ lang: 'zhCn', messages });
    assertEqual(i18n.tns('name'), '快乐', 'name');
    assertEqual(i18n.translateFn('plain'), 'text', 'translateFn alias');
  });

  add('nested keys resolve to any depth', () => {
    const i18n = new Xqi18n({ lang: 'zhCn', messages });
    for (const [key, expected] of resolvedCases) {
      assertEqual(i18n.tns(key), expected, key);
    }
  });

  add('falsy leaves are returned and never reported as missing', () => {
    const i18n = new Xqi18n({ lang: 'zhCn', messages });
    const { calls } = captureWarnings(() => [
      i18n.tns('zero'),
      i18n.tns('no'),
      i18n.tns('empty'),
    ]);
    assertEqual(calls.length, 0, 'warning count for falsy leaves');
  });

  add('missing keys return the key and warn once per lang+key', () => {
    const i18n = new Xqi18n({ lang: 'zhCn', messages });
    const first = captureWarnings(() => i18n.tns('nope'));
    assertEqual(first.value, 'nope', 'missing value');
    assertEqual(first.calls.length, 1, 'one warning on first miss');

    const second = captureWarnings(() => i18n.tns('nope'));
    assertEqual(second.value, 'nope', 'missing value on repeat');
    assertEqual(second.calls.length, 0, 'no second warning for the same lang+key');
  });

  add('warn: false silences missing-key warnings', () => {
    const i18n = new Xqi18n({ lang: 'zhCn', messages, warn: false });
    const { value, calls } = captureWarnings(() => i18n.tns('nope'));
    assertEqual(value, 'nope', 'missing value');
    assertEqual(calls.length, 0, 'warning count with warn: false');
  });

  add('prototype members and broken paths report the key itself', () => {
    const i18n = new Xqi18n({ lang: 'zhCn', messages, warn: false });
    for (const key of missingCases) {
      assertEqual(i18n.tns(key), key, key);
      assert(
        typeof i18n.tns(key) !== 'function',
        `${key} must not resolve to a prototype member`,
      );
    }
  });

  add('null-prototype message trees work', () => {
    const tree = Object.create(null);
    tree.name = '无原型';
    const i18n = new Xqi18n({ lang: 'xx', messages: { xx: tree }, warn: false });
    assertEqual(i18n.tns('name'), '无原型', 'own key on a null-prototype tree');
    assertEqual(i18n.tns('toString'), 'toString', 'no prototype member leaks in');
  });

  add('key validation keeps the 0.0.x error contract', () => {
    const i18n = new Xqi18n({ lang: 'zhCn', messages });
    for (const key of ['', 0, null, undefined]) {
      assertThrows(() => i18n.tns(key), { name: 'Error', message: ERRORS.keyEmpty }, `key ${String(key)}`);
    }
    assertThrows(() => i18n.tns({}), { name: 'TypeError', message: ERRORS.keyType }, 'object key');
    assertThrows(() => i18n.tns([]), { name: 'TypeError', message: ERRORS.keyType }, 'array key');
  });

  add('a language missing from messages does not throw', () => {
    const i18n = new Xqi18n({ lang: 'frFr', messages });
    const { value, calls } = captureWarnings(() => i18n.tns('name'));
    assertEqual(value, 'name', 'value for an unknown lang');
    assertEqual(calls.length, 1, 'unknown lang should warn once');
  });

  add('constructor rejects invalid options', () => {
    assertThrows(() => new Xqi18n(), { name: 'TypeError', message: ERRORS.optionsType }, 'no options');
    assertThrows(() => new Xqi18n(null), { name: 'TypeError', message: ERRORS.optionsType }, 'null options');
    assertThrows(() => new Xqi18n([]), { name: 'TypeError', message: ERRORS.optionsType }, 'array options');
    assertThrows(
      () => new Xqi18n({ lang: 0, messages }),
      { name: 'TypeError', message: ERRORS.langType },
      'numeric lang',
    );
    assertThrows(
      () => new Xqi18n({ lang: '', messages }),
      { name: 'Error', message: ERRORS.langEmpty },
      'empty lang',
    );
    for (const value of [null, [], 'zhCn', 42]) {
      assertThrows(
        () => new Xqi18n({ lang: 'zhCn', messages: value }),
        { name: 'TypeError', message: ERRORS.messagesType },
        `messages ${JSON.stringify(value)}`,
      );
    }
  });

  add('strict mode throws the 0.0.x missing-key error', () => {
    const strict = new Xqi18n({ lang: 'zhCn', messages, strict: true });
    assertThrows(() => strict.tns('nope'), { name: 'TypeError', message: ERRORS.keyMissing }, 'strict miss');
    // Falsy leaves are values, not misses, so they must still come back.
    assertEqual(strict.tns('zero'), 0, 'strict zero');
    assertEqual(strict.tns('empty'), '', 'strict empty');
  });

  add('strict is writable at runtime', () => {
    const i18n = new Xqi18n({ lang: 'zhCn', messages, warn: false });
    assertEqual(i18n.tns('nope'), 'nope', 'non-strict miss');
    i18n.strict = true;
    assertThrows(() => i18n.tns('nope'), { name: 'TypeError', message: ERRORS.keyMissing }, 'after enabling');
    i18n.strict = false;
    assertEqual(i18n.tns('nope'), 'nope', 'after disabling');
  });

  add('changing lang switches translations without reloading', () => {
    const i18n = new Xqi18n({ lang: 'zhCn', messages, warn: false });
    assertEqual(i18n.tns('name'), '快乐', 'before switch');
    i18n.lang = 'enUs';
    assertEqual(i18n.lang, 'enUs', 'lang after switch');
    assertEqual(i18n.tns('name'), 'happy', 'after switch');
    assertEqual(i18n.tns('zero'), 'zero', 'keys missing in the new lang fall back to the key');
  });

  add('same-value lang assignment does not notify', () => {
    const i18n = new Xqi18n({ lang: 'zhCn', messages });
    let calls = 0;
    i18n.subscribe(() => {
      calls += 1;
    });
    i18n.lang = 'zhCn';
    assertEqual(calls, 0, 'same-value notify count');
    i18n.lang = 'enUs';
    assertEqual(calls, 1, 'changed-value notify count');
  });

  add('invalid lang assignment keeps the previous value', () => {
    const i18n = new Xqi18n({ lang: 'zhCn', messages });
    assertThrows(() => {
      i18n.lang = '';
    }, { name: 'Error', message: ERRORS.langEmpty }, 'empty assignment');
    assertThrows(() => {
      i18n.lang = 42;
    }, { name: 'TypeError', message: ERRORS.langType }, 'numeric assignment');
    assertEqual(i18n.lang, 'zhCn', 'lang after rejected assignments');
  });

  add('subscribe returns an idempotent unsubscribe', () => {
    const i18n = new Xqi18n({ lang: 'zhCn', messages });
    const seen = [];
    const off = i18n.subscribe((lang) => seen.push(lang));
    assertEqual(typeof off, 'function', 'unsubscribe type');

    i18n.lang = 'enUs';
    off();
    off();
    i18n.lang = 'zhCn';
    assertEqual(seen.join(','), 'enUs', 'notified languages');
    assertThrows(() => i18n.subscribe('nope'), { name: 'TypeError' }, 'non-function listener');
  });

  add('a throwing listener does not break the setter or other listeners', () => {
    const i18n = new Xqi18n({ lang: 'zhCn', messages });
    const seen = [];
    i18n.subscribe(() => {
      throw new Error('listener exploded');
    });
    i18n.subscribe((lang) => seen.push(lang));

    const { error, calls } = captureWarnings(() => {
      i18n.lang = 'enUs';
    });
    assert(error === null, `setter threw: ${error && error.message}`);
    assertEqual(seen.join(','), 'enUs', 'second listener still ran');
    assertEqual(calls.length, 1, 'the failing listener is reported once');
  });

  add('JSON shape matches 0.0.x', () => {
    const i18n = new Xqi18n({ lang: 'zhCn', messages });
    const json = JSON.parse(JSON.stringify(i18n));
    assertEqual(json.lang, 'zhCn', 'serialized lang');
    assert(Object.prototype.hasOwnProperty.call(json, 'messages'), 'serialized messages');
    assert(!Object.prototype.hasOwnProperty.call(json, 'tns'), 'tns must not be serialized');
  });

  return checks;
}
