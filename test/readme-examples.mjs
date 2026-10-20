// The executable twin of the README snippets.
//
// Documentation drifts because nobody runs it. This module performs every step
// the README describes, and `readme.test.mjs` asserts the results. If a snippet
// is changed without updating this file, the mismatch is caught in review.

import Xqi18n from '../lib/xqi18n-esm.mjs';
import vuePlugin from '../lib/vue/xqi18n.mjs';

const zhCn = {
    name: '快乐',
    nav: {
        home: '首页',
        user: { profile: '个人资料' }
    },
    count: 0
};

const enUs = {
    name: 'happy',
    nav: {
        home: 'Home',
        user: { profile: 'Profile' }
    },
    count: 0
};

// Quick start: one instance, three nested lookups, and a detached `tns`.
const i18n = new Xqi18n({ lang: 'zhCn', messages: { zhCn, enUs } });
const flat = i18n.tns('name');
const nested = i18n.tns('nav.user.profile');
const detached = (() => {
    const t = i18n.tns;
    return t('name');
})();

// Switching language.
const seenLangs = [];
const off = i18n.subscribe((lang) => seenLangs.push(lang));
i18n.lang = 'enUs';
const afterSwitch = i18n.tns('name');
const afterSwitchNested = i18n.tns('nav.home');
off();
i18n.lang = 'zhCn';
const afterUnsubscribe = seenLangs.length;

// Missing keys: lenient by default, throwing under `strict`.
const lenient = new Xqi18n({ lang: 'zhCn', messages: { zhCn }, warn: false });
const missing = lenient.tns('nope');
const falsyZero = lenient.tns('count');

const strict = new Xqi18n({ lang: 'zhCn', messages: { zhCn }, strict: true });
let strictError = null;
try {
    strict.tns('nope');
} catch (error) {
    strictError = `${error.name}: ${error.message}`;
}

// Vue: install into a stand-in app and read the injected helper.
const mixins = [];
const fakeApp = {
    config: { globalProperties: {} },
    mixin(options) {
        mixins.push(options);
    },
    provide() {}
};
vuePlugin.install(fakeApp, { i18n });

export const samples = {
    flat,
    nested,
    detached,
    afterSwitch,
    afterSwitchNested,
    afterUnsubscribe,
    missing,
    falsyZero,
    strictError,
    vueName: fakeApp.config.globalProperties.$t('name'),
    vueTnsAlias: fakeApp.config.globalProperties.$tns('nav.home'),
    vueHasInstance: fakeApp.config.globalProperties.$xqi18n === i18n,
    vueMixinCount: mixins.length
};

export const messages = { zhCn, enUs };
