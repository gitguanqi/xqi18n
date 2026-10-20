import type { Xqi18n } from '../core';
import type {
  VueComponentLike,
  VueLikeTarget,
  Xqi18nVueOptions,
  Xqi18nVuePlugin,
} from '../types';

/**
 * Vue 2 and Vue 3 plugin for xqi18n.
 *
 * The core library has no reactivity, so a language switch has to invalidate
 * the components that read `$t()`. The cheapest way to do that without a Vue
 * dependency is a global mixin: subscribe on `created`, unsubscribe on
 * teardown, and call the public `$forceUpdate()` instance method.
 *
 * This is a whole-component re-render, not fine-grained dependency tracking.
 * It is the right trade-off for translations, which usually sit in most
 * templates anyway.
 */

/** `target + instance` pairs already installed, so `use()` twice cannot stack mixins. */
const installed = new WeakMap<object, Xqi18n>();

const OFF_KEY = '__xqi18nOff';

type Component = VueComponentLike & Record<string, unknown>;

function installInto(target: VueLikeTarget, i18n: Xqi18n | undefined): void {
  if (!i18n || typeof i18n.tns !== 'function') {
    throw new TypeError(
      'xqi18n/vue: pass the instance — app.use(plugin, { i18n }) or createXqi18nVuePlugin(i18n).',
    );
  }
  if (installed.get(target) === i18n) {
    return;
  }
  installed.set(target, i18n);

  // Vue 3 keeps globals on app.config.globalProperties and has no prototype;
  // Vue 2 (and 2.7) only has the constructor prototype.
  const globals = target.config && target.config.globalProperties;
  const scope: Record<string, unknown> = globals || target.prototype || (target.prototype = {});

  const t = <T = string>(key: string): T => i18n.tns<T>(key);
  scope.$t = t;
  // Alias for the 0.0.x documentation, which exposed `$tns`.
  scope.$tns = t;
  scope.$xqi18n = i18n;

  if (typeof target.mixin === 'function') {
    target.mixin({
      created(this: Component) {
        if (this[OFF_KEY] || typeof i18n.subscribe !== 'function') {
          return;
        }
        this[OFF_KEY] = i18n.subscribe(() => {
          // SSR has no $forceUpdate; skipping keeps server rendering quiet.
          if (typeof this.$forceUpdate === 'function') {
            this.$forceUpdate();
          }
        });
      },
      // Vue 2 fires beforeDestroy, Vue 3 fires beforeUnmount. Each major
      // ignores the other's hook name, so both can share one handler body.
      beforeDestroy(this: Component) {
        const off = this[OFF_KEY];
        if (typeof off === 'function') {
          off();
        }
        this[OFF_KEY] = null;
      },
      beforeUnmount(this: Component) {
        const off = this[OFF_KEY];
        if (typeof off === 'function') {
          off();
        }
        this[OFF_KEY] = null;
      },
    });
  }

  // Vue 3 only: lets the Composition API reach the same instance.
  if (globals && typeof target.provide === 'function') {
    target.provide('xqi18n', i18n);
  }
}

/** Bind an instance up front: `app.use(createXqi18nVuePlugin(i18n))`. */
export function createXqi18nVuePlugin(i18n: Xqi18n): Xqi18nVuePlugin {
  return {
    install(target: VueLikeTarget, options?: Xqi18nVueOptions): void {
      installInto(target, (options && options.i18n) || i18n);
    },
  };
}

/**
 * Default plugin.
 *
 * `createXqi18nVuePlugin` is also attached to the object: the UMD bundle hands
 * out only the default export, and `require('xqi18n/vue')` must still be able to
 * reach the bound-factory helper.
 */
const plugin: Xqi18nVuePlugin & { createXqi18nVuePlugin: typeof createXqi18nVuePlugin } = {
  install(target: VueLikeTarget, options?: Xqi18nVueOptions): void {
    installInto(target, options && options.i18n);
  },
  createXqi18nVuePlugin,
};

export default plugin;
