#xqi18n型



>这是一个基于vuejs的国际语言包！



[查看中文文档]（./zh.md）



##使用



###下载程序包



```第页

npm安装xqi18n--保存

```



###创建



创建新文件夹`locale`



```第页

+区域设置

-配置

-zhCn.js公司

-zhHk.js公司

-英语.js

...

-索引.js

```



例如：以下使用方法



```js型

//zh-cn.js号

常量zhCn={

名称：'快乐'

}



导出默认zhCn；



//zh-hk.js公司

常量zhHk={

名称：'快樂'

}



导出默认zhHk；



//英语-us.js

const enU={

name:'快乐'

}



导出默认enU；

```



创建文件index.js



```js型

//索引.js

从“xqi18n”导入xqi18

从“./config/zh-cn”导入zhCn

从“./config/zh-hk”导入zhHk

从“./config/en-us”导入enU



const xqI18n=新xqI18n({

lang:localStorage。getItem（'locale'）||'zhCn'；

消息：{

zhCn、，

zhHk、，

欧洲标准单位

}

})



导出默认xqI18n；

```



装载到main.js



```js型

//main.js（主要.js）

从“./locale/index”导入xqI18n



Vue.原型$xqI18n=xqI18 n；

Vue.原型$tns=xqI18n.tns；

窗口$tns=xqI18n.tns；



```



###在组件中使用



```真空，真空

<模板>

<div>

{{$tns（“名称”）}}

<input type=“text”：placeholder=“$tns（'name'）”>

</div>

</template>



<脚本>

导出默认值{

方法：{

showLang（）{

让currentLang=本地存储。getItem（'locale'）||'zhCn'；

让allLang=this.$xqI18n.messages；

安慰日志（'消息：'，allLang）；

安慰log（'name:'，this.$tns（'name'））；

},

切换语言（val）{

本地存储。SetItem（'locale'，val）；

location.reload（）；

}

}

}

</script>



```

## 提问题

[提交您的问题](https://github.com/gitguanqi/xqi18n/issues/new)

## 作者

[@gitguanqi](https://github.com/gitguanqi)
