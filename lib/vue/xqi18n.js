/*! xqi18n v0.1.0 | MIT | https://github.com/gitguanqi/xqi18n */
(function (root, factory) {
    if (typeof module === 'object' && typeof module.exports === 'object') module.exports = factory();
    else if (typeof define === 'function' && define.amd) define(factory);
    else if (typeof define === 'function' && define.cmd) define(function (require, exports, module) { module.exports = factory(); });
    else root.xqi18nVue = factory();
})(typeof globalThis !== 'undefined' ? globalThis : typeof self !== 'undefined' ? self : this, function () {
"use strict";
var __xqi18nVueUmd__ = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/vue/index.ts
  var index_exports = {};
  __export(index_exports, {
    createXqi18nVuePlugin: () => createXqi18nVuePlugin,
    default: () => index_default
  });
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
  return __toCommonJS(index_exports);
})();

return __xqi18nVueUmd__.default || __xqi18nVueUmd__;
});

