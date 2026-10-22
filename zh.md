# xqi18n

一个零依赖的极简 i18n 工具，支持任意层级嵌套 key，可用于浏览器、Node，并自带
Vue 2 / Vue 3 插件。

[English](./README.md)

- 嵌套 key 不限层级：`nav.home`、`form.errors.name`
- 一份源码产出 UMD、ESM 与压缩版，使用者无需构建
- 零运行时依赖
- key 缺失时返回 key 本身，不会让渲染崩掉
- 支持运行时切换语言，不用再 `location.reload()`
- 同一份包同时兼容 Vue 2 与 Vue 3

## 安装

```sh
npm install xqi18n --save
```

## 快速开始

把各语言文件放在一起，创建唯一实例。

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

每个语言文件就是一个普通对象，嵌套多深都可以。

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

用 `tns` 取文案。它已绑定实例，可以单独传给组件或第三方库。

```js
import i18n from './locale/index.js';

i18n.tns('name');               // '快乐'
i18n.tns('nav.home');           // '首页'
i18n.tns('nav.user.profile');   // '个人资料'

const t = i18n.tns;
t('name');                      // '快乐' —— 脱离实例依然可用
```

## 浏览器用法

仓库里已提交构建产物，直接引即可，不需要打包工具。

```html
<!-- 全局构建，暴露 window.xqi18n -->
<script src="https://cdn.jsdelivr.net/npm/xqi18n@0.1.0/lib/xqi18n.min.js"></script>
<script>
    const i18n = new xqi18n({
        lang: 'zhCn',
        messages: { zhCn: { name: '快乐' } }
    });
    document.title = i18n.tns('name');
</script>
```

ESM 用法相同，并且同时提供具名导出。

```html
<script type="module">
    import xqi18n, { xqi18n as Named } from 'https://cdn.jsdelivr.net/npm/xqi18n@0.1.0/lib/xqi18n-esm.min.js';
    // xqi18n 与 Named 是同一个构造函数
    const i18n = new xqi18n({ lang: 'zhCn', messages: { zhCn: { name: '快乐' } } });
    console.log(i18n.tns('name'));
</script>
```

`https://unpkg.com/xqi18n` 与 `https://cdn.jsdelivr.net/npm/xqi18n` 都会解析到
`lib/xqi18n.min.js`。

## 切换语言

给 `lang` 赋值即可，需要的话自己持久化。

```js
import i18n from './locale/index.js';

function setLocale(locale) {
    i18n.lang = locale;
    localStorage.setItem('locale', locale);
}

setLocale('enUs');
i18n.tns('name'); // 'happy'
```

需要在别处响应语言变化时用 `subscribe`。它返回退订函数，可以重复调用。

```js
const off = i18n.subscribe((lang) => {
    document.documentElement.lang = lang;
});

// 之后
off();
```

## key 缺失

从 0.1.0 开始，key 缺失会返回 key 本身，并按「语言 + key」只告警一次，一个笔误不会
再打断渲染。

```js
const i18n = new xqi18n({
    lang: 'zhCn',
    messages: { zhCn: { name: '快乐' } }
});

i18n.tns('nope');    // 'nope'（控制台告警一次）
i18n.tns('nope');    // 'nope'（不再重复告警）
```

想保留旧行为（缺失即抛错）就打开 `strict`，错误类型与文案和 0.0.x 完全一致。

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

生产环境可用 `warn: false` 关掉告警。

## Vue

```sh
npm install xqi18n vue --save
```

Vue 3：

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

// 组合式 API：const i18n = inject('xqi18n')
```

Vue 2：

```js
import Vue from 'vue';
import xqi18n from 'xqi18n';
import xqi18nVue from 'xqi18n/vue';

const i18n = new xqi18n({ lang: 'zhCn', messages: { zhCn: { name: '快乐' } } });

Vue.use(xqi18nVue, { i18n });
```

两个大版本都会注入 `this.$t`、`this.$tns` 与 `this.$xqi18n`。语言变化时插件通过全局
mixin 触发相关组件重新渲染，因此切换语言不需要刷新页面。

```js
// 任意组件，Vue 2 / Vue 3 通用
export default {
    template: '<p>{{ $t("name") }}</p>'
};
```

也可以先把实例绑定好再安装：

```js
import { createXqi18nVuePlugin } from 'xqi18n/vue';

app.use(createXqi18nVuePlugin(i18n));
```

TypeScript 用户可以合并导出的接口，给模板里的 `$t` 补类型：

```ts
import type { Xqi18nGlobalProperties } from 'xqi18n';

declare module '@vue/runtime-core' {
    interface ComponentCustomProperties extends Xqi18nGlobalProperties {}
}
```

## API

`new xqi18n(options)`

| 选项 | 类型 | 说明 |
| --- | --- | --- |
| `lang` | `string` | 当前语言码，必须是非空字符串 |
| `messages` | `object` | 以语言码为键的消息树 |
| `strict` | `boolean` | 缺失 key 时抛错，而不是返回 key |
| `warn` | `boolean` | 设为 `false` 关闭缺失告警 |

实例成员：

| 成员 | 说明 |
| --- | --- |
| `i18n.lang` | 读取或设置当前语言 |
| `i18n.messages` | 传入的消息对象 |
| `i18n.strict` / `i18n.warn` | 运行时可改写 |
| `i18n.tns(key)` | 已绑定实例的翻译函数 |
| `i18n.translateFn(key)` | 同样的查找逻辑，未绑定 |
| `i18n.subscribe(fn)` | 返回退订函数 |

`tns` 沿点路径查找任意层级，且只走对象自有属性，`constructor`、`__proto__` 这类 key
不会命中原型成员。值为 `0`、`false`、`''` 时属于「存在但为假」，会原样返回，不会被当成
缺失。

## 从 0.0.3 升级

| 变化 | 处理方式 |
| --- | --- |
| key 缺失由抛错改为返回 key | 需要旧行为就传 `strict: true`，或直接处理返回的 key |
| `lang` 不在 `messages` 中不再抛 `TypeError` | 无需处理，现在等同普通缺失 key |
| `messages: null` 会在构造时被拒绝 | 传对象 |
| `lang` 改为访问器，`Object.keys(i18n)` 不再列出它 | 直接读 `i18n.lang`；`JSON.stringify` 仍输出 `{ lang, messages }` |
| 删除了 `bin` 声明 | `npx xqi18n` 从来不可用，请直接调用 API |
| 深路径改由 `exports` 声明 | 请带扩展名：`xqi18n/lib/xqi18n.min.js` |

## 给 AI 智能体

包内附带了机器可读的接入说明，并在 `package.json` 中声明：

- [`llms.txt`](./llms.txt) —— 精简的公开 API：导出、参数、默认值、错误文案、一个可运行示例，以及容易踩坑的约束。
- [`skills/xqi18n-integration/SKILL.md`](./skills/xqi18n-integration/SKILL.md) —— 什么场景该加载本包、选哪个入口、Vue 插件的注册顺序、以及如何验证语言切换。完整的签名与错误表在
  [`references/api.md`](./skills/xqi18n-integration/references/api.md)。

这两个文件都是普通 markdown，且会随 tarball 一起发布，因此智能体读取已安装的包即可找到，无需联网。

## 开发

```sh
npm install
npm run build        # 由 src/ 重新生成 lib/
npm test             # 先构建，再跑 node:test 套件
npm run typecheck    # tsc --noEmit
npm run test:browser # 在 http://127.0.0.1:4173/test/ 提供测试页
```

`lib/` 是刻意提交到仓库的：改完源码必须跑一次 `npm run build` 重新生成全部产物，并让
测试全绿。`test/` 下的页面直接加载这些产物，逐项显示 PASS/FAIL。

## 提问题

[提交您的问题](https://github.com/gitguanqi/xqi18n/issues/new)

## 许可

MIT © [@gitguanqi](https://github.com/gitguanqi)
