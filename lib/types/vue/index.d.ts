import type { Xqi18n } from '../core';
import type { Xqi18nVuePlugin } from '../types';
/** Bind an instance up front: `app.use(createXqi18nVuePlugin(i18n))`. */
export declare function createXqi18nVuePlugin(i18n: Xqi18n): Xqi18nVuePlugin;
/**
 * Default plugin.
 *
 * `createXqi18nVuePlugin` is also attached to the object: the UMD bundle hands
 * out only the default export, and `require('xqi18n/vue')` must still be able to
 * reach the bound-factory helper.
 */
declare const plugin: Xqi18nVuePlugin & {
    createXqi18nVuePlugin: typeof createXqi18nVuePlugin;
};
export default plugin;
