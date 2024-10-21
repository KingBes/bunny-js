!function (win) {
    "use strict";

    // 插件名称
    const appName = "bunny"

    /**
     * get请求组件
     * @param {string} url 连接
     * @param {number} timeout 时长,默认10s 10000
     * @returns template doc
     */
    async function getCompontent(url, timeout = 10000) {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        try {
            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(id);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const html = response.text()
                .then(html => new DOMParser().parseFromString(html, 'text/html'));
            return (await html).querySelector("template")
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('Request timed out.');
            } else {
                throw error;
            }
        }
    }

    /**
     * get请求json
     * @param {string} url 
     * @param {number} timeout 
     * @returns 
     */
    async function getJson(url, timeout = 10000) {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        try {
            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(id);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json()
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('Request timed out.');
            } else {
                throw error;
            }
        }
    }

    /**
     * 匹配路由
     * @param {string} a 路由
     * @param {string} b 要匹配的路由
     * @returns object|false
     */
    function matchParams(a, b) {

        const data = {}

        if (a === b) {
            return data;
        }

        const aArr = a.split("/")
        const bArr = b.split("/")

        if (aArr.length !== bArr.length) {
            return false
        }
        let status = false
        for (let i = 0; i < aArr.length; i++) {
            let match = bArr[i].match(/^\{([^}\s]*)\}$/)
            if (aArr[i] !== bArr[i] && match) {
                data[match[1]] = aArr[i]
                status = true
            } else {
                continue
            }
        }
        if (!status) {
            return status
        } else {
            return data
        }
    }

    /**
     * 获取当前url信息
     * @returns object
     */
    function url() {
        const fullHash = win.location.hash.substring(1)
        let targetHash;
        if (fullHash.indexOf('#') > -1) {
            targetHash = fullHash.substring(1, fullHash.indexOf('#', 1)) || "/";
        } else {
            targetHash = fullHash.substring(1) || "/";
        }
        let data = {
            query: Object.fromEntries((new URLSearchParams(window.location.search)).entries()),
            href: win.location.href.replace(win.location.origin, ""),
            hash: {
                href: targetHash
            }
        }
        if (!targetHash.startsWith("/")) {
            data.hash.href = "/" + targetHash
        }
        if (targetHash === "/") {
            data.hash.path = ["home"]
        } else {
            data.hash.path = targetHash.split("/")
        }
        return data
    }

    // 实例化组件
    async function comp(tags, path = "", shadow = document) {
        const tagArr = shadow.querySelectorAll(tags)
        if (path === "") {
            path = tags
        }
        try {
            const template = await getCompontent(`/component/${path}.html`)
            for (const tag of tagArr) {
                new Component(tag, template)
            }
        } catch (error) {
            console.error(error.message)
        }
    }

    /**
     * 组件类
     */
    class Component {
        constructor(shadow, template) {
            this.then = shadow
            this.shadow = shadow.attachShadow({ mode: "open" })
            this.template = template.content

            // 监听属性来
            this.observer = new MutationObserver((mutationsList) => {
                for (const mutation of mutationsList) {
                    if (mutation.type === 'attributes') {
                        this.clearShadow()
                        this.updateShadow()
                    }
                }
            })
            this.observer.observe(shadow, { attributes: true })
            this.updateShadow()
        }

        updateShadow() {
            for (const value of this.template.childNodes.values()) {
                if (value.nodeName !== "SCRIPT") {
                    this.shadow.appendChild(value.cloneNode(true));
                } else {
                    const fn = new Function('doc,attrs,comp',
                        `(function(document,attrs,comp) {
                            "use strict";
                            function component(tag,path=""){
                                comp(tag,path,document)
                            }
                            ${value.textContent}
                        })(doc,attrs,comp)`)
                    fn(this.shadow, this.then.attributes, comp)
                }
            }
        }

        // 清空所有内容
        clearShadow() {
            while (this.shadow.firstChild) {
                this.shadow.removeChild(this.shadow.firstChild);
            }
        }
    }

    /**
     * 路由组件
     */
    class RouteComponent {
        constructor(shadow, template) {
            this.shadow = shadow.attachShadow({ mode: "open" })
            this.template = template.content

            this.onDestroy = this.onDestroy.bind(this)

            // 监听属性来改变接收参数和请求
            this.observer = new MutationObserver((mutationsList) => {
                for (const mutation of mutationsList) {
                    if (mutation.type === 'attributes' &&
                        ["params", "query"].some(element => element.includes(mutation.attributeName))) {
                        const params = JSON.parse(mutation.target.attributes.params.value)
                        const query = JSON.parse(mutation.target.attributes.query.value)
                        this.clearShadow()
                        this.updateShadow(params, query)
                    }
                }
            })
            this.observer.observe(shadow, { attributes: true })

        }

        /**
         * 更新所有内容
         * @param {object|false} params 参数
         * @param {object} query get请求
         */
        updateShadow(params = false, query = {}) {
            for (const value of this.template.childNodes.values()) {
                if (value.nodeName !== "SCRIPT") {
                    this.shadow.appendChild(value.cloneNode(true));
                } else {
                    const fn = new Function('doc,params,query,comp,onDestroy',
                        `(function(document,params,query,comp,onDestroy) {
                            "use strict";
                            function component(tag,path=""){
                                comp(tag,path,document)
                            }
                            ${value.textContent}
                        })(doc,params,query,comp,onDestroy)`)
                    fn(this.shadow, params, query, comp, this.onDestroy)
                }
            }
        }

        // 清空所有内容
        clearShadow() {
            while (this.shadow.firstChild) {
                this.shadow.removeChild(this.shadow.firstChild);
            }
        }

        /**
         * 执行卸载
         */
        destroy = async function () { }

        /**
         * 调用卸载
         * @param {callback} callback 函数
         */
        onDestroy(callback) {
            this.destroy = async function () {
                callback()
            }
        }

    }

    // 注册入口组件
    customElements.define(`${appName}-main`, class extends HTMLElement {
        constructor() {
            super()
            // 缓存信息
            this.cache = {
                route: {}, // {"/":"name",...}
                template: {} // {"name":tpl,...}    
            }
            // 当前doc
            this.shadow = this.attachShadow({ mode: "open" })

            // 创建路由
            this.buildRoute()

            // 监听hash变化
            win.addEventListener('hashchange', async () => {
                this.navigate()
            })
        }

        /**
         * 路由存储
         */
        async buildRoute() {
            const routeJson = await getJson("/route.json")
            for (const value of routeJson) {
                const div = document.createElement("div")
                div.setAttribute("route-name", value.name)

                div.setAttribute("style", "display:none;")
                this.shadow.append(div)
                this.cache.template[value.name] = {
                    path: value.path,
                    dom: new RouteComponent(div, await getCompontent(value.page))
                }
            }
            // console.log(this.cache)
            await this.navigate()
        }

        /**
         * 导航
         */
        async navigate() {

            let otherRoute = this.shadow.querySelectorAll("div[route-name]")

            for (var i = 0; i < otherRoute.length; i++) {
                if (otherRoute[i].style.display == "block") {
                    const name = otherRoute[i].getAttribute("route-name")
                    await this.cache.template[name].dom.destroy()
                }
                otherRoute[i].style.display = "none";
            }

            let thisUrl = url()

            // 当记录存在，直接返回
            if (typeof this.cache.route[thisUrl.href] !== "undefined") {
                this.shadow.querySelector(`div[route-name="${this.cache.route[thisUrl.href]}"]`)
                    .style.display = "block"
                return
            } else {
                let isRoute = false
                let params = {}
                let thenName
                for (const [name, value] of Object.entries(this.cache.template)) {
                    // console.log(name, value)
                    for (const p of value.path) {
                        params = matchParams(thisUrl.hash.href, p)
                        // console.log(params)
                        if (params !== false) {
                            isRoute = true
                            thenName = name
                            // 记录路由
                            this.cache.route[thisUrl.href] = name
                            break //匹配一个就够了
                        } else {
                            continue
                        }
                    }
                }
                // 确定有效路由
                if (isRoute) {
                    let routeOjb = this.shadow.querySelector(`div[route-name="${thenName}"]`)
                    routeOjb.style.display = "block"
                    routeOjb.setAttribute("params", JSON.stringify(params))
                    routeOjb.setAttribute("query", JSON.stringify(thisUrl.query))
                }
                // 找不到路由时
                /* else {
                    throw new Error('No route was matched. Procedure');
                } */
            }
        }
    });
}(window);