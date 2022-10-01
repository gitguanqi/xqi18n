# fsdgq-i18n

> This is an international language pack based on vuejs!

## use

### download package

```cmd
npm install xqi18n --save
```

### create

Create a new folder `locale`

```sh
+ locale
  - config
    - zhCn.js
    - zhHk.js
    - enUs.js
    ...
  - index.js
```

For example: the following method of use

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

create a file index.js

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

Mount to main.js

```js
// main.js
import xqI18n from './locale/index'

Vue.prototype.$xqI18n = xqI18n;
Vue.prototype.$tns = xqI18n.tns;
window.$tns = xqI18n.tns;

```

### Use in components

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

## issue

[submit your question](https://github.com/gitguanqi/xqi18n/issues/new)

## author

[@gitguanqi](https://github.com/gitguanqi)
