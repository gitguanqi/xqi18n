# xqi18n API Reference

Mirrors `src/` and the shipped declarations in `lib/types/` at version 0.1.0.
Nothing here is documented unless it ships.

## Package paths

| Path | Module kind | Contents |
| --- | --- | --- |
| `xqi18n` | ESM + CJS | `Xqi18n` class (default and named) |
| `xqi18n/vue` | ESM + CJS | plugin object (default) + `createXqi18nVuePlugin` |
| `xqi18n/lib/*` | any | committed builds, extension required |
| `xqi18n/package.json` | JSON | manifest |

`main` is `index.js`, which re-exports `lib/xqi18n.js`. There is no `"type":
"module"`, so `require()` yields the constructor itself, not a `{ default }`
wrapper.

CDN: `https://unpkg.com/xqi18n` and `https://cdn.jsdelivr.net/npm/xqi18n` both
resolve to `lib/xqi18n.min.js`, which sets `window.xqi18n`. The Vue build sets
`window.xqi18nVue`.

## Constructor

```ts
new Xqi18n(options: Xqi18nOptions): Xqi18n
```

```ts
interface Xqi18nOptions {
  lang: string;          // required, non-empty
  messages: Messages;    // required, plain object
  strict?: boolean;      // default false
  warn?: boolean;        // default true
}
```

| Option | Required | Default | Notes |
| --- | --- | --- | --- |
| `lang` | yes | — | Non-empty string. Checked before emptiness, so `0` reports the type error |
| `messages` | yes | — | `null` and arrays are rejected |
| `strict` | no | `false` | Only `=== true` enables it |
| `warn` | no | `true` | Only `=== false` disables it |

`messages` is stored by reference. Mutating it after construction is visible to
the instance, but does not notify subscribers — assign `i18n.lang` if you need a
re-render.

## Instance members

| Member | Kind | Behaviour |
| --- | --- | --- |
| `lang` | accessor | Get returns the current code; set validates, switches, notifies. Same value is a no-op |
| `messages` | field | The object passed to the constructor |
| `strict` | field | Writable at runtime |
| `warn` | field | Writable at runtime |
| `tns<T = string>(key)` | bound own property | Lookup in the current language |
| `translateFn<T = string>(key)` | prototype method | Same lookup, unbound |
| `subscribe(listener)` | prototype method | Returns an idempotent unsubscribe function |
| `toJSON()` | prototype method | `{ lang, messages }` |

`tns` is created in the constructor as an arrow property, which is why
`const t = i18n.tns` and `Vue.prototype.$tns = i18n.tns` keep working. `lang` is
an accessor, so `Object.keys(i18n)` does not list it; `JSON.stringify` still
emits it through `toJSON()`.

## Key resolution

- The key is split on `.` and walked segment by segment at any depth.
- Every segment must be an own property of a plain object. `constructor`,
  `toString`, and `__proto__` never resolve; `Object.create(null)` trees work.
- A missing segment, a non-object mid-path, or an `undefined` leaf means
  "missing".
- Falsy leaves (`0`, `false`, `''`, `NaN`) are found values and are returned
  as-is. Never wrap a result in `|| fallback`.
- An empty or non-string key throws before lookup. A key pointing at a branch
  returns the branch object, not a string.

## Errors and warnings

Constructor and lookup errors are synchronous. Message strings are part of the
public surface; consumers filter logs by them.

| Trigger | Type | Message |
| --- | --- | --- |
| `options` is not a plain object | `TypeError` | `Translate Warn: options must be a object!` |
| `lang` is not a string (constructor or setter) | `TypeError` | `Translate Warn: lang must be a string!` |
| `lang` is `''` (constructor or setter) | `Error` | `Translate Warn: lang cannot be empty!` |
| `messages` is not a plain object | `TypeError` | `Translate Warn: messages must be a object!` |
| key is falsy | `Error` | `Translate Warn: key cannot be empty!` |
| key is a non-string, truthy value | `TypeError` | `Translate Warn: key must be a string!` |
| missing key with `strict: true` | `TypeError` | `Translate Warn: key does not exist!` |
| `subscribe` gets a non-function | `TypeError` | `Translate Warn: listener must be a function!` |

Missing-key warning (not thrown), emitted at most once per language and key:

```text
Translate Warn: key does not exist: "<key>" (lang: <lang>)
```

The warn-once set is cleared when `lang` changes, so the same key is reported
again in a language that also lacks it. A subscriber that throws is caught and
logged as `Translate Warn: a lang listener threw.`; the remaining subscribers
still run and the assignment does not fail.

## Vue plugin

```ts
import plugin, { createXqi18nVuePlugin } from 'xqi18n/vue';

plugin.install(target, { i18n });            // app.use(plugin, { i18n })
app.use(createXqi18nVuePlugin(i18n));        // same effect, bound up front
```

`target` is a Vue 3 app (`config.globalProperties`, `mixin`, `provide`) or a
Vue 2 constructor (`prototype`, `mixin`).

Installed members:

| Member | Location |
| --- | --- |
| `$t(key)` | `app.config.globalProperties` (Vue 3) or `prototype` (Vue 2) |
| `$tns(key)` | same object; alias kept for 0.0.x docs |
| `$xqi18n` | same object; the instance |
| `'xqi18n'` | `provide()` — Vue 3 only, read with `inject('xqi18n')` |

Lifecycle behaviour:

- One global mixin subscribes in `created` and unsubscribes in `beforeDestroy`
  (Vue 2) or `beforeUnmount` (Vue 3). Each major ignores the other's hook name,
  so both handlers exist on the same mixin.
- On notification it calls the component's public `$forceUpdate()`, which
  re-renders the whole component. Under SSR that method is absent and the call
  is skipped.
- Installs are tracked in a `WeakMap` keyed by target; installing the same
  instance on the same target twice does nothing, a different instance
  re-registers.
- Calling `install` without an instance that has a `tns` function throws
  `TypeError: xqi18n/vue: pass the instance — app.use(plugin, { i18n }) or
  createXqi18nVuePlugin(i18n).`
- The UMD build exposes only the default export, so `createXqi18nVuePlugin` is
  also attached to the plugin object for `require('xqi18n/vue')` consumers.

## TypeScript

xqi18n ships declarations and has no Vue dependency, so it does not augment Vue
itself. Add the component properties yourself:

```ts
import type { Xqi18nGlobalProperties } from 'xqi18n';

declare module '@vue/runtime-core' {
  interface ComponentCustomProperties extends Xqi18nGlobalProperties {}
}
```

Exported types: `MessageTree`, `Messages`, `Xqi18nOptions`, `Xqi18nListener`,
`Xqi18nGlobalProperties`, `Xqi18nVueOptions`, `Xqi18nVuePlugin`,
`VueComponentLike`, `VueLikeTarget`.

## Message tree shape

```js
const messages = {
  zhCn: {
    name: '快乐',
    nav: { home: '首页', user: { profile: '个人资料' } },
    count: 0          // valid leaf
  },
  enUs: { name: 'happy', nav: { home: 'Home' } }
};
```

Leaves are `unknown`: numbers, booleans, and even objects are returned untouched,
so a component must handle non-string results if the tree is not homogeneous.
