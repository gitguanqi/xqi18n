# xqi18n

>这是一个基于vuejs的国际语言包！

[查看中文文档]（./zh.md）

## 使用

### 下载程序包

```sh
npm i xqi18n
```

### 创建

创建新文件夹`locale`

```sh
+ locale
  - config
    - zhCn.js
    - zhHk.js
    - enUs.js
    ...
  - index.js
```

例如：以下使用方法

```js
// zh-cn.js
const zhCn = {
    name: '快乐'
}

export default zhCn;

// zh-hk.js
const zhHk = {
    name: '快樂'
}

export default zhHk;

// en-us.js
const enUs = {
    name: 'happy'
}

export default enUs;
```

创建文件index.js

```js
// index.js
import xqi18n from 'xqi18n'
import zhCn from './config/zh-cn'
import zhHk from './config/zh-hk'
import enUs from './config/en-us'

const xqI18n = new xqi18n({
    lang: localStorage.getItem('locale') || 'zhCn';
    messages: {
        zhCn,
        zhHk,
        enUs
    }
})

export default xqI18n;
```

装载到main.js

```js
// main.js
import xqI18n from './locale/index'

Vue.prototype.$xqI18n = xqI18n;
Vue.prototype.$tns = xqI18n.tns;
window.$tns = xqI18n.tns;
```

### 在组件中使用

```vue
<template>
    <div>
        {{ $tns('name') }}
        <input type="text" :placeholder="$tns('name')">
    </div>
</template>

<script>
    export default {
        methods: {
            showLang () {
                let currentLang = localStorage.getItem('locale') || 'zhCn';
                let allLang = this.$xqI18n.messages;
                console.log('message: ', allLang);
                console.log('name:', this.$tns('name'));
            },
            toggleLang (val) {
                localStorage.SetItem('locale', val);
                location.reload();
            }
        }
    }
</script>
```

## 提问题

[提交您的问题](https://github.com/gitguanqi/xqi18n/issues/new)

## 作者

[@gitguanqi](https://github.com/gitguanqi)
