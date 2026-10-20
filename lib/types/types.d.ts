/**
 * Shared type surface for xqi18n.
 *
 * The message tree is intentionally permissive: a leaf may be any value, and a
 * branch is any plain object. Runtime translation only needs "does this key
 * exist", so the types do not restrict what you may store.
 */
/** A node in a message tree. Nested objects are traversed with dot paths. */
export interface MessageTree {
    [key: string]: unknown;
}
/** All languages, keyed by the language code used as `lang`. */
export interface Messages {
    [lang: string]: MessageTree;
}
/** Options accepted by `new xqi18n(options)`. */
export interface Xqi18nOptions {
    /** Language code; must match a key of `messages`. */
    lang: string;
    /** Message trees keyed by language code. */
    messages: Messages;
    /**
     * Throw on a missing key instead of returning the key itself. Restores the
     * 0.0.x behaviour for callers that used try/catch to detect missing keys.
     */
    strict?: boolean;
    /** Set to `false` to silence the once-per-(lang, key) console warning. */
    warn?: boolean;
}
/** Called with the new language code after `i18n.lang` changes. */
export type Xqi18nListener = (lang: string) => void;
/** Minimal structural view of a Vue 2 constructor or Vue 3 app. */
export interface VueLikeTarget {
    version?: string;
    prototype?: Record<string, unknown>;
    config?: {
        globalProperties?: Record<string, unknown>;
    };
    mixin?(options: Record<string, unknown>): unknown;
    provide?(key: string, value: unknown): unknown;
}
/** Component fields the plugin mixin touches. */
export interface VueComponentLike {
    __xqi18nOff?: (() => void) | null;
    $forceUpdate?: () => void;
}
/** Options passed as the second argument of `app.use()` / `Vue.use()`. */
export interface Xqi18nVueOptions {
    i18n?: import('./core').Xqi18n;
}
/** Shape shared by both Vue majors. */
export interface Xqi18nVuePlugin {
    install(target: VueLikeTarget, options?: Xqi18nVueOptions): void;
}
/**
 * Merge this into your own Vue app types to get `this.$t` in templates.
 * xqi18n does not augment Vue modules itself, because it has no Vue dependency.
 */
export interface Xqi18nGlobalProperties {
    $t: <T = string>(key: string) => T;
    /** Alias kept for the 0.0.x `$tns` documentation. */
    $tns: <T = string>(key: string) => T;
    $xqi18n: import('./core').Xqi18n;
}
