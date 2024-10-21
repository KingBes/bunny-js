# Bunny-js 

> 开 箱 即 用 的 单 页 面 JavaScript 原 生 框 架

`Bunny.js` 它界定与主流和原生之间反复横跳，它目前的大小只有十几`kb`

## 路由

`route.json`

```json
[
    {
        "name": "index", //路由名称
        "path": [ //路由链接
            "/",
            "/index",
            "/index.html"
        ],
        "page": "/src/home.html" //路由页面
    },
    {
        "name": "other",
        "path": [
            "/other/{id}" // 动态参数链接
        ],
        "page": "/src/other.html"
    }
    ...
]
```

## 页面模板

```html
<template>
    <!-- 必须template标签包裹的任意内容 -->
</template>
```

模板内置参数

- `document` dom对象，该对象是当前模板的dom对象，非主dom
- `params` 路由params的参数对象,路由的动态对象
- `query` 路由query的参数对象,get请求对象
- `component` 组件函数（看下面组件函数说明）
- `onDestroy` 这个声明销毁页面的声明周期

说明待续中.....