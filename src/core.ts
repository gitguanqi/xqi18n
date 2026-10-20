import { hasOwn, isPlainRecord, resolveKey } from './resolver';
import type { Messages, Xqi18nListener, Xqi18nOptions } from './types';

// Error strings are part of the public surface: 0.0.x consumers filter logs by
// them. Only the wording that was grammatically broken stays as it was.
const OPTIONS_TYPE = 'Translate Warn: options must be a object!';
const LANG_TYPE = 'Translate Warn: lang must be a string!';
const LANG_EMPTY = 'Translate Warn: lang cannot be empty!';
const MESSAGES_TYPE = 'Translate Warn: messages must be a object!';
const KEY_EMPTY = 'Translate Warn: key cannot be empty!';
const KEY_TYPE = 'Translate Warn: key must be a string!';
const KEY_MISSING = 'Translate Warn: key does not exist!';
const LISTENER_TYPE = 'Translate Warn: listener must be a function!';

/**
 * A tiny translator over a nested message tree.
 *
 * `lang` is an accessor so that a language switch can notify subscribers (the
 * Vue plugin uses this to re-render). `tns` is an own property bound to the
 * instance, so passing it around — `Vue.prototype.$tns = i18n.tns` — keeps
 * working.
 */
export class Xqi18n {
  messages: Messages;
  strict: boolean;
  warn: boolean;
  tns: <T = string>(key: string) => T;

  private currentLang: string;
  private listeners: Set<Xqi18nListener>;
  private warned: Set<string>;

  constructor(options: Xqi18nOptions) {
    if (!isPlainRecord(options)) {
      throw new TypeError(OPTIONS_TYPE);
    }

    const { lang, messages } = options;

    // Type before emptiness: `lang: 0` used to report "cannot be empty".
    if (typeof lang !== 'string') {
      throw new TypeError(LANG_TYPE);
    }
    if (lang.length === 0) {
      throw new Error(LANG_EMPTY);
    }
    // `null` and arrays used to pass the `typeof` check and crash on first use.
    if (!isPlainRecord(messages)) {
      throw new TypeError(MESSAGES_TYPE);
    }

    this.messages = messages;
    this.strict = options.strict === true;
    this.warn = options.warn !== false;
    this.currentLang = lang;
    this.listeners = new Set<Xqi18nListener>();
    this.warned = new Set<string>();
    this.tns = <T = string>(key: string): T => this.translateFn<T>(key);
  }

  get lang(): string {
    return this.currentLang;
  }

  /**
   * Switch language at runtime. Same-value assignment is a no-op, so a watcher
   * that fires twice does not re-render the whole app twice.
   */
  set lang(next: string) {
    if (typeof next !== 'string') {
      throw new TypeError(LANG_TYPE);
    }
    if (next.length === 0) {
      throw new Error(LANG_EMPTY);
    }
    if (next === this.currentLang) {
      return;
    }
    this.currentLang = next;
    // A new language may miss the same keys again, and reporting them once per
    // language is what makes the warning useful.
    this.warned.clear();
    for (const listener of [...this.listeners]) {
      try {
        listener(next);
      } catch (error) {
        // One broken subscriber must not stop the others or fail the setter.
        if (typeof console !== 'undefined' && typeof console.warn === 'function') {
          console.warn('Translate Warn: a lang listener threw.', error);
        }
      }
    }
  }

  /** Subscribe to language changes. Returns an idempotent unsubscribe function. */
  subscribe(listener: Xqi18nListener): () => void {
    if (typeof listener !== 'function') {
      throw new TypeError(LISTENER_TYPE);
    }
    this.listeners.add(listener);
    let active = true;
    return () => {
      if (!active) {
        return;
      }
      active = false;
      this.listeners.delete(listener);
    };
  }

  /**
   * Resolve `key` in the current language.
   *
   * A missing key returns the key itself unless `strict` is set, which throws
   * the 0.0.x error. Falsy leaves (`0`, `false`, `''`) are returned as found.
   */
  translateFn<T = string>(key: string): T {
    // Order kept from 0.0.x: falsy keys are "empty", other non-strings are a type error.
    if (!key) {
      throw new Error(KEY_EMPTY);
    }
    if (typeof key !== 'string') {
      throw new TypeError(KEY_TYPE);
    }

    // A language that is not in `messages` means every key is missing; it used
    // to throw `Cannot read properties of undefined`.
    const tree = hasOwn(this.messages, this.currentLang)
      ? this.messages[this.currentLang]
      : undefined;
    if (tree === undefined) {
      return this.missing(key) as unknown as T;
    }

    const resolved = resolveKey(tree, key);
    if (!resolved.found) {
      return this.missing(key) as unknown as T;
    }
    return resolved.value as T;
  }

  /** JSON shape kept identical to 0.0.x, where `lang` was a plain field. */
  toJSON(): { lang: string; messages: Messages } {
    return { lang: this.currentLang, messages: this.messages };
  }

  private missing(key: string): string {
    if (this.strict) {
      throw new TypeError(KEY_MISSING);
    }

    // Warn once per (lang, key): a render loop would otherwise flood the console.
    const id = this.currentLang + '\u0000' + key;
    if (this.warn && !this.warned.has(id)) {
      this.warned.add(id);
      if (typeof console !== 'undefined' && typeof console.warn === 'function') {
        console.warn(
          'Translate Warn: key does not exist: "' + key + '" (lang: ' + this.currentLang + ')',
        );
      }
    }
    return key;
  }
}
