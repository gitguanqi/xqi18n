import type { Messages, Xqi18nListener, Xqi18nOptions } from './types';
/**
 * A tiny translator over a nested message tree.
 *
 * `lang` is an accessor so that a language switch can notify subscribers (the
 * Vue plugin uses this to re-render). `tns` is an own property bound to the
 * instance, so passing it around — `Vue.prototype.$tns = i18n.tns` — keeps
 * working.
 */
export declare class Xqi18n {
    messages: Messages;
    strict: boolean;
    warn: boolean;
    tns: <T = string>(key: string) => T;
    private currentLang;
    private listeners;
    private warned;
    constructor(options: Xqi18nOptions);
    get lang(): string;
    /**
     * Switch language at runtime. Same-value assignment is a no-op, so a watcher
     * that fires twice does not re-render the whole app twice.
     */
    set lang(next: string);
    /** Subscribe to language changes. Returns an idempotent unsubscribe function. */
    subscribe(listener: Xqi18nListener): () => void;
    /**
     * Resolve `key` in the current language.
     *
     * A missing key returns the key itself unless `strict` is set, which throws
     * the 0.0.x error. Falsy leaves (`0`, `false`, `''`) are returned as found.
     */
    translateFn<T = string>(key: string): T;
    /** JSON shape kept identical to 0.0.x, where `lang` was a plain field. */
    toJSON(): {
        lang: string;
        messages: Messages;
    };
    private missing;
}
