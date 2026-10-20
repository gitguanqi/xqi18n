// The Vue wrapper is verified against structural stand-ins for both majors.
//
// A stub cannot prove Vue's own rendering, but it can prove the plugin contract:
// where the globals land, that a language switch reaches `$forceUpdate` exactly
// once, that teardown unsubscribes, and that `use()` twice does not stack mixins.

import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const Xqi18n = require(resolve(root, 'lib', 'xqi18n.js'));
const plugin = require('xqi18n/vue');

const messages = {
  zhCn: { name: '快乐' },
  enUs: { name: 'happy' },
};

function createI18n() {
  return new Xqi18n({ lang: 'zhCn', messages, warn: false });
}

/** Vue 3 shape: globals on app.config.globalProperties, plus mixin and provide. */
function createApp() {
  return {
    config: { globalProperties: {} },
    mixins: [],
    provided: new Map(),
    mixin(options) {
      this.mixins.push(options);
    },
    provide(key, value) {
      this.provided.set(key, value);
    },
  };
}

/** Vue 2 shape: everything on the constructor, options come via Vue.use(). */
function createVue() {
  function Vue() {}
  Vue.prototype = {};
  Vue.mixins = [];
  Vue.mixin = function mixin(options) {
    Vue.mixins.push(options);
  };
  return Vue;
}

function mountComponent(mixin, extra = {}) {
  const component = { $forceUpdate() { this.updates += 1; }, updates: 0, ...extra };
  mixin.created.call(component);
  return component;
}

test('vue 3 install exposes $t, $tns and $xqi18n globally', () => {
  const app = createApp();
  const i18n = createI18n();
  plugin.install(app, { i18n });

  const globals = app.config.globalProperties;
  assert.equal(globals.$xqi18n, i18n);
  assert.equal(globals.$t('name'), '快乐');
  assert.equal(globals.$tns('name'), '快乐', '$tns alias for 0.0.x docs');
  assert.equal(app.provided.get('xqi18n'), i18n, 'provide() for the composition api');
  assert.equal(app.mixins.length, 1);
});

test('vue 2 install writes to the constructor prototype', () => {
  const Vue = createVue();
  const i18n = createI18n();
  plugin.install(Vue, { i18n });

  assert.equal(Vue.prototype.$xqi18n, i18n);
  assert.equal(Vue.prototype.$t('name'), '快乐');
  assert.equal(Vue.prototype.$tns('name'), '快乐');
  assert.equal(Vue.mixins.length, 1);
  assert.equal(typeof Vue.mixins[0].beforeDestroy, 'function', 'vue 2 teardown hook');
});

test('both majors get both teardown hooks', () => {
  const app = createApp();
  plugin.install(app, { i18n: createI18n() });
  const mixin = app.mixins[0];
  assert.equal(typeof mixin.created, 'function');
  assert.equal(typeof mixin.beforeDestroy, 'function', 'vue 2 hook');
  assert.equal(typeof mixin.beforeUnmount, 'function', 'vue 3 hook');
});

test('a language switch re-renders exactly once', () => {
  const app = createApp();
  const i18n = createI18n();
  plugin.install(app, { i18n });

  const component = mountComponent(app.mixins[0]);
  assert.equal(component.updates, 0, 'no update before the switch');

  i18n.lang = 'enUs';
  assert.equal(component.updates, 1);
  assert.equal(app.config.globalProperties.$t('name'), 'happy', 'globals follow the new lang');

  i18n.lang = 'enUs';
  assert.equal(component.updates, 1, 'same-value assignment must not re-render');

  i18n.lang = 'zhCn';
  assert.equal(component.updates, 2);
});

test('teardown unsubscribes and is safe to run twice', () => {
  const app = createApp();
  const i18n = createI18n();
  plugin.install(app, { i18n });
  const mixin = app.mixins[0];

  const component = mountComponent(mixin);
  mixin.beforeUnmount.call(component);
  mixin.beforeDestroy.call(component);

  i18n.lang = 'enUs';
  assert.equal(component.updates, 0, 'a destroyed component must not update');
});

test('created is idempotent per component instance', () => {
  const app = createApp();
  const i18n = createI18n();
  plugin.install(app, { i18n });
  const mixin = app.mixins[0];

  const component = mountComponent(mixin);
  mixin.created.call(component);
  mixin.created.call(component);

  // A single subscription means a single forced update.
  i18n.lang = 'enUs';
  assert.equal(component.updates, 1);
});

test('installing twice with the same instance does not stack mixins', () => {
  const app = createApp();
  const i18n = createI18n();
  plugin.install(app, { i18n });
  plugin.install(app, { i18n });
  assert.equal(app.mixins.length, 1);
});

test('createXqi18nVuePlugin binds the instance up front', () => {
  const app = createApp();
  const i18n = createI18n();
  const bound = plugin.createXqi18nVuePlugin(i18n);
  bound.install(app);

  assert.equal(app.config.globalProperties.$xqi18n, i18n);
  assert.equal(app.config.globalProperties.$t('name'), '快乐');
});

test('installing without an instance fails loudly', () => {
  assert.throws(() => plugin.install(createApp()), { name: 'TypeError' });
  assert.throws(() => plugin.install(createApp(), {}), { name: 'TypeError' });
});

test('a component without $forceUpdate (ssr) does not throw', () => {
  const app = createApp();
  const i18n = createI18n();
  plugin.install(app, { i18n });

  const component = {};
  app.mixins[0].created.call(component);
  assert.doesNotThrow(() => {
    i18n.lang = 'enUs';
  });
  app.mixins[0].beforeUnmount.call(component);
});
