---
name: xqi18n-integration
description: Integrate the xqi18n npm package (nested dot-path keys, runtime language switching, Vue 2 / Vue 3 plugin) into a browser, Node, or Vue app. Load when adding translations, wiring the Vue plugin, debugging "key does not exist" output, or switching language without a page reload.
---

# xqi18n Integration

Use this when a project already depends on `xqi18n` (or is about to) and you need
to wire it into an app rather than reimplement translation. `xqi18n` is a plain
lookup table with a dot-path resolver; it has no interpolation, no plural forms,
and no fallback chain. If the task needs those, say so instead of improvising on
top of this package.

Exact signatures, error strings, and defaults live in
[references/api.md](references/api.md). Read it before writing code that depends
on error messages, option defaults, or the exports map.

## Choose The Entry

| Situation | Import |
| --- | --- |
| No framework, browser or Node | `import xqi18n from 'xqi18n'` |
| Vue 2 or Vue 3, templates need `$t` | `'xqi18n'` plus `'xqi18n/vue'` |
| Vue 3 Composition API | same, then `inject('xqi18n')` |
| `<script>` tag, no bundler | `window.xqi18n` / `window.xqi18nVue` from the CDN build |

There is exactly one runtime entry and one Vue subpath. Do not reach for
`xqi18n/lib/...` in new code; those paths exist so older consumers keep working.

## Integration Order

Order matters, because the plugin installs global properties that components
read during `created`.

1. Create one instance, outside any component: `const i18n = new xqi18n({ lang, messages })`.
   Share it. A second instance has separate listeners and will not stay in sync.
2. Register the plugin before mounting, and always pass the instance:
   `app.use(xqi18nVue, { i18n })` (Vue 3) or `Vue.use(xqi18nVue, { i18n })` (Vue 2).
   `app.use(xqi18nVue)` with no options throws — that is the most common failure.
3. Read translations through `$t(key)` / `$tns(key)` in templates, `this.$t` in
   options-API code, or `inject('xqi18n')` in Vue 3 setup.
4. Switch language by assigning `i18n.lang = code`. Do not rebuild the instance
   and do not reload the page; assignment notifies subscribers and the plugin
   re-renders the components for you.
5. Persist the choice yourself (for example in `localStorage`) and restore it as
   the constructor's `lang`. The package never touches storage.

## Constraints That Bite

- **The core is not reactive.** In Vue, a template that reads `i18n.tns(...)`
  directly from an import will not update on a language switch. Use `$t` so the
  plugin mixin's `$forceUpdate()` covers it, or subscribe manually and store the
  result in a reactive ref.
- **`$forceUpdate()` is whole-component.** Every installed component re-renders
  on a language switch. That is the documented trade-off, not something to
  "optimize" with per-component listeners unless the app is hot.
- **Missing keys do not throw by default.** They return the key itself and warn
  once per language and key. A screen showing `nav.home` is a missing message,
  not a broken plugin. Turn on `strict: true` in tests to surface them loudly.
- **A language absent from `messages` is not an error.** Every key becomes
  "missing" and you get keys rendered as text. Validate the language code
  against `Object.keys(messages)` at startup if that would be a bug.
- **Falsy leaves are values.** `0`, `false`, and `''` come back as-is; do not
  write `t('x') || fallback` — it silently discards them.
- **Own properties only.** `__proto__`, `constructor`, and `prototype` never
  resolve, so user-controlled keys cannot walk into prototypes.
- **SSR is silent.** Without `$forceUpdate`, the mixin skips the re-render rather
  than throwing; render per request and pass a fresh instance.
- **`"type": "module"` must not be added to the package.** It would turn the CJS
  entry into ESM and break `require('xqi18n')`.

## Verify

Run the checks that match how the app consumes the package:

```sh
node -e "const X=require('xqi18n');const i=new X({lang:'zhCn',messages:{zhCn:{a:{b:'ok'}}}});console.log(i.tns('a.b'))"
```

- Nested path resolves, and a detached `const t = i18n.tns` still resolves.
- Assigning `i18n.lang` fires exactly one subscriber callback.
- In Vue, toggling the language updates template text with no reload, and
  `inject('xqi18n')` in a Vue 3 component returns the same instance.
- `npm test` in the package itself must stay green if you changed anything under
  `src/`; rebuild before testing, because `lib/` is committed output.

## When Something Looks Wrong

| Symptom | Cause |
| --- | --- |
| `TypeError: xqi18n/vue: pass the instance` | `use(plugin)` without `{ i18n }` and without `createXqi18nVuePlugin(i18n)` |
| Template shows the raw key | Key missing in the active language, or a language code typo |
| Text never updates | Read `i18n.tns` directly instead of `$t`, or assigned a new instance |
| `Translate Warn: lang must be a string!` | Passed `null`, a number, or omitted `lang` |
| Translation returns an object | The key points at a branch, not a leaf — extend the path |
