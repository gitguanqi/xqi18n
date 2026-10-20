/*! xqi18n v0.1.0 | MIT | https://github.com/gitguanqi/xqi18n */


// src/vue/index.ts
var installed = /* @__PURE__ */ new WeakMap();
var OFF_KEY = "__xqi18nOff";
function installInto(target, i18n) {
  if (!i18n || typeof i18n.tns !== "function") {
    throw new TypeError(
      "xqi18n/vue: pass the instance — app.use(plugin, { i18n }) or createXqi18nVuePlugin(i18n)."
    );
  }
  if (installed.get(target) === i18n) {
    return;
  }
  installed.set(target, i18n);
  const globals = target.config && target.config.globalProperties;
  const scope = globals || target.prototype || (target.prototype = {});
  const t = (key) => i18n.tns(key);
  scope.$t = t;
  scope.$tns = t;
  scope.$xqi18n = i18n;
  if (typeof target.mixin === "function") {
    target.mixin({
      created() {
        if (this[OFF_KEY] || typeof i18n.subscribe !== "function") {
          return;
        }
        this[OFF_KEY] = i18n.subscribe(() => {
          if (typeof this.$forceUpdate === "function") {
            this.$forceUpdate();
          }
        });
      },
      // Vue 2 fires beforeDestroy, Vue 3 fires beforeUnmount. Each major
      // ignores the other's hook name, so both can share one handler body.
      beforeDestroy() {
        const off = this[OFF_KEY];
        if (typeof off === "function") {
          off();
        }
        this[OFF_KEY] = null;
      },
      beforeUnmount() {
        const off = this[OFF_KEY];
        if (typeof off === "function") {
          off();
        }
        this[OFF_KEY] = null;
      }
    });
  }
  if (globals && typeof target.provide === "function") {
    target.provide("xqi18n", i18n);
  }
}
function createXqi18nVuePlugin(i18n) {
  return {
    install(target, options) {
      installInto(target, options && options.i18n || i18n);
    }
  };
}
var plugin = {
  install(target, options) {
    installInto(target, options && options.i18n);
  },
  createXqi18nVuePlugin
};
var index_default = plugin;
export {
  createXqi18nVuePlugin,
  index_default as default
};
