# xqi18n

A tiny dependency-free i18n helper for browsers and Node, with nested keys and a
Vue 2 / Vue 3 plugin.

[中文文档](./zh.md)

- Nested keys of any depth: `nav.home`, `form.errors.name`
- Written once, shipped as UMD, ESM and minified builds
- Zero dependencies, no build step for consumers
- Missing keys return the key itself instead of crashing a render
- Runtime language switching — no `location.reload()`
- Same package works with Vue 2 and Vue 3

## Install

```sh
npm install xqi18n --save
```

## Quick start

Put your languages next to each other and create one instance.

```js
// locale/index.js
import xqi18n from 'xqi18n';
import zhCn from './zh-cn.js';
import zhHk from './zh-hk.js';
import enUs from './en-us.js';

const i18n = new xqi18n({
    lang: localStorage.getItem('locale') || 'zhCn',
    messages: {
        zhCn,
        zhHk,
        enUs
    }
});

export default i18n;
```

Each language file is a plain object. Nest it as deep as you like.

```js
// locale/zh-cn.js
export default {
    name: '快乐',
    nav: {
        home: '首页',
        user: { profile: '个人资料' }
    }
};
```

Translate with `tns`, which is bound to the instance and can be passed around
freely.

```js
import i18n from './locale/index.js';

i18n.tns('name');               // '快乐'
i18n.tns('nav.home');           // '首页'
i18n.tns('nav.user.profile');   // '个人资料'

const t = i18n.tns;
t('name');                      // '快乐' — still bound
```

## Browser usage

The committed builds can be loaded directly; no bundler required.

```html
<!-- global build, exposes window.xqi18n -->
<script src="https://cdn.jsdelivr.net/npm/xqi18n@0.1.0/lib/xqi18n.min.js"></script>
<script>
    const i18n = new xqi18n({
        lang: 'zhCn',
        messages: { zhCn: { name: '快乐' } }
    });
    document.title = i18n.tns('name');
</script>
```

ES modules work the same way, with named exports available as well.

```html
<script type="module">
    import xqi18n, { xqi18n as Named } from 'https://cdn.jsdelivr.net/npm/xqi18n@0.1.0/lib/xqi18n-esm.min.js';
    // xqi18n and Named are the same constructor
    const i18n = new xqi18n({ lang: 'zhCn', messages: { zhCn: { name: '快乐' } } });
    console.log(i18n.tns('name'));
</script>
```

Both `https://unpkg.com/xqi18n` and `https://cdn.jsdelivr.net/npm/xqi18n` resolve
to `lib/xqi18n.min.js`.

## Switching language

Assign `lang`. Components that read `tns` re-render, and you can persist the
choice yourself.

```js
import i18n from './locale/index.js';

function setLocale(locale) {
    i18n.lang = locale;
    localStorage.setItem('locale', locale);
}

setLocale('enUs');
i18n.tns('name'); // 'happy'
```

Subscribe to changes when you need to react somewhere else. The returned
function unsubscribes and can be called more than once.

```js
const off = i18n.subscribe((lang) => {
    document.documentElement.lang = lang;
});

// later
off();
```

## Missing keys

Since 0.1.0 a missing key returns the key itself and warns once per language and
key, so one typo cannot break a render.

```js
const i18n = new xqi18n({
    lang: 'zhCn',
    messages: { zhCn: { name: '快乐' } }
});

i18n.tns('nope');    // 'nope' (and one console warning)
i18n.tns('nope');    // 'nope' (no second warning)
```

Prefer the old behaviour, where a missing key threw? Set `strict`. The error type
and message are unchanged from 0.0.x.

```js
const strict = new xqi18n({
    lang: 'zhCn',
    messages: { zhCn: { name: '快乐' } },
    strict: true
});

try {
    strict.tns('nope');
} catch (error) {
    // TypeError: Translate Warn: key does not exist!
    console.error(error.message);
}
```

Use `warn: false` to silence the warnings in production.

## Vue

```sh
npm install xqi18n vue --save
```

Vue 3:

```js
import { createApp } from 'vue';
import xqi18n from 'xqi18n';
import xqi18nVue from 'xqi18n/vue';
import zhCn from './locale/zh-cn.js';
import enUs from './locale/en-us.js';

const i18n = new xqi18n({ lang: 'zhCn', messages: { zhCn, enUs } });
const app = createApp(App);

app.use(xqi18nVue, { i18n });
app.mount('#app');

// Composition API: const i18n = inject('xqi18n')
```

Vue 2:

```js
import Vue from 'vue';
import xqi18n from 'xqi18n';
import xqi18nVue from 'xqi18n/vue';

const i18n = new xqi18n({ lang: 'zhCn', messages: { zhCn: { name: '快乐' } } });

Vue.use(xqi18nVue, { i18n });
```

Both majors get `this.$t`, `this.$tns` and `this.$xqi18n`. A language change
forces the affected components to re-render through a global mixin, so
translations update without a reload.

```js
// any component, Vue 2 or Vue 3
export default {
    template: '<p>{{ $t("name") }}</p>'
};
```

If you would rather bind the instance up front:

```js
import { createXqi18nVuePlugin } from 'xqi18n/vue';

app.use(createXqi18nVuePlugin(i18n));
```

TypeScript users can add the component properties by merging the exported
interface into their own app types:

```ts
import type { Xqi18nGlobalProperties } from 'xqi18n';

declare module '@vue/runtime-core' {
    interface ComponentCustomProperties extends Xqi18nGlobalProperties {}
}
```

## API

`new xqi18n(options)`

| Option | Type | Description |
| --- | --- | --- |
| `lang` | `string` | Current language code. Must be a non-empty string |
| `messages` | `object` | Message trees keyed by language code |
| `strict` | `boolean` | Throw on a missing key instead of returning it |
| `warn` | `boolean` | Set to `false` to silence missing-key warnings |

Instance members:

| Member | Description |
| --- | --- |
| `i18n.lang` | Read or assign the current language |
| `i18n.messages` | The message object you passed in |
| `i18n.strict` / `i18n.warn` | Writable at runtime |
| `i18n.tns(key)` | Bound translate function |
| `i18n.translateFn(key)` | The same lookup, without the binding |
| `i18n.subscribe(fn)` | Returns an unsubscribe function |

`tns` resolves a dot path of any depth and only walks own properties, so keys
such as `constructor` or `__proto__` never resolve to prototype members. Values
that are falsy but present — `0`, `false`, `''` — are returned as-is and are not
treated as missing.

## Upgrading from 0.0.3

| Change | What to do |
| --- | --- |
| A missing key returns the key instead of throwing | Pass `strict: true` to keep throwing, or handle the returned key |
| A language missing from `messages` no longer throws a `TypeError` | Nothing — it now behaves like any other missing key |
| `messages: null` is rejected in the constructor | Pass an object |
| `lang` is an accessor, so `Object.keys(i18n)` no longer lists it | Read `i18n.lang`; `JSON.stringify` still outputs `{ lang, messages }` |
| The `bin` entry was removed | `npx xqi18n` never worked; use the API |
| Deep paths are now declared in `exports` | Keep the `.js` extension: `xqi18n/lib/xqi18n.min.js` |

## For AI agents

The package ships machine-readable integration notes, declared in `package.json`:

- [`llms.txt`](./llms.txt) — the compact public API: exports, options, defaults,
  error strings, one runnable example, and the constraints that are easy to get
  wrong.
- [`skills/xqi18n-integration/SKILL.md`](./skills/xqi18n-integration/SKILL.md) —
  when to load the package, which entry to pick, the order to wire the Vue
  plugin in, and how to verify a language switch. Exact signatures live in
  [`references/api.md`](./skills/xqi18n-integration/references/api.md).

Both files are plain markdown and ship in the tarball, so an agent reading the
installed package can find them without network access.

## Development

```sh
npm install
npm run build        # regenerate lib/ from src/
npm test             # build, then run the node:test suites
npm run typecheck    # tsc --noEmit
npm run test:browser # serve test/ at http://127.0.0.1:4173/test/
```

`lib/` is committed on purpose: a source change is not finished until
`npm run build` has regenerated every artifact and the suite passes. The test
pages under `test/` load those committed files and report PASS/FAIL per check.

## Issues

[Open an issue](https://github.com/gitguanqi/xqi18n/issues/new)

## License

MIT © [@gitguanqi](https://github.com/gitguanqi)
